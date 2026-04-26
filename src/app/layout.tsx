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
    default: 'Reattend - AI Memory for Your Mac',
    template: '%s | Reattend',
  },
  description: 'Reattend captures your screen, records meetings, and turns everything into searchable AI-organized memories. Local-first, private, and always learning.',
  keywords: [
    'contradiction detection', 'decision tracking', 'team decisions', 'decision memory',
    'team memory', 'organizational amnesia', 'decision intelligence', 'decision analysis',
    'shared memory', 'team analysis', 'knowledge graph', 'AI memory', 'memory organization',
    'team knowledge management', 'second brain', 'institutional memory', 'knowledge management',
    'semantic search', 'AI knowledge base', 'memory platform', 'organizational memory',
    'decision log', 'knowledge capture', 'collective intelligence',
  ],
  authors: [{ name: 'Reattend', url: 'https://reattend.com' }],
  creator: 'Reattend',
  publisher: 'Reattend',
  icons: {
    icon: [
      { url: '/icon-128.png', sizes: '128x128', type: 'image/png' },
      { url: '/icon-48.png', sizes: '48x48', type: 'image/png' },
      { url: '/icon-16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: '/icon-128.png',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://reattend.com',
    siteName: 'Reattend',
    title: 'Reattend | AI Decision Intelligence for Teams',
    description: 'Capture every decision. Catch contradictions. Make your team\'s knowledge searchable forever. Free AI-powered decision tracking.',
    images: [
      {
        url: '/hero.png',
        width: 1400,
        height: 900,
        alt: 'Reattend - AI Decision Intelligence for Teams',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Reattend | AI Decision Intelligence for Teams',
    description: 'Capture every decision. Catch contradictions. Make your team\'s knowledge searchable forever.',
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
      sameAs: [],
      description: 'Reattend is the AI decision intelligence platform that captures team decisions, catches contradictions, and makes institutional knowledge searchable forever.',
    },
    {
      '@type': 'WebSite',
      '@id': 'https://reattend.com/#website',
      url: 'https://reattend.com',
      name: 'Reattend',
      publisher: { '@id': 'https://reattend.com/#organization' },
      description: 'AI Decision Intelligence for Teams. Track Decisions, Catch Contradictions, Build a Living Knowledge Graph.',
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
      description: 'AI-powered decision intelligence platform that captures team decisions, catches contradictions, extracts entities, and builds a living knowledge graph. Free AI-powered decision tracking with semantic search and smart linking.',
      offers: [
        {
          '@type': 'Offer',
          name: 'Free Trial',
          price: '0',
          priceCurrency: 'USD',
          description: 'Pro coming soon with all features: ambient capture, meeting recording, AI triage, semantic search, knowledge graph, and Ask AI.',
        },
        {
          '@type': 'Offer',
          name: 'Pro',
          price: '20',
          priceCurrency: 'USD',
          priceSpecification: {
            '@type': 'UnitPriceSpecification',
            price: '20',
            priceCurrency: 'USD',
            unitText: 'user/month',
            referenceQuantity: { '@type': 'QuantitativeValue', value: 1, unitCode: 'MON' },
          },
          description: 'Unlimited AI processing, ambient capture, meeting transcription, semantic search, and all features. $20/month per user.',
        },
        {
          '@type': 'Offer',
          name: 'Free Forever',
          price: '0',
          priceCurrency: 'USD',
          description: 'Keep all your memories forever. Browse, export, and take manual notes. No AI features.',
        },
      ],
      featureList: [
        'AI-powered decision tracking and enrichment',
        'Contradiction detection: catch conflicting decisions automatically',
        'Entity extraction (people, organizations, topics)',
        'Semantic search: find by meaning, not keywords',
        'Smart linking and knowledge graph',
        'Decision intelligence and team analysis',
        'Shared team memory and collaboration',
        'Board view and whiteboard',
        'Ask your memory: AI Q&A',
      ],
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'How does Reattend catch contradictions and track team decisions?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Reattend captures every team decision, meeting outcome, and piece of context. AI automatically enriches each entry with summaries, tags, entities, and action items, then links related decisions into a knowledge graph. When a new decision contradicts an old one, Reattend flags it, so your team stops re-debating and starts building.',
          },
        },
        {
          '@type': 'Question',
          name: 'How does Reattend help with decision intelligence?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Reattend captures decisions alongside their context, rationale, and outcomes. The AI automatically extracts entities (people, topics, projects), builds connections between related decisions, and enables semantic search so you can find past decisions by meaning. This creates a decision log that helps teams learn from history and make better-informed choices.',
          },
        },
        {
          '@type': 'Question',
          name: 'How much does Reattend cost?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Reattend offers a Pro coming soon with all features. After the trial, Pro is $20/month per user for unlimited AI. Or keep using Reattend free forever as a notetaker. No credit card required to start.',
          },
        },
        {
          '@type': 'Question',
          name: 'Can teams use Reattend for shared memory and collaboration?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. Reattend supports shared workspaces where teams can capture and organize knowledge together. Team features are included in the Pro plan at $20/month per user.',
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
