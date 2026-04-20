import React from 'react'
import Link from 'next/link'
import { Metadata } from 'next'
import { Navbar } from '@/components/landing/navbar'
import { Footer } from '@/components/landing/footer'

export const metadata: Metadata = {
  title: 'Terms of Service - Reattend',
  description: 'Reattend Terms of Service. Account usage, subscriptions, billing, content ownership, AI features, data privacy, and cancellation policies.',
  alternates: { canonical: 'https://reattend.com/terms' },
}

const sections = [
  { id: 'acceptance', label: 'Acceptance of Terms' },
  { id: 'account', label: 'Account Registration' },
  { id: 'use', label: 'Use of the Service' },
  { id: 'billing', label: 'Subscriptions and Billing' },
  { id: 'trial', label: 'Free Trial' },
  { id: 'cancellation', label: 'Cancellation and Refunds' },
  { id: 'content', label: 'Your Content' },
  { id: 'teams', label: 'Team Workspaces' },
  { id: 'ai', label: 'AI-Powered Features' },
  { id: 'privacy', label: 'Privacy' },
  { id: 'ip', label: 'Intellectual Property' },
  { id: 'liability', label: 'Limitation of Liability' },
  { id: 'warranties', label: 'Disclaimer of Warranties' },
  { id: 'termination', label: 'Termination' },
  { id: 'modifications', label: 'Modifications to Terms' },
  { id: 'governing-law', label: 'Governing Law' },
  { id: 'contact', label: 'Contact Us' },
]

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] overflow-x-hidden">
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full bg-gradient-to-br from-[#4F46E5]/8 via-[#818CF8]/5 to-transparent blur-3xl" />
      </div>

      <Navbar />

      {/* Hero header */}
      <div className="px-5 pt-16 pb-10 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#4F46E5]/8 text-[#4F46E5] text-[13px] font-semibold mb-5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#4F46E5]" />
          Legal
        </div>
        <h1 className="text-[36px] md:text-[52px] font-bold tracking-[-0.03em] leading-[1.1] text-[#1a1a2e] mb-3">
          Terms &amp; <span className="text-[#4F46E5]">Conditions</span>
        </h1>
        <p className="text-gray-400 text-[14px]">Last updated: February 18, 2026 &nbsp;&middot;&nbsp; Reattend Technologies Private Limited</p>
      </div>

      <main className="max-w-[1100px] mx-auto px-5 pb-24">
        <div className="flex gap-10 items-start">

          {/* Sticky TOC */}
          <aside className="hidden lg:block w-[220px] shrink-0">
            <div className="sticky top-24 bg-white/70 backdrop-blur-xl border border-white/80 shadow-[0_2px_12px_rgba(0,0,0,0.04)] rounded-2xl p-5">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Contents</p>
              <nav className="space-y-1">
                {sections.map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    className="block text-[12px] text-gray-500 hover:text-[#4F46E5] py-1 transition-colors leading-snug"
                  >
                    {s.label}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="bg-white/70 backdrop-blur-xl border border-white/80 shadow-[0_2px_16px_rgba(0,0,0,0.04)] rounded-2xl p-8 md:p-10">
              <p className="text-[15px] text-gray-600 leading-relaxed mb-10">
                These Terms and Conditions (&ldquo;Terms&rdquo;) govern your use of the Reattend platform (&ldquo;Service&rdquo;),
                operated by Reattend Technologies Private Limited (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;). By accessing
                or using the Service, you agree to be bound by these Terms.
              </p>

              <div className="space-y-10 divide-y divide-gray-100">

                <section id="acceptance" className="pt-10 first:pt-0">
                  <h2 className="text-[20px] font-bold mb-4 text-[#1a1a2e]">1. Acceptance of Terms</h2>
                  <p className="text-[15px] text-gray-600 leading-relaxed">
                    By creating an account or using the Service, you confirm that you are at least 18 years
                    old and agree to comply with these Terms. If you do not agree, you must not use the Service.
                  </p>
                </section>

                <section id="account" className="pt-10">
                  <h2 className="text-[20px] font-bold mb-4 text-[#1a1a2e]">2. Account Registration</h2>
                  <p className="text-[15px] text-gray-600 leading-relaxed">
                    You must provide a valid email address to create an account. You are responsible for
                    maintaining the security of your account credentials and for all activities that occur
                    under your account. You must notify us immediately at{' '}
                    <a href="mailto:pb@reattend.ai" className="text-[#4F46E5] hover:underline">pb@reattend.ai</a>{' '}
                    or{' '}
                    <a href="mailto:anjan@reattend.ai" className="text-[#4F46E5] hover:underline">anjan@reattend.ai</a>{' '}
                    if you suspect unauthorized access to your account.
                  </p>
                </section>

                <section id="use" className="pt-10">
                  <h2 className="text-[20px] font-bold mb-4 text-[#1a1a2e]">3. Use of the Service</h2>
                  <p className="text-[15px] text-gray-600 leading-relaxed mb-3">
                    You agree to use the Service only for lawful purposes. You must not:
                  </p>
                  <ul className="space-y-2 ml-5">
                    {[
                      'Use the Service to store, transmit, or distribute any illegal, harmful, or offensive content.',
                      'Attempt to gain unauthorized access to any part of the Service or its systems.',
                      'Interfere with or disrupt the integrity or performance of the Service.',
                      'Reverse-engineer, decompile, or disassemble any aspect of the Service.',
                      'Use the Service for any purpose that competes with Reattend.',
                      'Share your account credentials with third parties.',
                    ].map((item) => (
                      <li key={item} className="text-[15px] text-gray-600 leading-relaxed list-disc">{item}</li>
                    ))}
                  </ul>
                </section>

                <section id="billing" className="pt-10">
                  <h2 className="text-[20px] font-bold mb-4 text-[#1a1a2e]">4. Subscriptions and Billing</h2>
                  <p className="text-[15px] text-gray-600 leading-relaxed mb-3">
                    The Service offers free and paid subscription plans. Paid plans are billed on a monthly
                    or annual basis, as selected at the time of purchase. By subscribing to a paid plan,
                    you authorize us to charge your payment method on a recurring basis until you cancel.
                  </p>
                  <p className="text-[15px] text-gray-600 leading-relaxed">
                    All billing is handled by Paddle, our authorized reseller and Merchant of Record.
                    Prices may change with 30 days notice. Any changes will not affect your current billing cycle.
                  </p>
                </section>

                <section id="trial" className="pt-10">
                  <h2 className="text-[20px] font-bold mb-4 text-[#1a1a2e]">5. Free Trial</h2>
                  <p className="text-[15px] text-gray-600 leading-relaxed">
                    New users may activate a 60-day free trial of all Pro features from inside their
                    dashboard. No credit card is required during the trial. If you do not subscribe before
                    the trial ends, your account automatically reverts to the Free Forever plan.
                    Your memories and data are never deleted.
                  </p>
                </section>

                <section id="cancellation" className="pt-10">
                  <h2 className="text-[20px] font-bold mb-4 text-[#1a1a2e]">6. Cancellation and Refunds</h2>
                  <p className="text-[15px] text-gray-600 leading-relaxed mb-3">
                    You may cancel your subscription at any time through your account settings. Upon
                    cancellation, you retain access to paid features until the end of your current
                    billing period.
                  </p>
                  <p className="text-[15px] text-gray-600 leading-relaxed">
                    Refunds for duplicate charges or billing errors are handled by Paddle. Please refer to
                    our{' '}
                    <Link href="/refund" className="text-[#4F46E5] hover:underline">Refund Policy</Link>{' '}
                    for full details.
                  </p>
                </section>

                <section id="content" className="pt-10">
                  <h2 className="text-[20px] font-bold mb-4 text-[#1a1a2e]">7. Your Content</h2>
                  <p className="text-[15px] text-gray-600 leading-relaxed mb-3">
                    You retain full ownership of all content you upload or create on the Service
                    (&ldquo;Your Content&rdquo;). By using the Service, you grant us a limited license to process
                    Your Content solely for the purpose of providing and improving the Service.
                  </p>
                  <p className="text-[15px] text-gray-600 leading-relaxed">
                    We do not use Your Content to train AI models. Your memories and data are private by default.
                  </p>
                </section>

                <section id="teams" className="pt-10">
                  <h2 className="text-[20px] font-bold mb-4 text-[#1a1a2e]">8. Team Workspaces</h2>
                  <p className="text-[15px] text-gray-600 leading-relaxed">
                    If you create or join a team workspace, the workspace administrator controls access and
                    permissions. The administrator may add or remove members, change roles, and manage
                    shared content. You acknowledge that content shared in a team workspace is visible to
                    all workspace members you explicitly invite.
                  </p>
                </section>

                <section id="ai" className="pt-10">
                  <h2 className="text-[20px] font-bold mb-4 text-[#1a1a2e]">9. AI-Powered Features</h2>
                  <p className="text-[15px] text-gray-600 leading-relaxed">
                    The Service uses artificial intelligence to enrich, tag, and connect your memories.
                    While we strive for accuracy, AI-generated content (summaries, tags, action items)
                    may contain errors. You are responsible for reviewing AI-generated outputs before
                    acting on them.
                  </p>
                </section>

                <section id="privacy" className="pt-10">
                  <h2 className="text-[20px] font-bold mb-4 text-[#1a1a2e]">10. Privacy</h2>
                  <p className="text-[15px] text-gray-600 leading-relaxed">
                    Your use of the Service is also governed by our{' '}
                    <Link href="/privacy" className="text-[#4F46E5] hover:underline">Privacy Policy</Link>,
                    which explains how we collect, use, and protect your information.
                  </p>
                </section>

                <section id="ip" className="pt-10">
                  <h2 className="text-[20px] font-bold mb-4 text-[#1a1a2e]">11. Intellectual Property</h2>
                  <p className="text-[15px] text-gray-600 leading-relaxed">
                    The Service, including its design, code, features, and branding, is owned by
                    Reattend Technologies Private Limited and protected by intellectual property laws.
                    You may not copy, modify, or distribute any part of the Service without our
                    written consent.
                  </p>
                </section>

                <section id="liability" className="pt-10">
                  <h2 className="text-[20px] font-bold mb-4 text-[#1a1a2e]">12. Limitation of Liability</h2>
                  <p className="text-[15px] text-gray-600 leading-relaxed">
                    To the maximum extent permitted by law, Reattend Technologies Private Limited shall
                    not be liable for any indirect, incidental, special, consequential, or punitive damages
                    arising from your use of the Service. Our total liability shall not exceed the amount
                    you paid us in the 12 months preceding the claim.
                  </p>
                </section>

                <section id="warranties" className="pt-10">
                  <h2 className="text-[20px] font-bold mb-4 text-[#1a1a2e]">13. Disclaimer of Warranties</h2>
                  <p className="text-[15px] text-gray-600 leading-relaxed">
                    The Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without warranties of any kind,
                    either express or implied, including but not limited to warranties of merchantability,
                    fitness for a particular purpose, or non-infringement.
                  </p>
                </section>

                <section id="termination" className="pt-10">
                  <h2 className="text-[20px] font-bold mb-4 text-[#1a1a2e]">14. Termination</h2>
                  <p className="text-[15px] text-gray-600 leading-relaxed">
                    We may suspend or terminate your account if you violate these Terms or engage in
                    conduct that we determine is harmful to the Service or other users. You may delete
                    your account at any time by contacting us at{' '}
                    <a href="mailto:pb@reattend.ai" className="text-[#4F46E5] hover:underline">pb@reattend.ai</a>.
                  </p>
                </section>

                <section id="modifications" className="pt-10">
                  <h2 className="text-[20px] font-bold mb-4 text-[#1a1a2e]">15. Modifications to Terms</h2>
                  <p className="text-[15px] text-gray-600 leading-relaxed">
                    We reserve the right to update these Terms at any time. We will notify you of material
                    changes via email or through the Service. Your continued use of the Service after
                    changes take effect constitutes acceptance of the updated Terms.
                  </p>
                </section>

                <section id="governing-law" className="pt-10">
                  <h2 className="text-[20px] font-bold mb-4 text-[#1a1a2e]">16. Governing Law</h2>
                  <p className="text-[15px] text-gray-600 leading-relaxed">
                    These Terms shall be governed by and construed in accordance with the laws of India,
                    where Reattend Technologies Private Limited is incorporated. Any disputes arising
                    from these Terms shall be resolved through good-faith negotiation or, if necessary,
                    through binding arbitration under applicable Indian law.
                  </p>
                </section>

                <section id="contact" className="pt-10">
                  <h2 className="text-[20px] font-bold mb-4 text-[#1a1a2e]">17. Contact Us</h2>
                  <p className="text-[15px] text-gray-600 leading-relaxed mb-4">
                    If you have any questions about these Terms, please contact us:
                  </p>
                  <div className="rounded-xl bg-[#4F46E5]/5 border border-[#4F46E5]/10 p-5 space-y-2">
                    <p className="text-[14px] text-[#1a1a2e] font-semibold">Reattend Technologies Private Limited</p>
                    <p className="text-[14px] text-gray-600">
                      Legal inquiries:{' '}
                      <a href="mailto:pb@reattend.ai" className="text-[#4F46E5] hover:underline">pb@reattend.ai</a>
                    </p>
                    <p className="text-[14px] text-gray-600">
                      General contact:{' '}
                      <a href="mailto:anjan@reattend.ai" className="text-[#4F46E5] hover:underline">anjan@reattend.ai</a>
                    </p>
                  </div>
                </section>

              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
