import { Metadata } from 'next'
import GamesPage from './game-content'

export const metadata: Metadata = {
  title: 'Free Team Games for Meetings and Team Building',
  description: '10 free team games for meetings and TGIFs: icebreaker spinner, team bingo, would you rather, hot takes, trivia, and more. No signup, play instantly.',
  alternates: { canonical: 'https://reattend.com/game' },
}

export default function Page() {
  return <GamesPage />
}
