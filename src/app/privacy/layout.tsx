import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy · Reattend Enterprise',
  description: 'How Reattend Enterprise handles customer data. Per-org isolation, no cross-customer data flow, no training on customer content, on-premise deployment available.',
  alternates: {
    canonical: 'https://enterprise.reattend.com/privacy',
  },
}

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children
}
