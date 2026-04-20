import { z } from 'zod'

// Provider-agnostic LLM interface.
// Reattend is Rabbit-only. There are no fallbacks.
// If Rabbit is down, requests fail loudly with RabbitNotConfiguredError or
// RabbitCallError and every failure is logged with the full context so we can
// feed failures back into the next v2.X training run.
export interface LLMProvider {
  generateJSON<T>(prompt: string, schema: z.ZodType<T>): Promise<T>
  generateText(prompt: string, maxTokens?: number): Promise<string>
  generateTextStream(prompt: string): Promise<ReadableStream<Uint8Array>>
  embed(text: string): Promise<number[]>
}

// ─── Errors ─────────────────────────────────────────────
export class RabbitNotConfiguredError extends Error {
  constructor() {
    super(
      'Rabbit is not configured. Set RABBIT_API_URL and RABBIT_API_KEY in .env.local. ' +
      'Reattend has no fallback LLM — it is Rabbit-only by design.'
    )
    this.name = 'RabbitNotConfiguredError'
  }
}

export class RabbitCallError extends Error {
  public readonly status: number
  public readonly signal: string
  public readonly promptHash: string
  public readonly promptPreview: string
  constructor(opts: {
    status: number
    signal: string
    promptHash: string
    promptPreview: string
    message: string
  }) {
    super(
      `Rabbit call failed [${opts.signal}] status=${opts.status} hash=${opts.promptHash}: ${opts.message}`
    )
    this.name = 'RabbitCallError'
    this.status = opts.status
    this.signal = opts.signal
    this.promptHash = opts.promptHash
    this.promptPreview = opts.promptPreview
  }
}

