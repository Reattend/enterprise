export interface UseCase {
  slug: string
  title: string
  headline: string
  description: string
  icon: string // lucide icon name
  benefits: string[]
}

export const USE_CASES: UseCase[] = [
  {
    slug: 'meeting-memory',
    title: 'Meeting Memory',
    headline: 'Never lose what was said in a meeting again',
    description:
      'Capture decisions, action items, and context from every meeting. Reattend turns conversations into searchable, linked knowledge your whole team can access.',
    icon: 'MessageSquare',
    benefits: [
      'Capture meeting notes and action items in seconds',
      'AI extracts decisions, owners, and deadlines automatically',
      'Link meeting outcomes to projects and past context',
      'Search across all meetings by topic, person, or date',
    ],
  },
  {
    slug: 'decision-tracking',
    title: 'Decision Tracking',
    headline: 'Stop re-discussing decisions your team already made',
    description:
      'Log every team decision with context, rationale, and participants. When someone asks "why did we do this?", the answer is always one search away.',
    icon: 'Scale',
    benefits: [
      'Record decisions with full context and rationale',
      'Tag participants, projects, and related discussions',
      'AI links decisions to relevant meetings and documents',
      'Instant search finds any decision in seconds',
    ],
  },
  {
    slug: 'team-onboarding',
    title: 'Team Onboarding',
    headline: 'Get new hires up to speed in days, not months',
    description:
      'New team members can search your shared memory to understand past decisions, project history, and team context. No more asking the same questions over and over.',
    icon: 'UserPlus',
    benefits: [
      'New hires explore a living knowledge base from day one',
      'Ask AI questions about team history and past decisions',
      'Understand project context without interrupting teammates',
      'Reduce onboarding time by giving instant access to institutional memory',
    ],
  },
  {
    slug: 'remote-team-context',
    title: 'Remote Team Context',
    headline: 'Keep your distributed team on the same page',
    description:
      'Remote and async teams lose context across time zones. Reattend gives everyone access to the same shared memory, so no one is out of the loop.',
    icon: 'Globe',
    benefits: [
      'Shared memory works across time zones and schedules',
      'Async-friendly: capture context once, access it anytime',
      'Reduce "did you see my message?" follow-ups',
      'AI connects dots across Slack, email, and meetings automatically',
    ],
  },
  {
    slug: 'project-handoffs',
    title: 'Project Handoffs',
    headline: 'Hand off projects without losing a thing',
    description:
      'When someone leaves a project or the company, their knowledge stays. Reattend preserves the full context, decisions, and reasoning behind every project.',
    icon: 'ArrowRightLeft',
    benefits: [
      'All project context lives in a shared, searchable memory',
      'Decisions and their rationale are preserved permanently',
      'New owners can ask AI about project history',
      'No more "the person who knew this left the company"',
    ],
  },
  {
    slug: 'knowledge-base',
    title: 'Knowledge Base',
    headline: 'A knowledge base that actually stays up to date',
    description:
      'Traditional wikis go stale because updating them is extra work. Reattend builds your knowledge base automatically from the work your team already does.',
    icon: 'BookOpen',
    benefits: [
      'Knowledge captured from meetings, messages, and notes automatically',
      'AI organizes and links information without manual effort',
      'Always current because it is built from real conversations',
      'Semantic search finds answers even when you do not know the exact words',
    ],
  },
]

export function getUseCaseBySlug(slug: string): UseCase | undefined {
  return USE_CASES.find(u => u.slug === slug)
}
