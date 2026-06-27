import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'
import { isRtl } from '@/i18n/locales'
import type { Locale } from '@/i18n/locales'
import './globals.css'

const inter = Inter({ subsets: ['latin', 'latin-ext'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: {
    default: 'PayrollPro — Multi-Region Payroll System',
    template: '%s | PayrollPro',
  },
  description: 'Enterprise payroll management for GCC, Asia, North Africa, and Italy',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'PayrollPro',
  },
}

export const viewport: Viewport = {
  themeColor: '#2563eb',
  width: 'device-width',
  initialScale: 1,
}

interface RootLayoutProps {
  readonly children: React.ReactNode
}

export default async function RootLayout({ children }: RootLayoutProps) {
  const locale = await getLocale()
  const messages = await getMessages()
  const dir = isRtl(locale as Locale) ? 'rtl' : 'ltr'

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
          <Toaster richColors position={dir === 'rtl' ? 'top-left' : 'top-right'} />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
