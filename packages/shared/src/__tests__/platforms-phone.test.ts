import { normalizeIndianMobile } from '../phone';
import { PLATFORMS, PLATFORM_IDS, isPlatformId } from '../platforms';

/** WCAG relative luminance of a #RRGGBB colour. */
function luminance(hex: string): number {
  const channels = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map(c =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  ) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

describe('platforms', () => {
  it('has an entry for every id', () => {
    for (const id of PLATFORM_IDS) {
      expect(PLATFORMS[id].id).toBe(id);
    }
  });

  it.each(PLATFORM_IDS)('%s tile meets 4.5:1 contrast for white initials', id => {
    const contrast = 1.05 / (luminance(PLATFORMS[id].color) + 0.05);
    expect(contrast).toBeGreaterThanOrEqual(4.5);
  });

  it('uses distinct colours so calendar dots are distinguishable', () => {
    const colors = PLATFORM_IDS.map(id => PLATFORMS[id].color);
    expect(new Set(colors).size).toBe(colors.length);
  });

  it('isPlatformId guards unknown strings', () => {
    expect(isPlatformId('zomato')).toBe(true);
    expect(isPlatformId('dunzo')).toBe(false);
  });
});

describe('normalizeIndianMobile', () => {
  it.each([
    ['9876543210', '9876543210'],
    ['+91 98765 43210', '9876543210'],
    ['+919876543210', '9876543210'],
    ['919876543210', '9876543210'],
    ['09876543210', '9876543210'],
    ['(987) 654-3210', '9876543210'],
  ])('accepts %p', (input, expected) => {
    expect(normalizeIndianMobile(input)).toBe(expected);
  });

  it.each(['5876543210', '987654321', '98765432101', '+1 9876543210', 'abcdefghij', ''])(
    'rejects %p',
    input => {
      expect(normalizeIndianMobile(input)).toBeNull();
    },
  );
});
