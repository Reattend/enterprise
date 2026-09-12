import React from 'react'
import { Metadata } from 'next'
import { MarketingNavbar } from '@/components/marketing/marketing-navbar'
import { MarketingFooter } from '@/components/marketing/marketing-footer'
import SecurityContent from './security-content'

export const metadata: Metadata = {
  title: 'Security - Your Data, Protected | Reattend',
  description:
    'Reattend keeps your team knowledge secure, private, and fully protected. End-to-end encryption, SOC 2-ready architecture, and zero-compromise data privacy.',
  openGraph: {
    title: 'Security - Reattend',
    description: 'Your team knowledge, secure and private. End-to-end encryption, SOC 2-ready, GDPR compliant.',
    url: 'https://reattend.com/security',
  },
  alternates: { canonical: 'https://reattend.com/security' },
}

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Is my data encrypted?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'All traffic to Reattend is encrypted in transit with TLS, and credentials such as AI provider keys and SSO secrets are encrypted with AES-256-GCM before storage.',
      },
    },
    {
      '@type': 'Question',
      name: 'Does Reattend sell or share my data?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Never. Your data belongs to you. We do not sell, share, or use your data for advertising. Reattend only processes your data to deliver the service.',
      },
    },
    {
      '@type': 'Question',
      name: 'Is Reattend GDPR compliant?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'You can export your data and delete your account at any time from settings, and we process only the data the service needs. A formal compliance audit is on the roadmap.',
      },
    },
    {
      '@type': 'Question',
      name: 'Where is my data stored?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'In a single United States region on SOC 2-audited infrastructure. Every search and answer is permission-filtered per user, so nobody is shown a memory they are not allowed to see. Dedicated regional or on-premise deployments are available for government and regulated organizations.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I delete all my data?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. You can delete your account and all associated data at any time from your settings. Deletion is permanent and irreversible.',
      },
    },
  ],
}

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#111] overflow-x-hidden">
      <MarketingNavbar />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <SecurityContent />
      <MarketingFooter />
    </div>
  )
}
