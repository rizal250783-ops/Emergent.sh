"""Iteration 15: near_sort=price option for nearest search in public catalog.

Covers:
- GET /api/public/catalog?sort=nearest&near_sort=price -> ascending harga_limit, SOLD last
- near_sort=distance (default) orders by distance_km
- near_sort=price combined with radius_km
- Regression: catalog total unchanged without origin; radius filter still works
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    raise RuntimeError("EXPO_PUBLIC_BACKEND_URL not set")
API = f"{BASE_URL}/api"

# Jakarta reference point used in the review request
LAT, LNG = -6.19, 106.82


@pytest.fixture
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def get_catalog(client, **params):
    r = client.get(f"{API}/public/catalog", params=params, timeout=30)
    assert r.status_code == 200, f"catalog failed: {r.status_code} {r.text[:200]}"
    return r.json()


class TestNearSortPrice:
    """near_sort=price: available assets ordered by ascending harga_limit, SOLD at end."""

    def test_price_sort_ascending_available_first(self, client):
        data = get_catalog(client, sort="nearest", lat=LAT, lng=LNG, near_sort="price", limit=100)
        items = data["items"]
        assert len(items) > 0, "no items returned for nearest+price sort"
        # every item must still carry distance_km (nearest-scoped)
        for it in items:
            assert "distance_km" in it, f"item {it['id']} missing distance_km"
        avail = [it for it in items if not it["is_sold"]]
        sold = [it for it in items if it["is_sold"]]
        # SOLD assets must be at the end
        if sold:
            first_sold_idx = next(i for i, it in enumerate(items) if it["is_sold"])
            assert all(it["is_sold"] for it in items[first_sold_idx:]), "SOLD not grouped at end"
        # available assets ascending by harga_limit
        prices = [it["harga_limit"] or 0 for it in avail]
        assert prices == sorted(prices), f"available prices not ascending: {prices[:10]}"

    def test_price_sort_with_radius(self, client):
        r = 25
        data = get_catalog(client, sort="nearest", lat=LAT, lng=LNG, near_sort="price",
                           radius_km=r, limit=100)
        items = data["items"]
        for it in items:
            assert it["distance_km"] <= r + 0.15, f"item beyond radius: {it['distance_km']} km"
        avail_prices = [it["harga_limit"] or 0 for it in items if not it["is_sold"]]
        assert avail_prices == sorted(avail_prices), "price sort broken with radius filter"

    def test_distance_default_orders_by_distance(self, client):
        # default (no near_sort) must order available assets by ascending distance
        data = get_catalog(client, sort="nearest", lat=LAT, lng=LNG, limit=100)
        items = data["items"]
        assert len(items) > 0
        avail = [it for it in items if not it["is_sold"]]
        dists = [it["distance_km"] for it in avail]
        assert dists == sorted(dists), f"distance sort broken: {dists[:10]}"
        sold = [it for it in items if it["is_sold"]]
        if sold:
            first_sold_idx = next(i for i, it in enumerate(items) if it["is_sold"])
            assert all(it["is_sold"] for it in items[first_sold_idx:])

    def test_explicit_distance_same_as_default(self, client):
        d1 = get_catalog(client, sort="nearest", lat=LAT, lng=LNG, limit=100)
        d2 = get_catalog(client, sort="nearest", lat=LAT, lng=LNG, near_sort="distance", limit=100)
        assert [i["id"] for i in d1["items"]] == [i["id"] for i in d2["items"]]

    def test_price_vs_distance_order_differs(self, client):
        """Sanity: price and distance orderings are computed (total identical)."""
        dp = get_catalog(client, sort="nearest", lat=LAT, lng=LNG, near_sort="price", limit=100)
        dd = get_catalog(client, sort="nearest", lat=LAT, lng=LNG, near_sort="distance", limit=100)
        assert dp["total"] == dd["total"]
        assert {i["id"] for i in dp["items"]} == {i["id"] for i in dd["items"]}


class TestRegression:
    """Catalog regression: totals and radius filtering still behave as before."""

    def test_catalog_total_without_origin(self, client):
        data = get_catalog(client, limit=100)
        print(f"catalog total (no origin): {data['total']}")
        assert data["total"] == 45, f"expected 45 assets, got {data['total']}"

    def test_radius_filter_reduces_or_keeps_results(self, client):
        all_near = get_catalog(client, sort="nearest", lat=LAT, lng=LNG, limit=100)
        r5 = get_catalog(client, sort="nearest", lat=LAT, lng=LNG, radius_km=5, limit=100)
        assert r5["total"] <= all_near["total"]
        for it in r5["items"]:
            assert it["distance_km"] <= 5.15

    def test_nearest_without_coords_falls_back(self, client):
        # sort=nearest without lat/lng should not crash; falls back to newest
        r = client.get(f"{API}/public/catalog", params={"sort": "nearest"}, timeout=30)
        assert r.status_code == 200

    def test_pagination_with_price_sort(self, client):
        p1 = get_catalog(client, sort="nearest", lat=LAT, lng=LNG, near_sort="price", page=1, limit=10)
        p2 = get_catalog(client, sort="nearest", lat=LAT, lng=LNG, near_sort="price", page=2, limit=10)
        ids1 = [i["id"] for i in p1["items"]]
        ids2 = [i["id"] for i in p2["items"]]
        assert not set(ids1) & set(ids2), "pagination overlap in price sort"
