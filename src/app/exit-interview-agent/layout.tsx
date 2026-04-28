import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Exit Interview Agent · Reattend Enterprise',
  description: 'When someone gives notice, the AI reads their memory footprint and writes a structured handoff doc. Six weeks of ramp time saved.',
  alternates: { canonical: 'https://enterprise.reattend.com/exit-interview-agent' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
