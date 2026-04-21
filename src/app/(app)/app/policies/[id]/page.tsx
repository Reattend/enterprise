'use client'

// Policy detail page — full body, ack button, version history, diff viewer.

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Check,
  Clock,
  FileText,
  History,
  GitCompare,
  Loader2,
  Edit3,
  Calendar,
  Shield,
  Info,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { useAppStore } from '@/stores/app-store'

type Version = {
  id: string
  versionNumber: number
  title: string
  summary: string | null
  body: string
  publishedAt: string | null
  changeNote: string | null
  requiresReAck: boolean
}

type DetailResp = {
  policy: {
    id: string
    title: string
    category: string | null
    status: 'draft' | 'published' | 'archived'
    effectiveDate: string | null
    applicability: { allOrg: boolean; departments: string[]; roles: string[]; users: string[] }
    updatedAt: string
  }
  currentVersion: Version | null
  versions: Version[]
  ackState: 'pending' | 'acknowledged' | 'not_subject' | 'not_applicable'
  myAck: { acknowledgedAt: string } | null
  canAuthor: boolean
}

type DiffResp = {
  from: { versionNumber: number; title: string; publishedAt: string | null } | null
  to: { versionNumber: number; title: string; publishedAt: string | null; changeNote: string | null }
  titleChanged: boolean
  bodyDiff: Array<{ kind: 'same' | 'add' | 'del'; text: string }>
  added: number
  removed: number
}

