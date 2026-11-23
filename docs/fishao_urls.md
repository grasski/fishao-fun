# FISHAO – Přehled nalezených URL


## 1. Herní datové JSON soubory (`https://play.fishao.net/data/`)

> **Poznámka:** Klient si za URL volitelně přidává parametr `?r=<náhodné_číslo>` kvůli obejití cache, ale všechny adresy fungují i přímo bez parametrů.

| Konstanta v klientu | URL adresa | Popis |
| :--- | :--- | :--- |
| `FISH_DATA_URL` | https://play.fishao.net/data/fish.json | Všechny ryby a podmínky lovu |
| `BAITS_DATA_URL` | https://play.fishao.net/data/baits.json | Návnady |
| `RODS_DATA_URL` | https://play.fishao.net/data/rods.json | Pruty |
| `EXTRA_FLOATS_DATA_URL` | https://play.fishao.net/data/bobbers.json | Splávky |
| `RESOURCES_DATA_URL` | https://play.fishao.net/data/resources.json | Herní zdroje a předměty |
| `FOSSILS_DATA_URL` | https://play.fishao.net/data/fossils.json | Fosilie |
| `FRUITS_DATA_URL` | https://play.fishao.net/data/fruits.json | Ovoce (Palm Island) |
| `CLOTHES_DATA_URL` | https://play.fishao.net/data/clothes.json | Oblečení |
| `LOOKS_DATA_URL` | https://play.fishao.net/data/looks.json | Vzhled postavy (účesy, obličej apod.) |
| `PRIVATE_HOUSE_INTERIOR_ITEM_DATA_URL` | https://play.fishao.net/data/private.house.interior.json | Nábytek a dekorace do domu |
| `COUNTRIES_URL` | https://play.fishao.net/data/countries.json | Seznam států |
| `TIMEZONES_URL` | https://play.fishao.net/data/timezones.json | Časová pásma |

---

## 2. Jazykové soubory / Překlady (`LANGUAGE_URL`)

- **Základní složka:** https://play.fishao.net/data/langs/
- **Vzor URL:** `https://play.fishao.net/data/langs/<kód>.json`

| Jazyk | Kód | URL adresa |
| :--- | :--- | :--- |
| Čeština | `cz` | https://play.fishao.net/data/langs/cz.json |
| Angličtina | `en` | https://play.fishao.net/data/langs/en.json |
| US Angličtina | `us` | https://play.fishao.net/data/langs/us.json |
| Polština | `pl` | https://play.fishao.net/data/langs/pl.json |
| Slovenština | `sk` | https://play.fishao.net/data/langs/sk.json |
| Němčina | `de` | https://play.fishao.net/data/langs/de.json |
| Brazilská portugalština | `br` | https://play.fishao.net/data/langs/br.json |
| Čínština | `cn` | https://play.fishao.net/data/langs/cn.json |
| Dánština | `dk` | https://play.fishao.net/data/langs/dk.json |
| Španělština | `es` | https://play.fishao.net/data/langs/es.json |
| Francouzština | `fr` | https://play.fishao.net/data/langs/fr.json |
| Italština | `it` | https://play.fishao.net/data/langs/it.json |
| Nizozemština | `nl` | https://play.fishao.net/data/langs/nl.json |
| Norština | `no` | https://play.fishao.net/data/langs/no.json |
| Portugalština | `pt` | https://play.fishao.net/data/langs/pt.json |
| Rumunština | `ro` | https://play.fishao.net/data/langs/ro.json |
| Srbština | `rs` | https://play.fishao.net/data/langs/rs.json |
| Ruština | `ru` | https://play.fishao.net/data/langs/ru.json |
| Švédština | `se` | https://play.fishao.net/data/langs/se.json |
| Turečtina | `tr` | https://play.fishao.net/data/langs/tr.json |
| Vietnamština | `vn` | https://play.fishao.net/data/langs/vn.json |

---

## 3. Obrázky a grafické assety (`IMAGE_DIR`)

- **Základní složka:** https://play.fishao.net/data/image/

| Kategorie | Vzor URL |
| :--- | :--- |
| Ryby (225 px) | `https://play.fishao.net/data/image/fishes/fish_225px_<id>.png` |
| Ryby (položka 255×85 px) | `https://play.fishao.net/data/image/fishes/fish255x85_<id>_item.png` |
| Ryby v inventáři (76×76 px) | `https://play.fishao.net/data/image/fishes/fish_inventory76x76_<id>.png` |
| Pruty (128×128 px) | `https://play.fishao.net/data/image/rods/rod_128x128_<id>.png` |
| Návnady (56×56 px) | `https://play.fishao.net/data/image/baits/bait_56x56_<id>.png` |
| Splávky (56×56 px) | `https://play.fishao.net/data/image/floats/float_56x56_<id>.png` |
| Zdroje / předměty (128×128 px) | `https://play.fishao.net/data/image/resources/resource_128x128_<id>.png` |
| Zdroje / předměty (56×56 px) | `https://play.fishao.net/data/image/resources/resource_56x56_<id>.png` |
| Fosilie (128×128 px) | `https://play.fishao.net/data/image/resources/fossils/128x128/resource_128x128_<id>.png` |
| Nábytek do domu (128×128 px) | `https://play.fishao.net/data/image/private_house/graphics_128x128_<id>.png` |
| Náhledy lokací | `https://play.fishao.net/data/image/locations/location_preview_<id>.png` |
| Klubové emblémy | `https://play.fishao.net/data/image/club_emblems/200/<id>.png` |


---

## 4. Dodatečné informace o rybách (ovocné kombinace, sbírky, atd)

- Reverse-engineered z oficiální wiki FISHAO stránky: https://www.fishao.net/wiki

Postup:
1. Otevři vývojářskou konzoli
2. Otevři oficiální wiki stránku
3. Dej vyhledat slovo "Kokos", mělo by to najít přesně jeden JS soubor
4. Hned v úvodu nalezeného souboru je JSON uložený jako text.

| Kategorie | Vzor URL |
| :--- | :--- |
| Požadavky k odemčení ryb | https://www.fishao.net/_app/immutable/chunks/DbvNqMD0.js |
