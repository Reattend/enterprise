import { MetadataRoute } from 'next'
import { HELP_CATEGORIES } from '@/lib/help/data'
import { COMPETITORS } from '@/lib/compare/data'
import { BLOG_POSTS } from '@/lib/blog/data'
import { USE_CASES } from '@/lib/use-cases/data'
import { GLOSSARY_TERMS } from '@/lib/glossary/data'

// All hardcoded lastModified dates use BUILD_DATE so every deploy refreshes
// the timestamps Google sees. Stale dates make crawlers deprioritize re-fetch
// — a sitemap that says "lastmod: 2026-02-15" two months later signals
// nothing has changed, even when the page contents have.
//
// Per-resource sources of truth (blog post date, competitor mtime) override
// BUILD_DATE where they exist.

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://reattend.com'
  const BUILD_DATE = new Date()

  const helpEntries: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/help`,
      lastModified: BUILD_DATE,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    ...HELP_CATEGORIES.map(cat => ({
      url: `${baseUrl}/help/${cat.slug}`,
      lastModified: BUILD_DATE,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    ...HELP_CATEGORIES.flatMap(cat =>
      cat.articles.map(art => ({
        url: `${baseUrl}/help/${cat.slug}/${art.slug}`,
        lastModified: BUILD_DATE,
        changeFrequency: 'monthly' as const,
        priority: 0.6,
      }))
    ),
  ]

  // Marketing surface — every URL here is a real route handler in src/app/.
  // Keep this list in sync with src/app/*/route.ts. If you add a new static
  // landing page, add it here too or it won't be crawled.
  const marketingPages: MetadataRoute.Sitemap = [
    { url: baseUrl, priority: 1, changeFrequency: 'weekly' },
    { url: `${baseUrl}/product`, priority: 0.9, changeFrequency: 'monthly' },
    { url: `${baseUrl}/pricing`, priority: 0.9, changeFrequency: 'monthly' },
    { url: `${baseUrl}/integrations`, priority: 0.9, changeFrequency: 'monthly' },
    { url: `${baseUrl}/compliance`, priority: 0.8, changeFrequency: 'monthly' },
    { url: `${baseUrl}/sandbox`, priority: 0.9, changeFrequency: 'monthly' },
    { url: `${baseUrl}/about`, priority: 0.6, changeFrequency: 'monthly' },
    { url: `${baseUrl}/support`, priority: 0.6, changeFrequency: 'monthly' },
    { url: `${baseUrl}/features`, priority: 0.9, changeFrequency: 'monthly' },
    { url: `${baseUrl}/how-it-works`, priority: 0.9, changeFrequency: 'monthly' },
    { url: `${baseUrl}/security`, priority: 0.8, changeFrequency: 'monthly' },
    { url: `${baseUrl}/faq`, priority: 0.7, changeFrequency: 'monthly' },
    { url: `${baseUrl}/demo`, priority: 0.9, changeFrequency: 'monthly' },
    { url: `${baseUrl}/import-and-see`, priority: 0.9, changeFrequency: 'monthly' },
    { url: `${baseUrl}/blog`, priority: 0.6, changeFrequency: 'weekly' },
  ].map(p => ({ ...p, lastModified: BUILD_DATE })) as MetadataRoute.Sitemap

  const freeTools: MetadataRoute.Sitemap = [
    `${baseUrl}/tool`,
    `${baseUrl}/tool/memory-debt-calculator`,
    `${baseUrl}/tool/decision-log-generator`,
    `${baseUrl}/tool/brain-dump-organizer`,
    `${baseUrl}/tool/context-recall-timeline`,
    `${baseUrl}/tool/slack-memory-match`,
    `${baseUrl}/record`,
    `${baseUrl}/free-screen-recorder`,
    `${baseUrl}/free-voice-recorder`,
    `${baseUrl}/free-daily-planner`,
    `${baseUrl}/free-work-journal`,
    `${baseUrl}/free-timeline-maker`,
    `${baseUrl}/free-standup-bot`,
    `${baseUrl}/free-meeting-recap`,
    `${baseUrl}/free-meeting-cost-calculator`,
    `${baseUrl}/free-raci-chart-generator`,
    `${baseUrl}/free-one-on-one-template`,
    `${baseUrl}/free-retrospective-template`,
    `${baseUrl}/free-okr-template`,
  ].map(url => ({
    url,
    lastModified: BUILD_DATE,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  const games: MetadataRoute.Sitemap = [
    `${baseUrl}/play`,
    `${baseUrl}/game`,
    `${baseUrl}/game/icebreaker-spinner`,
    `${baseUrl}/game/team-bingo`,
    `${baseUrl}/game/would-you-rather`,
    `${baseUrl}/game/two-truths-one-lie`,
    `${baseUrl}/game/five-second-challenge`,
    `${baseUrl}/game/this-or-that`,
    `${baseUrl}/game/team-trivia`,
    `${baseUrl}/game/hot-takes`,
    `${baseUrl}/game/guess-the-colleague`,
    `${baseUrl}/game/team-superlatives`,
  ].map(url => ({
    url,
    lastModified: BUILD_DATE,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  const legal: MetadataRoute.Sitemap = [
    `${baseUrl}/terms`,
    `${baseUrl}/privacy`,
    `${baseUrl}/refund`,
    `${baseUrl}/subprocessors`,
  ].map(url => ({
    url,
    lastModified: BUILD_DATE,
    changeFrequency: 'yearly' as const,
    priority: 0.3,
  }))

  return [
    ...marketingPages,
    ...freeTools,
    ...games,
    ...legal,
    ...helpEntries,
    // Compare pages
    {
      url: `${baseUrl}/compare`,
      lastModified: BUILD_DATE,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    ...COMPETITORS.map(c => ({
      url: `${baseUrl}/compare/${c.slug}`,
      lastModified: BUILD_DATE,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    // Blog posts use real publish dates so Google can detect freshness
    ...BLOG_POSTS.map(p => ({
      url: `${baseUrl}/blog/${p.slug}`,
      lastModified: new Date(p.date),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    // Use cases
    {
      url: `${baseUrl}/use-case`,
      lastModified: BUILD_DATE,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    ...USE_CASES.map(u => ({
      url: `${baseUrl}/use-case/${u.slug}`,
      lastModified: BUILD_DATE,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    // Glossary
    {
      url: `${baseUrl}/glossary`,
      lastModified: BUILD_DATE,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    ...GLOSSARY_TERMS.map(t => ({
      url: `${baseUrl}/glossary/${t.slug}`,
      lastModified: BUILD_DATE,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ]
}
