#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================
## Iteration 2 (2026-06) — Main agent notes
Features added (need testing):
1. Cascading location filter (public): GET /api/public/locations?provinsi=&kabupaten_kota=&kecamatan= -> {level, options}; catalog accepts kabupaten_kota, kecamatan, wilayah_level_4 params. FilterModal in app/index.tsx uses Select (testIDs filter-provinsi/filter-kabkota/filter-kecamatan/filter-kelurahan, options testID option-<name>).
2. Wilayah reference proxy (cached in Mongo wilayah_cache): GET /api/wilayah/provinces, /regencies/{id}, /districts/{id}, /villages/{id}. Used by LocationPicker in Add Asset wizard step Lokasi (testIDs select-provinsi/select-kabkota/select-kecamatan/select-kelurahan).
3. Map: latitude/longitude on assets; AssetMap (Leaflet/OSM in WebView native, iframe web). Public detail + internal detail show map + "Buka di Google Maps". Wizard has editable map, lat/lng fields (field-latitude/field-longitude), GPS button (use-gps-button).
4. Share: useShareAsset -> native Share sheet / web ShareSheet (share-whatsapp, share-copy). Buttons: share-button (detail top), share-button-bottom (public detail), share-card-<id> (catalog cards). Link = EXPO_PUBLIC_BACKEND_URL/asset/<id>.
5. Private documents: POST /api/assets/{id}/documents (MA owner, multipart file+jenis, pdf/jpg/png <=20MB), GET /api/assets/{id}/documents (MA owner/ACRM same ACR/RCG), GET /api/assets/{id}/documents/{doc}/link -> signed url (10 min), GET /api/files/private/{doc}?token=, DELETE /api/assets/{id}/documents/{doc} (MA, editable statuses only). /api/files/{path} returns 403 for any path containing /private/. Public catalog/detail MUST NOT expose documents. Internal GET /api/assets/{id} includes documents[] (without storage_path).
6. Demo assets re-seeded with coordinates and 4-5 photos each.

## Iteration 3 (2026-06) — Main agent notes
New features:
1. SOLD: POST /api/rcg/assets/{id}/sold (admin_rcg, only PUBLISHED, optional {notes}) -> SOLD, notifies MA+ACRM; POST /api/rcg/assets/{id}/unsold reverts. Public view: is_sold=true, pic_wa=null for SOLD. Catalog sorts SOLD last. UI: internal detail buttons mark-sold-button / unmark-sold-button (RCG); public card TERJUAL overlay (sold-badge-<id>); public detail sold-banner + sold-cta replaces whatsapp-button.
2. Favorites (on-device AsyncStorage): fav-card-<id> on cards, fav-button on public detail, favorites-entry-button in header -> /favorites screen. Backend GET /api/public/catalog/batch?ids=a,b.
3. Similar: GET /api/public/catalog/{id}/similar -> up to 6; public detail shows horizontal "Asset Serupa" (similar-section).
4. Excel report: GET /api/rcg/reports/assets/link (admin_rcg) -> {url:/api/rcg/reports/assets.xlsx?token=} ; GET that -> xlsx with 3 sheets. UI: Kelola -> tab manage-tab-laporan -> export-excel-button.
5. Branding: BSI logo image in header & login; Lato font loaded via expo-font (makeStyles maps fontWeight -> Lato face).
6. Home location bar: loc-provinsi / loc-kabkota / loc-kecamatan chips (Select sheet with options option-<name>); lower levels optional; clear via loc-*-clear.
7. Badge text "Sudah Ada Jadwal Lelang"; cards show "Belum ada jadwal lelang" when none. Demo: 25 assets across provinces, 2 SOLD, ~9 without schedule.

## Iteration 4 (2026-06) — Main agent notes
1. Riwayat Harga: assets have price_history[{harga,at}]; PUT /api/assets/{id} pushes on harga_limit change. Public view adds price_history, harga_sebelumnya, penurunan_persen, harga_turun_at. Card: price-drop-<id> (old price strikethrough + % badge). Public detail: price-drop-badge, price-history section. 6 demo assets have drops.
2. Pengingat Lelang: public detail save-calendar-button (has_schedule & not sold). Web -> opens Google Calendar template URL (new tab); native -> expo-calendar w/ permission flow (not testable in web).
3. Statistik Minat: POST /api/public/catalog/{id}/track {type:"view"|"wa"} -> increments stats + asset_events. Public detail fires view on open & wa on WhatsApp tap. GET /api/dashboard/marketing -> interest{views,wa_clicks,views_7d,wa_7d,top[]}. Internal GET /api/assets/{id} -> stats{views,wa_clicks,views_7d,wa_7d}. UI: MA dashboard "Statistik Minat Pembeli" + interest-top list (interest-row-<id>); internal detail interest-stats.
4. Ubah Nama Kategori: PUT /api/admin/category/{id} {nama_category, parent_category_id} validates non-empty & duplicate (409). UI Kelola -> Kategori: rename-cat-<id> (pencil) -> modal rename-category-input / rename-save / rename-cancel; toggle-cat-<id> now shows confirm first. Inactive categories hidden from /master/categories (active_only default) & /public/filters.
Demo re-seeded (new ids) with better photos.

## Iteration 5 (2026-06) — Main agent notes
1. Galeri layar penuh: public detail -> tap photo (gallery-open-<i>) or gallery-expand -> Modal PhotoGallery (gallery-counter "n / N", gallery-prev/next/close; pinch/double-tap zoom via RNGH+Reanimated — native only meaningful).
2. Filter Harga Turun: home chip chip-harga-turun toggles GET /api/public/catalog?price_drop=true (only assets whose last price < previous; sorted by latest drop); result label "N asset dengan harga turun".
3. Notifikasi favorit (in-app, on-device): favorites store snapshots {harga_limit, has_schedule, tanggal_lelang, is_sold} when hearted; useFavoriteUpdates compares with current /public/catalog/batch -> updates. Header heart shows red badge favorites-alert-badge with count; /favorites shows favorites-updates banner (favorites-update-<id>, favorites-seen-<id>, favorites-mark-all) and BARU tag favorite-changed-<id>. To test: heart an asset, then as MA owner PUT lower harga_limit (or admin adds schedule), reload favorites -> banner.
4. Excel: Detail Asset sheet has 4 new columns (Dilihat, Ketuk WhatsApp, Dilihat 7 Hari, WA 7 Hari) and new sheet "Minat Pembeli" ranked (Peringkat..Konversi WA (%)). Sheets: Ringkasan per ACR, Detail Asset, Minat Pembeli, Ringkasan Status.
