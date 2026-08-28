import React from 'react'
import { Metadata } from 'next'
import Link from 'next/link'
import { MarketingShell } from '@/components/marketing/marketing-shell'
import { MarketingHero } from '@/components/marketing/marketing-hero'

// Standalone /subprocessors page. The full vendor list is no longer
// published here - buyers don't need to see our infrastructure choices,
// and the list was attracting more competitor recon than legitimate
// procurement asks. We share the current list under NDA when an
// enterprise buyer needs it for vendor review. The URL stays alive
// to avoid breaking any links indexed in search results.

export const metadata: Metadata = {
  title: 'Sub-processors - Reattend',
  description: 'Reattend shares its sub-processor list with enterprise buyers under NDA during vendor review. Email pb@reattend.ai to request the current list.',
  alternates: { canonical: 'https://reattend.com/subprocessors' },
}

export default function SubprocessorsPage() {
  return (
    <MarketingShell>
      <MarketingHero
        eyebrow="Sub-processors"
        title="The list is shared on"
        emphasis="request."
        emphasisJoiner=" "
        lede="We work with a small number of trusted vendors - cloud, AI inference, transactional email, billing - to deliver Reattend. We don't publish the list publicly; we share it with enterprise buyers under NDA during vendor review."
        primaryCta={{ label: 'Request the current list', href: 'mailto:pb@reattend.ai?subject=Sub-processor%20list%20request' }}
        secondaryCta={{ label: 'See compliance posture', href: '/compliance' }}
      />

      <section className="relative px-5 sm:px-8 pb-20 max-w-3xl mx-auto">
        <div
          style={{
            background: 'oklch(0.992 0.004 80)',
            border: '1px solid oklch(0.88 0.008 270)',
            borderRadius: '16px',
            padding: '32px',
          }}
        >
          <h2
            style={{
              fontFamily: 'var(--font-display), serif',
              fontSize: '24px',
              fontWeight: 400,
              letterSpacing: '-0.015em',
              color: 'oklch(0.18 0.012 270)',
              marginBottom: '16px',
            }}
          >
            What we will tell you
          </h2>
          <ul
            style={{
              fontSize: '15px',
              color: 'oklch(0.32 0.012 270)',
              lineHeight: 1.65,
              listStyle: 'disc',
              paddingLeft: '20px',
              marginBottom: '24px',
            }}
          >
            <li>The current sub-processor list, with each vendor&apos;s purpose, region, and the data they touch.</li>
            <li>The DPA (Data Processing Addendum) we sign with each vendor.</li>
            <li>Our 30-day notification policy for any new sub-processor.</li>
            <li>Region carve-outs available on Enterprise plan.</li>
          </ul>
          <h2
            style={{
              fontFamily: 'var(--font-display), serif',
              fontSize: '24px',
              fontWeight: 400,
              letterSpacing: '-0.015em',
              color: 'oklch(0.18 0.012 270)',
              marginBottom: '16px',
              marginTop: '24px',
            }}
          >
            Who can ask
          </h2>
          <p style={{ fontSize: '15px', color: 'oklch(0.32 0.012 270)', lineHeight: 1.65 }}>
            Anyone evaluating Reattend for an enterprise deployment. Email{' '}
            <a href="mailto:pb@reattend.ai" style={{ color: 'oklch(0.45 0.18 155)', textDecoration: 'underline' }}>
              pb@reattend.ai
            </a>{' '}
            with your company and use case; we typically respond within a business day with the list under NDA.
          </p>
        </div>
        <p
          style={{
            fontSize: '13px',
            color: 'oklch(0.52 0.012 270)',
            marginTop: '16px',
            textAlign: 'center',
          }}
        >
          For the broader compliance posture - controls, audit log architecture, residency - see the{' '}
          <Link href="/compliance" style={{ color: 'oklch(0.45 0.18 155)', textDecoration: 'underline' }}>
            compliance page
          </Link>
          .
        </p>
      </section>
    </MarketingShell>
  )
}
