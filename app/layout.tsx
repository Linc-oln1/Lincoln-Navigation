import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { RegisterServiceWorker } from '@/components/pwa/register-service-worker'
import { PlanRestorer } from '@/components/site/plan-restorer'
import { AdSenseScript } from '@/components/ads/adsense-script'
import { Toaster } from '@/components/ui/toaster'
import { LanguageProvider } from '@/components/i18n/language-provider'
import { SITE_BASE } from '@/lib/site-base'
import { ADS_ENABLED, ADSENSE_CLIENT } from '@/lib/monetization'
import './globals.css'

export const metadata: Metadata = {
  // Makes relative URLs in metadata (share images, canonical links)
  // absolute, which link previews require.
  metadataBase: new URL(SITE_BASE),
  title: 'Lincoln Navigation — Ghana Maps & Directions',
  description:
    'Free maps and turn-by-turn directions for Ghana — by car, trotro, motorbike, bike or on foot, with road hazards and weather on your route.',
  // Site-wide share preview; pages override title/description via
  // lib/page-meta.ts, and the image comes from app/opengraph-image.tsx.
  openGraph: {
    title: 'Lincoln Navigation — Ghana Maps & Directions',
    description: 'Maps and turn-by-turn directions built for how Ghana actually moves.',
    siteName: 'Lincoln Navigation',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Lincoln Navigation — Ghana Maps & Directions',
    description: 'Maps and turn-by-turn directions built for how Ghana actually moves.',
  },
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
    ],
    apple: '/apple-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Lincoln Navigation',
  },
  // Google Search Console ownership (URL-prefix property).
  verification: { google: 'ErtA-QLZpiUryg-VLcEEfDmPVBwhyvQeM8dpMN5cmKw' },
  // AdSense's "meta tag" site verification.
  ...(ADS_ENABLED ? { other: { 'google-adsense-account': ADSENSE_CLIENT } } : {}),
}

export const viewport: Viewport = {
  themeColor: '#0b1118',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-background">
      <head>
        <AdSenseScript />
      </head>
      {/*
        suppressHydrationWarning on <body> only: browser extensions
        like Grammarly inject attributes (data-new-gr-c-s-check-loaded,
        data-gr-ext-installed) directly onto <body> before React
        hydrates, which otherwise trips React's hydration-mismatch
        warning even though nothing is actually broken. This does NOT
        suppress mismatches in the app's own content — only on this
        one element's attributes.
      */}
      <body
        className="font-sans antialiased"
        suppressHydrationWarning
      >
        <LanguageProvider>{children}</LanguageProvider>
        <Toaster />
        <RegisterServiceWorker />
        <PlanRestorer />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
