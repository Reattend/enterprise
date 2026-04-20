import { Suspense } from 'react'
import { Metadata } from 'next'
import { StandupLanding } from './standup-landing'

export const metadata: Metadata = {
  title: 'Free Async Standup Bot for Slack | Reattend',
  description:
    'Run daily standups in Slack without meetings. Free forever, no credit card required. Automated DMs, scheduled summaries, timezone support. Replace Geekbot for free.',
  openGraph: {
    title: 'Free Async Standup Bot for Slack | Reattend',
    description:
      'Run daily standups in Slack without meetings. Free forever. Automated DMs, scheduled summaries, timezone support.',
    type: 'website',
    siteName: 'Reattend',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free Async Standup Bot for Slack | Reattend',
    description:
      'Run daily standups in Slack without meetings. Free forever, no credit card required.',
  },
  alternates: { canonical: 'https://reattend.com/free-standup-bot' },
}

const faqItems = [
  {
    question: 'Is the Slack standup bot really free?',
    answer:
      'Yes, completely free with no limits on teams, channels, or users. No credit card required.',
  },
  {
    question: 'How does the async standup work?',
    answer:
      'The bot DMs each team member at the scheduled time with your standup questions. Once everyone responds (or after the deadline), it posts a formatted summary to your channel.',
  },
  {
    question: 'Can I customize the standup questions?',
    answer:
      'Yes. During setup you can write any questions you want, one per line. You can also change them later by running /standup setup again.',
  },
  {
    question: 'Does it support different timezones?',
    answer:
      'Yes. Each standup can be configured with its own timezone, so distributed teams can get DMs at the right local time.',
  },
  {
    question: 'How is this different from Geekbot?',
    answer:
      'Reattend Standups is 100% free. Geekbot charges $3.50/user/month. We offer the same core functionality (async DMs, scheduled summaries, custom questions) at no cost.',
  },
  {
    question: 'What Slack permissions does the bot need?',
    answer:
      'The bot needs permissions to send messages (chat:write), send DMs (im:write), read channel members (channels:read, users:read), and handle slash commands (commands).',
  },
]

export default function FreeStandupBotPage() {
  const webAppJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Standup Bot',
    description: 'Run daily standups in Slack without meetings. Free forever, no credit card required. Automated DMs, scheduled summaries, timezone support. Replace Geekbot for free.',
    url: 'https://reattend.com/free-standup-bot',
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
        <StandupLanding faqItems={faqItems} />
      </Suspense>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd) }} />
    </>
  )
}