// ─── Normalize LLM output ───────────────────────────────
// Rabbit produces clean JSON but the Reattend schemas expect a specific shape
// (entities as [{kind, name}], record_type enum, etc). This bridges any
// remaining shape differences between Rabbit output and downstream schemas.
function normalizeTriageOutput(raw: any): any {
  if (!raw || typeof raw !== 'object') return raw

  // Fix entities: convert {"people": [...], "organizations": [...]} to [{kind, name}]
  if (raw.entities && !Array.isArray(raw.entities)) {
    const entities: Array<{ kind: string; name: string }> = []
    const kindMap: Record<string, string> = {
      people: 'person', persons: 'person', person: 'person',
      organizations: 'org', organisation: 'org', orgs: 'org', org: 'org',
      topics: 'topic', topic: 'topic',
      products: 'product', product: 'product',
      projects: 'project', project: 'project',
    }
    for (const [key, values] of Object.entries(raw.entities)) {
      const kind = kindMap[key.toLowerCase()] || 'topic'
      if (Array.isArray(values)) {
        for (const v of values) {
          if (typeof v === 'string') {
            entities.push({ kind, name: v })
          } else if (v && typeof v === 'object' && (v as any).name) {
            entities.push({ kind: (v as any).kind || kind, name: (v as any).name })
          }
        }
      }
    }
    raw.entities = entities
  }

  // Ensure entities items have valid kind values
  if (Array.isArray(raw.entities)) {
    const validKinds = ['person', 'org', 'topic', 'product', 'project', 'custom']
    raw.entities = raw.entities.map((e: any) => {
      if (typeof e === 'string') return { kind: 'topic', name: e }
      if (!e || typeof e !== 'object') return null
      const kind = validKinds.includes(e.kind) ? e.kind : 'topic'
      return { kind, name: e.name || String(e) }
    }).filter(Boolean)
  }

  // Fix record_type: normalize to valid enum values
  if (raw.record_type) {
    const typeMap: Record<string, string> = {
      'meeting summary': 'meeting', 'meeting_summary': 'meeting',
      'task': 'tasklike', 'todo': 'tasklike', 'action item': 'tasklike',
      'information': 'context', 'info': 'context', 'background': 'context',
      'observation': 'insight', 'learning': 'insight', 'finding': 'insight',
    }
    const normalized = typeMap[raw.record_type.toLowerCase()]
    if (normalized) raw.record_type = normalized
  }

  // Fix proposed_projects: convert strings to objects
  if (Array.isArray(raw.proposed_projects)) {
    raw.proposed_projects = raw.proposed_projects.map((p: any) => {
      if (typeof p === 'string') return { name: p, confidence: 0.7, reason: 'Mentioned in content' }
      if (p && typeof p === 'object' && p.name) return {
        name: p.name,
        confidence: typeof p.confidence === 'number' ? p.confidence : 0.7,
        reason: p.reason || 'Related to content',
      }
      return null
    }).filter(Boolean)
  }

  // Fix suggested_links: ensure proper structure
  if (Array.isArray(raw.suggested_links)) {
    raw.suggested_links = raw.suggested_links.map((l: any) => {
      if (typeof l === 'string') return { query_text: l, reason: 'Related content' }
      if (l && typeof l === 'object' && l.query_text) return l
      return null
    }).filter(Boolean)
  }

  // Ensure tags is an array of strings
  if (!Array.isArray(raw.tags)) raw.tags = []
  raw.tags = raw.tags.filter((t: any) => typeof t === 'string')

  // Ensure confidence is a number
  if (typeof raw.confidence !== 'number') raw.confidence = 0.7

  // Ensure dates is an array of objects with date, label, type
  if (!Array.isArray(raw.dates)) raw.dates = []
  raw.dates = raw.dates.map((d: any) => {
    if (typeof d === 'string') return { date: d, label: d, type: 'event' }
    if (d && typeof d === 'object' && d.date) return {
      date: d.date,
      label: d.label || d.description || d.date,
      type: d.type || 'event',
    }
    return null
  }).filter(Boolean)

  // Rabbit compatibility: fill missing fields with defaults.
  if (raw.type && !raw.record_type) raw.record_type = raw.type
  if (!raw.record_type) raw.record_type = 'note'
  const typeMap2: Record<string, string> = {
    sync: 'meeting', update: 'context', chat: 'context', call: 'meeting',
    page_visit: 'context', browse: 'context', other: 'note',
    task: 'tasklike', todo: 'tasklike', action_item: 'tasklike',
    observation: 'insight', information: 'context',
  }
  if (typeMap2[raw.record_type?.toLowerCase()]) raw.record_type = typeMap2[raw.record_type.toLowerCase()]
  if (raw.should_store === undefined) raw.should_store = true
  if (!raw.title) raw.title = (raw.summary || '').slice(0, 80) || 'Untitled'
  if (!raw.summary) raw.summary = ''
  if (!Array.isArray(raw.entities)) raw.entities = []
  if (!Array.isArray(raw.proposed_projects)) raw.proposed_projects = []
  if (!Array.isArray(raw.suggested_links)) raw.suggested_links = []
  if (!raw.why_kept_or_dropped) raw.why_kept_or_dropped = 'stored'

  return raw
}

// ─── FastEmbed Singleton ─────────────────────────────────
// Lazily initialized local embedding model (BGE-Base-EN-v1.5, 768-dim).
// Runs entirely in-process — zero external API calls for embeddings.
// This is deliberate: it's what lets Rabbit deployments go fully on-prem.
let _fastEmbedInstance: any = null
let _fastEmbedInitPromise: Promise<any> | null = null

async function getFastEmbed(): Promise<any> {
  if (_fastEmbedInstance) return _fastEmbedInstance
  if (_fastEmbedInitPromise) return _fastEmbedInitPromise

  _fastEmbedInitPromise = (async () => {
    const { FlagEmbedding, EmbeddingModel } = await import('fastembed')
    const model = await FlagEmbedding.init({
      model: EmbeddingModel.BGEBaseENV15,
      cacheDir: 'data/models',
    })
    _fastEmbedInstance = model
    return model
  })()

  return _fastEmbedInitPromise
}

// ─── Verbose failure logging ────────────────────────────
// When Rabbit returns a bad result, we capture enough context to feed it back
// into the next retrain cycle as a failure case. Grep the logs by
// prompt_hash to find exactly what the model saw and produced.
function hashPrompt(text: string): string {
  // Simple djb2 hash — fast, stable, 12-char hex. Not cryptographic.
  let hash = 5381
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) + hash) + text.charCodeAt(i)
    hash = hash & 0xffffffff
  }
  return Math.abs(hash).toString(16).padStart(8, '0').slice(0, 12)
}

