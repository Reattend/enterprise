'use client'

// Org hierarchy — visual org chart, member-visible.
//
// Reads the same /api/enterprise/wiki/tree endpoint the Wiki page uses
// (already RBAC-aware: returns the depts the calling user has access
// to). Renders via the existing OrgChart component plus a small list
// view for narrow screens / printing. Serves the "show my team" need
// without elevating /app/admin/<orgId>/departments to non-admins.

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Network, Users, Building2, Loader2, AlertCircle, ChevronRight,
} from 'lucide-react'
import { useAppStore } from '@/stores/app-store'
import { OrgChart } from '@/components/enterprise/org-chart'
import { cn } from '@/lib/utils'

type Dept = {
  id: string
  name: string
  slug: string
  kind: string
  parentId: string | null
  headUserId: string | null
  recordCount: number
  memberCount: number
  lastRecordAt: string | null
}

export default function HierarchyPage() {
  const router = useRouter()
  const { activeEnterpriseOrgId, enterpriseOrgs, hasHydratedStore } = useAppStore()
  const activeOrg = enterpriseOrgs.find((o) => o.orgId === activeEnterpriseOrgId)
  const [depts, setDepts] = useState<Dept[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!activeEnterpriseOrgId) return
    let cancelled = false
    setLoading(true)
    setErr(null)
    ;(async () => {
      try {
        const res = await fetch(`/api/enterprise/wiki/tree?orgId=${activeEnterpriseOrgId}`)
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error || 'failed to load hierarchy')
        }
        const data = await res.json()
        if (!cancelled) setDepts(data.departments || [])
      } catch (e) {
        if (!cancelled) setErr((e as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [activeEnterpriseOrgId])

  // Derive count maps for OrgChart annotations.
  const memberCountByDept = useMemo(() => {
    const m: Record<string, number> = {}
    for (const d of depts ?? []) m[d.id] = d.memberCount
    return m
  }, [depts])
  const recordCountByDept = useMemo(() => {
    const m: Record<string, number> = {}
    for (const d of depts ?? []) m[d.id] = d.recordCount
    return m
  }, [depts])

  // Total counts for the header sub-line. Counts only `team` rows for the
  // "X teams" stat — those are the units with backing workspaces. Pure
  // department / division boxes don't carry memory.
  const totals = useMemo(() => {
    const list = depts ?? []
    const teams = list.filter((d) => d.kind === 'team').length
    const members = list.reduce((acc, d) => acc + (d.memberCount ?? 0), 0)
    const records = list.reduce((acc, d) => acc + (d.recordCount ?? 0), 0)
    return { depts: list.length, teams, members, records }
  }, [depts])

  if (!hasHydratedStore) {
    return (
      <div className="mem-page-wrap">
        <div className="mem-page" style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
          <Loader2 className="animate-spin" size={20} style={{ color: 'var(--ink-3)' }} />
        </div>
      </div>
    )
  }
  if (!activeEnterpriseOrgId || !activeOrg) {
    return (
      <div className="mem-page-wrap">
        <div className="mem-page">
          <div className="mem-empty">
            <Building2 size={32} style={{ display: 'block', margin: '0 auto 12px', color: 'var(--ink-4)' }} />
            <p>Select an organization to see its hierarchy.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mem-page-wrap">
      <div className="mem-page">
        <span className="mem-crumb"><Network size={9} strokeWidth={2} /> Hierarchy</span>

        <div className="mem-head-row">
          <div className="mem-head">
            <h1>{activeOrg.orgName}</h1>
            <div className="sub">
              {loading
                ? 'Loading…'
                : err
                  ? <span style={{ color: 'var(--mem-rose)' }}>{err}</span>
                  : (
                    <>
                      <b>{totals.teams.toLocaleString()}</b> team{totals.teams === 1 ? '' : 's'} · <b>{totals.depts.toLocaleString()}</b> department{totals.depts === 1 ? '' : 's'} · <b>{totals.members.toLocaleString()}</b> member{totals.members === 1 ? '' : 's'} · <b>{totals.records.toLocaleString()}</b> memor{totals.records === 1 ? 'y' : 'ies'}
                    </>
                  )}
            </div>
          </div>
          {(activeOrg.role === 'super_admin' || activeOrg.role === 'admin') && (
            <Link href={`/app/admin/${activeEnterpriseOrgId}/departments`} className="mem-btn">
              <Building2 size={13} /> Manage in Control Room
            </Link>
          )}
        </div>

        {loading ? (
          <div className="mem-empty"><Loader2 size={20} className="inline animate-spin" /></div>
        ) : err ? (
          <div className="mem-empty">
            <AlertCircle size={20} style={{ color: 'var(--mem-rose)', display: 'block', margin: '0 auto 8px' }} />
            {err}
          </div>
        ) : !depts || depts.length === 0 ? (
          <EmptyState orgId={activeEnterpriseOrgId} canManage={activeOrg.role === 'super_admin' || activeOrg.role === 'admin'} />
        ) : (
          <>
            {/* Visual chart */}
            <div className="hierarchy-canvas">
              <OrgChart
                departments={depts}
                memberCountByDept={memberCountByDept}
                recordCountByDept={recordCountByDept}
                onNodeClick={(deptId) => router.push(`/app/wiki?tab=hierarchy&deptId=${deptId}`)}
              />
            </div>

            {/* Linear roll-up for accessibility / print */}
            <div className="mem-import-banner" style={{ marginTop: 16, background: 'oklch(0.985 0.005 85)' }}>
              <div className="ic">
                <Users size={14} strokeWidth={1.8} />
              </div>
              <div className="body">
                Click any node to jump to that team in Wiki — see members, recent records, decisions, and the auto-generated summary.
              </div>
            </div>

            <div className="hierarchy-list">
              <div className="mem-sec-head" style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-3)', fontWeight: 600, margin: '22px 0 10px' }}>
                Linear roll-up
              </div>
              {flattenForList(depts).map((d) => (
                <Link
                  key={d.id}
                  href={`/app/wiki?tab=hierarchy&deptId=${d.id}`}
                  className="hierarchy-row"
                  style={{ paddingLeft: 14 + d.depth * 18 }}
                >
                  {d.kind === 'team' ? <Users size={14} strokeWidth={1.7} /> : <Building2 size={14} strokeWidth={1.7} />}
                  <span className="name">{d.name}</span>
                  <span className="kind">{d.kind}</span>
                  <span className="meta">{d.memberCount} member{d.memberCount === 1 ? '' : 's'} · {d.recordCount} memor{d.recordCount === 1 ? 'y' : 'ies'}</span>
                  <ChevronRight size={13} className="chev" />
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function EmptyState({ orgId, canManage }: { orgId: string; canManage: boolean }) {
  return (
    <div className="mem-empty" style={{ padding: 60 }}>
      <Building2 size={36} style={{ display: 'block', margin: '0 auto 12px', color: 'var(--ink-4)' }} />
      <p style={{ marginBottom: 10 }}>No departments yet.</p>
      {canManage ? (
        <Link href={`/app/admin/${orgId}/departments`} className="mem-btn primary">
          <Building2 size={13} /> Add departments
        </Link>
      ) : (
        <p style={{ fontSize: 12, color: 'var(--ink-4)' }}>Ask your admin to add the org structure.</p>
      )}
    </div>
  )
}

// Flatten the dept tree for the linear roll-up below the chart.
function flattenForList(depts: Dept[]): Array<Dept & { depth: number }> {
  const byParent = new Map<string | null, Dept[]>()
  for (const d of depts) {
    const k = d.parentId || null
    const list = byParent.get(k) || []
    list.push(d)
    byParent.set(k, list)
  }
  const out: Array<Dept & { depth: number }> = []
  function visit(parentId: string | null, depth: number) {
    const kids = (byParent.get(parentId) || []).sort((a, b) => a.name.localeCompare(b.name))
    for (const k of kids) {
      out.push({ ...k, depth })
      visit(k.id, depth + 1)
    }
  }
  visit(null, 0)
  return out
}
