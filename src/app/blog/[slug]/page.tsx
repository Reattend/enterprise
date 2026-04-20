import React from 'react'
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Clock, Calendar, User } from 'lucide-react'
import { Navbar } from '@/components/landing/navbar'
import { Footer } from '@/components/landing/footer'
import { BLOG_POSTS, getBlogPostBySlug, formatDate } from '@/lib/blog/data'
import { BLOG_CONTENT } from '@/lib/blog/content'

export function generateStaticParams() {
  return BLOG_POSTS.map(p => ({ slug: p.slug }))
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const post = getBlogPostBySlug(params.slug)
  if (!post) return {}
  return {
    title: `${post.title} - Reattend Blog`,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      url: `https://reattend.com/blog/${post.slug}`,
      type: 'article',
      publishedTime: post.date,
    },
    alternates: { canonical: `https://reattend.com/blog/${post.slug}` },
  }
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = getBlogPostBySlug(params.slug)
  if (!post) notFound()

  const content = BLOG_CONTENT[params.slug]
  const currentIndex = BLOG_POSTS.findIndex(p => p.slug === params.slug)
  const prevPost = currentIndex > 0 ? BLOG_POSTS[currentIndex - 1] : null
  const nextPost = currentIndex < BLOG_POSTS.length - 1 ? BLOG_POSTS[currentIndex + 1] : null

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    url: `https://reattend.com/blog/${post.slug}`,
    datePublished: post.date,
    author: {
      '@type': 'Organization',
      name: 'Reattend',
      url: 'https://reattend.com',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Reattend',
      url: 'https://reattend.com',
    },
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-background">
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-[#4F46E5]/8 to-[#818CF8]/5 blur-3xl" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-[#818CF8]/6 to-[#C084FC]/4 blur-3xl" />
      </div>

      <Navbar />

      <main className="max-w-[720px] mx-auto px-5 pt-12 pb-24">
        {/* Back link */}
        <Link
          href="/blog"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-[#4F46E5] transition-colors mb-8"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          All articles
        </Link>

        {/* Post header */}
        <header className="mb-8">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className="text-xs font-medium text-[#4F46E5] bg-[#4F46E5]/10 px-2.5 py-0.5 rounded-full">
              {post.category}
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3" />
              {formatDate(post.date)}
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              {post.readTime}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3 leading-tight">
            {post.title}
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed">
            {post.description}
          </p>
        </header>

        {/* Article body */}
        <article className="rounded-2xl bg-white/60 dark:bg-white/5 backdrop-blur-xl border border-white/80 dark:border-white/10 p-6 sm:p-8">
          {content || (
            <p className="text-sm text-muted-foreground">This article is coming soon.</p>
          )}
        </article>

        {/* CTA */}
        <div className="mt-10 rounded-2xl bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] p-8 text-center text-white">
          <h2 className="text-lg font-bold mb-2">Stop losing your team's knowledge</h2>
          <p className="text-sm text-white/80 mb-5 max-w-md mx-auto">
            Reattend captures, organizes, and connects your team's knowledge with AI.
            Free to get started.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-white text-[#4F46E5] font-semibold text-sm px-6 py-2.5 rounded-full hover:bg-white/90 transition-colors"
          >
            Try Reattend free
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Prev / Next navigation */}
        <nav className="mt-10 grid grid-cols-2 gap-4">
          {prevPost ? (
            <Link
              href={`/blog/${prevPost.slug}`}
              className="group rounded-xl bg-white/60 dark:bg-white/5 backdrop-blur-xl border border-white/80 dark:border-white/10 p-4 hover:shadow-[0_4px_20px_rgba(79,70,229,0.06)] transition-all"
            >
              <span className="text-xs text-muted-foreground mb-1 block">Previous</span>
              <span className="text-sm font-medium text-foreground group-hover:text-[#4F46E5] transition-colors leading-snug line-clamp-2">
                {prevPost.title}
              </span>
            </Link>
          ) : (
            <div />
          )}
          {nextPost ? (
            <Link
              href={`/blog/${nextPost.slug}`}
              className="group rounded-xl bg-white/60 dark:bg-white/5 backdrop-blur-xl border border-white/80 dark:border-white/10 p-4 text-right hover:shadow-[0_4px_20px_rgba(79,70,229,0.06)] transition-all"
            >
              <span className="text-xs text-muted-foreground mb-1 block">Next</span>
              <span className="text-sm font-medium text-foreground group-hover:text-[#4F46E5] transition-colors leading-snug line-clamp-2">
                {nextPost.title}
              </span>
            </Link>
          ) : (
            <div />
          )}
        </nav>
      </main>

      <Footer />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
    </div>
  )
}
