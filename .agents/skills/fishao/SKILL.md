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

* `/prices/history`:
  * Document `data`: Contains `{ prices: { [fishId]: [ { date, price } ] } }`.
* `/clubs/{clubId}`:
  * `name`: String (Club name).
  * `points`: Number (Current accumulated club points).
  * `creatorId`: String (Firebase UID of the creator).
  * `specialUnlocked`: Array<Number> (List of unlocked FC/Monster fish IDs).
  * `members`: Map<UID, { displayName, avatarUrl, joinedAt, caughtCount, caughtClubCount }>.
* `/users/{uid}`:
  * `displayName`: String (Player game nickname).
  * `avatarUrl`: String (URL or emoji icon).
  * `clubId`: String | null.
  * `caughtFish`: Array<Number> (IDs of all fish the player has caught).
  * `lastUpdated`: Timestamp.

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
