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
import re

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
    ("nl", "lang_nl.json"),
    ("ro", "lang_ro.json"),
    ("tr", "lang_tr.json"),
]

# Canonical bait category codes stored in data/fishes.js and filter <select>s
BAIT_CODES = [
    "insects", "vegetal", "fish", "dough", "lures", "meat", "shark", "hook",
    "monkfish", "monster", "pelican", "prehistoric", "star", "tuna", "barracuda", "marlin",
]

# Concise UI overrides where the raw game string (bait_category_*) is verbose,
# uses inconsistent casing, or was left untranslated in the raw game file
BAIT_OVERRIDES = {
    "insects": {"ro": "Insecte"},
    "vegetal": {"ro": "Vegetale"},
    "fish": {"ro": "Pește"},
    "dough": {"ro": "Aluat"},
    "lures": {"ro": "Năluci"},
    "hook": {"en": "Hooks", "ro": "Cârlige"},
    "meat": {"cs": "Maso", "ro": "Carne"},
    "shark": {"pl": "Przynęta rekinia", "ro": "Momeală rechin"},
    "monkfish": {"cs": "Ďasí", "en": "Monkfish", "ro": "Momeală pește-pescar"},
    "monster": {"ro": "Monstru"},
    "pelican": {"cs": "Šírotlamčí", "en": "Pelican", "ro": "Momeală pelican"},
    "prehistoric": {"ro": "Preistorică"},
    "star": {"cs": "Svítivčí", "en": "Star", "ro": "Momeală stea"},
    "tuna": {"cs": "Tuňáčí", "en": "Tuna", "ro": "Momeală ton"},
    "barracuda": {"cs": "Soltýní", "en": "Barracuda", "ro": "Momeală baracudă"},
    "marlin": {"cs": "Marlíní", "en": "Marlin", "ro": "Momeală marlin"},
}

LOCATION_OVERRIDES = {
    "location_11": {"en": "Palm Island", "ro": "Palm Island"},
    "location_101": {"ro": "Păstrăvărie"},
    "location_104": {"ro": "Piramidă"},
    "location_109": {"ro": "Peștera din copac"},
    "location_111": {"ro": "Peștera piraților"},
    "location_112": {"ro": "Zonă club"},
    "location_113": {"ro": "Fabrica de mobilă"},
    "location_201": {"ro": "Turneul Barcă pe mare"},
    "location_202": {"ro": "Turneul Lake Run"},
    "location_203": {"ro": "Turneul Cursă"},
    "location_204": {"ro": "Turneul Murenă"},
    "location_300": {"ro": "Curtea din spate"},
}

WATERS = {
    "salt": {
        "cs": "Slaná (vlevo)",
        "en": "Saltwater (left)",
        "pl": "Słona (po lewej)",
        "nl": "Zout water (links)",
        "ro": "Apă sărată (stânga)",
        "tr": "Tuzlu su (sol)",
    },
    "fresh": {
        "cs": "Sladká (vpravo)",
        "en": "Freshwater (right)",
        "pl": "Słodka (po prawej)",
        "nl": "Zoet water (rechts)",
        "ro": "Apă dulce (dreapta)",
        "tr": "Tatlı su (sağ)",
    },
    "unknown": {
        "cs": "Neznámá",
        "en": "Unknown",
        "pl": "Nieznana",
        "nl": "Onbekend",
        "ro": "Necunoscut",
        "tr": "Bilinmiyor",
    },
}

