import { Metadata } from 'next'
import LoginPage from './login-form'

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to your Reattend workspace. Access your team decisions, knowledge graph, and AI-powered memory.',
  alternates: { canonical: 'https://reattend.com/login' },
}

export default function Page() {
  return <LoginPage />
}
