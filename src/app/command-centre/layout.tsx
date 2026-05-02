import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Command Centre · Reattend Enterprise',
  description: 'The admin cockpit for your organization\'s memory. Health score, amnesia signals, decision velocity, and self-healing in one place.',
  alternates: { canonical: 'https://reattend.com/command-centre' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
