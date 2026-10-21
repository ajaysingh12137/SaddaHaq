/**
 * Platforms a worker can log days for.
 *
 * We never use real logos: the app shows `initials` on a neutral `color` tile.
 * Colours are chosen so white initials meet WCAG 4.5:1 contrast (see tests).
 * `keywords` are lowercase strings matched against on-device OCR text.
 */

export const PLATFORM_IDS = [
  'zomato',
  'swiggy',
  'blinkit',
  'zepto',
  'uber',
  'ola',
  'rapido',
  'porter',
  'urban_company',
  'other',
] as const;

export type PlatformId = (typeof PLATFORM_IDS)[number];

export interface PlatformInfo {
  id: PlatformId;
  /** Brand name shown as plain text. `other` is localised in the app instead. */
  name: string;
  initials: string;
  color: string;
  keywords: readonly string[];
}

export const PLATFORMS: Readonly<Record<PlatformId, PlatformInfo>> = {
  zomato: {
    id: 'zomato',
    name: 'Zomato',
    initials: 'ZO',
    color: '#B91C1C',
    keywords: ['zomato', 'ज़ोमैटो', 'जोमैटो'],
  },
  swiggy: {
    id: 'swiggy',
    name: 'Swiggy',
    initials: 'SW',
    color: '#C2410C',
    keywords: ['swiggy', 'instamart', 'स्विगी'],
  },
  blinkit: {
    id: 'blinkit',
    name: 'Blinkit',
    initials: 'BL',
    color: '#A16207',
    keywords: ['blinkit', 'ब्लिंकिट'],
  },
  zepto: {
    id: 'zepto',
    name: 'Zepto',
    initials: 'ZE',
    color: '#7E22CE',
    keywords: ['zepto', 'ज़ेप्टो', 'जेप्टो'],
  },
  uber: {
    id: 'uber',
    name: 'Uber',
    initials: 'UB',
    color: '#111827',
    keywords: ['uber', 'उबर'],
  },
  ola: {
    id: 'ola',
    name: 'Ola',
    initials: 'OL',
    color: '#15803D',
    keywords: ['ola', 'ola cabs', 'ओला'],
  },
  rapido: {
    id: 'rapido',
    name: 'Rapido',
    initials: 'RA',
    color: '#BE185D',
    keywords: ['rapido', 'रैपिडो'],
  },
  porter: {
    id: 'porter',
    name: 'Porter',
    initials: 'PO',
    color: '#1D4ED8',
    keywords: ['porter', 'पोर्टर'],
  },
  urban_company: {
    id: 'urban_company',
    name: 'Urban Company',
    initials: 'UC',
    color: '#0F766E',
    keywords: ['urban company', 'urbancompany', 'urbanclap', 'अर्बन कंपनी'],
  },
  other: {
    id: 'other',
    name: 'Other',
    initials: '+',
    color: '#4B5563',
    keywords: [],
  },
};

export function isPlatformId(value: string): value is PlatformId {
  return (PLATFORM_IDS as readonly string[]).includes(value);
}
