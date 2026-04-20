import type { Metadata } from 'next'
import { DemoExperience } from './demo-experience'

export const metadata: Metadata = {
  title: 'Interactive Demo | Reattend | AI Memory for Teams',
  description: 'Paste a note and watch AI extract entities, classify it, build a knowledge graph, and catch contradictions. Experience Reattend in 90 seconds. No signup required.',
  openGraph: {
    title: 'Interactive Demo | Reattend',
    description: 'Paste a note. Watch AI build a living memory graph. Ask it anything. No signup required.',
  },
  alternates: { canonical: 'https://reattend.com/demo' },
}

export default function DemoPage() {
  return <DemoExperience />
}
