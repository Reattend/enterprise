import React from 'react'
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Navbar } from '@/components/landing/navbar'
import { Footer } from '@/components/landing/footer'
import { HelpBreadcrumbs } from '@/components/help/help-breadcrumbs'
import { HELP_CATEGORIES, getCategoryBySlug } from '@/lib/help/data'

export function generateStaticParams() {
  return HELP_CATEGORIES.map(c => ({ category: c.slug }))
}

export function generateMetadata({ params }: { params: { category: string } }): Metadata {
  const cat = getCategoryBySlug(params.category)
  if (!cat) return {}
  return {
    title: `${cat.title} | Help Center | Reattend`,
    description: cat.description,
    openGraph: {
      title: `${cat.title} | Reattend Help`,
      description: cat.description,
      url: `https://reattend.com/help/${cat.slug}`,
    },
    alternates: { canonical: `https://reattend.com/help/${cat.slug}` },
  }
}

export default function CategoryPage({ params }: { params: { category: string } }) {
  const cat = getCategoryBySlug(params.category)
  if (!cat) notFound()

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Background gradients */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-[#4F46E5]/8 to-[#818CF8]/5 blur-3xl" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-[#818CF8]/6 to-[#C084FC]/4 blur-3xl" />
      </div>

      <Navbar />

      <main className="max-w-[900px] mx-auto px-5 pt-12 pb-24">
        <HelpBreadcrumbs crumbs={[{ label: cat.title }]} />

        <h1 className="text-[28px] sm:text-[36px] font-bold tracking-[-0.02em] text-[#1a1a2e] mb-2">
          {cat.title}
        </h1>
        <p className="text-[15px] text-gray-500 mb-10">{cat.description}</p>

        <div className="space-y-2.5">
          {cat.articles.map(a => (
            <Link
              key={a.slug}
              href={`/help/${cat.slug}/${a.slug}`}
              className="flex items-center justify-between gap-4 rounded-xl bg-white/70 backdrop-blur-xl border border-white/80 shadow-[0_2px_8px_rgba(0,0,0,0.03)] px-5 py-4 hover:shadow-[0_4px_20px_rgba(79,70,229,0.08)] hover:border-[#4F46E5]/20 transition-all group"
            >
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-[#1a1a2e] group-hover:text-[#4F46E5] transition-colors">
                  {a.title}
                </p>
                <p className="text-[13px] text-gray-400 mt-0.5 truncate">{a.description}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-[#4F46E5] transition-colors shrink-0" />
            </Link>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  )
}