function logRabbitFailure(opts: {
  signal: string
  prompt: string
  error: unknown
  status?: number
  rawResponse?: string
}) {
  const promptHash = hashPrompt(opts.prompt)
  const promptPreview = opts.prompt.slice(0, 300).replace(/\s+/g, ' ')
  const errMsg = opts.error instanceof Error ? opts.error.message : String(opts.error)
  const errStack = opts.error instanceof Error ? opts.error.stack : undefined

  console.error('[Rabbit FAILURE]', JSON.stringify({
    ts: new Date().toISOString(),
    signal: opts.signal,
    prompt_hash: promptHash,
    prompt_preview: promptPreview,
    prompt_len: opts.prompt.length,
    error: errMsg,
    status: opts.status,
    raw_response_preview: opts.rawResponse?.slice(0, 500),
    stack: errStack,
  }))
}

// ─── Rabbit Provider ─────────────────────────────────────
// Uses /v1/raw for all calls: sends prompts as-is, no signal routing.
// Triage uses /v1/ingest directly via rabbitIngestAndMap() in agents.ts,
// not through this provider.
class RabbitProvider {
  private apiUrl: string
  private apiKey: string

  constructor(apiUrl: string, apiKey: string) {
    this.apiUrl = apiUrl.replace(/\/$/, '')
    this.apiKey = apiKey
  }

