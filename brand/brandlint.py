#!/usr/bin/env python3
"""Graph of Life — brand gate.

Machine check for artifacts produced by any agent (Codex, Claude, Gemini, GPT).
Taste does not travel between models; a linter does.

    python brand/brandlint.py dist/*.html src/**/*.css deck_builder.py

Exit 0 = shippable. Exit 1 = brand violation.
"""

import re
import sys
from pathlib import Path

ALLOWED_HEX = {
    "#0E2A47", "#08203A", "#243B4A", "#5C6E78",
    "#1AA89B", "#0E7A70", "#3AD6A3", "#0F8059",
    "#E8694D", "#C2442A", "#F2A24E", "#A86410",
    "#E9E1CC", "#F7F6F2", "#FBFAF6", "#EAF1F1", "#D7DEE2",
    "#FFFFFF", "#000000",
}

CORAL = {"#E8694D", "#C2442A"}
AMBER = {"#F2A24E", "#A86410"}

BANNED_FAMILIES = [
    "georgia", "times new roman", "times", "garamond", "merriweather",
    "playfair", "baskerville", "cambria", "didot", "bodoni",
    "inter", "helvetica", "roboto", "poppins", "montserrat", "lato",
    "open sans", "source sans", "nunito", "system-ui", "ui-sans-serif",
]
FAMILY_RE = re.compile(r"\b(" + "|".join(BANNED_FAMILIES) + r")\b", re.IGNORECASE)
# `sans-serif` is a legal fallback keyword; a bare `serif` is not.
BARE_SERIF_RE = re.compile(r"(?<!sans-)(?<!ui-)\bserif\b", re.IGNORECASE)

BANNED_EFFECTS = [
    "linear-gradient", "radial-gradient", "conic-gradient",
    "box-shadow", "text-shadow", "backdrop-filter", "filter: blur",
    "text-transform: capitalize",
]

EMOJI = re.compile(
    "[\U0001F300-\U0001FAFF\U00002600-\U000027BF\U0001F1E6-\U0001F1FF]"
)
HEX_RE = re.compile(r"#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b")
RADIUS_RE = re.compile(r"border-radius:\s*([0-9.]+)px")
GREEN_SMALL_RE = re.compile(
    r"font-size:\s*(\d+)px[^}]*#3AD6A3|#3AD6A3[^}]*font-size:\s*(\d+)px",
    re.IGNORECASE,
)


def norm(h: str) -> str:
    h = h.upper()
    if len(h) == 4:  # #abc -> #AABBCC
        h = "#" + "".join(c * 2 for c in h[1:])
    return h


# The palette definition cannot violate the palette. Linting it is circular.
SOURCE_OF_TRUTH = {"tokens.json", "brand_tokens.py", "brandlint.py"}


def lint(path: Path):
    errors, warnings = [], []
    if path.name in SOURCE_OF_TRUTH:
        return [], []
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
    except OSError as exc:
        return [f"{path}: unreadable ({exc})"], []

    low = text.lower()
    hexes = [norm(h) for h in HEX_RE.findall(text)]

    # 1. palette containment
    for h in sorted(set(hexes)):
        if h not in ALLOWED_HEX:
            errors.append(f"{path}: off-palette colour {h} — resolve from brand/tokens.json")

    # 2. typography
    for fam in sorted({m.group(1).lower() for m in FAMILY_RE.finditer(text)}):
        errors.append(f"{path}: non-brand font family '{fam}' — system is IBM Plex Sans + IBM Plex Mono only")
    if BARE_SERIF_RE.search(text):
        errors.append(f"{path}: bare 'serif' keyword — the system is all-sans, there is no serif in this brand")

    if ("font-family" in low or ".font.name" in low) and "plex mono" not in low:
        warnings.append(f"{path}: no mono face found — the proof voice is missing (metrics, units, sources, eyebrows)")

    # 3. banned effects
    for eff in BANNED_EFFECTS:
        if eff in low:
            errors.append(f"{path}: '{eff}' — the system is flat and structural")

    # 4. radius discipline
    for r in RADIUS_RE.findall(text):
        val = float(r)
        if 2 < val < 900:
            errors.append(f"{path}: border-radius {val}px — allowed: 2px, or 999px for risk chips only")

    # 5. Signal Green must never be small text on light
    for m in GREEN_SMALL_RE.finditer(text):
        size = next((g for g in m.groups() if g), None)
        if size and int(size) < 20:
            errors.append(f"{path}: Signal Green #3AD6A3 at {size}px — fails AA on light; use Green Deep #0F8059")

    # 6. colour budget — coral is scarce by design.
    # Token *declarations* (--gol-x: #hex, "navy": "#hex") define the palette once
    # and must not count as usage; only applied colour counts.
    usage = [
        norm(h)
        for line in text.splitlines()
        if not re.match(r"\s*(--[\w-]+\s*:|\"?[\w_]+\"?\s*:\s*[\"']?#)", line)
        for h in HEX_RE.findall(line)
    ]
    # A ratio over a handful of references is noise, not a budget. Guard the sample.
    if len(usage) >= 15:
        alarm = sum(1 for h in usage if h in CORAL | AMBER)
        share = alarm / len(usage)
        if share > 0.12:
            errors.append(f"{path}: coral/amber is {share:.0%} of colour references (budget ~3%) — if coral is everywhere it means nothing")
        elif share > 0.06:
            warnings.append(f"{path}: coral/amber at {share:.0%} of colour references — check the 70/20/7/3 budget")

    # 7. tone
    if EMOJI.search(text):
        errors.append(f"{path}: emoji present — not part of the system")

    # 8. provenance discipline
    if path.suffix in {".html", ".htm"} and "<table" in low and "provenance" not in low:
        warnings.append(f"{path}: table with no provenance line (SOURCE · METHOD · CONFIDENCE · USE)")

    return errors, warnings


def main(argv):
    paths = [Path(p) for p in argv[1:]]
    if not paths:
        print(__doc__)
        return 0

    all_err, all_warn = [], []
    for p in paths:
        if p.is_file():
            e, w = lint(p)
            all_err += e
            all_warn += w

    for w in all_warn:
        print(f"warn  {w}")
    for e in all_err:
        print(f"FAIL  {e}")

    checked = len([p for p in paths if p.is_file()])
    if all_err:
        print(f"\n{len(all_err)} violation(s) across {checked} file(s). Not shippable.")
        return 1
    print(f"\nBrand gate passed: {checked} file(s), {len(all_warn)} warning(s).")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
