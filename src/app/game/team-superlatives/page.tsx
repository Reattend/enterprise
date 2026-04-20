import { Suspense } from 'react'
import { Metadata } from 'next'
import { TeamSuperlatives } from './game'
import { GamePageFallback } from '@/components/game/game-page-fallback'

export const metadata: Metadata = {
  title: 'Team Superlatives - Free Team Game | Reattend',
  description: '"Most likely to..." - Vote on fun categories and crown your team\'s superstars. Free game for TGIF and team bonding. No signup required.',
  openGraph: {
    title: 'Team Superlatives - Free Team Game | Reattend',
    description: 'Vote on "Most likely to..." team superlatives. Free game.',
    type: 'website',
    siteName: 'Reattend',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Team Superlatives - Free Team Game | Reattend',
    description: 'Team superlatives voting game. Free.',
  },
  alternates: { canonical: 'https://reattend.com/game/team-superlatives' },
}

export default function Page() {
  return (
    <Suspense fallback={
      <GamePageFallback
        title="Team Superlatives"
        description={'"Most likely to..." voting for your team. Nominate colleagues for fun categories — most likely to become CEO, most likely to reply-all accidentally. Then vote and crown your superstars.'}
        steps={[
          'Browse the "most likely to..." categories or add your own.',
          'Nominate a teammate who best fits each description.',
          'Everyone votes for their pick in each category.',
          'Reveal the winners — and prepare for some friendly debate.',
        ]}
      />
    }>
      <TeamSuperlatives />
    </Suspense>
  )
}
