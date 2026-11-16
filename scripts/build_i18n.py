"""
FISHAO - i18n Generator (build_i18n.py)
---------------------------------------
Regenerates data/i18n/fish_names.js and data/i18n/taxonomies.js from the
official game localization files in the repository root:

    lang_cz.json  -> "cs"
    lang_en.json  -> "en"
    lang_pl.json  -> "pl"

Each fish / bait / location entry gets one key per language for which the game
file has a non-empty value (with concise UI overrides where desired). Missing
languages are simply omitted; the runtime (data/i18n.js) resolves them through
the language fallback chain (pl -> en -> cs, en -> cs).

To add another language: add it to LANG_FILES below, register it in the
LANGUAGES map in data/i18n.js and create data/i18n/ui_<code>.js.

Usage:  python scripts/build_i18n.py
"""

import json
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW_DIR = os.path.join(BASE_DIR, "data", "raw")
FISH_JSON = os.path.join(RAW_DIR, "fish.json")
OUT_FISH_NAMES = os.path.join(BASE_DIR, "data", "i18n", "fish_names.js")
OUT_TAXONOMIES = os.path.join(BASE_DIR, "data", "i18n", "taxonomies.js")

# Language code -> game localization file (order = key order in the output)
LANG_FILES = [
    ("cs", "lang_cz.json"),
    ("en", "lang_en.json"),
    ("pl", "lang_pl.json"),
]

# Canonical bait category codes stored in data/fishes.js and filter <select>s
BAIT_CODES = [
    "insects", "vegetal", "fish", "dough", "lures", "meat", "shark", "hook",
    "monkfish", "monster", "pelican", "prehistoric", "star", "tuna", "barracuda", "marlin",
]

# Concise UI overrides where the raw game string (bait_category_*) is verbose
# or uses inconsistent casing
BAIT_OVERRIDES = {
    "hook": {"en": "Hooks"},
    "meat": {"cs": "Maso"},
    "shark": {"pl": "Przynęta rekinia"},
    "monkfish": {"cs": "Ďasí", "en": "Monkfish"},
    "pelican": {"cs": "Šírotlamčí", "en": "Pelican"},
    "star": {"cs": "Svítivčí", "en": "Star"},
    "tuna": {"cs": "Tuňáčí", "en": "Tuna"},
    "barracuda": {"cs": "Soltýní", "en": "Barracuda"},
    "marlin": {"cs": "Marlíní", "en": "Marlin"},
}

LOCATION_OVERRIDES = {
    "location_11": {"en": "Palm Island"},
}

WATERS = {
    "salt": {"cs": "Slaná (vlevo)", "en": "Saltwater (left)", "pl": "Słona (po lewej)"},
    "fresh": {"cs": "Sladká (vpravo)", "en": "Freshwater (right)", "pl": "Słodka (po prawej)"},
    "unknown": {"cs": "Neznámá", "en": "Unknown", "pl": "Nieznana"},
}

