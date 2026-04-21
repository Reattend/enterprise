'use client'

// Promote a memory → a first-class Decision.
//
// Why this exists: in our data model a "decision" is distinct from a memory.
// Memories are raw material (emails, meetings, notes). A decision is the
// thing you want to cite forever, that can be superseded, reversed, and
// show up in briefings and handovers. This dialog is the conversion point.

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Gavel, Loader2, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { useAppStore } from '@/stores/app-store'

export function PromoteToDecisionDialog({
  open, onOpenChange, record,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  record: any
}) {
  const router = useRouter()
  const { activeEnterpriseOrgId } = useAppStore()
  const [title, setTitle] = useState('')
  const [context, setContext] = useState('')
  const [rationale, setRationale] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [departments, setDepartments] = useState<Array<{ id: string; name: string; kind: string }>>([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open || !record) return
    setTitle(record.title || '')
    setContext(record.summary || '')
    setRationale('')
  }, [open, record])

  useEffect(() => {
    if (!open || !activeEnterpriseOrgId) return
    ;(async () => {
      try {
        const res = await fetch(`/api/enterprise/organizations/${activeEnterpriseOrgId}/departments`)
        if (!res.ok) return
        const data = await res.json()
        setDepartments(data.departments || [])
      } catch { /* non-fatal */ }
    })()
  }, [open, activeEnterpriseOrgId])

  const submit = async () => {
    if (!activeEnterpriseOrgId) {
      toast.error('No active organization — pick one first')
      return
    }
    if (!title.trim()) {
      toast.error('Title is required')
      return
    }
    if (!departmentId) {
      toast.error('Pick the department that owns this decision')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/enterprise/organizations/${activeEnterpriseOrgId}/decisions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          context: context || null,
          rationale: rationale || null,
          departmentId,
          recordId: record.id,
          decidedAt: new Date().toISOString(),
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error || 'Promote failed')
        return
      }
      const data = await res.json()
      toast.success('Decision created')
      onOpenChange(false)
      // Jump to the decisions admin view so the user sees it in context.
      router.push(`/app/admin/${activeEnterpriseOrgId}/decisions`)
      void data
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gavel className="h-4 w-4" /> Promote to decision
          </DialogTitle>
          <DialogDescription className="text-xs">
            Link this memory to a first-class decision. Decisions can be superseded, reversed, and show up in briefings and transfer handovers.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg bg-muted/40 p-3 text-xs flex items-center gap-2">
            <span className="text-muted-foreground">Source memory:</span>
            <span className="font-medium truncate flex-1">{record?.title}</span>
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
            <Gavel className="h-3 w-3 text-primary" />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Decision title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Approved Q4 hiring freeze" />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Context — why this decision was needed</Label>
            <Textarea value={context} onChange={(e) => setContext(e.target.value)} rows={2} placeholder="The situation that prompted the decision" className="text-sm" />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Rationale — why this option was chosen</Label>
            <Textarea value={rationale} onChange={(e) => setRationale(e.target.value)} rows={2} placeholder="Why we picked this over alternatives" className="text-sm" />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Owning department</Label>
            <Select value={departmentId} onValueChange={setDepartmentId}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Pick department" /></SelectTrigger>
              <SelectContent>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id} className="text-sm">
                    {d.name} <span className="text-[10px] text-muted-foreground capitalize">· {d.kind}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Gavel className="h-3.5 w-3.5 mr-1" />}
            Create decision
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
