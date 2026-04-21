'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { AgentBuilderForm, type AgentFormInitial } from '../../_components/builder-form'

export default function EditAgentPage({ params }: { params: { orgId: string; agentId: string } }) {
  const [initial, setInitial] = useState<AgentFormInitial | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch(`/api/enterprise/agents/${params.agentId}`)
        if (!res.ok) { setErr('Agent not found or forbidden'); return }
        const data = await res.json()
        setInitial({
          id: data.agent.id,
          name: data.agent.name,
          description: data.agent.description,
          systemPrompt: data.agent.systemPrompt,
          iconName: data.agent.iconName,
          color: data.agent.color,
          tier: data.agent.tier === 'departmental' ? 'departmental' : 'org',
          departmentId: data.agent.departmentId,
          scopeConfig: data.agent.scopeConfig || {},
          deploymentTargets: data.agent.deploymentTargets || ['web'],
          status: data.agent.status,
        })
      } catch {
        setErr('Failed to load')
      }
    })()
  }, [params.agentId])

  if (err) return <div className="p-8 text-sm text-destructive">{err}</div>
  if (!initial) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>

  return <AgentBuilderForm orgId={params.orgId} mode="edit" initial={initial} />
}
