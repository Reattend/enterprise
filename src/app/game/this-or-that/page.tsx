import { Suspense } from 'react'
import { Metadata } from 'next'
import { ThisOrThat } from './game'
import { GamePageFallback } from '@/components/game/game-page-fallback'

export const metadata: Metadata = {
  title: 'This or That - Free Team Game | Reattend',
  description: 'Rapid-fire binary choices for teams. Coffee or tea? Tabs or spaces? See where your team splits. Free game for TGIF and office gatherings.',
  openGraph: {
    title: 'This or That - Free Team Game | Reattend',
    description: 'Rapid-fire binary choices for teams. Free office game.',
    type: 'website',
    siteName: 'Reattend',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'This or That - Free Team Game | Reattend',
    description: 'Rapid-fire binary choices for teams. Free game.',
  },
  alternates: { canonical: 'https://reattend.com/game/this-or-that' },
}

export default function Page() {
  return (
    <Suspense fallback={
      <GamePageFallback
        title="This or That"
        description="Rapid-fire binary choices for teams. Coffee or tea? Remote or office? Morning person or night owl? Vote instantly and see exactly where your team stands."
        steps={[
          'A "this or that" pair appears on screen.',
          'Everyone instantly picks their preference — no overthinking.',
          'See the team split: who picked what.',
          'Move to the next pair — there are no wrong answers.',
        ]}
      />
    }>
      <ThisOrThat />
    </Suspense>
  )
}
