import { Metadata } from 'next'
import HowItWorksPage from './how-it-works-content'

export const metadata: Metadata = {
  title: 'How It Works - Capture, Enrich, Connect, Recall',
  description: 'See how Reattend works in 4 steps: capture decisions, let AI enrich and link them, catch contradictions, and recall any decision in seconds.',
  alternates: { canonical: 'https://reattend.com/how-it-works' },
}

export default function Page() {
  return <HowItWorksPage />
}
