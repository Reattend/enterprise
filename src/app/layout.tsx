import type { Metadata } from 'next'
import Script from 'next/script'
import { Inter, JetBrains_Mono, Instrument_Serif } from 'next/font/google'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from 'sonner'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
})

// Enterprise display font — used for page titles in the admin cockpit and
// marketing hero moments. Gives the Notion/Bloomberg editorial feel.
const displaySerif = Instrument_Serif({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-display',
  style: ['normal', 'italic'],
})

export const metadata: Metadata = {
  metadataBase: new URL('https://reattend.com'),
  title: {
    // Lock in the Enterprise positioning. The old "AI Memory for Your Mac" line
    // was a leftover from Personal Reattend; it cost us every CIO who Googled
    // the company name. The "organizational amnesia" wedge is the term we own.
    // See docs/seo-strategy.md and docs/organizational-amnesia-domains.md.
    default: 'Reattend — Organizational Memory That Never Forgets',
    template: '%s | Reattend',
  },
  description: 'Reattend is the organizational memory platform that solves corporate amnesia. Decisions, exit interviews, handoffs, time-machine point-in-time queries — when employees leave, transfer, or retire, their institutional knowledge stays.',
  keywords: [
    // Primary wedge keywords — what we want to own
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
    title: 'Reattend — Organizational Memory That Never Forgets',
    description: 'When employees leave, their institutional knowledge stays. Decisions, exit interviews, handoffs, time-machine queries — the memory layer your wiki can\'t give you.',
    images: [
      {
        url: '/hero.png',
        width: 1400,
        height: 900,
        alt: 'Reattend — Organizational Memory That Never Forgets',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Reattend — Organizational Memory That Never Forgets',
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

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://reattend.com/#organization',
      name: 'Reattend',
      url: 'https://reattend.com',
      logo: 'https://reattend.com/black_logo.svg',
      sameAs: [
        // Sister content domains — same brand, separate authority play.
        // See docs/organizational-amnesia-domains.md.
        'https://organizationalamnesia.com',
        'https://organisationalamnesia.com',
      ],
      description: 'Reattend is the organizational memory platform that solves corporate amnesia. When employees leave, transfer, or retire, their institutional knowledge stays in the organization through decisions logs, exit interviews, knowledge transfers, and time-machine point-in-time queries.',
    },
    {
      '@type': 'WebSite',
      '@id': 'https://reattend.com/#website',
      url: 'https://reattend.com',
      name: 'Reattend',
      publisher: { '@id': 'https://reattend.com/#organization' },
      description: 'Organizational Memory That Never Forgets — the memory layer your wiki can\'t give you.',
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: 'https://reattend.com/app/search?q={search_term_string}',
        },
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@type': 'SiteNavigationElement',
      name: 'Pricing',
      url: 'https://reattend.com/pricing',
    },
    {
      '@type': 'SiteNavigationElement',
      name: 'Free Tools',
      url: 'https://reattend.com/tool',
    },
    {
      '@type': 'SiteNavigationElement',
      name: 'Free Team Games',
      url: 'https://reattend.com/game',
    },
    {
      '@type': 'SiteNavigationElement',
      name: 'Free Screen Recorder',
      url: 'https://reattend.com/free-screen-recorder',
    },
    {
      '@type': 'SiteNavigationElement',
      name: 'Free Voice Recorder',
      url: 'https://reattend.com/free-voice-recorder',
    },
    {
      '@type': 'SiteNavigationElement',
      name: 'Free Daily Planner',
      url: 'https://reattend.com/free-daily-planner',
    },
    {
      '@type': 'SiteNavigationElement',
      name: 'Free Work Journal',
      url: 'https://reattend.com/free-work-journal',
    },
    {
      '@type': 'SiteNavigationElement',
      name: 'Free Timeline Maker',
      url: 'https://reattend.com/free-timeline-maker',
    },
    {
      '@type': 'SiteNavigationElement',
      name: 'Meeting Recorder',
      url: 'https://reattend.com/record',
    },
    {
      '@type': 'SiteNavigationElement',
      name: 'Register',
      url: 'https://reattend.com/register',
    },
    {
      '@type': 'SoftwareApplication',
      name: 'Reattend',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      url: 'https://reattend.com',
      description: 'Organizational memory platform that captures team decisions, runs AI-powered exit interviews, transfers knowledge to roles instead of people, and surfaces what is rotting in your knowledge base. Built for teams that lose institutional knowledge when employees leave.',
      offers: [
        {
          '@type': 'Offer',
          name: 'Free',
          price: '0',
          priceCurrency: 'USD',
          description: 'Try Reattend Enterprise. 100 AI questions per month, 90-day retention. No card required.',
        },
        {
          '@type': 'Offer',
          name: 'Professional',
          price: '19',
          priceCurrency: 'USD',
          priceSpecification: {
            '@type': 'UnitPriceSpecification',
            price: '19',
            priceCurrency: 'USD',
            unitText: 'user/month',
            referenceQuantity: { '@type': 'QuantitativeValue', value: 1, unitCode: 'MON' },
          },
          description: 'Unlimited AI questions, full memory retention, all connectors, decision log, exit interviews, time machine. $19 per user per month with 45-day no-card trial. 20% discount on annual.',
        },
        {
          '@type': 'Offer',
          name: 'Enterprise',
          price: '29',
          priceCurrency: 'USD',
          priceSpecification: {
            '@type': 'UnitPriceSpecification',
            price: '29',
            priceCurrency: 'USD',
            unitText: 'user/month',
            referenceQuantity: { '@type': 'QuantitativeValue', value: 1, unitCode: 'MON' },
          },
          description: 'Everything in Professional plus SSO/SAML, hash-chained audit log (SOC 2 / CJIS auditor-ready), department hierarchy, per-user permission overrides, advanced compliance. $29 per user per month, 5-seat minimum.',
        },
      ],
      featureList: [
        'Organizational memory: knowledge stays when employees leave',
        'Decision log with rationale, reversal tracking, and Blast Radius dependency view',
        'AI-driven exit interviews that capture institutional knowledge',
        'Knowledge transfer to roles, not individuals',
        'Time Machine: point-in-time queries — see what the org knew on any date',
        'Hot Cache: AI grounding from your last 7 days of patterns',
        'Weekly Audit: tells you what is rotting in your knowledge',
        'Self-healing contradiction detection',
        'Hash-chained WORM audit log (SOC 2 / CJIS / GDPR ready)',
        'Two-tier RBAC with per-user permission overrides',
        'On-premise / air-gapped deployment option',
        'OCR + AI redaction for paper-heavy workflows',
      ],
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What is organizational amnesia?',
          acceptedAnswer: {
            '@type': 'Answer',
            // First sentence is the AEO-quotable definition. Keep it tight.
            text: 'Organizational amnesia is the loss of institutional knowledge that occurs when employees leave, transfer, or retire — taking their context, decisions, relationships, and unwritten know-how with them. It costs companies an estimated $31.5 billion per year and is one of the leading causes of repeated mistakes, slow new-hire ramp-up, and re-debated decisions.',
          },
        },
        {
          '@type': 'Question',
          name: 'How is Reattend different from Glean or Notion?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Glean is enterprise search — it tells you which documents mention a topic. Notion is a wiki — it stores what you write. Reattend is organizational memory — it captures decisions, the rationale behind them, who decided, when, and whether they were reversed. When someone leaves, their knowledge stays as institutional memory rather than walking out the door.',
          },
        },
        {
          '@type': 'Question',
          name: 'How much does Reattend cost?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Reattend has three tiers. Free includes 100 AI questions per month and 90-day retention. Professional is $19 per user per month with unlimited questions, full retention, and all connectors. Enterprise is $29 per user per month with SSO/SAML, audit log, advanced compliance — minimum 5 seats. Government / on-premise is custom-quoted. All paid tiers come with a 45-day no-card trial.',
          },
        },
        {
          '@type': 'Question',
          name: 'How does Reattend prevent organizational amnesia?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Reattend captures decisions with their full rationale, runs AI-driven exit interviews when employees offboard, transfers knowledge to organizational roles rather than individuals, and uses a time-machine view to let you see exactly what the organization knew at any point in the past. The Weekly Audit feature scores your knowledge health and tells you exactly what is going stale.',
          },
        },
        {
          '@type': 'Question',
          name: 'Is Reattend compliant with SOC 2, GDPR, or CJIS?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Reattend ships with a hash-chained WORM audit log that is auditor-ready out of the box. GDPR self-export and erasure are built in. SOC 2 Type 1 certification is in progress; CJIS and StateRAMP documentation is available for government deployments. The Compliance page on reattend.com lists every control with current status.',
          },
        },
        {
          '@type': 'Question',
          name: 'Can Reattend run on-premise or air-gapped?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. Reattend supports on-premise deployment with the AI engine running on your own GPU, no outbound network calls, and SSO via your IdP. This is the deployment model used by government and secure-org customers. Contact us for an air-gapped evaluation.',
          },
        },
      ],
    },
  ],
}

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
      <body className={`${inter.variable} ${mono.variable} ${displaySerif.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
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
