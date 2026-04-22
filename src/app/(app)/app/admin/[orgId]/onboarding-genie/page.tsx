'use client'

// Onboarding Genie — auto-compose a personalized first-week packet.
//
// Admin fills a short form: name, email, role title, department, start date.
// Claude reads the org's memory and produces a markdown packet they can
// copy-paste into an email, print as PDF, or (future) send directly.

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import {
  Sparkles, Loader2, UserPlus, Mail, Calendar, Copy, Check, Download, Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  DepartmentTreePicker, type DeptNode,
} from '@/components/enterprise/department-tree-picker'
import { toast } from 'sonner'

type PacketResponse = {
  markdown: string
  sections: {
    overview: string
    keyDecisions: Array<{ id: string; title: string; status: string; decidedAt: string }>
    policies: Array<{ id: string; title: string; category: string | null }>
    peopleToMeet: Array<{ id: string; name: string | null; email: string; role: string; title: string | null }>
    suggestedAgents: Array<{ id: string; name: string; description: string | null }>
  }
  meta: { generatedAt: string; department: string; roleTitle: string; name: string }
}

export default function OnboardingGeniePage({ params }: { params: { orgId: string } }) {
  const { orgId } = params
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [roleTitle, setRoleTitle] = useState('')
  const [departmentId, setDepartmentId] = useState<string | null>(null)
  const [startDate, setStartDate] = useState('')

  const [depts, setDepts] = useState<DeptNode[]>([])
  const [packet, setPacket] = useState<PacketResponse | null>(null)
  const [running, setRunning] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch(`/api/enterprise/organizations/${orgId}/departments`)
        if (res.ok) {
          const d = await res.json()
          setDepts((d.departments || []).map((x: any) => ({ id: x.id, name: x.name, kind: x.kind, parentId: x.parentId })))
        }
      } catch { /* non-fatal */ }
    })()
  }, [orgId])

  async function run() {
    if (!name || !roleTitle || !departmentId) {
      toast.error('Name, role, and department required')
      return
    }
    setRunning(true)
    setPacket(null)
    try {
      const res = await fetch('/api/enterprise/onboarding-genie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId, departmentId, roleTitle, name, email: email || undefined, startDate: startDate || undefined }),
      })
      if (!res.ok) {
        const b = await res.json().catch(() => ({}))
        toast.error(b.error || 'Packet generation failed')
        return
      }
      const d = await res.json()
      setPacket(d)
      toast.success('Packet ready')
    } finally {
      setRunning(false)
    }
  }

  function copyPacket() {
    if (!packet) return
    navigator.clipboard.writeText(packet.markdown)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
    toast.success('Markdown copied')
  }

  function downloadPacket() {
    if (!packet) return
    const blob = new Blob([packet.markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `welcome-${name.toLowerCase().replace(/\s+/g, '-')}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  function reset() {
    setPacket(null)
    setName('')
    setEmail('')
    setRoleTitle('')
    setDepartmentId(null)
    setStartDate('')
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto space-y-5"
    >
      <div className="text-center space-y-2 py-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-cyan-500/10 to-blue-500/10 text-cyan-600 text-[11px] font-medium uppercase tracking-wider">
          <UserPlus className="h-3 w-3" /> Onboarding Genie
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Auto-write their first week</h1>
        <p className="text-sm text-muted-foreground max-w-xl mx-auto">
          Tell me who's joining. I'll read your org's memory and write them a personalized
          welcome packet — decisions to know, people to meet, policies to ack, agents to try.
        </p>
      </div>

      {!packet && (
        <div className="rounded-2xl border bg-card p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Full name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Aditi Sharma" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                <Mail className="h-3 w-3" /> Email
              </Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="aditi@company.com" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Role title *</Label>
              <Input value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} placeholder="Senior Backend Engineer" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Start date
              </Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Department / team *</Label>
            <DepartmentTreePicker
              departments={depts}
              value={departmentId}
              onChange={setDepartmentId}
              placeholder="Search depts / teams…"
              maxHeightClass="max-h-56"
            />
          </div>

          <div className="flex items-center justify-end pt-2 border-t">
            <Button
              onClick={run}
              disabled={running || !name || !roleTitle || !departmentId}
              className="bg-gradient-to-br from-cyan-500 to-blue-600 hover:opacity-95"
            >
              {running ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
              Generate packet
            </Button>
          </div>
        </div>
      )}

      {packet && (
        <div className="space-y-4">
          <div className="rounded-2xl border bg-gradient-to-br from-cyan-500/5 to-transparent p-4 flex items-center gap-3 flex-wrap">
            <div className="h-10 w-10 rounded-full bg-cyan-500/15 text-cyan-600 flex items-center justify-center shrink-0">
              <UserPlus className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold">{packet.meta.name}</div>
              <div className="text-xs text-muted-foreground">
                {packet.meta.roleTitle} · {packet.meta.department} · generated {new Date(packet.meta.generatedAt).toLocaleString()}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={copyPacket}>
                {copied ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                {copied ? 'Copied' : 'Copy markdown'}
              </Button>
              <Button variant="outline" size="sm" onClick={downloadPacket}>
                <Download className="h-3.5 w-3.5 mr-1" /> Download .md
              </Button>
              <Button variant="ghost" size="sm" onClick={reset}>New</Button>
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-6">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{packet.markdown}</ReactMarkdown>
            </div>
          </div>

          {/* Ground-truth reference sections — the admin can verify nothing was fabricated */}
          <details className="rounded-xl border bg-muted/20 p-3">
            <summary className="text-xs font-medium cursor-pointer select-none">Source data (what Claude read)</summary>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Key decisions ({packet.sections.keyDecisions.length})</div>
                <ul className="space-y-1">
                  {packet.sections.keyDecisions.map((d) => (
                    <li key={d.id} className="truncate">· {d.title} ({d.status})</li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Policies ({packet.sections.policies.length})</div>
                <ul className="space-y-1">
                  {packet.sections.policies.map((p) => (
                    <li key={p.id} className="truncate">· {p.title}</li>
                  ))}
                </ul>
              </div>
              <div className="md:col-span-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
                  <Users className="h-3 w-3" /> People ({packet.sections.peopleToMeet.length})
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {packet.sections.peopleToMeet.map((p) => (
                    <span key={p.id} className="rounded-full border px-2 py-0.5">
                      {p.name || p.email} · {p.role}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </details>
        </div>
      )}
    </motion.div>
  )
}
