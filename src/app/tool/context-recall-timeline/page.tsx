import { Metadata } from 'next'
import { ContextRecallTimeline } from './timeline'

export const metadata: Metadata = {
  title: 'Context Recall Timeline  | Reattend',
  description: 'Reconstruct what happened and when. Build a visual timeline of meetings, decisions, and notes to trace context across weeks and months. Free, no signup required.',
  openGraph: {
    title: 'Context Recall Timeline  | Reattend',
    description: 'Reconstruct what happened and when. Build a visual timeline of meetings, decisions, and notes.',
    type: 'website',
    siteName: 'Reattend',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Context Recall Timeline  | Reattend',
    description: 'Reconstruct what happened and when. Free tool for knowledge workers.',
  },
  alternates: { canonical: 'https://reattend.com/tool/context-recall-timeline' },
}

export default function ContextRecallTimelinePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Context Recall Timeline',
    description: 'Reconstruct what happened and when. Build a visual timeline of meetings, decisions, and notes to trace context across weeks and months. Free, no signup required.',
    url: 'https://reattend.com/tool/context-recall-timeline',
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
      <ContextRecallTimeline />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  )
}
