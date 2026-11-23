"""
FISHAO - Data Generator (build_data.py)
---------------------------------------
Parses raw game data (fish.json, lang_cz.json, fish-extra.json)
to generate structured JavaScript data files:
  - data/fishes.js (615 fishes; club metadata embedded via is_club)

fish-extra.json carries supplementary per-fish data keyed by a separate
0-based fishdex index, so its entries are joined to game fish by Czech
fish name.
"""

import json
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
RAW_DIR = os.path.join(DATA_DIR, "raw")
os.makedirs(DATA_DIR, exist_ok=True)

FISH_JSON = os.path.join(RAW_DIR, "fish.json")
LANG_JSON = os.path.join(RAW_DIR, "lang_cz.json")
FISH_EXTRA_JSON = os.path.join(RAW_DIR, "fish-extra.json")

print("-> Loading source data files...")
with open(FISH_JSON, "r", encoding="utf-8") as f:
    fish_raw = json.load(f)
fishes = fish_raw.get("data", fish_raw)

with open(LANG_JSON, "r", encoding="utf-8") as f:
    cz = json.load(f)

# Supplementary per-fish data from fish-extra.json, joined by Czech fish name.
# `fruitCombos` values (ordered Czech fruit names, e.g. "Kokos, Kokos,
# Pomeranč") are converted to ordered fruit IDs (fruit_1..fruit_9 in
# lang_cz.json) so the generated data stays language-neutral and translates
# via data/i18n/taxonomies.js.
print("-> Processing fish-extra.json supplementary data...")
with open(FISH_EXTRA_JSON, "r", encoding="utf-8") as f:
    fish_extra = json.load(f)

FRUIT_IDS = {cz[f"fruit_{i}"]: i for i in range(1, 10)}
fruit_recipe_by_name = {}
for extra_entry in fish_extra.values():
    combos = extra_entry.get("fruitCombos")
    if not combos:
        continue
    extra_name = extra_entry.get("name")
    recipe_str = combos.get("0", "")
    try:
        recipe = [FRUIT_IDS[w.strip()] for w in recipe_str.split(",") if w.strip()]
    except KeyError as e:
        raise SystemExit(f"ERROR: unknown fruit name {e} in fish-extra.json recipe for '{extra_name}'")
    if not extra_name or not recipe:
        raise SystemExit(f"ERROR: malformed fruitCombos entry in fish-extra.json: {extra_entry}")
    fruit_recipe_by_name[extra_name] = recipe
print(f"   {len(fruit_recipe_by_name)} fruit recipes loaded.")

# Supported specific fishing sub-locations (EFPT_* codes from catch_req.fishing_place).
# These are stored as stable identifiers in data/fishes.js and translated in
# data/i18n/taxonomies.js, so generated data stays language-neutral.
SUPPORTED_FISHING_PLACES = {
    'EFPT_LOST_VALLEY_POND_1',
    'EFPT_LOST_VALLEY_POND_2',
    'EFPT_SEAGULL_HARBOR_BOAT',
    'EFPT_PANHEIRA_BEACH_JETTY',
    'EFPT_COOL_MOUNTAIN_RAFT',
    'EFPT_THOMBANI_TOWN_AFRICAN_LAKE',
    'EFPT_CLUB_AREA_SALT',
    'EFPT_CLUB_AREA_FRESH',
    'EFPT_PALM_ISLAND_ZONE_A',
    'EFPT_PALM_ISLAND_ZONE_B',
    'EFPT_PALM_ISLAND_ZONE_C',
    'EFPT_PALM_ISLAND_ZONE_D',
    'EFPT_PALM_ISLAND_ZONE_E',
    'EFPT_PALM_ISLAND_ZONE_F',
    'EFPT_PALM_ISLAND_ZONE_G',
    'EFPT_PALM_ISLAND_ZONE_H',
}

def is_night_time_window(times):
    """Returns True if any catch time window touches night hours (20:00-05:00 UTC)."""
    if not times:
        return False
    for part in times:
        clean = part.strip()
        if '-' not in clean:
            continue
        s_str, e_str = clean.split('-', 1)
        sh, sm = [int(x) for x in s_str.split(':')]
        eh, em = [int(x) for x in e_str.split(':')]
        st = sh * 60 + sm
        et = eh * 60 + em
        if et == 0:
            et = 24 * 60
        if et <= st or st < 5 * 60 or et > 20 * 60:
            return True
    return False

