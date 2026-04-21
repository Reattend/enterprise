import { Metadata } from 'next'
import LandingPage from './home-content'

export const metadata: Metadata = {
  title: 'Reattend Enterprise - Organizational Memory',
  description: 'Your organization\'s memory, preserved. Decisions, context, and institutional knowledge - captured, linked, and never lost.',
  alternates: { canonical: 'https://enterprise.reattend.com' },
}

export default function Page() {
  return <LandingPage />
}
