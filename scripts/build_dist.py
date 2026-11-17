#!/usr/bin/env python3
"""
FISHAO - Production Bundle Builder (scripts/build_dist.py)
----------------------------------------------------------
Concatenates and lightly minifies modular CSS and JS files into hashed
bundles under dist/, writes version.json, and outputs a ready-to-deploy
static directory (_site by default) for GitHub Pages.

Usage:
  python scripts/build_dist.py --out _site
"""

import argparse
import hashlib
import json
import os
import pathlib
import re
import shutil

ROOT = pathlib.Path(__file__).resolve().parent.parent

CSS_FILES = [
    "css/base.css",
    "css/header.css",
    "css/nav.css",
    "css/filters.css",
    "css/table.css",
    "css/clubs.css",
    "css/players.css",
    "css/modals.css",
    "css/locations-calendar.css",
    "css/responsive.css",
]

JS_FILES = [
    "data/i18n/ui_cs.js",
    "data/i18n/taxonomies.js",
    "data/i18n/fish_names.js",
    "data/i18n.js",
    "data/fishes.js",
    "data/prices.js",
    "data/estimated_prices.js",
    "firebase-config.js",
    "js/state.js",
    "js/firestore-tx.js",
    "js/table.js",
    "js/clubs.js",
    "js/market.js",
    "js/filters.js",
    "js/auth.js",
    "js/players.js",
    "js/locations.js",
    "js/calendar.js",
    "js/reminders.js",
    "js/main.js",
]

STATIC_COPY_DIRS = ["images"]
STATIC_COPY_FILES = [
    "sw.js",
    "CNAME",
    "robots.txt",
    "sitemap.xml",
    "favicon.ico",
    "favicon.svg",
    "favicon-48x48.png",
    "favicon-96x96.png",
    "apple-touch-icon.png",
    "data/i18n/ui_en.js",
    "data/i18n/ui_pl.js",
]


def minify_css(css: str) -> str:
    # Remove CSS comments and collapse whitespace safely
    css = re.sub(r"/\*[\s\S]*?\*/", "", css)
    css = re.sub(r"\s+", " ", css)
    css = re.sub(r"\s*([{:;,}])\s*", r"\1", css)
    css = css.replace(";}", "}")
    return css.strip()


def short_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:10]


def build(out_dir: pathlib.Path) -> None:
    if out_dir.exists():
        shutil.rmtree(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    dist_dir = out_dir / "dist"
    dist_dir.mkdir(parents=True, exist_ok=True)

    # 1. Bundle CSS
    css_parts = []
    for rel in CSS_FILES:
        p = ROOT / rel
        css_parts.append(f"/* {rel} */\n" + p.read_text(encoding="utf-8"))
    css_bundle = minify_css("\n".join(css_parts))
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
    js_bundle = "\n".join(js_parts)
    js_hash = short_hash(js_bundle)
    js_name = f"dist/app.{js_hash}.min.js"
    (out_dir / js_name).write_text(js_bundle, encoding="utf-8")

    build_version = f"{css_hash[:6]}-{js_hash[:6]}"

    # 3. Write version.json
    (out_dir / "version.json").write_text(
        json.dumps({"version": build_version}, indent=2) + "\n",
        encoding="utf-8",
    )

    # 4. Rewrite index.html
    html = (ROOT / "index.html").read_text(encoding="utf-8")

    # Replace modular CSS <link> block with single bundled CSS
    css_block_re = re.compile(
        r"<!-- Modern Modular Stylesheets -->[\s\S]*?</head>",
        re.MULTILINE,
    )
    html, css_n = css_block_re.subn(
        f'<!-- Bundled Stylesheet -->\n  <link rel="stylesheet" href="{css_name}">\n</head>',
        html,
    )
    if css_n != 1:
        raise RuntimeError("Could not locate CSS block in index.html")

    # Replace modular JS <script> block with version marker + single bundled JS
    js_block_re = re.compile(
        r"<!-- Data scripts and localization.*?</body>",
        re.DOTALL,
    )
    html, js_n = js_block_re.subn(
        f'<script>window.FISHAO_APP_VERSION="{build_version}";</script>\n'
        f'  <script defer src="{js_name}"></script>\n\n</body>',
        html,
    )
    if js_n != 1:
        raise RuntimeError("Could not locate JS block in index.html")

    (out_dir / "index.html").write_text(html, encoding="utf-8")

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

    print(
        f"Built {out_dir}: {css_name} ({len(css_bundle)/1024:.1f} KB), "
        f"{js_name} ({len(js_bundle)/1024:.1f} KB), version={build_version}"
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Build FISHAO static dist")
    parser.add_argument("--out", default="_site", help="Output directory")
    args = parser.parse_args()
    build(pathlib.Path(args.out).resolve())


if __name__ == "__main__":
    main()
