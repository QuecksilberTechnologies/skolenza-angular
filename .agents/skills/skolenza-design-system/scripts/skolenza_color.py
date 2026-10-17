#!/usr/bin/env python3
"""Skolenza colour tooling — palette expansion and WCAG contrast checking.

Implements the exact `palette()` algorithm from `@openng/optimus-ui-styled`, so `ramp`
output matches what the app generates at runtime in `src/app/app.ts`:

    updatePreset({ semantic: { primary: palette(brandColor) } })

Python 3.8+, standard library only.

    python skolenza_color.py ramp  "#4287f5"
    python skolenza_color.py check "#22c55e" "#ffffff"
    python skolenza_color.py audit
"""

from __future__ import annotations

import argparse
import re
import sys
from typing import Dict, List, Tuple

# --- Reference surfaces -------------------------------------------------------------

WHITE = "#ffffff"
SLATE_900 = "#0f172a"  # dark theme card surface (.dark remaps zinc-* to slate)
SLATE_950 = "#020617"  # dark theme page ground

# Stops, in the order @openng/optimus-ui-styled emits them.
STOPS: Tuple[int, ...] = (50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950)

HEX_RE = re.compile(r"^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$")


# --- Colour primitives --------------------------------------------------------------


def parse_hex(value: str) -> Tuple[int, int, int]:
    """Accept #rgb, #rrggbb, or the same without the leading hash."""
    match = HEX_RE.match(value.strip())
    if not match:
        raise ValueError(f"not a hex colour: {value!r}")
    digits = match.group(1)
    if len(digits) == 3:
        digits = "".join(c * 2 for c in digits)
    return tuple(int(digits[i : i + 2], 16) for i in (0, 2, 4))  # type: ignore[return-value]


def to_hex(rgb: Tuple[int, int, int]) -> str:
    return "#%02x%02x%02x" % rgb


def mix(color_a: str, color_b: str, weight: float) -> str:
    """Port of `mix()` in @openng/optimus-ui-styled.

    `weight` is the percentage of `color_a` in the result.
    """
    ratio = weight / 100
    inverse = 1 - ratio
    a, b = parse_hex(color_a), parse_hex(color_b)
    return to_hex(tuple(round(a[i] * ratio + b[i] * inverse) for i in range(3)))  # type: ignore[arg-type]


def tint(color: str, weight: float) -> str:
    """Mix toward white. `weight` is the percentage of white."""
    return mix(WHITE, color, weight)


def shade(color: str, weight: float) -> str:
    """Mix toward black. `weight` is the percentage of black."""
    return mix("#000000", color, weight)


def palette(brand: str) -> Dict[int, str]:
    """Expand one hex into the eleven stops Optimus generates.

    Below 500 the colour is tinted by (5 - index) * 19 percent; above 500 it is shaded
    by (index - 5) * 15 percent. 500 is the brand hex, untouched.
    """
    parse_hex(brand)  # validate early
    ramp: Dict[int, str] = {}
    for index, stop in enumerate(STOPS):
        if index <= 5:
            ramp[stop] = tint(brand, (5 - index) * 19)
        else:
            ramp[stop] = shade(brand, (index - 5) * 15)
    return ramp


# --- WCAG ---------------------------------------------------------------------------


def relative_luminance(color: str) -> float:
    def channel(value: int) -> float:
        srgb = value / 255
        return srgb / 12.92 if srgb <= 0.04045 else ((srgb + 0.055) / 1.055) ** 2.4

    r, g, b = parse_hex(color)
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)


def contrast_ratio(color_a: str, color_b: str) -> float:
    lighter, darker = sorted(
        (relative_luminance(color_a), relative_luminance(color_b)), reverse=True
    )
    return (lighter + 0.05) / (darker + 0.05)


def verdict(ratio: float, *, large: bool = False, ui: bool = False) -> str:
    """AA verdict. Large text and non-text UI both need 3:1; body text needs 4.5:1."""
    threshold = 3.0 if (large or ui) else 4.5
    return "PASS" if ratio >= threshold else "FAIL"


def mark(ratio: float, *, large: bool = False, ui: bool = False) -> str:
    return "OK " if verdict(ratio, large=large, ui=ui) == "PASS" else "!! "


# --- Commands -----------------------------------------------------------------------


