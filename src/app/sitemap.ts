import { MetadataRoute } from 'next'
import { HELP_CATEGORIES } from '@/lib/help/data'
import { COMPETITORS } from '@/lib/compare/data'
import { BLOG_POSTS } from '@/lib/blog/data'
import { USE_CASES } from '@/lib/use-cases/data'
import { GLOSSARY_TERMS } from '@/lib/glossary/data'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://reattend.com'

  const helpEntries: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/help`,
      lastModified: '2026-03-25',
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    ...HELP_CATEGORIES.map(cat => ({
      url: `${baseUrl}/help/${cat.slug}`,
      lastModified: '2026-03-25',
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    ...HELP_CATEGORIES.flatMap(cat =>
      cat.articles.map(art => ({
        url: `${baseUrl}/help/${cat.slug}/${art.slug}`,
        lastModified: '2026-03-25',
        changeFrequency: 'monthly' as const,
        priority: 0.6,
      }))
    ),
  ]

  return [
    {
      url: baseUrl,
      lastModified: '2026-03-25',
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/features`,
      lastModified: '2026-02-15',
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/how-it-works`,
      lastModified: '2026-02-15',
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/integrations`,
      lastModified: '2026-02-15',
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/security`,
      lastModified: '2026-02-15',
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified: '2026-02-15',
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/faq`,
      lastModified: '2026-03-25',
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/demo`,
      lastModified: '2026-02-15',
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/import-and-see`,
      lastModified: '2026-02-15',
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    // Free tools
    {
      url: `${baseUrl}/tool`,
      lastModified: '2026-02-01',
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/tool/memory-debt-calculator`,
      lastModified: '2026-02-01',
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/tool/decision-log-generator`,
      lastModified: '2026-02-01',
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/tool/brain-dump-organizer`,
      lastModified: '2026-02-01',
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/tool/context-recall-timeline`,
      lastModified: '2026-02-01',
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/tool/slack-memory-match`,
      lastModified: '2026-02-01',
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/record`,
      lastModified: '2026-02-01',
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/free-screen-recorder`,
      lastModified: '2026-02-01',
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/free-voice-recorder`,
      lastModified: '2026-02-01',
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/free-daily-planner`,
      lastModified: '2026-02-01',
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/free-work-journal`,
      lastModified: '2026-02-01',
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/free-timeline-maker`,
      lastModified: '2026-02-01',
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/free-standup-bot`,
      lastModified: '2026-02-01',
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/free-meeting-recap`,
      lastModified: '2026-02-01',
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/free-meeting-cost-calculator`,
      lastModified: '2026-02-01',
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/free-raci-chart-generator`,
      lastModified: '2026-02-01',
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/free-one-on-one-template`,
      lastModified: '2026-02-01',
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/free-retrospective-template`,
      lastModified: '2026-02-01',
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/free-okr-template`,
      lastModified: '2026-02-01',
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    // Join game room
    {
      url: `${baseUrl}/play`,
      lastModified: '2026-02-01',
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    // Free team games
    {
      url: `${baseUrl}/game`,
      lastModified: '2026-03-25',
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/game/icebreaker-spinner`,
      lastModified: '2026-03-25',
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/game/team-bingo`,
      lastModified: '2026-03-25',
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/game/would-you-rather`,
      lastModified: '2026-03-25',
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/game/two-truths-one-lie`,
      lastModified: '2026-03-25',
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/game/five-second-challenge`,
      lastModified: '2026-03-25',
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/game/this-or-that`,
      lastModified: '2026-03-25',
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/game/team-trivia`,
      lastModified: '2026-03-25',
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/game/hot-takes`,
      lastModified: '2026-03-25',
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/game/guess-the-colleague`,
      lastModified: '2026-03-25',
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/game/team-superlatives`,
      lastModified: '2026-03-25',
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    // Company
    {
      url: `${baseUrl}/about`,
      lastModified: '2026-03-25',
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: '2026-03-25',
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    // Legal
    {
      url: `${baseUrl}/terms`,
      lastModified: '2026-02-18',
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: '2026-02-18',
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/refund`,
      lastModified: '2026-02-18',
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    // Help Center
    ...helpEntries,
    // Compare pages
    {
      url: `${baseUrl}/compare`,
      lastModified: '2026-03-25',
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    ...COMPETITORS.map(c => ({
      url: `${baseUrl}/compare/${c.slug}`,
      lastModified: '2026-03-25',
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    // Blog posts
    ...BLOG_POSTS.map(p => ({
      url: `${baseUrl}/blog/${p.slug}`,
      lastModified: new Date(p.date),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    // Use cases
    {
      url: `${baseUrl}/use-case`,
      lastModified: '2026-03-25',
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    ...USE_CASES.map(u => ({
      url: `${baseUrl}/use-case/${u.slug}`,
      lastModified: '2026-03-25',
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    // Glossary
    {
      url: `${baseUrl}/glossary`,
      lastModified: '2026-02-15',
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    ...GLOSSARY_TERMS.map(t => ({
      url: `${baseUrl}/glossary/${t.slug}`,
      lastModified: '2026-02-15',
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ]
}
