import React from 'react'
import { Metadata } from 'next'
import { Navbar } from '@/components/landing/navbar'
import { Footer } from '@/components/landing/footer'
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
        text: 'Yes. All data is encrypted at rest using AES-256 and in transit using TLS 1.3. Your memories are protected by industry-standard encryption protocols.',
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
        text: 'Yes. Reattend is fully GDPR compliant. You can export or delete your data at any time. We process only the minimum data required to deliver the service.',
      },
    },
    {
      '@type': 'Question',
      name: 'Where is my data stored?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Your data is stored in secure, SOC 2-compliant data centers. We use isolated databases per workspace to ensure complete data separation between teams.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I delete all my data?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. You can delete your account and all associated data at any time from your settings. Deletion is permanent and irreversible, and we purge all data from our systems.',
      },
    },
  ],
}

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#111] overflow-x-hidden">
      <Navbar />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <SecurityContent />
      <Footer />
    </div>
  )
}
