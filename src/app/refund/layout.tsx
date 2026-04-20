import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Refund Policy',
  description: 'Reattend refund policy. 60-day free trial, cancel anytime. Paid subscriptions are non-refundable. Payments processed by Paddle as Merchant of Record.',
  alternates: {
    canonical: 'https://reattend.com/refund',
  },
}

export default function RefundLayout({ children }: { children: React.ReactNode }) {
  return children
}
