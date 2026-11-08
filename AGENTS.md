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
   * `/users/{userId}` is readable by authenticated users and writable only by the owner or admin.
   * Never store user emails or personal Google data in Firestore (GDPR-free: only store nickname and avatar).
   * Always wrap Firestore operations in `try...catch` and maintain `localStorage` fallback.
4. **Fish Market Rules:**
   * The Fish Market is **strictly closed on Sundays** (`getDay() === 0`).
   * No prices can be entered or imported for Sunday dates.
5. **Bilingual Localization:**
   * Supported languages: Czech (`cs`, default) and English (`en`).
   * Add all new text keys to `data/i18n.js` in both `cs` and `en` blocks.
   * Use HTML attributes `data-i18n`, `data-i18n-placeholder`, and `data-i18n-title` for static elements.
6. **Styles:**
   * Follow the CSS custom properties in `style.css` (`:root`).
   * All action bar controls maintain a unified 32px height standard (`.pill-btn`, `.toggle-pill`, `.btn-subtle-link`, `.sign-in-btn.sm`).

7. **Modular JavaScript Architecture (`js/`):**
   * Code is organized into cohesive modules under `js/`: `state.js`, `table.js`, `clubs.js`, `market.js`, `filters.js`, `auth.js`, and `main.js`.
   * Public browser handlers are exposed on `window.fishaoApp` in `js/main.js`. Do not edit the legacy monolithic `app.js`.

For detailed documentation, refer to the Antigravity Skill at `.agents/skills/fishao/SKILL.md`.

