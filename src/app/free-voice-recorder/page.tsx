import { Suspense } from 'react'
import { Metadata } from 'next'
import { VoiceRecorder } from './voice-recorder'

export const metadata: Metadata = {
  title: 'Free Voice Recorder | Record Audio Online, No Login | Reattend',
  description: 'Record voice notes instantly. No login, no uploads, no account required. Audio never leaves your device. Privacy-first free voice recorder that runs entirely in your browser.',
  openGraph: {
    title: 'Free Voice Recorder | Record Audio Online, No Login | Reattend',
    description: 'Record voice notes instantly. No login, no uploads. Audio never leaves your device. Privacy-first, runs in your browser.',
    type: 'website',
    siteName: 'Reattend',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free Voice Recorder | Record Audio Online | Reattend',
    description: 'Record voice notes instantly. No login, no uploads. Privacy-first, runs in your browser.',
  },
  alternates: { canonical: 'https://reattend.com/free-voice-recorder' },
}

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Is this voice recorder really free?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes, 100% free. No hidden fees, no premium tiers, no account required. Record as many voice notes as you want.',
      },
    },
    {
      '@type': 'Question',
      name: 'Where is my audio stored?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Your audio stays entirely on your device. Nothing is uploaded to any server. When you close the tab, the recording is gone unless you downloaded it.',
      },
    },
    {
      '@type': 'Question',
      name: 'Do you record or upload anything?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'No. The entire recording process runs locally in your browser. No data leaves your device at any point. We have zero access to your audio.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I use this for work notes?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Absolutely. Record meeting notes, brainstorms, quick ideas, or project updates. Download the file and use it however you need.',
      },
    },
  ],
}

export default function VoiceRecorderPage() {
  const webAppJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Free Voice Recorder',
    description: 'Record voice notes instantly. No login, no uploads, no account required. Audio never leaves your device. Privacy-first free voice recorder that runs entirely in your browser.',
    url: 'https://reattend.com/free-voice-recorder',
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
        <VoiceRecorder />
      </Suspense>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd) }} />
    </>
  )
}
