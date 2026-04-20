import React from 'react'
import Link from 'next/link'
import { Metadata } from 'next'
import { ArrowRight, Clock, Calendar } from 'lucide-react'
import { Navbar } from '@/components/landing/navbar'
import { Footer } from '@/components/landing/footer'
import { BLOG_POSTS, formatDate } from '@/lib/blog/data'

export const metadata: Metadata = {
  title: 'Blog - Reattend',
  description:
    'Insights on team decision tracking, meeting productivity, contradiction detection, and building decision intelligence for teams.',
  openGraph: {
    title: 'Reattend Blog',
    description: 'Insights on team decision tracking, meeting productivity, and decision intelligence.',
    url: 'https://reattend.com/blog',
  },
  alternates: { canonical: 'https://reattend.com/blog' },
}

const blogJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Blog',
  name: 'Reattend Blog',
  description: 'Insights on team decision tracking, meeting productivity, and decision intelligence.',
  url: 'https://reattend.com/blog',
  publisher: {
    '@type': 'Organization',
    name: 'Reattend',
    url: 'https://reattend.com',
  },
}

export default function BlogPage() {
  const featured = BLOG_POSTS[0]
  const rest = BLOG_POSTS.slice(1)

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-background">
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-[#4F46E5]/8 to-[#818CF8]/5 blur-3xl" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-[#818CF8]/6 to-[#C084FC]/4 blur-3xl" />
      </div>

      <Navbar />

      <main className="max-w-[900px] mx-auto px-5 pt-16 pb-24">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-3">
            The Reattend Blog
          </h1>
          <p className="text-base text-muted-foreground max-w-lg mx-auto">
            Insights on team decision tracking, meeting productivity, and building decision intelligence.
          </p>
        </div>

        {/* Featured post */}
        <Link
          href={`/blog/${featured.slug}`}
          className="group block rounded-2xl bg-white/60 dark:bg-white/5 backdrop-blur-xl border border-white/80 dark:border-white/10 p-8 mb-8 hover:shadow-[0_8px_32px_rgba(79,70,229,0.08)] transition-all"
        >
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs font-medium text-[#4F46E5] bg-[#4F46E5]/10 px-2.5 py-0.5 rounded-full">
              {featured.category}
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3" />
              {formatDate(featured.date)}
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              {featured.readTime}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground group-hover:text-[#4F46E5] transition-colors mb-3">
            {featured.title}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            {featured.description}
          </p>
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[#4F46E5]">
            Read article <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </Link>

        {/* Post grid */}
        <div className="grid sm:grid-cols-2 gap-5">
          {rest.map(post => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group rounded-2xl bg-white/60 dark:bg-white/5 backdrop-blur-xl border border-white/80 dark:border-white/10 p-6 hover:shadow-[0_8px_32px_rgba(79,70,229,0.08)] transition-all flex flex-col"
            >
              <div className="flex items-center gap-2.5 mb-3">
                <span className="text-xs font-medium text-[#4F46E5] bg-[#4F46E5]/10 px-2.5 py-0.5 rounded-full">
                  {post.category}
                </span>
                <span className="text-xs text-muted-foreground">{post.readTime}</span>
              </div>
              <h3 className="text-base font-semibold text-foreground group-hover:text-[#4F46E5] transition-colors mb-2 leading-snug">
                {post.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4 flex-1 line-clamp-3">
                {post.description}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{formatDate(post.date)}</span>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-[#4F46E5] transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      </main>

      <Footer />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogJsonLd) }}
      />
    </div>
  )
}
