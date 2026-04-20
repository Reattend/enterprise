import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Connect Slack from Reattend',
  robots: { index: false },
}

export default function SlackConnectRequired() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#4A154B] flex items-center justify-center mx-auto mb-6">
          {/* Slack mark */}
          <svg width="28" height="28" viewBox="0 0 122 122" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M25.6 77.6C25.6 84.6 19.9 90.3 12.8 90.3C5.7 90.3 0 84.6 0 77.6C0 70.6 5.7 64.9 12.8 64.9H25.6V77.6Z" fill="white"/>
            <path d="M32 77.6C32 70.6 37.7 64.9 44.8 64.9C51.9 64.9 57.6 70.6 57.6 77.6V109.2C57.6 116.2 51.9 121.9 44.8 121.9C37.7 121.9 32 116.2 32 109.2V77.6Z" fill="white"/>
            <path d="M44.8 25.6C37.7 25.6 32 19.9 32 12.8C32 5.7 37.7 0 44.8 0C51.9 0 57.6 5.7 57.6 12.8V25.6H44.8Z" fill="white"/>
            <path d="M44.8 32C51.9 32 57.6 37.7 57.6 44.8C57.6 51.9 51.9 57.6 44.8 57.6H12.8C5.7 57.6 0 51.9 0 44.8C0 37.7 5.7 32 12.8 32H44.8Z" fill="white"/>
            <path d="M96.4 44.8C96.4 37.7 102.1 32 109.2 32C116.3 32 122 37.7 122 44.8C122 51.9 116.3 57.6 109.2 57.6H96.4V44.8Z" fill="white"/>
            <path d="M90 44.8C90 51.9 84.3 57.6 77.2 57.6C70.1 57.6 64.4 51.9 64.4 44.8V12.8C64.4 5.7 70.1 0 77.2 0C84.3 0 90 5.7 90 12.8V44.8Z" fill="white"/>
            <path d="M77.2 96.4C84.3 96.4 90 102.1 90 109.2C90 116.3 84.3 122 77.2 122C70.1 122 64.4 116.3 64.4 109.2V96.4H77.2Z" fill="white"/>
            <path d="M77.2 90C70.1 90 64.4 84.3 64.4 77.2C64.4 70.1 70.1 64.4 77.2 64.4H109.2C116.3 64.4 122 70.1 122 77.2C122 84.3 116.3 90 109.2 90H77.2Z" fill="white"/>
          </svg>
        </div>

        <h1 className="text-2xl font-semibold text-gray-900 mb-3">
          Connect Slack from your Reattend dashboard
        </h1>
        <p className="text-gray-500 mb-8 leading-relaxed">
          To connect Slack, you need to start from inside Reattend — not from the Slack App Directory.
          Sign in to your account and go to <strong>Integrations</strong> to connect.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/app/integrations"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 transition-colors"
          >
            Go to Integrations
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Back to Reattend
          </Link>
        </div>
      </div>
    </div>
  )
}
