'use client'

// Shared authoring form for new + edit flows. Deliberately simple — markdown
// textarea (no WYSIWYG, which would be its own ~3-day rabbit hole).
// Enterprise admins prefer copy-paste from existing docs anyway.

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Save,
  FileText,
  Loader2,
  Calendar,
  Shield,
  Building2,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

type Applicability = { allOrg: boolean; departments: string[]; roles: string[]; users: string[] }

export type PolicyFormInitial = {
  title: string
  category: string | null
  effectiveDate: string | null
  applicability: Applicability
  body: string
  summary: string | null
  status?: 'draft' | 'published' | 'archived'
  requiresReAck?: boolean
}

const CATEGORIES = [
  { value: 'security', label: 'Security' },
  { value: 'hr', label: 'HR' },
  { value: 'finance', label: 'Finance' },
  { value: 'it', label: 'IT' },
  { value: 'travel', label: 'Travel' },
  { value: 'compliance', label: 'Compliance' },
  { value: 'other', label: 'Other' },
]

export function PolicyAuthoringForm({
  orgId,
  initial,
  mode,
  policyId,
}: {
  orgId: string
  initial: PolicyFormInitial
  mode: 'new' | 'edit'
  policyId?: string
}) {
  const router = useRouter()
  const [title, setTitle] = useState(initial.title)
  const [category, setCategory] = useState(initial.category || '')
  const [effectiveDate, setEffectiveDate] = useState(initial.effectiveDate || '')
  const [summary, setSummary] = useState(initial.summary || '')
  const [body, setBody] = useState(initial.body)
  const [applicability, setApplicability] = useState<Applicability>(initial.applicability)
  const [changeNote, setChangeNote] = useState('')
  const [requiresReAck, setRequiresReAck] = useState(initial.requiresReAck ?? true)
  const [saving, setSaving] = useState(false)

  // Dept + role pickers
  const [depts, setDepts] = useState<Array<{ id: string; name: string; kind: string }>>([])
  const [roles, setRoles] = useState<Array<{ id: string; title: string }>>([])

  useEffect(() => {
    ;(async () => {
      try {
        const [dRes, rRes] = await Promise.all([
          fetch(`/api/enterprise/organizations/${orgId}/departments`),
          fetch(`/api/enterprise/organizations/${orgId}/roles`),
        ])
        if (dRes.ok) {
          const d = await dRes.json()
          setDepts(d.departments || [])
        }
        if (rRes.ok) {
          const r = await rRes.json()
          setRoles((r.roles || []).map((x: any) => ({ id: x.id, title: x.title })))
        }
      } catch { /* non-fatal */ }
    })()
  }, [orgId])

  const toggleDept = (id: string) => {
    setApplicability((a) => ({
      ...a,
      allOrg: false,
      departments: a.departments.includes(id) ? a.departments.filter((x) => x !== id) : [...a.departments, id],
    }))
  }
  const toggleRole = (id: string) => {
    setApplicability((a) => ({
      ...a,
      allOrg: false,
      roles: a.roles.includes(id) ? a.roles.filter((x) => x !== id) : [...a.roles, id],
    }))
  }

  const submit = async (publish: boolean) => {
    if (!title.trim() || !body.trim()) {
      toast.error('Title and body are required')
      return
    }
    setSaving(true)
    try {
      if (mode === 'new') {
        const res = await fetch(`/api/enterprise/policies`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orgId, title, category: category || null,
            effectiveDate: effectiveDate || null,
            applicability, body, summary: summary || null,
            publish,
          }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          toast.error(err.error || 'Create failed')
          return
        }
        const data = await res.json()
        toast.success(publish ? 'Published' : 'Draft saved')
        router.push(`/app/policies/${data.policy.id}`)
      } else {
        const res = await fetch(`/api/enterprise/policies/${policyId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title, category: category || null,
            effectiveDate: effectiveDate || null,
            applicability, body, summary: summary || null,
            changeNote: changeNote || null,
            requiresReAck,
            publish,
          }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          toast.error(err.error || 'Update failed')
          return
        }
        toast.success(publish ? 'Published new version' : 'Draft saved')
        router.push(`/app/policies/${policyId}`)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/app/policies"><ArrowLeft className="h-4 w-4 mr-1" /> Policies</Link>
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => submit(false)} disabled={saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
            Save draft
          </Button>
          <Button size="sm" onClick={() => submit(true)} disabled={saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : null}
            {mode === 'edit' ? 'Publish new version' : 'Publish'}
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-6 space-y-4">
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Remote Work Policy" className="text-base font-semibold" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Category</Label>
            <Select value={category || 'other'} onValueChange={(v) => setCategory(v === 'other' ? '' : v)}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value} className="text-sm">{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Effective date
            </Label>
            <Input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} className="h-9 text-sm" />
          </div>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">Short summary</Label>
          <Textarea
            value={summary} onChange={(e) => setSummary(e.target.value)}
            placeholder="One or two sentences. Shown in the list view."
            rows={2} className="text-sm"
          />
        </div>

        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">Body (markdown)</Label>
          <Textarea
            value={body} onChange={(e) => setBody(e.target.value)}
            placeholder={'# Section 1\n\nFull policy text here…'}
            rows={14} className="text-sm font-mono"
          />
        </div>
      </div>

      {/* Applicability */}
      <div className="rounded-2xl border bg-card p-6 space-y-4">
        <div className="flex items-start gap-3">
          <Shield className="h-4 w-4 text-muted-foreground mt-0.5" />
          <div className="flex-1">
            <div className="text-sm font-semibold">Applicability</div>
            <div className="text-xs text-muted-foreground mt-0.5">Who must acknowledge this policy.</div>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs">Org-wide</Label>
            <Switch
              checked={applicability.allOrg}
              onCheckedChange={(v) => setApplicability((a) => ({ ...a, allOrg: v, departments: [], roles: [], users: [] }))}
            />
          </div>
        </div>

        {!applicability.allOrg && (
          <>
            <div>
              <Label className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <Building2 className="h-3 w-3" /> Departments ({applicability.departments.length})
              </Label>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto rounded-md border p-2">
                {depts.length === 0 ? (
                  <span className="text-xs text-muted-foreground italic">No departments visible.</span>
                ) : depts.map((d) => {
                  const picked = applicability.departments.includes(d.id)
                  return (
                    <button
                      key={d.id} type="button"
                      onClick={() => toggleDept(d.id)}
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition-colors ${
                        picked ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'
                      }`}
                    >
                      {d.name}
                      <span className="opacity-60 capitalize text-[9px]">{d.kind}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <Users className="h-3 w-3" /> Roles ({applicability.roles.length})
              </Label>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto rounded-md border p-2">
                {roles.length === 0 ? (
                  <span className="text-xs text-muted-foreground italic">No roles defined.</span>
                ) : roles.map((r) => {
                  const picked = applicability.roles.includes(r.id)
                  return (
                    <button
                      key={r.id} type="button"
                      onClick={() => toggleRole(r.id)}
                      className={`rounded-full border px-2 py-0.5 text-[11px] transition-colors ${
                        picked ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'
                      }`}
                    >
                      {r.title}
                    </button>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {mode === 'edit' && (
        <div className="rounded-2xl border bg-card p-5 space-y-3">
          <div className="text-sm font-semibold flex items-center gap-2">
            <FileText className="h-3.5 w-3.5 text-muted-foreground" /> Version change
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              What changed? (shown in version history)
            </Label>
            <Input value={changeNote} onChange={(e) => setChangeNote(e.target.value)} placeholder="Raised per-diem cap from 3k to 4k" className="h-9 text-sm" />
          </div>
          <div className="flex items-center justify-between border rounded-lg p-3 bg-muted/20">
            <div>
              <div className="text-sm font-medium">Require re-acknowledgment</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Turn off for typo fixes — existing acks remain valid.
              </div>
            </div>
            <Switch checked={requiresReAck} onCheckedChange={setRequiresReAck} />
          </div>
        </div>
      )}
    </div>
  )
}
