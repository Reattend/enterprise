import { Suspense } from 'react'
import { Metadata } from 'next'
import { FiveSecondChallenge } from './game'
import { GamePageFallback } from '@/components/game/game-page-fallback'

export const metadata: Metadata = {
  title: '5-Second Challenge - Free Team Game | Reattend',
  description: 'Name 3 things in 5 seconds. Random categories, maximum pressure, pure fun. Free team game for TGIF and office gatherings. No signup required.',
  openGraph: {
    title: '5-Second Challenge - Free Team Game | Reattend',
    description: 'Name 3 things in 5 seconds. Free team game for offices.',
    type: 'website',
    siteName: 'Reattend',
  },
  twitter: {
    card: 'summary_large_image',
    title: '5-Second Challenge - Free Team Game | Reattend',
    description: 'Name 3 things in 5 seconds. Free team game.',
  },
  alternates: { canonical: 'https://reattend.com/game/five-second-challenge' },
}

export default function Page() {
  return (
    <Suspense fallback={
      <GamePageFallback
        title="5-Second Challenge"
        description="A random category appears — like 'Things in a meeting room' or 'Ways to procrastinate'. You have exactly 5 seconds to name 3 examples. The clock is ticking."
        steps={[
          'A random category appears on screen.',
          'You have exactly 5 seconds to name 3 examples out loud.',
          'The faster you answer, the higher your score.',
          'Pass to the next player and keep a running score.',
        ]}
      />
    }>
      <FiveSecondChallenge />
    </Suspense>
  )
}
