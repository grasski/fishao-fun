# 🐟 FISHAO – Encyklopedie a Klubové ryby

Moderní webová aplikace a interaktivní encyklopedie pro hráče rybářské hry FISHAO. Poskytuje přehled všech ryb ve hře, klubových cílů, sledování osobních úlovků a tržních cen.

---

## ✨ Přehled funkcí

- **Kompletní databáze**: 80 klubových ryb a všech 615 herních druhů s detailními informacemi (návnady, pruty, lokace, časy, rozměry).
- **Živý čas lovu**: Automatická detekce lokálního časového pásma uživatele s možností přepnutí na herní UTC čas a indikátorem „BERE TEĎ“.
- **Pokročilé vyhledávání a filtry**: Rychlé filtrování podle názvu, prostředí, vzácnosti, minimálního levelu a velikostního rozpětí (vhodné pro plnění misí).
- **Osobní sbírka úlovků**: Možnost označovat chycené ryby a sledovat procentuální postup ve sbírce.
- **Klubový postup**: Nastavení bodů klubu s vizuálním odlišením odemčených ryb a odpočtem bodů do dalších milníků.
- **Tržní ceny**: Evidence a přehled prodejních cen ryb na trhu včetně historie a statistik (v neděli zavřeno).
- **Komunita & Ryby Za domem**: Přehled všech hráčů, jejich klubů a úlovků. Možnost nastavit své odchované ryby za domem a zpětné zjištění, kteří hráči mají danou rybu k dispozici.
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
│   └── responsive.css  # Responzivní pravidla pro mobilní a tabletová zobrazení
├── js/                 # Modulární aplikační logika
│   ├── state.js        # Globální stav, lokalizační a datumové pomocné funkce, dialogy
│   ├── table.js        # Vykreslování tabulky ryb, časové kalkulace a správa úlovků
│   ├── clubs.js        # Reálná synchronizace klubu, správa členů, milníky a FC odemykání
│   ├── market.js       # Fish Market známé ceny, deduplikace, transakce a hromadný import
│   ├── firestore-tx.js # Obecné Firestore transakční pomocníky (bez znalosti kolekcí)
│   ├── filters.js      # Filtrování (hledání, vody, lokace, čas, velikosti, řazení)
│   ├── auth.js         # Firebase autentizace a GDPR-compliant synchronizace profilu
│   ├── players.js      # Komunita, ryby za domem, univerzální profil a reverzní vyhledávání
│   └── main.js         # Přepínání pohledů, hodiny, překlady, window.fishaoApp a start
├── firebase-config.js  # Konfigurace Firebase projektu
├── firestore.rules     # Bezpečnostní pravidla pro Firestore databázi
├── build_data.py       # Nástroj pro generování dat z herních zdrojů
├── data/
│   ├── i18n.js         # Jádro lokalizace a API pro překlady
│   ├── i18n/           # Modulární jazykové slovníky
│   │   ├── ui_cs.js    # České texty uživatelského rozhraní
│   │   ├── ui_en.js    # Anglické texty uživatelského rozhraní
│   │   ├── taxonomies.js # Překlady návnad, vod a lokací
│   │   └── fish_names.js # Překlady 615 názvů ryb (CZ / EN)
│   ├── fishes.js       # Databáze herních a klubových ryb
│   └── prices.js       # Výchozí tržní ceník
└── images/             # Ikony a náhledy ryb
```

---

## 🛠️ Použité technologie

- **Frontend**: HTML5, Moderní CSS3 (Flexbox/Grid, CSS proměnné), Vanilla JavaScript (ES6+ modularita)
- **Backend & Auth**: Google Firebase (Authentication & Cloud Firestore)
- **Data & Zpracování**: Python 3
