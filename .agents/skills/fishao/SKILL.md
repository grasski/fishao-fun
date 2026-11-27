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
* **Static Build & CI Pipeline:** Raw modular files load directly in local development without any bundler step. On deployment (`.github/workflows/deploy-pages.yml`), `scripts/build_dist.py` bundles & minifies (with `esbuild` when installed) CSS/JS and hashed `en`/`pl` i18n chunks into `_site/dist/`.
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
  "fruit_recipe": [2, 2, 6],   // Array<Number>: Ordered Palm Island fruit IDs (1..9) for the 18 fruit_combinations_done fish; absent for others (translated via FISHAO_I18N.getFruitName)
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

**Palm Island fruit recipes (`fruit_recipe`):** the 18 fish whose raw
`catch_req` carries `fruit_combinations_done` (a recipe ID, 6..23) unlock only
after blending a specific fruit drink at NPC Jahni on Palm Island. The ordered
recipes come from `data/raw/fish-extra.json` (keyed by a separate 0-based fishdex index, so `build_data.py` joins them by Czech fish name and asserts 1:1 
coverage). They are emitted as ordered fruit IDs (`fruit_1..fruit_9`: Banán, 
Kokos, Kiwi, Citron, Mango, Pomeranč, Papája, Ananas, Pitaja), translated via the 
`fruits` taxonomy and `FISHAO_I18N.getFruitName()`. The fish detail modal shows 
them as ordered chips (`#modalFishFruitBox`); the fish table shows a 🍹 badge 
(`.badge-fruit-tag`) with the recipe tooltip.

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

### 2.2 Fish Market Pricing Schema (`prices_summary` + `/fishao_market_daily/{YYYY-MM}`)
Market prices are stored compactly in `/fishao_market/prices_summary` for fast initial load, while full per-day price logs live in monthly archives `/fishao_market_daily/{YYYY-MM}` (loaded lazily per fish/month in the modal).

```javascript
// /fishao_market/prices_summary -> data.prices
{
  "1": {
    "byPrice": {
      "142": { "l": "2026-11-07", "c": 3 },
      "138": { "l": "2026-11-06", "c": 1 }
    },
    "td": "2026-11-07",
    "t": [142]
  }
}

// /fishao_market_daily/2026-11 -> data.days
{
  "2026-11-07": { "1": 142, "12": [45, 50] },
  "2026-11-06": { "1": 138 }
}
```

In memory (`js/state.js` / `js/market.js`), `summaryMapToPriceHistory(priceSummary)` expands `prices_summary` into `{ [fid]: [ { date, price, count } ] }` (sorted newest-first) for UI tables, sorting, and charts.

#### Fish Market Business Rules:
1. **Sunday Closed:** Every Sunday (`getUTCDay() === 0`), the Fish Market is **closed**.
   * No prices can be entered for Sunday dates (validated in modal and bulk import, and skipped by `scripts/sync-market-prices.mjs`).
   * Default input dates use the current UTC date (`getTodayISO()`), so on Sundays the Sunday date is pre-filled, immediately displaying the red Sunday warning and disabling the submit button.
2. **Variable Community Prices & Daily Recording:** Prices differ per player and change daily. Multiple prices for the same fish on the same day are allowed when values differ, and the same price reoccurring on a **new date** is recorded in `fishao_market_daily/{YYYY-MM}` and increments `{ c }` (`count`) and updates `{ l }` (`lastDate`) in `prices_summary`.
3. **Per-Day Dedupe:** An identical `(fishId, date, price)` triple is stored at most once. Duplicate checks and dual-document updates (`prices_summary` + `fishao_market_daily/{YYYY-MM}`) execute atomically inside Firestore transactions (`window.FISHAO_FS_TX.runTx`).
4. **Display Normalization & Chart Inspector:** `normalizePriceEntries(list)` in `js/market.js` is the single display normalization. It returns a newest-first array preserving `count`, never mutating storage. The fish detail modal displays min/max cards and `#modalPriceScale` (interactive SVG chart with Y-axis labels, mobile touch/tap + step inspector showing price, last-seen date, and occurrence badge).
5. **Admin Rights:** Administrators (`isAdmin === true`) can delete the currently selected entry directly from the chart inspector bar (`deletePriceEntry`); deletion removes that occurrence from `fishao_market_daily/{YYYY-MM}` and decrements or removes the price bucket in `prices_summary`.