# Sub-location zones (EFPT_* codes in fish.places); not present in lang_*.json
EFPT_LOCATIONS = {
    "EFPT_LOST_VALLEY_POND_1": {"cs": "Údolí", "en": "Lower area", "pl": "Dolny obszar"},
    "EFPT_LOST_VALLEY_POND_2": {"cs": "U vodopádu", "en": "By the waterfall", "pl": "Przy wodospadzie"},
    "EFPT_SEAGULL_HARBOR_BOAT": {"cs": "Loď", "en": "Boat", "pl": "Łódź"},
    "EFPT_PANHEIRA_BEACH_JETTY": {"cs": "Molo", "en": "Jetty", "pl": "Molo"},
    "EFPT_COOL_MOUNTAIN_RAFT": {"cs": "Vor", "en": "Raft", "pl": "Tratwa"},
    "EFPT_THOMBANI_TOWN_AFRICAN_LAKE": {"cs": "Africké jezero", "en": "African Lake", "pl": "Jezioro afrykańskie"},
    "EFPT_CLUB_AREA_SALT": {"cs": "Slaná (vlevo)", "en": "Saltwater (left)", "pl": "Słona (po lewej)"},
    "EFPT_CLUB_AREA_FRESH": {"cs": "Sladká (vpravo)", "en": "Freshwater (right)", "pl": "Słodka (po prawej)"},
    "EFPT_PALM_ISLAND_ZONE_A": {"cs": "Vnější oblast", "en": "Outer area", "pl": "Obszar zewnętrzny"},
    "EFPT_PALM_ISLAND_ZONE_B": {"cs": "Vlevo nahoře", "en": "Upper left", "pl": "U góry po lewej"},
    "EFPT_PALM_ISLAND_ZONE_C": {"cs": "Vpravo nahoře", "en": "Upper right", "pl": "U góry po prawej"},
    "EFPT_PALM_ISLAND_ZONE_D": {"cs": "Pod lodí", "en": "Under the boat", "pl": "Pod łodzią"},
    "EFPT_PALM_ISLAND_ZONE_E": {"cs": "Vnitřní oblast", "en": "Inner area", "pl": "Obszar wewnętrzny"},
    "EFPT_PALM_ISLAND_ZONE_F": {"cs": "Vpravo od mostu", "en": "Right of the bridge", "pl": "Na prawo od mostu"},
    "EFPT_PALM_ISLAND_ZONE_G": {"cs": "Dolní rohy", "en": "Lower corners", "pl": "Dolne rogi"},
    "EFPT_PALM_ISLAND_ZONE_H": {"cs": "Malé ostrovy", "en": "Small islands", "pl": "Małe wyspy"},
}

CITIES = {
    "Prague": {"cs": "Praha", "pl": "Praga"},
    "Vienna": {"cs": "Vídeň", "pl": "Wiedeń"},
    "Bratislava": {"cs": "Bratislava", "pl": "Bratysława"},
    "Warsaw": {"cs": "Varšava", "pl": "Warszawa"},
    "Berlin": {"cs": "Berlín", "pl": "Berlin"},
    "London": {"cs": "Londýn", "pl": "Londyn"},
    "Paris": {"cs": "Paříž", "pl": "Paryż"},
    "Rome": {"cs": "Řím", "pl": "Rzym"},
    "Budapest": {"cs": "Budapešť", "pl": "Budapeszt"},
    "Kiev": {"cs": "Kyjev", "pl": "Kijów"},
    "Kyiv": {"cs": "Kyjev", "pl": "Kijów"},
    "Vilnius": {"cs": "Vilnius", "pl": "Wilno"},
    "Copenhagen": {"cs": "Kodaň", "pl": "Kopenhaga"},
    "Brussels": {"cs": "Brusel", "pl": "Bruksela"},
    "Zurich": {"cs": "Curych", "pl": "Zurych"},
    "Lisbon": {"cs": "Lisabon", "pl": "Lizbona"},
    "Athens": {"cs": "Atény", "pl": "Ateny"},
    "Belgrade": {"cs": "Bělehrad", "pl": "Belgrad"},
    "Bucharest": {"cs": "Bukurešť", "pl": "Bukareszt"},
}


def load_json(name):
    with open(os.path.join(RAW_DIR, name), "r", encoding="utf-8") as f:
        return json.load(f)


