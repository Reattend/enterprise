import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sandbox · Reattend Enterprise',
  description: 'Try Reattend Enterprise without signing up. Pick a role, explore a demo organization with 22 members, 12 decisions, and a completed exit interview.',
  alternates: {
    canonical: 'https://enterprise.reattend.com/sandbox',
  },
  openGraph: {
    title: 'Try Reattend Enterprise Sandbox',
    description: 'Explore organizational memory as Secretary, Joint Secretary, Director, Deputy, or a Guest. Five roles, one demo org, zero signup.',
    url: 'https://enterprise.reattend.com/sandbox',
  },
}

export default function SandboxLayout({ children }: { children: React.ReactNode }) {
  return children
}
