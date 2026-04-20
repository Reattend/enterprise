import React from 'react'
import { Metadata } from 'next'
import { Navbar } from '@/components/landing/navbar'
import { Footer } from '@/components/landing/footer'

export const metadata: Metadata = {
  title: 'Sub-processors - Reattend',
  description: 'List of third-party sub-processors used by Reattend to deliver its services, including their purpose, location, and data handling policies.',
  alternates: { canonical: 'https://reattend.com/subprocessors' },
}

const subprocessors = [
  {
    name: 'Anthropic',
    purpose: 'AI enrichment',
    description: 'Processes memory content (text) to generate summaries, tags, categories, action items, and entity extraction. Data is sent via API and processed transiently — Anthropic does not store or train on customer data submitted via API.',
    location: 'United States',
    dataTransferred: 'Memory text content (notes, synced messages, meeting transcripts)',
    link: 'https://www.anthropic.com/privacy',
    linkLabel: 'Privacy Policy',
  },
  {
    name: 'Resend',
    purpose: 'Transactional email',
    description: 'Sends transactional emails including verification codes, workspace invitation emails, and account notifications. No memory or integration content is sent via email infrastructure.',
    location: 'United States',
    dataTransferred: 'Email address, name (for workspace invitations)',
    link: 'https://resend.com/legal/privacy-policy',
    linkLabel: 'Privacy Policy',
  },
  {
    name: 'DigitalOcean',
    purpose: 'Cloud infrastructure and data storage',
    description: 'Hosts all Reattend application servers, databases, and file storage. All user data at rest resides on DigitalOcean infrastructure in the BLR1 (Bangalore, India) region.',
    location: 'India (BLR1 — Bangalore)',
    dataTransferred: 'All user data (account data, memories, integration data, files)',
    link: 'https://www.digitalocean.com/legal/privacy-policy',
    linkLabel: 'Privacy Policy',
  },
]

export default function SubprocessorsPage() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] overflow-x-hidden">
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full bg-gradient-to-br from-[#4F46E5]/8 via-[#818CF8]/5 to-transparent blur-3xl" />
      </div>

      <Navbar />

      <div className="px-5 pt-16 pb-10 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#4F46E5]/8 text-[#4F46E5] text-[13px] font-semibold mb-5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#4F46E5]" />
          Legal
        </div>
        <h1 className="text-[36px] md:text-[52px] font-bold tracking-[-0.03em] leading-[1.1] text-[#1a1a2e] mb-3">
          Sub-<span className="text-[#4F46E5]">processors</span>
        </h1>
        <p className="text-gray-400 text-[14px]">
          Last updated: March 25, 2026 &nbsp;&middot;&nbsp; Reattend Technologies Private Limited
        </p>
      </div>

      <main className="max-w-[860px] mx-auto px-5 pb-24">
        <div className="bg-white/70 backdrop-blur-xl border border-white/80 shadow-[0_2px_16px_rgba(0,0,0,0.04)] rounded-2xl p-8 md:p-10 space-y-8">

          <p className="text-[15px] text-gray-600 leading-relaxed">
            Reattend Technologies Private Limited (&ldquo;Reattend&rdquo;) uses the following third-party
            sub-processors to deliver its services. A sub-processor is any third party that processes
            personal data on our behalf as part of providing the Reattend platform.
          </p>

          <p className="text-[15px] text-gray-600 leading-relaxed">
            We only engage sub-processors that provide sufficient guarantees to implement appropriate
            technical and organisational measures to ensure the protection of your data. We maintain
            data processing agreements with each sub-processor listed below.
          </p>

          <div className="space-y-6 pt-2">
            {subprocessors.map((sp, i) => (
              <div
                key={sp.name}
                className="rounded-xl border border-gray-100 overflow-hidden"
              >
                <div className="flex items-center justify-between px-6 py-4 bg-gray-50/80 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-semibold text-gray-400 w-5">{i + 1}</span>
                    <h2 className="text-[16px] font-bold text-[#1a1a2e]">{sp.name}</h2>
                    <span className="text-[11px] font-medium bg-[#4F46E5]/8 text-[#4F46E5] px-2.5 py-0.5 rounded-full">
                      {sp.purpose}
                    </span>
                  </div>
                  <a
                    href={sp.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[12px] text-[#4F46E5] hover:underline shrink-0"
                  >
                    {sp.linkLabel} →
                  </a>
                </div>
                <div className="px-6 py-5 space-y-4">
                  <p className="text-[14px] text-gray-600 leading-relaxed">{sp.description}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                        Location
                      </p>
                      <p className="text-[13px] text-[#1a1a2e]">{sp.location}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                        Data transferred
                      </p>
                      <p className="text-[13px] text-[#1a1a2e]">{sp.dataTransferred}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-gray-100 space-y-4">
            <h3 className="text-[16px] font-bold text-[#1a1a2e]">Updates to this list</h3>
            <p className="text-[14px] text-gray-600 leading-relaxed">
              We will update this page when we add, remove, or change sub-processors. If you use
              Reattend under a data processing agreement that includes sub-processor notification
              rights, we will notify you of material changes before they take effect.
            </p>
          </div>

          <div className="pt-2 border-t border-gray-100 space-y-4">
            <h3 className="text-[16px] font-bold text-[#1a1a2e]">Questions</h3>
            <p className="text-[14px] text-gray-600 leading-relaxed">
              If you have questions about our sub-processors or data processing practices, contact us at{' '}
              <a href="mailto:pb@reattend.ai" className="text-[#4F46E5] hover:underline">
                pb@reattend.ai
              </a>.
            </p>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  )
}