# 1. Build club metadata (salt/fresh ordering, unlock type, order) for the 80 club fishes.
# The separate club array is no longer emitted; these fields are embedded in
# the matching allFishes entries below and clubFishes is derived in js/state.js.
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
        name = cz.get(f'fish_{fid}') or f.get('name') or f"Klubová ryba #{fid}"
        is_salt = 'EFPT_CLUB_AREA_SALT' in places

        rating_num = int(f.get('rating', 0))
        baits = req.get('bait_category', [])
        times = req.get('caught_time', [])
        dates = req.get('caught_date', [])

        unlock_type = 'points' if pts is not None else ('fc' if fc is not None else 'monster')

        all_club_raw.append({
            'id': fid,
            'name': name,
            'is_salt': is_salt,
            'rating': rating_num,
            'rarity_factor': float(f.get('rarity_factor', 1)),
            'baits': baits,
            'raw_times': times,
            'raw_dates': dates,
            'is_night': is_night_time_window(times),
            'min_l': int(f.get('min_length', 0)),
            'avg_l': int(f.get('avg_length', 0)),
            'max_l': int(f.get('max_length', 0)),
            'points': pts,
            'fc': fc,
            'unlock_type': unlock_type
        })

def club_sort_key(item):
    water_prio = 0 if item['is_salt'] else 1
    type_prio = 0 if item['unlock_type'] == 'points' else (1 if item['unlock_type'] == 'fc' else 2)
    val = item['points'] if item['points'] is not None else (item['fc'] if item['fc'] is not None else 999999)
    return (water_prio, type_prio, val)

all_club_raw.sort(key=club_sort_key)

club_data = []
order_salt = 1
order_fresh = 1
for item in all_club_raw:
    if item['is_salt']:
        item['order'] = order_salt
        order_salt += 1
    else:
        item['order'] = order_fresh
        order_fresh += 1
    club_data.append(item)

club_map = {item['id']: item for item in club_data}

# 2. Process all 615 fishes for encyclopedia
print("-> Processing all 615 encyclopedia fishes...")
all_fishes = []
matched_fruit_names = set()
for f in fishes:
    fid = int(f['id'])
    name = cz.get(f'fish_{fid}') or f.get('name') or f"Neznámá ryba #{fid}"
    req_raw = f.get('catch_req', '')
    req = json.loads(req_raw) if req_raw else {}
    rating_num = int(f.get('rating', 0))
    loc_ids = req.get('location_ids', [])
    loc_names = [f"location_{lid}" for lid in loc_ids]
    place_ids = [pid for pid in req.get('fishing_place', []) if pid in SUPPORTED_FISHING_PLACES]
    baits = req.get('bait_category', [])
    times = req.get('caught_time', [])
    dates = req.get('caught_date', [])

    club_info = club_map.get(fid)
    # Omit Czech `name` (hydrated from FISHAO_I18N_FISH_NAMES[id].cs in js/state.js)
    # and default empty/falsy attributes to cut bundle weight by ~40% while keeping identical runtime shape.
    fish_entry = {
        'id': fid,
        'rating': rating_num,
        'locations': loc_names,
        'baits': baits,
        'min_l': int(f.get('min_length', 0)),
        'avg_l': int(f.get('avg_length', 0)),
        'max_l': int(f.get('max_length', 0))
    }
    rf_val = float(f.get('rarity_factor', 1))
    if rf_val != 1.0:
        fish_entry['rarity_factor'] = rf_val
    if place_ids:
        fish_entry['places'] = place_ids
    if times:
        fish_entry['raw_times'] = times
    if dates:
        fish_entry['raw_dates'] = dates
    if req.get('fruit_combinations_done'):
        recipe = fruit_recipe_by_name.get(name)
        if not recipe:
            raise SystemExit(f"ERROR: fish {fid} ({name}) has fruit_combinations_done but no recipe in fish-extra.json")
        fish_entry['fruit_recipe'] = recipe
        matched_fruit_names.add(name)
    if is_night_time_window(times):
        fish_entry['is_night'] = True
    if club_info:
        fish_entry['is_club'] = True
        fish_entry['points'] = club_info.get('points')
        fish_entry['fc'] = club_info.get('fc')
        fish_entry['unlock_type'] = club_info.get('unlock_type')
        fish_entry['order'] = club_info.get('order')

    all_fishes.append(fish_entry)

unmatched_recipes = set(fruit_recipe_by_name) - matched_fruit_names
if unmatched_recipes:
    raise SystemExit(f"ERROR: fish-extra.json recipes without a fruit_combinations_done fish: {sorted(unmatched_recipes)}")
print(f"   {len(matched_fruit_names)} fruit recipes matched to fishes.")

# Write data/fishes.js
fishes_file = os.path.join(DATA_DIR, "fishes.js")
with open(fishes_file, "w", encoding="utf-8") as f:
    f.write("/**\n * FISHAO - Fish Database (auto-generated by build_data.py)\n */\n")
    f.write("window.FISHAO_DATA={allFishes:")
    f.write(json.dumps(all_fishes, ensure_ascii=False, separators=(",", ":")))
    f.write("};\n")

print(f"-> Done: Generated {len(all_fishes)} fishes ({len(club_data)} club fishes embedded via is_club).")
print(f"-> Saved to: {fishes_file}")