  // Raw pass-through: sends prompt to /v1/raw, Rabbit runs it with no signal routing.
  private async rawCall(
    systemPrompt: string | null,
    userPrompt: string,
    maxTokens: number,
    temperature: number,
    signal: string,
  ): Promise<string> {
    const messages: Array<{ role: string; content: string }> = []
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt })
    messages.push({ role: 'user', content: userPrompt })

    let res: Response
    try {
      res = await fetch(`${this.apiUrl}/v1/raw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'rabbit-v2.0',
          messages,
          temperature,
          max_tokens: maxTokens,
        }),
        signal: AbortSignal.timeout(180_000),
      })
    } catch (networkErr) {
      logRabbitFailure({ signal, prompt: userPrompt, error: networkErr })
      throw new RabbitCallError({
        status: 0,
        signal,
        promptHash: hashPrompt(userPrompt),
        promptPreview: userPrompt.slice(0, 200),
        message: `network error: ${networkErr instanceof Error ? networkErr.message : 'unknown'}`,
      })
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      logRabbitFailure({
        signal,
        prompt: userPrompt,
        error: `HTTP ${res.status}`,
        status: res.status,
        rawResponse: errText,
      })
      throw new RabbitCallError({
        status: res.status,
        signal,
        promptHash: hashPrompt(userPrompt),
        promptPreview: userPrompt.slice(0, 200),
        message: `HTTP ${res.status}: ${errText.slice(0, 200)}`,
      })
    }

    const data = await res.json()
    return data.choices?.[0]?.message?.content || ''
  }

  // Repair common LLM JSON errors
  private repairJSON(text: string): any {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    let jsonStr = jsonMatch ? jsonMatch[0] : text
    jsonStr = jsonStr
      .replace(/,\s*([}\]])/g, '$1')              // trailing commas
      .replace(/'/g, '"')                           // single quotes
      .replace(/"(\w+):\s/g, '"$1": ')             // "kind: → "kind":
      .replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":')  // unquoted keys
    try {
      return JSON.parse(jsonStr)
    } catch {
      return {}
    }
  }

  async generateJSON<T>(prompt: string, schema: z.ZodType<T>): Promise<T> {
    const text = await this.rawCall(
      'Respond ONLY with valid JSON. No markdown, no code fences, no explanation. Keep your response concise.',
      prompt,
      4096,
      0.05,
      'generateJSON',
    )
    const parsed = this.repairJSON(text)
    const normalized = normalizeTriageOutput(parsed)
    try {
      return schema.parse(normalized)
    } catch (schemaErr) {
      logRabbitFailure({
        signal: 'generateJSON:schema',
        prompt,
        error: schemaErr,
        rawResponse: text,
      })
      throw schemaErr
    }
  }

  async generateText(prompt: string, maxTokens?: number): Promise<string> {
    return this.rawCall(null, prompt, maxTokens ?? 2048, 0.2, 'generateText')
  }

  async generateTextStream(prompt: string): Promise<ReadableStream<Uint8Array>> {
    // Rabbit's /v1/raw is not yet streaming. We collect the whole text and
    // stream it as a single chunk so the caller interface stays consistent.
    // Retry once if the first response is suspiciously short — Rabbit
    // occasionally returns junk like "htahtah" on long follow-up prompts,
    // and a quick resample almost always fixes it.
    let text = await this.rawCall(null, prompt, 4096, 0.2, 'generateTextStream')
    if (!text || text.trim().length < 40) {
      console.warn('[Rabbit] generateTextStream returned short/junk output, retrying once:', JSON.stringify(text).slice(0, 100))
      text = await this.rawCall(null, prompt, 4096, 0.3, 'generateTextStream:retry')
    }
    const encoder = new TextEncoder()
    return new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(text))
        controller.close()
      },
    })
  }
}

// ─── Rabbit + FastEmbed ──────────────────────────────────
// LLM = Rabbit v2.0 (remote). Embeddings = local BGE-Base-EN-v1.5.
// This is the only provider Reattend uses.
class RabbitFastEmbedProvider implements LLMProvider {
  private rabbit: RabbitProvider

  constructor(apiUrl: string, apiKey: string) {
    this.rabbit = new RabbitProvider(apiUrl, apiKey)
  }

  generateJSON<T>(prompt: string, schema: z.ZodType<T>): Promise<T> {
    return this.rabbit.generateJSON(prompt, schema)
  }

  generateText(prompt: string, maxTokens?: number): Promise<string> {
    return this.rabbit.generateText(prompt, maxTokens)
  }

  generateTextStream(prompt: string): Promise<ReadableStream<Uint8Array>> {
    return this.rabbit.generateTextStream(prompt)
  }

  async embed(text: string): Promise<number[]> {
    const model = await getFastEmbed()
    const truncated = text.slice(0, 8000)
    const gen = model.embed([truncated])
    for await (const batch of gen) {
      return Array.from(batch[0]) as number[]
    }
    return []
  }
}

// ─── Claude Provider ────────────────────────────────────
// Used for /api/ask (answering user questions). Claude is 10x faster and
// dramatically better at multi-turn, follow-ups, temporal reasoning, and
// meta-instructions ("summarize what you said", "draft an email from this").
// Ingestion stays on Rabbit — it's structured JSON extraction.
class ClaudeProvider implements LLMProvider {
  private apiKey: string
  private model: string

  constructor(apiKey: string, model = 'claude-sonnet-4-20250514') {
    this.apiKey = apiKey
    this.model = model
  }

  async generateJSON<T>(prompt: string, schema: z.ZodType<T>): Promise<T> {
    const text = await this.generateText(
      'Respond ONLY with valid JSON. No markdown, no code fences, no explanation.\n\n' + prompt,
      4096,
    )
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {}
    return schema.parse(parsed)
  }

  async generateText(prompt: string, maxTokens?: number): Promise<string> {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: maxTokens ?? 2048,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (!res.ok) {
      const err = await res.text().catch(() => '')
      throw new Error(`Claude API error ${res.status}: ${err.slice(0, 200)}`)
    }
    const data = await res.json()
    return data.content?.[0]?.text || ''
  }

  async generateTextStream(prompt: string): Promise<ReadableStream<Uint8Array>> {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 4096,
        stream: true,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (!res.ok) {
      const err = await res.text().catch(() => '')
      throw new Error(`Claude API error ${res.status}: ${err.slice(0, 200)}`)
    }

    const decoder = new TextDecoder()
    const encoder = new TextEncoder()
    const reader = res.body!.getReader()

    return new ReadableStream<Uint8Array>({
      async pull(controller) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) { controller.close(); return }

          const chunk = decoder.decode(value, { stream: true })
          for (const line of chunk.split('\n')) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6).trim()
            if (data === '[DONE]') continue
            try {
              const event = JSON.parse(data)
              if (event.type === 'content_block_delta' && event.delta?.text) {
                controller.enqueue(encoder.encode(event.delta.text))
              }
            } catch { /* skip malformed lines */ }
          }
        }
      },
    })
  }

  async embed(text: string): Promise<number[]> {
    // Claude doesn't do embeddings — use FastEmbed (same as Rabbit path)
    const model = await getFastEmbed()
    const truncated = text.slice(0, 8000)
    const gen = model.embed([truncated])
    for await (const batch of gen) {
      return Array.from(batch[0]) as number[]
    }
    return []
  }
}

// ─── Groq Provider ──────────────────────────────────────
// Primary ingestion provider. Llama 3.3 70B on Groq is fast (1-2s),
// free tier covers early stage, and handles structured extraction well.
// Replaces Rabbit as primary for reliability — Rabbit runs as batch
// re-enrichment every 6 hours instead.
class GroqProvider implements LLMProvider {
  private apiKey: string
  private model: string

  constructor(apiKey: string, model = 'llama-3.3-70b-versatile') {
    this.apiKey = apiKey
    this.model = model
  }

  async generateJSON<T>(prompt: string, schema: z.ZodType<T>): Promise<T> {
    const text = await this.generateText(
      'Respond ONLY with valid JSON. No markdown, no code fences, no explanation.\n\n' + prompt,
      4096,
    )
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {}
    // Run through normalizeTriageOutput for Rabbit compat
    const normalized = normalizeTriageOutput(parsed)
    return schema.parse(normalized)
  }

  async generateText(prompt: string, maxTokens?: number): Promise<string> {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: maxTokens ?? 2048,
        temperature: 0.1,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(30_000),
    })
    if (!res.ok) {
      const err = await res.text().catch(() => '')
      throw new Error(`Groq API error ${res.status}: ${err.slice(0, 200)}`)
    }
    const data = await res.json()
    return data.choices?.[0]?.message?.content || ''
  }

  async generateTextStream(prompt: string): Promise<ReadableStream<Uint8Array>> {
    const text = await this.generateText(prompt, 4096)
    const encoder = new TextEncoder()
    return new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(text))
        controller.close()
      },
    })
  }

  async embed(text: string): Promise<number[]> {
    const model = await getFastEmbed()
    const truncated = text.slice(0, 8000)
    const gen = model.embed([truncated])
    for await (const batch of gen) {
      return Array.from(batch[0]) as number[]
    }
    return []
  }
}

// ─── Provider Factory ────────────────────────────────────
function getRabbitProvider(): LLMProvider {
  const rabbitUrl = process.env.RABBIT_API_URL
  const rabbitKey = process.env.RABBIT_API_KEY
  if (!rabbitUrl || !rabbitKey) {
    throw new RabbitNotConfiguredError()
  }
  return new RabbitFastEmbedProvider(rabbitUrl, rabbitKey)
}

function getClaudeProvider(): LLMProvider {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error('ANTHROPIC_API_KEY not set')
  return new ClaudeProvider(key)
}

function getGroqProvider(): LLMProvider {
  const key = process.env.GROQ_API_KEY
  if (!key) throw new Error('GROQ_API_KEY not set')
  return new GroqProvider(key)
}

// Ingestion (triage, extract, summarize) → Groq primary, Rabbit fallback.
// Groq is always available (no spot preemption). Rabbit runs as batch
// re-enrichment every 6 hours for higher quality signals.
export function getLLM(): LLMProvider {
  const groqKey = process.env.GROQ_API_KEY
  if (groqKey) return getGroqProvider()
  // Fallback to Rabbit if Groq not configured
  return getRabbitProvider()
}

// Answering user questions → Claude for all users.
// pb@reattend.ai and anjan@reattend.ai get Rabbit for testing the model.
const RABBIT_TEST_EMAILS = new Set(['pb@reattend.ai', 'anjan@reattend.ai'])

export function getAskLLM(userEmail?: string): LLMProvider {
  if (userEmail && RABBIT_TEST_EMAILS.has(userEmail)) {
    try { return getRabbitProvider() } catch { /* Rabbit down, fall through to Claude */ }
  }
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (anthropicKey) return getClaudeProvider()
  return getRabbitProvider()
}

export function getPreProcessingLLM(): LLMProvider {
  return getRabbitProvider()
}

// Export the local embedding helper too, since storage code uses it directly
export { getFastEmbed }
