import React from 'react'
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Mail } from 'lucide-react'
import { Navbar } from '@/components/landing/navbar'
import { Footer } from '@/components/landing/footer'
import { HelpBreadcrumbs } from '@/components/help/help-breadcrumbs'
import { HelpSidebar } from '@/components/help/help-sidebar'
import { HELP_CATEGORIES, getCategoryBySlug, getArticleBySlug } from '@/lib/help/data'
import { HELP_CONTENT } from '@/lib/help/content'

export function generateStaticParams() {
  return HELP_CATEGORIES.flatMap(c =>
    c.articles.map(a => ({ category: c.slug, article: a.slug }))
  )
}

export function generateMetadata({ params }: { params: { category: string; article: string } }): Metadata {
  const cat = getCategoryBySlug(params.category)
  const art = getArticleBySlug(params.category, params.article)
  if (!cat || !art) return {}
  return {
    title: `${art.title} | ${cat.title} | Reattend Help`,
    description: art.description,
    openGraph: {
      title: `${art.title} | Reattend Help`,
      description: art.description,
      url: `https://reattend.com/help/${cat.slug}/${art.slug}`,
    },
    alternates: { canonical: `https://reattend.com/help/${cat.slug}/${art.slug}` },
  }
}

export default function ArticlePage({ params }: { params: { category: string; article: string } }) {
  const cat = getCategoryBySlug(params.category)
  const art = getArticleBySlug(params.category, params.article)
  if (!cat || !art) notFound()

  const content = HELP_CONTENT[`${params.category}/${params.article}`]
  const relatedArticles = cat.articles.filter(a => a.slug !== params.article)

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: art.title,
    description: art.description,
    url: `https://reattend.com/help/${cat.slug}/${art.slug}`,
    publisher: {
      '@type': 'Organization',
      name: 'Reattend',
      url: 'https://reattend.com',
    },
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Background gradients */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-[#4F46E5]/8 to-[#818CF8]/5 blur-3xl" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-[#818CF8]/6 to-[#C084FC]/4 blur-3xl" />
      </div>

      <Navbar />

      <main className="max-w-[1100px] mx-auto px-5 pt-12 pb-24">
        <HelpBreadcrumbs
          crumbs={[
            { label: cat.title, href: `/help/${cat.slug}` },
            { label: art.title },
          ]}
        />

        <div className="flex gap-10">
          <HelpSidebar currentCategory={params.category} currentArticle={params.article} />

          <article className="flex-1 min-w-0">
            <h1 className="text-[26px] sm:text-[34px] font-bold tracking-[-0.02em] text-[#1a1a2e] mb-2">
              {art.title}
            </h1>
            <p className="text-[15px] text-gray-500 mb-8">{art.description}</p>

            {/* Article body */}
            <div className="rounded-2xl bg-white/70 backdrop-blur-xl border border-white/80 shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-7 sm:p-10">
              {content || (
                <p className="text-[14px] text-gray-400">This article is coming soon.</p>
              )}
            </div>

            {/* Related articles */}
            {relatedArticles.length > 0 && (
              <div className="mt-10">
                <h2 className="text-[13px] font-semibold text-[#1a1a2e] uppercase tracking-wider mb-3">Related articles</h2>
                <div className="space-y-1.5">
                  {relatedArticles.map(a => (
                    <Link
                      key={a.slug}
                      href={`/help/${cat.slug}/${a.slug}`}
                      className="flex items-center justify-between gap-3 rounded-lg px-4 py-2.5 text-[13px] hover:bg-white/70 border border-transparent hover:border-white/80 transition-all group"
                    >
                      <span className="text-gray-500 group-hover:text-[#1a1a2e] transition-colors">
                        {a.title}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-[#4F46E5] transition-colors shrink-0" />
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Contact CTA */}
            <div className="mt-10 rounded-xl bg-white/70 border border-white/80 shadow-[0_2px_8px_rgba(0,0,0,0.03)] p-5 text-center">
              <p className="text-[13px] text-gray-400 mb-2">Still need help?</p>
              <a
                href="mailto:pb@reattend.ai"
                className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#4F46E5] hover:text-[#4338CA] transition-colors"
              >
                <Mail className="h-4 w-4" />
                Contact us at pb@reattend.ai
              </a>
            </div>
          </article>
        </div>
      </main>

      <Footer />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
    </div>
  )
}
