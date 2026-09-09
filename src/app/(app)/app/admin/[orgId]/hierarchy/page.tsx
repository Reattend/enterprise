'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Network, Users, Building2, Brain, Loader2, AlertCircle,
  ArrowRight, Settings2,
} from 'lucide-react'
import { OrgChart } from '@/components/enterprise/org-chart'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

type Department = {
  id: string
  name: string
  kind: string
  parentId: string | null
  memberCount: number
  recordCount: number
}

export default function ControlRoomHierarchyPage({ params }: { params: { orgId: string } }) {
  const { orgId } = params
  const [departments, setDepartments] = useState<Department[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const response = await fetch(`/api/enterprise/wiki/tree?orgId=${orgId}`)
        if (!response.ok) throw new Error('Could not load the organization map')
        const data = await response.json()
        if (!cancelled) setDepartments(data.departments || [])
      } catch (cause) {
        if (!cancelled) setError((cause as Error).message)
      }
    })()
    return () => { cancelled = true }
  }, [orgId])

  const summary = useMemo(() => {
    const rows = departments ?? []
    return {
      units: rows.length,
      teams: rows.filter((row) => row.kind.toLowerCase() === 'team').length,
      members: rows.reduce((sum, row) => sum + (row.memberCount || 0), 0),
      memories: rows.reduce((sum, row) => sum + (row.recordCount || 0), 0),
    }
  }, [departments])

  const memberCountByDept = useMemo(
    () => Object.fromEntries((departments ?? []).map((row) => [row.id, row.memberCount || 0])),
    [departments],
  )
  const recordCountByDept = useMemo(
    () => Object.fromEntries((departments ?? []).map((row) => [row.id, row.recordCount || 0])),
    [departments],
  )
  const leaders = useMemo(
    () => [...(departments ?? [])].sort((a, b) => b.recordCount - a.recordCount).slice(0, 5),
    [departments],
  )

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="control-hierarchy-page">
      <header className="control-hierarchy-head">
        <div>
          <span className="control-kicker"><Network size={13} /> Organogram · Hierarchy</span>
          <h1>See how knowledge moves through the organization.</h1>
          <p>Departments define the structure. Teams hold memory. Select any node to inspect its living wiki.</p>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/app/admin/${orgId}/departments`}><Settings2 size={14} /> Manage structure</Link>
        </Button>
      </header>

      <div className="control-hierarchy-stats">
        <Stat icon={Building2} label="Org units" value={summary.units} />
        <Stat icon={Network} label="Memory teams" value={summary.teams} />
        <Stat icon={Users} label="Members mapped" value={summary.members} />
        <Stat icon={Brain} label="Memories connected" value={summary.memories} />
      </div>

      {error ? (
        <Card className="control-hierarchy-state"><AlertCircle size={18} /> {error}</Card>
      ) : departments == null ? (
        <Card className="control-hierarchy-state"><Loader2 size={18} className="animate-spin" /> Building the organization graph…</Card>
      ) : departments.length === 0 ? (
        <Card className="control-hierarchy-state">
          <Building2 size={20} />
          <span>No departments yet.</span>
          <Button size="sm" asChild><Link href={`/app/admin/${orgId}/departments`}>Create the first one</Link></Button>
        </Card>
      ) : (
        <div className="control-hierarchy-grid">
          <section className="control-hierarchy-map">
            <div className="control-panel-head">
              <span><Network size={14} /> Interactive organization graph</span>
              <small>Drag to explore · scroll to zoom</small>
            </div>
            <OrgChart
              departments={departments}
              memberCountByDept={memberCountByDept}
              recordCountByDept={recordCountByDept}
              onNodeClick={(departmentId) => window.location.assign(`/app/wiki?tab=hierarchy&deptId=${departmentId}`)}
            />
          </section>

          <aside className="control-hierarchy-insight">
            <div className="control-panel-head"><span><Brain size={14} /> Memory distribution</span></div>
            <p>Teams with the most connected organizational context.</p>
            <div className="control-memory-bars">
              {leaders.map((department) => {
                const max = leaders[0]?.recordCount || 1
                const percentage = Math.max(4, Math.round((department.recordCount / max) * 100))
                return (
                  <Link key={department.id} href={`/app/wiki?tab=hierarchy&deptId=${department.id}`}>
                    <span><b>{department.name}</b><small>{department.memberCount} members</small></span>
                    <i><b style={{ width: `${percentage}%` }} /></i>
                    <strong>{department.recordCount}</strong>
                  </Link>
                )
              })}
            </div>
            <Link className="control-view-wiki" href="/app/wiki?tab=hierarchy">
              Open the living wiki <ArrowRight size={13} />
            </Link>
          </aside>
        </div>
      )}
    </motion.div>
  )
}

function Stat({ icon: Icon, label, value }: { icon: typeof Building2; label: string; value: number }) {
  return (
    <Card>
      <span><Icon size={14} /> {label}</span>
      <b>{value.toLocaleString()}</b>
    </Card>
  )
}