# Sub-location zones (EFPT_* codes in fish.places); not present in lang_*.json
EFPT_LOCATIONS = {
    "EFPT_LOST_VALLEY_POND_1": {
        "cs": "Údolí",
        "en": "Lower area",
        "pl": "Dolny obszar",
        "nl": "Lager gebied",
        "ro": "Zona de jos",
        "tr": "Alt bölge",
    },
    "EFPT_LOST_VALLEY_POND_2": {
        "cs": "U vodopádu",
        "en": "By the waterfall",
        "pl": "Przy wodospadzie",
        "nl": "Bij de waterval",
        "ro": "Lângă cascadă",
        "tr": "Şelale yanı",
    },
    "EFPT_SEAGULL_HARBOR_BOAT": {
        "cs": "Loď",
        "en": "Boat",
        "pl": "Łódź",
        "nl": "Boot",
        "ro": "Barcă",
        "tr": "Tekne",
    },
    "EFPT_PANHEIRA_BEACH_JETTY": {
        "cs": "Molo",
        "en": "Jetty",
        "pl": "Molo",
        "nl": "Steiger",
        "ro": "Dig",
        "tr": "İskele",
    },
    "EFPT_COOL_MOUNTAIN_RAFT": {
        "cs": "Vor",
        "en": "Raft",
        "pl": "Tratwa",
        "nl": "Vlot",
        "ro": "Plută",
        "tr": "Sal",
    },
    "EFPT_THOMBANI_TOWN_AFRICAN_LAKE": {
        "cs": "Africké jezero",
        "en": "African Lake",
        "pl": "Jezioro afrykańskie",
        "nl": "Afrikaans meer",
        "ro": "Lacul African",
        "tr": "Afrika Gölü",
    },
    "EFPT_CLUB_AREA_SALT": {
        "cs": "Slaná (vlevo)",
        "en": "Saltwater (left)",
        "pl": "Słona (po lewej)",
        "nl": "Zout water (links)",
        "ro": "Apă sărată (stânga)",
        "tr": "Tuzlu su (sol)",
    },
    "EFPT_CLUB_AREA_FRESH": {
        "cs": "Sladká (vpravo)",
        "en": "Freshwater (right)",
        "pl": "Słodka (po prawej)",
        "nl": "Zoet water (rechts)",
        "ro": "Apă dulce (dreapta)",
        "tr": "Tatlı su (sağ)",
    },
    "EFPT_PALM_ISLAND_ZONE_A": {
        "cs": "Vnější oblast",
        "en": "Outer area",
        "pl": "Obszar zewnętrzny",
        "nl": "Buitengebied",
        "ro": "Zona exterioară",
        "tr": "Dış bölge",
    },
    "EFPT_PALM_ISLAND_ZONE_B": {
        "cs": "Vlevo nahoře",
        "en": "Upper left",
        "pl": "U góry po lewej",
        "nl": "Linksboven",
        "ro": "Stânga sus",
        "tr": "Sol üst",
    },
    "EFPT_PALM_ISLAND_ZONE_C": {
        "cs": "Vpravo nahoře",
        "en": "Upper right",
        "pl": "U góry po prawej",
        "nl": "Rechtsboven",
        "ro": "Dreapta sus",
        "tr": "Sağ üst",
    },
    "EFPT_PALM_ISLAND_ZONE_D": {
        "cs": "Pod lodí",
        "en": "Under the boat",
        "pl": "Pod łodzią",
        "nl": "Onder de boot",
        "ro": "Sub barcă",
        "tr": "Tekne altı",
    },
    "EFPT_PALM_ISLAND_ZONE_E": {
        "cs": "Vnitřní oblast",
        "en": "Inner area",
        "pl": "Obszar wewnętrzny",
        "nl": "Binnengebied",
        "ro": "Zona interioară",
        "tr": "İç bölge",
    },
    "EFPT_PALM_ISLAND_ZONE_F": {
        "cs": "Vpravo od mostu",
        "en": "Right of the bridge",
        "pl": "Na prawo od mostu",
        "nl": "Rechts van de brug",
        "ro": "La dreapta podului",
        "tr": "Köprünün sağı",
    },
    "EFPT_PALM_ISLAND_ZONE_G": {
        "cs": "Dolní rohy",
        "en": "Lower corners",
        "pl": "Dolne rogi",
        "nl": "Onderste hoeken",
        "ro": "Colțurile de jos",
        "tr": "Alt köşeler",
    },
    "EFPT_PALM_ISLAND_ZONE_H": {
        "cs": "Malé ostrovy",
        "en": "Small islands",
        "pl": "Małe wyspy",
        "nl": "Kleine eilanden",
        "ro": "Insule mici",
        "tr": "Küçük adalar",
    },
}

