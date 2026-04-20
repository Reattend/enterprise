import { Suspense } from 'react'
import { Metadata } from 'next'
import { TeamTrivia } from './game'
import { GamePageFallback } from '@/components/game/game-page-fallback'

export const metadata: Metadata = {
  title: 'Team Trivia Maker - Free Team Game | Reattend',
  description: 'Create custom trivia quizzes about your team or company. Share a link and play together. Free game for TGIF and team bonding.',
  openGraph: {
    title: 'Team Trivia Maker - Free Team Game | Reattend',
    description: 'Create custom trivia for your team. Free game.',
    type: 'website',
    siteName: 'Reattend',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Team Trivia Maker - Free Team Game | Reattend',
    description: 'Create custom trivia for teams. Free game.',
  },
  alternates: { canonical: 'https://reattend.com/game/team-trivia' },
}

export default function Page() {
  return (
    <Suspense fallback={
      <GamePageFallback
        title="Team Trivia Maker"
        description="Create custom trivia quizzes about your team, company, or any topic. Share a link and everyone plays together in real time. Perfect for TGIF and team building."
        steps={[
          'Create a trivia quiz with your own questions and answer choices.',
          'Share the room link with your teammates.',
          'Everyone joins and answers simultaneously on their own device.',
          'See the leaderboard update in real time and crown the winner.',
        ]}
      />
    }>
      <TeamTrivia />
    </Suspense>
  )
}
