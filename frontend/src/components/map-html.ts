/**
 * Leaflet + OpenStreetMap HTML rendered inside a WebView (native) or iframe (web).
 * Posts `{type:"bsi-map", lat, lng}` to the host when the pin is moved (editable mode).
 */
export function buildMapHtml(opts: { lat: number | null; lng: number | null; editable: boolean; brand: string }) {
  const has = opts.lat != null && opts.lng != null;
  const lat = has ? opts.lat : -2.5;
  const lng = has ? opts.lng : 118.0;
  const zoom = has ? 16 : 4;
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  html,body,#map{margin:0;padding:0;height:100%;width:100%;background:#E5E7EB;font-family:-apple-system,Segoe UI,Roboto,sans-serif}
  .pin{width:30px;height:30px;border-radius:50% 50% 50% 0;background:${opts.brand};border:3px solid #fff;
       box-shadow:0 2px 6px rgba(0,0,0,.35);transform:rotate(-45deg);position:relative;top:-15px;left:-3px}
  .pin::after{content:"";width:10px;height:10px;background:#fff;border-radius:50%;position:absolute;top:7px;left:7px}
  .hint{position:absolute;left:8px;right:8px;bottom:8px;z-index:999;background:rgba(255,255,255,.92);color:#374151;
        font-size:12px;padding:6px 10px;border-radius:8px;text-align:center;pointer-events:none}
  .leaflet-control-attribution{font-size:9px}
</style></head><body>
<div id="map"></div>
${opts.editable ? '<div class="hint">Ketuk peta atau geser pin untuk menentukan lokasi</div>' : ""}
<script>
  var map = L.map('map',{zoomControl:true,attributionControl:true}).setView([${lat},${lng}],${zoom});
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap'}).addTo(map);
  var icon = L.divIcon({className:'',html:'<div class="pin"></div>',iconSize:[30,30],iconAnchor:[15,30]});
  var marker = ${has ? `L.marker([${lat},${lng}],{icon:icon,draggable:${opts.editable}}).addTo(map)` : "null"};
  function send(ll){
    var msg = JSON.stringify({type:'bsi-map',lat:+ll.lat.toFixed(6),lng:+ll.lng.toFixed(6)});
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(msg);
    else if (window.parent && window.parent !== window) window.parent.postMessage(msg,'*');
  }
  if (marker && ${opts.editable}) marker.on('dragend', function(){ send(marker.getLatLng()); });
  ${opts.editable ? `
  map.on('click', function(e){
    if (!marker) { marker = L.marker(e.latlng,{icon:icon,draggable:true}).addTo(map); marker.on('dragend', function(){ send(marker.getLatLng()); }); }
    else marker.setLatLng(e.latlng);
    if (map.getZoom() < 15) map.setView(e.latlng, 16);
    send(e.latlng);
  });` : ""}
</script></body></html>`;
}
