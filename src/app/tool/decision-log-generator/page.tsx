import { Suspense } from 'react'
import { Metadata } from 'next'
import { DecisionLogGenerator } from './generator'

export const metadata: Metadata = {
  title: 'Decision Log Generator  | Reattend',
  description: 'Turn messy meeting outcomes into clean, structured decision records. Free tool for founders, PMs, and team leads.',
  openGraph: {
    title: 'Decision Log Generator  | Reattend',
    description: 'Turn messy meeting outcomes into clean, structured decision records. Free, no signup required.',
    type: 'website',
    siteName: 'Reattend',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Decision Log Generator  | Reattend',
    description: 'Turn messy meeting outcomes into clean, structured decision records.',
  },
  alternates: { canonical: 'https://reattend.com/tool/decision-log-generator' },
}

export default function DecisionLogGeneratorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Decision Log Generator',
    description: 'Turn messy meeting outcomes into clean, structured decision records. Free tool for founders, PMs, and team leads.',
    url: 'https://reattend.com/tool/decision-log-generator',
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
        <DecisionLogGenerator />
      </Suspense>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  )
}
