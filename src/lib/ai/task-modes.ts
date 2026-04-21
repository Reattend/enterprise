// Task modes = the Copilot-style specialized workflows that wrap the generic
// /api/ask endpoint. Each mode carries:
//   - a form schema (what fields to collect from the user)
//   - a prompt builder (how those fields + memory context become the ask)
//   - a context hint (what kinds of records to emphasize during retrieval)
//
// The runtime flow:
//   1. User fills the form
//   2. Client composes the full prompt via buildPrompt(fields)
//   3. Client POSTs to /api/ask with that composed prompt as `question`
//   4. Answer streams back; refinement chat continues using normal ask
//
// This is the Microsoft Copilot analog — but scoped to ALL the user's
// memory, not just the document they have open.

export type FieldType = 'text' | 'textarea' | 'select'

export interface TaskField {
  key: string
  label: string
  type: FieldType
  placeholder?: string
  required?: boolean
  options?: { value: string; label: string }[] // for 'select'
  rows?: number // for 'textarea'
  helpText?: string
}

export interface TaskMode {
  id: string
  label: string
  iconName: string // lucide name for UI
  color: string // tailwind gradient token, e.g. "from-blue-500 to-cyan-500"
  category: 'write' | 'prep' | 'plan'
  tagline: string // one-line card description
  description: string // fuller copy
  fields: TaskField[]
  // Build the full ask prompt from the form fields.
  buildPrompt: (fields: Record<string, string>) => string
  // Optional retrieval hint — future /api/ask can read this from the task
  // query string to bias context selection (e.g. decisions-only).
  retrievalHint?: {
    types?: string[]
    boostKeywords?: string[] // words we prepend to improve FTS match
  }
}

const TONE_OPTIONS = [
  { value: 'concise', label: 'Concise & professional' },
  { value: 'warm', label: 'Warm & friendly' },
  { value: 'formal', label: 'Formal & diplomatic' },
  { value: 'direct', label: 'Direct & assertive' },
]

