'use client'

// Chrome Extension admin — required/recommended domain policy.
//
// What admins set here shows up in every org member's extension on next
// poll (GET /api/tray/extension-policy). Required domains are enforced
// (members cannot disable them). Recommended are surfaced as "enable
// these?" suggestions in the extension options page.

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Chrome, Save, Loader2, Plus, X, Shield, Info, ExternalLink, Copy, Check,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

interface Policy {
  requiredDomains: string[]
  recommendedDomains: string[]
  ambient: boolean
}

export default function ExtensionAdminPage({ params }: { params: { orgId: string } }) {
  const { orgId } = params
  const [policy, setPolicy] = useState<Policy | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newRequired, setNewRequired] = useState('')
  const [newRecommended, setNewRecommended] = useState('')
  const [copied, setCopied] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`/api/enterprise/organizations/${orgId}/extension-policy`)
      if (!res.ok) return
      setPolicy(await res.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [orgId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function save(next: Policy) {
    setSaving(true)
    try {
      const res = await fetch(`/api/enterprise/organizations/${orgId}/extension-policy`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      })
      if (!res.ok) {
        const b = await res.json().catch(() => ({}))
        toast.error(b.error || 'Save failed')
        return
      }
      setPolicy(next)
      toast.success('Policy updated — members pull on next extension poll')
    } finally {
      setSaving(false)
    }
  }

  function addRequired() {
    if (!policy) return
    const d = newRequired.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '')
    if (!d || !/\./.test(d)) { toast.error('Enter a domain like acme.atlassian.net'); return }
    save({ ...policy, requiredDomains: Array.from(new Set([...policy.requiredDomains, d])) })
    setNewRequired('')
  }

  function addRecommended() {
    if (!policy) return
    const d = newRecommended.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '')
    if (!d || !/\./.test(d)) { toast.error('Enter a domain like acme.atlassian.net'); return }
    save({ ...policy, recommendedDomains: Array.from(new Set([...policy.recommendedDomains, d])) })
    setNewRecommended('')
  }

  function remove(kind: 'required' | 'recommended', d: string) {
    if (!policy) return
    if (kind === 'required') {
      save({ ...policy, requiredDomains: policy.requiredDomains.filter((x) => x !== d) })
    } else {
      save({ ...policy, recommendedDomains: policy.recommendedDomains.filter((x) => x !== d) })
    }
  }

  function copyInstallLink() {
    // Placeholder — Chrome Web Store URL lands post-publish. Until then, GitHub.
    const link = 'https://github.com/Reattend/enterprise-extension#install'
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
    toast.success('Install link copied')
  }

  if (loading || !policy) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading extension policy…
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      <div>
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-1">
          <Chrome className="h-3.5 w-3.5" /> Chrome extension
        </div>
        <h1 className="font-display text-3xl tracking-tight">Extension policy</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Control which apps your members&apos; Chrome extensions track. Required domains are
          enforced — members can&apos;t disable them. Recommended domains surface as suggestions in
          their extension options page.
        </p>
      </div>

      {/* Install card */}
      <Card className="p-4 bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
        <div className="flex items-start gap-3">
          <Chrome className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-sm">Give members the install link</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Distribute via your onboarding email or #general. Members generate an API token in
              their own Settings page, paste it into the extension, and the policy below applies
              automatically on their first run.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={copyInstallLink}>
            {copied ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
            Copy link
          </Button>
        </div>
      </Card>

      {/* Required domains */}
      <Card className="p-4 space-y-3">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-red-500" />
            <h2 className="text-sm font-semibold">Required domains</h2>
            <span className="text-[10px] text-muted-foreground">({policy.requiredDomains.length})</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Enforced. Members cannot turn these off in their extension. Use for compliance-critical
            apps (your SSO-protected Jira, SharePoint, law-practice system).
          </p>
        </div>
        <div className="flex gap-2">
          <Input
            value={newRequired}
            onChange={(e) => setNewRequired(e.target.value)}
            placeholder="acme.atlassian.net"
            disabled={saving}
            onKeyDown={(e) => { if (e.key === 'Enter') addRequired() }}
          />
          <Button onClick={addRequired} disabled={saving} size="sm">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          </Button>
        </div>
        {policy.requiredDomains.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">None yet. Required stays empty until you have apps your org <em>must</em> track.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {policy.requiredDomains.map((d) => (
              <span key={d} className="inline-flex items-center gap-1 text-[11px] rounded-full border border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400 px-2 py-0.5 font-mono">
                {d}
                <button onClick={() => remove('required', d)} className="opacity-60 hover:opacity-100" title="Remove">
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
          </div>
        )}
      </Card>

      {/* Recommended domains */}
      <Card className="p-4 space-y-3">
        <div>
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-blue-500" />
            <h2 className="text-sm font-semibold">Recommended domains</h2>
            <span className="text-[10px] text-muted-foreground">({policy.recommendedDomains.length})</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Suggested to members. They see &ldquo;your org recommends tracking these&rdquo; in the extension
            options and can accept in one click.
          </p>
        </div>
        <div className="flex gap-2">
          <Input
            value={newRecommended}
            onChange={(e) => setNewRecommended(e.target.value)}
            placeholder="wiki.internal.company.com"
            disabled={saving}
            onKeyDown={(e) => { if (e.key === 'Enter') addRecommended() }}
          />
          <Button onClick={addRecommended} disabled={saving} size="sm">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          </Button>
        </div>
        {policy.recommendedDomains.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">None yet. Add tools most of the team uses but aren&apos;t critical enough to force.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {policy.recommendedDomains.map((d) => (
              <span key={d} className="inline-flex items-center gap-1 text-[11px] rounded-full border bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30 px-2 py-0.5 font-mono">
                {d}
                <button onClick={() => remove('recommended', d)} className="opacity-60 hover:opacity-100" title="Remove">
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
          </div>
        )}
      </Card>

      {/* Ambient toggle */}
      <Card className="p-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={policy.ambient}
            onChange={(e) => save({ ...policy, ambient: e.target.checked })}
            className="mt-1 h-4 w-4"
            disabled={saving}
          />
          <div>
            <div className="text-sm font-semibold">Ambient related-memory surfacing</div>
            <p className="text-xs text-muted-foreground mt-0.5">
              When members visit a whitelisted page, the extension shows a subtle corner card with
              memories your org already has on that topic. RBAC-enforced — members only see
              memories they could access in the app. Turn off for orgs where any on-page surfacing
              is a policy violation.
            </p>
          </div>
        </label>
      </Card>

      <Card className="p-4 bg-muted/30 border-dashed">
        <div className="flex items-start gap-3 text-xs text-muted-foreground">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <p><strong className="text-foreground">Propagation:</strong> members&apos; extensions pull the latest policy on startup and every ~30 minutes. Expect full adoption within the hour of a change.</p>
            <p className="mt-2"><strong className="text-foreground">RBAC:</strong> policy is <em>additive only</em>. It can&apos;t force-enable what a member has no business seeing — the extension still respects record-level access when surfacing ambient memories.</p>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}
