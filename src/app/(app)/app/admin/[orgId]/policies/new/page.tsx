'use client'

import { PolicyAuthoringForm } from '../_components/authoring-form'

export default function NewPolicyPage({ params }: { params: { orgId: string } }) {
  return (
    <PolicyAuthoringForm
      orgId={params.orgId}
      mode="new"
      initial={{
        title: '',
        category: null,
        effectiveDate: null,
        applicability: { allOrg: true, departments: [], roles: [], users: [] },
        body: '',
        summary: null,
      }}
    />
  )
}
