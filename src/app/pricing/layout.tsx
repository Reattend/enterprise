import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pricing - Free Forever | Reattend',
  description: 'Reattend is free forever. 20 AI queries/day, 10 DeepThink sessions, unlimited memories, Notion integration. Pro and Teams coming soon.',
  alternates: {
    canonical: 'https://reattend.com/pricing',
  },
  openGraph: {
    title: 'Reattend Pricing - Free Forever',
    description: 'Free forever. 20 AI queries/day, unlimited memories, DeepThink included. Pro and Teams coming soon.',
    url: 'https://reattend.com/pricing',
  },
}

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children
}
