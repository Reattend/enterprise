import { Suspense } from 'react'
import { Metadata } from 'next'
import { ScreenRecorder } from './screen-recorder'

export const metadata: Metadata = {
  title: 'Free Screen Recorder | No Login, No Watermark, Browser-Only | Reattend',
  description: 'Record your screen instantly. No login, no uploads, no watermark. Runs entirely in your browser. Privacy-first free screen recorder for work demos, tutorials, and meetings.',
  openGraph: {
    title: 'Free Screen Recorder | No Login, No Watermark | Reattend',
    description: 'Record your screen instantly. No login, no uploads, no watermark. Runs entirely in your browser.',
    type: 'website',
    siteName: 'Reattend',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free Screen Recorder | No Login, No Watermark | Reattend',
    description: 'Record your screen instantly. No login, no uploads, no watermark. Runs entirely in your browser.',
  },
  alternates: { canonical: 'https://reattend.com/free-screen-recorder' },
}

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Is this screen recorder really free?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes, completely free. No hidden fees, no premium tiers, no signup required. You can use it as many times as you want.',
      },
    },
    {
      '@type': 'Question',
      name: 'Where is my video stored?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Your video stays entirely on your device. Nothing is uploaded to any server. When you close the tab, the recording is gone unless you downloaded it.',
      },
    },
    {
      '@type': 'Question',
      name: 'Does it upload anything?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'No. The entire recording process happens in your browser. No data leaves your device at any point.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I use this for work demos?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Absolutely. Record presentations, product demos, bug reports, or tutorials. There is no watermark, so your recordings look completely professional.',
      },
    },
  ],
}

export default function ScreenRecorderPage() {
  const webAppJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Free Screen Recorder',
    description: 'Record your screen instantly. No login, no uploads, no watermark. Runs entirely in your browser. Privacy-first free screen recorder for work demos, tutorials, and meetings.',
    url: 'https://reattend.com/free-screen-recorder',
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
        <ScreenRecorder />
      </Suspense>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd) }} />
    </>
  )
}
