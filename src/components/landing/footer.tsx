import React from 'react'
import Link from 'next/link'
import Image from 'next/image'

const columns = [
  {
    title: 'Product',
    links: [
      { label: 'Pricing', href: '/pricing' },
      { label: 'Use Cases', href: '/use-case' },
      { label: 'Slack Integration', href: '/slack' },
      { label: 'Free Tools', href: '/tool' },
      { label: 'Free Games', href: '/game' },
      { label: 'Help Center', href: '/help' },
    ],
  },
  {
    title: 'Developers',
    links: [
      { label: 'MCP Server', href: '/mcp' },
      { label: 'GitHub Action', href: '/mcp#github-action' },
      { label: 'API Docs', href: '/docs' },
      { label: 'REST API', href: '/mcp#api' },
      { label: 'GitHub', href: 'https://github.com/Reattend' },
      { label: 'npm package', href: 'https://www.npmjs.com/package/@reattend/mcp' },
    ],
  },
  {
    title: 'Compare',
    links: [
      { label: 'vs Notion', href: '/compare/reattend-vs-notion' },
      { label: 'vs Confluence', href: '/compare/reattend-vs-confluence' },
      { label: 'vs Obsidian', href: '/compare/reattend-vs-obsidian' },
      { label: 'vs Roam Research', href: '/compare/reattend-vs-roam-research' },
      { label: 'All comparisons', href: '/compare' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Blog', href: '/blog' },
      { label: 'Contact', href: 'mailto:pb@reattend.ai' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Refund Policy', href: '/refund' },
      { label: 'Sub-processors', href: '/subprocessors' },
    ],
  },
]

export function Footer() {
  return (
    <footer className="bg-[#0B0B0F] text-white" role="contentinfo">
      <div className="max-w-[1200px] mx-auto px-5 pt-16 pb-8">
        <div className="grid grid-cols-2 md:grid-cols-7 gap-10 pb-12 border-b border-white/10">
          {/* Brand column */}
          <div className="col-span-2">
            <Link href="/" className="inline-flex items-center gap-2 mb-4" aria-label="Reattend home">
              <Image src="/white_logo.svg" alt="Reattend" width={28} height={28} className="h-7 w-7" />
              <span className="text-[16px] font-semibold tracking-tight">Reattend</span>
            </Link>
            <p className="text-sm text-gray-400 leading-relaxed max-w-[280px] mb-5">
              Your decisions, preserved. AI-powered memory for everything you do.
            </p>
            {/* Social icons */}
            <div className="flex items-center gap-3">
              <a
                href="https://linkedin.com/company/reattend"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Reattend on LinkedIn"
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <svg viewBox="0 0 24 24" width="15" height="15" fill="white" aria-hidden="true">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
              <a
                href="https://github.com/orgs/Reattend"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Reattend on GitHub"
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <svg viewBox="0 0 24 24" width="15" height="15" fill="white" aria-hidden="true">
                  <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                </svg>
              </a>
            </div>
          </div>

          {/* Link columns */}
          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">
                {col.title}
              </h4>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    {link.href.startsWith('/') || link.href.startsWith('mailto') ? (
                      <Link
                        href={link.href}
                        className="text-sm text-gray-400 hover:text-white transition-colors"
                      >
                        {link.label}
                      </Link>
                    ) : (
                      <a
                        href={link.href}
                        className="text-sm text-gray-400 hover:text-white transition-colors"
                      >
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom line */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6">
          <p className="text-xs text-gray-500">
            &copy; {new Date().getFullYear()} Reattend. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <a
              href="https://stats.uptimerobot.com/KNL7AXsPis"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-500 hover:text-white transition-colors flex items-center gap-1.5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
              Check status
            </a>
            <p className="text-xs text-gray-500">
              Questions? <a href="mailto:pb@reattend.ai" className="text-gray-400 hover:text-white transition-colors">pb@reattend.ai</a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
