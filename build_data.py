"""
FISHAO - Data Generator (build_data.py)
---------------------------------------
Parses raw game data (fish.json, lang_cz.json) and prices_history.json
to generate structured JavaScript data files:
  - data/fishes.js (80 club fishes + 615 all fishes)
  - data/prices.js (default market prices history)
"""

import json
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
os.makedirs(DATA_DIR, exist_ok=True)

FISH_JSON = os.path.join(BASE_DIR, "fish.json")
LANG_JSON = os.path.join(BASE_DIR, "lang_cz.json")
PRICES_JSON = os.path.join(BASE_DIR, "prices_history.json")

print("-> Loading source data files...")
with open(FISH_JSON, "r", encoding="utf-8") as f:
    fish_raw = json.load(f)
fishes = fish_raw.get("data", fish_raw)

with open(LANG_JSON, "r", encoding="utf-8") as f:
    cz = json.load(f)

default_prices = {}
if os.path.exists(PRICES_JSON):
    with open(PRICES_JSON, "r", encoding="utf-8") as f:
        default_prices = json.load(f)

# Game location names resolver using official localization (lang_cz.json)
def get_location_name(lid):
    loc_key = f"location_{lid}"
    if loc_key in cz and cz[loc_key]:
        return cz[loc_key]
    fallback_map = {
        1: 'Laketown', 2: 'Rio Tropical', 3: 'Pinheira Beach', 4: 'Cool Mountain',
        5: 'Mystic Desert', 6: 'Sibiri City', 7: 'Aquayama', 8: 'Seagull Harbor',
        9: 'Thombani Town', 10: 'Marshville', 11: 'Palm Island', 12: 'Lucky Raft',
        101: 'Pstruží farma', 104: 'Pyramida', 108: 'Lost Valley', 110: 'Little Rio',
        111: 'Pirate Cave', 112: 'Klubový revír', 113: 'Továrna na nábytek',
        201: 'Turnaj Boat On Sea', 202: 'Turnaj Lake Run', 203: 'Turnaj Race',
        204: 'Turnaj Moray', 300: 'Za domem'
    }
    return fallback_map.get(lid, f"Lokace {lid}")

# Bait category translations
bait_translations = {
    'dough': 'Těsta',
    'fish': 'Ryby',
    'hook': 'Háčky',
    'insects': 'Hmyz',
    'lures': 'Přívlač/Nástrahy',
    'meat': 'Maso',
    'shark': 'Žraločí',
    'vegetal': 'Rostlinné',
    'monkfish': 'Ďasí',
    'monster': 'Monstrum',
    'pelican': 'Šírotlamčí',
    'prehistoric': 'Prehistorické',
    'star': 'Svítivčí',
    'tuna': 'Tuňáčí',
    'barracuda': 'Soltýní',
    'marlin': 'Marlíní'
}

# 1. Process 80 club fishes
print("-> Processing club fishes...")
all_club_raw = []
for f in fishes:
    req_raw = f.get('catch_req', '')
    req = json.loads(req_raw) if req_raw else {}
    places = req.get('fishing_place', [])
    locs = req.get('location_ids', [])
    pts = req.get('club_points')
    fc = req.get('club_unlock_by_fishcoins')

    if 'EFPT_CLUB_AREA_SALT' in places or 'EFPT_CLUB_AREA_FRESH' in places or 112 in locs:
        fid = int(f['id'])
        name = cz.get(f'fish_{fid}', f"Klubová ryba #{fid}")
        water = 'Slaná' if 'EFPT_CLUB_AREA_SALT' in places else ('Sladká' if 'EFPT_CLUB_AREA_FRESH' in places else 'Neznámá')

        rating_num = int(f.get('rating', 0))
        baits = req.get('bait_category', [])
        baits_cz = [bait_translations.get(b, b) for b in baits]
        times = req.get('caught_time', [])
        times_str = ", ".join(times) if times else "Celý den"
        dates = req.get('caught_date', [])

        unlock_type = 'points' if pts is not None else ('fc' if fc is not None else 'monster')

        all_club_raw.append({
            'id': fid,
            'name': name,
            'water': water,
            'rating': rating_num,
            'baits': baits_cz,
            'time': times_str,
            'raw_times': times,
            'raw_dates': dates,
            'is_night': bool(times),
            'min_l': int(f.get('min_length', 0)),
            'avg_l': int(f.get('avg_length', 0)),
            'max_l': int(f.get('max_length', 0)),
            'points': pts,
            'fc': fc,
            'unlock_type': unlock_type
        })

