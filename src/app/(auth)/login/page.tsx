import { Metadata } from 'next'
import LoginPage from './login-form'

export const metadata: Metadata = {
  title: 'Sign in · Reattend Enterprise',
  description: 'Sign in to your Reattend Enterprise workspace with a one-time email code.',
  alternates: { canonical: 'https://enterprise.reattend.com/login' },
}

export default function Page() {
  return <LoginPage />
}
