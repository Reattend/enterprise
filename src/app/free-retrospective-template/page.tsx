import { Suspense } from 'react'
import { Metadata } from 'next'
import { RetroGenerator } from './generator'

export const metadata: Metadata = {
  title: 'Free Retrospective Template Generator | Sprint Retro Made Easy',
  description:
    'Generate sprint retrospective templates for your team. Choose from multiple formats (Start/Stop/Continue, 4Ls, Mad/Sad/Glad, and more). Export as PDF. Free forever.',
  openGraph: {
    title: 'Free Retrospective Template Generator | Reattend',
    description:
      'Generate sprint retrospective templates. Multiple formats, export as PDF. Free, no signup.',
    type: 'website',
    siteName: 'Reattend',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free Retrospective Template Generator | Reattend',
    description: 'Generate sprint retro templates in seconds. Free, no signup required.',
  },
  alternates: { canonical: 'https://reattend.com/free-retrospective-template' },
}

const faqItems = [
  {
    question: 'What is a sprint retrospective?',
    answer:
      'A sprint retrospective is a meeting held at the end of a sprint where the team reflects on what went well, what could be improved, and what actions to take. It is a core practice in agile development.',
  },
  {
    question: 'Which retro format should I use?',
    answer:
      'Start/Stop/Continue is the most popular and easy to run. 4Ls (Liked, Learned, Lacked, Longed For) is great for deeper reflection. Mad/Sad/Glad works well for teams that want to focus on emotions. Try different formats to keep retros fresh.',
  },
  {
    question: 'How long should a retrospective be?',
    answer:
      'For a 2-week sprint, 60 to 90 minutes is standard. For 1-week sprints, 30 to 45 minutes works well. The key is having enough time for everyone to share and for the team to agree on action items.',
  },
  {
    question: 'How many action items should come out of a retro?',
    answer:
      'Aim for 1 to 3 concrete action items. More than that and nothing gets done. Each action item should have a clear owner and a deadline.',
  },
  {
    question: 'Is this retrospective template generator free?',
    answer:
      'Yes, completely free. No signup, no email required. Generate and export as many templates as you want.',
  },
]

export default function RetroTemplatePage() {
  const webAppJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Retrospective Template Generator',
    description: 'Generate sprint retrospective templates for your team. Choose from multiple formats (Start/Stop/Continue, 4Ls, Mad/Sad/Glad, and more). Export as PDF. Free forever.',
    url: 'https://reattend.com/free-retrospective-template',
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
        <RetroGenerator faqItems={faqItems} />
      </Suspense>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd) }} />
    </>
  )
}