def cmd_ramp(args: argparse.Namespace) -> int:
    brand = args.brand
    ramp = palette(brand)

    gate = contrast_ratio(brand, WHITE)
    print(f"\nBrand {to_hex(parse_hex(brand))} -> palette()\n")
    print(f"{'stop':>5}  {'hex':<9} {'rgb':<20} {'on white':>9} {'on 0f172a':>10} {'on 020617':>10}")
    print("-" * 70)
    for stop in STOPS:
        value = ramp[stop]
        r, g, b = parse_hex(value)
        print(
            f"{stop:>5}  {value:<9} {f'rgb({r}, {g}, {b})':<20}"
            f" {contrast_ratio(value, WHITE):>9.2f}"
            f" {contrast_ratio(value, SLATE_900):>10.2f}"
            f" {contrast_ratio(value, SLATE_950):>10.2f}"
        )

    print("\nRole mapping")
    # Mirrors accessiblePrimaryStop() in src/app/shared/utilities/color.ts.
    stop = next((s for s in (500, 600, 700, 800) if contrast_ratio(WHITE, ramp[s]) >= 4.5), 800)
    print(
        f"  light  primary.color   = {stop} {ramp[stop]}   hover {stop + 100} {ramp[stop + 100]}"
        f"   active {stop + 200} {ramp[stop + 200]}"
    )
    print(f"  dark   primary.color   = 400 {ramp[400]}   hover 300 {ramp[300]}   active 200 {ramp[200]}")

    print("\nChecks")
    white_on_500 = contrast_ratio(WHITE, ramp[500])
    chip = contrast_ratio(ramp[700], ramp[50])
    dark_primary = contrast_ratio(ramp[400], SLATE_900)
    print(f"  {mark(gate, ui=True)}brand gate        brand vs white      {gate:5.2f}  (must be >= 3.00)")
    white_on_primary = contrast_ratio(WHITE, ramp[stop])
    print(f"  {mark(white_on_500)}white on primary-500                  {white_on_500:5.2f}  (small text needs 4.50)")
    print(f"  {mark(white_on_primary)}white on primary.color ({stop})        {white_on_primary:5.2f}  (what the app renders)")
    print(f"  {mark(chip)}chip  primary-700 on primary-50        {chip:5.2f}")
    print(f"  {mark(dark_primary)}dark  primary-400 on slate-900        {dark_primary:5.2f}")

    if gate < 3.0:
        print(
            f"\nREJECT: {brand} is {gate:.2f}:1 against white. Below the 3.0 gate, white-on-primary"
            "\n        buttons fail even the large-text threshold. Ask the institution for a darker hex."
        )
        return 1
    if stop != 500:
        print(
            f"\nNOTE: white on primary-500 is {white_on_500:.2f}:1, so the app's light primary.color"
            f"\n      steps to {stop} ({ramp[stop]}). Never hard-code primary-500 under white text."
        )
    print()
    return 0


def cmd_check(args: argparse.Namespace) -> int:
    ratio = contrast_ratio(args.foreground, args.background)
    kind = "large text / UI" if (args.large or args.ui) else "body text"
    threshold = 3.0 if (args.large or args.ui) else 4.5
    result = verdict(ratio, large=args.large, ui=args.ui)

    print(f"\n  {args.foreground} on {args.background}")
    print(f"  {ratio:.2f}:1   AA {kind} needs {threshold:.1f}:1   -> {result}\n")

    if result == "FAIL":
        hint_light = "darken the foreground (use the -700 stop for semantic colours)"
        hint_dark = "lighten the foreground (use the -400 stop)"
        background_is_dark = relative_luminance(args.background) < 0.18
        print(f"  Fix: {hint_dark if background_is_dark else hint_light}\n")
        return 1
    return 0


AUDIT_PAIRS: List[Tuple[str, str, str, bool]] = [
    # label, foreground, background, is_large_or_ui
    # A11Y-01/02 fixed: progress-tone.ts now uses -700 text
    ("A11Y-01  completion % label (>=80)", "#15803d", WHITE, False),
    ("A11Y-02  completion % label (70-79)", "#b45309", WHITE, False),
    ("A11Y-03  badge 'Joined Today'", WHITE, "#22c55e", False),
    ("A11Y-04  badge 'Joined 2d ago'", WHITE, "#f59e0b", False),
    ("A11Y-05  badge 'Joined Yesterday'", WHITE, "#3b82f6", False),
    ("A11Y-07  'No role assigned'", "#9ca3af", WHITE, False),
    ("         role chip, light", "#2e5eac", "#f6f9fe", False),
    # primary-900 at 30% alpha composited over slate-900 -> #12203b
    ("         role chip, dark", "#aecbfb", "#12203b", False),
    ("         muted text, light", "#71717a", "#fafafa", False),
    ("         muted text, dark", "#94a3b8", SLATE_900, False),
    ("         table cell text, dark", "#f1f5f9", SLATE_900, False),
    ("         proposed info text", WHITE, "#2563eb", False),
]


def cmd_audit(_: argparse.Namespace) -> int:
    print("\nSkolenza contrast audit — known pairs\n")
    failures = 0
    for label, foreground, background, large in AUDIT_PAIRS:
        ratio = contrast_ratio(foreground, background)
        state = verdict(ratio, large=large)
        if state == "FAIL":
            failures += 1
        print(f"  {mark(ratio, large=large)}{label:<38} {foreground} on {background}  {ratio:5.2f}:1  {state}")

    print(f"\n  {failures} failing pair(s) of {len(AUDIT_PAIRS)}.")
    if failures:
        print("  See references/open-items.md and references/accessibility.md for the fixes.\n")
        return 1
    print()
    return 0


def main(argv: List[str]) -> int:
    parser = argparse.ArgumentParser(
        prog="skolenza_color.py",
        description="Skolenza palette expansion and WCAG contrast checking.",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    ramp = sub.add_parser("ramp", help="expand an institution brand hex into the runtime palette")
    ramp.add_argument("brand", help="brand hex, e.g. '#4287f5'")
    ramp.set_defaults(func=cmd_ramp)

    check = sub.add_parser("check", help="contrast-check a foreground/background pair")
    check.add_argument("foreground")
    check.add_argument("background")
    check.add_argument("--large", action="store_true", help="text is >=24px, or >=18.66px bold")
    check.add_argument("--ui", action="store_true", help="non-text UI boundary, icon, or chart fill")
    check.set_defaults(func=cmd_check)

    audit = sub.add_parser("audit", help="re-run the known audit pairs from the app")
    audit.set_defaults(func=cmd_audit)

    args = parser.parse_args(argv)
    try:
        return args.func(args)
    except ValueError as error:
        print(f"error: {error}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
