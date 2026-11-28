#!/usr/bin/env python3
"""
FISHAO - Production Bundle & Static SEO Builder (scripts/build_dist.py)
-----------------------------------------------------------------------
Concatenates and minifies modular CSS and JS files into hashed bundles
under dist/, writes version.json, generates localized index pages
(/index.html, /en/index.html, /pl/index.html), pre-renders the first
20 fish rows into the initial HTML for instant LCP and SEO indexing,
generates static multilingual fish wiki pages (/ryba/<id>-<slug>/,
/en/fish/<id>-<slug>/, /pl/ryba/<id>-<slug>/) + index catalogs
(/ryby/, /en/fish/, /pl/ryby/), and builds a complete sitemap.xml.

Usage:
  python scripts/build_dist.py --out _site
"""

import argparse
import datetime
import hashlib
import html as html_lib
import json
import os
import pathlib
import re
import shutil
import subprocess
import unicodedata

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE_ORIGIN = "https://fishao-tracker.cz"
CF_ANALYTICS_SNIPPET = (
    '<!-- Cloudflare Web Analytics -->'
    '<script type="module" src="https://static.cloudflareinsights.com/beacon.min.js" '
    'data-cf-beacon=\'{"token": "5e576a227071416ea49fa8729d8ee907"}\'></script>'
    '<!-- End Cloudflare Web Analytics -->'
)

CSS_FILES = [
    "css/base.css",
    "css/header.css",
    "css/nav.css",
    "css/filters.css",
    "css/table.css",
    "css/clubs.css",
    "css/players.css",
    "css/modals.css",
    "css/chat.css",
    "css/locations-calendar.css",
    "css/guide.css",
    "css/responsive.css",
]

JS_FILES = [
    "data/i18n/ui_cs.js",
    "data/i18n/taxonomies.js",
    "data/i18n/fish_names.js",
    "data/i18n.js",
    "data/fishes.js",
    "data/estimated_prices.js",
    "firebase-config.js",
    "js/state.js",
    "js/firestore-tx.js",
    "js/table.js",
    "js/basket.js",
    "js/table-snapshot.js",
    "js/clubs.js",
    "js/market.js",
    "js/filters.js",
    "js/auth.js",
    "js/players.js",
    "js/chat.js",
    "js/locations.js",
    "js/calendar.js",
    "js/guide.js",
    "js/reminders.js",
    "js/main.js",
]

STATIC_COPY_DIRS = ["images"]
STATIC_COPY_FILES = [
    "sw.js",
    "CNAME",
    "robots.txt",
    "favicon.ico",
    "favicon.svg",
    "favicon-48x48.png",
    "favicon-96x96.png",
    "apple-touch-icon.png",
]

ALL_LANGS = ("cs", "en", "pl", "nl", "ro", "tr")

LANG_CONFIG = {
    "cs": {
        "code": "cs",
        "short": "CZ",
        "flag": "🇨🇿",
        "locale": "cs-CZ",
        "og_locale": "cs_CZ",
        "fallback": [],
        "alt_lang": "en",
        "home_path": "/",
        "catalog_path": "/ryby/",
        "fish_prefix": "/ryba/",
        "keywords": "fishao wiki, wiki, fishao ryby, fishao fishes, fishao club, fishao kluby, klubové ryby, fishao encyklopedie, encyclopedia, fish market ceník, fishao ceník, fish market, fish market prices, fishao návnady, fishao baits, fishao za domem, fishao backyard, ryby fishao, lov ryb, fishao tracker, fishao guide, fishao database, fishdex",
    },
    "en": {
        "code": "en",
        "short": "EN",
        "flag": "🇬🇧",
        "locale": "en-US",
        "og_locale": "en_US",
        "fallback": ["cs"],
        "alt_lang": "cs",
        "home_path": "/en/",
        "catalog_path": "/en/fish/",
        "fish_prefix": "/en/fish/",
        "keywords": "fishao wiki, fishao tracker, fishao encyclopedia, fishao fish guide, fishao fishdex, fishao fishes, fishao club fishes, fishao market prices, fishao fish market, fishao baits, fishao locations, fishao backyard breeding, fishao database",
    },
    "pl": {
        "code": "pl",
        "short": "PL",
        "flag": "🇵🇱",
        "locale": "pl-PL",
        "og_locale": "pl_PL",
        "fallback": ["en", "cs"],
        "alt_lang": "en",
        "home_path": "/pl/",
        "catalog_path": "/pl/ryby/",
        "fish_prefix": "/pl/ryba/",
        "keywords": "fishao wiki, fishao tracker, fishao encyklopedia, fishao ryby, fishao poradnik, fishao baza ryb, fishao ryby klubowe, fishao targ rybny, fishao ceny ryb, fishao fish market, fishao przynęty, fishao łowiska, fishao domowe podwórko, fishdex",
    },
    "nl": {
        "code": "nl",
        "short": "NL",
        "flag": "🇳🇱",
        "locale": "nl-NL",
        "og_locale": "nl_NL",
        "fallback": ["en", "cs"],
        "alt_lang": "en",
        "home_path": "/nl/",
        "catalog_path": "/nl/vissen/",
        "fish_prefix": "/nl/vis/",
        "keywords": "fishao wiki, fishao tracker, fishao encyclopedie, fishao vissen, fishao gids, fishao clubvissen, fishao vismarkt, fishao prijzen, fishao aas, fishao locaties, fishao achtertuin, fishdex",
    },
    "ro": {
        "code": "ro",
        "short": "RO",
        "flag": "🇷🇴",
        "locale": "ro-RO",
        "og_locale": "ro_RO",
        "fallback": ["en", "cs"],
        "alt_lang": "en",
        "home_path": "/ro/",
        "catalog_path": "/ro/pesti/",
        "fish_prefix": "/ro/peste/",
        "keywords": "fishao wiki, fishao tracker, fishao enciclopedie, fishao pesti, fishao ghid, fishao pesti de club, fishao piata de peste, fishao preturi, fishao momeli, fishao locatii, fishao curte, fishdex",
    },
    "tr": {
        "code": "tr",
        "short": "TR",
        "flag": "🇹🇷",
        "locale": "tr-TR",
        "og_locale": "tr_TR",
        "fallback": ["en", "cs"],
        "alt_lang": "en",
        "home_path": "/tr/",
        "catalog_path": "/tr/baliklar/",
        "fish_prefix": "/tr/balik/",
        "keywords": "fishao wiki, fishao tracker, fishao ansiklopedi, fishao balıklar, fishao rehber, fishao kulüp balıkları, fishao balık pazarı, fishao fiyatlar, fishao yemler, fishao bölgeler, fishao arka bahçe, fishdex",
    },
}


def minify_css_python(css: str) -> str:
    css = re.sub(r"/\*[\s\S]*?\*/", "", css)
    tokens = []

    def _save_str(m):
        tokens.append(m.group(0))
        return f"__CSS_TOK_{len(tokens)-1}__"

    css = re.sub(r'"[^"\n]*"|\'[^\'\n]*\'', _save_str, css)
    css = re.sub(r"\s+", " ", css)
    css = re.sub(r"\s*([{};,])\s*", r"\1", css)
    css = re.sub(r":\s+", ":", css)
    css = css.replace(";}", "}")
    for i, tok in enumerate(tokens):
        css = css.replace(f"__CSS_TOK_{i}__", tok)
    return css.strip()


def run_esbuild_minify(esbuild_bin: str, content: str, loader: str) -> str:
    res = subprocess.run(
        [esbuild_bin, f"--loader={loader}", "--minify", "--charset=utf8"],
        input=content.encode("utf-8"),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=True,
    )
    return res.stdout.decode("utf-8")


def minify_css(css: str, esbuild_bin: str = "") -> str:
    if esbuild_bin:
        return run_esbuild_minify(esbuild_bin, css, "css").strip()
    return minify_css_python(css)


def minify_js(js: str, esbuild_bin: str = "") -> str:
    if esbuild_bin:
        return run_esbuild_minify(esbuild_bin, js, "js").strip()
    return js


def short_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:10]


def slugify(text: str) -> str:
    s = str(text or "").replace("ł", "l").replace("Ł", "l").replace("ı", "i").replace("İ", "i")
    s = unicodedata.normalize("NFD", s)
    s = "".join(ch for ch in s if unicodedata.category(ch) != "Mn")
    s = s.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s or "fish"


def load_i18n_and_data():
    ui_dicts = {}
    for lang in ALL_LANGS:
        src = (ROOT / "data" / "i18n" / f"ui_{lang}.js").read_text(encoding="utf-8")
        m = re.search(r"var dict = (\{[\s\S]*?\n\s*\});", src)
        if not m:
            raise RuntimeError(f"Could not parse data/i18n/ui_{lang}.js")
        ui_dicts[lang] = json.loads(m.group(1))

    tax_src = (ROOT / "data" / "i18n" / "taxonomies.js").read_text(encoding="utf-8")
    m_tax = re.search(r"var taxonomies = (\{[\s\S]*?\});\s*\n", tax_src)
    taxonomies = json.loads(m_tax.group(1))

    fn_src = (ROOT / "data" / "i18n" / "fish_names.js").read_text(encoding="utf-8")
    m_fn = re.search(r"var fishNames = (\{[\s\S]*?\});\s*\n", fn_src)
    fish_names = json.loads(m_fn.group(1))

    fishes_src = (ROOT / "data" / "fishes.js").read_text(encoding="utf-8")
    m_fishes = re.search(r"allFishes:(\[[\s\S]*\])\s*\}\s*;", fishes_src)
    fishes = json.loads(m_fishes.group(1))

    est_src = (ROOT / "data" / "estimated_prices.js").read_text(encoding="utf-8")
    m_est = re.search(r"FISHAO_ESTIMATED_PRICES\s*=\s*(\{[\s\S]*?\})\s*;", est_src)
    est_prices = json.loads(m_est.group(1))

    return ui_dicts, taxonomies, fish_names, fishes, est_prices


