---
name: fishao
description: >-
  Comprehensive guide, data schemas, Firestore models, and code architecture for
  the FISHAO (fishao-fun) web application. Activate whenever modifying features,
  inspecting fish data, club mechanics, Fish Market prices, or localization.
---

# FISHAO Application & Architecture Guide

This skill provides the complete reference for developing and maintaining the **FISHAO (fishao-fun)** web application. It eliminates the need for agents to read large data files (`data/fishes.js`, `fish.json`, `lang_cz.json`, `lang_en.json`, `lang_pl.json`) by documenting their exact schemas, data models, and business logic.

---

## 1. Project Overview & Technical Stack

* **Platform:** Static Single-Page Application (SPA) hosted on **GitHub Pages**.
* **Repository:** `https://github.com/grasski/fishao-fun` on branch `main`.
* **Runtime Stack:** Pure **Vanilla JavaScript (ES6)**, native CSS3 with custom properties, HTML5.
* **No Build Step:** No Webpack, Vite, or npm compilation. Edits are deployed directly via Git pushes.
* **Backend Services (Firebase):**
  * **Firebase Auth:** Google Identity Popup sign-in.
  * **Cloud Firestore:** Real-time synchronization of Fish Market prices, Clubs, and User Profiles.
  * **Local Fallback:** Full offline capability via `localStorage` when Firebase is unreachable or user is logged out.

---

## 2. Data Schemas (DO NOT read raw large files)

### 2.1 Fish Object Schema (`data/fishes.js` – 615 fish)
`window.FISHAO_DATA.allFishes` is an array of 615 fish objects. The 80 club fish
are embedded in this array with `is_club: true`; `js/state.js` derives the
`clubFishes` global by filtering `is_club` and sorting saltwater-first.

Each fish object has the following structure:

```javascript
{
  "id": 1,                     // Number: Unique game fish ID (1 .. 1200+)
  "order": 1,                  // Number: Club order (1 .. 80 for club fishes; absent for others)
  "name": "Okoun říční",       // String: Default Czech fish name
  "baits": ["insects", "dough"], // Array<String>: Canonical bait category codes (translated in data/i18n/taxonomies.js)
  "locations": ["location_1"],   // Array<String>: Canonical parent location keys (`location_<id>`, translated in data/i18n/taxonomies.js)
  "places": ["EFPT_LOST_VALLEY_POND_1"], // Array<String>: Specific EFPT sub-locations; [] for most fish
  "raw_times": ["00:00-06:00", "18:00-24:00"], // Array<String>: Active catch time windows (Game UTC); preformatted `time` string is omitted
  "is_night": true,            // Boolean: true if only active at night/deep night
  "min_l": 15.0,               // Number: Minimum catch length in cm
  "avg_l": 32.5,               // Number: Average catch length in cm
  "max_l": 55.0,               // Number: Maximum catch length in cm
  "rating": 3,                 // Number: Difficulty rating (1 to 5 stars)
  "rarity_factor": 1.0,        // Number: Game spawn-weight multiplier; 1.0 = baseline, lower = rarer (0.01 = 100x rarer)
  "is_club": true,             // Boolean: true if it is one of the 80 club fish
  "points": 500,               // Number: Club points required to unlock (for points fish)
  "unlock_type": "points"      // String: 'points' | 'fc' (Fishcoins) | 'monster'
}
```

**Supported specific fishing places (`places`):** 287 fish carry at least one of
these EFPT identifiers. They are translated in `data/i18n/taxonomies.js`.
Palm Island zones are list-style: one fish may carry several of the 8 zone
identifiers (273 zone tags across 93 fish).
The parent `locations` label is composed at render time: tables show the parent
only, while the fish detail modal shows the parent plus a compact area chip.
The club fish table is the exception: its "Místo"/"Area" column lists the
specific fishing areas (`places`) instead of the shared parent location.
Filtering by a parent location matches its sub-location fish; the optional
"specific area" filter narrows the result to one `places` value.

