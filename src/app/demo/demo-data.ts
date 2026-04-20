// ─── Type Config ────────────────────────────────────
export const typeConfig: Record<string, { label: string; color: string; bg: string; emoji: string }> = {
  decision: { label: 'Decision', color: 'text-violet-600', bg: 'bg-violet-500/10', emoji: '⚖️' },
  meeting: { label: 'Meeting', color: 'text-blue-600', bg: 'bg-blue-500/10', emoji: '🤝' },
  idea: { label: 'Idea', color: 'text-amber-600', bg: 'bg-amber-500/10', emoji: '💡' },
  insight: { label: 'Insight', color: 'text-emerald-600', bg: 'bg-emerald-500/10', emoji: '🔍' },
  context: { label: 'Context', color: 'text-slate-600', bg: 'bg-slate-500/10', emoji: '📎' },
  tasklike: { label: 'Task', color: 'text-red-600', bg: 'bg-red-500/10', emoji: '✅' },
  note: { label: 'Note', color: 'text-gray-600', bg: 'bg-gray-500/10', emoji: '📝' },
}

// ─── Example Note ───────────────────────────────────
export const demoExampleNote = `Met with Sarah and Alex to review Sprint 14 progress. Decided to prioritize API v2 migration over dashboard redesign. Alex will handle the auth flow update by Wednesday. Key risk: if auth isn't done by March 28 deadline, we'll need to push the enterprise launch.`

// ─── Seeded Memories ────────────────────────────────
export interface SeededMemory {
  id: string
  type: string
  title: string
  summary: string
  relationLabel: string
}

export const seededMemories: SeededMemory[] = [
  {
    id: 'seed-1',
    type: 'decision',
    title: 'Q2 Budget Allocation',
    summary: '$40K for mobile, $25K for infrastructure. CFO wants ROI metrics by April board meeting.',
    relationLabel: 'same topic: Sprint 14 planning',
  },
  {
    id: 'seed-2',
    type: 'insight',
    title: 'Customer Churn Pattern',
    summary: '3x higher churn when users skip integrations in week 1. Onboarding wizard could fix this.',
    relationLabel: 'causes: drives product priorities',
  },
  {
    id: 'seed-3',
    type: 'meeting',
    title: 'Dashboard Redesign Review',
    summary: 'Priya\'s new layout improves nav by 40%. Can\'t ship in Sprint 14 alongside API v2.',
    relationLabel: 'depends on: API v2 vs dashboard tradeoff',
  },
  {
    id: 'seed-4',
    type: 'note',
    title: '1:1 with Jordan',
    summary: 'Feeling stretched between auth overhaul and mobile. Considering hiring a senior backend dev.',
    relationLabel: 'same people: team capacity risk',
  },
  {
    id: 'seed-5',
    type: 'context',
    title: 'Enterprise Launch Deadline',
    summary: 'VP Sales confirmed: March 28 is a hard deadline. No flexibility. Board presentation April 2.',
    relationLabel: 'contradicts: deadline at risk',
  },
]

// ─── Graph Positions ────────────────────────────────
export const graphNodePositions: Record<string, { x: number; y: number }> = {
  'user-note': { x: 300, y: 200 },
  'seed-1':    { x: 60,  y: 30 },
  'seed-2':    { x: 560, y: 30 },
  'seed-3':    { x: 60,  y: 370 },
  'seed-4':    { x: 560, y: 370 },
  'seed-5':    { x: 300, y: 430 },
}

// ─── Graph Edges ────────────────────────────────────
export interface DemoEdge {
  id: string
  source: string
  target: string
  kind: string
  label: string
  appearsAfterSeed: number
  isContradiction?: boolean
}