def club_sort_key(item):
    water_prio = 0 if item['water'] == 'Slaná' else 1
    type_prio = 0 if item['unlock_type'] == 'points' else (1 if item['unlock_type'] == 'fc' else 2)
    val = item['points'] if item['points'] is not None else (item['fc'] if item['fc'] is not None else 999999)
    return (water_prio, type_prio, val)

all_club_raw.sort(key=club_sort_key)

club_data = []
order_salt = 1
order_fresh = 1
for item in all_club_raw:
    if item['water'] == 'Slaná':
        item['order'] = order_salt
        order_salt += 1
    else:
        item['order'] = order_fresh
        order_fresh += 1
    club_data.append(item)

club_ids_set = {item['id'] for item in club_data}
club_map = {item['id']: item for item in club_data}

# 2. Process all 615 fishes for encyclopedia
print("-> Processing all 615 encyclopedia fishes...")
all_fishes = []
for f in fishes:
    fid = int(f['id'])
    name = cz.get(f'fish_{fid}', f"Neznámá ryba #{fid}")
    req_raw = f.get('catch_req', '')
    req = json.loads(req_raw) if req_raw else {}
    rating_num = int(f.get('rating', 0))
    loc_ids = req.get('location_ids', [])
    loc_names = [get_location_name(lid) for lid in loc_ids]
    baits = req.get('bait_category', [])
    baits_cz = [bait_translations.get(b, b) for b in baits]
    times = req.get('caught_time', [])
    times_str = ", ".join(times) if times else "Celý den"
    dates = req.get('caught_date', [])

    club_info = club_map.get(fid)
    fish_entry = {
        'id': fid,
        'name': name,
        'is_club': bool(club_info),
        'rating': rating_num,
        'locations': loc_names,
        'baits': baits_cz,
        'time': times_str,
        'raw_times': times,
        'raw_dates': dates,
        'is_night': bool(times),
        'min_l': int(f.get('min_length', 0)),
        'avg_l': int(f.get('avg_length', 0)),
        'max_l': int(f.get('max_length', 0))
    }
    if club_info:
        fish_entry['water'] = club_info.get('water')
        fish_entry['points'] = club_info.get('points')
        fish_entry['fc'] = club_info.get('fc')
        fish_entry['unlock_type'] = club_info.get('unlock_type')
        fish_entry['order'] = club_info.get('order')

    all_fishes.append(fish_entry)

# Write data/fishes.js
fishes_file = os.path.join(DATA_DIR, "fishes.js")
with open(fishes_file, "w", encoding="utf-8") as f:
    f.write("/**\n * FISHAO - Fish Database (auto-generated by build_data.py)\n */\n")
    f.write("window.FISHAO_DATA = {\n")
    f.write(f"  clubFishes: {json.dumps(club_data, ensure_ascii=False, indent=2)},\n")
    f.write(f"  allFishes: {json.dumps(all_fishes, ensure_ascii=False, indent=2)}\n")
    f.write("};\n")

# Write data/prices.js
prices_file = os.path.join(DATA_DIR, "prices.js")
with open(prices_file, "w", encoding="utf-8") as f:
    f.write("/**\n * FISHAO - Default Market Prices History\n */\n")
    f.write(f"window.FISHAO_DEFAULT_PRICES = {json.dumps(default_prices, ensure_ascii=False, indent=2)};\n")

print(f"-> Done: Generated {len(club_data)} club fishes and {len(all_fishes)} all fishes.")
print(f"-> Saved to: {fishes_file} and {prices_file}")
