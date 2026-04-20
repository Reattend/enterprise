import { Suspense } from 'react'
import { Metadata } from 'next'
import { RaciGenerator } from './generator'

export const metadata: Metadata = {
  title: 'Free RACI Chart Generator | Create RACI Matrix Online',
  description:
    'Create a RACI chart in minutes. Define tasks, assign roles (Responsible, Accountable, Consulted, Informed), and export as PDF. Free, no signup required.',
  openGraph: {
    title: 'Free RACI Chart Generator | Reattend',
    description:
      'Create a RACI chart in minutes. Define tasks, assign roles, and export as PDF. Free, no signup.',
    type: 'website',
    siteName: 'Reattend',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free RACI Chart Generator | Reattend',
    description: 'Create a RACI chart in minutes. Free, no signup required.',
  },
  alternates: { canonical: 'https://reattend.com/free-raci-chart-generator' },
}

const faqItems = [
  {
    question: 'What is a RACI chart?',
    answer:
      'A RACI chart is a responsibility assignment matrix that defines who is Responsible, Accountable, Consulted, and Informed for each task or decision in a project. It eliminates confusion about roles and ownership.',
  },
  {
    question: 'What do R, A, C, and I stand for?',
    answer:
      'R = Responsible (does the work), A = Accountable (final decision maker, only one per task), C = Consulted (provides input before the work), I = Informed (kept in the loop after the work).',
  },
  {
    question: 'How many people should be Accountable for a task?',
    answer:
      'Exactly one person should be Accountable for each task. Having multiple accountable people defeats the purpose of the RACI framework. If you need multiple, break the task into smaller pieces.',
  },
  {
    question: 'Can I export the RACI chart?',
    answer:
      'Yes. You can export your RACI chart as a PDF that you can share with your team, attach to project documents, or print for reference.',
  },
  {
    question: 'Is this RACI generator really free?',
    answer:
      'Yes, completely free. No signup, no email, no limits on the number of tasks or people. Use it as many times as you want.',
  },
]

export default function RaciChartPage() {
  const webAppJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'RACI Chart Generator',
    description: 'Create a RACI chart in minutes. Define tasks, assign roles (Responsible, Accountable, Consulted, Informed), and export as PDF. Free, no signup required.',
    url: 'https://reattend.com/free-raci-chart-generator',
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
        <RaciGenerator faqItems={faqItems} />
      </Suspense>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd) }} />
    </>
  )
}
