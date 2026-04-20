import { Suspense } from 'react'
import { Metadata } from 'next'
import { IcebreakerSpinner } from './spinner'
import { GamePageFallback } from '@/components/game/game-page-fallback'

export const metadata: Metadata = {
  title: 'Icebreaker Spinner - Free Team Game | Reattend',
  description: 'Spin the wheel and answer fun icebreaker questions. 4 categories from fun to deep. Perfect for TGIF, team meetings, and office gatherings. Free, no signup.',
  openGraph: {
    title: 'Icebreaker Spinner - Free Team Game | Reattend',
    description: 'Spin the wheel and answer icebreaker questions. Free team bonding game for offices.',
    type: 'website',
    siteName: 'Reattend',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Icebreaker Spinner - Free Team Game | Reattend',
    description: 'Spin the wheel and answer icebreaker questions. Free team game.',
  },
  alternates: { canonical: 'https://reattend.com/game/icebreaker-spinner' },
}

export default function Page() {
  return (
    <Suspense fallback={
      <GamePageFallback
        title="Icebreaker Spinner"
        description="Spin the wheel and get a random icebreaker question. 4 categories: Fun, Work, Deep, and Creative. Perfect for meeting openers and team gatherings. No signup required."
        steps={[
          'Click Spin to get a random icebreaker question from one of 4 categories.',
          'Read the question aloud to your team.',
          'Pick someone to answer, or go around the room.',
          'Spin again for the next person and keep the conversation going.',
        ]}
      />
    }>
      <IcebreakerSpinner />
    </Suspense>
  )
}
