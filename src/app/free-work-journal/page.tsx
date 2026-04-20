import { Suspense } from 'react'
import { Metadata } from 'next'
import { WorkJournal } from './work-journal'

export const metadata: Metadata = {
  title: 'Free Work Journal | Daily Work Log Template, No Login | Reattend',
  description: 'A simple work journal you can use instantly. Log what you worked on, what changed, and what needs attention next. Free, no login, nothing is saved. Daily work journal template that runs in your browser.',
  openGraph: {
    title: 'Free Work Journal | Daily Work Log, No Login | Reattend',
    description: 'A simple, free daily work journal. Log your progress, decisions, and context. No login, nothing is saved.',
    type: 'website',
    siteName: 'Reattend',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free Work Journal | Daily Work Log | Reattend',
    description: 'A simple, free daily work journal. Log your progress, decisions, and context. No login, nothing is saved.',
  },
  alternates: { canonical: 'https://reattend.com/free-work-journal' },
}

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is a work journal?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'A work journal is a daily log of what you worked on, what progressed, and what decisions were made. It helps you track your contributions over time and provides context when you need to recall past work.',
      },
    },
    {
      '@type': 'Question',
      name: 'How do you keep a daily work log?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Spend a few minutes at the end of each day recording what you worked on, what changed, any decisions or blockers, and what needs attention next. Consistency matters more than detail. Export or save your entries so you can refer back to them.',
      },
    },
    {
      '@type': 'Question',
      name: 'Is this work journal really free?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes, 100% free. No hidden fees, no premium version, no account required. Use it every day without restrictions.',
      },
    },
    {
      '@type': 'Question',
      name: 'Where is my data stored?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Your data stays entirely in your browser tab. Nothing is sent to any server. When you close the page, your entries are gone unless you exported them. You own your data completely.',
      },
    },
  ],
}

export default function WorkJournalPage() {
  const webAppJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Free Work Journal',
    description: 'A simple work journal you can use instantly. Log what you worked on, what changed, and what needs attention next. Free, no login, nothing is saved. Daily work journal template that runs in your browser.',
    url: 'https://reattend.com/free-work-journal',
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
        <WorkJournal />
      </Suspense>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd) }} />
    </>
  )
}
