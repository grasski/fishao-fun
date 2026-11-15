/**
 * FISHAO - Game Taxonomies Translations (Baits, Waters, Locations, Cities)
 * Each entry maps a data value (Czech name, EN alias, location_<id> or EFPT_* id)
 * to its { cs, en, pl } labels. Missing languages fall back via data/i18n.js.
 * Polish bait and location names come from the official lang_pl.json
 * (bait_category_*, location_*); EFPT sub-areas are hand-translated.
 * Cities: timezone city names (Intl tz database, English) -> localized label;
 * English uses the raw name, so cities have no "en" column.
 */
(function () {
  'use strict';

  var taxonomies = {
    baits: {
    "Hmyz": {
        "cs": "Hmyz",
        "en": "Insects",
        "pl": "Insekty"
    },
    "Insects": {
        "cs": "Hmyz",
        "en": "Insects",
        "pl": "Insekty"
    },
    "Háčky": {
        "cs": "Háčky",
        "en": "Hooks",
        "pl": "Haczyk"
    },
    "Hooks": {
        "cs": "Háčky",
        "en": "Hooks",
        "pl": "Haczyk"
    },
    "Marlíní": {
        "cs": "Marlíní",
        "en": "Marlin",
        "pl": "Przynęta na marlina"
    },
    "Marlin": {
        "cs": "Marlíní",
        "en": "Marlin",
        "pl": "Przynęta na marlina"
    },
    "Maso": {
        "cs": "Maso",
        "en": "Meat",
        "pl": "Mięso"
    },
    "Meat": {
        "cs": "Maso",
        "en": "Meat",
        "pl": "Mięso"
    },
    "Monstrum": {
        "cs": "Monstrum",
        "en": "Monster",
        "pl": "Potwór"
    },
    "Monster": {
        "cs": "Monstrum",
        "en": "Monster",
        "pl": "Potwór"
    },
    "Prehistorické": {
        "cs": "Prehistorické",
        "en": "Prehistoric",
        "pl": "Prehistoryczna"
    },
    "Prehistoric": {
        "cs": "Prehistorické",
        "en": "Prehistoric",
        "pl": "Prehistoryczna"
    },
    "Nástrahy": {
        "cs": "Nástrahy",
        "en": "Lures",
        "pl": "Przynęty"
    },
    "Lures": {
        "cs": "Nástrahy",
        "en": "Lures",
        "pl": "Przynęty"
    },
    "Rostlinné": {
        "cs": "Rostlinné",
        "en": "Vegetal",
        "pl": "Rośliny"
    },
    "Vegetal": {
        "cs": "Rostlinné",
        "en": "Vegetal",
        "pl": "Rośliny"
    },
    "Ryby": {
        "cs": "Ryby",
        "en": "Fish",
        "pl": "Ryba"
    },
    "Fish": {
        "cs": "Ryby",
        "en": "Fish",
        "pl": "Ryba"
    },
    "Soltýní": {
        "cs": "Soltýní",
        "en": "Barracuda",
        "pl": "Przynęta na barracudę"
    },
    "Barracuda": {
        "cs": "Soltýní",
        "en": "Barracuda",
        "pl": "Przynęta na barracudę"
    },
    "Svítivčí": {
        "cs": "Svítivčí",
        "en": "Star",
        "pl": "Gwiezdna przynęta"
    },
    "Star": {
        "cs": "Svítivčí",
        "en": "Star",
        "pl": "Gwiezdna przynęta"
    },
    "Tuňáčí": {
        "cs": "Tuňáčí",
        "en": "Tuna",
        "pl": "Przynęta na tuńczyka"
    },
    "Tuna": {
        "cs": "Tuňáčí",
        "en": "Tuna",
        "pl": "Przynęta na tuńczyka"
    },
    "Těsta": {
        "cs": "Těsta",
        "en": "Dough",
        "pl": "Chleb"
    },
    "Dough": {
        "cs": "Těsta",
        "en": "Dough",
        "pl": "Chleb"
    },
    "Ďasí": {
        "cs": "Ďasí",
        "en": "Monkfish",
        "pl": "Przynęta na lophiusa"
    },
    "Monkfish": {
        "cs": "Ďasí",
        "en": "Monkfish",
        "pl": "Przynęta na lophiusa"
    },
    "Šírotlamčí": {
        "cs": "Šírotlamčí",
        "en": "Pelican",
        "pl": "Przynęta pelikańska"
    },
    "Pelican": {
        "cs": "Šírotlamčí",
        "en": "Pelican",
        "pl": "Przynęta pelikańska"
    },
    "Žraločí": {
        "cs": "Žraločí",
        "en": "Shark Bait",
        "pl": "Przynęta rekinia"
    },
    "Shark Bait": {
        "cs": "Žraločí",
        "en": "Shark Bait",
        "pl": "Przynęta rekinia"
    }
},
    waters: {
    "Slaná": {
        "cs": "Slaná (vlevo)",
        "en": "Saltwater (left)",
        "pl": "Słona (po lewej)"
    },
    "Sladká": {
        "cs": "Sladká (vpravo)",
        "en": "Freshwater (right)",
        "pl": "Słodka (po prawej)"
    },
    "Neznámá": {
        "cs": "Neznámá",
        "en": "Unknown",
        "pl": "Nieznana"
    },
    "Saltwater": {
        "cs": "Slaná (vlevo)",
        "en": "Saltwater (left)",
        "pl": "Słona (po lewej)"
    },
    "Freshwater": {
        "cs": "Sladká (vpravo)",
        "en": "Freshwater (right)",
        "pl": "Słodka (po prawej)"
    }
},
    locations: {
    "Laketown": {
        "cs": "Laketown",
        "en": "Laketown",
        "pl": "Laketown"
    },
    "location_1": {
        "cs": "Laketown",
        "en": "Laketown",
        "pl": "Laketown"
    },
    "Marshville": {
        "cs": "Marshville",
        "en": "Marshville",
        "pl": "Marshville"
    },
    "location_10": {
        "cs": "Marshville",
        "en": "Marshville",
        "pl": "Marshville"
    },
    "Pstruží farma": {
        "cs": "Pstruží farma",
        "en": "Trout Farm",
        "pl": "Hodowla Pstrągów"
    },
    "Trout Farm": {
        "cs": "Pstruží farma",
        "en": "Trout Farm",
        "pl": "Hodowla Pstrągów"
    },
    "location_101": {
        "cs": "Pstruží farma",
        "en": "Trout Farm",
        "pl": "Hodowla Pstrągów"
    },
    "Pyramida": {
        "cs": "Pyramida",
        "en": "Pyramid",
        "pl": "Piramida"
    },
    "Pyramid": {
        "cs": "Pyramida",
        "en": "Pyramid",
        "pl": "Piramida"
    },
    "location_104": {
        "cs": "Pyramida",
        "en": "Pyramid",
        "pl": "Piramida"
    },
    "Lost Valley": {
        "cs": "Lost Valley",
        "en": "Lost Valley",
        "pl": "Zaginiona Dolina"
    },
    "location_108": {
        "cs": "Lost Valley",
        "en": "Lost Valley",
        "pl": "Zaginiona Dolina"
    },
    "Tree Cave": {
        "cs": "Tree Cave",
        "en": "Tree Cave",
        "pl": "Dziupla"
    },
    "location_109": {
        "cs": "Tree Cave",
        "en": "Tree Cave",
        "pl": "Dziupla"
    },
    "Palm Island": {
        "cs": "Palm Island",
        "en": "Palm Island",
        "pl": "Palmowa Wyspa"
    },
    "Palm island": {
        "cs": "Palm Island",
        "en": "Palm Island",
        "pl": "Palmowa Wyspa"
    },
    "location_11": {
        "cs": "Palm Island",
        "en": "Palm Island",
        "pl": "Palmowa Wyspa"
    },
    "Little Rio": {
        "cs": "Little Rio",
        "en": "Little Rio",
        "pl": "Małe Rio"
    },
    "location_110": {
        "cs": "Little Rio",
        "en": "Little Rio",
        "pl": "Małe Rio"
    },
    "Pirate Cave": {
        "cs": "Pirate Cave",
        "en": "Pirate Cave",
        "pl": "Grota piratów"
    },
    "location_111": {
        "cs": "Pirate Cave",
        "en": "Pirate Cave",
        "pl": "Grota piratów"
    },
    "Klubový revír": {
        "cs": "Klubový revír",
        "en": "Club area",
        "pl": "Teren klubu"
    },
    "Club area": {
        "cs": "Klubový revír",
        "en": "Club area",
        "pl": "Teren klubu"
    },
    "location_112": {
        "cs": "Klubový revír",
        "en": "Club area",
        "pl": "Teren klubu"
    },
    "Továrna na nábytek": {
        "cs": "Továrna na nábytek",
        "en": "Furniture Factory",
        "pl": "Fabryka mebli"
    },
    "Furniture Factory": {
        "cs": "Továrna na nábytek",
        "en": "Furniture Factory",
        "pl": "Fabryka mebli"
    },
    "location_113": {
        "cs": "Továrna na nábytek",
        "en": "Furniture Factory",
        "pl": "Fabryka mebli"
    },
    "Lucky Raft": {
        "cs": "Lucky Raft",
        "en": "Lucky Raft",
        "pl": "Szczęśliwa Tratwa"
    },
    "location_12": {
        "cs": "Lucky Raft",
        "en": "Lucky Raft",
        "pl": "Szczęśliwa Tratwa"
    },
    "Rio Tropical": {
        "cs": "Rio Tropical",
        "en": "Rio Tropical",
        "pl": "Tropikalne Rio"
    },
    "location_2": {
        "cs": "Rio Tropical",
        "en": "Rio Tropical",
        "pl": "Tropikalne Rio"
    },
    "Turnaj Boat On Sea": {
        "cs": "Turnaj Boat On Sea",
        "en": "Boat On Sea tournament",
        "pl": "Turniej Łódź na morzu"
    },
    "Boat On Sea tournament": {
        "cs": "Turnaj Boat On Sea",
        "en": "Boat On Sea tournament",
        "pl": "Turniej Łódź na morzu"
    },
    "location_201": {
        "cs": "Turnaj Boat On Sea",
        "en": "Boat On Sea tournament",
        "pl": "Turniej Łódź na morzu"
    },
    "Turnaj Lake Run": {
        "cs": "Turnaj Lake Run",
        "en": "Lake Run tournament",
        "pl": "Turniej Lake Run"
    },
    "Lake Run tournament": {
        "cs": "Turnaj Lake Run",
        "en": "Lake Run tournament",
        "pl": "Turniej Lake Run"
    },
    "location_202": {
        "cs": "Turnaj Lake Run",
        "en": "Lake Run tournament",
        "pl": "Turniej Lake Run"
    },
    "Turnaj Race": {
        "cs": "Turnaj Race",
        "en": "Race tournament",
        "pl": "Wyścig"
    },
    "Race tournament": {
        "cs": "Turnaj Race",
        "en": "Race tournament",
        "pl": "Wyścig"
    },
    "location_203": {
        "cs": "Turnaj Race",
        "en": "Race tournament",
        "pl": "Wyścig"
    },
    "Turnaj Moray": {
        "cs": "Turnaj Moray",
        "en": "Moray tournament",
        "pl": "Turniej mureny"
    },
    "Moray tournament": {
        "cs": "Turnaj Moray",
        "en": "Moray tournament",
        "pl": "Turniej mureny"
    },
    "location_204": {
        "cs": "Turnaj Moray",
        "en": "Moray tournament",
        "pl": "Turniej mureny"
    },
    "Pinheira Beach": {
        "cs": "Pinheira Beach",
        "en": "Pinheira Beach",
        "pl": "Plaża Pinheira"
    },
    "location_3": {
        "cs": "Pinheira Beach",
        "en": "Pinheira Beach",
        "pl": "Plaża Pinheira"
    },
    "Za domem": {
        "cs": "Za domem",
        "en": "Home backyard",
        "pl": "Domowe podwórko"
    },
    "Home backyard": {
        "cs": "Za domem",
        "en": "Home backyard",
        "pl": "Domowe podwórko"
    },
    "location_300": {
        "cs": "Za domem",
        "en": "Home backyard",
        "pl": "Domowe podwórko"
    },
    "Cool Mountain": {
        "cs": "Cool Mountain",
        "en": "Cool Mountain",
        "pl": "Fajnogóra"
    },
    "location_4": {
        "cs": "Cool Mountain",
        "en": "Cool Mountain",
        "pl": "Fajnogóra"
    },
    "Mystic Desert": {
        "cs": "Mystic Desert",
        "en": "Mystic Desert",
        "pl": "Mistyczna Pustynia"
    },
    "location_5": {
        "cs": "Mystic Desert",
        "en": "Mystic Desert",
        "pl": "Mistyczna Pustynia"
    },
    "Sibiri City": {
        "cs": "Sibiri City",
        "en": "Sibiri City",
        "pl": "Miasto Sibiri"
    },
    "location_6": {
        "cs": "Sibiri City",
        "en": "Sibiri City",
        "pl": "Miasto Sibiri"
    },
    "Aquayama": {
        "cs": "Aquayama",
        "en": "Aquayama",
        "pl": "Akwajama"
    },
    "location_7": {
        "cs": "Aquayama",
        "en": "Aquayama",
        "pl": "Akwajama"
    },
    "Seagull Harbor": {
        "cs": "Seagull Harbor",
        "en": "Seagull Harbor",
        "pl": "Mewi Port"
    },
    "location_8": {
        "cs": "Seagull Harbor",
        "en": "Seagull Harbor",
        "pl": "Mewi Port"
    },
    "Thombani Town": {
        "cs": "Thombani Town",
        "en": "Thombani Town",
        "pl": "Miasto Thombani"
    },
    "location_9": {
        "cs": "Thombani Town",
        "en": "Thombani Town",
        "pl": "Miasto Thombani"
    },
    "EFPT_LOST_VALLEY_POND_1": {
        "cs": "Údolí",
        "en": "Lower area",
        "pl": "Dolny obszar"
    },
    "EFPT_LOST_VALLEY_POND_2": {
        "cs": "U vodopádu",
        "en": "By the waterfall",
        "pl": "Przy wodospadzie"
    },
    "EFPT_SEAGULL_HARBOR_BOAT": {
        "cs": "Loď",
        "en": "Boat",
        "pl": "Łódź"
    },
    "EFPT_PANHEIRA_BEACH_JETTY": {
        "cs": "Molo",
        "en": "Jetty",
        "pl": "Molo"
    },
    "EFPT_COOL_MOUNTAIN_RAFT": {
        "cs": "Vor",
        "en": "Raft",
        "pl": "Tratwa"
    },
    "EFPT_THOMBANI_TOWN_AFRICAN_LAKE": {
        "cs": "Africké jezero",
        "en": "African Lake",
        "pl": "Jezioro afrykańskie"
    },
    "EFPT_CLUB_AREA_SALT": {
        "cs": "Slaná (vlevo)",
        "en": "Saltwater (left)",
        "pl": "Słona (po lewej)"
    },
    "EFPT_CLUB_AREA_FRESH": {
        "cs": "Sladká (vpravo)",
        "en": "Freshwater (right)",
        "pl": "Słodka (po prawej)"
    },
    "EFPT_PALM_ISLAND_ZONE_A": {
        "cs": "Vnější oblast",
        "en": "Outer area",
        "pl": "Obszar zewnętrzny"
    },
    "EFPT_PALM_ISLAND_ZONE_B": {
        "cs": "Vlevo nahoře",
        "en": "Upper left",
        "pl": "U góry po lewej"
    },
    "EFPT_PALM_ISLAND_ZONE_C": {
        "cs": "Vpravo nahoře",
        "en": "Upper right",
        "pl": "U góry po prawej"
    },
    "EFPT_PALM_ISLAND_ZONE_D": {
        "cs": "Pod lodí",
        "en": "Under the boat",
        "pl": "Pod łodzią"
    },
    "EFPT_PALM_ISLAND_ZONE_E": {
        "cs": "Vnitřní oblast",
        "en": "Inner area",
        "pl": "Obszar wewnętrzny"
    },
    "EFPT_PALM_ISLAND_ZONE_F": {
        "cs": "Vpravo od mostu",
        "en": "Right of the bridge",
        "pl": "Na prawo od mostu"
    },
    "EFPT_PALM_ISLAND_ZONE_G": {
        "cs": "Dolní rohy",
        "en": "Lower corners",
        "pl": "Dolne rogi"
    },
    "EFPT_PALM_ISLAND_ZONE_H": {
        "cs": "Malé ostrovy",
        "en": "Small islands",
        "pl": "Małe wyspy"
    }
},
    cities: {
    "Prague": {
        "cs": "Praha",
        "pl": "Praga"
    },
    "Vienna": {
        "cs": "Vídeň",
        "pl": "Wiedeń"
    },
    "Bratislava": {
        "cs": "Bratislava",
        "pl": "Bratysława"
    },
    "Warsaw": {
        "cs": "Varšava",
        "pl": "Warszawa"
    },
    "Berlin": {
        "cs": "Berlín",
        "pl": "Berlin"
    },
    "London": {
        "cs": "Londýn",
        "pl": "Londyn"
    },
    "Paris": {
        "cs": "Paříž",
        "pl": "Paryż"
    },
    "Rome": {
        "cs": "Řím",
        "pl": "Rzym"
    },
    "Budapest": {
        "cs": "Budapešť",
        "pl": "Budapeszt"
    },
    "Kiev": {
        "cs": "Kyjev",
        "pl": "Kijów"
    },
    "Kyiv": {
        "cs": "Kyjev",
        "pl": "Kijów"
    },
    "Vilnius": {
        "cs": "Vilnius",
        "pl": "Wilno"
    },
    "Copenhagen": {
        "cs": "Kodaň",
        "pl": "Kopenhaga"
    },
    "Brussels": {
        "cs": "Brusel",
        "pl": "Bruksela"
    },
    "Zurich": {
        "cs": "Curych",
        "pl": "Zurych"
    },
    "Lisbon": {
        "cs": "Lisabon",
        "pl": "Lizbona"
    },
    "Athens": {
        "cs": "Atény",
        "pl": "Ateny"
    },
    "Belgrade": {
        "cs": "Bělehrad",
        "pl": "Belgrad"
    },
    "Bucharest": {
        "cs": "Bukurešť",
        "pl": "Bukareszt"
    }
}
  };

  if (typeof window !== 'undefined') {
    window.FISHAO_I18N_TAXONOMIES = taxonomies;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = taxonomies;
  }
})();