### 2.3 Cloud Firestore Collections

* `/fishao_market/prices_summary`:
  * Document `prices_summary`: Contains `{ prices: { [fishId]: { byPrice, td, t } }, lastUpdated: ISOString }`.
  * Publicly readable. Writable by admins or signed-in users when `manualImportEnabled == true` (plus automated CI sync via Admin SDK).
* `/fishao_market_daily/{YYYY-MM}`:
  * Monthly daily log document `{ days: { [YYYY-MM-DD]: { [fishId]: number | number[] } }, lastUpdated: ISOString }`.
  * Publicly readable; writable under the same rule as `prices_summary`.
* `/fishao_market/prices_history`:
  * Legacy flat price history doc kept read-compatible during migration (`--migrate-only`).
* `/fishao_market/sync_status`:
  * Compact `{ lastSuccessDate, lastSuccessAt, pricesFetched, addedCount, duplicateCount, summaryBytes?, summaryLimitPct?, summaryUniquePrices? }` marker used both for daily idempotency in `.github/workflows/sync-market-prices.yml` (primary external **cron-job.org** trigger at **00:02 UTC** via `workflow_dispatch`, fallback GitHub `schedule` at **00:05 UTC**), `prices_summary` size monitoring (logs GitHub warning at >= 700 KiB), and by `js/auth.js` for cheap staleness checks when `manualImportEnabled == false`.
* `/fishao_market/config`:
  * Document `config`: Feature flag document `{ manualImportEnabled: boolean, lastUpdated: string }`.
  * Readable by everyone; writable only by admins (`isAdmin()`), restricted to keys `['manualImportEnabled', 'lastUpdated']` with `manualImportEnabled is bool`.
  * Subscribed via `onSnapshot` in `js/auth.js`. When `manualImportEnabled !== true`, manual entry/bulk import UI stays hidden via `syncManualImportVisibility()` and market prices load via `getDoc` + `localStorage` TTL / `sync_status`. When `manualImportEnabled === true`, `js/auth.js` switches to real-time `onSnapshot` on `prices_summary`.
* `/clubs/{clubId}`:
  * `name`: String (Club name, 2–40 chars).
  * `name_lower`: String (Lowercase name for search indexing).
  * `points`: Number (Current accumulated club points >= 0).
  * `createdBy`: String (Firebase UID of the creator).
  * `unlockedFcFishIds`: Array<Number> (List of unlocked FC fish IDs).
  * `unlockedMonsterIds`: Array<Number> (List of unlocked Monster fish IDs).
  * `memberCount`: Number (Current member count).
  * `members`: Map<UID, { displayName, avatarUrl, preferredLang?, isCreator, joinedAt, caughtCount, caughtClubCount }>.
  * `createdAt`, `updatedAt`, `lastUpdatedBy`.
* `/users/{userId}` (public community profile):
  * `displayName`: String (Player game nickname, max 40 chars).
  * `avatarUrl`: String (strictly `https://` URL max 500 chars, or emoji preset).
  * `preferredLang`: String (optional; one of `cs`, `en`, `pl`, `nl`, `ro`, `tr`; opt-in flag rendered next to the nickname).
  * `role`: String ('member' | 'admin', immutable by client).
  * `clubId`: String | null.
  * `clubName`: String | null.
  * `caughtFishIds`: Array<Number> (List of caught fish IDs, max 1000).
  * `shinyFishIds`: Array<Number> (List of shiny variant fish IDs, max 1000; always a subset of `caughtFishIds`).
  * `backyardFishIds`: Array<Number> (List of backyard bred fish IDs, max 300; strictly the 83 backyard breedable species).
  * `createdAt`.
* `/users/{userId}/private/settings` (owner & admin only):
  * `friendUids`: Array<String> (Favorited player UIDs, max 300).
  * `reminders`: Array<Object> (Custom event reminders, max 100).
  * `treeLevel`: Number (Optional saved Money Tree current level, integer `1..20`).
  * `lineLevel`: Number (Optional saved Fishing Line current level, integer `1..20`).
  * `lastLogin`, `updatedAt`.
