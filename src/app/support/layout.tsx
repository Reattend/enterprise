import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Support · Reattend Enterprise',
  description: 'Reach the Reattend Enterprise team for product help, security disclosures, billing, and on-prem deployment questions.',
  alternates: {
    canonical: 'https://reattend.com/support',
  },
}

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return children
}
