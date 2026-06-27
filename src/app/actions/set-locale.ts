'use server'

import { cookies } from 'next/headers'
import { locales, LOCALE_COOKIE, defaultLocale, type Locale } from '@/i18n/locales'

export async function setLocale(locale: string) {
  const validated: Locale = (locales as readonly string[]).includes(locale)
    ? (locale as Locale)
    : defaultLocale

  const cookieStore = await cookies()
  cookieStore.set(LOCALE_COOKIE, validated, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })
}
