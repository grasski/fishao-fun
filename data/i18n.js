/**
 * FISHAO – Internationalization (i18n) Module
 * Supports CS (Czech) and EN (English).
 * Official game dictionaries extracted from game assets.
 */
(function () {
  'use strict';

  var storageKey = 'fishao_lang';
  var supportedLanguages = ['cs', 'en'];

  var FISHAO_I18N = {
    currentLang: (typeof localStorage !== 'undefined' && localStorage.getItem(storageKey)) || 'cs',

    ui: {
      cs: {
      "app_title": "FISHAO",
      "app_subtitle": "Encyklopedie",
      "disclaimer_badge": "Fanouškovský projekt",
      "disclaimer_text": "Jedná se pouze o fanouškovský projekt. Reálná hra je dostupná na",
      "sync_local": "Lokální",
      "sync_live": "Živě",
      "clock_local_label": "Místní čas",
      "clock_utc_label": "UTC čas",
      "tz_local_btn": "📍 Místní",
      "tz_utc_btn": "🌐 UTC",
      "sign_in": "Přihlásit se",
      "sign_out": "Odhlásit",
      "user_default": "Uživatel",
      "admin_badge": "🛡️ Admin",
      "nav_all": "Encyklopedie",
      "nav_all_pill": "615 ryb",
      "nav_club": "Klubové ryby",
      "nav_club_pill": "80 ryb",
      "nav_manage": "Můj Klub & Milníky",
      "nav_collection": "Sbírka úlovků",
      "nav_market": "Fish Market",
      "nav_market_pill": "Výkup",
      "nav_locked": "Zamčeno 🔒",
      "nav_no_club": "Bez klubu",
      "club_bar_unlocked": "🏆 Odemčeno klubem:",
      "club_bar_hint_loading": "🎯 Načítání postupu...",
      "club_bar_edit_btn": "⚙️ Upravit body v Klubu",
      "club_hide_locked": "Skrýt zamčené",
      "club_include_fc": "FC & Monstra",
      "club_only_uncaught": "Pouze nechycené",
      "coll_title": "🎣 Sbírka úlovků:",
      "coll_club_label": "Klubové:",
      "coll_total_label": "Celkem:",
      "coll_filter_all": "Všechny ryby",
      "coll_filter_caught": "✅ Pouze chycené",
      "coll_filter_uncaught": "⬜ Pouze nechycené",
      "filter_search_placeholder": "Hledat rybu podle názvu...",
      "filter_water_label": "Voda:",
      "filter_water_all": "Všechny typy vody",
      "filter_water_salt": "Slaná voda",
      "filter_water_fresh": "Sladká voda",
      "filter_loc_label": "Lokace:",
      "filter_loc_all": "Všechny lokace",
      "filter_bait_label": "Návnada:",
      "filter_bait_all": "Všechny návnady",
      "filter_time_label": "Čas lovu:",
      "filter_time_any": "Kdykoliv",
      "filter_time_now": "Právě bere",
      "filter_time_night": "Pouze noc (20:00-06:00)",
      "filter_time_day": "Pouze den",
      "filter_sort_label": "Řadit podle:",
      "filter_sort_default": "Výchozí pořadí",
      "filter_sort_rating": "Hodnocení / Rarita",
      "filter_sort_price": "Dnešní cena (nejvyšší)",
      "filter_sort_alpha": "Abecedně (A-Z)",
      "filter_sort_size": "Délka ryby",
      "filter_size_label": "Velikost ryby (cm):",
      "filter_size_from": "Od",
      "filter_size_to": "Do",
      "filter_btn_now": "⚡ Právě bere",
      "filter_btn_only_price": "💵 Pouze s cenou",
      "filter_btn_reset": "↺ Obnovit filtry",
      "counter_showing": "Zobrazeno {count} ryb",
      "counter_hint": "💡 Kliknutím na rybu zobrazíš její detail a kompletní historii ve Fish Marketu.",
      "col_fish": "Ryba",
      "col_water": "Voda",
      "col_loc": "Lokace",
      "col_baits": "Návnady",
      "col_time": "Čas lovu",
      "col_size": "Délka",
      "col_price": "Dnešní cena",
      "col_caught": "Úlovek",
      "col_rarity": "Rarita",
      "col_unlock": "Odemčení",
      "modal_fish_detail": "🐟 Detail ryby & Fish Market",
      "modal_today_price": "Dnešní výkupní cena",
      "modal_no_price_today": "Dnes nebyla zadána",
      "modal_max_price": "Maximální cena",
      "modal_min_price": "Minimální cena",
      "modal_price_history": "Historie výkupních cen",
      "modal_no_history": "Zatím žádná zaznamenaná historie cen.",
      "modal_add_price_title": "Zadat novou cenu pro dnešek",
      "modal_save_price_btn": "💾 Uložit cenu",
      "modal_bulk_btn": "⚡ Hromadný import cen",
      "modal_close_btn": "Zavřít",
      "bulk_title": "⚡ Hromadný import cen Fish Marketu",
      "bulk_date_label": "Datum pro tento import:",
      "bulk_textarea_label": "Vložit text se seznamem ryb a cen:",
      "bulk_import_btn": "⚡ Importovat do historie",
      "bulk_export_btn": "📥 Export JSON (Admin)",
      "bulk_reset_btn": "↺ Obnovit výchozí ceník (Admin)",
      "bulk_secure_note": "Data jsou zabezpečená a sdílená v reálném čase.",
      "time_all_day": "Celý den",
      "time_active_now": "BERE TEĎ",
      "time_inactive": "Neaktivní",
      "toast_login_required": "🔑 Pro tuto akci se musíš nejdříve přihlásit přes Google účet.",
      "toast_price_saved": "Cena byla úspěšně uložena.",
      "toast_caught_saved": "Úlovek zaznamenán.",
      "toast_club_saved": "Klub byl úspěšně aktualizován.",
      "club_unlocked_label": "🏆 Odemčeno klubem:",
      "club_next_unlock_loading": "🎯 Načítání postupu...",
      "coll_filter_missing": "❓ Chybějící",
      "market_bar_title": "💵 Fish Market:",
      "market_bar_subtitle": "Výkupní ceník ve fishměně (FB)",
      "market_btn_import": "📥 Import cen do Marketu",
      "market_btn_default": "↺ Výchozí ceník (Admin)",
      "club_gate_title": "Správa Klubu vyžaduje přihlášení",
      "club_gate_desc": "Přihlas se svým Google účtem, abys mohl zadat svůj klub, sledovat klubové body a odemykání všech 80 klubových ryb.",
      "sign_in_google": "Přihlásit se přes Google",
      "club_settings_title": "🏰 Nastavení & Body klubu",
      "club_name_label": "Název klubu",
      "club_name_placeholder": "Např. Lovci z Prahy",
      "club_pts_label": "Aktuální body klubu",
      "club_quick_add": "Rychlé přidání bodů:",
      "club_summary_title": "📊 Souhrn klubu & Úlovků",
      "club_pts_unlocked": "Odemčeno bodových ryb:",
      "club_fc_monsters": "Ryby za Fishcoins & Monstra:",
      "club_fc_monsters_count": "15 ryb",
      "club_fishes_caught": "Klubových ryb chyceno:",
      "roadmap_title": "🗺️ Cesta odemykání klubových ryb (80 milníků)",
      "roadmap_desc": "Všechny klubové ryby seřazené podle potřebných bodů. Zelené jsou odemčené, u červených vidíš zbývající body.",
      "roadmap_filter_all": "Všechny (80)",
      "roadmap_filter_unlocked": "✓ Odemčené",
      "roadmap_filter_locked": "🔒 Zamčené",
      "roadmap_filter_fc": "💎 FC & Monstra",
      "coll_gate_title": "Sbírka úlovků vyžaduje přihlášení",
      "coll_gate_desc": "Osobní sbírka úlovků a sledování dokončení hry jsou vázány na tvůj hráčský účet. Přihlas se přes Google a měj své chycené ryby bezpečně uložené v cloudu na PC i v mobilu.",
      "modal_market_divider": "💵 Fish Market – Výkupní ceny a historie",
      "modal_add_record": "+ Přidat nový záznam do historie:",
      "modal_sale_date": "Datum prodeje",
      "modal_price_label": "Cena (fishměna / FB)",
      "modal_price_placeholder": "Např. 152",
      "modal_login_notice_prefix": "🔒 Pro zadání ceny do Fish Marketu se musíš",
      "modal_login_notice_link": "přihlásit přes Google",
      "modal_history_title": "Historie prodejů této ryby:",
      "modal_th_date": "Datum",
      "modal_th_price": "Cena (fishměna / FB)",
      "modal_th_action": "Akce",
      "bulk_header_title": "💵 Správa a hromadný import cen do Fish Marketu",
      "bulk_desc": "Zde můžeš vložit seznam denních cen (např. ve formátu jako v souboru prices.txt, tedy Název ryby: cena) a všechny ryby se automaticky přiřadí a uloží do historie ve fishměně (FB).",
      "bulk_note_secure": "Data jsou zabezpečená a sdílená v reálném čase."
},
      en: {
      "app_title": "FISHAO",
      "app_subtitle": "Encyclopedia",
      "disclaimer_badge": "Fan Project",
      "disclaimer_text": "This is a non-commercial fan project. The original game is available at",
      "sync_local": "Local",
      "sync_live": "Live",
      "clock_local_label": "Local time",
      "clock_utc_label": "UTC time",
      "tz_local_btn": "📍 Local",
      "tz_utc_btn": "🌐 UTC",
      "sign_in": "Sign in",
      "sign_out": "Sign out",
      "user_default": "User",
      "admin_badge": "🛡️ Admin",
      "nav_all": "Encyclopedia",
      "nav_all_pill": "615 fish",
      "nav_club": "Club Fish",
      "nav_club_pill": "80 fish",
      "nav_manage": "My Club & Milestones",
      "nav_collection": "Catch Collection",
      "nav_market": "Fish Market",
      "nav_market_pill": "Prices",
      "nav_locked": "Locked 🔒",
      "nav_no_club": "No Club",
      "club_bar_unlocked": "🏆 Club Unlocked:",
      "club_bar_hint_loading": "🎯 Loading progress...",
      "club_bar_edit_btn": "⚙️ Edit Club Points",
      "club_hide_locked": "Hide Locked",
      "club_include_fc": "FC & Monsters",
      "club_only_uncaught": "Only Uncaught",
      "coll_title": "🎣 Catch Collection:",
      "coll_club_label": "Club:",
      "coll_total_label": "Total:",
      "coll_filter_all": "All fish",
      "coll_filter_caught": "✅ Only Caught",
      "coll_filter_uncaught": "⬜ Only Uncaught",
      "filter_search_placeholder": "Search fish by name...",
      "filter_water_label": "Water:",
      "filter_water_all": "All water types",
      "filter_water_salt": "Saltwater",
      "filter_water_fresh": "Freshwater",
      "filter_loc_label": "Location:",
      "filter_loc_all": "All locations",
      "filter_bait_label": "Bait:",
      "filter_bait_all": "All baits",
      "filter_time_label": "Catch time:",
      "filter_time_any": "Any time",
      "filter_time_now": "Biting now",
      "filter_time_night": "Night only (20:00-06:00)",
      "filter_time_day": "Day only",
      "filter_sort_label": "Sort by:",
      "filter_sort_default": "Default order",
      "filter_sort_rating": "Rating / Rarity",
      "filter_sort_price": "Today's price (highest)",
      "filter_sort_alpha": "Alphabetical (A-Z)",
      "filter_sort_size": "Fish length",
      "filter_size_label": "Fish size (cm):",
      "filter_size_from": "From",
      "filter_size_to": "To",
      "filter_btn_now": "⚡ Biting now",
      "filter_btn_only_price": "💵 With price only",
      "filter_btn_reset": "↺ Reset filters",
      "counter_showing": "Showing {count} fish",
      "counter_hint": "💡 Click on a fish row to see details and price history in Fish Market.",
      "col_fish": "Fish",
      "col_water": "Water",
      "col_loc": "Locations",
      "col_baits": "Baits",
      "col_time": "Catch Time",
      "col_size": "Length",
      "col_price": "Today's Price",
      "col_caught": "Caught",
      "col_rarity": "Rarity",
      "col_unlock": "Unlock",
      "modal_fish_detail": "🐟 Fish Detail & Fish Market",
      "modal_today_price": "Today's Market Price",
      "modal_no_price_today": "Not recorded today",
      "modal_max_price": "Maximum Price",
      "modal_min_price": "Minimum Price",
      "modal_price_history": "Market Price History",
      "modal_no_history": "No recorded price history yet.",
      "modal_add_price_title": "Add new price for today",
      "modal_save_price_btn": "💾 Save price",
      "modal_bulk_btn": "⚡ Bulk Price Import",
      "modal_close_btn": "Close",
      "bulk_title": "⚡ Bulk Fish Market Price Import",
      "bulk_date_label": "Date for this import:",
      "bulk_textarea_label": "Paste text with fish names and prices:",
      "bulk_import_btn": "⚡ Import into history",
      "bulk_export_btn": "📥 Export JSON (Admin)",
      "bulk_reset_btn": "↺ Reset to default prices (Admin)",
      "bulk_secure_note": "Data is secure and synchronized in real time.",
      "time_all_day": "All day",
      "time_active_now": "BITING NOW",
      "time_inactive": "Inactive",
      "toast_login_required": "🔑 You must sign in with Google to perform this action.",
      "toast_price_saved": "Price saved successfully.",
      "toast_caught_saved": "Catch status updated.",
      "toast_club_saved": "Club updated successfully.",
      "club_unlocked_label": "🏆 Club Unlocked:",
      "club_next_unlock_loading": "🎯 Loading progress...",
      "coll_filter_missing": "❓ Missing",
      "market_bar_title": "💵 Fish Market:",
      "market_bar_subtitle": "Market buy prices in fishbucks (FB)",
      "market_btn_import": "📥 Import Prices to Market",
      "market_btn_default": "↺ Default Prices (Admin)",
      "club_gate_title": "Club Management requires sign in",
      "club_gate_desc": "Sign in with your Google account to set up your club, track club points and unlock all 80 club fishes.",
      "sign_in_google": "Sign in with Google",
      "club_settings_title": "🏰 Club Settings & Points",
      "club_name_label": "Club Name",
      "club_name_placeholder": "e.g. Prague Anglers",
      "club_pts_label": "Current Club Points",
      "club_quick_add": "Quick Add Points:",
      "club_summary_title": "📊 Club & Catches Summary",
      "club_pts_unlocked": "Points fish unlocked:",
      "club_fc_monsters": "Fishcoins & Monsters fish:",
      "club_fc_monsters_count": "15 fish",
      "club_fishes_caught": "Club fish caught:",
      "roadmap_title": "🗺️ Club Fish Unlock Roadmap (80 milestones)",
      "roadmap_desc": "All club fishes sorted by required points. Green ones are unlocked, red ones show remaining points needed.",
      "roadmap_filter_all": "All (80)",
      "roadmap_filter_unlocked": "✓ Unlocked",
      "roadmap_filter_locked": "🔒 Locked",
      "roadmap_filter_fc": "💎 FC & Monsters",
      "coll_gate_title": "Catch Collection requires sign in",
      "coll_gate_desc": "Personal catch collection and completion tracking are tied to your player account. Sign in with Google to keep your caught fish safely synced across PC and mobile.",
      "modal_market_divider": "💵 Fish Market – Buy prices & history",
      "modal_add_record": "+ Add new entry to history:",
      "modal_sale_date": "Sale date",
      "modal_price_label": "Price (fishbucks / FB)",
      "modal_price_placeholder": "e.g. 152",
      "modal_login_notice_prefix": "🔒 To submit prices to Fish Market you must",
      "modal_login_notice_link": "sign in with Google",
      "modal_history_title": "Sale history for this fish:",
      "modal_th_date": "Date",
      "modal_th_price": "Price (fishbucks / FB)",
      "modal_th_action": "Action",
      "bulk_header_title": "💵 Fish Market Management & Bulk Import",
      "bulk_desc": "Paste your daily price list here (e.g. formatted as in prices.txt: Fish name: price) and all fish will be automatically matched and saved into history in fishbucks (FB).",
      "bulk_note_secure": "Data is secured and synced in real time."
}
    },

    baits: {
    "Hmyz": {
        "cs": "Hmyz",
        "en": "Insects"
    },
    "Insects": {
        "cs": "Hmyz",
        "en": "Insects"
    },
    "Háčky": {
        "cs": "Háčky",
        "en": "Hooks"
    },
    "Hooks": {
        "cs": "Háčky",
        "en": "Hooks"
    },
    "Marlíní": {
        "cs": "Marlíní",
        "en": "Marlin"
    },
    "Marlin": {
        "cs": "Marlíní",
        "en": "Marlin"
    },
    "Maso": {
        "cs": "Maso",
        "en": "Meat"
    },
    "Meat": {
        "cs": "Maso",
        "en": "Meat"
    },
    "Monstrum": {
        "cs": "Monstrum",
        "en": "Monster"
    },
    "Monster": {
        "cs": "Monstrum",
        "en": "Monster"
    },
    "Prehistorické": {
        "cs": "Prehistorické",
        "en": "Prehistoric"
    },
    "Prehistoric": {
        "cs": "Prehistorické",
        "en": "Prehistoric"
    },
    "Přívlač/Nástrahy": {
        "cs": "Přívlač/Nástrahy",
        "en": "Lures"
    },
    "Lures": {
        "cs": "Přívlač/Nástrahy",
        "en": "Lures"
    },
    "Rostlinné": {
        "cs": "Rostlinné",
        "en": "Vegetal"
    },
    "Vegetal": {
        "cs": "Rostlinné",
        "en": "Vegetal"
    },
    "Ryby": {
        "cs": "Ryby",
        "en": "Fish"
    },
    "Fish": {
        "cs": "Ryby",
        "en": "Fish"
    },
    "Soltýní": {
        "cs": "Soltýní",
        "en": "Barracuda"
    },
    "Barracuda": {
        "cs": "Soltýní",
        "en": "Barracuda"
    },
    "Svítivčí": {
        "cs": "Svítivčí",
        "en": "Star"
    },
    "Star": {
        "cs": "Svítivčí",
        "en": "Star"
    },
    "Tuňáčí": {
        "cs": "Tuňáčí",
        "en": "Tuna"
    },
    "Tuna": {
        "cs": "Tuňáčí",
        "en": "Tuna"
    },
    "Těsta": {
        "cs": "Těsta",
        "en": "Dough"
    },
    "Dough": {
        "cs": "Těsta",
        "en": "Dough"
    },
    "Ďasí": {
        "cs": "Ďasí",
        "en": "Monkfish"
    },
    "Monkfish": {
        "cs": "Ďasí",
        "en": "Monkfish"
    },
    "Šírotlamčí": {
        "cs": "Šírotlamčí",
        "en": "Pelican"
    },
    "Pelican": {
        "cs": "Šírotlamčí",
        "en": "Pelican"
    },
    "Žraločí": {
        "cs": "Žraločí",
        "en": "Shark Bait"
    },
    "Shark Bait": {
        "cs": "Žraločí",
        "en": "Shark Bait"
    }
},

    waters: {
    "Slaná": {
        "cs": "Slaná",
        "en": "Saltwater"
    },
    "Sladká": {
        "cs": "Sladká",
        "en": "Freshwater"
    },
    "Neznámá": {
        "cs": "Neznámá",
        "en": "Unknown"
    },
    "Saltwater": {
        "cs": "Slaná",
        "en": "Saltwater"
    },
    "Freshwater": {
        "cs": "Sladká",
        "en": "Freshwater"
    }
},

    locations: {
    "Laketown": {
        "cs": "Laketown",
        "en": "Laketown"
    },
    "location_1": {
        "cs": "Laketown",
        "en": "Laketown"
    },
    "Marshville": {
        "cs": "Marshville",
        "en": "Marshville"
    },
    "location_10": {
        "cs": "Marshville",
        "en": "Marshville"
    },
    "Pstruží farma": {
        "cs": "Pstruží farma",
        "en": "Trout Farm"
    },
    "Trout Farm": {
        "cs": "Pstruží farma",
        "en": "Trout Farm"
    },
    "location_101": {
        "cs": "Pstruží farma",
        "en": "Trout Farm"
    },
    "Pyramida": {
        "cs": "Pyramida",
        "en": "Pyramid"
    },
    "Pyramid": {
        "cs": "Pyramida",
        "en": "Pyramid"
    },
    "location_104": {
        "cs": "Pyramida",
        "en": "Pyramid"
    },
    "Lost Valley": {
        "cs": "Lost Valley",
        "en": "Lost Valley"
    },
    "location_108": {
        "cs": "Lost Valley",
        "en": "Lost Valley"
    },
    "Tree Cave": {
        "cs": "Tree Cave",
        "en": "Tree Cave"
    },
    "location_109": {
        "cs": "Tree Cave",
        "en": "Tree Cave"
    },
    "Palm Island": {
        "cs": "Palm Island",
        "en": "Palm island"
    },
    "Palm island": {
        "cs": "Palm Island",
        "en": "Palm island"
    },
    "location_11": {
        "cs": "Palm Island",
        "en": "Palm island"
    },
    "Little Rio": {
        "cs": "Little Rio",
        "en": "Little Rio"
    },
    "location_110": {
        "cs": "Little Rio",
        "en": "Little Rio"
    },
    "Pirate Cave": {
        "cs": "Pirate Cave",
        "en": "Pirate Cave"
    },
    "location_111": {
        "cs": "Pirate Cave",
        "en": "Pirate Cave"
    },
    "Klubový revír": {
        "cs": "Klubový revír",
        "en": "Club area"
    },
    "Club area": {
        "cs": "Klubový revír",
        "en": "Club area"
    },
    "location_112": {
        "cs": "Klubový revír",
        "en": "Club area"
    },
    "Továrna na nábytek": {
        "cs": "Továrna na nábytek",
        "en": "Furniture Factory"
    },
    "Furniture Factory": {
        "cs": "Továrna na nábytek",
        "en": "Furniture Factory"
    },
    "location_113": {
        "cs": "Továrna na nábytek",
        "en": "Furniture Factory"
    },
    "Lucky Raft": {
        "cs": "Lucky Raft",
        "en": "Lucky Raft"
    },
    "location_12": {
        "cs": "Lucky Raft",
        "en": "Lucky Raft"
    },
    "Rio Tropical": {
        "cs": "Rio Tropical",
        "en": "Rio Tropical"
    },
    "location_2": {
        "cs": "Rio Tropical",
        "en": "Rio Tropical"
    },
    "Turnaj Boat On Sea": {
        "cs": "Turnaj Boat On Sea",
        "en": "Boat On Sea tournament"
    },
    "Boat On Sea tournament": {
        "cs": "Turnaj Boat On Sea",
        "en": "Boat On Sea tournament"
    },
    "location_201": {
        "cs": "Turnaj Boat On Sea",
        "en": "Boat On Sea tournament"
    },
    "Turnaj Lake Run": {
        "cs": "Turnaj Lake Run",
        "en": "Lake Run tournament"
    },
    "Lake Run tournament": {
        "cs": "Turnaj Lake Run",
        "en": "Lake Run tournament"
    },
    "location_202": {
        "cs": "Turnaj Lake Run",
        "en": "Lake Run tournament"
    },
    "Turnaj Race": {
        "cs": "Turnaj Race",
        "en": "Race tournament"
    },
    "Race tournament": {
        "cs": "Turnaj Race",
        "en": "Race tournament"
    },
    "location_203": {
        "cs": "Turnaj Race",
        "en": "Race tournament"
    },
    "Turnaj Moray": {
        "cs": "Turnaj Moray",
        "en": "Moray tournament"
    },
    "Moray tournament": {
        "cs": "Turnaj Moray",
        "en": "Moray tournament"
    },
    "location_204": {
        "cs": "Turnaj Moray",
        "en": "Moray tournament"
    },
    "Pinheira Beach": {
        "cs": "Pinheira Beach",
        "en": "Pinheira Beach"
    },
    "location_3": {
        "cs": "Pinheira Beach",
        "en": "Pinheira Beach"
    },
    "Za domem": {
        "cs": "Za domem",
        "en": "Home backyard"
    },
    "Home backyard": {
        "cs": "Za domem",
        "en": "Home backyard"
    },
    "location_300": {
        "cs": "Za domem",
        "en": "Home backyard"
    },
    "Cool Mountain": {
        "cs": "Cool Mountain",
        "en": "Cool Mountain"
    },
    "location_4": {
        "cs": "Cool Mountain",
        "en": "Cool Mountain"
    },
    "Mystic Desert": {
        "cs": "Mystic Desert",
        "en": "Mystic Desert"
    },
    "location_5": {
        "cs": "Mystic Desert",
        "en": "Mystic Desert"
    },
    "Sibiri City": {
        "cs": "Sibiri City",
        "en": "Sibiri City"
    },
    "location_6": {
        "cs": "Sibiri City",
        "en": "Sibiri City"
    },
    "Aquayama": {
        "cs": "Aquayama",
        "en": "Aquayama"
    },
    "location_7": {
        "cs": "Aquayama",
        "en": "Aquayama"
    },
    "Seagull Harbor": {
        "cs": "Seagull Harbor",
        "en": "Seagull Harbor"
    },
    "location_8": {
        "cs": "Seagull Harbor",
        "en": "Seagull Harbor"
    },
    "Thombani Town": {
        "cs": "Thombani Town",
        "en": "Thombani Town"
    },
    "location_9": {
        "cs": "Thombani Town",
        "en": "Thombani Town"
    }
},

    fishes: {
    "14": {
        "cs": "Piraňa obecná",
        "en": "Piranha"
    },
    "15": {
        "cs": "Arapaima velká",
        "en": "Arapaima"
    },
    "16": {
        "cs": "Parma obecná",
        "en": "Barbel"
    },
    "17": {
        "cs": "Hořavka duhová",
        "en": "Bitterling"
    },
    "18": {
        "cs": "Okounek pstruhový",
        "en": "Largemouth Bass"
    },
    "20": {
        "cs": "Slunečnice velkoploutvá",
        "en": "Bluegill"
    },
    "22": {
        "cs": "Marlín modrý",
        "en": "Blue Marlin"
    },
    "28": {
        "cs": "Kapr obecný",
        "en": "Common Carp"
    },
    "32": {
        "cs": "Sumec velký",
        "en": "Wels Catfish"
    },
    "33": {
        "cs": "Vyza velká",
        "en": "Beluga Sturgeon"
    },
    "34": {
        "cs": "Siven severní",
        "en": "Arctic Char"
    },
    "35": {
        "cs": "Losos masu",
        "en": "Cherry Salmon"
    },
    "36": {
        "cs": "Latimérie podivná",
        "en": "Coelacanth"
    },
    "37": {
        "cs": "Karas obecný",
        "en": "Crucian Carp"
    },
    "38": {
        "cs": "Limanda obecná",
        "en": "Dab"
    },
    "40": {
        "cs": "Jelec proudník",
        "en": "Common Dace"
    },
    "41": {
        "cs": "Kujaba brazilská",
        "en": "Golden Dorado"
    },
    "42": {
        "cs": "Úhoř",
        "en": "Eel"
    },
    "43": {
        "cs": "Hlaváč",
        "en": "Freshwater Goby"
    },
    "44": {
        "cs": "Kostlín",
        "en": "Gar"
    },
    "45": {
        "cs": "Hadohlavec červený",
        "en": "Giant Snakehead"
    },
    "46": {
        "cs": "Kapr zlatý",
        "en": "Goldcarp"
    },
    "47": {
        "cs": "Žralok kladivoun",
        "en": "Hammerhead Shark"
    },
    "48": {
        "cs": "Kranas obecný",
        "en": "Horse Mackerel"
    },
    "49": {
        "cs": "Losos čavyča",
        "en": "Chinook Salmon"
    },
    "50": {
        "cs": "Měsíčník svítivý",
        "en": "Ocean Sunfish"
    },
    "51": {
        "cs": "Okoun žlutý",
        "en": "Yellow Perch"
    },
    "52": {
        "cs": "Tuňák obecný",
        "en": "Atlantic Bluefin Tuna"
    },
    "54": {
        "cs": "Platýs velký",
        "en": "Olive Flounder"
    },
    "55": {
        "cs": "Zako japonský",
        "en": "Pale Chub"
    },
    "56": {
        "cs": "Koruška maloústá",
        "en": "Pond Smelt"
    },
    "57": {
        "cs": "Čtverzubec",
        "en": "Puffer Fish"
    },
    "58": {
        "cs": "Pstruh duhový",
        "en": "Rainbow Trout"
    },
    "59": {
        "cs": "Chňapal červený",
        "en": "Red Snapper"
    },
    "60": {
        "cs": "Losos obecný",
        "en": "Common Salmon"
    },
    "61": {
        "cs": "Mořčák evropský",
        "en": "Sea Bass"
    },
    "62": {
        "cs": "Žralok",
        "en": "Shark"
    },
    "63": {
        "cs": "Štika obecná",
        "en": "Pike"
    },
    "64": {
        "cs": "Cejn velký",
        "en": "Bream"
    },
    "65": {
        "cs": "Slunečnice malá",
        "en": "Orangespotted Sunfish"
    },
    "66": {
        "cs": "Lín obecný",
        "en": "Tench"
    },
    "67": {
        "cs": "Akara dvouskvrnná",
        "en": "Black Acara"
    },
    "68": {
        "cs": "Anténovec paranánský",
        "en": "Spotted Sorubim"
    },
    "69": {
        "cs": "Paúhoř elektrický",
        "en": "Electric Eel"
    },
    "70": {
        "cs": "Vějířovka černoploutvá",
        "en": "Blackfin Pearlfish"
    },
    "71": {
        "cs": "Úzkotlamka cejnovitá",
        "en": "Marbled Headstander"
    },
    "72": {
        "cs": "Hřebenáč paví",
        "en": "Pike Cichlid"
    },
    "73": {
        "cs": "Útesník pruhovaný",
        "en": "Sergeant Major"
    },
    "74": {
        "cs": "Havýš plástevný",
        "en": "Honeycomb Cowfish"
    },
    "75": {
        "cs": "Soltýn barakuda",
        "en": "Barracuda"
    },
    "76": {
        "cs": "Tarpon atlantský",
        "en": "Tarpon Atlantic"
    },
    "77": {
        "cs": "Kranas duhový",
        "en": "Rainbow Runner"
    },
    "80": {
        "cs": "Žabohlavec surinamský",
        "en": "Pacuma Toadfish"
    },
    "81": {
        "cs": "Vidlatka tuňákovitá",
        "en": "Leerfish"
    },
    "82": {
        "cs": "Kanic modroskvrnný",
        "en": "Coral Hind"
    },
    "83": {
        "cs": "Sardinka oblá",
        "en": "Sardinella"
    },
    "84": {
        "cs": "Vyza malá",
        "en": "Kaluga Sturgeon"
    },
    "85": {
        "cs": "Pomec modročelý",
        "en": "Queen Angelfish"
    },
    "86": {
        "cs": "Chrochtal modropásý",
        "en": "Blue Striped Grunt"
    },
    "87": {
        "cs": "Kanic bělopruhý",
        "en": "Nassau Grouper"
    },
    "88": {
        "cs": "Pomec černý",
        "en": "French Angelfish"
    },
    "89": {
        "cs": "Chňapal",
        "en": "Wenchman"
    },
    "90": {
        "cs": "Ostenec sargasový",
        "en": "Sargassum Triggerfish"
    },
    "91": {
        "cs": "Pyskoun perlový",
        "en": "Pearly Razorfish"
    },
    "92": {
        "cs": "Kranas mosazopruhý",
        "en": "Bigeye Scad"
    },
    "93": {
        "cs": "Křížovec dlouhoploutvý",
        "en": "Ariidae"
    },
    "94": {
        "cs": "Tlamovec Livingstonův",
        "en": "Livingston's Cichlid"
    },
    "95": {
        "cs": "Gurama velká",
        "en": "Giant Gourami"
    },
    "96": {
        "cs": "Arowana zlatá",
        "en": "Golden Arowana"
    },
    "97": {
        "cs": "Keříčkovec červenolemý",
        "en": "North African Catfish"
    },
    "98": {
        "cs": "Afrotetra Forskållova",
        "en": "Elongate Tigerfish"
    },
    "99": {
        "cs": "Rypoun úhořovitý",
        "en": "Cornish Jack"
    },
    "100": {
        "cs": "Tlamoun nilský",
        "en": "Nile Tilapia"
    },
    "101": {
        "cs": "Sumčík stříbřitý",
        "en": "African Butter Catfish"
    },
    "102": {
        "cs": "Klaun očkatý",
        "en": "Clownfish"
    },
    "105": {
        "cs": "Perlín ostrobřichý",
        "en": "Common Rudd"
    },
    "107": {
        "cs": "Robalo nilský",
        "en": "Nile Perch"
    },
    "108": {
        "cs": "Candát severoamerický",
        "en": "Walleye"
    },
    "109": {
        "cs": "Cichlida",
        "en": "Peacock Bass"
    },
    "110": {
        "cs": "Parma velkotlamá",
        "en": "Largemouth Yellowfish"
    },
    "111": {
        "cs": "Smuha chrochtavá",
        "en": "Freshwater Drum"
    },
    "112": {
        "cs": "Nožovec velký",
        "en": "Clown Featherback"
    },
    "113": {
        "cs": "Hrouzkovka skvrnoploutvá",
        "en": "Chinese False Gudgeon"
    },
    "114": {
        "cs": "Sekavec vepřorypý",
        "en": "Horseface Loach"
    },
    "115": {
        "cs": "Jeseter čínský",
        "en": "Chinese Sturgeon"
    },
    "116": {
        "cs": "Katla obecná",
        "en": "Catla"
    },
    "117": {
        "cs": "Rypoun zobanitý",
        "en": "Elephantfish"
    },
    "118": {
        "cs": "Leskyně skvrnitá",
        "en": "Opah"
    },
    "119": {
        "cs": "Tkaničnice stříbřitá",
        "en": "Silver Scabbardfish"
    },
    "120": {
        "cs": "Cípal pyskatý",
        "en": "Thicklip Grey Mullet"
    },
    "121": {
        "cs": "Sleď obecný",
        "en": "Atlantic Herring"
    },
    "122": {
        "cs": "Žralok psí",
        "en": "Tope Shark"
    },
    "123": {
        "cs": "Úhořovec mořský",
        "en": "European Conger"
    },
    "124": {
        "cs": "Ostnatec zmijí",
        "en": "Lesser Weever"
    },
    "125": {
        "cs": "Treska skvrnitá",
        "en": "Haddock"
    },
    "126": {
        "cs": "Mořan zlatý",
        "en": "Goldsilk Bream"
    },
    "127": {
        "cs": "Pasumec elektrický",
        "en": "Electric Catfish"
    },
    "128": {
        "cs": "Pstruh obecný",
        "en": "Brown Trout"
    },
    "129": {
        "cs": "Kostlín obrovský",
        "en": "Alligator Gar"
    },
    "130": {
        "cs": "Vlkouš obecný",
        "en": "Atlantic Wolffish"
    },
    "131": {
        "cs": "Kaprovec velkoústý",
        "en": "Bigmouth Buffalo"
    },
    "132": {
        "cs": "Lipan podhorní",
        "en": "Grayling"
    },
    "133": {
        "cs": "Pomčík ohnivý",
        "en": "Flame Angelfish"
    },
    "134": {
        "cs": "Paokoun zlatavý",
        "en": "Golden Perch"
    },
    "135": {
        "cs": "Binga tygří",
        "en": "Goliath Tigerfish"
    },
    "136": {
        "cs": "Piloun mnohozubý",
        "en": "Green Sawfish"
    },
    "137": {
        "cs": "Jeseter jezerní",
        "en": "Lake Sturgeon"
    },
    "138": {
        "cs": "Karas Lví hlava",
        "en": "Lionhead Goldfish"
    },
    "139": {
        "cs": "Paokoun mramorovaný",
        "en": "Murray Cod"
    },
    "140": {
        "cs": "Vrubozubec paví",
        "en": "Oscar"
    },
    "141": {
        "cs": "Kanic písmenkový",
        "en": "Painted Comber"
    },
    "142": {
        "cs": "Zubatice makrelová",
        "en": "Payara"
    },
    "143": {
        "cs": "Losos gorbuša",
        "en": "Pink Salmon"
    },
    "144": {
        "cs": "Plachetník širokoploutvý",
        "en": "Sailfish"
    },
    "145": {
        "cs": "Hlavačka",
        "en": "Sleepy Cod"
    },
    "146": {
        "cs": "Losos nerka",
        "en": "Sockeye Salmon"
    },
    "147": {
        "cs": "Ostnovec skvrnoocasý",
        "en": "Tailspot Ctenopoma"
    },
    "148": {
        "cs": "Piraňa rostlinožravá",
        "en": "Tambaqui"
    },
    "149": {
        "cs": "Ostnatec skvrnkovaný",
        "en": "Weever Fish"
    },
    "150": {
        "cs": "Pstruh aguabonita",
        "en": "Golden Trout"
    },
    "151": {
        "cs": "Siven americký",
        "en": "Brook Trout"
    },
    "152": {
        "cs": "Tygří ryba",
        "en": "Tiger Trout"
    },
    "154": {
        "cs": "Chobotnice pobřežní",
        "en": "Common Octopus"
    },
    "155": {
        "cs": "Rejnok říční",
        "en": "Occelate River Stingray"
    },
    "156": {
        "cs": "Vranka mnohoostná",
        "en": "Deepwater Sculpin"
    },
    "157": {
        "cs": "Amuřice Hoevenova",
        "en": "Mad Barb"
    },
    "158": {
        "cs": "Pilohřbetec malošupinatý",
        "en": "Siamese Tigerfish"
    },
    "159": {
        "cs": "Rejnok severní",
        "en": "Sailray"
    },
    "160": {
        "cs": "Platýs bradavičnatý",
        "en": "European Flounder"
    },
    "161": {
        "cs": "Blatňák menší",
        "en": "Eastern Mudminnow"
    },
    "162": {
        "cs": "Okoun říční",
        "en": "European Perch"
    },
    "164": {
        "cs": "Karas zlatý",
        "en": "Goldfish"
    },
    "165": {
        "cs": "Jelec tloušť",
        "en": "European Chub"
    },
    "166": {
        "cs": "Candát obecný",
        "en": "Zander"
    },
    "167": {
        "cs": "Sumeček černý",
        "en": "Black Bullhead"
    },
    "168": {
        "cs": "Strašík maloústý",
        "en": "Barreleye"
    },
    "169": {
        "cs": "Ropušnice malá",
        "en": "Red Scorpionfish"
    },
    "170": {
        "cs": "Siven malma",
        "en": "Dolly Varden"
    },
    "171": {
        "cs": "Krunýřovec guyanský",
        "en": "Suckermouth Catfish"
    },
    "172": {
        "cs": "Veslonos americký",
        "en": "Paddlefish"
    },
    "173": {
        "cs": "Perutýn ohnivý",
        "en": "Lionfish"
    },
    "174": {
        "cs": "Havýš hladký",
        "en": "Smooth Trunkfish"
    },
    "175": {
        "cs": "Ploskozubec duhový",
        "en": "Rainbow Parrotfish"
    },
    "176": {
        "cs": "Velkotlamec Johnsonův",
        "en": "Humpback Anglerfish"
    },
    "177": {
        "cs": "Pangas velký",
        "en": "Mekong Giant Catfish"
    },
    "179": {
        "cs": "Slunečnice červenooká",
        "en": "Rock Bass"
    },
    "180": {
        "cs": "Vřeténka mandarín",
        "en": "Mandarinfish"
    },
    "181": {
        "cs": "Okounek černý",
        "en": "Smallmouth Bass"
    },
    "182": {
        "cs": "Okounek tmavoskvrnný",
        "en": "Spotted Bass"
    },
    "183": {
        "cs": "Koryféna velká",
        "en": "Common Dolphinfish"
    },
    "184": {
        "cs": "Letoun středomořský",
        "en": "Flying Fish"
    },
    "185": {
        "cs": "Muréna jávská",
        "en": "Giant Moray"
    },
    "187": {
        "cs": "Sisora Yarrellova",
        "en": "Bagarius"
    },
    "188": {
        "cs": "Sekernatka drobná",
        "en": "Freshwater Hatchetfish"
    },
    "189": {
        "cs": "Okounek černoskvrnný",
        "en": "Black Crappy"
    },
    "190": {
        "cs": "Ouklej obecná",
        "en": "Common Bleak"
    },
    "191": {
        "cs": "Živorodka duhová",
        "en": "Guppy"
    },
    "192": {
        "cs": "Veleparma thajská",
        "en": "Giant Barb"
    },
    "193": {
        "cs": "Terčovec",
        "en": "Discus"
    },
    "194": {
        "cs": "Sumíček bajad",
        "en": "Bagrus Bajad"
    },
    "195": {
        "cs": "Kaprovec černý",
        "en": "Black Buffalo"
    },
    "196": {
        "cs": "Kančík citrónový",
        "en": "Midas Cichlid"
    },
    "197": {
        "cs": "Hlavatka obecná",
        "en": "Danube Salmon"
    },
    "198": {
        "cs": "Candátek modropásý",
        "en": "Rainbow Darter"
    },
    "199": {
        "cs": "Bahník východoafrický",
        "en": "Marbled Lungfish"
    },
    "200": {
        "cs": "Nožovec černý",
        "en": "African Knifefish"
    },
    "201": {
        "cs": "Mník jednovousý",
        "en": "Burbot"
    },
    "202": {
        "cs": "Trnovec černý",
        "en": "Ripsaw Catfish"
    },
    "203": {
        "cs": "Vandélie obecná",
        "en": "Vandellia"
    },
    "204": {
        "cs": "Štika muskalunga",
        "en": "Tiger Muskellunge"
    },
    "205": {
        "cs": "Žralok bělavý",
        "en": "Bull Shark"
    },
    "206": {
        "cs": "Trnucha thajská",
        "en": "Giant Freshwater Stingray"
    },
    "207": {
        "cs": "Kančík modroskvrnný",
        "en": "Texas Cichlid"
    },
    "208": {
        "cs": "Sumeček plochohlavý",
        "en": "Flathead Catfish"
    },
    "209": {
        "cs": "Siven velkohlavý",
        "en": "Bull Trout"
    },
    "210": {
        "cs": "Pstruh apačský",
        "en": "Apache Trout"
    },
    "211": {
        "cs": "Sumeček velký",
        "en": "Blue Catfish"
    },
    "212": {
        "cs": "Vranka pruhoploutvá",
        "en": "Alpine Bullhead"
    },
    "213": {
        "cs": "Drsek menší",
        "en": "Zingel Streber"
    },
    "214": {
        "cs": "Slunečnice pestrá",
        "en": "Pumpkinseed Sunfish"
    },
    "215": {
        "cs": "Vranka čtyřrohá",
        "en": "Fourhorned Sculpin"
    },
    "216": {
        "cs": "Razbora červenopruhá",
        "en": "Red-Striped Rasbora"
    },
    "217": {
        "cs": "Úzkotlamka nádherná",
        "en": "Striped Headstander"
    },
    "218": {
        "cs": "Halančík Gardnerův",
        "en": "Blue Lyretail"
    },
    "219": {
        "cs": "Trnovec hřebenočelý",
        "en": "Whitebarred Catfish"
    },
    "220": {
        "cs": "Sekavec příčnopásý",
        "en": "Kuhli Loach"
    },
    "221": {
        "cs": "Motýlkovec africký",
        "en": "Freshwater Butterflyfish"
    },
    "222": {
        "cs": "Hrotočelec ohnivý",
        "en": "Fire Eel"
    },
    "223": {
        "cs": "Ostnáč jednovousý",
        "en": "Amazon Leaf Fish"
    },
    "224": {
        "cs": "Kaproun obecný",
        "en": "Bowfin"
    },
    "225": {
        "cs": "Jeseter bílý",
        "en": "White Sturgeon"
    },
    "226": {
        "cs": "Hlavatka sibiřská",
        "en": "Hucho Taimen"
    },
    "227": {
        "cs": "Hlístoun červenohřívý",
        "en": "Giant Oarfish"
    },
    "228": {
        "cs": "Čtverzubec trpasličí",
        "en": "Dwarf Pufferfish"
    },
    "229": {
        "cs": "Duhovka",
        "en": "Rainbowfish"
    },
    "230": {
        "cs": "Pangas vláknoploutvý",
        "en": "Paroon Shark"
    },
    "231": {
        "cs": "Arowana dvojvousá",
        "en": "Silver Arowana"
    },
    "232": {
        "cs": "Arowana asijská",
        "en": "Asian Arowana"
    },
    "233": {
        "cs": "Bojovnice pestrá",
        "en": "Siamese Fighting Fish"
    },
    "234": {
        "cs": "Čtverzubec konžský",
        "en": "Congo Pufferfish"
    },
    "235": {
        "cs": "Čtverzubec baileyi",
        "en": "Hairy Pufferfish"
    },
    "236": {
        "cs": "Chaka indonéská",
        "en": "Chaca Chaca Catfish"
    },
    "237": {
        "cs": "Žabohlavec trojtrnný",
        "en": "Freshwater Lionfish"
    },
    "238": {
        "cs": "Žralok sedmižábrý",
        "en": "Sharpnose Sevengill Shark"
    },
    "239": {
        "cs": "Žralok límcový",
        "en": "Frilled Shark"
    },
    "240": {
        "cs": "Žralok trnitý",
        "en": "Bramble Shark"
    },
    "241": {
        "cs": "Ostroun obecný",
        "en": "Dogfish Shark"
    },
    "242": {
        "cs": "Žralok Cookeův",
        "en": "Prickly Shark"
    },
    "243": {
        "cs": "Polorejnok",
        "en": "Angel Shark"
    },
    "244": {
        "cs": "Různozubec Francisův",
        "en": "Horn Shark"
    },
    "245": {
        "cs": "Wobegong skvrnitý",
        "en": "Spotted Wobbegong"
    },
    "246": {
        "cs": "Žralok zebrovitý",
        "en": "Zebra Shark"
    },
    "247": {
        "cs": "Žralok vouskatý",
        "en": "Nurse Shark"
    },
    "248": {
        "cs": "Žralok obrovský",
        "en": "Whale Shark"
    },
    "249": {
        "cs": "Vousatec Smithův",
        "en": "Barbeled Houndshark"
    },
    "250": {
        "cs": "Pruhoun novozélandský",
        "en": "Gollumshark"
    },
    "251": {
        "cs": "Máčka korálová",
        "en": "Coral Catshark"
    },
    "252": {
        "cs": "Žralok modrý",
        "en": "Blue Shark"
    },
    "253": {
        "cs": "Žralok tygří",
        "en": "Tiger Shark"
    },
    "254": {
        "cs": "Žralok šotek",
        "en": "Goblin Shark"
    },
    "255": {
        "cs": "Žralok veliký",
        "en": "Basking Shark"
    },
    "256": {
        "cs": "Žralok velkoústý",
        "en": "Megamouth Shark"
    },
    "257": {
        "cs": "Liškoun obecný",
        "en": "Thresher Shark"
    },
    "258": {
        "cs": "Žralok východní",
        "en": "Longfin Mako Shark"
    },
    "259": {
        "cs": "Žralok bílý",
        "en": "Great White Shark"
    },
    "260": {
        "cs": "Siven obří",
        "en": "Lake Trout"
    },
    "261": {
        "cs": "Veslonos čínský",
        "en": "Chinese Paddlefish"
    },
    "262": {
        "cs": "Sumec albín",
        "en": "Albino Catfish"
    },
    "263": {
        "cs": "Tolstolobik bílý",
        "en": "Silver Carp"
    },
    "264": {
        "cs": "Bahník americký",
        "en": "South American Lungfish"
    },
    "265": {
        "cs": "Pyskoun skvrnitý",
        "en": "Ballan Wrasse"
    },
    "266": {
        "cs": "Kytarovec křivoústý",
        "en": "Bowmouth Guitarfish"
    },
    "267": {
        "cs": "Kanic obrovský",
        "en": "Giant Grouper"
    },
    "268": {
        "cs": "Platýs tichomořský",
        "en": "Halibut"
    },
    "269": {
        "cs": "Ploskozubec vysokočelý",
        "en": "Humphead Parrotfish"
    },
    "270": {
        "cs": "Udicovka tasmánská",
        "en": "Spotted Handfish"
    },
    "271": {
        "cs": "Řasovník rozedraný",
        "en": "Leafy Seadragon"
    },
    "272": {
        "cs": "Muréna obecná",
        "en": "Muraena Augusti"
    },
    "273": {
        "cs": "Jeseter perský",
        "en": "Persian Sturgeon"
    },
    "274": {
        "cs": "Ostenec chřestivý",
        "en": "Queen Triggerfish"
    },
    "275": {
        "cs": "Jeseter hvězdnatý",
        "en": "Starry Sturgeon"
    },
    "276": {
        "cs": "Jeseter velký",
        "en": "European Sea Sturgeon"
    },
    "277": {
        "cs": "Arowana zlatá červenoocasá",
        "en": "Red-Tail Golden Arowana"
    },
    "278": {
        "cs": "Arowana černá",
        "en": "Black Arowana"
    },
    "279": {
        "cs": "Fantang nilský",
        "en": "African Arowana"
    },
    "280": {
        "cs": "Zelená arowana",
        "en": "Green Arowana"
    },
    "281": {
        "cs": "Zeleno-červená arowana",
        "en": "Green Red Arowana"
    },
    "282": {
        "cs": "Arowana žlutoocasá",
        "en": "Yellow-Tail Arowana"
    },
    "283": {
        "cs": "Baramundi malajský",
        "en": "Asian Green Arowana"
    },
    "284": {
        "cs": "Arowana platinová",
        "en": "Platinum Golden Arowana"
    },
    "285": {
        "cs": "Baramundi severní",
        "en": "Jardini Arowana"
    },
    "286": {
        "cs": "Arowana modrá",
        "en": "Blue Malayan Arowana"
    },
    "287": {
        "cs": "Piraňa plodožravá",
        "en": "Red Bellied Pacu"
    },
    "300": {
        "cs": "Pachiméra sagamská",
        "en": "Long-nosed Chimaera"
    },
    "301": {
        "cs": "Štítovec krátkoploutvý",
        "en": "Spearfish Remora"
    },
    "302": {
        "cs": "Pilníkotrn velký",
        "en": "Scrawled Filefish"
    },
    "303": {
        "cs": "Okouník černopásý",
        "en": "Treefish"
    },
    "304": {
        "cs": "Muréna nosatá",
        "en": "RibbonEel"
    },
    "305": {
        "cs": "Manta obrovská",
        "en": "Giant Oceanic Manta Ray"
    },
    "306": {
        "cs": "Lopatonos alabamský",
        "en": "Alabama Sturgeon"
    },
    "307": {
        "cs": "Krakatice obrovská",
        "en": "Giant Squid"
    },
    "308": {
        "cs": "Mečoun obecný",
        "en": "Swordfish"
    },
    "309": {
        "cs": "Gyrodus",
        "en": "Gyrodus"
    },
    "310": {
        "cs": "Acanthodes",
        "en": "Acanthodes"
    },
    "311": {
        "cs": "Antiarchi",
        "en": "Antiarchi"
    },
    "312": {
        "cs": "Dunkleosteus",
        "en": "Dunkleosteus"
    },
    "313": {
        "cs": "Xiphactinus",
        "en": "Xiphactinus"
    },
    "314": {
        "cs": "Titanichthys",
        "en": "Titanichthys"
    },
    "315": {
        "cs": "Thelodus",
        "en": "Thelodus"
    },
    "316": {
        "cs": "Osteolepis",
        "en": "Osteolepis"
    },
    "317": {
        "cs": "Pteraspis",
        "en": "Pteraspis"
    },
    "318": {
        "cs": "Platysomus",
        "en": "Platysomus"
    },
    "319": {
        "cs": "Cheirolepis",
        "en": "Cheirolepis"
    },
    "320": {
        "cs": "Materpiscis",
        "en": "Materpiscis"
    },
    "321": {
        "cs": "Macropoma",
        "en": "Macropoma"
    },
    "322": {
        "cs": "Leedsichthys",
        "en": "Leedsichthys"
    },
    "323": {
        "cs": "Hyneria",
        "en": "Hyneria"
    },
    "324": {
        "cs": "Helicoprion",
        "en": "Helicoprion"
    },
    "325": {
        "cs": "Megalodon",
        "en": "Megalodon"
    },
    "326": {
        "cs": "Arandaspis",
        "en": "Arandaspis"
    },
    "327": {
        "cs": "Aspidorhynchus",
        "en": "Aspidorhynchus"
    },
    "328": {
        "cs": "Cladoselache",
        "en": "Cladoselache"
    },
    "329": {
        "cs": "Cheiracanthus",
        "en": "Cheiracanthus"
    },
    "330": {
        "cs": "Cobelodus",
        "en": "Cobelodus"
    },
    "331": {
        "cs": "Coccosteus",
        "en": "Coccosteus"
    },
    "332": {
        "cs": "Dapedium",
        "en": "Dapedium"
    },
    "333": {
        "cs": "Drepanaspis",
        "en": "Drepanaspis"
    },
    "334": {
        "cs": "Enchodus",
        "en": "Enchodus"
    },
    "335": {
        "cs": "Gyrosteus",
        "en": "Gyrosteus"
    },
    "336": {
        "cs": "Moythomasia",
        "en": "Moythomasia"
    },
    "337": {
        "cs": "Orthacanthus",
        "en": "Orthacanthus"
    },
    "338": {
        "cs": "Pharyngolepis",
        "en": "Pharyngolepis"
    },
    "339": {
        "cs": "Pikaia",
        "en": "Pikaia"
    },
    "340": {
        "cs": "Saurichthys",
        "en": "Saurichthys"
    },
    "341": {
        "cs": "Semionotus",
        "en": "Semionotus"
    },
    "342": {
        "cs": "Stethacanthus",
        "en": "Stethacanthus"
    },
    "343": {
        "cs": "Xenacanthus",
        "en": "Xenacanthus"
    },
    "400": {
        "cs": "Bodlok pestrý",
        "en": "Blue Tang"
    },
    "401": {
        "cs": "Pyskoun korunkatý",
        "en": "Hogfish"
    },
    "402": {
        "cs": "Trubkotlamka skvrnitá",
        "en": "Trumpetfish"
    },
    "403": {
        "cs": "Kněžík dvoupruhý",
        "en": "Bluehead Wrasse"
    },
    "404": {
        "cs": "Ostnatec ryšavý",
        "en": "Spanish Hogfish"
    },
    "405": {
        "cs": "Ploskozubec královský",
        "en": "Queen Parrotfish"
    },
    "406": {
        "cs": "Pruhatec černopruhý",
        "en": "Blackbar Soldierfish"
    },
    "407": {
        "cs": "Štíhlice písečná",
        "en": "Sand Tilefish"
    },
    "408": {
        "cs": "Kněžík Garnotův",
        "en": "Yellowhead Wrasse"
    },
    "409": {
        "cs": "Očař noční",
        "en": "Glasseye Snapper"
    },
    "410": {
        "cs": "Bodlok žlutý",
        "en": "Yellow Tang"
    },
    "411": {
        "cs": "Jednotrn vlajkoocasý",
        "en": "Fantail Filefish"
    },
    "412": {
        "cs": "Kanic tmavý",
        "en": "Blue-spotted Grouper"
    },
    "413": {
        "cs": "Akilolo zelený",
        "en": "Bird Wrasse"
    },
    "414": {
        "cs": "Bičonoš zobanovitý",
        "en": "Moorish Idol"
    },
    "415": {
        "cs": "Klipka žlutopruhá",
        "en": "Ornate Butterflyfish"
    },
    "416": {
        "cs": "Ploskozubec modrý",
        "en": "Blue Parrotfish"
    },
    "417": {
        "cs": "Ostenec Picassův",
        "en": "Picasso Triggerfish"
    },
    "418": {
        "cs": "Kněžík žlutoocasý",
        "en": "Yellowtail Wrasse"
    },
    "419": {
        "cs": "Ostenec vdova",
        "en": "Pinktail Triggerfish"
    },
    "420": {
        "cs": "Tloušťovka bermudská",
        "en": "Bermuda Chub"
    },
    "421": {
        "cs": "Klipka příčnopruhá",
        "en": "Banded Butterflyfish"
    },
    "422": {
        "cs": "Kambala tropická",
        "en": "Peacock Flounder"
    },
    "423": {
        "cs": "Pomec tříbarevný",
        "en": "Rock Beauty"
    },
    "424": {
        "cs": "Siba skvrnitá",
        "en": "Spotted Eagle Ray"
    },
    "425": {
        "cs": "Oliheň Lessonova",
        "en": "Bigfin Reef Squid"
    },
    "426": {
        "cs": "Ploskozubec půlnoční",
        "en": "Midnight Parrotfish"
    },
    "427": {
        "cs": "Vidlatka palometa",
        "en": "Palometa"
    },
    "428": {
        "cs": "Ostenec zelenavý",
        "en": "Titan Triggerfish"
    },
    "429": {
        "cs": "Chňapal modropruhý",
        "en": "Bluestripe Snapper"
    },
    "430": {
        "cs": "Klipka fantomová",
        "en": "Phantom Bannerfish"
    },
    "431": {
        "cs": "Žralok dlouhoploutvý",
        "en": "Oceanic Whitetip Shark"
    },
    "432": {
        "cs": "Žralok hnědý",
        "en": "Sandbar Shark"
    },
    "433": {
        "cs": "Žralok západoaustralský",
        "en": "Spot-tail Shark"
    },
    "434": {
        "cs": "Žraloček brazilský",
        "en": "Cookiecutter Shark"
    },
    "435": {
        "cs": "Žralok citronový",
        "en": "Lemon Shark"
    },
    "436": {
        "cs": "Žralok ostrý",
        "en": "Milk Shark"
    },
    "437": {
        "cs": "Chřestivec Darwinův",
        "en": "Red-lipped batfish"
    },
    "438": {
        "cs": "Jehla pruhovaná",
        "en": "Orange-Banded Pipefish"
    },
    "439": {
        "cs": "Bodlok jednorohý",
        "en": "Bluespine Unicornfish"
    },
    "440": {
        "cs": "Světloun Carterův",
        "en": "Cylindrical lanternshark"
    },
    "441": {
        "cs": "Kněžík šachovnicovitý",
        "en": "Checkerboard Wrasse"
    },
    "442": {
        "cs": "Kanic tygří",
        "en": "Tiger Grouper"
    },
    "443": {
        "cs": "Kanícek fialovožlutý",
        "en": "Fairy Basslet"
    },
    "444": {
        "cs": "Kanic hřbetoskvrnný",
        "en": "Graysby"
    },
    "445": {
        "cs": "Klipka žlutá",
        "en": "Longnose Butterfly"
    },
    "446": {
        "cs": "Kranas modroploutvý",
        "en": "Bluefin Trevally"
    },
    "447": {
        "cs": "Pilníkotrn nejmenší",
        "en": "Minute Leatherjacket"
    },
    "448": {
        "cs": "Komorník havajský",
        "en": "White-Spotted Damsel"
    },
    "449": {
        "cs": "Klipka hrotcová",
        "en": "Pennant Coralfish"
    },
    "450": {
        "cs": "Bodianus diplotaenia",
        "en": "Mexican Hogfish"
    },
    "451": {
        "cs": "Havýš běloskvrnný",
        "en": "Whitespotted boxfish"
    },
    "452": {
        "cs": "Ostenec bělolemý",
        "en": "Black Triggerfish"
    },
    "453": {
        "cs": "Pomec prstenčitý",
        "en": "Blue Ring Angelfish"
    },
    "454": {
        "cs": "Halančíkovec ďábelský",
        "en": "Devils Hole Pupfish"
    },
    "455": {
        "cs": "Anténovec červenoocasý",
        "en": "Redtail Catfish"
    },
    "456": {
        "cs": "Kohoutovec dlouhoploutvý",
        "en": "Roosterfish"
    },
    "500": {
        "cs": "Muréna zebrovaná",
        "en": "Zebra Moray"
    },
    "501": {
        "cs": "Muréna hvězdovitá",
        "en": "Snowflake Moray"
    },
    "502": {
        "cs": "Muréna zelenavá",
        "en": "Green Moray"
    },
    "503": {
        "cs": "Muréna poskvrněná",
        "en": "Spotted Moray"
    },
    "504": {
        "cs": "Muréna žlutolemá",
        "en": "Yellowmargin Moray"
    },
    "505": {
        "cs": "Muréna leopardí",
        "en": "Leopard Moray"
    },
    "506": {
        "cs": "Muréna žlutoocasá",
        "en": "Goldentail Moray"
    },
    "507": {
        "cs": "Muréna žlutotlamá",
        "en": "Yellow-mouth Moray"
    },
    "508": {
        "cs": "Muréna tygrovitá",
        "en": "Fangtooth Moray"
    },
    "509": {
        "cs": "Muréna pestrá",
        "en": "Paint-Spotted Moray"
    },
    "510": {
        "cs": "Muréna běloústá",
        "en": "Whitemouth Moray"
    },
    "511": {
        "cs": "Muréna pardálí",
        "en": "Dragon Moray"
    },
    "512": {
        "cs": "Muréna řetízková",
        "en": "Chain Moray"
    },
    "513": {
        "cs": "Muréna Breedenova",
        "en": "Blackcheek Moray"
    },
    "514": {
        "cs": "Muréna psí",
        "en": "Viper Moray"
    },
    "515": {
        "cs": "Muréna žlutohlavá",
        "en": "Yellowhead Moray"
    },
    "516": {
        "cs": "Muréna bělooká",
        "en": "White-Eyed Moray"
    },
    "517": {
        "cs": "Salpa Maggiore",
        "en": "Salpa Maggiore"
    },
    "518": {
        "cs": "Chrochtal žlutopruhý",
        "en": "French Grunt"
    },
    "519": {
        "cs": "Kanic tygrovaný",
        "en": "Harlequin Bass"
    },
    "520": {
        "cs": "Chňapal žlutoploutvý",
        "en": "Schoolmaster Snapper"
    },
    "521": {
        "cs": "Ještěrohlavec prostřední",
        "en": "Sand Diver"
    },
    "522": {
        "cs": "Chrochtal prasečí",
        "en": "Porkfish"
    },
    "523": {
        "cs": "Rozedranec červenoskvrnný",
        "en": "Clown Frogfish"
    },
    "524": {
        "cs": "Pyskoun dlouhoploutvý",
        "en": "Broomtail Wrasse"
    },
    "525": {
        "cs": "Kapr lysec",
        "en": "Mirror Carp"
    },
    "526": {
        "cs": "Losos kisuč",
        "en": "Coho Salmon"
    },
    "527": {
        "cs": "Úhoř novozélandský",
        "en": "Long-finned Eel"
    },
    "528": {
        "cs": "Kostlín albín",
        "en": "Albino Alligator Gar"
    },
    "529": {
        "cs": "Úhoř japonský",
        "en": "Japanese Eel"
    },
    "530": {
        "cs": "Hybridní mořčák pruhovaný",
        "en": "Hybrid Striped Bass"
    },
    "531": {
        "cs": "Mořčák stříbřitý",
        "en": "White Bass"
    },
    "532": {
        "cs": "Mořčák pruhovaný",
        "en": "Striped Bass"
    },
    "533": {
        "cs": "Dlouhonos třásnitý",
        "en": "Long-snouted Lancetfish"
    },
    "600": {
        "cs": "Amur bílý",
        "en": "Grass Carp"
    },
    "601": {
        "cs": "Tolstolobec pestrý",
        "en": "Bighead Carp"
    },
    "602": {
        "cs": "Příčnoústka čtyřvousá",
        "en": "Mrigal Carp"
    },
    "603": {
        "cs": "Labeo černé",
        "en": "Black Sharkminnow"
    },
    "604": {
        "cs": "Jehlice lagunová",
        "en": "Atlantic Needlefish"
    },
    "605": {
        "cs": "Krunýřovec",
        "en": "Gold Nugget Pleco"
    },
    "606": {
        "cs": "Bichir senegalský",
        "en": "Senegal Bichir"
    },
    "607": {
        "cs": "Anténovec vláknovitý",
        "en": "Piraíba Catfish"
    },
    "608": {
        "cs": "Čtverzubec mbu",
        "en": "Mbu Pufferfish"
    },
    "609": {
        "cs": "Nožovka běločelá",
        "en": "Black Ghost Knifefish"
    },
    "610": {
        "cs": "Krunýřovec zebra",
        "en": "Zebra Pleco"
    },
    "611": {
        "cs": "Panceřníček Juliin",
        "en": "Corydoras Julii"
    },
    "612": {
        "cs": "Polozobánka malajská",
        "en": "Wrestling Halfbeak"
    },
    "613": {
        "cs": "Štika amurská",
        "en": "Amur Pike"
    },
    "614": {
        "cs": "Aju východní",
        "en": "Ayu"
    },
    "615": {
        "cs": "Sekavka nádherná",
        "en": "Clown Loach"
    },
    "616": {
        "cs": "Piloun mikrodon",
        "en": "Largetooth Sawfish"
    },
    "617": {
        "cs": "Živorodka ostrotlamá",
        "en": "Black Molly"
    },
    "618": {
        "cs": "Okounek světlý",
        "en": "White Crappie"
    },
    "619": {
        "cs": "Panchax prstencový",
        "en": "Clown Killi"
    },
    "620": {
        "cs": "Tlamovec čelnatý",
        "en": "Frontosa Cichlid"
    },
    "621": {
        "cs": "Hrotočelec ozbrojený",
        "en": "Tire Track Eel"
    },
    "700": {
        "cs": "Žralok kyklop",
        "en": "Cyclops Shark"
    },
    "701": {
        "cs": "Šírotlamka pelikánovitá",
        "en": "Pelican Eel"
    },
    "702": {
        "cs": "Tupohlavec Rosenův",
        "en": "Meadia Roseni"
    },
    "703": {
        "cs": "Sliznatá ryba",
        "en": "Blobfish"
    },
    "704": {
        "cs": "Ďas mořský",
        "en": "Angler Monkfish"
    },
    "705": {
        "cs": "Svítivec",
        "en": "Stareater"
    },
    "706": {
        "cs": "Neoclinus blanchardi",
        "en": "Sarcastic Fringehead"
    },
    "707": {
        "cs": "Čtverzubec běloskvrnný",
        "en": "White-spotted Puffer"
    },
    "708": {
        "cs": "Králíčkovec zlatoskvrnný",
        "en": "Gold-spotted Rabbitfish"
    },
    "709": {
        "cs": "Klaun uzdičkatý",
        "en": "Tomato Clownfish"
    },
    "710": {
        "cs": "Sapín zelený",
        "en": "Blue-Green Chromis"
    },
    "711": {
        "cs": "Pomčík Potterův",
        "en": "Potter's Angelfish"
    },
    "712": {
        "cs": "Pilohřbet jihoaustralský",
        "en": "Fiddler Ray"
    },
    "713": {
        "cs": "Havýš rohatý",
        "en": "Longhorn Cowfish"
    },
    "714": {
        "cs": "Kněžík duhový",
        "en": "Cortez Rainbow Wrasse"
    },
    "715": {
        "cs": "Pásovka černá",
        "en": "Black Dragonfish"
    },
    "716": {
        "cs": "Channa aurantimaculata",
        "en": "Orange-spotted Snakehead"
    },
    "717": {
        "cs": "Štika americká červenoploutvá",
        "en": "Redfin Pickerel"
    },
    "718": {
        "cs": "Štika americká",
        "en": "Grass Pickerel"
    },
    "719": {
        "cs": "Štika zlatá",
        "en": "Golden Pike"
    },
    "720": {
        "cs": "Tlamovec Thomasův",
        "en": "Butterfly Cichlid"
    },
    "721": {
        "cs": "Kanic tečkovaný",
        "en": "Panther Grouper"
    },
    "722": {
        "cs": "Jehlice krokodýlí",
        "en": "Hound Needlefish"
    },
    "723": {
        "cs": "Chanos stříbřitý",
        "en": "Milkfish"
    },
    "724": {
        "cs": "Pilonos vouskatý",
        "en": "Longnose Sawshark"
    },
    "725": {
        "cs": "Cichlida plochohlavá",
        "en": "Malawi Eye Biter"
    },
    "726": {
        "cs": "Řasovník protáhlý",
        "en": "Weedy Seadragon"
    },
    "727": {
        "cs": "Okouníček sklovitý",
        "en": "Indian Glass Fish"
    },
    "728": {
        "cs": "Chimérovka tasmánská",
        "en": "Australian Ghostshark"
    },
    "729": {
        "cs": "Netopýrník hrbohlavý",
        "en": "Humpback Batfish"
    },
    "730": {
        "cs": "Pyskoun třásniploutvý",
        "en": "Dragon Wrasse"
    },
    "731": {
        "cs": "Vlajkovka červenavá",
        "en": "Red Indianfish"
    },
    "732": {
        "cs": "Ještěrohlavec hlubokomořský",
        "en": "Deepsea Lizardfish"
    },
    "733": {
        "cs": "Kostlín černý",
        "en": "Black Alligator Gar"
    },
    "734": {
        "cs": "Chrochtal východní",
        "en": "Oriental Sweetlips"
    },
    "735": {
        "cs": "Hlaváčovec nádherný",
        "en": "Elegant Firefish"
    },
    "736": {
        "cs": "Klipka krokvicová",
        "en": "Chevron Butterflyfish"
    },
    "737": {
        "cs": "Pomčík citronový",
        "en": "Lemonpeel Angelfish"
    },
    "738": {
        "cs": "Čtverzubec lysý",
        "en": "Ocellated Pufferfish"
    },
    "739": {
        "cs": "Plošák stříbřitý",
        "en": "Common Ponyfish "
    },
    "740": {
        "cs": "Neonka obecná",
        "en": "Neon Tetra"
    },
    "741": {
        "cs": "Perleťovka démon",
        "en": "Satanoperca"
    },
    "742": {
        "cs": "Dánio duhové",
        "en": "Pearl Danio"
    },
    "743": {
        "cs": "Galaxie velká",
        "en": "Giant Kokopu"
    },
    "744": {
        "cs": "Jeseter amurský",
        "en": "Amur Sturgeon"
    },
    "745": {
        "cs": "Manta velká",
        "en": "Giant Devil Ray"
    },
    "746": {
        "cs": "Ploskozubec zelenozubý",
        "en": "Rusty Parrotfish"
    },
    "747": {
        "cs": "Pomec císařský",
        "en": "Emperor Angelfish"
    },
    "748": {
        "cs": "Vějířník třásnitý",
        "en": "Ornate Ghost Pipefish"
    },
    "749": {
        "cs": "Různozubec přilbovitý",
        "en": "Crested Bullhead Shark"
    },
    "750": {
        "cs": "Rozedranec pestrý",
        "en": "Pink Frogfish"
    },
    "751": {
        "cs": "Trnonoš australský",
        "en": "Pineapplefish"
    },
    "752": {
        "cs": "Oblohlav divukrásný",
        "en": "Marine Betta"
    },
    "753": {
        "cs": "Lampař severní",
        "en": "Northern Lampfish"
    },
    "754": {
        "cs": "Kněžík srpkovitý",
        "en": "Moon Wrasse"
    },
    "755": {
        "cs": "Štětičkovec obecný",
        "en": "Longnose Hawkfish"
    },
    "756": {
        "cs": "Havýš žlutohnědý",
        "en": "Yellow Boxfish"
    },
    "757": {
        "cs": "Bodlok Achillův",
        "en": "Achilles Tang"
    },
    "758": {
        "cs": "Jeseter jihočínský",
        "en": "Yangtze Sturgeon"
    },
    "759": {
        "cs": "Pardachirus morrowi",
        "en": "Persian Carpet Sole"
    },
    "760": {
        "cs": "Chňapal císařský",
        "en": "Emperor Red Snapper"
    },
    "761": {
        "cs": "Čtverzubec ostnatý",
        "en": "Basketfish"
    },
    "762": {
        "cs": "Hlaváč červenopruhý",
        "en": "Red-striped Goby"
    },
    "763": {
        "cs": "Jeseter sibiřský",
        "en": "Siberian Sturgeon"
    },
    "764": {
        "cs": "Jeseter krátkorypý",
        "en": "Shortnose Sturgeon"
    },
    "765": {
        "cs": "Kostlín floridský",
        "en": "Florida Gar"
    },
    "800": {
        "cs": "Tuňák žlutoploutvý",
        "en": "Yellowfin Tuna"
    },
    "801": {
        "cs": "Tuňák velkooký",
        "en": "Bigeye Tuna"
    },
    "802": {
        "cs": "Tuňák tichomořský",
        "en": "Pacific Bluefin Tuna"
    },
    "803": {
        "cs": "Marlín černý",
        "en": "Black Marlin"
    },
    "804": {
        "cs": "Marlín pruhovaný",
        "en": "Striped Marlin"
    },
    "805": {
        "cs": "Marlín bílý",
        "en": "White Marlin"
    },
    "806": {
        "cs": "Soltýn ostroploutvý",
        "en": "Sharpfin Barracuda"
    },
    "807": {
        "cs": "Soltýn pelikání",
        "en": "Pelican Barracuda"
    },
    "808": {
        "cs": "Soltýn žlutoocasý",
        "en": "Yellowtail Barracuda"
    },
    "809": {
        "cs": "Soltýn velkooký",
        "en": "Bigeye Barracuda"
    },
    "810": {
        "cs": "Kostlín skvrnitý",
        "en": "Spotted Gar"
    },
    "811": {
        "cs": "Bojovnice Brownových",
        "en": "Betta Brownorum"
    },
    "812": {
        "cs": "Halančíkovec slaništní",
        "en": "Death Valley Pupfish"
    },
    "813": {
        "cs": "Štikovka skvrnitá",
        "en": "Spotted Pike-characin"
    },
    "814": {
        "cs": "Hlaváč Griessingerův",
        "en": "Spikefin Goby"
    },
    "815": {
        "cs": "Soltýn stříbřitý",
        "en": "Pacific Barracuda"
    },
    "816": {
        "cs": "Soltýn pobřežní",
        "en": "Guachanche Barracuda"
    },
    "817": {
        "cs": "Soltýn Hellerův",
        "en": "Heller's Barracuda"
    },
    "818": {
        "cs": "Soltýn tmavopruhý",
        "en": "Pickhandle Barracuda"
    },
    "819": {
        "cs": "Soltýn Australský",
        "en": "Australian Barracuda"
    },
    "1000": {
        "cs": "Žralok grónský",
        "en": "Greenland Shark"
    },
    "1001": {
        "cs": "Piloun malozubý",
        "en": "Smalltooth Sawfish"
    },
    "1002": {
        "cs": "Piloun obecný",
        "en": "Common Sawfish"
    },
    "1003": {
        "cs": "Lesklec africký",
        "en": "Spotted Sicklefish"
    },
    "1004": {
        "cs": "Hrdložábřík bělavý",
        "en": "Blind Cave Eel"
    },
    "1005": {
        "cs": "Kranas zlatý",
        "en": "Golden Trevally"
    },
    "1006": {
        "cs": "Kladivoun tiburo",
        "en": "Bonnethead Shark"
    },
    "1007": {
        "cs": "Kladivoun křídlohlavý",
        "en": "Winghead Shark"
    },
    "1008": {
        "cs": "Noční poutník",
        "en": "Blue-bellied Night Wanderer"
    },
    "1009": {
        "cs": "Medúzovec okounovitý",
        "en": "American Barrelfish"
    },
    "1010": {
        "cs": "Rypoun vidlozubý",
        "en": "Marcusenius Furcidens"
    },
    "1011": {
        "cs": "Tetra Sweglesova",
        "en": "Red Phantom Tetra"
    },
    "1012": {
        "cs": "Cichlida madagaskarská",
        "en": "Black Diamond Cichlid"
    },
    "1013": {
        "cs": "Piraňa tmavá",
        "en": "Piraya"
    },
    "1014": {
        "cs": "Vějířovka příčnopruhá",
        "en": "Austrolebias Adloffi"
    },
    "1100": {
        "cs": "Kanic cukrový",
        "en": "Candy Basslet"
    },
    "1101": {
        "cs": "Kanic oranžovoskvrnný",
        "en": "Orangespotted Soapfish"
    },
    "1102": {
        "cs": "Kanic křiklavý",
        "en": "Garish Hind"
    },
    "1103": {
        "cs": "Pomec maskový",
        "en": "Masked Angelfish"
    },
    "1104": {
        "cs": "Pomčík Boyleův",
        "en": "Peppermint Angelfish"
    },
    "1105": {
        "cs": "Tuňák křídlatý",
        "en": "Albacore Tuna"
    },
    "1106": {
        "cs": "Tuňák australský",
        "en": "Southern Bluefin Tuna"
    },
    "1107": {
        "cs": "Tuňák atlantský",
        "en": "Blackfin Tuna"
    },
    "1108": {
        "cs": "Tuňák dlouhoocasý",
        "en": "Longtail Tuna"
    },
    "1109": {
        "cs": "Tuňák malý",
        "en": "Bullet Tuna"
    },
    "1110": {
        "cs": "Hlubinář",
        "en": "Aphyonidae"
    },
    "1111": {
        "cs": "Ipnops",
        "en": "Grideye Fish"
    },
    "1112": {
        "cs": "Tlamovec sprengerae",
        "en": "Lavender Mbuna"
    },
    "1113": {
        "cs": "Dánio jayarami",
        "en": "Inlecypris Jayarami"
    },
    "1114": {
        "cs": "Rypoun západoafrický",
        "en": "Isichthys Henryi"
    },
    "1115": {
        "cs": "Slimule bělopruhá",
        "en": "Whitebar Eelpout"
    },
    "1116": {
        "cs": "Hlaváčovec černoploutvý",
        "en": "Blackfin Dartfish"
    },
    "1117": {
        "cs": "Terčovka Beckerova",
        "en": "Gloved Snailfish"
    },
    "1118": {
        "cs": "Sekavec sabažský",
        "en": "Pangio Mariarum"
    },
    "1119": {
        "cs": "Pakaprovec ostrohřbetý",
        "en": "Razorback Sucker"
    },
    "1120": {
        "cs": "Křížovec panamský",
        "en": "Chilhuil Sea Catfish"
    },
    "1121": {
        "cs": "Ostroretka stěhovavá",
        "en": "Common Nase"
    },
    "1122": {
        "cs": "Plotice obecná",
        "en": "Common Roach"
    },
    "1123": {
        "cs": "Střevle potoční",
        "en": "Common Minnow"
    },
    "1124": {
        "cs": "Makrela obecná",
        "en": "Atlantic Mackerel"
    },
    "1125": {
        "cs": "Sardel obecná",
        "en": "European Anchovy"
    },
    "1126": {
        "cs": "Šprot obecný",
        "en": "European Sprat"
    },
    "1127": {
        "cs": "Ježdík obecný",
        "en": "Eurasian Ruffe"
    },
    "1128": {
        "cs": "Síh peleď",
        "en": "Peled"
    },
    "1129": {
        "cs": "Skalára amazonská",
        "en": "Freshwater Angelfish"
    },
    "1130": {
        "cs": "Koljuška tříostná",
        "en": "Three-spined Stickleback"
    },
    "1131": {
        "cs": "Řasovník rubínový",
        "en": "Ruby Seadragon"
    },
    "1132": {
        "cs": "Lates stříbřitý",
        "en": "Barramundi"
    },
    "1133": {
        "cs": "Parachaenichthys charcoti",
        "en": "Parachaenichthys charcoti"
    },
    "1134": {
        "cs": "Žralok krátkoploutvý",
        "en": "Spinner Shark"
    },
    "1135": {
        "cs": "Žralok černoploutvý",
        "en": "Blacktip Reef Shark"
    },
    "1136": {
        "cs": "Světloun Bonnaterrův",
        "en": "Kitefin Shark"
    },
    "1137": {
        "cs": "Žralůček indonéský",
        "en": "Indonesian Speckled Carpetshark"
    },
    "1138": {
        "cs": "Polorejnok obecný",
        "en": "Sawback Angelshark"
    },
    "1139": {
        "cs": "Chobotnice kroužkovaná",
        "en": "Greater Blue-ringed Octopus"
    },
    "1140": {
        "cs": "Bezkýlovec listošupinatý",
        "en": "Leafscale Gulper Shark"
    },
    "1141": {
        "cs": "Žralok velrybář",
        "en": "Dusky Shark"
    },
    "1142": {
        "cs": "Parmovec skvělý",
        "en": "Banggai Cardinalfish"
    },
    "1143": {
        "cs": "Studnař Rosenblattův",
        "en": "Blue Dot Jawfish"
    },
    "1144": {
        "cs": "Studnař řemínkový",
        "en": "Chinstrap Jawfish"
    },
    "1145": {
        "cs": "Slizoun znamenitý",
        "en": "Gulf Signal Blenny"
    },
    "1146": {
        "cs": "Vranka červená",
        "en": "Red Irish lord"
    },
    "1147": {
        "cs": "Hlaváč širokopruhý",
        "en": "Broad-barred Goby"
    },
    "1148": {
        "cs": "Hlaváč krabí",
        "en": "Twin-spot Goby"
    },
    "1149": {
        "cs": "Placka pomořanská",
        "en": "Allis shad"
    },
    "1150": {
        "cs": "Bolen dravý",
        "en": "Asp"
    },
    "1151": {
        "cs": "Slunka obecná",
        "en": "Sunbleak"
    },
    "1152": {
        "cs": "Podoustev říční",
        "en": "Vimba Bream"
    },
    "1153": {
        "cs": "Mřenka mramorovaná",
        "en": "Stone Loach"
    },
    "1154": {
        "cs": "Carcharocles chubutensis",
        "en": "Carcharocles chubutensis"
    },
    "1155": {
        "cs": "Cretoxyrhina",
        "en": "Cretoxyrhina"
    },
    "1156": {
        "cs": "Deltoptychius",
        "en": "Deltoptychius"
    },
    "1157": {
        "cs": "Ischnacanthus",
        "en": "Ischnacanthus"
    },
    "1158": {
        "cs": "Ctenurella",
        "en": "Ctenurella"
    },
    "1159": {
        "cs": "Astraspis",
        "en": "Astraspis"
    },
    "1160": {
        "cs": "Boreaspis",
        "en": "Boreaspis"
    },
    "1161": {
        "cs": "Dartmuthia",
        "en": "Dartmuthia"
    },
    "1162": {
        "cs": "Doryaspis arctica",
        "en": "Doryaspis arctica"
    },
    "1163": {
        "cs": "Doryaspis nathorsti",
        "en": "Doryaspis nathorsti"
    },
    "1164": {
        "cs": "Kančík papouščí",
        "en": "Parrot Cichlid"
    },
    "1165": {
        "cs": "Kančík perleťový",
        "en": "Jack Dempsey"
    },
    "1166": {
        "cs": "Kančík Doviův",
        "en": "Guapote"
    },
    "1167": {
        "cs": "Kančík managujský",
        "en": "Jaguar Guapote"
    },
    "1168": {
        "cs": "Kančík červenohlavý",
        "en": "Redhead Cichlid"
    },
    "1169": {
        "cs": "Keříčkovec jeskynní",
        "en": "Golden Cave Catfish"
    },
    "1170": {
        "cs": "Anténovec ozdobný",
        "en": "Pictus Catfish"
    },
    "1171": {
        "cs": "Sanak asijský",
        "en": "Giant Salmon Carp"
    },
    "1172": {
        "cs": "Pilníkotrn slepený",
        "en": "Bridled Leatherjacket"
    },
    "1173": {
        "cs": "Uzlatka východoatlantská",
        "en": "Risso's Smooth-head"
    },
    "1174": {
        "cs": "Štikovka brazilská",
        "en": "Boulengerella Cuvieri"
    },
    "1175": {
        "cs": "Máčka úzkohlavá",
        "en": "Narrowhead Catshark"
    },
    "1176": {
        "cs": "Narcina surinamská",
        "en": "Painted electric ray"
    },
    "1177": {
        "cs": "Dlouhozubec dravý",
        "en": "Evermannella Balbo"
    },
    "1178": {
        "cs": "Páskoun pruhovaný",
        "en": "Unicorn Crestfish"
    },
    "1179": {
        "cs": "Cichlida piquiti",
        "en": "Azul Peacock Bass"
    },
    "1180": {
        "cs": "Trahir krátkoocasý",
        "en": "Red Wolf Fish"
    },
    "1181": {
        "cs": "Anténovec skvrnitý",
        "en": "Spotted Tiger Shovelnose Catfish"
    },
    "1182": {
        "cs": "Terčovka pulcovitá",
        "en": "Tadpole Snailfish"
    },
    "1183": {
        "cs": "Slimule pelagická",
        "en": "Midwater Eelpout"
    },
    "1184": {
        "cs": "Pseudoliparis Swirei",
        "en": "Mariana Snailfish"
    },
    "1185": {
        "cs": "Muréna zlatá",
        "en": "Dwarf Moray"
    },
    "1186": {
        "cs": "Manta mexická",
        "en": "Smoothtail Mobula"
    },
    "1187": {
        "cs": "Pilníkotrn Taylorův",
        "en": "Taylor's Inflator Filefish"
    },
    "1188": {
        "cs": "Tupohlavec krátkochvostý",
        "en": "Shortdorsal Cutthroat Eel"
    },
    "1189": {
        "cs": "Muréna sladkovodní",
        "en": "Freshwater Moray"
    },
    "1190": {
        "cs": "Jeskyňovka Yunokawa",
        "en": "Grammonus Yunokawai"
    },
    "1191": {
        "cs": "Akilolo nosatý",
        "en": "Green Birdmouth Wrasse"
    },
    "1192": {
        "cs": "Duhovka lososová",
        "en": "Red Rainbowfish"
    },
    "1193": {
        "cs": "Hadař zubatkový",
        "en": "Angler Snake Eel"
    },
    "1194": {
        "cs": "Bezkýlovec lopatonosý",
        "en": "Birdbeak Dogfish"
    },
    "1195": {
        "cs": "Lampovníček Barnardův",
        "en": "Barnards Lanternfish"
    },
    "1196": {
        "cs": "Kanic šípohlavý",
        "en": "Arrowhead Soapfish"
    },
    "1197": {
        "cs": "Parmice pruhovaná",
        "en": "Fluorescing Goatfish"
    },
    "1198": {
        "cs": "Kostlín zlatý",
        "en": "Golden Gar"
    },
    "1199": {
        "cs": "",
        "en": "Bluestripe Pipefish"
    },
    "1200": {
        "cs": "",
        "en": "Sulawesi Coelacanth"
    },
    "1201": {
        "cs": "",
        "en": "African Mottled Eel"
    },
    "1202": {
        "cs": "",
        "en": "Blue Panchax"
    },
    "1203": {
        "cs": "",
        "en": "Crocodile-tooth Pipefish"
    }
},

    t: function (key, fallback) {
      var lang = FISHAO_I18N.currentLang || 'cs';
      var dict = FISHAO_I18N.ui[lang] || FISHAO_I18N.ui.cs;
      if (dict && dict[key] !== undefined) {
        return dict[key];
      }
      if (FISHAO_I18N.ui.cs && FISHAO_I18N.ui.cs[key] !== undefined) {
        return FISHAO_I18N.ui.cs[key];
      }
      return fallback !== undefined ? fallback : key;
    },

    getFishName: function (fish, lang) {
      if (!fish) return '';
      var id = (typeof fish === 'object') ? fish.id : fish;
      var fallback = (typeof fish === 'object' && fish.name) ? fish.name : ('Ryba #' + id);
      lang = lang || FISHAO_I18N.currentLang || 'cs';
      if (FISHAO_I18N.fishes[id] && FISHAO_I18N.fishes[id][lang]) {
        return FISHAO_I18N.fishes[id][lang];
      }
      return fallback;
    },

    getLocationName: function (loc, lang) {
      if (!loc) return '';
      lang = lang || FISHAO_I18N.currentLang || 'cs';
      if (FISHAO_I18N.locations[loc] && FISHAO_I18N.locations[loc][lang]) {
        return FISHAO_I18N.locations[loc][lang];
      }
      return loc;
    },

    getBaitName: function (bait, lang) {
      if (!bait) return '';
      lang = lang || FISHAO_I18N.currentLang || 'cs';
      if (FISHAO_I18N.baits[bait] && FISHAO_I18N.baits[bait][lang]) {
        return FISHAO_I18N.baits[bait][lang];
      }
      return bait;
    },

    getWaterName: function (water, lang) {
      if (!water) return '';
      lang = lang || FISHAO_I18N.currentLang || 'cs';
      if (FISHAO_I18N.waters[water] && FISHAO_I18N.waters[water][lang]) {
        return FISHAO_I18N.waters[water][lang];
      }
      return water;
    }
  };

  if (supportedLanguages.indexOf(FISHAO_I18N.currentLang) === -1) {
    FISHAO_I18N.currentLang = 'cs';
  }

  if (typeof window !== 'undefined') {
    window.FISHAO_I18N = FISHAO_I18N;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = FISHAO_I18N;
  }
})();
