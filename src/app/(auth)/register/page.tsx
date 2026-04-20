import { Metadata } from 'next'
import { Suspense } from 'react'
import RegisterPage from './register-form'

export const metadata: Metadata = {
  title: 'Sign Up Free',
  description: 'Create your free Reattend workspace in 30 seconds. Full AI included: semantic search, entity extraction, contradiction detection. No credit card.',
  alternates: { canonical: 'https://reattend.com/register' },
}

export default function Page() {
  return (
    <Suspense>
      <RegisterPage />
    </Suspense>
  )
}