CITIES = {
    "Prague": {"cs": "Praha", "pl": "Praga", "nl": "Praag", "ro": "Praga", "tr": "Prag"},
    "Vienna": {"cs": "Vídeň", "pl": "Wiedeń", "nl": "Wenen", "ro": "Viena", "tr": "Viyana"},
    "Bratislava": {"cs": "Bratislava", "pl": "Bratysława", "nl": "Bratislava", "ro": "Bratislava", "tr": "Bratislava"},
    "Warsaw": {"cs": "Varšava", "pl": "Warszawa", "nl": "Warschau", "ro": "Varșovia", "tr": "Varşova"},
    "Berlin": {"cs": "Berlín", "pl": "Berlin", "nl": "Berlijn", "ro": "Berlin", "tr": "Berlin"},
    "London": {"cs": "Londýn", "pl": "Londyn", "nl": "Londen", "ro": "Londra", "tr": "Londra"},
    "Paris": {"cs": "Paříž", "pl": "Paryż", "nl": "Parijs", "ro": "Paris", "tr": "Paris"},
    "Rome": {"cs": "Řím", "pl": "Rzym", "nl": "Rome", "ro": "Roma", "tr": "Roma"},
    "Budapest": {"cs": "Budapešť", "pl": "Budapeszt", "nl": "Boedapest", "ro": "Budapesta", "tr": "Budapeşte"},
    "Kiev": {"cs": "Kyjev", "pl": "Kijów", "nl": "Kiev", "ro": "Kiev", "tr": "Kiev"},
    "Kyiv": {"cs": "Kyjev", "pl": "Kijów", "nl": "Kiev", "ro": "Kiev", "tr": "Kiev"},
    "Vilnius": {"cs": "Vilnius", "pl": "Wilno", "nl": "Vilnius", "ro": "Vilnius", "tr": "Vilnius"},
    "Copenhagen": {"cs": "Kodaň", "pl": "Kopenhaga", "nl": "Kopenhagen", "ro": "Copenhaga", "tr": "Kopenhag"},
    "Brussels": {"cs": "Brusel", "pl": "Bruksela", "nl": "Brussel", "ro": "Bruxelles", "tr": "Brüksel"},
    "Zurich": {"cs": "Curych", "pl": "Zurych", "nl": "Zürich", "ro": "Zürich", "tr": "Zürih"},
    "Lisbon": {"cs": "Lisabon", "pl": "Lizbona", "nl": "Lissabon", "ro": "Lisabona", "tr": "Lizbon"},
    "Athens": {"cs": "Atény", "pl": "Ateny", "nl": "Athene", "ro": "Atena", "tr": "Atina"},
    "Belgrade": {"cs": "Bělehrad", "pl": "Belgrad", "nl": "Belgrado", "ro": "Belgrad", "tr": "Belgrad"},
    "Bucharest": {"cs": "Bukurešť", "pl": "Bukareszt", "nl": "Boekarest", "ro": "București", "tr": "Bükreş"},
    "Amsterdam": {"cs": "Amsterdam", "pl": "Amsterdam", "nl": "Amsterdam", "ro": "Amsterdam", "tr": "Amsterdam"},
    "Istanbul": {"cs": "Istanbul", "pl": "Stambuł", "nl": "Istanboel", "ro": "Istanbul", "tr": "İstanbul"},
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

    body = json.dumps(names, ensure_ascii=False, separators=(",", ":"))
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

    shop_items = {}
    shop_sources = [
        ("baits.json", "bait_", True),
        ("rods.json", "rod_", True),
        ("bobbers.json", "float_", True),
        ("resources.json", "resource_", True),
        ("decorations.json", "decoration_", False),
    ]
    for json_file, prefix, include_desc in shop_sources:
        raw_path = os.path.join(RAW_DIR, json_file)
        if not os.path.exists(raw_path):
            continue
        raw_obj = load_json(json_file)
        items = raw_obj.get("data", raw_obj)
        for item in items:
            iid = str(item["id"])
            keys_to_extract = [f"{prefix}{iid}"]
            if include_desc:
                keys_to_extract.append(f"{prefix}desc_{iid}")
            for tk in keys_to_extract:
                entry = {}
                for lang_code, data in langs:
                    val = (data.get(tk) or "").strip()
                    if val:
                        val = re.sub(r"##cm(\d+)#{1,2}", r"\1 cm", val)
                        val = val.replace("#amount#", "1")
                        entry[lang_code] = val
                if entry:
                    shop_items[tk] = entry

    collections_path = os.path.join(RAW_DIR, "decoration_collections.json")
    if os.path.exists(collections_path):
        col_raw = load_json("decoration_collections.json")
        for col in col_raw.get("data", col_raw):
            cid = str(col["id"])
            names = col.get("names")
            if isinstance(names, dict) and names:
                shop_items[f"collection_title_{cid}"] = dict(names)
            badges = col.get("badges")
            if isinstance(badges, dict) and badges:
                shop_items[f"collection_badge_{cid}"] = dict(badges)

    taxonomies = {
        "baits": baits,
        "waters": WATERS,
        "locations": locations,
        "cities": CITIES,
        "shop": shop_items,
    }

    body = json.dumps(taxonomies, ensure_ascii=False, separators=(",", ":"))
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
