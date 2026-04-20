import { Metadata } from 'next'
import LandingPage from './home-content'

export const metadata: Metadata = {
  title: 'Reattend - AI Decision Intelligence for Teams',
  description: 'Capture every team decision. Catch contradictions automatically. Search your team\'s knowledge by meaning, not keywords. Free AI-powered decision tracking.',
  alternates: { canonical: 'https://reattend.com' },
}

export default function Page() {
  return <LandingPage />
}
