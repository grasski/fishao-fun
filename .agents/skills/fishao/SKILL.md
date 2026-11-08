---
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

### 2.1 Fish Object Schema (`data/fishes.js` – 277 KB, 615 fish)
`window.FISHAO_FISHES` is an array of 615 fish objects.
Each fish object has the following structure:

```javascript
{
  "id": 1,                     // Number: Unique game fish ID (1 .. 1200+)
  "order": 1,                  // Number: Club order (1 .. 80 for club fishes; 0 for others)
  "name": "Okoun říční",       // String: Default Czech fish name
  "water": "Sladká",           // String: 'Sladká' (Freshwater) | 'Slaná' (Saltwater)
  "baits": ["Červ", "Hmyz"],   // Array<String>: List of valid bait names
  "locations": ["Laketown"],   // Array<String>: Location names where the fish can be caught
  "raw_times": ["00:00-06:00", "18:00-24:00"], // Array<String>: Active catch time windows (Game UTC)
  "is_night": true,            // Boolean: true if only active at night/deep night
  "min_l": 15.0,               // Number: Minimum catch length in cm
  "avg_l": 32.5,               // Number: Average catch length in cm
  "max_l": 55.0,               // Number: Maximum catch length in cm
  "rating": 3,                 // Number: Difficulty/rarity rating (1 to 5 stars)
  "is_club": true,             // Boolean: true if it is one of the 80 club fish
  "points": 500,               // Number: Club points required to unlock (for points fish)
  "unlock_type": "points"      // String: 'points' | 'fc' (Fishcoins) | 'monster'
}
```

> [!TIP]
> **Club Fish Breakdown (80 total):**
> * **56 Points Fishes:** `unlock_type: "points"`, unlocked progressively as club points increase.
> * **21 Fishcoin Fishes:** `unlock_type: "fc"`, unlocked manually by club creator/members.
> * **3 Monster Fishes:** `unlock_type: "monster"`, unlocked manually for the club.

### 2.2 Fish Market Pricing Schema (`prices_history.json` & Firestore)
Prices are stored as a map from `fishId` (as string) to an array of price entries sorted descending by date (`YYYY-MM-DD`):

```javascript
{
  "1": [
    { "date": "2026-11-07", "price": 142 },
    { "date": "2026-11-06", "price": 138 }
  ]
}
```

#### Fish Market Business Rules:
1. **Sunday Closed:** Every Sunday (`getDay() === 0`), the Fish Market is **closed**.
   * No prices can be entered for Sunday dates (validated in modal and bulk import).
   * Sunday date input shows a red warning and disables the submit button.
   * On Sundays, default input dates fall back to Saturday (the last open day).
2. **User Daily Limit:** Authenticated players can submit at most 1 price per fish per day.
3. **Admin Rights:** Administrators (`isAdmin === true`) can overwrite existing prices and delete historical entries.

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
1. `js/state.js`: Global state variables, localization helper `t()`, date and string utilities (`getTodayISO`, `getYesterdayISO`, `isDateSunday`, `normStr`, `escapeHtml`), toast notification (`showToast`), and confirmation dialog (`showConfirmModal`, `resolveConfirmModal`).
2. `js/table.js`: Fish table rendering (`renderTableHead`, `renderTableBody`), UTC-to-local time formatting (`formatCatchTime`, `isFishActiveNow`), rating badges (`renderRatingBadge`), price cells (`renderPriceCell`), and caught fish collection toggles (`toggleCaughtFish`, `updateCaughtStats`).
3. `js/clubs.js`: Real-time club synchronization via Firestore (`bindClubListener`), deterministic member roster rendering (`renderClubMembers`), member profile modal (`openPlayerModal`), club search, creation, joining, and leaving, club points management, milestones roadmap (`renderClubMilestones`), and FC / Monster special fish unlocks.
4. `js/market.js`: Fish market price history persistence (`persistPriceHistory`), Sunday detection, single price submission/deletion (`submitNewPrice`, `deletePriceEntry`), modal price history rendering (`renderModalHistory`), bulk price import with autocomplete suggestions (`processBulkImport`), and JSON export (`exportPricesJson`).
5. `js/filters.js`: Multi-criteria fish filtering engine (`applyFilters`, `resetFilters`), mission size handlers (`setSizeFilter`, `onRangeSizeInput`), collection filters, and dropdown options initializers.
6. `js/auth.js`: Firebase authentication (`signIn`, `signOut`), GDPR-compliant profile synchronization (`loadUserProfile`, `saveProfile`), and UI state synchronization (`updateAuthUI`).
7. `js/main.js`: Live clock and timezone switching (`setTimezone`, `updateClock`), view routing (`switchView`), static DOM translations (`setLanguage`, `updateStaticTranslations`), modal listeners, `window.fishaoApp` exports, and application boot.

---

## 3. Localization System (`data/i18n.js`)

* **Supported Languages:** `cs` (Czech, default), `en` (English).
* **Helper Function:** `t(key, params)` retrieves translated strings and interpolates `{placeholder}` tokens.
* **Fish Names:** Handled dynamically via `window.FISHAO_I18N.getFishName(fish, lang)` using the translations map in `data/i18n.js`.
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

---

## 5. Development Guidelines for Agents

1. **Do not read whole 400KB data files:** Never use `read_file` on `data/fishes.js`, `fish.json`, `lang_cz.json`, or `lang_en.json` without `StartLine` and `EndLine` limits.
2. **Preserve Vanilla JS purity:** Do not introduce Node.js or build-tool dependencies. Everything must run natively in the browser on GitHub Pages.
3. **Always syntax-check:** Validate any edited or created JavaScript files with `node --check "<filepath>"`.
4. **Bilingual integrity:** When introducing new UI labels or messages, always provide both Czech (`cs`) and English (`en`) keys in `data/i18n.js`.
5. **Enforce Sunday market rules:** Fish Market prices can never be submitted or imported for Sunday dates.

