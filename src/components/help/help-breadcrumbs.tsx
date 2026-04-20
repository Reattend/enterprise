import React from 'react'
import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'

interface Crumb {
  label: string
  href?: string
}

export function HelpBreadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[13px] text-gray-400 mb-6 flex-wrap">
      <Link href="/" className="hover:text-[#4F46E5] transition-colors shrink-0">
        <Home className="h-3.5 w-3.5" />
      </Link>
      <ChevronRight className="h-3 w-3 shrink-0 text-gray-300" />
      <Link href="/help" className="hover:text-[#4F46E5] transition-colors">Help Center</Link>
      {crumbs.map((c, i) => (
        <React.Fragment key={i}>
          <ChevronRight className="h-3 w-3 shrink-0 text-gray-300" />
          {c.href ? (
            <Link href={c.href} className="hover:text-[#4F46E5] transition-colors">{c.label}</Link>
          ) : (
            <span className="text-[#1a1a2e] font-medium">{c.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  )
}
