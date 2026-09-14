import type { Metadata } from 'next'

// Post-signup onboarding: useless to searchers and personal to each account.
export const metadata: Metadata = { robots: { index: false, follow: false } }

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return children
}
