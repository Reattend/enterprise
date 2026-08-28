import type { Metadata } from 'next'
import Script from 'next/script'
import { Inter, JetBrains_Mono, Instrument_Serif, Roboto, Roboto_Serif } from 'next/font/google'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from 'sonner'
import { TestEnvBanner } from '@/components/test-env-banner'
import { JSON_LD_GRAPH } from '@/lib/seo/json-ld'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
})

// Enterprise display font - used for page titles in the admin cockpit and
// marketing hero moments. Gives the Notion/Bloomberg editorial feel.
const displaySerif = Instrument_Serif({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-display',
  style: ['normal', 'italic'],
})

// Dashboard visual-language match (2026-08-28): the marketing site's
// "Landing v2" redesign uses Roboto / Roboto Serif. These two are scoped
// to .enterprise-shell in dashboard.css/globals.css so the dashboard's
// headings/body match the new brand look without touching --font-display
// or --font-inter, which other surfaces still depend on.
const roboto = Roboto({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  variable: '--font-roboto',
})

const robotoSerif = Roboto_Serif({
  weight: ['400', '500'],
  subsets: ['latin'],
  variable: '--font-roboto-serif',
  style: ['normal', 'italic'],
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
  icons: {
    icon: [
      { url: '/black_logo.svg', type: 'image/svg+xml' },
      { url: '/icon-128.png', sizes: '128x128', type: 'image/png' },
    ],
    apple: '/icon-128.png',
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
      <body className={`${inter.variable} ${mono.variable} ${displaySerif.variable} ${roboto.variable} ${robotoSerif.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
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
