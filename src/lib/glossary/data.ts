export interface GlossaryTerm {
  slug: string
  term: string
  definition: string
  description: string[]
  relatedTerms: string[]
  relatedBlog: { slug: string; title: string }[]
  relatedTools: { path: string; label: string }[]
}

export const GLOSSARY_TERMS: GlossaryTerm[] = [
  {
    slug: 'meeting-debt',
    term: 'Meeting Debt',
    definition:
      'Meeting debt is the accumulated cost of undocumented meeting outcomes: lost decisions, forgotten action items, and re-discussions that waste time. Like technical debt, meeting debt compounds silently until it slows everything down.',
    description: [
      'Meeting debt builds up every time a meeting ends without a clear record of what was decided, who is responsible for what, and why certain choices were made. Most teams hold five to fifteen meetings per week, and the majority produce no lasting artifact. The decisions made in those meetings exist only in the fading memories of the attendees.',
      'The cost of meeting debt is not just wasted time. It leads to duplicate meetings where the same topics are re-discussed because no one can confirm what was already decided. It causes misalignment when different attendees walk away with different interpretations. And it creates accountability gaps when action items are verbally assigned but never tracked.',
      'Organizations can reduce meeting debt by capturing decisions and action items in real time, linking them to the projects and people they affect, and making them searchable for future reference. AI-powered tools like Reattend automate this process, turning every meeting into lasting, connected knowledge.',
    ],
    relatedTerms: ['decision-decay', 'context-switching-tax'],
    relatedBlog: [
      {
        slug: 'meeting-debt-the-invisible-cost-nobody-tracks',
        title: 'Meeting Debt: The Invisible Cost Nobody Tracks',
      },
    ],
    relatedTools: [
      { path: '/free-meeting-cost-calculator', label: 'Free Meeting Cost Calculator' },
    ],
  },
  {
    slug: 'decision-decay',
    term: 'Decision Decay',
    definition:
      'Decision decay is the gradual loss of context around past decisions, causing teams to forget why choices were made. Over time, the reasoning behind decisions erodes, leading to reversals, re-debates, and contradictory choices.',
    description: [
      'Every decision a team makes carries context: the alternatives considered, the constraints at the time, the data reviewed, and the people involved. Decision decay happens when this context is never recorded or slowly becomes inaccessible. Within weeks, the team remembers what was decided but not why.',
      'The consequences of decision decay are costly. Teams revisit settled questions because no one can recall the original reasoning. New team members reverse past decisions without understanding the tradeoffs that were already evaluated. Leaders lose confidence in their own decision-making history, leading to slower and more cautious choices.',
      'Preventing decision decay requires a system that captures not just the outcome of a decision, but the reasoning, the alternatives rejected, and the people involved. Decision logs, architecture decision records (ADRs), and AI-powered memory tools like Reattend preserve this context so it remains accessible months or years later.',
    ],
    relatedTerms: ['meeting-debt', 'institutional-memory', 'knowledge-half-life'],
    relatedBlog: [
      {
        slug: 'why-your-team-keeps-rediscussing-decisions',
        title: 'Why Your Team Keeps Re-Discussing the Same Decisions',
      },
      {
        slug: 'decision-logs-why-every-team-needs-one',
        title: 'Decision Logs: Why Every Team Needs One',
      },
    ],
    relatedTools: [
      { path: '/tool/decision-log-generator', label: 'Free Decision Log Generator' },
    ],
  },
  {
    slug: 'institutional-memory',
    term: 'Institutional Memory',
    definition:
      'Institutional memory is the collective knowledge, experiences, and context that an organization accumulates over time. It includes documented decisions, unwritten rules, relationship maps, failure knowledge, and the historical context that shapes how teams operate.',
    description: [
      'Institutional memory goes far beyond what is written in a wiki or knowledge base. It includes the informal knowledge that experienced team members carry: why a particular vendor was chosen, which approaches were tried and failed, how to navigate internal processes, and the relationships between people and teams that make things happen.',
      'When institutional memory is strong, organizations make faster decisions because they can build on past learning. When it is weak, teams repeat mistakes, lose competitive advantages, and spend excessive time rediscovering what was already known. Research suggests that the cost of lost institutional memory can reach 20 to 30 percent of a departing employee salary in productivity loss alone.',
      'Building resilient institutional memory requires more than documentation. It requires systems that capture knowledge as it is created, connect it to the people and projects it relates to, and surface it at the moment it is needed. Reattend is designed to be this system: an AI-powered memory layer that grows with your organization.',
    ],
    relatedTerms: ['tribal-knowledge', 'knowledge-half-life', 'decision-decay'],
    relatedBlog: [
      {
        slug: 'what-is-institutional-memory',
        title: 'What is Institutional Memory and Why It Matters',
      },
      {
        slug: 'what-happens-to-team-knowledge-when-someone-quits',
        title: 'What Happens to Team Knowledge When Someone Quits',
      },
    ],
    relatedTools: [
      { path: '/tool/brain-dump-organizer', label: 'Free Brain Dump Organizer' },
    ],
  },
  {
    slug: 'knowledge-half-life',
    term: 'Knowledge Half-Life',
    definition:
      'Knowledge half-life is the rate at which institutional knowledge degrades after the people who hold it leave, change roles, or simply forget. In most organizations, undocumented knowledge loses half its accessibility within 3 to 6 months.',
    description: [
      'The concept of knowledge half-life borrows from physics: just as radioactive material decays over time, organizational knowledge becomes less accessible the longer it goes undocumented. When a key team member leaves, changes roles, or simply moves on to new priorities, the knowledge they carried begins to fade from the organization.',
      'The rate of decay depends on several factors. Highly specialized knowledge with few other holders decays fastest. Knowledge that is referenced frequently decays more slowly because it gets reinforced. And knowledge that is documented but stored in hard-to-find locations may technically exist but becomes functionally inaccessible, a form of decay in its own right.',
      'Organizations can extend the half-life of their knowledge by capturing it close to the moment of creation, tagging it with relevant context (people, projects, decisions), and making it searchable through both keyword and semantic search. Reattend uses AI to automatically capture and connect knowledge, dramatically slowing the rate of knowledge decay.',
    ],
    relatedTerms: ['institutional-memory', 'tribal-knowledge'],
    relatedBlog: [
      {
        slug: 'what-happens-to-team-knowledge-when-someone-quits',
        title: 'What Happens to Team Knowledge When Someone Quits',
      },
      {
        slug: 'hidden-cost-of-lost-context-remote-teams',
        title: 'The Hidden Cost of Lost Context in Remote Teams',
      },
    ],
    relatedTools: [
      { path: '/tool/context-recall-timeline', label: 'Free Context Recall Timeline' },
    ],
  },
  {
    slug: 'tribal-knowledge',
    term: 'Tribal Knowledge',
    definition:
      'Tribal knowledge is the unwritten, informal expertise that exists only in the heads of experienced team members. It includes how things actually get done (vs. official processes), who to ask for what, and lessons learned from past failures that were never documented.',
    description: [
      'Every organization has two versions of how it operates: the official version (documented in wikis, handbooks, and process docs) and the real version (the tribal knowledge that experienced people carry). Tribal knowledge includes shortcuts that save hours, context about why a process exists, warnings about what not to do, and the informal network of who actually knows what.',
      'Tribal knowledge is not inherently bad. It is often the most valuable knowledge in an organization because it reflects real experience. The problem is that it is fragile. It is concentrated in a small number of people, it is never systematically captured, and it walks out the door every time someone leaves. New hires can take 6 to 12 months to rebuild the tribal knowledge their predecessor carried.',
      'The goal is not to eliminate tribal knowledge but to make it durable. By creating low-friction ways for experienced team members to externalize what they know, and by using AI to connect and surface that knowledge when others need it, organizations can turn tribal knowledge into institutional memory. Reattend is built to make this transition seamless.',
    ],
    relatedTerms: ['institutional-memory', 'knowledge-half-life'],
    relatedBlog: [
      {
        slug: 'five-signs-your-team-has-a-memory-problem',
        title: '5 Signs Your Team Has a Memory Problem (And Does Not Know It)',
      },
      {
        slug: 'what-is-institutional-memory',
        title: 'What is Institutional Memory and Why It Matters',
      },
    ],
    relatedTools: [
      { path: '/import-and-see', label: 'Import and See' },
    ],
  },
  {
    slug: 'context-switching-tax',
    term: 'Context-Switching Tax',
    definition:
      'The context-switching tax is the hidden productivity cost of jumping between meetings, tools, and conversations without a shared knowledge system. Knowledge workers spend up to 30% of their day searching for information they have already encountered.',
    description: [
      'Context switching is not just about moving between tasks. It is about the cognitive cost of re-loading context every time you switch. When a developer moves from a Slack thread to a Jira ticket to a Google Doc to a meeting, they lose the mental model they were holding. Research from the University of California, Irvine found that it takes an average of 23 minutes to fully regain focus after an interruption.',
      'The tax is amplified when teams lack a shared knowledge system. Without a central place where decisions, notes, and context are connected, every context switch requires a mini-investigation: searching through chat history, scrolling through docs, or asking a colleague to repeat something. This hidden search time is the context-switching tax.',
      'Reducing the context-switching tax requires two things: fewer unnecessary switches (through better async practices and meeting hygiene) and faster context recovery when switches are unavoidable. A shared memory system like Reattend provides instant access to the context behind any project, decision, or conversation, cutting the recovery time from minutes to seconds.',
    ],
    relatedTerms: ['meeting-debt', 'knowledge-half-life'],
    relatedBlog: [
      {
        slug: 'hidden-cost-of-lost-context-remote-teams',
        title: 'The Hidden Cost of Lost Context in Remote Teams',
      },
      {
        slug: 'async-teams-need-memory-layer',
        title: 'Async-First Teams Need a Memory Layer',
      },
    ],
    relatedTools: [
      { path: '/tool/slack-memory-match', label: 'Free Slack Memory Match' },
    ],
  },
]

export function getGlossaryTermBySlug(slug: string): GlossaryTerm | undefined {
  return GLOSSARY_TERMS.find(t => t.slug === slug)
}

export function getAllGlossaryTerms(): GlossaryTerm[] {
  return GLOSSARY_TERMS
}
