'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Building2, Users, Network, ScrollText, Gauge, Settings, Sparkles, Gavel,
  Briefcase, Layers, Shield, ArrowRightLeft, ShieldCheck, UserPlus,
  GraduationCap, Megaphone, LineChart, FileScan, Chrome, ChevronDown,
} from 'lucide-react'
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

// ── Sidebar structure (Sprint O Control Room refresh) ──────────────────────
// Switched from a horizontal tab strip with overflow-scroll to a vertical
// sidebar with two collapsible groups: Organogram (people-shaped admin
// surfaces) and Knowledge Transfer (continuity surfaces). Everything else
// stays flat. Each group auto-expands when the active route is one of its
// children — manual toggle persists across re-renders.

interface Leaf {
  type: 'leaf'
  key: string
  label: string
  icon: typeof Gauge
  path: string  // sub-path under /app/admin/<orgId>
}

interface Group {
  type: 'group'
  key: string
  label: string
  icon: typeof Gauge
  children: Leaf[]
}

type NavItem = Leaf | Group

const NAV: NavItem[] = [
  { type: 'leaf', key: 'overview',     label: 'Overview',     icon: Gauge,         path: '' },
  { type: 'leaf', key: 'analytics',    label: 'Analytics',    icon: LineChart,     path: '/analytics' },
  {
    type: 'group',
    key: 'organogram',
    label: 'Organogram',
    icon: Network,
    children: [
      { type: 'leaf', key: 'departments', label: 'Departments', icon: Network,    path: '/departments' },
      { type: 'leaf', key: 'members',     label: 'Members',     icon: Users,      path: '/members' },
      { type: 'leaf', key: 'taxonomy',    label: 'Taxonomy',    icon: Layers,     path: '/taxonomy' },
      { type: 'leaf', key: 'roles',       label: 'Roles',       icon: Briefcase,  path: '/roles' },
    ],
  },
  {
    type: 'group',
    key: 'knowledge-transfer',
    label: 'Knowledge Transfer',
    icon: ArrowRightLeft,
    children: [
      { type: 'leaf', key: 'transfers',        label: 'Transfers',       icon: ArrowRightLeft, path: '/transfers' },
      { type: 'leaf', key: 'exit-interviews',  label: 'Exit interviews', icon: GraduationCap,  path: '/exit-interviews' },
      { type: 'leaf', key: 'handoff',          label: 'Handoffs',        icon: ArrowRightLeft, path: '/handoff' },
      { type: 'leaf', key: 'onboarding-genie', label: 'Genie',           icon: UserPlus,       path: '/onboarding-genie' },
    ],
  },
  { type: 'leaf', key: 'decisions',     label: 'Decisions',     icon: Gavel,        path: '/decisions' },
  { type: 'leaf', key: 'ocr',           label: 'OCR',           icon: FileScan,     path: '/ocr' },
  { type: 'leaf', key: 'extension',     label: 'Extension',     icon: Chrome,       path: '/extension' },
  { type: 'leaf', key: 'health',        label: 'Self-healing',  icon: Sparkles,     path: '/health' },
  { type: 'leaf', key: 'audit',         label: 'Audit log',     icon: ScrollText,   path: '/audit' },
  { type: 'leaf', key: 'compliance',    label: 'Compliance',    icon: ShieldCheck,  path: '/compliance' },
  { type: 'leaf', key: 'announcements', label: 'Announcements', icon: Megaphone,    path: '/announcements' },
  { type: 'leaf', key: 'sso',           label: 'SSO',           icon: Shield,       path: '/sso' },
  { type: 'leaf', key: 'settings',      label: 'Settings',      icon: Settings,     path: '/settings' },
]