def get_chain(lang: str):
    cfg = LANG_CONFIG[lang]
    chain = [lang] + list(cfg["fallback"])
    if "cs" not in chain:
        chain.append("cs")
    return chain


def tr_ui(ui_dicts: dict, lang: str, key: str, params: dict = None) -> str:
    val = None
    for code in get_chain(lang):
        d = ui_dicts.get(code, {})
        if key in d:
            val = d[key]
            break
    if val is None:
        val = key
    if params:
        for pk, pv in params.items():
            val = val.replace("{" + pk + "}", str(pv))
    return val


def resolve_entry(entry: dict, lang: str) -> str:
    if not isinstance(entry, dict):
        return ""
    for code in get_chain(lang):
        v = entry.get(code)
        if isinstance(v, str) and v.strip():
            return v.strip()
    return ""


def get_fish_name(fish: dict, fish_names: dict, lang: str) -> str:
    fid = str(fish["id"])
    name = resolve_entry(fish_names.get(fid), lang)
    return name or fish.get("name") or f"#{fid}"


def get_alt_fish_name(fish: dict, fish_names: dict, lang: str) -> str:
    fid = str(fish["id"])
    alt_lang = LANG_CONFIG[lang]["alt_lang"]
    entry = fish_names.get(fid) or {}
    alt = (entry.get(alt_lang) or "").strip()
    main = get_fish_name(fish, fish_names, lang)
    return alt if (alt and alt != main) else ""


def get_loc_name(loc_key: str, taxonomies: dict, lang: str) -> str:
    return resolve_entry(taxonomies.get("locations", {}).get(loc_key), lang) or loc_key


def get_bait_name(bait_key: str, taxonomies: dict, lang: str) -> str:
    return resolve_entry(taxonomies.get("baits", {}).get(bait_key), lang) or bait_key


def format_num(n: int, lang: str) -> str:
    if lang in ("cs", "pl"):
        return f"{int(n):,}".replace(",", "\u00a0")
    if lang in ("nl", "ro", "tr"):
        return f"{int(n):,}".replace(",", ".")
    return f"{int(n):,}"


def format_day_month(month: int, day: int, lang: str) -> str:
    if lang == "cs":
        return f"{day}. {month}."
    months_by_lang = {
        "en": ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        "pl": ["", "sty", "lut", "mar", "kwi", "maj", "cze", "lip", "sie", "wrz", "paź", "lis", "gru"],
        "nl": ["", "jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"],
        "ro": ["", "ian", "feb", "mar", "apr", "mai", "iun", "iul", "aug", "sep", "oct", "nov", "dec"],
        "tr": ["", "Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"],
    }
    if lang in ("pl", "nl", "ro", "tr"):
        return f"{day} {months_by_lang[lang][month]}"
    return f"{months_by_lang['en'][month]} {day}"


def format_catch_date_text(raw_dates: list, ui_dicts: dict, lang: str) -> tuple:
    if not raw_dates:
        return tr_ui(ui_dicts, lang, "date_all_year"), False
    parts_out = []
    for d_str in raw_dates:
        clean = str(d_str).strip()
        if "-" not in clean:
            parts_out.append(clean)
            continue
        p0, p1 = clean.split("-", 1)
        s = [int(x) for x in p0.split(".")]
        e = [int(x) for x in p1.split(".")]
        parts_out.append(f"{format_day_month(s[0], s[1], lang)} – {format_day_month(e[0], e[1], lang)}")
    return ", ".join(parts_out), True


def get_rarity_label(factor, ui_dicts: dict, lang: str) -> str:
    try:
        val = float(factor)
    except (TypeError, ValueError):
        val = 1.0
    if val >= 1.0:
        key = "rarity_common"
    elif val >= 0.5:
        key = "rarity_uncommon"
    elif val >= 0.2:
        key = "rarity_rare"
    elif val >= 0.1:
        key = "rarity_very_rare"
    else:
        key = "rarity_legendary"
    pct = f"{round(val * 100, 2):g}%"
    return f"{tr_ui(ui_dicts, lang, key)} ({pct})"


def render_static_table_head(ui_dicts: dict, lang: str) -> str:
    esc = html_lib.escape
    t = lambda k, p=None: tr_ui(ui_dicts, lang, k, p)
    return (
        "<tr>"
        '<th style="width: 48px;">#</th>'
        f'<th style="width: 44px; text-align: center;" title="{esc(t("col_caught_title"))}">✓</th>'
        f'<th style="width: 40px; text-align: center;" title="{esc(t("col_basket_title"))}">🧺</th>'
        f'<th style="width: 108px;">{esc(t("col_appearance"))}</th>'
        f'<th>{esc(t("col_fish"))}</th>'
        f'<th>{esc(t("col_rarity"))}</th>'
        f'<th title="{esc(t("col_price_title"))}">{esc(t("col_price"))}</th>'
        f'<th>{esc(t("col_loc"))}</th>'
        f'<th>{esc(t("col_baits"))} <span class="th-info-badge" title="{esc(t("col_baits_info_tooltip"))}">ℹ️</span></th>'
        f'<th>{esc(t("col_time"))}</th>'
        f'<th>{esc(t("col_size"))}</th>'
        "</tr>"
    )


def render_static_fish_rows(fishes: list, fish_names: dict, taxonomies: dict, est_prices: dict, ui_dicts: dict, lang: str, limit: int = 20) -> str:
    esc = html_lib.escape
    t = lambda k, p=None: tr_ui(ui_dicts, lang, k, p)

    # Sort alphabetically by localized fish name (matching default app sort name_asc)
    sorted_fishes = sorted(
        fishes,
        key=lambda f: slugify(get_fish_name(f, fish_names, lang))
    )

    row_click_title = esc(t("price_cell_detail_title"))
    caught_title = esc(t("auth_notice_collection"))
    basket_title = esc(t("basket_btn_add_title"))
    club_tag_text = esc(t("badge_club_fish"))
    unspec_text = esc(t("loc_unspecified"))
    add_btn_text = esc(t("price_add_btn"))

    rows_html = []
    for idx, f in enumerate(sorted_fishes[:limit]):
        fid = f["id"]
        fname = get_fish_name(f, fish_names, lang)
        safe_name = esc(fname)
        rating = max(1, min(5, int(f.get("rating") or 1)))
        filled = "★" * rating
        empty = "★" * (5 - rating)
        rating_title = esc(t("rating_title", {"rating": rating}))
        rating_html = (
            f'<span class="rating-badge rate-{rating}" title="{rating_title}">'
            f'<span class="rating-num">{rating}★</span>'
            f'<span class="rating-stars-track"><span class="stars-active">{filled}</span>'
            f'<span class="stars-inactive">{empty}</span></span></span>'
        )

        est = est_prices.get(str(fid))
        est_sub_html = ""
        est_title_suffix = ""
        if est:
            mn_s = format_num(est["min"], lang)
            mx_s = format_num(est["max"], lang)
            est_title = t("price_est_cell_title", {"min": mn_s, "max": mx_s})
            est_title_suffix = "\n" + est_title
            est_sub_html = f'<span class="price-est-sub" title="{esc(est_title)}">~ {mn_s}–{mx_s} FB</span>'

        price_cell_html = (
            f'<div class="price-cell price-cell-stack" title="{esc(t("price_cell_add_title") + est_title_suffix)}">'
            f'<span class="price-empty">+ {add_btn_text}</span>'
            f"{est_sub_html}</div>"
        )

        locs = f.get("locations") or []
        places = f.get("places") or []
        loc_parts = [f'<span class="loc-tag">{esc(get_loc_name(lk, taxonomies, lang))}</span>' for lk in locs]
        for pk in places:
            aname = get_loc_name(pk, taxonomies, lang)
            atitle = esc(t("modal_area_title", {"name": aname}))
            loc_parts.append(f'<span class="loc-area-chip" title="{atitle}">📍 {esc(aname)}</span>')
        loc_html = "".join(loc_parts) or f'<span class="loc-unspecified">{unspec_text}</span>'

        baits = f.get("baits") or []
        baits_html = "".join(
            f'<span class="bait-tag"><img src="/images/bait_{esc(b)}.webp" alt="" class="bait-tag-icon" width="15" height="15" loading="lazy">'
            f"<span>{esc(get_bait_name(b, taxonomies, lang))}</span></span>"
            for b in baits
        )

        raw_times = f.get("raw_times") or []
        is_night = bool(f.get("is_night"))
        time_primary = (", ".join(raw_times) + " UTC") if raw_times else t("time_all_day")
        date_text, is_seasonal = format_catch_date_text(f.get("raw_dates") or [], ui_dicts, lang)
        date_badge = (
            f'<div class="date-badge in-season"><span class="date-icon">📅</span> {esc(date_text)}</div>'
            if is_seasonal else ""
        )
        time_html = (
            f'<div class="time-cell"><span class="time-badge{" time-night" if is_night else ""}">'
            f'{"🌙 " if is_night else "☀️ "}{esc(time_primary)}</span>{date_badge}</div>'
        )

        # Prioritize first 4 images for mobile viewport, lazy-load the rest
        img_loading = 'fetchpriority="high"' if idx < 2 else 'loading="lazy" decoding="async"'
        club_badge = f'<span class="badge-club-tag">{club_tag_text}</span>' if f.get("is_club") else ""

        rows_html.append(
            f'<tr tabindex="0" data-fish-id="{fid}" title="{row_click_title}">'
            f'<td style="color: var(--text-muted); font-weight: 600;">{idx + 1}</td>'
            f'<td style="text-align: center;"><button type="button" class="caught-btn" data-catch-id="{fid}" title="{caught_title}" aria-label="{caught_title}"></button></td>'
            f'<td style="text-align: center;"><button type="button" class="basket-btn" data-basket-id="{fid}" aria-pressed="false" title="{basket_title}" aria-label="{basket_title}"><span aria-hidden="true">+</span></button></td>'
            f'<td><div class="fish-img-box"><img src="/images/fish_{fid}.webp" alt="{safe_name}" class="fish-img" width="92" height="52" {img_loading}></div></td>'
            f'<td><div style="font-weight: 700; font-size: 15px; color: #fff;">{safe_name}{club_badge}</div></td>'
            f"<td>{rating_html}</td>"
            f"<td>{price_cell_html}</td>"
            f'<td class="loc-box">{loc_html}</td>'
            f"<td>{baits_html}</td>"
            f"<td>{time_html}</td>"
            f'<td class="len-box"><span class="len-dim">{f["min_l"]}</span> / <strong class="len-avg">{f["avg_l"]} cm</strong> / <span class="len-dim">{f["max_l"]} cm</span></td>'
            "</tr>"
        )

    return "".join(rows_html)


