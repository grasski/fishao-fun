# 🐟 FISHAO – Encyklopedie a Klubové ryby

Moderní webová aplikace a interaktivní encyklopedie pro hráče rybářské hry FISHAO. Poskytuje přehled všech ryb ve hře, klubových cílů, sledování osobních úlovků a tržních cen.

---

## ✨ Přehled funkcí

- **Kompletní databáze**: 80 klubových ryb a všech 615 herních druhů s detailními informacemi (návnady, pruty, lokace, časy, rozměry).
- **Živý čas lovu**: Automatická detekce lokálního časového pásma uživatele s možností přepnutí na herní UTC čas a indikátorem „BERE TEĎ“.
- **Pokročilé vyhledávání a filtry**: Rychlé filtrování podle názvu, prostředí, vzácnosti, minimálního levelu a velikostního rozpětí (vhodné pro plnění misí).
- **Osobní sbírka úlovků**: Možnost označovat chycené ryby a sledovat procentuální postup ve sbírce.
- **Klubový postup**: Nastavení bodů klubu s vizuálním odlišením odemčených ryb a odpočtem bodů do dalších milníků.
- **Tržní ceny**: Evidence a přehled prodejních cen ryb na trhu včetně historie a statistik.
- **Hybridní úložiště**: Plně funkční lokálně v prohlížeči (`localStorage`) s volitelnou synchronizací v reálném čase přes Firebase (Google přihlášení).

---

## 📁 Struktura projektu

```text
fishao/
├── index.html          # Uživatelské rozhraní aplikace
├── style.css           # Vizuální styl a responzivní rozvržení
├── app.js              # Aplikační logika, filtry, stav a synchronizace
├── firebase-config.js  # Konfigurace Firebase projektu
├── firestore.rules     # Bezpečnostní pravidla pro Firestore databázi
├── build_data.py       # Nástroj pro generování dat z herních zdrojů
├── data/
│   ├── fishes.js       # Databáze herních a klubových ryb
│   └── prices.js       # Výchozí tržní ceník
└── images/             # Ikony a náhledy ryb
```

---

## 🛠️ Použité technologie

- **Frontend**: HTML5, Moderní CSS3 (Flexbox/Grid, CSS proměnné), Vanilla JavaScript (ES6+ modularita)
- **Backend & Auth**: Google Firebase (Authentication & Cloud Firestore)
- **Data & Zpracování**: Python 3