* `/chats/{pairId}` (private to the 2 participants; deterministic `minUid_maxUid`):
  * `participants`: `[uid0, uid1]` (`uid0 < uid1`).
  * `participantInfo`: `{ [uid]: { displayName, avatarUrl, deleted?, lang? } }`.
  * `status`: `'pending' | 'accepted' | 'rejected' | 'blocked'`.
  * `requestedBy`: String (UID of request sender).
  * `blockedBy`: String | null (UID of blocker when `status == 'blocked'`).
  * `preBlockStatus`: String | null (`'pending' | 'accepted' | 'rejected'`, saved when blocking to allow restoring `'accepted'` on unblock).
  * `reason`: `'meetup' | 'backyard' | 'club' | 'trading' | 'discord' | 'general'`.
  * `lastMessagePreview`: String (max 80 chars, plain text, no links/HTML).
  * `lastSenderUid`: String | null.
  * `lastMessageId`: String | null (ID of the latest message created in the same atomic `writeBatch`, verified via `getAfter()`).
  * `lastMessageAt`: Timestamp | null.
  * `lastReadAt`: `{ [uid]: Timestamp }`.
  * `hiddenBy`: Array<String> (optional; set by surviving participant to hide an `accepted` thread when the peer deleted their account).
  * `createdAt`, `updatedAt`, `expiresAt` (Timestamp +14d on `pending`, `null` on `accepted`/`rejected`/`blocked`).
* `/chats/{pairId}/messages/{msgId}` (private to the 2 participants; immutable):
  * `senderUid`: String.
  * `text`: String (1–300 chars plain text; `<`, `>`, URLs, link shorteners, and bare domains rejected in `firestore.rules`).
  * `createdAt`: Timestamp (`request.time`, enforced with `getAfter()` on parent chat doc and 2s cooldown).
  * `expiresAt`: Timestamp (+14 days).
* `/chat_reports/{reportId}` (deterministic `{reporterUid}_{reportedUid}`; readable/manageable by admins, single-doc `get` allowed for reporter):
  * `chatId`, `reporterUid`, `reportedUid`, `category` (`'illegal_content' | 'phishing_scam' | 'harassment' | 'spam' | 'other'`), `note` (<=300 chars), `evidenceMessages` (snapshot of up to 15 messages), `status` (`'open' | 'resolved' | 'dismissed'`), `createdAt`, `expiresAt` (+90 days).
  * At most 1 `'open'` report per `(reporterUid, reportedUid)` pair; reporter can only overwrite after status becomes `'resolved'` or `'dismissed'`.
* `/chat_bans/{userId}` (readable by affected user or admin; writable strictly by admin):
  * `reason` (<=120 chars), `bannedAt`, `bannedUntil` (Timestamp or `null` for permanent), `bannedBy`.

### 2.4 Firebase Security Rules & Communication Best Practices (`firestore.rules`)

1. **Strict Key Masking (Strict Schemas):**
   * `firestore.rules` enforces `.hasOnly([...])` on creates and `.affectedKeys().hasOnly([...])` / `diff().addedKeys()/changedKeys()` on updates.
   * **Rule for agents:** Never add arbitrary fields to Firestore documents without updating `firestore.rules`. Any extraneous field triggers an immediate `permission-denied` error from Firebase.
2. **Read vs Write Permissions:**
   * `/users/{userId}`: Readable by any signed-in user (`request.auth != null`) for club & community rendering; writable ONLY by owner (without altering `role`/`createdAt` or writing private fields) or admin (`isAdmin()`). Legacy private keys may be removed via `deleteField()`.
   * `/users/{userId}/private/settings`: Readable/writable/deletable strictly by owner (`request.auth.uid == userId`) or admin (`isAdmin()`).
   * `/clubs/{clubId}`: Publicly readable (`allow read: if true`). Role-aware updates enforce member-diff rules: non-members can only add themselves (`isCreator == false`), regular members can only remove themselves on leave or update points/unlocks/own member stats; only creators or admins can rename clubs, promote creators, or remove other members.
   * `/fishao_market/{docId}` (`prices_summary`, `prices_history`) & `/fishao_market_daily/{monthId}`: Publicly readable; writable by admins or signed-in users when `isManualImportEnabled()`; delete strictly admin-only.
   * `/fishao_market/config`: Publicly readable; create/update/delete strictly reserved for admins (`isAdmin()`).
   * `/chats/{pairId}` & `/chats/{pairId}/messages/{msgId}`: Strictly private to the two participants (`request.auth.uid in participants`). Messages require `chatOtherParticipantExists`, `!isChatBanned()`, `validChatText`, and atomic parent metadata update. Client `deleteDoc` on `/chats/{pairId}` is forbidden whenever `preBlockStatus == 'accepted'` or `lastMessageAt != null` so `/messages` subcollections are never orphaned.
   * `/chat_reports/{reportId}` & `/chat_bans/{userId}`: Admin-moderated Notice & Action collections.

