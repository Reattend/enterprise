'use client'

import { AgentBuilderForm } from '../_components/builder-form'

export default function NewAgentPage({ params }: { params: { orgId: string } }) {
  return (
    <AgentBuilderForm
      orgId={params.orgId}
      mode="new"
      initial={{
        name: '',
        description: null,
        systemPrompt: '',
        iconName: null,
        color: null,
        tier: 'org',
        departmentId: null,
        scopeConfig: {},
        deploymentTargets: ['web'],
      }}
    />
  )
}
