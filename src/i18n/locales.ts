export const locales = [
  'en', 'ar', 'it', 'hi', 'tl', 'ms', 'id', 'ja', 'zh', 'ur', 'bn', 'si',
] as const

export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'en'

export const rtlLocales: Locale[] = ['ar', 'ur']

export const localeLabels: Record<Locale, string> = {
  en: 'English',
  ar: 'العربية',
  it: 'Italiano',
  hi: 'हिन्दी',
  tl: 'Filipino',
  ms: 'Melayu',
  id: 'Bahasa Indonesia',
  ja: '日本語',
  zh: '中文',
  ur: 'اردو',
  bn: 'বাংলা',
  si: 'සිංහල',
}

const COUNTRY_LOCALE_MAP: Record<string, Locale> = {
  // GCC
  SA: 'ar', AE: 'ar', KW: 'ar', BH: 'ar', QA: 'ar', OM: 'ar',
  // North Africa
  EG: 'ar', MA: 'ar', TN: 'ar', LY: 'ar', DZ: 'ar',
  // Europe
  IT: 'it',
  // South Asia
  IN: 'hi', PK: 'ur', BD: 'bn', LK: 'si',
  // Southeast Asia
  PH: 'tl', MY: 'ms', ID: 'id',
  // East Asia
  JP: 'ja', CN: 'zh',
  // Default English countries
  SG: 'en',
}

export function countryToLocale(country: string | null | undefined): Locale {
  if (!country) return defaultLocale
  return COUNTRY_LOCALE_MAP[country.toUpperCase()] ?? defaultLocale
}

export function isRtl(locale: Locale): boolean {
  return rtlLocales.includes(locale)
}

export const LOCALE_COOKIE = 'PAYROLL_LOCALE'
