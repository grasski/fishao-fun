# FISHAO Development Guidelines for Agents

Welcome! This is the official developer and agent guide for the **FISHAO (fishao-fun)** application.

## Key Architecture & Data Rules
1. **Never read raw 400KB data files in full:**
   * Do NOT read `data/raw/lang_cz.json`, `data/raw/lang_en.json`, `data/raw/lang_pl.json`, `data/fishes.js`, or `data/raw/fish.json` from beginning to end.
   * Full data schemas, object shapes, and Firestore collections are documented in [.agents/skills/fishao/SKILL.md](.agents/skills/fishao/SKILL.md).
2. **Vanilla JavaScript & GitHub Pages Build:**
   * Files load natively by the browser in local dev without a required local bundler, while `.github/workflows/deploy-pages.yml` builds `_site/` via `scripts/build_dist.py` (CSS/JS concatenation, optional `esbuild` minification, and hashed `dist/app.*.min.css`, `dist/app.*.min.js`, `dist/ui_en.*.min.js`, `dist/ui_pl.*.min.js` bundles).
   * Always verify modified or created JavaScript files with `node --check "<filepath>"` (also enforced in CI).
3. **Firebase & Firestore Security Rules (`firestore.rules`):**
   * Firestore rules enforce strict key masking (`hasOnly` / `affectedKeys().hasOnly`). Never write undocumented fields to Firestore.
   * `/users/{userId}` is public community profile data (readable by signed-in users, writable only by owner or admin). Allowed public keys: `displayName`, `role`, `clubId`, `clubName`, `caughtFishIds`, `backyardFishIds`, `createdAt`, `avatarUrl` (strictly `https://` URLs or emoji presets; `http:`, `javascript:`, `data:` and HTML metacharacters are rejected).
   * `/users/{userId}/private/settings` is owner/admin-only private data (`friendUids`, `reminders`, `lastLogin`, `updatedAt`). Never write private fields to `/users/{userId}`.
   * Never store user emails or personal Google data in Firestore (GDPR-free: only store nickname and avatar).
   * Always wrap Firestore operations in `try...catch` and maintain `localStorage` fallback.
4. **Fish Market Rules (Daily Archiving & Summary Model):**
   * The Fish Market is **strictly closed on Sundays** (`getUTCDay() === 0`, UTC server time).
   * No prices can be entered or imported for Sunday dates. On Sundays, price forms keep the Sunday date pre-filled (`getTodayISO()`) so the Sunday closed warning banner and disabled submit button are displayed immediately.
   * Prices are **variable per player and recorded daily**. On a single date, each distinct `(fishId, date, price)` pair is stored at most once; repeating the same price across different dates is allowed and increments its occurrence count.
   * Storage uses a compact `/fishao_market/prices_summary` document (`{ prices: { [fid]: { byPrice: { [price]: { l: lastISO, c: count } }, td: todayISO, t: [todayPrices] } }, lastUpdated }`) for fast initial load, paired with monthly archives `/fishao_market_daily/{YYYY-MM}` (`{ days: { [dateISO]: { [fid]: num | [nums] } }, lastUpdated }`) loaded on demand. Client code (`js/auth.js`) maintains one-time fallback compatibility with legacy `/fishao_market/prices_history`, and `scripts/sync-market-prices.mjs --migrate-only` handles full migration.
   * All price add/delete/bulk writes go through the Firestore transaction helpers in `js/firestore-tx.js` (`window.FISHAO_FS_TX.runTx` / `readModifyWrite` / `commitBatch`). Do not write price documents with ad-hoc `setDoc` calls from `market.js`.
   * Never present a single "today's price" anywhere. Use `normalizePriceEntries()` from `js/market.js` for every display path (table range, modal min/max, counts, occurrence badges).
   * **Manual Price Entry & Bulk Import Feature Flag (`/fishao_market/config`):** Because prices are synced daily automatically, manual price entry (`#priceAddFormBox`, `#priceAddLoginNotice` in the fish detail modal) and bulk import (`#marketImportActionBarRight`, `#marketFloatingImportBtn`) are hidden by default (`manualImportEnabled: false`) and the summary doc is loaded via `localStorage` TTL + `/fishao_market/sync_status` rather than a permanent `onSnapshot` listener. When `manualImportEnabled === true`, `js/auth.js` attaches `onSnapshot` on `/fishao_market/prices_summary`. Admins can toggle this flag from the Profile modal (`#profileAdminSection` -> `toggleManualImportFlag()`) or directly in Firebase Console.
