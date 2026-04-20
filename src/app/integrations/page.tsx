import React, { Suspense } from 'react'
import { Metadata } from 'next'
import { Navbar } from '@/components/landing/navbar'
import { Footer } from '@/components/landing/footer'
import IntegrationsContent from './integrations-content'

export const metadata: Metadata = {
  title: 'Integrations | Connect Your Favorite Tools | Reattend',
  description:
    'Reattend integrates with 100+ tools you already use: Slack, Notion, Jira, Gmail, Zoom, and more. Your team knowledge, unified in one place.',
  openGraph: {
    title: 'Integrations | Reattend',
    description: 'Connect 100+ tools to your team memory. Slack, Notion, Jira, Gmail, Zoom, and more.',
    url: 'https://reattend.com/integrations',
  },
  alternates: { canonical: 'https://reattend.com/integrations' },
}

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'How many integrations does Reattend support?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Reattend is building integrations with 100+ tools across communication, email, docs, project management, CRM, storage, design, analytics, and productivity categories.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I request an integration that is not listed?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes! Use the request form on our integrations page to tell us which tool you use. We prioritize integrations based on user demand.',
      },
    },
    {
      '@type': 'Question',
      name: 'Are integrations free?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'All integrations are included in every Reattend plan. There are no extra charges for connecting your tools.',
      },
    },
  ],
}

export default function IntegrationsPage() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#111] overflow-x-hidden">
      <Navbar />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <Suspense fallback={null}>
        <IntegrationsContent />
      </Suspense>
      <Footer />
    </div>
  )
}