def localize_index_html(
    base_html: str,
    lang: str,
    ui_dicts: dict,
    fishes: list,
    fish_names: dict,
    taxonomies: dict,
    est_prices: dict,
    css_name: str,
    js_name: str,
    extra_lang_js: str,
    build_version: str,
    i18n_bundles: dict,
) -> str:
    cfg = LANG_CONFIG[lang]
    t = lambda k, p=None: tr_ui(ui_dicts, lang, k, p)
    esc = html_lib.escape

    page_title = t("seo_page_title")
    page_desc = t("seo_meta_desc")
    canonical_url = f"{SITE_ORIGIN}{cfg['home_path']}"
    keywords = cfg["keywords"]

    html = base_html

    # 1. <html lang="...">
    html = re.sub(r'<html lang="[^"]+">', f'<html lang="{lang}">', html, count=1)

    # 2. <title>, meta title, description, keywords, canonical, og:*, twitter:*
    html = re.sub(r"<title>[\s\S]*?</title>", f"<title>{esc(page_title)}</title>", html, count=1)
    html = re.sub(r'<meta name="title" content="[^"]*">', f'<meta name="title" content="{esc(page_title)}">', html, count=1)
    html = re.sub(
        r'<meta name="description" id="metaDescription" content="[^"]*">',
        f'<meta name="description" id="metaDescription" content="{esc(page_desc)}">',
        html,
        count=1,
    )
    html = re.sub(r'<meta name="keywords" content="[^"]*">', f'<meta name="keywords" content="{esc(keywords)}">', html, count=1)
    html = re.sub(
        r'<link rel="canonical" id="canonicalLink" href="[^"]*">',
        f'<link rel="canonical" id="canonicalLink" href="{canonical_url}">',
        html,
        count=1,
    )
    html = re.sub(r'<meta property="og:url" content="[^"]*">', f'<meta property="og:url" content="{canonical_url}">', html, count=1)
    html = re.sub(r'<meta property="og:title" content="[^"]*">', f'<meta property="og:title" content="{esc(page_title)}">', html, count=1)
    html = re.sub(r'<meta property="og:description" content="[^"]*">', f'<meta property="og:description" content="{esc(page_desc)}">', html, count=1)

    other_og = [LANG_CONFIG[c]["og_locale"] for c in ALL_LANGS if c != lang]
    og_locale_block = "\n".join(
        [f'<meta property="og:locale" content="{cfg["og_locale"]}">']
        + [f'  <meta property="og:locale:alternate" content="{loc}">' for loc in other_og]
    )
    html = re.sub(
        r'<meta property="og:locale"[^>]*>(?:\s*<meta property="og:locale:alternate"[^>]*>)+',
        og_locale_block,
        html,
        count=1,
    )

    html = re.sub(r'<meta name="twitter:url" content="[^"]*">', f'<meta name="twitter:url" content="{canonical_url}">', html, count=1)
    html = re.sub(r'<meta name="twitter:title" content="[^"]*">', f'<meta name="twitter:title" content="{esc(page_title)}">', html, count=1)
    html = re.sub(r'<meta name="twitter:description" content="[^"]*">', f'<meta name="twitter:description" content="{esc(page_desc)}">', html, count=1)

    # 3. Update JSON-LD schema with localized title/description/url
    schema_obj = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "ImageObject",
                "@id": f"{SITE_ORIGIN}/#primaryimage",
                "url": f"{SITE_ORIGIN}/images/og-preview.png",
                "contentUrl": f"{SITE_ORIGIN}/images/og-preview.png",
                "width": 1200,
                "height": 630,
                "caption": "FISHAO Tracker & Wiki",
            },
            {
                "@type": "WebApplication",
                "@id": f"{SITE_ORIGIN}/#app",
                "name": page_title,
                "alternateName": [
                    "FISHAO Tracker",
                    "FISHAO Wiki",
                    "fishao-tracker.cz",
                    "FISHAO Encyklopedie",
                    "FISHAO Encyklopedia",
                    "FISHAO Encyclopedia",
                    "FISHAO Fishdex",
                    "FISHAO Poradnik",
                    "Fishao Guide",
                ],
                "url": canonical_url,
                "applicationCategory": "GameApplication, ReferenceApplication",
                "operatingSystem": "All",
                "inLanguage": list(ALL_LANGS),
                "image": {"@id": f"{SITE_ORIGIN}/#primaryimage"},
                "thumbnailUrl": f"{SITE_ORIGIN}/images/og-preview.png",
                "description": page_desc,
                "offers": {"@type": "Offer", "price": "0", "priceCurrency": "CZK"},
            },
            {
                "@type": "WebSite",
                "@id": f"{SITE_ORIGIN}/#website",
                "url": f"{SITE_ORIGIN}/",
                "name": "FISHAO Tracker & Wiki",
                "alternateName": ["FISHAO Tracker", "FISHAO Wiki", "fishao-tracker.cz", "FISHAO Encyklopedia"],
                "image": {"@id": f"{SITE_ORIGIN}/#primaryimage"},
                "thumbnailUrl": f"{SITE_ORIGIN}/images/og-preview.png",
                "description": page_desc,
                "inLanguage": list(ALL_LANGS),
            },
            {
                "@type": "WebPage",
                "@id": f"{canonical_url}#webpage",
                "url": canonical_url,
                "name": page_title,
                "description": page_desc,
                "inLanguage": lang,
                "isPartOf": {"@id": f"{SITE_ORIGIN}/#website"},
                "primaryImageOfPage": {"@id": f"{SITE_ORIGIN}/#primaryimage"},
                "image": {"@id": f"{SITE_ORIGIN}/#primaryimage"},
                "thumbnailUrl": f"{SITE_ORIGIN}/images/og-preview.png",
            },
        ],
    }
    schema_json = json.dumps(schema_obj, ensure_ascii=False, indent=2)
    html = re.sub(
        r'<script type="application/ld\+json">[\s\S]*?</script>',
        f'<script type="application/ld+json">\n{schema_json}\n  </script>',
        html,
        count=1,
    )

    # 4. Translate static data-i18n attributes for non-default languages
    if lang != "cs":
        def _repl_attr(attr_name, i18n_attr):
            pattern = re.compile(
                rf'(<[^>]*?\b{attr_name}=")([^"]*?)("[^>]*?\b{i18n_attr}="([^"]+)"[^>]*?>)'
                rf'|(<[^>]*?\b{i18n_attr}="([^"]+)"[^>]*?\b{attr_name}=")([^"]*?)("[^>]*?>)'
            )
            def _sub(m):
                if m.group(1) is not None:
                    key = m.group(4)
                    val = t(key)
                    if val and val != key:
                        return f"{m.group(1)}{esc(val)}{m.group(3)}"
                    return m.group(0)
                else:
                    key = m.group(6)
                    val = t(key)
                    if val and val != key:
                        return f"{m.group(5)}{esc(val)}{m.group(8)}"
                    return m.group(0)
            return pattern, _sub

        for attr_name, i18n_attr in (
            ("placeholder", "data-i18n-placeholder"),
            ("title", "data-i18n-title"),
            ("aria-label", "data-i18n-aria-label"),
        ):
            pat, sub_fn = _repl_attr(attr_name, i18n_attr)
            html = pat.sub(sub_fn, html)

        # Translate leaf elements with data-i18n="key">...<
        def _sub_text(m):
            open_tag, key, inner, close_tag = m.group(1), m.group(2), m.group(3), m.group(4)
            if 'id="tzLocalBtn"' in open_tag or 'id="clockLabel"' in open_tag or 'id="marketSundayNoticeDesc"' in open_tag:
                return m.group(0)
            val = t(key)
            if not val or val == key:
                return m.group(0)
            return f"{open_tag}{val}{close_tag}"

        html = re.sub(
            r'(<([a-zA-Z0-9]+)\b[^>]*?\bdata-i18n="([^"]+)"[^>]*>)([^<]*)(</\2>)',
            lambda m: _sub_leaf(m, t),
            html,
        )

        # Footer recaptcha notice contains <a> tags inside <p data-i18n="footer_recaptcha_notice">
        recap_val = t("footer_recaptcha_notice")
        if recap_val and recap_val != "footer_recaptcha_notice":
            html = re.sub(
                r'(<p class="footer-recaptcha" data-i18n="footer_recaptcha_notice">)[\s\S]*?(</p>)',
                lambda m: f"{m.group(1)}{recap_val}{m.group(2)}",
                html,
                count=1,
            )

        # Mark selected option in #langSelect
        html = html.replace(f'<option value="{lang}">', f'<option value="{lang}" selected>', 1)

    # Update footerWikiLink href for the language
    html = html.replace('href="/ryby/" id="footerWikiLink"', f'href="{cfg["catalog_path"]}" id="footerWikiLink"', 1)

    # 5. Pre-render table header, first 20 fish rows, and counter text into HTML
    thead_html = render_static_table_head(ui_dicts, lang)
    tbody_html = render_static_fish_rows(fishes, fish_names, taxonomies, est_prices, ui_dicts, lang, limit=20)
    counter_text = esc(t("counter_showing", {"shown": len(fishes), "total": len(fishes)}))

    html = html.replace(
        '<span id="counter" class="counter-text">Zobrazeno 0 ryb</span>',
        f'<span id="counter" class="counter-text">{counter_text}</span>',
        1,
    )
    html = html.replace('<thead id="tableHead"></thead>', f'<thead id="tableHead">{thead_html}</thead>', 1)
    html = html.replace('<tbody id="tableBody"></tbody>', f'<tbody id="tableBody">{tbody_html}</tbody>', 1)

    # 6. Replace CSS and JS blocks with root-relative /dist/... paths
    css_block_re = re.compile(r"<!-- Modern Modular Stylesheets -->[\s\S]*?</head>", re.MULTILINE)
    html, css_n = css_block_re.subn(
        f'<!-- Bundled Stylesheet -->\n  <link rel="stylesheet" href="/{css_name}">\n</head>',
        html,
    )
    if css_n != 1:
        raise RuntimeError("Could not locate CSS block in index.html")

    js_block_re = re.compile(r"<!-- Data scripts and localization.*?</body>", re.DOTALL)
    i18n_bundles_json = json.dumps(i18n_bundles, separators=(",", ":"))
    extra_script_tag = f'  <script defer src="/{extra_lang_js}"></script>\n' if extra_lang_js else ""
    html, js_n = js_block_re.subn(
        f'<script>window.FISHAO_APP_VERSION="{build_version}";window.FISHAO_I18N_BUNDLES={i18n_bundles_json};</script>\n'
        f"{extra_script_tag}"
        f'  <script defer src="/{js_name}"></script>\n\n</body>',
        html,
    )
    if js_n != 1:
        raise RuntimeError("Could not locate JS block in index.html")

    return html


