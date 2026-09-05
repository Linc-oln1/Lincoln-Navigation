import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { RegisterServiceWorker } from '@/components/pwa/register-service-worker'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'Lincoln Navigations - Ghana Maps',
  description: 'Navigate Ghana with precision. Your trusted map navigator for exploring Ghana.',
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
        {children}
        <RegisterServiceWorker />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
