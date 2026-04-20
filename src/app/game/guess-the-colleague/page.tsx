import { Suspense } from 'react'
import { Metadata } from 'next'
import { GuessTheColleague } from './game'
import { GamePageFallback } from '@/components/game/game-page-fallback'

export const metadata: Metadata = {
  title: 'Guess the Colleague - Free Team Game | Reattend',
  description: 'Everyone submits a fun fact anonymously. The team guesses who said what. The team game that builds real connections. Free, no signup.',
  openGraph: {
    title: 'Guess the Colleague - Free Team Game | Reattend',
    description: 'Guess who said the fun fact. Free team bonding game.',
    type: 'website',
    siteName: 'Reattend',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Guess the Colleague - Free Team Game | Reattend',
    description: 'Guess the colleague from fun facts. Free game.',
  },
  alternates: { canonical: 'https://reattend.com/game/guess-the-colleague' },
}

export default function Page() {
  return (
    <Suspense fallback={
      <GamePageFallback
        title="Guess the Colleague"
        description="Everyone submits an interesting or surprising fact about themselves — anonymously. The team guesses which colleague wrote each fact. The game that reveals who you actually work with."
        steps={[
          'Each person submits one surprising or interesting fact about themselves.',
          'Facts are revealed one at a time — the author stays anonymous.',
          'The team votes on which colleague they think submitted the fact.',
          'Reveal the answer and hear the story behind it.',
        ]}
      />
    }>
      <GuessTheColleague />
    </Suspense>
  )
}
