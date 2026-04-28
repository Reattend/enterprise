import Link from 'next/link'
import { SiteNav } from '@/components/landing/site-nav'
import { SiteFooter } from '@/components/landing/site-footer'

// Public support page. Reachable via https://enterprise.reattend.com/support
// — required for the Chrome Web Store listing's Support URL field. UI is
// intentionally bare; Sprint O proper will polish.

const CONTACTS: Array<{ subject: string; email: string; description: string }> = [
  {
    subject: 'Product help',
    email: 'pb@reattend.ai',
    description: 'Anything about using Reattend Enterprise, the web app, the Chrome extension, the sandbox, or the public landing pages.',
  },
  {
    subject: 'Security disclosures',
    email: 'security@reattend.ai',
    description: 'Vulnerability reports, suspected incidents, or coordinated-disclosure requests. We acknowledge within one business day.',
  },
  {
    subject: 'Privacy + data requests',
    email: 'privacy@reattend.ai',
    description: 'GDPR / CCPA / DPDP requests, DPAs, sub-processor lists, and any data-controller-to-processor escalation. We respond within 30 days.',
  },
  {
    subject: 'Sales + on-prem',
    email: 'sales@reattend.ai',
    description: 'Enterprise plan quote, Government on-prem deployment, pilot programs, security review participation.',
  },
  {
    subject: 'Trust + compliance',
    email: 'trust@reattend.ai',
    description: 'SOC 2 / StateRAMP / CJIS questions, audit-log verification, customer-specific control matrices.',
  },
]

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full bg-gradient-to-br from-neutral-200/40 via-neutral-100/20 to-transparent blur-3xl pointer-events-none" />

      <SiteNav />

      <main className="relative z-10 max-w-3xl mx-auto px-8 pt-12 pb-24">
        <header className="mb-12">
          <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-3">Support</p>
          <h1 className="text-[42px] md:text-[52px] font-bold tracking-[-0.03em] leading-[1.1] text-[#1a1a2e] mb-3">
            How can we help?
          </h1>
          <p className="text-[15px] text-neutral-500 leading-relaxed">
            Reattend Enterprise is built and operated by Reattend Technologies Private Limited. We respond
            to every email — there is no support queue or chatbot wall. Pick the route below that matches
            your question.
          </p>
        </header>

        <section className="space-y-3 mb-12">
          {CONTACTS.map((c) => (
            <a
              key={c.email}
              href={`mailto:${c.email}?subject=${encodeURIComponent(c.subject)}`}
              className="block rounded-2xl border border-neutral-200/70 bg-white/60 backdrop-blur-sm p-5 hover:border-neutral-300 hover:bg-white transition-colors"
            >
              <div className="flex items-baseline justify-between gap-4 mb-1">
                <h2 className="text-[15px] font-semibold text-[#1a1a2e]">{c.subject}</h2>
                <span className="text-[13px] font-semibold text-[#4F46E5] truncate">{c.email}</span>
              </div>
              <p className="text-[13px] text-neutral-500 leading-relaxed">{c.description}</p>
            </a>
          ))}
        </section>

        <section className="rounded-2xl border border-neutral-200/70 bg-white/60 backdrop-blur-sm p-6 mb-8">
          <h2 className="text-[15px] font-semibold text-[#1a1a2e] mb-3">Self-serve resources</h2>
          <ul className="space-y-2 text-[14px] text-neutral-600 leading-relaxed">
            <li>
              <strong className="text-[#1a1a2e]">Try the live sandbox</strong> —{' '}
              <Link href="/sandbox" className="text-[#4F46E5] hover:underline">enterprise.reattend.com/sandbox</Link>
              . Five role personas, fully populated demo organization, no signup required.
            </li>
            <li>
              <strong className="text-[#1a1a2e]">Pricing + plan comparison</strong> —{' '}
              <Link href="/pricing" className="text-[#4F46E5] hover:underline">enterprise.reattend.com/pricing</Link>
              . Team / Enterprise / Government tiers and feature matrix.
            </li>
            <li>
              <strong className="text-[#1a1a2e]">Compliance posture</strong> —{' '}
              <Link href="/compliance" className="text-[#4F46E5] hover:underline">enterprise.reattend.com/compliance</Link>
              . Controls today, certs roadmap, data residency, security disclosures.
            </li>
            <li>
              <strong className="text-[#1a1a2e]">Privacy policy</strong> —{' '}
              <Link href="/privacy" className="text-[#4F46E5] hover:underline">enterprise.reattend.com/privacy</Link>
              {' '}— what data we collect, retain, and never share.
            </li>
            <li>
              <strong className="text-[#1a1a2e]">Terms &amp; Conditions</strong> —{' '}
              <Link href="/terms" className="text-[#4F46E5] hover:underline">enterprise.reattend.com/terms</Link>
              .
            </li>
          </ul>
        </section>

        <section className="rounded-2xl border border-neutral-200/70 bg-white/60 backdrop-blur-sm p-6">
          <h2 className="text-[15px] font-semibold text-[#1a1a2e] mb-3">Chrome extension troubleshooting</h2>
          <ul className="space-y-2 text-[14px] text-neutral-600 leading-relaxed">
            <li><strong className="text-[#1a1a2e]">Floating R-pin not appearing on a page?</strong> The extension only activates on hostnames in your personal whitelist or your org admin&apos;s policy. Open the toolbar icon &rarr; Settings to add the domain.</li>
            <li><strong className="text-[#1a1a2e]">Capture flashes &ldquo;=&rdquo; instead of &ldquo;&#10003;&rdquo;?</strong> The server detected a near-duplicate within the last three minutes. Wait or change the content.</li>
            <li><strong className="text-[#1a1a2e]">Extension says token rejected?</strong> Open <Link href="/app/settings" className="text-[#4F46E5] hover:underline">/app/settings</Link> &rarr; API keys, generate a new token, paste it into the extension Options page.</li>
            <li><strong className="text-[#1a1a2e]">Sidebar won&apos;t open?</strong> Reload the extension from <code className="bg-neutral-100 px-1 py-0.5 rounded text-[12px]">chrome://extensions</code> and try Alt+Shift+A.</li>
          </ul>
          <p className="text-[13px] text-neutral-500 mt-4">
            None of those help? Email <a href="mailto:pb@reattend.ai" className="text-[#4F46E5] hover:underline">pb@reattend.ai</a> with a screenshot of the extension popup and the page you were on. We usually reply within a business day.
          </p>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
