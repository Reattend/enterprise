import { Suspense } from 'react'
import { Metadata } from 'next'
import { HotTakes } from './game'
import { GamePageFallback } from '@/components/game/game-page-fallback'

export const metadata: Metadata = {
  title: 'Hot Takes Board - Free Team Game | Reattend',
  description: 'Submit anonymous hot takes and vote agree or disagree. Discover your team\'s most controversial opinions. Free game for TGIF and team bonding.',
  openGraph: {
    title: 'Hot Takes Board - Free Team Game | Reattend',
    description: 'Anonymous hot takes and voting for teams. Free game.',
    type: 'website',
    siteName: 'Reattend',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hot Takes Board - Free Team Game | Reattend',
    description: 'Anonymous hot takes for team bonding. Free game.',
  },
  alternates: { canonical: 'https://reattend.com/game/hot-takes' },
}

export default function Page() {
  return (
    <Suspense fallback={
      <GamePageFallback
        title="Hot Takes Board"
        description="Submit your most controversial work opinions anonymously. The team votes agree or disagree on each take. Discover where your team is united — and where it is deeply divided."
        steps={[
          'Everyone submits their hottest work-related opinion anonymously.',
          'Takes are revealed one at a time to the whole team.',
          'Everyone votes agree or disagree — no explanations needed yet.',
          'Debate the closest votes and find out who the real contrarians are.',
        ]}
      />
    }>
      <HotTakes />
    </Suspense>
  )
}