| EFPT identifier | Parent location | Fish |
|---|---|---:|
| `EFPT_LOST_VALLEY_POND_1` | Lost Valley | 9 |
| `EFPT_LOST_VALLEY_POND_2` | Lost Valley | 45 |
| `EFPT_SEAGULL_HARBOR_BOAT` | Seagull Harbor | 26 |
| `EFPT_PANHEIRA_BEACH_JETTY` | Pinheira Beach | 18 |
| `EFPT_COOL_MOUNTAIN_RAFT` | Cool Mountain | 10 |
| `EFPT_THOMBANI_TOWN_AFRICAN_LAKE` | Thombani Town | 6 |
| `EFPT_CLUB_AREA_SALT` | Klubový revír | 49 |
| `EFPT_CLUB_AREA_FRESH` | Klubový revír | 31 |
| `EFPT_PALM_ISLAND_ZONE_A` | Palm Island | 35 |
| `EFPT_PALM_ISLAND_ZONE_B` | Palm Island | 31 |
| `EFPT_PALM_ISLAND_ZONE_C` | Palm Island | 37 |
| `EFPT_PALM_ISLAND_ZONE_D` | Palm Island | 43 |
| `EFPT_PALM_ISLAND_ZONE_E` | Palm Island | 35 |
| `EFPT_PALM_ISLAND_ZONE_F` | Palm Island | 34 |
| `EFPT_PALM_ISLAND_ZONE_G` | Palm Island | 29 |
| `EFPT_PALM_ISLAND_ZONE_H` | Palm Island | 29 |

Palm Island zone labels use the bare names (`Vnější oblast` cs / `Outer area` en);
the area filter keeps A→H order via the identifier letter (`getPalmZoneLetter` in
`js/filters.js`). The same 8 zones also appear on the 18 `Turnaj Moray` fish,
which use the same physical fishing spots.

