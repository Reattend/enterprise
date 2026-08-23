export interface BlogPost {
  slug: string
  title: string
  description: string
  category: string
  date: string
  readTime: string
  author: string
  /**
   * Optional FAQ entries. When present, the blog detail page emits a
   * schema.org FAQPage JSON-LD block alongside the BlogPosting markup,
   * which makes the post eligible for Google "People Also Ask" inclusion
   * and gives AI engines (ChatGPT/Claude/Perplexity) clean Q&A pairs
   * to quote verbatim. See docs/seo-strategy.md for the AEO playbook.
   */
  faq?: Array<{ q: string; a: string }>
}

export const BLOG_POSTS: BlogPost[] = [
  {
    // The anchor essay for the "organizational amnesia" SEO/AEO play.
    // Designed to be quotable by AI engines (definition first, FAQ at end)
    // AND to rank on Google for the long-tail "what is organizational amnesia"
    // term. Companion piece to the OrganizationalAmnesia.com domain strategy.
    // See docs/seo-strategy.md and docs/organizational-amnesia-domains.md.
    slug: 'what-is-organizational-amnesia',
    title: 'What Is Organizational Amnesia? A Complete Guide',
    description:
      'Organizational amnesia is the loss of institutional knowledge that happens when employees leave, transfer, or retire. It costs companies an estimated $31.5 billion per year. This guide covers the definition, the four stages, the warning signs, the cost, and how to prevent it.',
    category: 'Organizational Memory',
    date: '2026-05-04',
    readTime: '14 min read',
    author: 'Partha Bhowmick',
    faq: [
      {
        q: 'What is organizational amnesia?',
        a: 'Organizational amnesia is the loss of institutional knowledge that happens when employees leave, transfer, or retire - taking their context, decisions, relationships, and unwritten know-how with them. Researchers estimate it costs US companies $31.5 billion per year.',
      },
      {
        q: 'Is organizational amnesia the same as knowledge management?',
        a: 'No. Knowledge management is about storing information. Organizational memory is about preserving and connecting the knowledge that lives in human heads - context, decisions, rationale, relationships - even after the humans leave. A company can have great knowledge management (well-organized wiki) and still have terrible organizational amnesia.',
      },
      {
        q: 'How do I measure organizational amnesia in my company?',
        a: 'Easy proxies: how long does a new hire take to be independently productive (90 days is healthy, 6 months means amnesia); how often the same decision gets re-debated (more than once a year is a sign); when someone resigns, how much time the team spends backfilling their knowledge. A more rigorous measure is to count the number of "why did we do this?" questions in your Slack per week.',
      },
      {
        q: 'What is the difference between organizational amnesia and knowledge debt?',
        a: 'Knowledge debt is the cost of writing things down later (or never). Organizational amnesia is the consequence - the actual loss of knowledge that has already happened. Knowledge debt is the IOU; amnesia is the bankruptcy.',
      },
      {
        q: 'Can AI fix organizational amnesia?',
        a: 'AI helps with the capture and retrieval problem - it can summarize meetings, extract decisions, structure exit interviews, and answer questions over a knowledge base. But AI alone does not fix amnesia. The fix requires combining capture (AI helps), structure (a memory model that includes decisions, rationale, and context), and culture (people actually trust the system enough to use it).',
      },
      {
        q: 'Is organizational amnesia worse in remote companies?',
        a: 'Both directions. Remote companies have fewer in-person knowledge transfer moments so they amnesia faster by default. But remote companies also have stronger written-communication norms, so they often have better knowledge artifacts than in-office orgs. The companies that handle remote well end up less amnesiac than typical in-office orgs because they had to be deliberate about it.',
      },
    ],
  },
  {
    slug: 'meeting-debt-the-invisible-cost-nobody-tracks',
    title: 'Meeting Debt: The Invisible Cost Nobody Tracks',
    description:
      'Your team is drowning in meetings, but the real cost is not time. It is the decisions, context, and knowledge that vanish the moment the call ends. Here is how to measure and eliminate meeting debt.',
    category: 'Meetings',
    date: '2026-03-03',
    readTime: '11 min read',
    author: 'Reattend Team',
  },
  {
    slug: 'what-happens-to-team-knowledge-when-someone-quits',
    title: 'What Happens to Team Knowledge When Someone Quits',
    description:
      'When an employee leaves, years of context, relationships, and unwritten knowledge walk out with them. Here is exactly what you lose and how to protect against it.',
    category: 'Knowledge Management',
    date: '2026-03-01',
    readTime: '12 min read',
    author: 'Reattend Team',
  },
  {
    slug: 'engineering-managers-guide-to-architecture-decision-records',
    title: 'The Engineering Manager\'s Guide to Architecture Decision Records',
    description:
      'ADRs prevent your team from repeating past mistakes and re-debating settled questions. A practical guide to implementing Architecture Decision Records that actually stick.',
    category: 'Engineering',
    date: '2026-02-28',
    readTime: '13 min read',
    author: 'Reattend Team',
  },
  {
    slug: 'five-signs-your-team-has-a-memory-problem',
    title: '5 Signs Your Team Has a Memory Problem (And Does Not Know It)',
    description:
      'Most teams do not realize they have a memory problem until it costs them a client, a quarter, or a key employee. Here are the five warning signs to watch for.',
    category: 'Team Productivity',
    date: '2026-02-26',
    readTime: '10 min read',
    author: 'Reattend Team',
  },
  {
    slug: 'how-to-run-meetings-people-actually-remember',
    title: 'How to Run Meetings People Actually Remember',
    description:
      'The problem with most meetings is not that they happen. It is that nothing survives them. Here is a practical framework for running meetings that produce lasting, findable knowledge.',
    category: 'Meetings',
    date: '2026-02-24',
    readTime: '11 min read',
    author: 'Reattend Team',
  },
  {
    slug: 'best-notion-alternatives-for-teams',
    title: '7 Best Notion Alternatives for Teams in 2026',
    description:
      'Notion is not the right fit for every team. Here are the best alternatives for knowledge management, documentation, and team memory.',
    category: 'Alternatives',
    date: '2026-02-21',
    readTime: '9 min read',
    author: 'Reattend Team',
  },
  {
    slug: 'best-confluence-alternatives',
    title: '7 Best Confluence Alternatives for Modern Teams',
    description:
      'Tired of slow search, stale pages, and enterprise bloat? Here are the best Confluence alternatives for teams that want something better.',
    category: 'Alternatives',
    date: '2026-02-20',
    readTime: '9 min read',
    author: 'Reattend Team',
  },
  {
    slug: 'best-knowledge-management-tools',
    title: 'Best Knowledge Management Tools for Remote Teams in 2026',
    description:
      'Remote teams lose context across tools and time zones. These are the best knowledge management tools to keep everyone on the same page.',
    category: 'Alternatives',
    date: '2026-02-19',
    readTime: '10 min read',
    author: 'Reattend Team',
  },
  {
    slug: 'best-ai-note-taking-apps',
    title: 'Best AI Note-Taking Apps in 2026',
    description:
      'AI note-taking goes beyond transcription. Here are the best apps that use AI to capture, organize, and connect your knowledge automatically.',
    category: 'Alternatives',
    date: '2026-02-19',
    readTime: '8 min read',
    author: 'Reattend Team',
  },
  {
    slug: 'best-obsidian-alternatives-for-teams',
    title: 'Best Obsidian Alternatives for Team Knowledge Management',
    description:
      'Obsidian is great for personal use, but teams need collaboration. Here are the best alternatives that offer graph-based knowledge management with team features.',
    category: 'Alternatives',
    date: '2026-02-18',
    readTime: '8 min read',
    author: 'Reattend Team',
  },
  {
    slug: 'why-your-team-keeps-rediscussing-decisions',
    title: 'Why Your Team Keeps Re-Discussing the Same Decisions',
    description:
      'Teams waste hours revisiting decisions that were already made. Here is why it happens and how a shared memory system can fix it for good.',
    category: 'Team Productivity',
    date: '2026-02-15',
    readTime: '6 min read',
    author: 'Reattend Team',
  },
  {
    slug: 'hidden-cost-of-lost-context-remote-teams',
    title: 'The Hidden Cost of Lost Context in Remote Teams',
    description:
      'Context switching and lost knowledge cost remote teams more than they realize. Learn how to measure and reduce this invisible tax on productivity.',
    category: 'Remote Work',
    date: '2026-02-12',
    readTime: '7 min read',
    author: 'Reattend Team',
  },
  {
    slug: 'stop-losing-meeting-notes-action-items',
    title: 'How to Stop Losing Meeting Notes and Action Items',
    description:
      'Most meeting notes end up in a doc nobody opens again. Here is a better approach that turns meetings into lasting, searchable knowledge.',
    category: 'Meetings',
    date: '2026-02-10',
    readTime: '5 min read',
    author: 'Reattend Team',
  },
  {
    slug: 'what-is-institutional-memory',
    title: 'What is Institutional Memory and Why It Matters',
    description:
      'When experienced people leave, critical knowledge walks out with them. Learn what institutional memory is and how to protect it.',
    category: 'Knowledge Management',
    date: '2026-02-06',
    readTime: '8 min read',
    author: 'Reattend Team',
  },
  {
    slug: 'decision-logs-why-every-team-needs-one',
    title: 'Decision Logs: Why Every Team Needs One',
    description:
      'A decision log is the simplest tool your team is not using. Learn how to start one and why it prevents confusion, finger-pointing, and wasted work.',
    category: 'Team Productivity',
    date: '2026-02-02',
    readTime: '6 min read',
    author: 'Reattend Team',
  },
  {
    slug: 'problem-with-wikis-nobody-reads',
    title: 'The Problem with Wikis Nobody Reads',
    description:
      'Your team wiki is full of outdated pages no one trusts. Here is why traditional wikis fail and what a modern knowledge system looks like.',
    category: 'Knowledge Management',
    date: '2026-01-28',
    readTime: '7 min read',
    author: 'Reattend Team',
  },
  {
    slug: 'async-teams-need-memory-layer',
    title: 'Async-First Teams Need a Memory Layer',
    description:
      'Async communication only works when everyone has access to the same context. A shared memory layer is the missing piece.',
    category: 'Remote Work',
    date: '2026-01-24',
    readTime: '6 min read',
    author: 'Reattend Team',
  },
  {
    slug: 'brain-dump-to-organized-knowledge',
    title: 'Brain Dump to Organized Knowledge in 5 Minutes',
    description:
      'You have a head full of ideas, notes, and half-remembered conversations. Here is how to turn that chaos into structured, searchable knowledge fast.',
    category: 'Productivity',
    date: '2026-01-20',
    readTime: '5 min read',
    author: 'Reattend Team',
  },
]

export function getBlogPostBySlug(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find(p => p.slug === slug)
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