### 2.5 Modular JavaScript Architecture (`js/`)

The monolithic `app.js` was refactored into modular, cohesive files loaded directly without bundlers:
1. `js/state.js`: Global state variables, derived `clubFishes`, fish helpers (`getFishWater`, `getFishParentLocationLabels`, `getFishAreaLabels`, `getFishAreasForLocation`, and the parent-only `getFishLocationLabels` alias), localization helper `t()`, date and string utilities (`getTodayISO`, `getYesterdayISO`, `isDateSunday`, `normStr`, `escapeHtml`), toast notification (`showToast`), and confirmation dialog (`showConfirmModal`, `resolveConfirmModal`).
2. `js/table.js`: Fish table rendering (`renderTableHead`, `renderTableBody`), UTC-to-local time formatting (`formatCatchTime`, `isFishActiveNow`), rating badges (`renderRatingBadge`), price cells (`renderPriceCell`), and caught/shiny fish collection toggles (`setFishCatchState`, `toggleCaughtFish`, `cycleCaughtState`, `updateCaughtStats`).
3. `js/clubs.js`: Real-time club synchronization via Firestore (`bindClubListener`), deterministic member roster rendering (`renderClubMembers`), member profile modal (`openPlayerModal`), club search, creation, joining, and leaving, club points management, milestones roadmap (`renderClubMilestones`), and FC / Monster special fish unlocks.
4. `js/market.js`: Fish market price history persistence (`saveLocalPriceHistory`), Sunday detection, display normalization (`normalizePriceEntries`), price lookups (`getLatestPrice`, `getMaxPrice` — highest distinct price, ties resolved to the most recent date), single price submission/deletion through Firestore transactions (`submitNewPrice`, `deletePriceEntry`), fish detail modal rendering (`openPriceModal`, including the `rarity_factor` → tier badge helpers `getRarityTier` / `formatRarityPercent`), normalized modal price history rendering (`renderModalHistory`), visual price range scale with average/median markers (`computePriceStats`, `renderModalPriceScale` → `#modalPriceScale`), bulk price import with duplicate skipping and autocomplete suggestions (`processBulkImport`), default reset (`resetPriceHistoryToDefault`), and JSON export (`exportPricesJson`).
5. `js/filters.js`: Multi-criteria fish filtering engine (`applyFilters`, `resetFilters`), parent-location and specific-area dropdown logic (`initLocationOptions`, `onLocationFilterChange`, `updateAreaFilterOptions`), player-level location pre-selection (`onPlayerLevelInput` via `getLocationsForPlayerLevel`), mission size handlers (`setSizeFilter`, `onRangeSizeInput`), collection filters, the Market "missing price" toggle (`toggleNeedsPrice`, `fishNeedsPrice` = 0 normalized entries, `#btnNeedsPrice` with live count; mutually exclusive with `toggleOnlyPrice`), and dropdown options initializers. The specific-area dropdown follows the selected parent location in the fishdex/market views and falls back to `getClubAreas()` in the club view.
6. `js/locations.js`: Locations overview dashboard, unlock metadata (`LOCATION_UNLOCK_INFO`, supporting `free`, `home`, `level`, `fish`, `fc`, `club`, `backyard` unlock types), badge rendering (`getLocationUnlockBadgeData`), and level-based location availability (`getLocationsForPlayerLevel`).
6. `js/auth.js`: Firebase authentication (`signIn`, `signOut`), GDPR-compliant profile synchronization (`loadUserProfile`, `saveProfile`), account deletion cleanup (`deleteAccount` -> `cleanupUserChatsOnAccountDelete`), and UI state synchronization (`updateAuthUI`).
7. `js/players.js`: Community player list, backyard fish breeding (`backyardFishIds`), universal player modal, reverse fish-to-player lookups.
8. `js/chat.js`: Private 1-on-1 player chat (`initChatSync`, `openChatModal`, `openChatWithPlayer`, `submitChatRequest`, `sendChatMessage`), sidebar player search (`onChatPlayerSearchInput`), block/unblock with `preBlockStatus` restoration (`blockChatUser`, `unblockChatUser`), deleted-peer detection & thread dismissal (`verifyChatPeerExists`, `dismissDeletedChatThread`), abuse reporting (`openChatReportModal`, `submitChatReport`), real-time admin open-report watcher (`syncAdminReportsWatcher`), and admin moderation views (`Nevyřízená`, `Vše (archiv)`, `🚫 Zabanovaní`).
9. `js/guide.js`: Guide section rendering (`renderGuideView`), Money Tree & Fishing Line upgrade tables (20 levels from `data/raw/tree.json` & `data/raw/line.json`), interactive From->To calculator (`onGuideCalcChange`, `onGuideRowClick`), local + Firestore private settings level persistence (`persistGuideCurrentLevel`, `syncGuideLevelsFromProfile`), and FC payback/ROI calculations (`formatPaybackDays`).
10. `js/main.js`: Live clock and timezone switching (`setTimezone`, `updateClock`), view routing (`switchView`), static DOM translations (`setLanguage`, `updateStaticTranslations`), `z-index`-aware modal focus trap (`getTopActiveModal`), `window.fishaoApp` exports, and application boot.
10. `js/firestore-tx.js`: Generic, app-agnostic Firestore transaction helpers exposed as `window.FISHAO_FS_TX` (`readModifyWrite(db, docRef, modifier)`, `setDocument(db, docRef, data)`, `runTx`, `commitBatch`).

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
9. `css/chat.css`: Header chat badge, 2-pane chat dialog, sidebar player search, message bubbles, safety banner, admin report/ban cards, and modal `z-index` layering (`#chatModalOverlay` 1000 < `#priceModalOverlay` 1050 < `#playerModalOverlay` 1100 < `#chatRequestModalOverlay`/`#chatReportModalOverlay` 1200 < `#confirmModalOverlay` 10000).
10. `css/locations-calendar.css`: Sub-navigation bar, Locations Overview cards, and Seasonal Fish Calendar timeline/grid.
11. `css/guide.css`: Guide upgrade calculator cards, metric summary grid, Money Tree ROI badges, and Fishing Line color chips.
12. `css/responsive.css`: Mobile and tablet media queries (`<=900px`, `<=768px`, `<=640px`, `<=420px`).