function findActiveKey(pathname: string, base: string): string {
  const rest = pathname.replace(base, '')
  if (!rest || rest === '/') return 'overview'
  const seg = '/' + rest.replace(/^\//, '').split('/')[0]
  for (const item of NAV) {
    if (item.type === 'leaf' && item.path === seg) return item.key
    if (item.type === 'group') {
      for (const c of item.children) if (c.path === seg) return c.key
    }
  }
  return 'overview'
}

function findActiveGroup(activeKey: string): string | null {
  for (const item of NAV) {
    if (item.type === 'group' && item.children.some((c) => c.key === activeKey)) {
      return item.key
    }
  }
  return null
}

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

  const base = `/app/admin/${orgId}`
  const activeKey = useMemo(() => findActiveKey(pathname, base), [pathname, base])
  const activeGroup = useMemo(() => findActiveGroup(activeKey), [activeKey])

  // Each group's open/closed state. A group auto-opens when one of its
  // children is the active route; manual toggle by the user is preserved
  // across renders by tracking explicit toggles separately from auto-opens.
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})
  // When the active group changes (route navigation), make sure it's open.
  useEffect(() => {
    if (activeGroup) {
      setOpenGroups((prev) => (prev[activeGroup] ? prev : { ...prev, [activeGroup]: true }))
    }
  }, [activeGroup])

  function isOpen(groupKey: string): boolean {
    if (groupKey in openGroups) return openGroups[groupKey]
    return groupKey === activeGroup
  }

  function toggleGroup(groupKey: string) {
    setOpenGroups((prev) => ({ ...prev, [groupKey]: !isOpen(groupKey) }))
  }

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

  return (
    <div className="max-w-7xl mx-auto w-full">
      {/* Header — org identity + plan/deployment pills */}
      <div className="border-b border-border pb-4 mb-6">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-2">
          <Building2 className="h-3.5 w-3.5" />
          <span>Enterprise admin</span>
        </div>
        {error && <div className="text-sm text-destructive">{error}</div>}
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

      {/* Two-column body — vertical sidebar nav + content */}
      <div className="flex gap-8 items-start">
        {/* Sidebar */}
        <nav className="hidden md:flex shrink-0 w-[220px] flex-col gap-0.5 sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto pr-2">
          {NAV.map((item) => {
            if (item.type === 'leaf') {
              return (
                <NavLeaf key={item.key} item={item} base={base} active={activeKey === item.key} />
              )
            }
            return (
              <NavGroup
                key={item.key}
                item={item}
                base={base}
                activeKey={activeKey}
                open={isOpen(item.key)}
                onToggle={() => toggleGroup(item.key)}
              />
            )
          })}
        </nav>

        {/* Mobile select fallback — vertical sidebar is hidden on small
            screens; users navigate via a single dropdown that flattens the
            tree. Keeps every surface reachable without a nav list eating
            two-thirds of the viewport. */}
        <div className="md:hidden mb-4 w-full">
          <select
            value={activeKey}
            onChange={(e) => {
              const next = e.target.value
              const leaf = NAV.flatMap((n) => (n.type === 'leaf' ? [n] : n.children)).find((l) => l.key === next)
              if (leaf) window.location.assign(`${base}${leaf.path}`)
            }}
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            {NAV.map((item) => {
              if (item.type === 'leaf') {
                return <option key={item.key} value={item.key}>{item.label}</option>
              }
              return (
                <optgroup key={item.key} label={item.label}>
                  {item.children.map((c) => (
                    <option key={c.key} value={c.key}>{c.label}</option>
                  ))}
                </optgroup>
              )
            })}
          </select>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  )
}

function NavLeaf({ item, base, active }: { item: Leaf; base: string; active: boolean }) {
  const Icon = item.icon
  return (
    <Link
      href={`${base}${item.path}`}
      className={cn(
        'flex items-center gap-2.5 rounded-md px-3 py-1.5 text-[13px] transition-colors',
        active
          ? 'bg-primary/10 text-primary font-semibold'
          : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{item.label}</span>
    </Link>
  )
}

function NavGroup({
  item, base, activeKey, open, onToggle,
}: {
  item: Group
  base: string
  activeKey: string
  open: boolean
  onToggle: () => void
}) {
  const Icon = item.icon
  const childActive = item.children.some((c) => c.key === activeKey)
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'w-full flex items-center gap-2.5 rounded-md px-3 py-1.5 text-[13px] transition-colors',
          childActive
            ? 'text-foreground font-semibold'
            : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
        )}
        aria-expanded={open}
      >
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate flex-1 text-left">{item.label}</span>
        <ChevronDown
          className={cn(
            'h-3 w-3 shrink-0 transition-transform',
            open ? 'rotate-0' : '-rotate-90',
          )}
        />
      </button>
      {open && (
        <div className="ml-4 mt-0.5 mb-1 flex flex-col gap-0.5 border-l border-border/60 pl-2">
          {item.children.map((c) => {
            const ChildIcon = c.icon
            const active = activeKey === c.key
            return (
              <Link
                key={c.key}
                href={`${base}${c.path}`}
                className={cn(
                  'flex items-center gap-2.5 rounded-md px-3 py-1.5 text-[13px] transition-colors',
                  active
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                )}
              >
                <ChildIcon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{c.label}</span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
