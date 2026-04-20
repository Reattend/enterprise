import { Metadata } from 'next'
import PricingPage from './pricing-content'

export const metadata: Metadata = {
  title: 'Pricing - 60-Day Free Trial, Pro at $20/month',
  description: 'Reattend pricing: 60-day free trial with all features. Pro plan at $20/month for unlimited AI memory. Free forever as a notetaker.',
  alternates: { canonical: 'https://reattend.com/pricing' },
}

export default function Page() {
  return <PricingPage />
}
