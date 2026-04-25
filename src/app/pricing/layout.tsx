import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pricing · Reattend Enterprise',
  description: 'Three plans, one product: Team ($25/seat), Enterprise (custom), Government (on-prem). Same memory engine, same RBAC.',
  alternates: {
    canonical: 'https://enterprise.reattend.com/pricing',
  },
  openGraph: {
    title: 'Reattend Enterprise Pricing',
    description: 'Team / Enterprise / Government — pick by deployment + scale.',
    url: 'https://enterprise.reattend.com/pricing',
  },
}

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children
}