`style.css` acts as the master `@import` orchestrator for backward compatibility.

### 2.7 Smart Bait Competition & Catch-Chance Advisor

Evaluates which bait gives a target fish the highest bite share in each location/sub-area by modeling competing species:
1. **Engine (`js/state.js`):**
   * `RATING_SPAWN_WEIGHTS` (`{ 1: 1.0, 2: 0.65, 3: 0.35, 4: 0.15, 5: 0.06 }`) combined with `rarity_factor` (`getFishSpawnWeight()`).
   * `isFishInSpot(fish, locKey, placeKey)` includes general location fish (`places: []`, resolving to `[null]`) as competitors inside sub-areas of the same location (e.g., Raft, Boat, Jetty, Zones), while keeping sub-area exclusives out of shore-only (`placeKey === null`) pools.
   * `computeFishBaitRecommendations(fish, options)` supports `timeMode` (`'now'`, `'overlap'`, `'all'`), `filterLoc`, `filterArea`, and `onlyUnlockedClub`.
   * `compareBaitScores(a, b)` ranks baits **for the same target fish** primarily by fewest same-star competitors (`sameRatingCount`, raw species count with `cand.rating === fish.rating`, ignoring `rarity_factor`), then falls back to lowest `competitorWeight`, then `competitorCount` and `commonCount`. `isBaitScoreTied` requires all of these to match, so `isBestInSpot`/`isBestOverall`/`.bait-best` stay consistent. A bait with more total competitors can therefore rank higher if it has fewer same-star ones.
   * `chancePct` = `(0.35 * sameShare + 0.65 * overallShare) * 100`, where `sameShare = targetWeight / (targetWeight + sameRatingWeight)` and `overallShare = targetWeight / (targetWeight + competitorWeight)`. `100` when there are no competitors, capped at `99` otherwise. It represents **bite share among biting species** (not absolute per-cast probability, as server-side empty-cast rates are not in `fishes.js`).
   * The Bait Advisor tooltip text (`advisor_info_desc`) in all 6 `ui_*.js` files must be kept in sync with this logic.
   * `renderFishBaitsCell(fish)` sorts bait tags in the table, highlights the best bait (`.bait-best`), and shows `+N` competitors and the percentage badge (`.bait-chance-pct`).
