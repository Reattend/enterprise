import { Suspense } from 'react'
import { Metadata } from 'next'
import { MemoryDebtCalculator } from './calculator'

type Props = {
  searchParams: { s?: string; c?: string }
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const score = searchParams.s

  if (score) {
    return {
      title: `My Memory Debt Score: ${score}/100`,
      description: `I just measured my team's knowledge loss with the Memory Debt Calculator. Take the free assessment and find out your score.`,
      openGraph: {
        title: `My Memory Debt Score: ${score}/100`,
        description: `I just measured my team's knowledge loss with the Memory Debt Calculator. Take the free assessment and find out your score.`,
        type: 'website',
        siteName: 'Reattend',
      },
      twitter: {
        card: 'summary_large_image',
        title: `My Memory Debt Score: ${score}/100`,
        description: `I just measured my team's knowledge loss. Take the free assessment.`,
      },
      alternates: { canonical: 'https://reattend.com/tool/memory-debt-calculator' },
    }
  }

  return {
    title: 'Memory Debt Calculator  | Reattend',
    description: 'Find out how much knowledge your team is silently losing. A free 10-question assessment that reveals your organization\'s hidden knowledge gaps.',
    openGraph: {
      title: 'Memory Debt Calculator  | Reattend',
      description: 'Find out how much knowledge your team is silently losing. A free 10-question assessment.',
      type: 'website',
      siteName: 'Reattend',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Memory Debt Calculator  | Reattend',
      description: 'Find out how much knowledge your team is silently losing. Take the free assessment.',
    },
    alternates: { canonical: 'https://reattend.com/tool/memory-debt-calculator' },
  }
}

export default function MemoryDebtCalculatorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Memory Debt Calculator',
    description: 'Find out how much knowledge your team is silently losing. A free 10-question assessment that reveals your organization\'s hidden knowledge gaps.',
    url: 'https://reattend.com/tool/memory-debt-calculator',
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
        <MemoryDebtCalculator />
      </Suspense>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  )
}
