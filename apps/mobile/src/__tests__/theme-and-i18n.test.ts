import { contrastRatio } from '../theme/contrast';
import { type ColorTokens, darkColors, fontSizes, lightColors, spacing } from '../theme/tokens';
import en from '../i18n/locales/en.json';
import hi from '../i18n/locales/hi.json';

/** Every foreground/background pair the components actually use. */
const TEXT_PAIRS: Array<[keyof ColorTokens, keyof ColorTokens]> = [
  ['text', 'background'],
  ['text', 'surface'],
  ['text', 'surfaceRaised'],
  ['textMuted', 'background'],
  ['textMuted', 'surface'],
  ['textMuted', 'surfaceRaised'],
  ['accent', 'background'],
  ['accent', 'surfaceRaised'],
  ['onAccent', 'accent'],
  ['onAccentSoft', 'accentSoft'],
  ['good', 'background'],
  ['onGood', 'good'],
  ['warning', 'background'],
  ['warning', 'surface'],
  ['onWarning', 'warning'],
  ['danger', 'background'],
  ['danger', 'surfaceRaised'],
  ['onGoodSoft', 'goodSoft'],
  ['onWarningSoft', 'warningSoft'],
  ['accent', 'accentSoft'],
  ['textMuted', 'accentSoft'],
];

describe.each([
  ['light', lightColors],
  ['dark', darkColors],
])('%s theme', (_name, colors) => {
  it.each(TEXT_PAIRS)('%s on %s meets 4.5:1', (fg, bg) => {
    expect(contrastRatio(colors[fg], colors[bg])).toBeGreaterThanOrEqual(4.5);
  });
});

describe('tokens', () => {
  it('uses at least 18 sp for body text', () => {
    expect(fontSizes.body).toBeGreaterThanOrEqual(18);
  });

  it('keeps spacing on a 4-point scale', () => {
    for (const value of Object.values(spacing)) {
      expect(value % 4).toBe(0);
    }
  });
});

type Tree = { [key: string]: string | Tree };

function flatten(tree: Tree, prefix = ''): Record<string, string> {
  return Object.entries(tree).reduce<Record<string, string>>((acc, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === 'string'
      ? { ...acc, [path]: value }
      : { ...acc, ...flatten(value, path) };
  }, {});
}

const placeholders = (text: string) => [...text.matchAll(/{{(\w+)}}/g)].map(m => m[1]).sort();

describe('translations', () => {
  const hiFlat = flatten(hi);
  const enFlat = flatten(en);

  it('have the same keys in Hindi and English', () => {
    expect(Object.keys(hiFlat).sort()).toEqual(Object.keys(enFlat).sort());
  });

  it('have no empty strings', () => {
    for (const [key, value] of Object.entries({ ...hiFlat, ...enFlat })) {
      expect(`${key}=${value.trim().length > 0}`).toBe(`${key}=true`);
    }
  });

  it('use the same interpolation variables in both languages', () => {
    for (const key of Object.keys(enFlat)) {
      expect(`${key}: ${placeholders(hiFlat[key] as string)}`).toBe(
        `${key}: ${placeholders(enFlat[key] as string)}`,
      );
    }
  });

  it('never claim the worker IS eligible', () => {
    const all = Object.values({ ...hiFlat, ...enFlat })
      .join('\n')
      .toLowerCase();
    expect(all).not.toMatch(/you are eligible|you're eligible|आप पात्र हैं|आप हक़दार हैं/);
  });
});
