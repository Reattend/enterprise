import React from 'react'
import { Metadata } from 'next'
import { Navbar } from '@/components/landing/navbar'
import { Footer } from '@/components/landing/footer'
import FaqContent from './faq-content'

export const metadata: Metadata = {
  title: 'FAQ - Frequently Asked Questions | Reattend',
  description:
    'Find answers to common questions about Reattend - pricing, security, integrations, getting started, and more.',
  openGraph: {
    title: 'FAQ - Reattend',
    description: 'Answers to common questions about Reattend, the AI decision intelligence platform for teams.',
    url: 'https://reattend.com/faq',
  },
  alternates: { canonical: 'https://reattend.com/faq' },
}

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is Reattend?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Reattend is the AI that catches what your team forgot. It captures every decision, meeting outcome, and piece of context, then organizes them with AI, catches contradictions, and makes everything searchable through a living knowledge graph.',
      },
    },
    {
      '@type': 'Question',
      name: 'How much does Reattend cost?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Reattend offers a Pro coming soon with all features — ambient capture, meeting recording, AI triage, semantic search, and more. After the trial, Pro is $20/month for unlimited AI. Or keep using Reattend free forever as a notetaker.',
      },
    },
    {
      '@type': 'Question',
      name: 'Is my data secure?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. All data is encrypted at rest (AES-256) and in transit (TLS 1.3). Each workspace has complete data isolation. We never sell or share your data.',
      },
    },
    {
      '@type': 'Question',
      name: 'What integrations does Reattend support?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Reattend is building integrations with 100+ tools including Slack, Notion, Jira, Gmail, Zoom, GitHub, and more. All integrations are included in every plan.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I use Reattend for free?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. Reattend offers a Pro coming soon with all features. After the trial, you can upgrade to Pro ($20/month) or continue using Reattend free forever as a notetaker. No credit card required.',
      },
    },
  ],
}

export default function FaqPage() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#111] overflow-x-hidden">
      <Navbar />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <FaqContent />
      <Footer />
    </div>
  )
}
