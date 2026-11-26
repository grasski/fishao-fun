# 🐟 FISHAO Tracker – Wiki, Encyklopedie ryb, Fish Market & Kluby

🌐 **Živá aplikace:** [https://fishao-tracker.cz/](https://fishao-tracker.cz/) ([EN](https://fishao-tracker.cz/en/) • [PL](https://fishao-tracker.cz/pl/) • [NL](https://fishao-tracker.cz/nl/) • [RO](https://fishao-tracker.cz/ro/) • [TR](https://fishao-tracker.cz/tr/) • [Katalog 615 ryb](https://fishao-tracker.cz/ryby/))

**FISHAO Tracker** je moderní webová aplikace a interaktivní wiki/encyklopedie pro hráče rybářské hry FISHAO. Poskytuje přehled všech 615 ryb ve hře, klubových cílů, sledování osobních úlovků (včetně zářivých/shiny variant), denně synchronizovaný Fish Market ceník a komunitní přehled ryb za domem.

---

## ✨ Přehled funkcí

- **Kompletní databáze**: 80 klubových ryb a všech 615 herních druhů s detailními informacemi (návnady, pruty, lokace, časy, rozměry).
- **Živý čas lovu**: Automatická detekce lokálního časového pásma uživatele s možností přepnutí na herní UTC čas a indikátorem „BERE TEĎ“.
- **Pokročilé vyhledávání a filtry**: Rychlé filtrování podle názvu, prostředí, vzácnosti, minimálního levelu a velikostního rozpětí (vhodné pro plnění misí).
- **Doporučení nejvýhodnější návnady & řazení dle šance**: Automatický výpočet konkurence ostatních ryb v dané lokaci/podoblasti se zohledněním vzácnosti (`1★–5★` a `rarity_factor`), procentuálního podílu při záběru přímo v tabulce, rychlého přepínače **🎯 Nejvyšší šance** a podrobného rozboru konkurentů v detailu ryby.
- **Osobní sbírka úlovků**: Možnost označovat chycené ryby a sledovat procentuální postup ve sbírce. U každé ryby lze navíc označit zářivou (shiny) variantu, filtrovat chybějící zářivé ryby a sledovat jejich počet.
- **Klubový postup**: Nastavení bodů klubu s vizuálním odlišením odemčených ryb a odpočtem bodů do dalších milníků.
- **Tržní ceny**: Evidence a přehled prodejních cen ryb na trhu včetně historie a statistik (v neděli zavřeno).
- **Komunita & Ryby Za domem**: Přehled všech hráčů, jejich klubů a úlovků. Možnost nastavit své odchované ryby za domem a zpětné zjištění, kteří hráči mají danou rybu k dispozici.
- **Soukromý chat mezi hráči (1-on-1)**: Bezpečné zprávy mezi přihlášenými hráči na principu schválení žádosti (Double Opt-In), vyhledávání hráčů přímo v chatu, pouze prostý text do 300 znaků bez odkazů a příloh, 14denní automatická retence zpráv přes GitHub Actions a systém hlášení a moderace (Notice & Action).
- **Hybridní úložiště**: Plně funkční lokálně v prohlížeči (`localStorage`) s volitelnou synchronizací v reálném čase přes Firebase (Google přihlášení).

---

## 📁 Struktura projektu

```text
fishao/
├── index.html          # Uživatelské rozhraní aplikace
├── style.css           # Hlavní rozcestník stylů (@import svazek)
├── css/                # Modulární kaskádové styly (CSS)
│   ├── base.css        # CSS proměnné, resety, typografie a kontejner
│   ├── header.css      # Hlavička, logo, časovač, přepínače a uživatelský profil
│   ├── nav.css         # Hlavní navigace (záložky) a lišty akcí pro jednotlivé pohledy
│   ├── filters.css     # Vyhledávací a filtrační panel, posuvníky velikostí
│   ├── table.css       # Tabulka ryb, odznaky, ceny a tlačítka úlovků
│   ├── clubs.css       # Klubová sekce, statistiky, milníky a seznam členů
│   ├── players.css     # Komunita hráčů, karty uživatelů a dvorek (za domem)
│   ├── modals.css      # Modální okna (detail ryby, ceny, hromadný import, profil, toast)
│   ├── chat.css        # Soukromý 1-on-1 chat, vyhledávání hráčů a moderace
│   └── responsive.css  # Responzivní pravidla pro mobilní a tabletová zobrazení
├── js/                 # Modulární aplikační logika
│   ├── state.js        # Globální stav, lokalizační a datumové pomocné funkce, dialogy
│   ├── table.js        # Vykreslování tabulky ryb, časové kalkulace a správa úlovků
│   ├── clubs.js        # Reálná synchronizace klubu, správa členů, milníky a FC odemykání
│   ├── market.js       # Fish Market známé ceny, deduplikace, transakce a hromadný import
│   ├── firestore-tx.js # Obecné Firestore transakční pomocníky (bez znalosti kolekcí)
│   ├── filters.js      # Filtrování (hledání, lokace, konkrétní místa, čas, velikosti, řazení)
│   ├── auth.js         # Firebase autentizace a GDPR-compliant synchronizace profilu
│   ├── players.js      # Komunita, ryby za domem, univerzální profil a reverzní vyhledávání
│   ├── chat.js         # Soukromý 1-on-1 chat mezi hráči, žádosti, blokace a moderace
│   └── main.js         # Přepínání pohledů, hodiny, překlady, window.fishaoApp a start
├── firebase-config.js  # Konfigurace Firebase projektu
├── firestore.rules     # Bezpečnostní pravidla pro Firestore databázi
├── docs/               # Dokumentace a poznámky (např. fishao_urls.md)
├── scripts/            # Pomocné a automatizační skripty
│   ├── build_data.py   # Nástroj pro generování dat ryb z herních zdrojů
│   ├── build_i18n.py   # Nástroj pro generování překladů ryb z data/raw/lang_*.json
│   ├── sync-market-prices.mjs # Denní synchronizace cen ryb do Firestore
│   └── cleanup-chat.mjs # Denní úklid zpráv starších 14 dnů a osiřelých chatů (GitHub Actions)
├── data/
│   ├── raw/            # Surová herní JSON data (fish.json, lang_*.json)
│   ├── i18n.js         # Jádro lokalizace (CZ / EN / PL, fallbacky, plurály)
│   ├── i18n/           # Modulární jazykové slovníky
│   │   ├── ui_cs.js    # České texty uživatelského rozhraní
│   │   ├── ui_en.js    # Anglické texty uživatelského rozhraní
│   │   ├── ui_pl.js    # Polské texty uživatelského rozhraní
│   │   ├── taxonomies.js # Překlady návnad, vod, lokací a měst
│   │   └── fish_names.js # Překlady 615 názvů ryb (CZ / EN / PL)
│   ├── fishes.js       # Databáze herních a klubových ryb
│   └── prices.js       # Výchozí tržní ceník
└── images/             # Ikony a náhledy ryb
```

---

## 🛠️ Použité technologie

- **Frontend**: HTML5, Moderní CSS3 (Flexbox/Grid, CSS proměnné), Vanilla JavaScript (ES6+ modularita)
- **Backend & Auth**: Google Firebase (Authentication & Cloud Firestore)
- **Data & Zpracování**: Python 3
