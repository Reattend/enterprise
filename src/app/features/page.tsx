import { Metadata } from 'next'
import FeaturesPage from './features-content'

export const metadata: Metadata = {
  title: 'Features - AI Decision Tracking, Contradiction Detection, Knowledge Graph',
  description: 'Explore Reattend features: AI triage, contradiction detection, semantic search, knowledge graph, smart linking, team workspaces, and 20+ free tools for teams.',
  alternates: { canonical: 'https://reattend.com/features' },
}

export default function Page() {
  return <FeaturesPage />
}
