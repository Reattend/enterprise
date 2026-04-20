import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Reattend privacy policy. Your memories are private by default and never used to train AI models. Industry-standard encryption for data at rest and in transit.',
  alternates: {
    canonical: 'https://reattend.com/privacy',
  },
}

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children
}
