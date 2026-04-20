'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { HELP_CATEGORIES } from '@/lib/help/data'
import { cn } from '@/lib/utils'

interface HelpSidebarProps {
  currentCategory: string
  currentArticle: string
}

export function HelpSidebar({ currentCategory, currentArticle }: HelpSidebarProps) {
  return (
    <aside className="hidden lg:block w-[240px] shrink-0">
      <div className="sticky top-24">
        <nav className="space-y-0.5">
          {HELP_CATEGORIES.map(cat => (
            <CategorySection
              key={cat.slug}
              category={cat}
              isActive={cat.slug === currentCategory}
              currentArticle={currentArticle}
            />
          ))}
        </nav>
      </div>
    </aside>
  )
}

function CategorySection({
  category,
  isActive,
  currentArticle,
}: {
  category: typeof HELP_CATEGORIES[0]
  isActive: boolean
  currentArticle: string
}) {
  const [expanded, setExpanded] = useState(isActive)

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          'flex items-center justify-between w-full text-left px-3 py-2 rounded-lg text-[12px] font-semibold transition-colors',
          isActive
            ? 'text-[#4F46E5] bg-[#4F46E5]/8'
            : 'text-gray-500 hover:text-[#1a1a2e] hover:bg-gray-100/60'
        )}
      >
        {category.title}
        {expanded ? (
          <ChevronDown className="h-3 w-3 shrink-0" />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0" />
        )}
      </button>
      {expanded && (
        <div className="ml-3 border-l border-gray-200/60 pl-2 mt-0.5 space-y-0.5">
          {category.articles.map(a => (
            <Link
              key={a.slug}
              href={`/help/${category.slug}/${a.slug}`}
              className={cn(
                'block px-2.5 py-1.5 rounded-md text-[11px] leading-snug transition-colors',
                a.slug === currentArticle
                  ? 'text-[#4F46E5] font-semibold bg-[#4F46E5]/8'
                  : 'text-gray-500 hover:text-[#1a1a2e] hover:bg-gray-100/50'
              )}
            >
              {a.title}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
