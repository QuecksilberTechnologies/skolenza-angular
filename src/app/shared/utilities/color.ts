export interface Rgb {
  r: number;
  g: number;
  b: number;
}

const HEX_PATTERN = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

/**
 * Accepts `abc`, `#abc`, `7C3AED` or `#7c3aed` and returns a lowercase `#rrggbb`.
 * Returns `null` when the input is not a valid hex color.
 */
export function normalizeHex(input: string): string | null {
  const match = HEX_PATTERN.exec(input.trim());
  if (!match) {
    return null;
  }

  const digits = match[1].toLowerCase();
  const expanded =
    digits.length === 3
      ? digits
          .split('')
          .map((d) => d + d)
          .join('')
      : digits;

  return `#${expanded}`;
}

export function hexToRgb(hex: string): Rgb | null {
  const normalized = normalizeHex(hex);
  if (!normalized) {
    return null;
  }

  return {
    r: parseInt(normalized.slice(1, 3), 16),
    g: parseInt(normalized.slice(3, 5), 16),
    b: parseInt(normalized.slice(5, 7), 16),
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (channel: number) => Math.round(channel).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Parses `124, 58, 237`, `124 58 237` or `rgb(124, 58, 237)` into `#rrggbb`.
 * Returns `null` when the input is malformed or any channel falls outside 0-255.
 */
export function parseRgbInput(input: string): string | null {
  const channels = input
    .trim()
    .replace(/^rgba?\(/i, '')
    .replace(/\)$/, '')
    .split(/[\s,]+/)
    .filter((part) => part !== '');

  if (channels.length !== 3) {
    return null;
  }

  const values: number[] = [];
  for (const channel of channels) {
    if (!/^\d{1,3}$/.test(channel)) {
      return null;
    }
    const value = Number(channel);
    if (value > 255) {
      return null;
    }
    values.push(value);
  }

  return rgbToHex(values[0], values[1], values[2]);
}

/**
 * Blends `weight` (0-1) of `color` into `base`, returning `#rrggbb`, or `null` when either input
 * is not a valid hex color.
 */
export function mixHex(color: string, base: string, weight: number): string | null {
  const c = hexToRgb(color);
  const b = hexToRgb(base);
  if (!c || !b) {
    return null;
  }

  const blend = (from: number, into: number) => from * weight + into * (1 - weight);
  return rgbToHex(blend(c.r, b.r), blend(c.g, b.g), blend(c.b, b.b));
}

/** Formats a hex color as the `124, 58, 237` string used by the RGB input. */
export function hexToRgbString(hex: string): string {
  const rgb = hexToRgb(hex);
  return rgb ? `${rgb.r}, ${rgb.g}, ${rgb.b}` : '';
}

/** WCAG relative luminance of `hex`, or `null` when the input is not a valid hex color. */
export function relativeLuminance(hex: string): number | null {
  const rgb = hexToRgb(hex);
  if (!rgb) {
    return null;
  }

  const channel = (value: number) => {
    const normalized = value / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : Math.pow((normalized + 0.055) / 1.055, 2.4);
  };

  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
}

/**
 * WCAG contrast ratio between two colors, from 1 (identical) to 21 (black on
 * white). Returns `null` when either input is not a valid hex color.
 */
export function contrastRatio(hex: string, against: string): number | null {
  const a = relativeLuminance(hex);
  const b = relativeLuminance(against);
  if (a === null || b === null) {
    return null;
  }

  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Picks black or white for content drawn on top of `hex`, using the WCAG
 * relative luminance formula so overlays stay readable on light swatches.
 */
export function contrastTextColor(hex: string): '#ffffff' | '#000000' {
  const luminance = relativeLuminance(hex);
  if (luminance === null) {
    return '#ffffff';
  }

  return luminance > 0.45 ? '#000000' : '#ffffff';
}

const PRIMARY_STOPS = [500, 600, 700, 800] as const;

/**
 * The lightest ramp stop from 500 to 800 that carries white text at WCAG AA (4.5:1). The brand
 * hex is institution data and only gated at 3:1, so a light brand needs a darker stop to back
 * filled buttons, links and checked controls. Falls back to 800.
 */
export function accessiblePrimaryStop(
  ramp: Partial<Record<number | string, string>>,
): (typeof PRIMARY_STOPS)[number] {
  return (
    PRIMARY_STOPS.find((stop) => (contrastRatio(ramp[stop] ?? '', '#ffffff') ?? 0) >= 4.5) ?? 800
  );
}