def _sub_leaf(m, t_fn):
    open_tag, tag_name, key, inner, close_tag = m.group(1), m.group(2), m.group(3), m.group(4), m.group(5)
    if 'id="tzLocalBtn"' in open_tag or 'id="clockLabel"' in open_tag or 'id="marketSundayNoticeDesc"' in open_tag:
        return m.group(0)
    val = t_fn(key)
    if not val or val == key:
        return m.group(0)
    return f"{open_tag}{val}{close_tag}"


WIKI_PAGE_Labels = {
    "cs": {
        "wiki_badge": "FISHAO Wiki & Encyklopedie",
        "back_tracker": "← Otevřít v interaktivním FISHAO Trackeru",
        "open_fish_btn": "🎯 Otevřít detail a živý graf cen v aplikaci",
        "all_fishes_link": "📖 Katalog všech 615 ryb",
        "catalog_title": "FISHAO Wiki – Kompletní katalog a encyklopedie všech 615 ryb",
        "catalog_desc": "Kompletní seznam všech 615 ryb ve hře FISHAO: lokace výskytu, návnady, časy lovu, rozměry a odhadované výkupní ceny ve Fish Marketu.",
        "catalog_h1": "FISHAO Wiki – Katalog všech 615 ryb",
        "catalog_lead": "Kompletní encyklopedie ryb ze hry FISHAO. Kliknutím na rybu otevřeš její kartu s lokacemi, návnadami, časem lovu a cenou ve Fish Marketu.",
        "sec_overview": "Přehled a parametry ryby",
        "lbl_id": "ID ryby ve hře",
        "lbl_rating": "Obtížnost (Rating)",
        "lbl_rarity": "Vzácnost (šance záběru)",
        "lbl_locations": "Lokace výskytu",
        "lbl_areas": "Konkrétní místo lovu",
        "lbl_baits": "Vhodné návnady",
        "lbl_time": "Čas lovu (herní čas UTC)",
        "lbl_season": "Sezóna / období",
        "lbl_size": "Rozměry (Min / Průměr / Max)",
        "lbl_est_price": "Odhadovaná cena (Fish Market)",
        "lbl_club": "Klubová ryba",
        "club_points": "Klubová ryba za body ({pts} b., pořadí #{order})",
        "club_fc": "Speciální klubová ryba za Fishcoins ({fc} FC, pořadí #{order})",
        "club_monster": "Klubové monstrum (pořadí #{order})",
        "names_in_langs": "Názvy ryby v jazycích hry",
        "related_in_loc": "Další ryby ve stejné lokaci",
        "summary_tpl": "{name} (#{id}) je {stars}★ ryba ve hře FISHAO. Chytá se v lokaci {locs} na návnadu {baits}. Čas lovu: {time} ({season}). Průměrná délka je {avg} cm ({min}–{max} cm){price_part}.",
        "summary_price": " a odhadovaná výkupní cena ve Fish Marketu je {min_p}–{max_p} FB",
        "title_tpl": "{name}{alt_part} – FISHAO Wiki: lokace, návnada, čas lovu a cena",
    },
    "en": {
        "wiki_badge": "FISHAO Wiki & Encyclopedia",
        "back_tracker": "← Open interactive FISHAO Tracker",
        "open_fish_btn": "🎯 Open interactive detail & live price chart in Tracker",
        "all_fishes_link": "📖 All 615 Fishes Catalog",
        "catalog_title": "FISHAO Wiki – Complete Encyclopedia & Guide of All 615 Fishes",
        "catalog_desc": "Complete FISHAO wiki and fish list of all 615 fishes: locations, fishing areas, baits, catch times, sizes and estimated Fish Market prices.",
        "catalog_h1": "FISHAO Wiki – All 615 Fishes Encyclopedia",
        "catalog_lead": "Complete encyclopedia of all fishes in FISHAO. Select any fish to view its locations, best baits, active catch times, dimensions, and Fish Market price range.",
        "sec_overview": "Fish Overview & Catch Guide",
        "lbl_id": "In-game Fish ID",
        "lbl_rating": "Difficulty Rating",
        "lbl_rarity": "Rarity (spawn weight)",
        "lbl_locations": "Locations",
        "lbl_areas": "Specific Fishing Area",
        "lbl_baits": "Baits",
        "lbl_time": "Catch Time (Game UTC)",
        "lbl_season": "Season / Dates",
        "lbl_size": "Size (Min / Average / Max)",
        "lbl_est_price": "Estimated Fish Market Price",
        "lbl_club": "Club Fish Unlock",
        "club_points": "Club points milestone ({pts} pts, order #{order})",
        "club_fc": "Special Club Fishcoin fish ({fc} FC, order #{order})",
        "club_monster": "Club Monster fish (order #{order})",
        "names_in_langs": "Fish Names Across Languages",
        "related_in_loc": "Other Fishes in the Same Location",
        "summary_tpl": "{name} (#{id}) is a {stars}★ fish in FISHAO. It can be caught in {locs} using {baits}. Catch time: {time} ({season}). Average length is {avg} cm ({min}–{max} cm){price_part}.",
        "summary_price": " with an estimated Fish Market price of {min_p}–{max_p} FB",
        "title_tpl": "{name}{alt_part} – FISHAO Wiki: Location, Bait, Time & Market Price",
    },
    "pl": {
        "wiki_badge": "FISHAO Wiki & Encyklopedia",
        "back_tracker": "← Otwórz interaktywny FISHAO Tracker",
        "open_fish_btn": "🎯 Otwórz szczegóły, kalkulator przynęt i wykres cen w Trackerze",
        "all_fishes_link": "📖 Katalog wszystkich 615 ryb",
        "catalog_title": "FISHAO Wiki – Pełna encyklopedia i spis wszystkich 615 ryb",
        "catalog_desc": "Kompletna FISHAO wiki i encyklopedia wszystkich 615 ryb: łowiska, przynęty, pory połowu, wymiary oraz szacowane ceny na Targu Rybnym (Fish Market).",
        "catalog_h1": "FISHAO Wiki – Katalog wszystkich 615 ryb",
        "catalog_lead": "Kompletna encyklopedia i poradnik ryb w grze FISHAO. Kliknij rybę, aby sprawdzić gdzie bierze, na jaką przynętę, w jakich godzinach oraz ile kosztuje w Fish Markecie.",
        "sec_overview": "Przegląd i parametry ryby",
        "lbl_id": "ID ryby w grze",
        "lbl_rating": "Trudność (Rating)",
        "lbl_rarity": "Rzadkość (szansa brania)",
        "lbl_locations": "Łowiska / Lokalizacje",
        "lbl_areas": "Konkretne miejsce połowu",
        "lbl_baits": "Przynęty",
        "lbl_time": "Czas połowu (czas gry UTC)",
        "lbl_season": "Sezon / Okres połowu",
        "lbl_size": "Wymiary (Min / Średnia / Max)",
        "lbl_est_price": "Szacowana cena (Fish Market)",
        "lbl_club": "Ryba klubowa",
        "club_points": "Ryba klubowa za punkty ({pts} pkt, nr #{order})",
        "club_fc": "Specjalna ryba klubowa za Fishcoiny ({fc} FC, nr #{order})",
        "club_monster": "Potwór klubowy (nr #{order})",
        "names_in_langs": "Nazwy ryby w różnych językach",
        "related_in_loc": "Inne ryby w tym samym łowisku",
        "summary_tpl": "{name} (#{id}) to {stars}★ ryba w grze FISHAO. Występuje w łowisku {locs}, a łowi się ją na przynętę: {baits}. Czas połowu: {time} ({season}). Średnia długość wynosi {avg} cm ({min}–{max} cm){price_part}.",
        "summary_price": ", a szacowana cena w Fish Markecie to {min_p}–{max_p} FB",
        "title_tpl": "{name}{alt_part} – FISHAO Wiki: łowisko, przynęta, czas połowu i cena",
    },
    "nl": {
        "wiki_badge": "FISHAO Wiki & Encyclopedie",
        "back_tracker": "← Open interactieve FISHAO Tracker",
        "open_fish_btn": "🎯 Open details & live prijsgrafiek in Tracker",
        "all_fishes_link": "📖 Catalogus van alle 615 vissen",
        "catalog_title": "FISHAO Wiki – Volledige encyclopedie & gids van alle 615 vissen",
        "catalog_desc": "Complete FISHAO wiki en vislijst van alle 615 vissen: locaties, visplekken, aas, vangsttijden, afmetingen en geschatte Fish Market-prijzen.",
        "catalog_h1": "FISHAO Wiki – Encyclopedie van alle 615 vissen",
        "catalog_lead": "Volledige encyclopedie van alle vissen in FISHAO. Klik op een vis voor locaties, beste aas, actieve vangsttijden, afmetingen en Fish Market-prijzen.",
        "sec_overview": "Visoverzicht & Vanggids",
        "lbl_id": "Vis-ID in het spel",
        "lbl_rating": "Moeilijkheidsgraad (Rating)",
        "lbl_rarity": "Zeldzaamheid (aanbeetkans)",
        "lbl_locations": "Locaties",
        "lbl_areas": "Specifieke visplek",
        "lbl_baits": "Aas",
        "lbl_time": "Vangsttijd (speltijd UTC)",
        "lbl_season": "Seizoen / Periode",
        "lbl_size": "Lengte (Min / Gemiddeld / Max)",
        "lbl_est_price": "Geschatte prijs (Fish Market)",
        "lbl_club": "Clubvis",
        "club_points": "Clubvis op punten ({pts} ptn, nr. #{order})",
        "club_fc": "Speciale clubvis voor Fishcoins ({fc} FC, nr. #{order})",
        "club_monster": "Clubmonster (nr. #{order})",
        "names_in_langs": "Visnamen in andere talen",
        "related_in_loc": "Andere vissen op dezelfde locatie",
        "summary_tpl": "{name} (#{id}) is een {stars}★ vis in FISHAO. Je vangt deze op {locs} met {baits}. Vangsttijd: {time} ({season}). Gemiddelde lengte is {avg} cm ({min}–{max} cm){price_part}.",
        "summary_price": " met een geschatte Fish Market-prijs van {min_p}–{max_p} FB",
        "title_tpl": "{name}{alt_part} – FISHAO Wiki: locatie, aas, vangsttijd & prijs",
    },
    "ro": {
        "wiki_badge": "FISHAO Wiki & Enciclopedie",
        "back_tracker": "← Deschide FISHAO Tracker interactiv",
        "open_fish_btn": "🎯 Deschide detaliile și graficul de prețuri în Tracker",
        "all_fishes_link": "📖 Catalogul tuturor celor 615 pești",
        "catalog_title": "FISHAO Wiki – Enciclopedie completă și ghid al tuturor celor 615 pești",
        "catalog_desc": "Wiki și listă completă FISHAO cu toți cei 615 pești: locații, zone de pescuit, momeli, ore de prindere, dimensiuni și prețuri estimate în Fish Market.",
        "catalog_h1": "FISHAO Wiki – Enciclopedia tuturor celor 615 pești",
        "catalog_lead": "Enciclopedie completă a tuturor peștilor din FISHAO. Apasă pe un pește pentru locații, cele mai bune momeli, ore active, dimensiuni și prețuri în Fish Market.",
        "sec_overview": "Prezentare generală & Ghid de pescuit",
        "lbl_id": "ID pește în joc",
        "lbl_rating": "Dificultate (Rating)",
        "lbl_rarity": "Raritate (șansă de mușcătură)",
        "lbl_locations": "Locații",
        "lbl_areas": "Zonă specifică de pescuit",
        "lbl_baits": "Momeli",
        "lbl_time": "Ore de pescuit (ora jocului UTC)",
        "lbl_season": "Sezon / Perioadă",
        "lbl_size": "Dimensiuni (Min / Medie / Max)",
        "lbl_est_price": "Preț estimat (Fish Market)",
        "lbl_club": "Pește de club",
        "club_points": "Pește de club pe puncte ({pts} pct, nr. #{order})",
        "club_fc": "Pește special de club cu Fishcoins ({fc} FC, nr. #{order})",
        "club_monster": "Monstru de club (nr. #{order})",
        "names_in_langs": "Numele peștelui în alte limbi",
        "related_in_loc": "Alți pești din aceeași locație",
        "summary_tpl": "{name} (#{id}) este un pește de {stars}★ în FISHAO. Poate fi prins în {locs} folosind {baits}. Ore de pescuit: {time} ({season}). Lungimea medie este {avg} cm ({min}–{max} cm){price_part}.",
        "summary_price": ", cu un preț estimat în Fish Market de {min_p}–{max_p} FB",
        "title_tpl": "{name}{alt_part} – FISHAO Wiki: locație, momeală, oră și preț",
    },
    "tr": {
        "wiki_badge": "FISHAO Wiki & Ansiklopedi",
        "back_tracker": "← Etkileşimli FISHAO Tracker'ı aç",
        "open_fish_btn": "🎯 Tracker'da detayları ve canlı fiyat grafiğini aç",
        "all_fishes_link": "📖 Tüm 615 Balık Kataloğu",
        "catalog_title": "FISHAO Wiki – Tüm 615 Balık Ansiklopedisi ve Rehberi",
        "catalog_desc": "Tüm 615 balık için eksiksiz FISHAO wiki ve balık listesi: bölgeler, av noktaları, yemler, av saatleri, boyutlar ve tahmini Fish Market fiyatları.",
        "catalog_h1": "FISHAO Wiki – Tüm 615 Balık Ansiklopedisi",
        "catalog_lead": "FISHAO oyunundaki tüm balıkların eksiksiz ansiklopedisi. Bölge, en iyi yem, aktif av saatleri, boyutlar ve Fish Market fiyat aralığını görmek için bir balığa tıklayın.",
        "sec_overview": "Balık Özeti & Av Rehberi",
        "lbl_id": "Oyun içi Balık ID",
        "lbl_rating": "Zorluk Derecesi (Rating)",
        "lbl_rarity": "Nadirlik (vuruş ağırlığı)",
        "lbl_locations": "Bölgeler",
        "lbl_areas": "Özel Av Noktası",
        "lbl_baits": "Yemler",
        "lbl_time": "Av Saati (Oyun Saati UTC)",
        "lbl_season": "Sezon / Tarihler",
        "lbl_size": "Boyut (Min / Ortalama / Max)",
        "lbl_est_price": "Tahmini Fiyat (Fish Market)",
        "lbl_club": "Kulüp Balığı",
        "club_points": "Kulüp puanı balığı ({pts} puan, sıra #{order})",
        "club_fc": "Özel Fishcoin kulüp balığı ({fc} FC, sıra #{order})",
        "club_monster": "Kulüp Canavarı (sıra #{order})",
        "names_in_langs": "Diğer Dillerdeki Balık Adları",
        "related_in_loc": "Aynı Bölgedeki Diğer Balıklar",
        "summary_tpl": "{name} (#{id}), FISHAO oyununda {stars}★ bir balıktır. {locs} bölgesinde {baits} ile yakalanır. Av saati: {time} ({season}). Ortalama boyu {avg} cm'dir ({min}–{max} cm){price_part}.",
        "summary_price": " ve tahmini Fish Market fiyatı {min_p}–{max_p} FB aralığındadır",
        "title_tpl": "{name}{alt_part} – FISHAO Wiki: Bölge, Yem, Saat ve Pazar Fiyatı",
    },
}


