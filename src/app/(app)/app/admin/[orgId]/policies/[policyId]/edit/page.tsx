'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { PolicyAuthoringForm, type PolicyFormInitial } from '../../_components/authoring-form'

export default function EditPolicyPage({ params }: { params: { orgId: string; policyId: string } }) {
  const [initial, setInitial] = useState<PolicyFormInitial | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch(`/api/enterprise/policies/${params.policyId}`)
        if (!res.ok) {
          setErr('Policy not found or forbidden')
          return
        }
        const data = await res.json()
        setInitial({
          title: data.policy.title,
          category: data.policy.category,
          effectiveDate: data.policy.effectiveDate,
          applicability: data.policy.applicability,
          body: data.currentVersion?.body || '',
          summary: data.currentVersion?.summary || null,
          status: data.policy.status,
          requiresReAck: true,
        })
      } catch (e) {
        setErr('Failed to load')
      }
    })()
  }, [params.policyId])

  if (err) return <div className="p-8 text-sm text-destructive">{err}</div>
  if (!initial) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>

  return (
    <PolicyAuthoringForm
      orgId={params.orgId}
      mode="edit"
      policyId={params.policyId}
      initial={initial}
    />
  )
}
