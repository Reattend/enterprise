import { Suspense } from 'react'
import { Metadata } from 'next'
import { DailyPlanner } from './daily-planner'

export const metadata: Metadata = {
  title: 'Free Daily Planner | Simple Work Planner Online, No Login | Reattend',
  description: 'A simple, free daily planner you can use instantly. Plan your priorities, tasks, meetings, and reflect on your day. No login, no installs, nothing is saved. Daily planner template that runs in your browser.',
  openGraph: {
    title: 'Free Daily Planner | Plan Your Day Instantly | Reattend',
    description: 'A simple, free daily work planner. No login, no installs, nothing is saved. Runs entirely in your browser.',
    type: 'website',
    siteName: 'Reattend',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free Daily Planner | Plan Your Day Instantly | Reattend',
    description: 'A simple, free daily work planner. No login, no installs, nothing is saved.',
  },
  alternates: { canonical: 'https://reattend.com/free-daily-planner' },
}

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Is this daily planner really free?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes, 100% free. No hidden fees, no premium version, no account required. Use it every day without restrictions.',
      },
    },
    {
      '@type': 'Question',
      name: 'Does it save my data?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'No. Nothing is stored on our servers. Your plan exists only in your browser tab. Download or copy it before closing the page.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I use this for work?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Absolutely. This daily work planner is designed for professionals. Plan priorities, track tasks, log meetings, and reflect on your day. Export as Markdown, TXT, or PDF.',
      },
    },
    {
      '@type': 'Question',
      name: 'How is this different from a todo list?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'A todo list tracks tasks. This daily planner template gives your day structure: priorities, commitments, notes, and an end-of-day reflection. It encourages focus and completion, not just accumulation.',
      },
    },
  ],
}

export default function DailyPlannerPage() {
  const webAppJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Free Daily Planner',
    description: 'A simple, free daily planner you can use instantly. Plan your priorities, tasks, meetings, and reflect on your day. No login, no installs, nothing is saved. Daily planner template that runs in your browser.',
    url: 'https://reattend.com/free-daily-planner',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Any',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    provider: {
      '@type': 'Organization',
      name: 'Reattend',
      url: 'https://reattend.com',
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <Suspense>
        <DailyPlanner />
      </Suspense>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd) }} />
    </>
  )
}
