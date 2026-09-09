import React from 'react'
import Link from 'next/link'

/**
 * MarketingFooter - the marketing design's footer, as React. Column
 * structure and links are identical to the footer in
 * public/landing-design/*.html (and to footer() in resource-detail.js) so
 * static and React marketing pages show the same thing. Styled by the
 * .rshell-scoped rules in resource-shell.css.
 */
export function MarketingFooter() {
  return (
    <footer role="contentinfo">
      <div className="footer-grid">
        <div className="footer-col footer-brand">
          <Link className="brand" href="/">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="brand-logo" src="/landing-design/black_logo.svg" alt="" width={30} height={30} />
            <span className="brand-word">Reattend</span>
          </Link>
          <p>Organizational memory for teams that can&apos;t afford to forget. Built by Reattend Technologies Private Limited.</p>
          <p style={{ marginTop: 12, fontSize: 12 }}>
            Researching the problem? Read our essays at{' '}
            <a href="https://organizationalamnesia.com" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>organizationalamnesia.com</a>.
          </p>
        </div>
        <div className="footer-col">
          <h5>Product</h5>
          <Link href="/product">Product</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/compliance">Compliance</Link>
          <Link href="/login">Sign in</Link>
          <Link href="/integrations">Integrations</Link>
        </div>
        <div className="footer-col">
          <h5>Capabilities</h5>
          <Link href="/product#capture">Capture</Link>
          <Link href="/product#connect">Connect</Link>
          <Link href="/product#recall">Recall</Link>
          <Link href="/product#run">Run</Link>
          <Link href="/product#govern">Govern</Link>
          <Link href="/product#deploy">Deploy</Link>
        </div>
        <div className="footer-col">
          <h5>Company</h5>
          <Link href="/about">About</Link>
          <Link href="/coming-soon">Careers</Link>
          <Link href="/coming-soon">Press</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </div>
        <div className="footer-col">
          <h5>Resources</h5>
          <Link href="/blog">Blog</Link>
          <Link href="/glossary">Glossary</Link>
          <Link href="/help">Help center</Link>
          <Link href="/tool">Free tools</Link>
          <Link href="/game">Free games</Link>
          <Link href="/compliance">Trust</Link>
          <a href="https://stats.uptimerobot.com/KNL7AXsPis" target="_blank" rel="noreferrer">Status</a>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© 2026 Reattend Technologies Private Limited</span>
        <span style={{ display: 'flex', gap: 24 }}>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/compliance">Compliance</Link>
          <Link href="/support">Support</Link>
        </span>
      </div>
    </footer>
  )
}
