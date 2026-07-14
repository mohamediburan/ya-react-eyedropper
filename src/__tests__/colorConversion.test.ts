import { describe, it, expect } from 'vitest';
import { hexToRgb, hexToRgba, hexToHsl } from '../utils/colorConversion';

describe('colorConversion', () => {
  describe('hexToRgb', () => {
    it('converts 6-digit hex correctly', () => {
      expect(hexToRgb('#ff0000')).toEqual({ r: 255, g: 0, b: 0 });
      expect(hexToRgb('#00ff00')).toEqual({ r: 0, g: 255, b: 0 });
      expect(hexToRgb('#0000ff')).toEqual({ r: 0, g: 0, b: 255 });
      expect(hexToRgb('#ffffff')).toEqual({ r: 255, g: 255, b: 255 });
      expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
    });



    it('returns 0,0,0 for invalid hex', () => {
      expect(hexToRgb('invalid')).toEqual({ r: 0, g: 0, b: 0 });
    });
  });

  describe('hexToRgba', () => {
    it('returns rgba with alpha 1', () => {
      expect(hexToRgba('#ff0000')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
    });
  });

  describe('hexToHsl', () => {
    it('converts hex to hsl correctly', () => {
      expect(hexToHsl('#ff0000')).toEqual({ h: 0, s: 100, l: 50 });
      expect(hexToHsl('#00ff00')).toEqual({ h: 120, s: 100, l: 50 });
      expect(hexToHsl('#0000ff')).toEqual({ h: 240, s: 100, l: 50 });
      expect(hexToHsl('#ffffff')).toEqual({ h: 0, s: 0, l: 100 });
      expect(hexToHsl('#000000')).toEqual({ h: 0, s: 0, l: 0 });
      // #808080 is 128,128,128 -> h:0, s:0, l:50
      const gray = hexToHsl('#808080');
      expect(gray.h).toBe(0);
      expect(gray.s).toBe(0);
      expect(gray.l).toBeGreaterThanOrEqual(49);
      expect(gray.l).toBeLessThanOrEqual(51);
    });
  });
});