def build_fish_names(langs):
    fish_raw = load_json("fish.json")
    fishes = fish_raw.get("data", fish_raw)
    fish_ids = sorted({int(f["id"]) for f in fishes})

    names = {}
    stats = {code: 0 for code, _ in LANG_FILES}
    for fid in fish_ids:
        entry = {}
        for code, data in langs:
            val = (data.get(f"fish_{fid}") or "").strip()
            if val:
                entry[code] = val
                stats[code] += 1
        if entry:
            names[str(fid)] = entry

    body = json.dumps(names, ensure_ascii=False, indent=4)
    codes = " / ".join(code.upper() for code, _ in LANG_FILES)
    with open(OUT_FISH_NAMES, "w", encoding="utf-8", newline="\r\n") as f:
        f.write("/**\n")
        f.write(f" * FISHAO - Fish Names Dictionary ({codes})\n")
        f.write(f" * {len(names)} fish - AUTO-GENERATED by build_i18n.py from lang_*.json. Do not edit by hand.\n")
        f.write(" */\n")
        f.write("(function () {\n  'use strict';\n\n")
        f.write("  var fishNames = " + body + ";\n\n")
        f.write("  if (typeof window !== 'undefined') {\n")
        f.write("    window.FISHAO_I18N_FISH_NAMES = fishNames;\n  }\n")
        f.write("  if (typeof module !== 'undefined' && module.exports) {\n")
        f.write("    module.exports = fishNames;\n  }\n")
        f.write("})();\n")

    print(f"-> Generated {len(names)} fish names: " + ", ".join(f"{c}={n}" for c, n in stats.items()))
    print(f"-> Saved to: {OUT_FISH_NAMES}")


def build_taxonomies(langs):
    baits = {}
    for code_key in BAIT_CODES:
        entry = {}
        overrides = BAIT_OVERRIDES.get(code_key, {})
        for lang_code, data in langs:
            val = overrides.get(lang_code) or (data.get(f"bait_category_{code_key}") or "").strip()
            if val:
                entry[lang_code] = val
        baits[code_key] = entry

    loc_keys = sorted(
        {
            k
            for _, data in langs
            for k in data.keys()
            if k.startswith("location_") and k.split("_", 1)[1].isdigit()
        },
        key=lambda k: int(k.split("_", 1)[1]),
    )
    locations = {}
    for lk in loc_keys:
        entry = {}
        overrides = LOCATION_OVERRIDES.get(lk, {})
        for lang_code, data in langs:
            val = overrides.get(lang_code) or (data.get(lk) or "").strip()
            if val:
                entry[lang_code] = val
        locations[lk] = entry

    for efpt_key, efpt_vals in EFPT_LOCATIONS.items():
        locations[efpt_key] = dict(efpt_vals)

    taxonomies = {
        "baits": baits,
        "waters": WATERS,
        "locations": locations,
        "cities": CITIES,
    }

    body = json.dumps(taxonomies, ensure_ascii=False, indent=4)
    codes = " / ".join(code.upper() for code, _ in LANG_FILES)
    with open(OUT_TAXONOMIES, "w", encoding="utf-8", newline="\r\n") as f:
        f.write("/**\n")
        f.write(f" * FISHAO - Taxonomies Dictionary ({codes})\n")
        f.write(
            f" * {len(baits)} baits, {len(WATERS)} waters, {len(locations)} locations, {len(CITIES)} cities\n"
        )
        f.write(" * AUTO-GENERATED by build_i18n.py from lang_*.json. Do not edit by hand.\n")
        f.write(" */\n")
        f.write("(function () {\n  'use strict';\n\n")
        f.write("  var taxonomies = " + body + ";\n\n")
        f.write("  if (typeof window !== 'undefined') {\n")
        f.write("    window.FISHAO_I18N_TAXONOMIES = taxonomies;\n  }\n")
        f.write("  if (typeof module !== 'undefined' && module.exports) {\n")
        f.write("    module.exports = taxonomies;\n  }\n")
        f.write("})();\n")

    print(
        f"-> Generated taxonomies: {len(baits)} baits, {len(WATERS)} waters, "
        f"{len(locations)} locations ({len(loc_keys)} game + {len(EFPT_LOCATIONS)} places), {len(CITIES)} cities"
    )
    print(f"-> Saved to: {OUT_TAXONOMIES}")


def main():
    langs = [(code, load_json(path)) for code, path in LANG_FILES]
    build_fish_names(langs)
    build_taxonomies(langs)


if __name__ == "__main__":
    main()
