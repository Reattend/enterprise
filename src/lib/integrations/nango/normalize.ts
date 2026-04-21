// A normalizer converts one record from Nango's sync output into the shape
// we store in raw_items. The triage agent then decides whether each raw_item
// is worth promoting to a real memory.
//
// Every provider has its own normalizer in ./providers/<key>.ts. The shape
// of the Nango payload depends entirely on the sync script the provider runs
// in Nango — that's why we accept an untyped Record<string, unknown>.

export interface NormalizedRawItem {
  // Deduped on this per-connection — Nango emits the same record on every
  // sync run if nothing changed, so we need a stable key to not double-write.
  externalId: string
  // ISO timestamp of when the thing actually happened in the source
  // (e.g. when the email was sent, not when Nango synced it).
  occurredAt: string | null
  // Who authored it in the source (name, email, handle — denormalized JSON).
  author: Record<string, unknown> | null
  // The plain-text body the triage agent reads. Keep it compact — anything
  // above ~30k chars gets truncated upstream before embedding.
  text: string
  // Free-form metadata the UI can render (subject line, channel name, URL).
  metadata: Record<string, unknown>
}

export type NangoNormalizer = (record: Record<string, unknown>) => NormalizedRawItem | null

// Helper: coerce unknown → string safely without throwing on null/undefined.
export function asText(v: unknown, fallback = ''): string {
  if (v == null) return fallback
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  return JSON.stringify(v)
}

export function asIso(v: unknown): string | null {
  if (!v) return null
  if (typeof v === 'string') {
    const d = new Date(v)
    return isNaN(d.getTime()) ? null : d.toISOString()
  }
  if (typeof v === 'number') {
    return new Date(v).toISOString()
  }
  return null
}
