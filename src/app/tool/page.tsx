import { Metadata } from 'next'
import ToolsPage from './tool-content'

export const metadata: Metadata = {
  title: 'Free Productivity Tools for Teams',
  description: 'Free productivity tools for teams: standup bot, screen recorder, voice recorder, daily planner, meeting cost calculator, RACI chart generator, and more.',
  alternates: { canonical: 'https://reattend.com/tool' },
}

export default function Page() {
  return <ToolsPage />
}
