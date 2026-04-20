import React from 'react'
import { Metadata } from 'next'
import { Navbar } from '@/components/landing/navbar'
import { Footer } from '@/components/landing/footer'
import { HelpSearch } from '@/components/help/help-search'

export const metadata: Metadata = {
  title: 'Help Center - Reattend',
  description:
    'Learn how to use Reattend - guides on decisions, projects, boards, search, Ask AI, teams, integrations, and more.',
  openGraph: {
    title: 'Help Center - Reattend',
    description: 'Guides and documentation for Reattend, the AI decision intelligence platform for teams.',
    url: 'https://reattend.com/help',
  },
  alternates: { canonical: 'https://reattend.com/help' },
}

const helpJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Help Center',
  description: 'Guides and documentation for Reattend, the AI decision intelligence platform for teams.',
  url: 'https://reattend.com/help',
  publisher: {
    '@type': 'Organization',
    name: 'Reattend',
    url: 'https://reattend.com',
  },
}

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Background gradients */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-[#4F46E5]/8 to-[#818CF8]/5 blur-3xl" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-[#818CF8]/6 to-[#C084FC]/4 blur-3xl" />
      </div>

      <Navbar />

      <main className="max-w-[1100px] mx-auto px-5 pt-16 pb-24">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-[#4F46E5]/8 text-[#4F46E5] text-[13px] font-semibold px-4 py-1.5 rounded-full mb-5">
            Help Center
          </div>
          <h1 className="text-[36px] sm:text-[48px] font-bold tracking-[-0.03em] leading-[1.1] text-[#1a1a2e] mb-4">
            How can we help?
          </h1>
          <p className="text-[16px] text-gray-500 max-w-lg mx-auto leading-relaxed">
            Browse guides by category or search for a specific topic.
          </p>
        </div>

        <HelpSearch />
      </main>

      <Footer />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(helpJsonLd) }}
      />
    </div>
  )
}