def build_fish_url_path(fish: dict, fish_names: dict, lang: str) -> str:
    cfg = LANG_CONFIG[lang]
    name = get_fish_name(fish, fish_names, lang)
    slug = slugify(name)
    return f"{cfg['fish_prefix']}{fish['id']}-{slug}/"


def generate_wiki_pages(
    out_dir: pathlib.Path,
    fishes: list,
    fish_names: dict,
    taxonomies: dict,
    est_prices: dict,
    ui_dicts: dict,
    css_name: str,
) -> list:
    esc = html_lib.escape
    sitemap_entries = []

    # Precompute URLs for all fishes across all supported languages
    fish_paths = {lang: {} for lang in ALL_LANGS}
    for f in fishes:
        fid = f["id"]
        for lang in ALL_LANGS:
            fish_paths[lang][fid] = build_fish_url_path(f, fish_names, lang)

    # Index fishes by primary location for related links
    fishes_by_loc = {}
    for f in fishes:
        for lk in f.get("locations") or []:
            fishes_by_loc.setdefault(lk, []).append(f)

    # Generate individual fish pages
    for f in fishes:
        fid = f["id"]
        alternates = {lang: f"{SITE_ORIGIN}{fish_paths[lang][fid]}" for lang in ALL_LANGS}
        sitemap_entries.append({
            "locs": alternates,
            "priority": "0.7",
            "changefreq": "weekly",
            "image": f"{SITE_ORIGIN}/images/fish_{fid}.webp",
            "image_title": get_fish_name(f, fish_names, "cs"),
        })

        for lang in ALL_LANGS:
            cfg = LANG_CONFIG[lang]
            lbl = WIKI_PAGE_Labels[lang]
            t = lambda k, p=None: tr_ui(ui_dicts, lang, k, p)

            fname = get_fish_name(f, fish_names, lang)
            fn_entry = fish_names.get(str(fid)) or {}
            names_by_lang = {lc: get_fish_name(f, fish_names, lc) for lc in ALL_LANGS}
            alt_lang_code = cfg["alt_lang"]
            alt_candidate = (fn_entry.get(alt_lang_code) or "").strip()
            alt_for_title = f" ({alt_candidate})" if (alt_candidate and alt_candidate != fname) else ""

            page_title = lbl["title_tpl"].format(name=fname, alt_part=alt_for_title)

            locs = f.get("locations") or []
            loc_names = [get_loc_name(lk, taxonomies, lang) for lk in locs]
            if not loc_names and f.get("is_club"):
                loc_names = [get_loc_name("location_112", taxonomies, lang)]
            locs_str = ", ".join(loc_names) if loc_names else t("loc_unspecified")

            places = f.get("places") or []
            area_names = [get_loc_name(pk, taxonomies, lang) for pk in places]
            areas_str = ", ".join(area_names)

            baits = f.get("baits") or []
            bait_names = [get_bait_name(bk, taxonomies, lang) for bk in baits]
            baits_str = ", ".join(bait_names)

            raw_times = f.get("raw_times") or []
            time_str = (", ".join(raw_times) + " UTC") if raw_times else t("time_all_day")
            date_text, is_seasonal = format_catch_date_text(f.get("raw_dates") or [], ui_dicts, lang)

            est = est_prices.get(str(fid))
            price_part = ""
            est_str = "--"
            if est:
                mn_s = format_num(est["min"], lang)
                mx_s = format_num(est["max"], lang)
                est_str = f"~ {mn_s} – {mx_s} FB"
                price_part = lbl["summary_price"].format(min_p=mn_s, max_p=mx_s)

            summary_text = lbl["summary_tpl"].format(
                name=fname,
                id=fid,
                stars=f.get("rating", 1),
                locs=locs_str,
                baits=baits_str,
                time=time_str,
                season=date_text,
                avg=f["avg_l"],
                min=f["min_l"],
                max=f["max_l"],
                price_part=price_part,
            )

            canonical_url = alternates[lang]
            tracker_fish_url = f"{cfg['home_path']}#fish-{fid}"
            rating = max(1, min(5, int(f.get("rating") or 1)))
            stars_str = "★" * rating + "☆" * (5 - rating)
            rarity_str = get_rarity_label(f.get("rarity_factor", 1.0), ui_dicts, lang)

            club_row_html = ""
            if f.get("is_club"):
                ut = f.get("unlock_type")
                if ut == "points":
                    c_desc = lbl["club_points"].format(pts=format_num(f.get("points") or 0, lang), order=f.get("order") or "")
                elif ut == "fc":
                    c_desc = lbl["club_fc"].format(fc=f.get("fc") or 0, order=f.get("order") or "")
                else:
                    c_desc = lbl["club_monster"].format(order=f.get("order") or "")
                club_row_html = f'<div class="wiki-spec-item"><span class="wiki-spec-label">🏆 {esc(lbl["lbl_club"])}</span><span class="wiki-spec-val" style="color:#fbbf24;font-weight:700;">{esc(c_desc)}</span></div>'

            area_row_html = (
                f'<div class="wiki-spec-item"><span class="wiki-spec-label">📍 {esc(lbl["lbl_areas"])}</span><span class="wiki-spec-val">{esc(areas_str)}</span></div>'
                if areas_str else ""
            )

            baits_chips_html = " ".join(
                f'<span class="bait-tag"><img src="/images/bait_{esc(b)}.webp" alt="" class="bait-tag-icon" width="15" height="15"><span>{esc(get_bait_name(b, taxonomies, lang))}</span></span>'
                for b in baits
            )
            locs_chips_html = " ".join(f'<span class="loc-tag">{esc(ln)}</span>' for ln in loc_names)

            # Related fishes in same primary location
            related_fishes = []
            if locs:
                peers = [pf for pf in fishes_by_loc.get(locs[0], []) if pf["id"] != fid]
                related_fishes = peers[:12]
            related_html = ""
            if related_fishes:
                rel_items = "".join(
                    f'<a href="{fish_paths[lang][rf["id"]]}" class="wiki-rel-chip">'
                    f'<img src="/images/fish_{rf["id"]}.webp" alt="{esc(get_fish_name(rf, fish_names, lang))}" width="46" height="26" loading="lazy">'
                    f'<span>{esc(get_fish_name(rf, fish_names, lang))}</span></a>'
                    for rf in related_fishes
                )
                related_html = (
                    f'<section class="wiki-card" style="margin-top:16px;">'
                    f'<h2 class="wiki-h2">{esc(lbl["related_in_loc"])} ({esc(loc_names[0])})</h2>'
                    f'<div class="wiki-rel-grid">{rel_items}</div></section>'
                )

            schema_obj = {
                "@context": "https://schema.org",
                "@graph": [
                    {
                        "@type": "BreadcrumbList",
                        "itemListElement": [
                            {"@type": "ListItem", "position": 1, "name": "FISHAO Tracker", "item": f"{SITE_ORIGIN}{cfg['home_path']}"},
                            {"@type": "ListItem", "position": 2, "name": "FISHAO Wiki", "item": f"{SITE_ORIGIN}{cfg['catalog_path']}"},
                            {"@type": "ListItem", "position": 3, "name": fname, "item": canonical_url},
                        ],
                    },
                    {
                        "@type": "Article",
                        "headline": page_title,
                        "name": fname,
                        "alternateName": sorted({n for n in names_by_lang.values() if n and n != fname}),
                        "description": summary_text,
                        "image": f"{SITE_ORIGIN}/images/fish_{fid}.webp",
                        "inLanguage": lang,
                        "mainEntityOfPage": canonical_url,
                        "author": {"@type": "Organization", "name": "FISHAO Tracker Community"},
                        "publisher": {"@type": "Organization", "name": "FISHAO Tracker", "url": f"{SITE_ORIGIN}/"},
                    },
                ],
            }
            schema_json = json.dumps(schema_obj, ensure_ascii=False)

            hreflang_links_html = "\n  ".join(
                [f'<link rel="alternate" hreflang="{lc}" href="{alternates[lc]}">' for lc in ALL_LANGS]
                + [f'<link rel="alternate" hreflang="x-default" href="{alternates["cs"]}">']
            )
            topbar_lang_chips_html = "\n        ".join(
                f'<a href="{fish_paths[lc][fid]}" class="wiki-lang-chip{" current" if lang == lc else ""}" hreflang="{lc}">{LANG_CONFIG[lc]["flag"]} {LANG_CONFIG[lc]["short"]}</a>'
                for lc in ALL_LANGS
            )
            bottom_lang_chips_html = "\n          ".join(
                f'<a href="{fish_paths[lc][fid]}" class="wiki-lang-chip" hreflang="{lc}">{LANG_CONFIG[lc]["flag"]} {esc(names_by_lang[lc])}</a>'
                for lc in ALL_LANGS
            )

            page_html = f"""<!DOCTYPE html>
<html lang="{lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{esc(page_title)}</title>
  <meta name="description" content="{esc(summary_text)}">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <meta name="theme-color" content="#1a2736">
  <link rel="canonical" href="{canonical_url}">
  {hreflang_links_html}
  <link rel="icon" href="/favicon.ico" sizes="48x48">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" sizes="any">
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
  <meta property="og:type" content="article">
  <meta property="og:url" content="{canonical_url}">
  <meta property="og:site_name" content="FISHAO Tracker & Wiki">
  <meta property="og:title" content="{esc(page_title)}">
  <meta property="og:description" content="{esc(summary_text)}">
  <meta property="og:image" content="{SITE_ORIGIN}/images/fish_{fid}.webp">
  <meta property="og:locale" content="{cfg['og_locale']}">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="{esc(page_title)}">
  <meta name="twitter:description" content="{esc(summary_text)}">
  <meta name="twitter:image" content="{SITE_ORIGIN}/images/fish_{fid}.webp">
  <script type="application/ld+json">{schema_json}</script>
  <link rel="stylesheet" href="/{css_name}">
  <style>
    .wiki-wrap {{ max-width: 960px; margin: 0 auto; }}
    .wiki-topbar {{ display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 20px; padding-bottom: 14px; border-bottom: 1px solid var(--border); }}
    .wiki-nav-links {{ display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }}
    .wiki-link-pill {{ display: inline-flex; align-items: center; gap: 6px; padding: 7px 13px; border-radius: 8px; background: #151f33; border: 1px solid var(--border-strong); color: #e2e8f0; text-decoration: none; font-size: 13px; font-weight: 600; transition: all .15s; }}
    .wiki-link-pill:hover {{ border-color: #38bdf8; color: #fff; background: #1c2942; }}
    .wiki-link-pill.primary {{ background: #0369a1; border-color: #38bdf8; color: #fff; }}
    .wiki-link-pill.primary:hover {{ background: #0284c7; }}
    .wiki-card {{ background: #101726; border: 1px solid var(--border-strong); border-radius: 14px; padding: 22px; }}
    .wiki-hero {{ display: flex; gap: 22px; align-items: center; flex-wrap: wrap; margin-bottom: 18px; }}
    .wiki-fish-img-box {{ width: 168px; height: 96px; border-radius: 12px; background: #0c121e; border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; padding: 8px; flex-shrink: 0; }}
    .wiki-fish-img-box img {{ max-width: 100%; max-height: 100%; object-fit: contain; }}
    .wiki-title-block h1 {{ font-size: 26px; font-weight: 800; color: #fff; margin: 4px 0 6px 0; line-height: 1.2; }}
    .wiki-summary {{ font-size: 15px; color: #cbd5e1; line-height: 1.6; margin: 0 0 18px 0; }}
    .wiki-h2 {{ font-size: 16px; font-weight: 700; color: #38bdf8; margin: 0 0 12px 0; }}
    .wiki-specs-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 10px; }}
    .wiki-spec-item {{ background: #151f33; border: 1px solid var(--border); border-radius: 10px; padding: 11px 14px; display: flex; flex-direction: column; gap: 4px; }}
    .wiki-spec-label {{ font-size: 12px; color: var(--text-muted); font-weight: 600; }}
    .wiki-spec-val {{ font-size: 14px; color: #f8fafc; font-weight: 600; }}
    .wiki-langs-row {{ display: flex; gap: 10px; flex-wrap: wrap; margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--border); }}
    .wiki-lang-chip {{ display: inline-flex; align-items: center; gap: 6px; padding: 5px 11px; border-radius: 8px; background: #0c121e; border: 1px solid var(--border); color: #cbd5e1; text-decoration: none; font-size: 13px; }}
    .wiki-lang-chip:hover, .wiki-lang-chip.current {{ border-color: #38bdf8; color: #fff; }}
    .wiki-rel-grid {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 8px; }}
    .wiki-rel-chip {{ display: flex; align-items: center; gap: 8px; padding: 7px 10px; border-radius: 8px; background: #151f33; border: 1px solid var(--border); color: #e2e8f0; text-decoration: none; font-size: 13px; font-weight: 600; }}
    .wiki-rel-chip:hover {{ border-color: #38bdf8; background: #1c2942; }}
    .wiki-rel-chip img {{ object-fit: contain; flex-shrink: 0; }}
  </style>
</head>
<body>
  <div class="wiki-wrap">
    <header class="wiki-topbar">
      <div class="wiki-nav-links">
        <a href="{cfg['home_path']}" class="wiki-link-pill">{esc(lbl["back_tracker"])}</a>
        <a href="{cfg['catalog_path']}" class="wiki-link-pill">{esc(lbl["all_fishes_link"])}</a>
      </div>
      <div class="wiki-nav-links">
        {topbar_lang_chips_html}
      </div>
    </header>

    <main>
      <article class="wiki-card">
        <div class="wiki-hero">
          <div class="wiki-fish-img-box">
            <img src="/images/fish_{fid}.webp" alt="{esc(fname)}" width="150" height="84">
          </div>
          <div class="wiki-title-block">
            <span class="footer-tag" style="font-size:11px;">{esc(lbl["wiki_badge"])} • #{fid}</span>
            <h1>{esc(fname)}{esc(alt_for_title)}</h1>
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
              <span style="color:#fbbf24;font-weight:700;font-size:14px;">{stars_str} ({rating}/5)</span>
              {f'<span class="badge-club-tag">{esc(t("badge_club_fish"))}</span>' if f.get("is_club") else ""}
            </div>
          </div>
        </div>

        <p class="wiki-summary">{esc(summary_text)}</p>

        <div style="margin-bottom: 20px;">
          <a href="{tracker_fish_url}" class="wiki-link-pill primary">{esc(lbl["open_fish_btn"])}</a>
        </div>

        <h2 class="wiki-h2">{esc(lbl["sec_overview"])}</h2>
        <div class="wiki-specs-grid">
          <div class="wiki-spec-item">
            <span class="wiki-spec-label">🌊 {esc(lbl["lbl_locations"])}</span>
            <span class="wiki-spec-val">{locs_chips_html}</span>
          </div>
          {area_row_html}
          <div class="wiki-spec-item">
            <span class="wiki-spec-label">🪱 {esc(lbl["lbl_baits"])}</span>
            <span class="wiki-spec-val" style="display:flex;gap:4px;flex-wrap:wrap;">{baits_chips_html}</span>
          </div>
          <div class="wiki-spec-item">
            <span class="wiki-spec-label">⏰ {esc(lbl["lbl_time"])}</span>
            <span class="wiki-spec-val">{"🌙 " if f.get("is_night") else "☀️ "}{esc(time_str)}</span>
          </div>
          <div class="wiki-spec-item">
            <span class="wiki-spec-label">📅 {esc(lbl["lbl_season"])}</span>
            <span class="wiki-spec-val">{esc(date_text)}</span>
          </div>
          <div class="wiki-spec-item">
            <span class="wiki-spec-label">📏 {esc(lbl["lbl_size"])}</span>
            <span class="wiki-spec-val">{f["min_l"]} cm / <strong style="color:#38bdf8;">{f["avg_l"]} cm</strong> / {f["max_l"]} cm</span>
          </div>
          <div class="wiki-spec-item">
            <span class="wiki-spec-label">💵 {esc(lbl["lbl_est_price"])}</span>
            <span class="wiki-spec-val" style="color:#34d399;">{esc(est_str)}</span>
          </div>
          <div class="wiki-spec-item">
            <span class="wiki-spec-label">✨ {esc(lbl["lbl_rarity"])}</span>
            <span class="wiki-spec-val">{esc(rarity_str)}</span>
          </div>
          {club_row_html}
        </div>

        <div class="wiki-langs-row">
          <span style="font-size:12px;color:var(--text-muted);font-weight:600;align-self:center;">{esc(lbl["names_in_langs"])}:</span>
          {bottom_lang_chips_html}
        </div>
      </article>

      {related_html}
    </main>
  </div>
  {CF_ANALYTICS_SNIPPET}
</body>
</html>
"""
            rel_out = fish_paths[lang][fid].lstrip("/")
            dest_file = out_dir / rel_out / "index.html"
            dest_file.parent.mkdir(parents=True, exist_ok=True)
            dest_file.write_text(page_html, encoding="utf-8")

    # Generate catalog index pages for all supported languages
    catalog_alternates = {l: f"{SITE_ORIGIN}{LANG_CONFIG[l]['catalog_path']}" for l in ALL_LANGS}
    sitemap_entries.insert(0, {
        "locs": catalog_alternates,
        "priority": "0.9",
        "changefreq": "weekly",
    })

    cat_hreflang_html = "\n  ".join(
        [f'<link rel="alternate" hreflang="{lc}" href="{catalog_alternates[lc]}">' for lc in ALL_LANGS]
        + [f'<link rel="alternate" hreflang="x-default" href="{catalog_alternates["cs"]}">']
    )

    for lang in ALL_LANGS:
        cfg = LANG_CONFIG[lang]
        lbl = WIKI_PAGE_Labels[lang]
        canonical_url = catalog_alternates[lang]
        cat_lang_chips_html = "\n        ".join(
            f'<a href="{LANG_CONFIG[lc]["catalog_path"]}" class="wiki-lang-chip{" current" if lang == lc else ""}" hreflang="{lc}">{LANG_CONFIG[lc]["flag"]} {LANG_CONFIG[lc]["short"]}</a>'
            for lc in ALL_LANGS
        )

        sorted_f = sorted(fishes, key=lambda x: slugify(get_fish_name(x, fish_names, lang)))
        cards_html = []
        for f in sorted_f:
            fid = f["id"]
            fname = get_fish_name(f, fish_names, lang)
            alt = get_alt_fish_name(f, fish_names, lang)
            alt_html = f' <span style="color:var(--text-muted);font-weight:400;font-size:12px;">({esc(alt)})</span>' if alt else ""
            locs = f.get("locations") or []
            loc_str = ", ".join(get_loc_name(lk, taxonomies, lang) for lk in locs)
            cards_html.append(
                f'<a href="{fish_paths[lang][fid]}" class="wiki-cat-item">'
                f'<img src="/images/fish_{fid}.webp" alt="{esc(fname)}" width="64" height="36" loading="lazy">'
                f'<div class="wiki-cat-info">'
                f'<div class="wiki-cat-name">#{fid} {esc(fname)}{alt_html}</div>'
                f'<div class="wiki-cat-sub">{f.get("rating",1)}★ • {esc(loc_str)}</div>'
                f"</div></a>"
            )

        cat_html = f"""<!DOCTYPE html>
<html lang="{lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{esc(lbl["catalog_title"])}</title>
  <meta name="description" content="{esc(lbl["catalog_desc"])}">
  <meta name="robots" content="index, follow">
  <meta name="theme-color" content="#1a2736">
  <link rel="canonical" href="{canonical_url}">
  {cat_hreflang_html}
  <link rel="icon" href="/favicon.ico" sizes="48x48">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" sizes="any">
  <link rel="stylesheet" href="/{css_name}">
  <style>
    .wiki-wrap {{ max-width: 1280px; margin: 0 auto; }}
    .wiki-topbar {{ display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 20px; padding-bottom: 14px; border-bottom: 1px solid var(--border); }}
    .wiki-link-pill {{ display: inline-flex; align-items: center; gap: 6px; padding: 7px 13px; border-radius: 8px; background: #0369a1; border: 1px solid #38bdf8; color: #fff; text-decoration: none; font-size: 13px; font-weight: 600; }}
    .wiki-lang-chip {{ display: inline-flex; align-items: center; gap: 6px; padding: 5px 11px; border-radius: 8px; background: #0c121e; border: 1px solid var(--border); color: #cbd5e1; text-decoration: none; font-size: 13px; }}
    .wiki-lang-chip.current {{ border-color: #38bdf8; color: #fff; }}
    .wiki-cat-grid {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 10px; margin-top: 18px; }}
    .wiki-cat-item {{ display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 10px; background: #101726; border: 1px solid var(--border); color: #f8fafc; text-decoration: none; transition: border-color .15s, background .15s; }}
    .wiki-cat-item:hover {{ border-color: #38bdf8; background: #151f33; }}
    .wiki-cat-item img {{ object-fit: contain; flex-shrink: 0; }}
    .wiki-cat-name {{ font-size: 14px; font-weight: 700; color: #fff; }}
    .wiki-cat-sub {{ font-size: 12px; color: var(--text-muted); margin-top: 2px; }}
  </style>
</head>
<body>
  <div class="wiki-wrap">
    <header class="wiki-topbar">
      <a href="{cfg['home_path']}" class="wiki-link-pill">{esc(lbl["back_tracker"])}</a>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        {cat_lang_chips_html}
      </div>
    </header>
    <main>
      <h1 style="font-size:26px;font-weight:800;color:#fff;margin-bottom:6px;">{esc(lbl["catalog_h1"])}</h1>
      <p style="font-size:14px;color:#cbd5e1;margin-bottom:16px;">{esc(lbl["catalog_lead"])}</p>
      <div class="wiki-cat-grid">
        {"".join(cards_html)}
      </div>
    </main>
  </div>
  {CF_ANALYTICS_SNIPPET}
</body>
</html>
"""
        cat_rel = cfg["catalog_path"].lstrip("/")
        cat_file = out_dir / cat_rel / "index.html"
        cat_file.parent.mkdir(parents=True, exist_ok=True)
        cat_file.write_text(cat_html, encoding="utf-8")

    return sitemap_entries


