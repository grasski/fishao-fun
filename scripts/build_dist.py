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
import subprocess

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
]


def minify_css_python(css: str) -> str:
    # Preserve quoted strings & data/url literals, strip comments cleanly
    css = re.sub(r"/\*[\s\S]*?\*/", "", css)
    tokens = []
    def _save_str(m):
        tokens.append(m.group(0))
        return f"__CSS_TOK_{len(tokens)-1}__"
    css = re.sub(r'"[^"\n]*"|\'[^\'\n]*\'', _save_str, css)
    css = re.sub(r"\s+", " ", css)
    # Never strip whitespace BEFORE ':' so descendant pseudo-selectors like '.a :hover' survive
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
    for lang_code in ("en", "pl"):
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

    # Replace modular JS <script> block with version marker, i18n map + single bundled JS
    js_block_re = re.compile(
        r"<!-- Data scripts and localization.*?</body>",
        re.DOTALL,
    )
    i18n_bundles_json = json.dumps(i18n_bundles, separators=(",", ":"))
    html, js_n = js_block_re.subn(
        f'<script>window.FISHAO_APP_VERSION="{build_version}";window.FISHAO_I18N_BUNDLES={i18n_bundles_json};</script>\n'
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
