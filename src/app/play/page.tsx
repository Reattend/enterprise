import { Suspense } from 'react'
import { Metadata } from 'next'
import { PlayJoin } from './join'
import { OG_IMAGE } from '@/lib/seo/og-image'

export const metadata: Metadata = {
  title: 'Join Game Room | Reattend',
  description: 'Enter your room code to join a multiplayer team game. Free team games for meetings, TGIFs and team bonding, played in the browser with no signup or download.',
  openGraph: {
    images: [OG_IMAGE],
    title: 'Join Game Room | Reattend',
    description: 'Enter your room code to join a multiplayer team game.',
    type: 'website',
    siteName: 'Reattend',
  },
  twitter: {
    images: [OG_IMAGE.url],
    card: 'summary_large_image',
    title: 'Join Game Room | Reattend',
    description: 'Enter your room code to join a multiplayer team game.',
  },
  alternates: { canonical: 'https://reattend.com/play' },
}

export default function PlayPage() {
  return (
    <Suspense>
      <PlayJoin />
    </Suspense>
  )
}
