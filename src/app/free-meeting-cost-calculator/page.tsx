import { Suspense } from 'react'
import { Metadata } from 'next'
import { MeetingCostCalculator } from './calculator'

export const metadata: Metadata = {
  title: 'Free Meeting Cost Calculator | How Much Do Your Meetings Cost?',
  description:
    'Calculate the true cost of your meetings. Enter attendees, salaries, and duration to see how much your team spends in meetings per week, month, and year.',
  openGraph: {
    title: 'Free Meeting Cost Calculator | Reattend',
    description:
      'Calculate the true cost of your meetings. See how much your team spends in meetings per week, month, and year.',
    type: 'website',
    siteName: 'Reattend',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free Meeting Cost Calculator | Reattend',
    description: 'Calculate the true cost of your meetings. Free, no signup required.',
  },
  alternates: { canonical: 'https://reattend.com/free-meeting-cost-calculator' },
}

const faqItems = [
  {
    question: 'How is the meeting cost calculated?',
    answer:
      'We multiply the number of attendees by their average hourly rate and the meeting duration. The hourly rate is derived from the annual salary divided by 2,080 working hours per year (40 hours/week x 52 weeks).',
  },
  {
    question: 'Does this include the cost of lost productivity?',
    answer:
      'The base calculation shows direct salary cost. We also show a "context switching cost" estimate, since research shows it takes an average of 23 minutes to refocus after a meeting interruption.',
  },
  {
    question: 'How can I reduce my meeting costs?',
    answer:
      'Common strategies include: reducing meeting frequency, shortening default durations from 60 to 30 minutes, cutting unnecessary attendees, making some meetings async, and capturing decisions so topics are not re-discussed.',
  },
  {
    question: 'Is this calculator really free?',
    answer:
      'Yes, completely free. No signup, no email required. Use it as many times as you want.',
  },
  {
    question: 'What is a good meeting-to-work ratio?',
    answer:
      'Most productivity research suggests keeping meetings under 20% of total work hours. For a 40-hour week, that is 8 hours or less in meetings. Many high-performing teams aim for under 15%.',
  },
]

export default function MeetingCostCalculatorPage() {
  const webAppJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Free Meeting Cost Calculator',
    description: 'Calculate the true cost of your meetings. Enter attendees, salaries, and duration to see how much your team spends in meetings per week, month, and year.',
    url: 'https://reattend.com/free-meeting-cost-calculator',
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
        <MeetingCostCalculator faqItems={faqItems} />
      </Suspense>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd) }} />
    </>
  )
}
