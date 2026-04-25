import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms & Conditions · Reattend Enterprise',
  description: 'Reattend Enterprise terms of service. Account use, subscriptions, customer content ownership, AI features, on-prem deployment, cancellation, and governing law.',
  alternates: {
    canonical: 'https://enterprise.reattend.com/terms',
  },
}

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children
}
