import { Metadata } from 'next'
import { BrainDumpOrganizer } from './organizer'

export const metadata: Metadata = {
  title: 'Brain Dump Organizer | Reattend',
  description: 'Dump everything on your mind and watch it organize itself into tasks, decisions, ideas, questions, and more. Free tool for knowledge workers.',
  openGraph: {
    title: 'Brain Dump Organizer | Reattend',
    description: 'Dump everything on your mind and watch it organize itself. Free, no signup required.',
    type: 'website',
    siteName: 'Reattend',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Brain Dump Organizer | Reattend',
    description: 'Dump everything on your mind and watch it organize itself. Free tool for knowledge workers.',
  },
  alternates: { canonical: 'https://reattend.com/tool/brain-dump-organizer' },
}

export default function BrainDumpOrganizerPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Brain Dump Organizer',
    description: 'Dump everything on your mind and watch it organize itself into tasks, decisions, ideas, questions, and more. Free tool for knowledge workers.',
    url: 'https://reattend.com/tool/brain-dump-organizer',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Any',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    provider: {
      '@type': 'Organization',
      name: 'Reattend',
      url: 'https://reattend.com',
    },
  }

  return (
    <>
      <BrainDumpOrganizer />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  )
}
