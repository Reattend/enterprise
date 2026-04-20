import { Suspense } from 'react'
import { Metadata } from 'next'
import { TwoTruthsOneLie } from './game'
import { GamePageFallback } from '@/components/game/game-page-fallback'

export const metadata: Metadata = {
  title: 'Two Truths & A Lie - Free Team Game | Reattend',
  description: 'The classic icebreaker game, digitized. Each person enters two truths and one lie. The team guesses which is the lie. Free, no signup required.',
  openGraph: {
    title: 'Two Truths & A Lie - Free Team Game | Reattend',
    description: 'Classic icebreaker game for teams. Free, no signup.',
    type: 'website',
    siteName: 'Reattend',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Two Truths & A Lie - Free Team Game | Reattend',
    description: 'Two Truths & A Lie for teams. Free game.',
  },
  alternates: { canonical: 'https://reattend.com/game/two-truths-one-lie' },
}

export default function Page() {
  return (
    <Suspense fallback={
      <GamePageFallback
        title="Two Truths & A Lie"
        description="The classic icebreaker, digitized. Each person enters two true statements and one believable lie. The team guesses which one is the lie. Free, no signup required."
        steps={[
          'Each player enters two true facts about themselves and one convincing lie.',
          'The statements are revealed one set at a time — anonymously.',
          'The team votes on which statement they think is the lie.',
          'Reveal the answer and hear the story behind the truths.',
        ]}
      />
    }>
      <TwoTruthsOneLie />
    </Suspense>
  )
}
