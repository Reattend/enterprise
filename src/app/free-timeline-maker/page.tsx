import { Suspense } from 'react'
import { Metadata } from 'next'
import { TimelineMaker } from './timeline-maker'

export const metadata: Metadata = {
  title: 'Free Timeline Maker | Create a Timeline Online, No Login | Reattend',
  description: 'Create a timeline instantly. Free forever, no login, nothing is stored. Build project timelines, work history, event sequences, and decision timelines. Free timeline generator that runs in your browser.',
  openGraph: {
    title: 'Free Timeline Maker | Create a Timeline Online | Reattend',
    description: 'Create a project timeline online instantly. Free forever, no login, nothing is stored. Runs in your browser.',
    type: 'website',
    siteName: 'Reattend',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free Timeline Maker | Create a Timeline Online | Reattend',
    description: 'Create a project timeline online instantly. Free forever, no login, nothing is stored.',
  },
  alternates: { canonical: 'https://reattend.com/free-timeline-maker' },
}

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Is this timeline maker really free?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes, 100% free. No hidden fees, no premium tier, no account needed. Create as many timelines as you want.',
      },
    },
    {
      '@type': 'Question',
      name: 'Where is my data stored?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Your data stays entirely in your browser. Nothing is uploaded to any server. Export your timeline before closing the page. It will not persist after refresh.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I use this for work projects?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Absolutely. This free timeline generator is designed for project timelines, work history, event sequences, and decision logs. Export as Markdown, PDF, JSON, or plain text.',
      },
    },
    {
      '@type': 'Question',
      name: 'How is this different from other timeline tools?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Most timeline tools require accounts, store your data on their servers, or push you toward a paid plan. This tool runs entirely in your browser with zero data collection. You create, you export, you own it.',
      },
    },
  ],
}

export default function TimelineMakerPage() {
  const webAppJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Free Timeline Maker',
    description: 'Create a timeline instantly. Free forever, no login, nothing is stored. Build project timelines, work history, event sequences, and decision timelines. Free timeline generator that runs in your browser.',
    url: 'https://reattend.com/free-timeline-maker',
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
        <TimelineMaker />
      </Suspense>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd) }} />
    </>
  )
}
