import React from 'react'
import { Metadata } from 'next'
import { MarketingNavbar } from '@/components/marketing/marketing-navbar'
import { MarketingFooter } from '@/components/marketing/marketing-footer'
import FaqContent from './faq-content'

export const metadata: Metadata = {
  title: 'FAQ - Frequently Asked Questions | Reattend',
  description:
    'Find answers to common questions about Reattend - pricing, security, integrations, getting started, and more.',
  openGraph: {
    title: 'FAQ - Reattend',
    description: 'Answers to common questions about Reattend - pricing, security, integrations and getting started.',
    url: 'https://reattend.com/faq',
  },
  alternates: { canonical: 'https://reattend.com/faq' },
}

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is Reattend?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Reattend is a memory layer for individuals and teams. It captures the decisions, notes and context you come across while you work, organizes and links them with AI, and answers questions from that memory with the source attached."
      }
    },
    {
      "@type": "Question",
      "name": "How much does Reattend cost?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Reattend is free forever if you connect your own AI provider key. If you would rather Reattend run the AI, a personal account is $9 a month for up to 800 questions, with a 7-day free trial. Team workspaces are $19 per seat per month, or $182.40 per seat per year, with a 15-day free trial. No card is needed to start a trial."
      }
    },
    {
      "@type": "Question",
      "name": "Is my data secure?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "All traffic is encrypted in transit with TLS, and credentials such as AI provider keys and SSO secrets are encrypted with AES-256-GCM before storage. Every search and answer is permission-filtered per user before the AI sees anything. Reattend does not sell or share your data."
      }
    },
    {
      "@type": "Question",
      "name": "What integrations does Reattend support?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Everyone can capture through the Reattend Chrome extension, in the app, or through the capture API, and use Reattend as an MCP server from compatible AI assistants. Team workspaces can connect Gmail, Google Drive, Slack, Notion and Confluence, switched on per workspace. Connectors for personal accounts are coming soon."
      }
    },
    {
      "@type": "Question",
      "name": "Can I use Reattend for free?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes, forever, by connecting your own AI provider key. Without a key you can still capture and store memories; answers need either a key or a paid plan."
      }
    }
  ]
}

export default function FaqPage() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#111] overflow-x-hidden">
      <MarketingNavbar />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <FaqContent />
      <MarketingFooter />
    </div>
  )
}
