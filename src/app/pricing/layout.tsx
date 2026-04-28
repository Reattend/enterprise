import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pricing · Reattend Enterprise',
  description: 'Four plans, one product: Team ($19/seat), Pro ($29/seat with meeting recorder), Enterprise (custom), Government (on-prem). Same memory engine, same RBAC.',
  alternates: {
    canonical: 'https://enterprise.reattend.com/pricing',
  },
  openGraph: {
    title: 'Reattend Enterprise Pricing',
    description: 'Team / Pro / Enterprise / Government. Pick by deployment, scale, and whether you want the meeting recorder.',
    url: 'https://enterprise.reattend.com/pricing',
  },
}

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children
}