**Water type is derived, not stored.** `getFishWater(fish)` in `js/state.js`
returns `'salt'` for `EFPT_CLUB_AREA_SALT`, `'fresh'` for
`EFPT_CLUB_AREA_FRESH`, and `''` for other fish (`FISHAO_I18N.getWaterName()` translates `'salt'` / `'fresh'`). The club table shows the fish's `places` values under the "Místo"/"Area"
header, and the shared "specific area" filter is populated from
`getClubAreas()` (club fishes' `places`).

> [!TIP]
> **Club Fish Breakdown (80 total):**
> * **56 Points Fishes:** `unlock_type: "points"`, unlocked progressively as club points increase.
> * **21 Fishcoin Fishes:** `unlock_type: "fc"`, unlocked manually by club creator/members.
> * **3 Monster Fishes:** `unlock_type: "monster"`, unlocked manually for the club.

### 2.2 Fish Market Pricing Schema (`prices_history.json` & Firestore)
Prices are stored as a map from `fishId` (as string) to an array of price entries sorted descending by date (`YYYY-MM-DD`). Each new write keeps the shape but enforces one entry per distinct numeric price value per fish; any duplicates are preserved in storage and hidden on display by `normalizePriceEntries`.

```javascript
{
  "1": [
    { "date": "2026-11-07", "price": 142 },
    { "date": "2026-11-06", "price": 138 }
  ]
}
```

#### Fish Market Business Rules:
1. **Sunday Closed:** Every Sunday (`getUTCDay() === 0`), the Fish Market is **closed**.
   * No prices can be entered for Sunday dates (validated in modal and bulk import).
   * Default input dates use the current UTC date (`getTodayISO()`), so on Sundays the Sunday date is pre-filled, immediately displaying the red Sunday warning and disabling the submit button.
2. **Variable Community Prices:** Prices differ per player, so one fish can have several distinct prices. Multiple entries for the same fish and date are allowed when their price values differ.
3. **Price-Value Dedupe:** A numeric `price` is stored only once per fish across **all dates**. Re-submitting a known price is rejected (single form and bulk import alike). Duplicate checks and writes happen inside a Firestore transaction (`window.FISHAO_FS_TX.readModifyWrite`) so concurrent submissions cannot create duplicates.
4. **Display Normalization:** `normalizePriceEntries(list)` in `js/market.js` is the only display normalization. It returns a new newest-first array with one entry per distinct price and never mutates storage. Tables, the fish modal, counts and summaries use it; raw export keeps legacy duplicates visible.
5. **Admin Rights:** Administrators (`isAdmin === true`) can delete a normalized price row, which removes **all** raw rows with that price value. There is no overwrite flow.

### 2.3 Cloud Firestore Collections

* `/fishao_market/prices_history`:
  * Document `prices_history`: Contains `{ prices: { [fishId]: [ { date, price } ] }, lastUpdated: Timestamp }`.
  * Readable by everyone. Writable only by authenticated users.
* `/fishao_market/config`:
  * Document `config`: Feature flag document `{ manualImportEnabled: boolean, lastUpdated: string }`.
  * Readable by everyone; writable only by admins (`isAdmin()`).
  * Subscribed in real time via `onSnapshot` in `js/auth.js` (`marketConfigDocRef`). When `manualImportEnabled !== true` (or the document does not exist), all manual price entry and bulk import UI (`#marketImportActionBarRight`, `#marketFloatingImportBtn`, `#priceAddFormBox`, `#priceAddLoginNotice`) stays hidden via `syncManualImportVisibility()` in `js/market.js`. Admins can toggle it via `toggleManualImportFlag()` in the Profile modal (`#profileAdminSection`).
* `/clubs/{clubId}`:
  * `name`: String (Club name, 2–40 chars).
  * `name_lower`: String (Lowercase name for search indexing).
  * `points`: Number (Current accumulated club points >= 0).
  * `createdBy`: String (Firebase UID of the creator).
  * `unlockedFcFishIds`: Array<Number> (List of unlocked FC fish IDs).
  * `unlockedMonsterIds`: Array<Number> (List of unlocked Monster fish IDs).
  * `memberCount`: Number (Current member count).
  * `members`: Map<UID, { displayName, avatarUrl, joinedAt, caughtCount, caughtClubCount }>.
  * `createdAt`, `updatedAt`, `lastUpdatedBy`.
* `/users/{userId}`:
  * `displayName`: String (Player game nickname, max 40 chars).
  * `avatarUrl`: String (URL or emoji icon, max 500 chars).
  * `role`: String ('member' | 'admin').
  * `clubId`: String | null.
  * `clubName`: String | null.
  * `caughtFishIds`: Array<Number> (List of caught fish IDs, max 1000).
  * `backyardFishIds`: Array<Number> (List of backyard bred fish IDs, max 300; strictly the 83 backyard breedable species).
  * `friendUids`: Array<String> (List of favorited/friend player UIDs, max 300).
  * `createdAt`, `lastLogin`.

### 2.4 Firebase Security Rules & Communication Best Practices (`firestore.rules`)

1. **Strict Key Masking (Strict Schemas):**
   * `firestore.rules` enforces `.hasOnly([...])` on creates and `.affectedKeys().hasOnly([...])` on updates.
   * **Rule for agents:** Never add arbitrary fields to Firestore documents without updating `firestore.rules`. Any extraneous field triggers an immediate `permission-denied` error from Firebase.
2. **Read vs Write Permissions:**
   * `/users/{userId}`: Readable by any authenticated user (`request.auth != null`) so club member catch stats can be rendered. Writeable ONLY by document owner (`request.auth.uid == userId`) or admin (`isAdmin()`).
   * `/clubs/{clubId}`: Publicly readable (`allow read: if true`). Updates allowed only by authenticated users for valid club fields.
   * `/fishao_market/prices_history`: Publicly readable (`allow read: if true`). Create/update allowed for authenticated users. Delete strictly reserved for admins.
   * `/fishao_market/config`: Publicly readable (`allow read: if true`). Create/update/delete strictly reserved for admins (`isAdmin()`), restricted to keys `['manualImportEnabled', 'lastUpdated']` with `manualImportEnabled is bool`.
3. **GDPR-free Storage:**
   * Never store a player's Google email, full name, or private tokens in Firestore. Only store the user-chosen `displayName`, `avatarUrl`, and game state.
4. **Google Identity Auth Handler & Referrer Rules:**
   * The Firebase web API key in Google Cloud Console must NOT use HTTP referrer restrictions ("Websites"), because the Firebase OAuth popup (`fishao-fun.firebaseapp.com/__/auth/handler`) sets `<meta name="referrer" content="no-referrer">`. Use "None" (API keys are public client identifiers; Firestore security rules guard the data).
5. **Safe Error Handling & Offline Fallback:**
   * Always wrap Firestore writes and reads in `try / catch`. If a user is offline or Firebase is blocked, gracefully fall back to local `localStorage` so the UI never crashes.


### 2.5 Modular JavaScript Architecture (`js/`)

The monolithic `app.js` was refactored into modular, cohesive files loaded directly without bundlers:
1. `js/state.js`: Global state variables, derived `clubFishes`, fish helpers (`getFishWater`, `getFishParentLocationLabels`, `getFishAreaLabels`, `getFishAreasForLocation`, and the parent-only `getFishLocationLabels` alias), localization helper `t()`, date and string utilities (`getTodayISO`, `getYesterdayISO`, `isDateSunday`, `normStr`, `escapeHtml`), toast notification (`showToast`), and confirmation dialog (`showConfirmModal`, `resolveConfirmModal`).
2. `js/table.js`: Fish table rendering (`renderTableHead`, `renderTableBody`), UTC-to-local time formatting (`formatCatchTime`, `isFishActiveNow`), rating badges (`renderRatingBadge`), price cells (`renderPriceCell`), and caught fish collection toggles (`toggleCaughtFish`, `updateCaughtStats`).
3. `js/clubs.js`: Real-time club synchronization via Firestore (`bindClubListener`), deterministic member roster rendering (`renderClubMembers`), member profile modal (`openPlayerModal`), club search, creation, joining, and leaving, club points management, milestones roadmap (`renderClubMilestones`), and FC / Monster special fish unlocks.
4. `js/market.js`: Fish market price history persistence (`saveLocalPriceHistory`), Sunday detection, display normalization (`normalizePriceEntries`), price lookups (`getLatestPrice`, `getMaxPrice` — highest distinct price, ties resolved to the most recent date), single price submission/deletion through Firestore transactions (`submitNewPrice`, `deletePriceEntry`), fish detail modal rendering (`openPriceModal`, including the `rarity_factor` → tier badge helpers `getRarityTier` / `formatRarityPercent`), normalized modal price history rendering (`renderModalHistory`), visual price range scale with average/median markers (`computePriceStats`, `renderModalPriceScale` → `#modalPriceScale`), bulk price import with duplicate skipping and autocomplete suggestions (`processBulkImport`), default reset (`resetPriceHistoryToDefault`), and JSON export (`exportPricesJson`).
5. `js/filters.js`: Multi-criteria fish filtering engine (`applyFilters`, `resetFilters`), parent-location and specific-area dropdown logic (`initLocationOptions`, `onLocationFilterChange`, `updateAreaFilterOptions`), mission size handlers (`setSizeFilter`, `onRangeSizeInput`), collection filters, the Market "missing price" toggle (`toggleNeedsPrice`, `fishNeedsPrice` = 0 normalized entries, `#btnNeedsPrice` with live count; mutually exclusive with `toggleOnlyPrice`), and dropdown options initializers. The specific-area dropdown follows the selected parent location in the fishdex/market views and falls back to `getClubAreas()` in the club view.
6. `js/auth.js`: Firebase authentication (`signIn`, `signOut`), GDPR-compliant profile synchronization (`loadUserProfile`, `saveProfile`), and UI state synchronization (`updateAuthUI`).
7. `js/players.js`: Community player list, backyard fish breeding (`backyardFishIds`), universal player modal, reverse fish-to-player lookups.
8. `js/main.js`: Live clock and timezone switching (`setTimezone`, `updateClock`), view routing (`switchView`), static DOM translations (`setLanguage`, `updateStaticTranslations`), modal listeners, `window.fishaoApp` exports, and application boot.
9. `js/firestore-tx.js`: Generic, app-agnostic Firestore transaction helpers exposed as `window.FISHAO_FS_TX` (`readModifyWrite(db, docRef, modifier)` and `setDocument(db, docRef, data)`). It contains no collection, document or field names; `js/market.js` supplies those.

### 2.6 Modular Stylesheets (`css/`)

The 3,200+ line monolithic `style.css` was refactored into targeted CSS modules:
1. `css/base.css`: `:root` color tokens, resets, body typography, container layout.
2. `css/header.css`: Header bar, logo, clock widget, timezone & language switchers, auth pill.
3. `css/nav.css`: Main navigation bar tabs (segmented control) and view sub-toolbars.
4. `css/filters.css`: Search input, filter card grid, fish size slider & numeric inputs, filter pills.
5. `css/table.css`: Table layout, zebra striping, sticky headers, fish images, rating stars, price trends, caught buttons.
6. `css/clubs.css`: Active club header bar, roadmap milestones, member cards, special fish cards.
7. `css/players.css`: Community player cards, grid, backyard chips, and detail modal extensions.
8. `css/modals.css`: Fish detail modal hero, fish market single & bulk modals, auth gate cards, player profile modal, emoji picker, toast messages.
9. `css/responsive.css`: Mobile and tablet media queries (`<=900px`, `<=768px`, `<=640px`, `<=420px`).

`style.css` acts as the master `@import` orchestrator for backward compatibility.

### 2.7 Smart Bait Competition & Catch-Chance Advisor

Evaluates which bait gives a target fish the highest bite share in each location/sub-area by modeling competing species:
1. **Engine (`js/state.js`):**
   * `RATING_SPAWN_WEIGHTS` (`{ 1: 1.0, 2: 0.65, 3: 0.35, 4: 0.15, 5: 0.06 }`) combined with `rarity_factor` (`getFishSpawnWeight()`).
   * `isFishInSpot(fish, locKey, placeKey)` includes general location fish (`places: []`, resolving to `[null]`) as competitors inside sub-areas of the same location (e.g., Raft, Boat, Jetty, Zones), while keeping sub-area exclusives out of shore-only (`placeKey === null`) pools.
   * `computeFishBaitRecommendations(fish, options)` supports `timeMode` (`'now'`, `'overlap'`, `'all'`), `filterLoc`, `filterArea`, and `onlyUnlockedClub`.
   * `compareBaitScores(a, b)` ranks baits primarily by lowest `competitorWeight` (equivalently highest `chancePct`), breaking ties by `competitorCount` and `commonCount`.
   * `chancePct` (`targetWeight / (targetWeight + competitorWeight) * 100`) represents **bite share among biting species** (not absolute per-cast probability, as server-side empty-cast rates are not in `fishes.js`).
   * `renderFishBaitsCell(fish)` sorts bait tags in the table, highlights the best bait (`.bait-best`), and shows `+N` competitors and the percentage badge (`.bait-chance-pct`).
2. **Table Sorting & Quick Toggle (`js/filters.js`, `index.html`):**
   * `#sortBy` supports `chance_desc` and `chance_asc`; `#btnBestChance` (`toggleBestChanceSort()`) provides a one-click toggle in `.quick-status-toggles`.
   * Sorting evaluates `computeFishBaitRecommendations` dynamically against active location, area, `#btnNow`, and club unlock filters.
3. **Fish Detail Modal (`js/market.js`):**
   * `renderModalBaitAdvisor()` renders per-spot bait rankings, the `⚡ Právě teď` (`modalBaitAdvisorTimeMode`, defaulting to `'now'`, toggleable to `'overlap'`) mode button, a collapsible `ℹ️ Jak to funguje?` info panel (`toggleModalBaitAdvisorInfo()`), expandable competitor lists, and `filterTableByBaitSpot()` to jump straight to that spot in the table.

---

## 3. Localization System (`data/i18n.js`, `data/i18n/`, & `build_i18n.py`)

* **Structure:**
  * `data/i18n/ui_cs.js`: Czech UI dictionary (`FISHAO_I18N_UI_CS`).
  * `data/i18n/ui_en.js`: English UI dictionary (`FISHAO_I18N_UI_EN`).
  * `data/i18n/ui_pl.js`: Polish UI dictionary (`FISHAO_I18N_UI_PL`).
  * `data/i18n/taxonomies.js`: Canonical taxonomies (`FISHAO_I18N_TAXONOMIES`), auto-generated by `build_i18n.py` from `lang_*.json` plus EFPT/city maps (16 baits, 3 waters, 41 locations [25 `location_<id>` + 16 `EFPT_*`], 19 cities).
  * `data/i18n/fish_names.js`: 615 fish translations (`FISHAO_I18N_FISH_NAMES`), auto-generated by `build_i18n.py` from `lang_cz.json`, `lang_en.json`, and `lang_pl.json` (615 CS, 615 EN, 565 PL).
  * `data/i18n.js`: Core engine exposing `window.FISHAO_I18N`.
* **Supported Languages & `LANGUAGES` Registry:** `cs` (Czech, default), `en` (English), `pl` (Polish). Initial language resolves in order: `?lang=` URL param -> `localStorage['fishao_lang']` -> `navigator.languages` -> `'cs'`.
* **Fallback Chains:** Configured per language in `LANGUAGES`: `pl -> ['en', 'cs']` and `en -> ['cs']`. Both `t()` and `resolveEntry()` (used by `getFishName`, `getLocationName`, `getBaitName`, `getWaterName`) walk the fallback chain, so the 50 fish without a Polish translation in `lang_pl.json` resolve automatically to English.
* **Plural Rules (`Intl.PluralRules`):** When `t(key, params)` receives a numeric `params.count`, it resolves `key_<category>` (`_one`, `_few`, `_many`, `_other`) via `Intl.PluralRules(locale)` before falling back to `key` (used by `member_count`, `club_active_members`, and `players_count_stat`).
* **Core Helpers on `window.FISHAO_I18N`:**
  * `t(key, params, fallback)`: Translates UI strings with plural support and `{placeholder}` interpolation.
  * `getFishName(fish, lang)` / `getAltFishName(fish, lang)`: Primary fish name (with fallback chain) and exact secondary fish name (`altNameLang`, without fallback).
  * `getLocationName(loc, lang)` / `getBaitName(bait, lang)` / `getWaterName(water, lang)` / `getCityName(city, lang)`: Game taxonomy and timezone city lookups.
  * `formatDayMonth(month, day, lang)` / `formatDate(isoDate, lang)`: Locale-aware seasonal date and ISO price date formatting (`dateStyle`: `'cs'`, `'iso'`, `'intl'`).
  * `norm(s)` / `matchesFishSearch(fish, query)`: Diacritics-insensitive folding (including Polish `ł/Ł -> l/L`) and cross-language search across all fish names.
* **DOM Auto-translation:**
  * Elements with `[data-i18n="key"]` have their text/HTML updated on language change.
  * Inputs with `[data-i18n-placeholder="key"]` have their placeholders updated.
  * Elements with `[data-i18n-title="key"]` and `[data-i18n-aria-label="key"]` have their `title` / `aria-label` attributes updated.

---

## 4. UI Layout & View Routing

The application switches views via `window.fishaoApp.switchView(viewName)`:

View Key        | Tab Button       | Main Header Sub-Toolbar
:-------------- | :--------------- | :----------------------
`"all"`         | `#tabAll`        | `#bannerCollection` (Blue theme – catch stats or guest sign-in banner)
`"club"`        | `#tabClub`       | `#bannerClub` (Gold theme – unlocked milestones, hide locked toggle)
`"club_manage"` | `#tabClubManage` | Full management dashboard (member roster, milestone roadmap, special fish)
`"market"`      | `#tabMarket`     | `#bannerMarket` (Market stats, Sunday notice, bulk import trigger)
`"players"`     | `#tabPlayers`    | `#bannerPlayers` (Teal theme – player search, backyard filter, bred fish dropdown)

---

## 5. Development Guidelines for Agents

1. **Do not read whole 400KB data files:** Never use `read_file` on `data/fishes.js`, `fish.json`, `lang_cz.json`, `lang_en.json`, or `lang_pl.json` without `StartLine` and `EndLine` limits.
2. **Preserve Vanilla JS purity:** Do not introduce Node.js or build-tool dependencies. Everything must run natively in the browser on GitHub Pages.
3. **Always syntax-check:** Validate any edited or created JavaScript files with `node --check "<filepath>"`.
4. **Multilingual integrity:** When introducing new UI labels or messages, provide keys in Czech (`cs`), English (`en`), and Polish (`pl`) across `data/i18n/ui_cs.js`, `data/i18n/ui_en.js`, and `data/i18n/ui_pl.js`. Regenerate `data/i18n/fish_names.js` using `python build_i18n.py` if `lang_*.json` changes.
5. **Enforce Sunday market rules:** Fish Market prices can never be submitted or imported for Sunday dates.
6. **Enforce price-value dedupe:** A numeric price is stored only once per fish across all dates. New writes go through Firestore transactions in `js/firestore-tx.js`; never merge or rewrite existing duplicate rows during display or migration. Use `normalizePriceEntries` for every display path.

