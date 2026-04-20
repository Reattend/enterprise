import React from 'react'
import { Metadata } from 'next'
import { Navbar } from '@/components/landing/navbar'
import { Footer } from '@/components/landing/footer'

export const metadata: Metadata = {
  title: 'Refund Policy - Reattend',
  description: 'Reattend refund policy. 60-day free trial with no charge. Subscription and cancellation details. Billing handled by Paddle.',
  alternates: { canonical: 'https://reattend.com/refund' },
}

const sections = [
  { id: 'free-plan', label: 'Free Plan' },
  { id: 'trial', label: '60-Day Free Trial' },
  { id: 'paid', label: 'Paid Subscriptions' },
  { id: 'eu-uk', label: 'EU / UK Right of Withdrawal' },
  { id: 'exceptions', label: 'Exceptions' },
  { id: 'teams', label: 'Team & Workspace Usage' },
  { id: 'taxes', label: 'Taxes & VAT' },
  { id: 'how-to', label: 'How to Request a Refund' },
  { id: 'abuse', label: 'Abuse & Fraud' },
  { id: 'after', label: 'After a Refund' },
  { id: 'changes', label: 'Changes to This Policy' },
  { id: 'contact', label: 'Contact Us' },
]

export default function RefundPage() {
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
          Refund <span className="text-[#4F46E5]">Policy</span>
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
          <div className="flex-1 min-w-0 space-y-5">

            {/* TL;DR */}
            <div className="rounded-2xl bg-white/70 backdrop-blur-xl border border-white/80 shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-5">
              <p className="text-[15px] text-gray-600 leading-relaxed">
                <strong className="text-[#1a1a2e]">TL;DR:</strong> 60-day free trial, no credit card required.
                Cancel anytime. After payment, subscriptions are non-refundable except for billing errors
                or technical failures. Your data is always preserved.
              </p>
            </div>

            {/* Merchant of Record */}
            <div className="rounded-2xl bg-[#4F46E5]/5 border border-[#4F46E5]/10 p-5">
              <p className="text-[15px] text-gray-600 leading-relaxed">
                Reattend is sold and billed through{' '}
                <a href="https://paddle.com" target="_blank" rel="noopener noreferrer" className="text-[#4F46E5] hover:underline font-medium">Paddle</a>,
                our authorized reseller and Merchant of Record. All payments, refunds, and billing matters
                are processed in accordance with Paddle&apos;s Consumer Terms, in addition to this policy.
              </p>
            </div>

            {/* Main content card */}
            <div className="bg-white/70 backdrop-blur-xl border border-white/80 shadow-[0_2px_16px_rgba(0,0,0,0.04)] rounded-2xl p-8 md:p-10">
              <div className="space-y-10 divide-y divide-gray-100">

                <section id="free-plan" className="first:pt-0">
                  <h2 className="text-[20px] font-bold mb-4 text-[#1a1a2e]">1. Free Plan</h2>
                  <p className="text-[15px] text-gray-600 leading-relaxed">
                    Reattend offers a <strong className="text-[#1a1a2e]">Free Forever</strong> plan with
                    unlimited standard memories, 10 AI queries per day, and 1 integration of your choice.
                    No payment is required and no refund applies.
                  </p>
                </section>

                <section id="trial" className="pt-10">
                  <h2 className="text-[20px] font-bold mb-4 text-[#1a1a2e]">2. 60-Day Free Trial (Pro Features)</h2>
                  <p className="text-[15px] text-gray-600 leading-relaxed mb-3">
                    Reattend offers a <strong className="text-[#1a1a2e]">60-day free trial</strong> of all
                    Pro features, activated from inside the dashboard.
                  </p>
                  <ul className="space-y-2 ml-5">
                    {[
                      'You will not be charged during the trial period.',
                      'No credit card is required to start the trial.',
                      'You may cancel anytime before the trial ends with no payment taken.',
                      'Once the trial converts to a paid subscription, standard refund rules apply.',
                    ].map((item) => (
                      <li key={item} className="text-[15px] text-gray-600 leading-relaxed list-disc">{item}</li>
                    ))}
                  </ul>
                </section>

                <section id="paid" className="pt-10">
                  <h2 className="text-[20px] font-bold mb-4 text-[#1a1a2e]">3. Paid Subscriptions (Pro and Teams)</h2>
                  <p className="text-[15px] text-gray-600 leading-relaxed mb-3">
                    Pro ($9/month) and Teams ($7/user/month) are billed on a{' '}
                    <strong className="text-[#1a1a2e]">monthly subscription basis</strong>.
                    Once a paid subscription begins:
                  </p>
                  <ul className="space-y-2 ml-5 mb-4">
                    {[
                      'All sales are final.',
                      'No refunds are provided for unused time within a billing period.',
                      'Cancelling stops future billing but does not trigger a refund for the current period.',
                    ].map((item) => (
                      <li key={item} className="text-[15px] text-gray-600 leading-relaxed list-disc">{item}</li>
                    ))}
                  </ul>
                  <p className="text-[15px] text-gray-600 leading-relaxed">
                    This applies whether you used the product fully or partially, forgot to cancel before
                    renewal, or changed your mind after subscribing.
                  </p>
                </section>

                <section id="eu-uk" className="pt-10">
                  <h2 className="text-[20px] font-bold mb-4 text-[#1a1a2e]">4. Consumer Right of Withdrawal (EU / UK)</h2>
                  <p className="text-[15px] text-gray-600 leading-relaxed mb-3">
                    If you are a consumer located in the UK or EU, you have a{' '}
                    <strong className="text-[#1a1a2e]">14-day statutory right to cancel</strong>.
                    However, this right is waived once:
                  </p>
                  <ul className="space-y-2 ml-5 mb-4">
                    {[
                      'Digital services are activated, and',
                      'AI-powered features (Pro) begin processing.',
                    ].map((item) => (
                      <li key={item} className="text-[15px] text-gray-600 leading-relaxed list-disc">{item}</li>
                    ))}
                  </ul>
                  <p className="text-[15px] text-gray-600 leading-relaxed">
                    By starting a Pro subscription or trial, you explicitly consent to immediate performance
                    of digital services and acknowledge that you lose the right of withdrawal once AI
                    processing begins. This mirrors Paddle&apos;s policy and EU digital content regulations.
                  </p>
                </section>

                <section id="exceptions" className="pt-10">
                  <h2 className="text-[20px] font-bold mb-4 text-[#1a1a2e]">5. Exceptions</h2>
                  <p className="text-[15px] text-gray-600 leading-relaxed mb-3">
                    Refunds are handled at Paddle&apos;s discretion and may be granted in limited cases, including:
                  </p>
                  <ul className="space-y-2 ml-5 mb-5">
                    {['Duplicate charges', 'Billing errors', 'Technical failure preventing access to Reattend', 'Charges taken in error'].map((item) => (
                      <li key={item} className="text-[15px] text-gray-600 leading-relaxed list-disc">{item}</li>
                    ))}
                  </ul>
                  <p className="text-[15px] text-gray-600 leading-relaxed mb-3">
                    Refunds will <strong className="text-[#1a1a2e]">not</strong> be granted if:
                  </p>
                  <ul className="space-y-2 ml-5">
                    {[
                      'AI services were actively used',
                      'There is evidence of abuse, fraud, or repeated refund requests',
                      'The request is made after extensive usage',
                    ].map((item) => (
                      <li key={item} className="text-[15px] text-gray-600 leading-relaxed list-disc">{item}</li>
                    ))}
                  </ul>
                </section>

                <section id="teams" className="pt-10">
                  <h2 className="text-[20px] font-bold mb-4 text-[#1a1a2e]">6. Team &amp; Workspace Usage</h2>
                  <ul className="space-y-2 ml-5">
                    {[
                      'Pro access is user-based, not workspace-based.',
                      'Refunds are evaluated per individual user subscription.',
                      'Mixed teams (free + paid users) do not qualify for partial or shared refunds.',
                    ].map((item) => (
                      <li key={item} className="text-[15px] text-gray-600 leading-relaxed list-disc">{item}</li>
                    ))}
                  </ul>
                </section>

                <section id="taxes" className="pt-10">
                  <h2 className="text-[20px] font-bold mb-4 text-[#1a1a2e]">7. Taxes &amp; VAT</h2>
                  <ul className="space-y-2 ml-5">
                    {[
                      'Taxes (VAT, GST, etc.) are collected by Paddle where applicable.',
                      'Tax refunds are subject to local regulations.',
                      'Requests must be made within 60 days of purchase.',
                      'Valid tax registration details may be required.',
                    ].map((item) => (
                      <li key={item} className="text-[15px] text-gray-600 leading-relaxed list-disc">{item}</li>
                    ))}
                  </ul>
                </section>

                <section id="how-to" className="pt-10">
                  <h2 className="text-[20px] font-bold mb-4 text-[#1a1a2e]">8. How to Request a Refund</h2>
                  <p className="text-[15px] text-gray-600 leading-relaxed mb-3">
                    All refund requests must be submitted directly to Paddle:
                  </p>
                  <ul className="space-y-2 ml-5 mb-4">
                    <li className="text-[15px] text-gray-600 leading-relaxed list-disc">
                      <a href="https://paddle.com/help" target="_blank" rel="noopener noreferrer" className="text-[#4F46E5] hover:underline">paddle.com/help</a>
                    </li>
                    <li className="text-[15px] text-gray-600 leading-relaxed list-disc">Or via the receipt email issued by Paddle</li>
                  </ul>
                  <p className="text-[15px] text-gray-600 leading-relaxed mb-3">Please include:</p>
                  <ul className="space-y-2 ml-5">
                    {['Order number', 'Email used during purchase', 'Reason for the request'].map((item) => (
                      <li key={item} className="text-[15px] text-gray-600 leading-relaxed list-disc">{item}</li>
                    ))}
                  </ul>
                </section>

                <section id="abuse" className="pt-10">
                  <h2 className="text-[20px] font-bold mb-4 text-[#1a1a2e]">9. Abuse &amp; Fraud</h2>
                  <p className="text-[15px] text-gray-600 leading-relaxed">
                    Reattend Technologies Private Limited and Paddle reserve the right to deny refund
                    requests involving abuse or manipulation, and to suspend or terminate accounts
                    involved in fraudulent behavior.
                  </p>
                </section>

                <section id="after" className="pt-10">
                  <h2 className="text-[20px] font-bold mb-4 text-[#1a1a2e]">10. After a Refund</h2>
                  <p className="text-[15px] text-gray-600 leading-relaxed mb-3">If a refund is processed:</p>
                  <ul className="space-y-2 ml-5">
                    {[
                      'Your account reverts to the Free Forever plan.',
                      'All AI-generated metadata (titles, summaries, tags, entities) remains visible.',
                      'Your data is never deleted as a result of a refund or cancellation.',
                      'You can re-subscribe to Pro at any time.',
                    ].map((item) => (
                      <li key={item} className="text-[15px] text-gray-600 leading-relaxed list-disc">{item}</li>
                    ))}
                  </ul>
                </section>

                <section id="changes" className="pt-10">
                  <h2 className="text-[20px] font-bold mb-4 text-[#1a1a2e]">11. Changes to This Policy</h2>
                  <p className="text-[15px] text-gray-600 leading-relaxed">
                    We may update this Refund Policy from time to time. Any changes will apply
                    prospectively and will be communicated where required.
                  </p>
                </section>

                <section id="contact" className="pt-10">
                  <h2 className="text-[20px] font-bold mb-4 text-[#1a1a2e]">12. Contact Us</h2>
                  <p className="text-[15px] text-gray-600 leading-relaxed mb-4">
                    For billing questions not related to refunds, you can reach us at:
                  </p>
                  <div className="rounded-xl bg-[#4F46E5]/5 border border-[#4F46E5]/10 p-5 space-y-2">
                    <p className="text-[14px] text-[#1a1a2e] font-semibold">Reattend Technologies Private Limited</p>
                    <p className="text-[14px] text-gray-600">
                      Billing inquiries:{' '}
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
