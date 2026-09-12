import type { Metadata } from 'next'
import Script from 'next/script'
import { Inter } from 'next/font/google'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from 'sonner'
import { TestEnvBanner } from '@/components/test-env-banner'
import { JSON_LD_GRAPH } from '@/lib/seo/json-ld'
import './globals.css'
import './site-refresh.css'
import './site-dark.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://reattend.com'),
  title: {
    // Lock in the Enterprise positioning. The old "AI Memory for Your Mac" line
    // was a leftover from Personal Reattend; it cost us every CIO who Googled
    // the company name. The "organizational amnesia" wedge is the term we own.
    // See docs/seo-strategy.md and docs/organizational-amnesia-domains.md.
    default: 'Reattend - Organizational Memory That Never Forgets',
    template: '%s | Reattend',
  },
  description: 'Reattend is the organizational memory platform that solves corporate amnesia. Decisions, exit interviews, handoffs, time-machine point-in-time queries - when employees leave, transfer, or retire, their institutional knowledge stays.',
  keywords: [
    // Primary wedge keywords - what we want to own
    'organizational amnesia', 'organisational amnesia', 'organizational memory', 'institutional memory',
    'corporate amnesia', 'knowledge loss', 'knowledge retention',
    // Adjacent intent keywords
    'employee offboarding knowledge transfer', 'institutional knowledge', 'tribal knowledge',
    'team decision tracking', 'decision log', 'decision intelligence',
    'enterprise knowledge management', 'knowledge graph', 'AI knowledge base',
    'second brain for teams', 'memory platform', 'self-healing knowledge',
    // Comparison keywords (brings in already-shopping traffic)
    'glean alternative', 'notion alternative for teams', 'enterprise search alternative',
    // Vertical keywords
    'knowledge management for government', 'on-premise knowledge management', 'air-gapped AI',
  ],
  authors: [{ name: 'Reattend', url: 'https://reattend.com' }],
  creator: 'Reattend',
  publisher: 'Reattend',
  // Square icons only: Google ignores non-square favicons, and the black
  // logo SVG is 734x766, which is why results kept showing the old gradient
  // mark from icon-128.png. White ground so it survives dark result pages.
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '16x16 32x32 48x48' },
      { url: '/icon-48.png', sizes: '48x48', type: 'image/png' },
      { url: '/icon-96.png', sizes: '96x96', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://reattend.com',
    siteName: 'Reattend',
    title: 'Reattend - Organizational Memory That Never Forgets',
    description: 'When employees leave, their institutional knowledge stays. Decisions, exit interviews, handoffs, time-machine queries - the memory layer your wiki can\'t give you.',
    images: [
      {
        url: '/hero.png',
        width: 1400,
        height: 900,
        alt: 'Reattend - Organizational Memory That Never Forgets',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Reattend - Organizational Memory That Never Forgets',
    description: 'When employees leave, their institutional knowledge stays. The org memory layer your wiki can\'t give you.',
    images: ['/hero.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: 'https://reattend.com',
    types: {
      'application/rss+xml': 'https://reattend.com/blog/feed.xml',
    },
  },
}
const jsonLd = JSON_LD_GRAPH


export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-0J0Y3SL5CY"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-0J0Y3SL5CY');
          `}
        </Script>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <TestEnvBanner />
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              className: 'font-sans',
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  )
}