export const TASK_MODES: TaskMode[] = [
  // ─── Draft Email ─────────────────────────────────────────
  {
    id: 'draft-email',
    label: 'Draft email',
    iconName: 'Mail',
    color: 'from-blue-500 to-cyan-500',
    category: 'write',
    tagline: 'Write an email from your memories',
    description: 'Pick who it\'s to, what it\'s about, and a tone. Reattend drafts it using everything relevant from your memory.',
    fields: [
      { key: 'recipient', label: 'To', type: 'text', placeholder: 'e.g. CEO, Finance team, Priya Sharma', required: true },
      { key: 'topic', label: 'Subject / Topic', type: 'text', placeholder: 'e.g. Q4 hiring freeze update', required: true },
      { key: 'keyPoints', label: 'Key points to include', type: 'textarea', rows: 4, placeholder: 'Bullet points, raw thoughts, decisions to reference — anything.', required: false, helpText: 'Optional. Leave blank and we\'ll pull what\'s relevant from your memory.' },
      { key: 'tone', label: 'Tone', type: 'select', options: TONE_OPTIONS },
    ],
    buildPrompt: (f) => `Draft an email to ${f.recipient} about "${f.topic}".

${f.keyPoints ? `Key points from the sender:\n${f.keyPoints}\n\n` : ''}Tone: ${f.tone || 'concise'}.

Requirements:
- Use ONLY facts, names, dates, and decisions that appear in my memories below.
- If a specific decision or commitment is relevant, cite it inline as [1], [2].
- Don't invent numbers, deadlines, or people.
- Start with a one-line greeting, end with a natural sign-off placeholder ("Best, [your name]").
- Format: subject line on line 1 prefixed "Subject: ", blank line, then the body.

After the email, list 3 follow-up questions the reader might have, under "Follow-up questions:".`,
    retrievalHint: { boostKeywords: ['email', 'thread', 'wrote', 'sent'] },
  },

  // ─── Meeting Prep ────────────────────────────────────────
  {
    id: 'meeting-prep',
    label: 'Prep for meeting',
    iconName: 'Calendar',
    color: 'from-violet-500 to-purple-500',
    category: 'prep',
    tagline: 'Brief yourself before the conversation',
    description: 'Drop the title + attendees. Reattend surfaces the last conversation, open decisions, and any unresolved threads.',
    fields: [
      { key: 'title', label: 'Meeting title / topic', type: 'text', placeholder: 'e.g. Weekly product sync, 1:1 with Raj', required: true },
      { key: 'attendees', label: 'Attendees', type: 'text', placeholder: 'e.g. Raj, CFO, design team', required: false, helpText: 'Names or roles — comma-separated.' },
      { key: 'specificFocus', label: 'Anything specific to prep?', type: 'textarea', rows: 3, placeholder: 'e.g. We need to decide on the pricing tiers. Or: cover the Q4 roadmap.', required: false },
    ],
    buildPrompt: (f) => `I have a meeting coming up. Help me prepare.

Meeting: ${f.title}
${f.attendees ? `Attendees: ${f.attendees}` : ''}
${f.specificFocus ? `Focus: ${f.specificFocus}` : ''}

Using my memories, produce a briefing with these sections (use plain text, no markdown headers — just the labels):

1. Last interaction — what was discussed in the most recent relevant meeting/email/decision. Include the date. If there's none, say so in one sentence.
2. Open threads — decisions pending, commitments unfulfilled, questions left unanswered.
3. Known preferences / positions — what the attendees have said or decided about similar topics in the past.
4. Suggested agenda — 3-5 bullet points grounded in the open threads.
5. Risks / things to avoid — contradictions or sensitive topics surfaced by memory.

Cite sources inline as [1], [2]. Be specific with names, dates, numbers exactly as written. Don't invent.

After the briefing, 3 follow-up questions under "Follow-up questions:".`,
    retrievalHint: { types: ['meeting', 'decision', 'insight'], boostKeywords: ['meeting', 'call', 'sync', 'agenda'] },
  },

  // ─── Draft Brief ─────────────────────────────────────────
  {
    id: 'draft-brief',
    label: 'Draft brief',
    iconName: 'FileText',
    color: 'from-emerald-500 to-teal-500',
    category: 'write',
    tagline: 'Turn your memories into a 1-pager',
    description: 'A structured brief on any topic — history, current state, open questions, recommendations. Perfect for handoff or decision support.',
    fields: [
      { key: 'topic', label: 'Topic / title', type: 'text', placeholder: 'e.g. Current state of the Singapore expansion', required: true },
      { key: 'audience', label: 'Audience', type: 'text', placeholder: 'e.g. Board of Directors, incoming VP Eng', required: false },
      { key: 'angle', label: 'Angle / angle / what to emphasise', type: 'textarea', rows: 3, placeholder: 'Optional. Leave blank for a neutral overview.' },
    ],
    buildPrompt: (f) => `Write a crisp one-page brief on: "${f.topic}".
${f.audience ? `Audience: ${f.audience}.` : ''}
${f.angle ? `Emphasis: ${f.angle}.` : ''}

Structure (use plain text labels, not markdown headers):

- Summary — 2 sentences. What this is about and what the reader needs to know.
- Background — how we got here. Key decisions, dates, people involved.
- Current state — what's true today, open commitments, in-flight work.
- Open questions — unresolved decisions, risks, things we don't know yet.
- Recommendations — 2-4 bullets, grounded in the memories.

Rules:
- Cite specific decisions and memories inline as [1], [2].
- Dates, numbers, names exactly as written in memory.
- If a section is thin ("we don't have this saved"), say so — don't fill with speculation.

Aim for 300-500 words total.

After the brief, 3 follow-up questions under "Follow-up questions:".`,
    retrievalHint: { types: ['decision', 'insight', 'meeting', 'context'] },
  },

  // ─── Slide Outline ───────────────────────────────────────
  {
    id: 'draft-slides',
    label: 'Slide outline',
    iconName: 'LayoutDashboard',
    color: 'from-amber-500 to-orange-500',
    category: 'plan',
    tagline: 'Deck outline from your memories',
    description: 'Give a topic and length. Reattend returns a slide-by-slide outline with bullets, pulled from what you already know.',
    fields: [
      { key: 'topic', label: 'Deck title', type: 'text', placeholder: 'e.g. Q4 strategy review', required: true },
      { key: 'slideCount', label: 'Number of slides', type: 'select', options: [
        { value: '5', label: '5 slides (lightning)' }, { value: '8', label: '8 slides (standard)' },
        { value: '12', label: '12 slides (deep dive)' }, { value: '15', label: '15 slides (detailed)' },
      ]},
      { key: 'audience', label: 'Audience', type: 'text', placeholder: 'e.g. Board, customer pitch, all-hands', required: false },
    ],
    buildPrompt: (f) => `Produce a slide-by-slide outline for a ${f.slideCount || '8'}-slide deck.

Title: "${f.topic}"
${f.audience ? `Audience: ${f.audience}` : ''}

For each slide, use this format:

Slide N — [Title]
- Bullet
- Bullet
- Bullet (speaker note in parens)

Requirements:
- Draw facts, numbers, decisions, and quotes from my memories below — cite inline [1], [2].
- Slide 1 is the title slide (topic + one-line framing).
- Last slide is "Next steps / questions" grounded in open commitments from memory.
- Do NOT invent data. If the memory is thin on a section, mark it "[needs input]" instead of making things up.

After the outline, 3 follow-up questions under "Follow-up questions:".`,
    retrievalHint: { types: ['decision', 'insight', 'context', 'meeting'] },
  },
]

export function getTaskMode(id: string): TaskMode | null {
  return TASK_MODES.find((m) => m.id === id) ?? null
}
