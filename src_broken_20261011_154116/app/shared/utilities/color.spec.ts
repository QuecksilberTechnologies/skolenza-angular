import {
  contrastRatio,
  contrastTextColor,
  hexToRgb,
  hexToRgbString,
  mixHex,
  normalizeHex,
  parseRgbInput,
  rgbToHex,
} from './color';

describe('color utilities', () => {
  describe('normalizeHex', () => {
    it('expands 3-digit hex', () => {
      expect(normalizeHex('#abc')).toBe('#aabbcc');
    });

    it('accepts values without a leading hash and lowercases them', () => {
      expect(normalizeHex('7C3AED')).toBe('#7c3aed');
    });

    it('trims surrounding whitespace', () => {
      expect(normalizeHex('  #10B981 ')).toBe('#10b981');
    });

    it('rejects invalid input', () => {
      expect(normalizeHex('')).toBeNull();
      expect(normalizeHex('#12345')).toBeNull();
      expect(normalizeHex('nothex')).toBeNull();
    });
  });

  describe('hexToRgb', () => {
    it('splits channels', () => {
      expect(hexToRgb('#7c3aed')).toEqual({ r: 124, g: 58, b: 237 });
    });

    it('returns null for invalid hex', () => {
      expect(hexToRgb('zzz')).toBeNull();
    });
  });

  describe('rgbToHex', () => {
    it('round-trips with hexToRgb', () => {
      const rgb = hexToRgb('#4287f5')!;
      expect(rgbToHex(rgb.r, rgb.g, rgb.b)).toBe('#4287f5');
    });

    it('pads single-digit channels', () => {
      expect(rgbToHex(0, 5, 16)).toBe('#000510');
    });
  });

  describe('parseRgbInput', () => {
    it('parses comma separated values', () => {
      expect(parseRgbInput('124, 58, 237')).toBe('#7c3aed');
    });

    it('parses space separated values', () => {
      expect(parseRgbInput('124 58 237')).toBe('#7c3aed');
    });

    it('parses rgb() notation', () => {
      expect(parseRgbInput('rgb(124,58,237)')).toBe('#7c3aed');
    });

    it('rejects out-of-range channels', () => {
      expect(parseRgbInput('256, 0, 0')).toBeNull();
    });

    it('rejects wrong channel counts and non-numeric input', () => {
      expect(parseRgbInput('124, 58')).toBeNull();
      expect(parseRgbInput('124, 58, abc')).toBeNull();
    });
  });

  describe('hexToRgbString', () => {
    it('formats channels for the rgb input', () => {
      expect(hexToRgbString('#7c3aed')).toBe('124, 58, 237');
    });

    it('returns an empty string for invalid hex', () => {
      expect(hexToRgbString('#12')).toBe('');
    });
  });

  describe('mixHex', () => {
    it('blends the given share of the color into the base', () => {
      expect(mixHex('#dc2626', '#000000', 0.55)).toBe('#791515');
      expect(mixHex('#dc2626', '#ffffff', 0)).toBe('#ffffff');
    });

    it('returns null for invalid hex', () => {
      expect(mixHex('nope', '#ffffff', 0.5)).toBeNull();
    });
  });

  describe('contrastRatio', () => {
    it('returns the WCAG extremes', () => {
      expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
      expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
    });

    it('is symmetric', () => {
      expect(contrastRatio('#2563eb', '#ffffff')).toBeCloseTo(
        contrastRatio('#ffffff', '#2563eb') as number,
        5,
      );
    });

    it('separates an accent that clears the non-text minimum from one that does not', () => {
      expect(contrastRatio('#2563eb', '#ffffff')).toBeGreaterThan(3);
      expect(contrastRatio('#95a800', '#ffffff')).toBeLessThan(3);
    });

    it('returns null when either colour is invalid', () => {
      expect(contrastRatio('nope', '#ffffff')).toBeNull();
      expect(contrastRatio('#ffffff', 'nope')).toBeNull();
    });
  });

  describe('contrastTextColor', () => {
    it('returns black on light colors', () => {
      expect(contrastTextColor('#ffffff')).toBe('#000000');
      expect(contrastTextColor('#d4d4d8')).toBe('#000000');
    });

    it('returns white on dark colors', () => {
      expect(contrastTextColor('#000000')).toBe('#ffffff');
      expect(contrastTextColor('#4287f5')).toBe('#ffffff');
    });

    it('falls back to white for invalid hex', () => {
      expect(contrastTextColor('nope')).toBe('#ffffff');
    });
  });
});