export default function PolicyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const policyId = params.id as string
  const { activeEnterpriseOrgId } = useAppStore()

  const [data, setData] = useState<DetailResp | null>(null)
  const [loading, setLoading] = useState(true)
  const [acking, setAcking] = useState(false)
  const [showDiff, setShowDiff] = useState(false)
  const [diffFrom, setDiffFrom] = useState<string | null>(null)
  const [diffTo, setDiffTo] = useState<string | null>(null)
  const [diff, setDiff] = useState<DiffResp | null>(null)
  const [diffLoading, setDiffLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/enterprise/policies/${policyId}`)
      if (!res.ok) return
      const d = await res.json()
      setData(d)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [policyId])

  const handleAck = async () => {
    setAcking(true)
    try {
      const res = await fetch(`/api/enterprise/policies/${policyId}/acknowledge`, { method: 'POST' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error || 'Ack failed')
        return
      }
      toast.success('Acknowledged')
      load()
    } finally {
      setAcking(false)
    }
  }

  const openDiff = async (toVersionId: string, fromVersionId: string | null) => {
    setShowDiff(true)
    setDiffTo(toVersionId)
    setDiffFrom(fromVersionId)
    setDiffLoading(true)
    setDiff(null)
    try {
      const qs = new URLSearchParams()
      qs.set('to', toVersionId)
      if (fromVersionId) qs.set('from', fromVersionId)
      const res = await fetch(`/api/enterprise/policies/${policyId}/diff?${qs.toString()}`)
      if (!res.ok) return
      setDiff(await res.json())
    } finally {
      setDiffLoading(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
  }
  if (!data) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Policy not found</p>
        <Button className="mt-4" asChild><Link href="/app/policies">Back to Policies</Link></Button>
      </div>
    )
  }

  const v = data.currentVersion

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5 max-w-4xl"
    >
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        {data.canAuthor && activeEnterpriseOrgId && (
          <Button variant="outline" size="sm" asChild>
            <Link href={`/app/admin/${activeEnterpriseOrgId}/policies/${policyId}/edit`}>
              <Edit3 className="h-4 w-4 mr-1" /> Edit
            </Link>
          </Button>
        )}
      </div>

      <div className="rounded-2xl border bg-card overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-primary/70 to-primary" />
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <FileText className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                {data.policy.category && (
                  <Badge variant="secondary" className="text-[10px] capitalize">{data.policy.category}</Badge>
                )}
                {v && <Badge variant="outline" className="text-[10px] h-4 px-1">v{v.versionNumber}</Badge>}
                {data.policy.status === 'draft' && (
                  <Badge variant="outline" className="text-[10px] h-4 px-1">Draft</Badge>
                )}
                {data.policy.status === 'archived' && (
                  <Badge variant="outline" className="text-[10px] h-4 px-1 text-muted-foreground">Archived</Badge>
                )}
              </div>
              <h1 className="text-xl font-bold tracking-tight leading-snug">{data.policy.title}</h1>
              {v?.summary && <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{v.summary}</p>}

              <div className="flex items-center gap-3 mt-3 text-[11px] text-muted-foreground flex-wrap">
                {data.policy.effectiveDate && (
                  <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> Effective {new Date(data.policy.effectiveDate).toLocaleDateString()}</span>
                )}
                {v?.publishedAt && (
                  <span className="inline-flex items-center gap-1"><History className="h-3 w-3" /> Published {new Date(v.publishedAt).toLocaleDateString()}</span>
                )}
                <span className="inline-flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  {data.policy.applicability.allOrg ? 'Org-wide' : `${data.policy.applicability.departments.length} dept(s), ${data.policy.applicability.roles.length} role(s)`}
                </span>
              </div>
            </div>
          </div>

          {/* Ack banner */}
          {data.policy.status === 'published' && (
            <div className="mt-5 pt-4 border-t">
              {data.ackState === 'pending' && (
                <div className="flex items-center gap-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30 p-3">
                  <Clock className="h-4 w-4 text-yellow-600 shrink-0" />
                  <div className="flex-1 text-sm">
                    <div className="font-medium text-yellow-900 dark:text-yellow-200">Acknowledgment required</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Read the policy below, then click Acknowledge to record compliance.
                    </div>
                  </div>
                  <Button size="sm" onClick={handleAck} disabled={acking}>
                    {acking ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
                    Acknowledge
                  </Button>
                </div>
              )}
              {data.ackState === 'acknowledged' && data.myAck && (
                <div className="flex items-center gap-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                  <div className="flex-1 text-sm">
                    <div className="font-medium text-emerald-900 dark:text-emerald-200">You acknowledged this policy</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      On {new Date(data.myAck.acknowledgedAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              )}
              {data.ackState === 'not_subject' && (
                <div className="flex items-center gap-3 rounded-xl bg-muted/40 border p-3">
                  <Info className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 text-sm text-muted-foreground">
                    This policy does not apply to your role or department.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Full body */}
      <div className="rounded-2xl border bg-card p-6">
        <h2 className="text-sm font-semibold mb-3">Policy text</h2>
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <pre className="whitespace-pre-wrap text-sm font-sans leading-relaxed text-foreground/90">{v?.body || '(no content)'}</pre>
        </div>
      </div>

      {/* Version history */}
      {data.versions.length > 1 && (
        <div className="rounded-2xl border bg-card p-5">
          <h2 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <History className="h-3.5 w-3.5 text-muted-foreground" /> Version history ({data.versions.length})
          </h2>
          <div className="space-y-1.5">
            {data.versions.map((ver, i) => {
              const prev = data.versions[i + 1] // next in list = older (sorted desc)
              const isCurrent = ver.id === v?.id
              return (
                <div key={ver.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/40 transition-colors">
                  <Badge variant={isCurrent ? 'default' : 'outline'} className="text-[9px] h-4 px-1 shrink-0">
                    v{ver.versionNumber}{isCurrent && ' • current'}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{ver.title}</div>
                    {ver.changeNote && <div className="text-[10px] text-muted-foreground truncate">{ver.changeNote}</div>}
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {ver.publishedAt ? new Date(ver.publishedAt).toLocaleDateString() : 'unpublished'}
                  </span>
                  {prev && (
                    <Button
                      variant="ghost" size="sm"
                      className="h-6 text-[10px]"
                      onClick={() => openDiff(ver.id, prev.id)}
                    >
                      <GitCompare className="h-3 w-3 mr-0.5" /> Diff
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Diff viewer */}
      {showDiff && (
        <div className="rounded-2xl border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <GitCompare className="h-3.5 w-3.5 text-muted-foreground" />
              {diff ? `Diff v${diff.from?.versionNumber ?? '—'} → v${diff.to.versionNumber}` : 'Diff'}
            </h2>
            <Button variant="ghost" size="sm" onClick={() => setShowDiff(false)}>Close</Button>
          </div>
          {diffLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Computing diff…</div>
          ) : diff ? (
            <>
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground mb-3">
                <span className="text-emerald-600">+{diff.added} added</span>
                <span className="text-red-600">-{diff.removed} removed</span>
                {diff.titleChanged && <span className="text-yellow-600">title changed</span>}
                {diff.to.changeNote && <span>note: {diff.to.changeNote}</span>}
              </div>
              <div className="rounded-lg border overflow-hidden font-mono text-xs max-h-96 overflow-y-auto">
                {diff.bodyDiff.map((line, i) => (
                  <div key={i} className={
                    line.kind === 'add' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-3 py-0.5'
                    : line.kind === 'del' ? 'bg-red-500/10 text-red-700 dark:text-red-400 px-3 py-0.5 line-through'
                    : 'px-3 py-0.5 text-muted-foreground'
                  }>
                    <span className="opacity-40 select-none mr-2">{line.kind === 'add' ? '+' : line.kind === 'del' ? '-' : ' '}</span>
                    {line.text || '\u00a0'}
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div>
      )}
    </motion.div>
  )
}