2. **Table Sorting & Quick Toggle (`js/filters.js`, `index.html`):**
   * `#sortBy` supports `chance_desc` and `chance_asc`; `#btnBestChance` (`toggleBestChanceSort()`) provides a one-click toggle in `.quick-status-toggles`.
   * Across **different fish**, sorting orders by each fish's top-bait `chancePct` first (so the displayed percentages are monotonic), using `compareBaitScores` only as a tie-breaker.
   * Sorting evaluates `computeFishBaitRecommendations` dynamically against active location, area, `#btnNow`, and club unlock filters.
3. **Fish Detail Modal (`js/market.js`):**
   * `renderModalBaitAdvisor()` renders per-spot bait rankings, the `⚡ Právě teď` (`modalBaitAdvisorTimeMode`, defaulting to `'now'`, toggleable to `'overlap'`) mode button, a collapsible `ℹ️ Jak to funguje?` info panel (`toggleModalBaitAdvisorInfo()`), expandable competitor lists, and `filterTableByBaitSpot()` to jump straight to that spot in the table.

### 2.8 Private 1-on-1 Player Chat, Moderation & Daily GitHub Actions Cleanup

1. **Lifecycle & Double Opt-In (`js/chat.js`):**
   * Initiated from player cards (`.player-card-chat-btn`), player profile modal (`#playerModalChatBtn`), or directly via the chat sidebar player search (`#chatPlayerSearchInput`).
   * Creates `/chats/{minUid_maxUid}` with `status: 'pending'` and a category `reason` (`meetup`, `backyard`, `club`, `trading`, `discord`, `general`).
   * Once accepted by the recipient (`status: 'accepted'`), both players can exchange plain-text messages (`1..300` chars, no HTML/URLs).
   * Active pane rendering preserves `#chatMessageInput` focus/value across background snapshot updates (`_renderedChatPaneId` guard) and deduplicates read-receipt writes (`{ serverTimestamps: 'estimate' }` + `_lastMarkedReadMsgMs`).
2. **Automated Daily Cleanup via GitHub Actions (`.github/workflows/cleanup-chat.yml` + `scripts/cleanup-chat.mjs`):**
   * Executed daily by **GitHub Actions** (`cron: '15 3 * * *'`, plus manual `workflow_dispatch` with `dry_run`), authenticating to Firebase via `FIREBASE_SERVICE_ACCOUNT` (free on the Firebase Spark tier, using standard Admin SDK `delete()` calls).
   * Deletes messages older than 14 days while keeping `accepted` threads active (clearing stale `lastMessagePreview` once no newer messages remain).
   * Deletes unanswered `pending` requests older than 14 days, expired temporary bans in `/chat_bans`, and closed (`resolved`/`dismissed`) `/chat_reports` older than 90 days.
   * Uses `db.collection('chats').listDocuments()` + `db.getAll()` to clean up orphaned chats and parentless `/messages` subcollections whenever a participant account no longer exists in `/users` (or has `deleted: true`), provided no `open` report references that `chatId`. Active `blocked` and `rejected` records between live accounts are never deleted so anti-spam blocks persist.

---

## 3. Localization System (`data/i18n.js`, `data/i18n/`, & `build_i18n.py`)

