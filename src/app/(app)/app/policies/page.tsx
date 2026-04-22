'use client'

// Policies list — every org policy with the current user's ack state.
// Pending policies float to the top; acknowledged drop below.

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  FileText,
  Check,
  Clock,
  AlertCircle,
  Search,
  Plus,
  Shield,
  Plane,
  Landmark,
  Laptop,
  Sparkles,
  Info,
  Users,
  Loader2,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/stores/app-store'
import { EmptyState } from '@/components/ui/empty-state'

type AckState = 'pending' | 'acknowledged' | 'not_subject' | 'not_applicable'

type PolicyListItem = {
  id: string
  title: string
  slug: string
  category: string | null
  iconName: string | null
  status: 'draft' | 'published' | 'archived'
  effectiveDate: string | null
  applicability: { allOrg: boolean; departments: string[]; roles: string[]; users: string[] }
  currentVersion: {
    id: string
    versionNumber: number
    title: string
    summary: string | null
    publishedAt: string | null
  } | null
  ackState: AckState
}

const categoryIcon: Record<string, any> = {
  security: Shield,
  travel: Plane,
  hr: Users,
  finance: Landmark,
  it: Laptop,
  compliance: FileText,
}

export default function PoliciesPage() {
  const { activeEnterpriseOrgId, hasHydratedStore } = useAppStore()
  const [policies, setPolicies] = useState<PolicyListItem[] | null>(null)
  const [canAuthor, setCanAuthor] = useState(false)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  const fetchPolicies = async () => {
    if (!activeEnterpriseOrgId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/enterprise/policies?orgId=${activeEnterpriseOrgId}`)
      if (!res.ok) { setPolicies([]); return }
      const data = await res.json()
      setPolicies(data.policies || [])
      setCanAuthor(!!data.canAuthor)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPolicies()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeEnterpriseOrgId])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = policies || []
    const matched = !q ? list : list.filter((p) =>
      p.title.toLowerCase().includes(q) ||
      (p.currentVersion?.summary || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q),
    )
    // Sort: pending → acknowledged → not_subject → not_applicable; archived last
    const order: Record<string, number> = { pending: 0, acknowledged: 1, not_subject: 2, not_applicable: 3 }
    return matched.slice().sort((a, b) => {
      if (a.status === 'archived' && b.status !== 'archived') return 1
      if (b.status === 'archived' && a.status !== 'archived') return -1
      return (order[a.ackState] ?? 9) - (order[b.ackState] ?? 9)
    })
  }, [policies, query])

  const pendingCount = (policies || []).filter((p) => p.ackState === 'pending').length

  // Wait for client hydration before branching on localStorage-backed state.
  // Without this, server renders the "Select an org" branch while client
  // renders the full page → hydration mismatch.
  if (!hasHydratedStore) {
    return (
      <div className="py-20 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!activeEnterpriseOrgId) {
    return (
      <div className="py-20 text-center">
        <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Select an organization to see its policies.</p>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5 max-w-5xl"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" /> Policies
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {pendingCount > 0 ? (
              <span className="text-yellow-700 dark:text-yellow-400 font-medium">
                {pendingCount} pending your acknowledgment
              </span>
            ) : (
              'All policies acknowledged.'
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search policies…"
              className="pl-8 h-9 text-sm"
            />
          </div>
          {canAuthor && (
            <Button size="sm" asChild>
              <Link href={`/app/admin/${activeEnterpriseOrgId}/policies/new`}>
                <Plus className="h-3.5 w-3.5 mr-1" /> New policy
              </Link>
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border bg-card p-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading policies…
        </div>
      ) : filtered.length === 0 ? (
        policies && policies.length === 0 ? (
          canAuthor ? (
            <EmptyState
              icon={FileText}
              title="No policies authored yet"
              description="Policies are the rules of your org — ones everyone should know and acknowledge. Author one, publish it, and members will see an ack prompt on Home."
              action={{
                label: 'Author first policy',
                href: `/app/admin/${activeEnterpriseOrgId}/policies/new`,
              }}
            />
          ) : (
            <EmptyState
              icon={FileText}
              title="No policies yet"
              description="Your admins haven't published any policies to acknowledge. When they do, you'll see them here with a one-click ack button."
              tone="muted"
            />
          )
        ) : (
          <EmptyState
            icon={Search}
            title="No policies match your search"
            description="Try a different keyword or clear the search box."
            tone="muted"
          />
        )
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => {
            const Icon = p.iconName && categoryIcon[p.iconName] ? categoryIcon[p.iconName]
              : p.category && categoryIcon[p.category] ? categoryIcon[p.category]
              : FileText
            return (
              <Link
                key={p.id}
                href={`/app/policies/${p.id}`}
                className="block rounded-2xl border bg-card p-4 hover:shadow-sm hover:border-primary/40 transition-all group"
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'h-10 w-10 rounded-xl flex items-center justify-center shrink-0',
                    p.ackState === 'pending' ? 'bg-yellow-500/10 text-yellow-600'
                    : p.ackState === 'acknowledged' ? 'bg-emerald-500/10 text-emerald-600'
                    : p.status === 'draft' ? 'bg-muted text-muted-foreground'
                    : 'bg-primary/10 text-primary'
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold group-hover:text-primary transition-colors">{p.title}</h3>
                      {p.currentVersion && (
                        <Badge variant="outline" className="text-[10px] h-4 px-1">
                          v{p.currentVersion.versionNumber}
                        </Badge>
                      )}
                      {p.status === 'draft' && (
                        <Badge variant="outline" className="text-[10px] h-4 px-1">Draft</Badge>
                      )}
                      {p.status === 'archived' && (
                        <Badge variant="outline" className="text-[10px] h-4 px-1 text-muted-foreground">Archived</Badge>
                      )}
                      {p.ackState === 'pending' && (
                        <Badge className="text-[10px] gap-1 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-500/10">
                          <Clock className="h-2.5 w-2.5" /> Needs ack
                        </Badge>
                      )}
                      {p.ackState === 'acknowledged' && (
                        <Badge className="text-[10px] gap-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10">
                          <Check className="h-2.5 w-2.5" /> Acknowledged
                        </Badge>
                      )}
                      {p.ackState === 'not_subject' && (
                        <Badge variant="outline" className="text-[10px] h-4 px-1 text-muted-foreground">Not applicable to you</Badge>
                      )}
                    </div>
                    {p.currentVersion?.summary && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.currentVersion.summary}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                      {p.effectiveDate && <span>Effective {new Date(p.effectiveDate).toLocaleDateString()}</span>}
                      {p.category && <span className="capitalize">{p.category}</span>}
                      {p.applicability.allOrg
                        ? <span>Org-wide</span>
                        : <span>{p.applicability.departments.length} dept{p.applicability.departments.length === 1 ? '' : 's'} · {p.applicability.roles.length} role{p.applicability.roles.length === 1 ? '' : 's'}</span>
                      }
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}
