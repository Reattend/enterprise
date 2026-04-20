import { Metadata } from 'next'
import { Suspense } from 'react'
import RecapLanding from './recap-landing'

export const metadata: Metadata = {
  title: 'Free Meeting Recap Bot for Microsoft Teams | Reattend',
  description:
    'Capture meeting decisions, action items, and notes from your team, all in one place. Free alternative to Microsoft Copilot meeting recaps ($30/user/mo). No per-user pricing.',
  openGraph: {
    title: 'Free Meeting Recap Bot for Microsoft Teams',
    description:
      'Replace $30/user/mo Copilot recaps with a free bot. Collect decisions, action items, and notes from everyone after every meeting.',
    url: 'https://reattend.com/free-meeting-recap',
    siteName: 'Reattend',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free Meeting Recap Bot for Microsoft Teams',
    description:
      'Replace $30/user/mo Copilot recaps with a free bot. Collect decisions, action items, and notes after every meeting.',
  },
  alternates: { canonical: 'https://reattend.com/free-meeting-recap' },
}

const faqItems = [
  {
    q: 'Is this really free?',
    a: 'Yes, completely free. No per-user pricing, no limits on recaps, no credit card required. We built this to help teams who don\'t want to pay $30/user/month for Microsoft Copilot just to get meeting recaps.',
  },
  {
    q: 'Do I need Microsoft Copilot?',
    a: 'No! This bot works independently of Microsoft Copilot. It uses a simple form-based approach with no AI needed. Your team fills in what happened, and the bot compiles it into a clean summary.',
  },
  {
    q: 'How does it work without AI?',
    a: 'Instead of trying to transcribe and summarize automatically (which costs $30/user/mo), our bot asks your team to fill in a simple form: What was decided? What are the action items? Any additional notes? Then it compiles everyone\'s input into one organized recap. Human memory + structured collection = better recaps than AI alone.',
  },
  {
    q: 'Do I need an Azure subscription?',
    a: 'You need a free Azure account to register the bot (takes 5 minutes). The Azure Bot Resource has a free tier (F0) that includes 10,000 messages per month, more than enough for most teams. No payment required.',
  },
  {
    q: 'Is my data private?',
    a: 'Your meeting recaps are stored securely and only accessible to your team. We don\'t sell data or use it for training. See our privacy policy for details.',
  },
  {
    q: 'Can multiple people submit recaps?',
    a: 'Yes! That\'s the whole point. After someone types @Recap recap, everyone in the channel can fill in the form with their own perspective. When you type @Recap done, all responses are compiled into one comprehensive summary.',
  },
  {
    q: 'What if someone wants to update their response?',
    a: 'They can simply submit the form again. Their latest response will replace the previous one.',
  },
  {
    q: 'Does it work in group chats and channels?',
    a: 'Yes, the bot works in Teams channels, group chats, and 1:1 conversations. It\'s most useful in channels where your team meets regularly.',
  },
]

export default function Page() {
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  }

  const webAppJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Meeting Recap Generator',
    description: 'Capture meeting decisions, action items, and notes from your team, all in one place. Free alternative to Microsoft Copilot meeting recaps ($30/user/mo). No per-user pricing.',
    url: 'https://reattend.com/free-meeting-recap',
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <Suspense>
        <RecapLanding faqItems={faqItems} />
      </Suspense>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd) }} />
    </>
  )
}
