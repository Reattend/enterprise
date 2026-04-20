import { Suspense } from 'react'
import { Metadata } from 'next'
import { OneOnOneBuilder } from './builder'

export const metadata: Metadata = {
  title: 'Free 1-on-1 Meeting Template | Agenda Builder for Managers',
  description:
    'Build better 1-on-1 meeting agendas in seconds. Choose from proven question templates, customize for your team, and export as PDF. Free for managers and team leads.',
  openGraph: {
    title: 'Free 1-on-1 Meeting Template | Reattend',
    description:
      'Build better 1-on-1 meeting agendas. Choose from proven question templates and export as PDF. Free.',
    type: 'website',
    siteName: 'Reattend',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free 1-on-1 Meeting Template | Reattend',
    description: 'Build better 1-on-1 meeting agendas in seconds. Free, no signup required.',
  },
  alternates: { canonical: 'https://reattend.com/free-one-on-one-template' },
}

const faqItems = [
  {
    question: 'What makes a good 1-on-1 meeting?',
    answer:
      'A good 1-on-1 is employee-driven, not a status update. It should cover how the person is doing, what is blocking them, career growth, and feedback. Having a consistent agenda helps both parties prepare.',
  },
  {
    question: 'How often should I have 1-on-1 meetings?',
    answer:
      'Most management research recommends weekly or biweekly 1-on-1s. Weekly is ideal for new hires, direct reports going through challenges, or fast-moving teams. Biweekly works well for experienced team members.',
  },
  {
    question: 'How long should a 1-on-1 be?',
    answer:
      '30 minutes is the sweet spot for most teams. 25 minutes if you want to give a buffer. If you consistently run out of time, consider going to 45 minutes rather than rushing through important topics.',
  },
  {
    question: 'Should I share the agenda beforehand?',
    answer:
      'Yes. Sharing the agenda 24 hours before the meeting gives your report time to prepare and add their own topics. This makes the conversation more productive and shows respect for their time.',
  },
  {
    question: 'Is this template generator free?',
    answer:
      'Yes, completely free. No signup, no email required. Build as many agendas as you want and export them as PDF.',
  },
]

export default function OneOnOnePage() {
  const webAppJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '1-on-1 Meeting Template Builder',
    description: 'Build better 1-on-1 meeting agendas in seconds. Choose from proven question templates, customize for your team, and export as PDF. Free for managers and team leads.',
    url: 'https://reattend.com/free-one-on-one-template',
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
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faqItems.map((item) => ({
              '@type': 'Question',
              name: item.question,
              acceptedAnswer: {
                '@type': 'Answer',
                text: item.answer,
              },
            })),
          }),
        }}
      />
      <Suspense>
        <OneOnOneBuilder faqItems={faqItems} />
      </Suspense>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd) }} />
    </>
  )
}