export const graphEdges: DemoEdge[] = [
  { id: 'e1', source: 'user-note', target: 'seed-1', kind: 'same_topic', label: 'same topic', appearsAfterSeed: 1 },
  { id: 'e2', source: 'seed-2', target: 'seed-1', kind: 'causes', label: 'causes', appearsAfterSeed: 2 },
  { id: 'e3', source: 'seed-3', target: 'user-note', kind: 'depends_on', label: 'depends on', appearsAfterSeed: 3 },
  { id: 'e4', source: 'seed-3', target: 'seed-1', kind: 'same_topic', label: 'same topic', appearsAfterSeed: 3 },
  { id: 'e5', source: 'seed-4', target: 'user-note', kind: 'same_people', label: 'same people', appearsAfterSeed: 4 },
  { id: 'e6', source: 'seed-4', target: 'seed-1', kind: 'depends_on', label: 'depends on', appearsAfterSeed: 4 },
  { id: 'e7', source: 'seed-5', target: 'user-note', kind: 'contradicts', label: 'contradicts', appearsAfterSeed: 5, isContradiction: true },
  { id: 'e8', source: 'seed-5', target: 'seed-4', kind: 'temporal', label: 'temporal', appearsAfterSeed: 5 },
]

export const edgeColors: Record<string, string> = {
  same_topic: '#6366f1',
  depends_on: '#f59e0b',
  contradicts: '#ef4444',
  continuation_of: '#3b82f6',
  causes: '#10b981',
  same_people: '#8b5cf6',
  temporal: '#64748b',
}

// ─── Ask Suggestions & Answers ──────────────────────
export interface AskSuggestion {
  question: string
  answer: string
  refs: string[]
}

export const askSuggestions: AskSuggestion[] = [
  {
    question: "What's the biggest risk to our March 28 deadline?",
    answer: `**The auth flow update is the critical blocker.** Alex committed to finishing it by Wednesday, but there are compounding risks:\n\n1. **Direct blocker**: The auth flow isn't done yet, and the March 28 enterprise launch has zero flexibility. VP Sales confirmed it's a hard deadline.\n\n2. **Resource strain**: Jordan is stretched between the auth overhaul and mobile work. If Alex needs help, Jordan can't absorb more.\n\n3. **Cascading impact**: Dashboard redesign was deprioritized for API v2, but if auth slips, it delays the entire Sprint 14 delivery.\n\n4. **Stakes are high**: Board presentation is April 2, just 5 days after launch. CFO expects ROI metrics. A delayed launch means presenting failure to the board.\n\n**Recommendation**: Check in with Alex today. If auth isn't >80% done, escalate immediately.`,
    refs: ['Sprint 14 Progress', 'Enterprise Launch Deadline', '1:1 with Jordan', 'Q2 Budget Allocation'],
  },
  {
    question: "Who's responsible for what right now?",
    answer: `Here's the ownership map across your team:\n\n**Alex**: Auth flow update (due Wednesday). Highest-priority deliverable blocking March 28 launch. No completion signal yet.\n\n**Priya**: Dashboard redesign. New layout improves nav by 40%, but deprioritized. Can't ship alongside API v2. Effectively blocked.\n\n**Jordan**: Split between auth support and mobile. Flagged feeling stretched in your 1:1. Potential hire could help.\n\n**Sarah**: Sprint 14 lead. Ran the progress review.\n\n**CFO**: Expecting ROI metrics by April 2 board meeting.\n\n**VP Sales**: Owns March 28 enterprise launch commitment. No flexibility confirmed.\n\n**Open gap**: The onboarding wizard idea (could reduce churn 3x) has no owner yet.`,
    refs: ['Sprint 14 Progress', 'Dashboard Redesign Review', '1:1 with Jordan', 'Enterprise Launch Deadline', 'Q2 Budget Allocation'],
  },
  {
    question: "What decisions have we made and what's still open?",
    answer: `**Decided:**\n- **API v2 over dashboard**: Sprint 14 prioritizes API v2 migration. Dashboard deprioritized despite Priya's 40% improvement.\n- **Q2 budget split**: $40K mobile, $25K infrastructure. Approved.\n- **March 28 is firm**: Enterprise launch date locked. No flexibility.\n\n**Under consideration:**\n- **Hiring a senior backend dev**: Jordan is overloaded. A hire would help, but no decision yet.\n\n**Proposed, not decided:**\n- **Onboarding wizard**: 3x churn reduction potential. No owner, no timeline.\n\n**Unresolved risk:**\n- What happens if Alex doesn't finish auth by Wednesday? No contingency plan, and March 28 has zero buffer. Needs a decision this week.`,
    refs: ['Sprint 14 Progress', 'Q2 Budget Allocation', 'Customer Churn Pattern', '1:1 with Jordan', 'Enterprise Launch Deadline'],
  },
]
