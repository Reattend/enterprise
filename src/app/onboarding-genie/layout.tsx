import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Onboarding Genie · Reattend Enterprise',
  description: 'New hire form turns into a personalized first-week packet. Decisions to know, people to meet, policies to ack, agents to try.',
  alternates: { canonical: 'https://reattend.com/onboarding-genie' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
