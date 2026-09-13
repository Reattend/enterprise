import { Suspense } from 'react'
import { Metadata } from 'next'
import { MeetingRecorder } from './recorder'
import { OG_IMAGE } from '@/lib/seo/og-image'

export const metadata: Metadata = {
  title: 'Free Meeting Recorder | Record & Share Meeting Notes | Reattend',
  description: 'Record your meetings with one click. Capture audio, take notes, and share a clean meeting record via email. No sign-up required, completely free.',
  openGraph: {
    images: [OG_IMAGE],
    title: 'Free Meeting Recorder | Reattend',
    description: 'Record meetings, take notes, and share a clean meeting record. No sign-up, no AI, completely free.',
    type: 'website',
    siteName: 'Reattend',
  },
  twitter: {
    images: [OG_IMAGE.url],
    card: 'summary_large_image',
    title: 'Free Meeting Recorder | Reattend',
    description: 'Record meetings, take notes, and share a clean meeting record. No sign-up, no AI, completely free.',
  },
  alternates: { canonical: 'https://reattend.com/record' },
}

export default function MeetingRecorderPage() {
  return (
    <Suspense>
      <MeetingRecorder />
    </Suspense>
  )
}
