import { Suspense } from 'react'
import { Metadata } from 'next'
import { SlackMemoryMatch } from './game'

export const metadata: Metadata = {
  title: 'Memory Match for Slack  | Reattend',
  description: 'A lightweight Slack game that shows how differently your team remembers the same moment. Free, no configuration required.',
  openGraph: {
    title: 'Memory Match for Slack  | Reattend',
    description: 'Same conversation. Different memories. A Slack game for teams.',
    type: 'website',
    siteName: 'Reattend',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Memory Match for Slack  | Reattend',
    description: 'Same conversation. Different memories. A Slack game for teams.',
  },
  alternates: { canonical: 'https://reattend.com/tool/slack-memory-match' },
}

export default function SlackMemoryMatchPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Slack Memory Match',
    description: 'A lightweight Slack game that shows how differently your team remembers the same moment. Free, no configuration required.',
    url: 'https://reattend.com/tool/slack-memory-match',
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
      <Suspense>
        <SlackMemoryMatch />
      </Suspense>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  )
}
