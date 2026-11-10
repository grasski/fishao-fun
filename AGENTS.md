# FISHAO Development Guidelines for Agents

Welcome! This is the official developer and agent guide for the **FISHAO (fishao-fun)** application.

## Key Architecture & Data Rules
1. **Never read raw 400KB data files in full:**
   * Do NOT read `lang_cz.json`, `lang_en.json`, `data/fishes.js`, or `fish.json` from beginning to end.
   * Full data schemas, object shapes, and Firestore collections are documented in [.agents/skills/fishao/SKILL.md](.agents/skills/fishao/SKILL.md).
2. **Vanilla JavaScript & GitHub Pages:**
   * This project has no Node.js/npm build step or bundler. Files are loaded natively by the browser.
   * Always verify modified or created JavaScript files with `node --check "<filepath>"`.
3. **Firebase & Firestore Security Rules (`firestore.rules`):**
   * Firestore rules enforce strict key masking (`hasOnly` / `affectedKeys().hasOnly`). Never write undocumented fields to Firestore.
   * `/users/{userId}` is readable by authenticated users and writable only by the owner or admin. Allowed keys: `displayName`, `role`, `clubId`, `clubName`, `caughtFishIds`, `backyardFishIds`, `friendUids`, `createdAt`, `lastLogin`, `avatarUrl`.
   * Never store user emails or personal Google data in Firestore (GDPR-free: only store nickname and avatar).
   * Always wrap Firestore operations in `try...catch` and maintain `localStorage` fallback.
4. **Fish Market Rules:**
   * The Fish Market is **strictly closed on Sundays** (`getDay() === 0`).
   * No prices can be entered or imported for Sunday dates.
   * Prices are **variable per player**. One fish may have several distinct prices, including multiple entries on the same date, but a numeric price value is stored **only once per fish across all dates**. New submissions and bulk imports must reject/skip duplicate price values.
   * All price add/delete/bulk/reset writes go through the generic Firestore transaction helpers in `js/firestore-tx.js` (`window.FISHAO_FS_TX`). Do not write the price document with ad-hoc `setDoc` calls from `market.js`.
   * Never present a single "today's price" anywhere. Use `normalizePriceEntries()` from `js/market.js` for every display path (table range, modal min/max, counts). Existing duplicate rows are never merged or rewritten in storage; raw JSON export keeps them visible for manual review.
5. **Bilingual Localization & Modular i18n (`data/i18n/`):**
   * Supported languages: Czech (`cs`, default) and English (`en`).
   * Dictionaries are separated into modular files:
     - `data/i18n/ui_cs.js`: Czech UI strings (`FISHAO_I18N_UI_CS`).
     - `data/i18n/ui_en.js`: English UI strings (`FISHAO_I18N_UI_EN`).
     - `data/i18n/taxonomies.js`: Baits, waters, and location translations (`FISHAO_I18N_TAXONOMIES`).
     - `data/i18n/fish_names.js`: 615 fish translations (`FISHAO_I18N_FISH_NAMES`).
     - `data/i18n.js`: Core engine, methods `t()`, `getFishName()`, `getLocationName()`, `getBaitName()`, `getWaterName()`.
   * Add all new text keys to `ui_cs.js` and `ui_en.js`.
   * Use HTML attributes `data-i18n`, `data-i18n-placeholder`, and `data-i18n-title` for static elements.
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
   * Code is organized into cohesive modules under `js/`: `state.js`, `firestore-tx.js`, `table.js`, `clubs.js`, `market.js`, `filters.js`, `auth.js`, `players.js`, and `main.js`.
   * `js/firestore-tx.js`: Generic Firestore transaction helpers (`window.FISHAO_FS_TX.readModifyWrite`, `window.FISHAO_FS_TX.setDocument`). Keep it free of app-specific collections, documents, and field names.
   * `js/players.js`: Community player list, friends management (`friendUids`), backyard fish breeding (`backyardFishIds`, strictly the 83 backyard species), universal player modal, reverse fish-to-player lookups.
   * Public browser handlers are exposed on `window.fishaoApp` in `js/main.js`. Do not edit the legacy monolithic `app.js`.

8. **Backyard Fish Breeding ("Za domem") & Community Directory:**
   * Logged-in players can specify which fish they breed in their backyard pond (`backyardFishIds`). Strictly limited to the 83 species that have location `Za domem` in the game.
   * The community tab allows browsing all registered players, their catch progress, club affiliation, and bred fish.
   * In the fish detail modal, players can see who currently has that fish bred ("Kdo má tuto rybu za domem").
   * Friends system (`friendUids`): players can add friends (⭐), filter exclusively by friends, and have friends pinned at the top of the community list and reverse lookups.

For detailed documentation, refer to the Antigravity Skill at `.agents/skills/fishao/SKILL.md`.
