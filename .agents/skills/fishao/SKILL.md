<!--  -->---
name: fishao
description: >-
  Comprehensive guide, data schemas, Firestore models, and code architecture for
  the FISHAO (fishao-fun) web application. Activate whenever modifying features,
  inspecting fish data, club mechanics, Fish Market prices, or localization.
---

# FISHAO Application & Architecture Guide

This skill provides the complete reference for developing and maintaining the **FISHAO (fishao-fun)** web application. It eliminates the need for agents to read large data files (`data/fishes.js`, `fish.json`, `lang_cz.json`, `lang_en.json`) by documenting their exact schemas, data models, and business logic.

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
  "baits": ["Červ", "Hmyz"],   // Array<String>: List of valid bait names
  "locations": ["Laketown"],   // Array<String>: Parent location names where the fish can be caught
  "places": ["EFPT_LOST_VALLEY_POND_1"], // Array<String>: Specific EFPT sub-locations; [] for most fish
  "raw_times": ["00:00-06:00", "18:00-24:00"], // Array<String>: Active catch time windows (Game UTC)
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

**Supported specific fishing places (`places`):** 194 fish carry one of these
EFPT identifiers. They are translated in `data/i18n/taxonomies.js`.
The parent `locations` label is composed at render time: tables show the parent
only, while the fish detail modal shows the parent plus a compact area chip.
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

**Water type is derived, not stored.** `getFishWater(fish)` in `js/state.js`
returns `Slaná` for `EFPT_CLUB_AREA_SALT`, `Sladká` for
`EFPT_CLUB_AREA_FRESH`, and `''` for other fish. Club tables, filters and
milestones use this helper instead of a `water` field.

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
4. `js/market.js`: Fish market price history persistence (`saveLocalPriceHistory`), Sunday detection, display normalization (`normalizePriceEntries`), price lookups (`getLatestPrice`, `getMaxPrice` — highest distinct price, ties resolved to the most recent date), single price submission/deletion through Firestore transactions (`submitNewPrice`, `deletePriceEntry`), fish detail modal rendering (`openPriceModal`, including the `rarity_factor` → tier badge helpers `getRarityTier` / `formatRarityPercent`), normalized modal price history rendering (`renderModalHistory`), bulk price import with duplicate skipping and autocomplete suggestions (`processBulkImport`), default reset (`resetPriceHistoryToDefault`), and JSON export (`exportPricesJson`).
5. `js/filters.js`: Multi-criteria fish filtering engine (`applyFilters`, `resetFilters`), parent-location and specific-area dropdown logic (`initLocationOptions`, `onLocationFilterChange`, `updateAreaFilterOptions`), mission size handlers (`setSizeFilter`, `onRangeSizeInput`), collection filters, and dropdown options initializers.
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

---

## 3. Localization System (`data/i18n.js` & `data/i18n/`)

* **Structure:**
  * `data/i18n/ui_cs.js`: Czech UI dictionary (`FISHAO_I18N_UI_CS`).
  * `data/i18n/ui_en.js`: English UI dictionary (`FISHAO_I18N_UI_EN`).
  * `data/i18n/taxonomies.js`: Baits, waters, and locations translations (`FISHAO_I18N_TAXONOMIES`).
  * `data/i18n/fish_names.js`: 615 fish translations (`FISHAO_I18N_FISH_NAMES`).
  * `data/i18n.js`: Core engine exposing `window.FISHAO_I18N`.
* **Supported Languages:** `cs` (Czech, default), `en` (English).
* **Helper Function:** `t(key, params)` retrieves translated strings and interpolates `{placeholder}` tokens.
* **Fish Names:** Handled dynamically via `window.FISHAO_I18N.getFishName(fish, lang)` using the translations map in `data/i18n/fish_names.js`.
* **DOM Auto-translation:**
  * Elements with `[data-i18n="key"]` have their text/HTML updated on language change.
  * Inputs with `[data-i18n-placeholder="key"]` have their placeholders updated.
  * Elements with `[data-i18n-title="key"]` have their `title` tooltips updated.

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

1. **Do not read whole 400KB data files:** Never use `read_file` on `data/fishes.js`, `fish.json`, `lang_cz.json`, or `lang_en.json` without `StartLine` and `EndLine` limits.
2. **Preserve Vanilla JS purity:** Do not introduce Node.js or build-tool dependencies. Everything must run natively in the browser on GitHub Pages.
3. **Always syntax-check:** Validate any edited or created JavaScript files with `node --check "<filepath>"`.
4. **Bilingual integrity:** When introducing new UI labels or messages, always provide both Czech (`cs`) and English (`en`) keys in `data/i18n.js`.
5. **Enforce Sunday market rules:** Fish Market prices can never be submitted or imported for Sunday dates.
6. **Enforce price-value dedupe:** A numeric price is stored only once per fish across all dates. New writes go through Firestore transactions in `js/firestore-tx.js`; never merge or rewrite existing duplicate rows during display or migration. Use `normalizePriceEntries` for every display path.

