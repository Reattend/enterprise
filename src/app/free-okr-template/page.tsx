import { Suspense } from 'react'
import { Metadata } from 'next'
import { OkrGenerator } from './generator'

export const metadata: Metadata = {
  title: 'Free OKR Template Generator | Create OKRs for Your Team',
  description:
    'Create OKRs (Objectives and Key Results) for your team in minutes. Choose from example templates or build your own. Export as PDF. Free, no signup required.',
  openGraph: {
    title: 'Free OKR Template Generator | Reattend',
    description:
      'Create OKRs for your team in minutes. Example templates, export as PDF. Free, no signup.',
    type: 'website',
    siteName: 'Reattend',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free OKR Template Generator | Reattend',
    description: 'Create OKRs for your team in minutes. Free, no signup required.',
  },
  alternates: { canonical: 'https://reattend.com/free-okr-template' },
}

const faqItems = [
  {
    question: 'What are OKRs?',
    answer:
      'OKR stands for Objectives and Key Results. An Objective is a qualitative goal (what you want to achieve). Key Results are measurable outcomes (how you know you achieved it). OKRs were popularized by Intel and Google.',
  },
  {
    question: 'How many OKRs should a team have?',
    answer:
      'Most experts recommend 3 to 5 Objectives per quarter, each with 2 to 4 Key Results. Fewer is better. If everything is a priority, nothing is.',
  },
  {
    question: 'What makes a good Key Result?',
    answer:
      'A good Key Result is specific, measurable, and time-bound. It should describe an outcome, not an activity. "Increase NPS from 30 to 50" is better than "Run customer surveys."',
  },
  {
    question: 'How often should OKRs be reviewed?',
    answer:
      'Most teams set OKRs quarterly and do weekly or biweekly check-ins on progress. Monthly reviews are the minimum. The key is regular updates so OKRs do not become set-and-forget goals.',
  },
  {
    question: 'Is this OKR template generator free?',
    answer:
      'Yes, completely free. No signup, no email required. Create and export as many OKR templates as you want.',
  },
]

export default function OkrTemplatePage() {
  const webAppJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'OKR Template Generator',
    description: 'Create OKRs (Objectives and Key Results) for your team in minutes. Choose from example templates or build your own. Export as PDF. Free, no signup required.',
    url: 'https://reattend.com/free-okr-template',
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
        <OkrGenerator faqItems={faqItems} />
      </Suspense>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd) }} />
    </>
  )
}