def generate_sitemap(out_dir: pathlib.Path, wiki_entries: list) -> None:
    today = datetime.date.today().isoformat()
    esc = html_lib.escape

    home_alternates = {lc: f"{SITE_ORIGIN}{LANG_CONFIG[lc]['home_path']}" for lc in ALL_LANGS}

    all_groups = [
        {
            "locs": home_alternates,
            "priority": "1.0",
            "changefreq": "daily",
            "image": f"{SITE_ORIGIN}/images/og-preview.png",
            "image_title": "FISHAO Tracker – Wiki & Encyklopedie ryb, Fish Market ceník a Kluby",
        }
    ] + wiki_entries

    url_blocks = []
    for grp in all_groups:
        locs = grp["locs"]
        xhtml_links = "\n".join(
            [f'    <xhtml:link rel="alternate" hreflang="{lc}" href="{locs[lc]}"/>' for lc in ALL_LANGS]
            + [f'    <xhtml:link rel="alternate" hreflang="x-default" href="{locs["cs"]}"/>']
        )
        img_block = ""
        if grp.get("image"):
            img_block = (
                f"\n    <image:image>\n"
                f"      <image:loc>{esc(grp['image'])}</image:loc>\n"
                f"      <image:title>{esc(grp.get('image_title', 'FISHAO'))}</image:title>\n"
                f"    </image:image>"
            )

        for lang in ALL_LANGS:
            url_blocks.append(
                f"  <url>\n"
                f"    <loc>{locs[lang]}</loc>\n"
                f"{xhtml_links}{img_block}\n"
                f"    <lastmod>{today}</lastmod>\n"
                f"    <changefreq>{grp['changefreq']}</changefreq>\n"
                f"    <priority>{grp['priority']}</priority>\n"
                f"  </url>"
            )

    sitemap_xml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n'
        '        xmlns:xhtml="http://www.w3.org/1999/xhtml"\n'
        '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n'
        + "\n".join(url_blocks)
        + "\n</urlset>\n"
    )
    (out_dir / "sitemap.xml").write_text(sitemap_xml, encoding="utf-8")


