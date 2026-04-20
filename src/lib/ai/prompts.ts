// ─── AI Prompt Templates ────────────────────────────────
// Version: 2.0 - Optimized for Llama 3.1 with explicit examples

export const PROMPTS = {
  // v6.0 - Production triage agent (screen + writing capture aware, noise-hardened)
  triage: (text: string, metadata?: string) => `You are a memory triage agent for a "Passive Second Brain." You decide what's worth remembering from a user's digital life.

${metadata && metadata.includes('"capture_type":"writing"') ? `CONTEXT: This text was captured from the user's OWN WRITING — text they were actively typing in an app. User-authored content is generally MORE valuable because it represents their thoughts, ideas, and communications. Be more lenient with KEEP decisions for writing captures, but still DROP if the text is too short or fragmented to be meaningful.

` : metadata && metadata.includes('"capture_type"') ? `CONTEXT: This text was passively captured from the user's screen via OCR. It has been pre-cleaned but may still contain some UI remnants. Focus ONLY on the substantive content — what the user was actually reading, writing, or discussing.

` : ''}KEEP as a memory if it contains ANY of these:
- A DECISION someone made ("we decided to...", "the plan is to...")
- An ACTION ITEM or task ("need to...", "TODO:", "will follow up on...")
- MEETING NOTES or discussion outcomes
- KEY FACTS about people, projects, or relationships ("X is the PM for Y")
- A meaningful INSIGHT, idea, or learning
- DATES with context (deadlines, launches, follow-ups)
- PROJECT UPDATES or status information
- PERSONAL WRITING — emails, messages, documents the user is composing

DROP if:
- It's just casual chat, small talk, or greetings
- It's a list of menu items, navigation, or settings with no real content
- It's code/syntax with no accompanying context or documentation
- It's too fragmented to extract any coherent knowledge
- It's a login screen, error page, or generic dashboard
- It's PRODUCT LISTINGS, pricing tables, or domain availability results
- It's SEARCH RESULTS pages (lists of items with brief descriptions)
- It's FILE/FOLDER listings or directory contents
- It's REPETITIVE DATA ROWS (tables, spreadsheets, grids of similar items)
- It's SOCIAL MEDIA FEEDS or news headlines without substance

When in doubt, DROP. Quality over quantity — only store memories the user would thank you for remembering.

INPUT:
Text: ${text}
${metadata ? `Metadata: ${metadata}` : ''}

You MUST respond with this EXACT JSON structure. Follow this example precisely:

EXAMPLE OUTPUT:
{
  "should_store": true,
  "record_type": "meeting",
  "title": "Q2 Planning with Marketing Team",
  "summary": "Met with John and Lisa on Jan 15 to plan Q2 campaigns. Decided to increase social budget by 20%. Lisa to prepare proposal by Feb 1.",
  "tags": ["marketing", "Q2", "budget", "planning"],
  "entities": [
    {"kind": "person", "name": "John Smith"},
    {"kind": "person", "name": "Lisa Chen"},
    {"kind": "topic", "name": "Q2 campaigns"},
    {"kind": "org", "name": "Marketing Team"}
  ],
  "dates": [
    {"date": "2026-01-15", "label": "Meeting date", "type": "event"},
    {"date": "2026-02-01", "label": "Lisa's proposal deadline", "type": "deadline"}
  ],
  "confidence": 0.92,
  "proposed_projects": [
    {"name": "Q2 Marketing Campaign", "confidence": 0.8, "reason": "Discusses Q2 campaign planning and budget"}
  ],
  "suggested_links": [
    {"query_text": "marketing budget", "reason": "Related to budget decisions"}
  ],
  "why_kept_or_dropped": "Contains key decisions about Q2 budget and clear action items with deadlines."
}

IMPORTANT RULES FOR YOUR RESPONSE:
- "record_type" must be exactly one of: "decision", "insight", "meeting", "idea", "context", "tasklike", "note"
- "entities" must be an array of objects with "kind" and "name" fields
- "kind" must be exactly one of: "person", "org", "topic", "product", "project"
- "dates" must be an array of objects with "date" (YYYY-MM-DD), "label" (what the date is for), and "type" (one of: "deadline", "follow_up", "event", "due_date", "launch", "reminder")
- Extract EVERY date mentioned: deadlines, follow-up dates, meeting dates, due dates, launch dates, reminders
- "proposed_projects" must be an array of objects with "name", "confidence", and "reason" fields
- "suggested_links" must be an array of objects with "query_text" and "reason" fields
- Extract every person name, organization, date, and topic you can find
- Include all dates in the summary

Now analyze the INPUT above and respond with JSON only:`,

  // v2.0 - Linking Agent (with example)
  linking: (recordTitle: string, recordSummary: string, candidates: Array<{ id: string; title: string; summary: string }>) => `You are a memory linking agent. Given a source record and candidates, determine which are related.

SOURCE RECORD:
Title: ${recordTitle}
Summary: ${recordSummary}

CANDIDATES:
${candidates.map((c, i) => `${i + 1}. [${c.id}] ${c.title}: ${c.summary}`).join('\n')}

Only create meaningful links. Max 8 links.

Link kinds (use exactly these values):
- same_topic
- depends_on
- contradicts
- continuation_of
- same_people
- causes
- temporal

EXAMPLE OUTPUT:
{
  "links": [
    {"target_id": "abc-123", "kind": "same_topic", "weight": 0.85, "explanation": "Both discuss Q2 marketing plans"},
    {"target_id": "def-456", "kind": "same_people", "weight": 0.7, "explanation": "Both involve John Smith"}
  ]
}

Respond with JSON only. If no candidates are related, return {"links": []}:`,

  // v3.0 - Ask / Q&A Agent (concise, conversational)
  ask: (question: string, contextRecords: Array<{ title: string; summary: string; content?: string; type: string }>) => `You are a concise memory assistant. Answer the question using ONLY the memories below. Be brief and direct — 2-4 sentences max. If no memories are relevant, say "I don't have that in your memories yet."

Question: ${question}

Memories:
${contextRecords.map((r, i) => `[${i + 1}] (${r.type}) ${r.title}: ${r.summary}${r.content ? ` | ${r.content}` : ''}`).join('\n')}

Answer briefly:`,

  // v1.0 - Daily Summary
  dailySummary: (records: Array<{ title: string; type: string; summary: string }>, date: string) => `You are generating a daily memory summary for ${date}.

Today's memories:
${records.map((r, i) => `${i + 1}. (${r.type}) ${r.title}: ${r.summary}`).join('\n')}

Generate a brief, insightful daily summary that:
1. Highlights the most important items
2. Notes any patterns or themes
3. Suggests action items or follow-ups
4. Provides a "memory health" observation

Keep it concise but thoughtful (3-5 paragraphs max).`,

  // v1.0 - Project Suggestion
  projectSuggestion: (records: Array<{ id: string; title: string; tags: string[] }>) => `Analyze these records and suggest project groupings.

RECORDS:
${records.map((r, i) => `${i + 1}. [${r.id}] ${r.title} (tags: ${r.tags.join(', ')})`).join('\n')}

Respond with JSON:
{
  "suggestions": [
    {"project_name": "Name", "record_ids": ["id1", "id2"], "confidence": 0.8, "reason": "why"}
  ]
}`,

  // v1.0 - Auto Layout
  autoLayout: (nodes: Array<{ id: string; type: string; title: string; locked: boolean }>) => `Suggest a spatial layout for these board nodes. Group related items together.
Locked nodes must not be moved.

NODES:
${nodes.map(n => `- ${n.id}: "${n.title}" (${n.type}) ${n.locked ? '[LOCKED]' : ''}`).join('\n')}

Respond with JSON:
{
  "positions": [
    { "id": "node_id", "x": number, "y": number, "cluster": "cluster_name" }
  ],
  "clusters": [
    { "name": "cluster_name", "label": "Human-readable label", "x": number, "y": number }
  ]
}`,
} as const
