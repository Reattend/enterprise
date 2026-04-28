import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Time Machine · Reattend Enterprise',
  description: 'Scrub the org through 24 months of state. See active decisions, existing memories, and reversed ones at any past instant. Every number is a real query.',
  alternates: { canonical: 'https://enterprise.reattend.com/time-machine' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