def build(out_dir: pathlib.Path) -> None:
    if out_dir.exists():
        shutil.rmtree(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    dist_dir = out_dir / "dist"
    dist_dir.mkdir(parents=True, exist_ok=True)

    esbuild_bin = shutil.which("esbuild") or ""
    if not esbuild_bin:
        local_esbuild = ROOT / "node_modules" / ".bin" / ("esbuild.cmd" if os.name == "nt" else "esbuild")
        if local_esbuild.exists():
            esbuild_bin = str(local_esbuild)

    # 1. Bundle CSS
    css_parts = []
    for rel in CSS_FILES:
        p = ROOT / rel
        css_parts.append(f"/* {rel} */\n" + p.read_text(encoding="utf-8"))
    css_bundle = minify_css("\n".join(css_parts), esbuild_bin)
    css_hash = short_hash(css_bundle)
    css_name = f"dist/app.{css_hash}.min.css"
    (out_dir / css_name).write_text(css_bundle, encoding="utf-8")

    # 2. Bundle JS (safe concatenation preserving semicolon boundaries)
    js_parts = []
    for rel in JS_FILES:
        p = ROOT / rel
        content = p.read_text(encoding="utf-8").strip()
        if not content.endswith(";"):
            content += ";"
        js_parts.append(f"/* {rel} */\n{content}")
    js_bundle = minify_js("\n".join(js_parts), esbuild_bin)
    js_hash = short_hash(js_bundle)
    js_name = f"dist/app.{js_hash}.min.js"
    (out_dir / js_name).write_text(js_bundle, encoding="utf-8")

    # 2b. Hash lazy i18n bundles into dist/ so they can be cached immutably
    i18n_bundles = {}
    for lang_code in [c for c in ALL_LANGS if c != "cs"]:
        rel_lang = ROOT / "data" / "i18n" / f"ui_{lang_code}.js"
        if rel_lang.exists():
            lang_src = minify_js(rel_lang.read_text(encoding="utf-8"), esbuild_bin)
            lang_hash = short_hash(lang_src)
            lang_dist_name = f"dist/ui_{lang_code}.{lang_hash}.min.js"
            (out_dir / lang_dist_name).write_text(lang_src, encoding="utf-8")
            i18n_bundles[lang_code] = lang_dist_name

    build_version = f"{css_hash[:6]}-{js_hash[:6]}"

    # 3. Write version.json
    (out_dir / "version.json").write_text(
        json.dumps({"version": build_version}, indent=2) + "\n",
        encoding="utf-8",
    )

    # 4. Load i18n dictionaries & fish data for static pre-rendering
    ui_dicts, taxonomies, fish_names, fishes, est_prices = load_i18n_and_data()
    base_html = (ROOT / "index.html").read_text(encoding="utf-8")

    # 4a. Generate localized SPA landing pages for all supported languages
    for lang_code in ALL_LANGS:
        out_rel = "index.html" if lang_code == "cs" else f"{lang_code}/index.html"
        extra_js = i18n_bundles.get(lang_code, "") if lang_code != "cs" else ""
        localized_html = localize_index_html(
            base_html=base_html,
            lang=lang_code,
            ui_dicts=ui_dicts,
            fishes=fishes,
            fish_names=fish_names,
            taxonomies=taxonomies,
            est_prices=est_prices,
            css_name=css_name,
            js_name=js_name,
            extra_lang_js=extra_js,
            build_version=build_version,
            i18n_bundles=i18n_bundles,
        )
        target_path = out_dir / out_rel
        target_path.parent.mkdir(parents=True, exist_ok=True)
        target_path.write_text(localized_html, encoding="utf-8")

    # 4b. Generate static fish wiki pages & catalogs across all supported languages
    wiki_entries = generate_wiki_pages(
        out_dir=out_dir,
        fishes=fishes,
        fish_names=fish_names,
        taxonomies=taxonomies,
        est_prices=est_prices,
        ui_dicts=ui_dicts,
        css_name=css_name,
    )

    # 5. Copy static directories and files
    for d in STATIC_COPY_DIRS:
        src = ROOT / d
        if src.exists():
            shutil.copytree(src, out_dir / d)

    for f in STATIC_COPY_FILES:
        src = ROOT / f
        if src.exists():
            dst = out_dir / f
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dst)

    # 6. Generate complete sitemap.xml
    generate_sitemap(out_dir, wiki_entries)

    print(
        f"Built {out_dir}: {css_name} ({len(css_bundle)/1024:.1f} KB), "
        f"{js_name} ({len(js_bundle)/1024:.1f} KB), "
        f"{len(ALL_LANGS)} localized landing pages + {len(fishes)*len(ALL_LANGS)} fish wiki pages, version={build_version}"
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Build FISHAO static dist")
    parser.add_argument("--out", default="_site", help="Output directory")
    args = parser.parse_args()
    build(pathlib.Path(args.out).resolve())


if __name__ == "__main__":
    main()