* **Structure:**
  * `data/i18n/ui_cs.js`: Czech UI dictionary (`FISHAO_I18N_UI_CS`).
  * `data/i18n/ui_en.js`: English UI dictionary (`FISHAO_I18N_UI_EN`).
  * `data/i18n/ui_pl.js`: Polish UI dictionary (`FISHAO_I18N_UI_PL`).
  * `data/i18n/taxonomies.js`: Canonical taxonomies (`FISHAO_I18N_TAXONOMIES`), auto-generated by `build_i18n.py` from `lang_*.json` plus EFPT/city maps (16 baits, 3 waters, 41 locations [25 `location_<id>` + 16 `EFPT_*`], 19 cities, 9 fruits).
  * `data/i18n/fish_names.js`: 615 fish translations (`FISHAO_I18N_FISH_NAMES`), auto-generated by `build_i18n.py` from `lang_cz.json`, `lang_en.json`, and `lang_pl.json` (615 CS, 615 EN, 565 PL).
  * `data/i18n.js`: Core engine exposing `window.FISHAO_I18N`.
* **Supported Languages & `LANGUAGES` Registry:** `cs` (Czech, default), `en` (English), `pl` (Polish). Initial language resolves in order: `?lang=` URL param -> `localStorage['fishao_lang']` -> `navigator.languages` -> `'cs'`.
* **Fallback Chains:** Configured per language in `LANGUAGES`: `pl -> ['en', 'cs']` and `en -> ['cs']`. Both `t()` and `resolveEntry()` (used by `getFishName`, `getLocationName`, `getBaitName`, `getWaterName`) walk the fallback chain, so the 50 fish without a Polish translation in `lang_pl.json` resolve automatically to English.
* **Plural Rules (`Intl.PluralRules`):** When `t(key, params)` receives a numeric `params.count`, it resolves `key_<category>` (`_one`, `_few`, `_many`, `_other`) via `Intl.PluralRules(locale)` before falling back to `key` (used by `member_count`, `club_active_members`, and `players_count_stat`).
* **Core Helpers on `window.FISHAO_I18N`:**
  * `t(key, params, fallback)`: Translates UI strings with plural support and `{placeholder}` interpolation.
  * `getFishName(fish, lang)` / `getAltFishName(fish, lang)`: Primary fish name (with fallback chain) and exact secondary fish name (`altNameLang`, without fallback).
  * `getLocationName(loc, lang)` / `getBaitName(bait, lang)` / `getWaterName(water, lang)` / `getCityName(city, lang)` / `getFruitName(fruitId, lang)`: Game taxonomy, timezone city, and Palm Island fruit lookups.
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
`"guide_tree"`  | `#tabGuide`      | `#bannerGuide` (Green theme – Money Tree 20 levels, calculator & FC payback ROI)
`"guide_line"`  | `#tabGuide`      | `#bannerGuide` (Gold theme – Fishing Line 20 levels, calculator, max length & colors)
`"guide_shop"`  | `#tabGuide`      | `#bannerGuide` (Cyan theme – In-game Shop catalog for baits, rods, bobbers & resources with icons)

---

## 5. Development Guidelines for Agents

1. **Do not read whole 400KB data files:** Never use `read_file` on `data/fishes.js`, `fish.json`, `lang_cz.json`, `lang_en.json`, or `lang_pl.json` without `StartLine` and `EndLine` limits.
2. **Preserve Vanilla JS compatibility:** Raw modular JS/CSS must run directly in the browser without requiring a dev server compiler, while `scripts/build_dist.py` prepares `_site/dist/` for GitHub Pages.
3. **Always syntax-check:** Validate any edited or created JavaScript files with `node --check "<filepath>"` before deployment (also verified in CI).
4. **Multilingual integrity:** When introducing new UI labels or messages, provide keys in Czech (`cs`), English (`en`), and Polish (`pl`) across `data/i18n/ui_cs.js`, `data/i18n/ui_en.js`, and `data/i18n/ui_pl.js`. Regenerate `data/i18n/fish_names.js` using `python scripts/build_i18n.py` if `lang_*.json` changes.
5. **Enforce Sunday market rules:** Fish Market prices can never be submitted or imported for Sunday dates.
6. **Enforce per-day price dedupe:** Each `(fishId, date, price)` triple is stored at most once, while repeated prices across different dates are recorded daily in `/fishao_market_daily/{YYYY-MM}` and aggregated in `/fishao_market/prices_summary`. All writes go through Firestore transactions in `js/firestore-tx.js`. Use `normalizePriceEntries` for every display path.

