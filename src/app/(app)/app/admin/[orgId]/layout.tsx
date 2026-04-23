'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Building2, Users, Network, ScrollText, Gauge, Settings, Sparkles, Gavel, Briefcase, Layers, Shield, ArrowRightLeft, ShieldCheck, UserPlus, GraduationCap, Megaphone, LineChart } from 'lucide-react'
import { cn } from '@/lib/utils'

interface OrgMeta {
  id: string
  name: string
  slug: string
  plan: string
  deployment: string
  status: string
  primaryDomain: string | null
}

const TABS = [
  { key: 'overview', label: 'Overview', icon: Gauge, path: '' },
  { key: 'analytics', label: 'Analytics', icon: LineChart, path: '/analytics' },
  { key: 'members', label: 'Members', icon: Users, path: '/members' },
  { key: 'announcements', label: 'Announcements', icon: Megaphone, path: '/announcements' },
  { key: 'departments', label: 'Departments', icon: Network, path: '/departments' },
  { key: 'roles', label: 'Roles', icon: Briefcase, path: '/roles' },
  { key: 'decisions', label: 'Decisions', icon: Gavel, path: '/decisions' },
  { key: 'transfers', label: 'Transfers', icon: ArrowRightLeft, path: '/transfers' },
  { key: 'exit-interviews', label: 'Exit interviews', icon: GraduationCap, path: '/exit-interviews' },
  { key: 'handoff', label: 'Handoff', icon: ArrowRightLeft, path: '/handoff' },
  { key: 'onboarding-genie', label: 'Genie', icon: UserPlus, path: '/onboarding-genie' },
  { key: 'health', label: 'Self-healing', icon: Sparkles, path: '/health' },
  { key: 'audit', label: 'Audit log', icon: ScrollText, path: '/audit' },
  { key: 'compliance', label: 'Compliance', icon: ShieldCheck, path: '/compliance' },
  { key: 'taxonomy', label: 'Taxonomy', icon: Layers, path: '/taxonomy' },
  { key: 'sso', label: 'SSO', icon: Shield, path: '/sso' },
  { key: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
]

export default function AdminOrgLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { orgId: string }
}) {
  const { orgId } = params
  const pathname = usePathname()
  const [org, setOrg] = useState<OrgMeta | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/enterprise/organizations/${orgId}`)
        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: 'request failed' }))
          throw new Error(body.error || 'request failed')
        }
        const data = await res.json()
        if (!cancelled) setOrg(data.organization)
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [orgId])

  const base = `/app/admin/${orgId}`
  const activeTab = (() => {
    const rest = pathname.replace(base, '')
    if (!rest || rest === '/') return 'overview'
    const seg = rest.replace(/^\//, '').split('/')[0]
    const match = TABS.find((t) => t.path === `/${seg}`)
    return match?.key || 'overview'
  })()

  return (
    <div className="max-w-6xl mx-auto w-full">
      <div className="border-b border-border pb-4 mb-6">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-2">
          <Building2 className="h-3.5 w-3.5" />
          <span>Enterprise admin</span>
        </div>
        {error && (
          <div className="text-sm text-destructive">{error}</div>
        )}
        {org && (
          <div className="flex items-baseline gap-3 flex-wrap">
            <h1 className="font-display text-4xl tracking-tight leading-none">{org.name}</h1>
            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-muted text-muted-foreground">{org.plan}</span>
            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-muted text-muted-foreground">
              {org.deployment.replace('_', ' ')}
            </span>
            {org.primaryDomain && (
              <span className="text-xs text-muted-foreground font-mono">@{org.primaryDomain}</span>
            )}
          </div>
        )}
      </div>

      <nav className="flex gap-1 border-b border-border mb-6 overflow-x-auto">
        {TABS.map((t) => {
          const Icon = t.icon
          const href = `${base}${t.path}`
          const active = activeTab === t.key
          return (
            <Link
              key={t.key}
              href={href}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 -mb-px transition-colors',
                active
                  ? 'border-primary text-foreground font-medium'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </Link>
          )
        })}
      </nav>

      <div>{children}</div>
    </div>
  )
}
