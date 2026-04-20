import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms & Conditions',
  description: 'Reattend terms and conditions. Read our terms of service for using the AI memory platform.',
  alternates: {
    canonical: 'https://reattend.com/terms',
  },
}

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children
}
