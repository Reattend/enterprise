import { Suspense } from 'react'
import { Metadata } from 'next'
import { TeamBingo } from './bingo'
import { GamePageFallback } from '@/components/game/game-page-fallback'
import { OG_IMAGE } from '@/lib/seo/og-image'

export const metadata: Metadata = {
  title: 'Team Bingo Generator - Free Team Game | Reattend',
  description: 'Generate "Find someone who..." bingo cards for team bonding. Custom or pre-made prompts. Print or play on screen. Free, no signup required.',
  openGraph: {
    images: [OG_IMAGE],
    title: 'Team Bingo Generator - Free Team Game | Reattend',
    description: 'Generate team bonding bingo cards. Free game for offices.',
    type: 'website',
    siteName: 'Reattend',
  },
  twitter: {
    images: [OG_IMAGE.url],
    card: 'summary_large_image',
    title: 'Team Bingo Generator - Free Team Game | Reattend',
    description: 'Generate team bingo cards for office bonding. Free game.',
  },
  alternates: { canonical: 'https://reattend.com/game/team-bingo' },
}

export default function Page() {
  return (
    <Suspense fallback={
      <GamePageFallback
        title="Team Bingo"
        description={'"Find someone who..." bingo for team bonding. 25 prompts fill your card. Walk around, ask teammates questions, collect signatures, and get BINGO.'}
        steps={[
          'Generate a bingo card with 25 "find someone who..." prompts.',
          'Walk around and ask teammates if any prompts apply to them.',
          'Get their name or initial in each matching square.',
          'First to complete a row, column, or diagonal calls BINGO.',
        ]}
      />
    }>
      <TeamBingo />
    </Suspense>
  )
}