5. **Multilingual Localization & Modular i18n (`data/i18n/`):**
   * Supported languages: Czech (`cs`, default), English (`en`), and Polish (`pl`).
   * Fallback chain is configured per language in `data/i18n.js` (`LANGUAGES` registry): `pl -> en -> cs` and `en -> cs`. Missing Polish fish names or UI strings automatically fall back to English, then Czech.
   * Dictionaries are separated into modular files:
     - `data/i18n/ui_cs.js`: Czech UI strings (`FISHAO_I18N_UI_CS`).
     - `data/i18n/ui_en.js`: English UI strings (`FISHAO_I18N_UI_EN`).
     - `data/i18n/ui_pl.js`: Polish UI strings (`FISHAO_I18N_UI_PL`).
     - `data/i18n/taxonomies.js`: Baits, waters, locations, and timezone city translations (`FISHAO_I18N_TAXONOMIES`).
     - `data/i18n/fish_names.js`: 615 fish translations (`FISHAO_I18N_FISH_NAMES`), auto-generated from `data/raw/lang_cz.json`, `data/raw/lang_en.json`, and `data/raw/lang_pl.json` by `scripts/build_i18n.py`.
     - `data/i18n.js`: Core engine, `LANGUAGES` registry, `Intl.PluralRules` support, and helpers (`t()`, `getFishName()`, `getAltFishName()`, `getLocationName()`, `getBaitName()`, `getWaterName()`, `getCityName()`, `formatDayMonth()`, `formatDate()`, `norm()`).
   * Add all new text keys to `ui_cs.js`, `ui_en.js`, and `ui_pl.js`.
   * Use HTML attributes `data-i18n`, `data-i18n-placeholder`, `data-i18n-title`, and `data-i18n-aria-label` for static elements.
6. **Modular Stylesheets (`css/`):**
   * Styles are organized into modular files under `css/`:
     - `css/base.css`: Root variables (`:root`), resets, body, typography, layout container.
     - `css/header.css`: Header, logo, live time widget, timezone/language toggles, auth panel.
     - `css/nav.css`: Main navigation bar tabs and compact view action bars / sub-toolbars.
     - `css/filters.css`: Search box, filter card, size inputs, toggle pills.
     - `css/table.css`: Table styling, fish images, badges, price cells, caught buttons, counter bar.
     - `css/clubs.css`: Club dashboard, active club bar, milestone roadmap, roster cards, special fish cards.
     - `css/players.css`: Community player directory, player cards, and backyard bred fish styles.
     - `css/modals.css`: Modals layout, fish detail hero, price forms, bulk modal, profile/player modals, toasts.
     - `css/responsive.css`: Unified media queries (<=900px, <=768px, <=640px, <=420px).
   * `style.css` acts as the master `@import` bundle for backward compatibility.
   * All action bar controls maintain a unified 32px height standard (`.pill-btn`, `.toggle-pill`, `.btn-subtle-link`, `.sign-in-btn.sm`).

7. **Modular JavaScript Architecture (`js/`):**
   * Code is organized into cohesive modules under `js/`: `state.js`, `firestore-tx.js`, `table.js`, `clubs.js`, `market.js`, `filters.js`, `auth.js`, `players.js`, `locations.js`, `calendar.js`, `reminders.js`, and `main.js`.
   * `js/firestore-tx.js`: Generic Firestore transaction helpers (`window.FISHAO_FS_TX.loadFirestoreModule`, `readModifyWrite`, `setDocument`, `runTx`, `commitBatch`). Keep it free of app-specific collections, documents, and field names.
   * `js/players.js`: Community player list, friends management (`friendUids` in `/users/{uid}/private/settings`), backyard fish breeding (`backyardFishIds`, strictly the 83 backyard species), universal player modal, reverse fish-to-player lookups.
   * `js/reminders.js`: Game event reminders persisted to `/users/{uid}/private/settings` with `localStorage` fallback.
   * Public browser handlers are exposed on `window.fishaoApp` in `js/main.js`. Do not edit the legacy monolithic `app.js`.

8. **Backyard Fish Breeding ("Za domem") & Community Directory:**
   * Logged-in players can specify which fish they breed in their backyard pond (`backyardFishIds`). Strictly limited to the 83 species that have location `Za domem` in the game.
   * The community tab allows browsing all registered players, their catch progress, club affiliation, and bred fish.
   * In the fish detail modal, players can see who currently has that fish bred ("Kdo má tuto rybu za domem").
   * Friends system (`friendUids`): players can add friends (⭐), filter exclusively by friends, and have friends pinned at the top of the community list and reverse lookups.

For detailed documentation, refer to the Antigravity Skill at `.agents/skills/fishao/SKILL.md`.
