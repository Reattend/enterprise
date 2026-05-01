'use client'

// Control Room layout — sidebar with org header + nav, main page area on
// the right. The sidebar mirrors the dashboard rail visually but shows
// the org name in serif at the top + plan/deployment pills + email/seats,
// then the same Overview / Analytics / Organogram / Knowledge Transfer
// nav tree we had before. Mobile gets a flat <select> fallback.
//
// All wiring is unchanged: same `/api/enterprise/organizations/:orgId`
// fetch, same NAV constants, same active-route detection. Only the
// chrome and the layout shell changed.

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Building2, Users, Network, ScrollText, Gauge, Settings, Sparkles, Gavel,
  Briefcase, Layers, Shield, ArrowRightLeft, ShieldCheck, UserPlus,
  GraduationCap, Megaphone, LineChart, FileScan, Chrome, ChevronRight,
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
  seatsUsed?: number
  seatsTotal?: number
}

interface Leaf {
  type: 'leaf'
  key: string
  label: string
  icon: typeof Gauge
  path: string
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
  { type: 'leaf', key: 'ocr',           label: 'OCR & ingest',  icon: FileScan,     path: '/ocr' },
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

  const base = `/app/admin/${orgId}`
  const activeKey = useMemo(() => findActiveKey(pathname, base), [pathname, base])
  const activeGroup = useMemo(() => findActiveGroup(activeKey), [activeKey])

  // Per-group open state. Auto-opens when a child route is active; user
  // toggles persist after that.
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})
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
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled) setOrg(data.organization)
      } catch { /* silent */ }
    })()
    return () => { cancelled = true }
  }, [orgId])

  return (
    <div className="cr-shell">
      {/* Sidebar */}
      <aside className="cr-rail">
        <div className="cr-org">
          <div className="crumb"><Building2 size={12} strokeWidth={1.8} /> Enterprise admin</div>
          <div className="cr-org-name">
            {org?.name || ' '}
          </div>
          {org && (
            <div className="cr-org-pills">
              <span className="cr-org-pill">{org.plan}</span>
              <span className="cr-org-pill">{org.deployment.replace('_', ' ')}</span>
            </div>
          )}
          {org?.primaryDomain && (
            <div className="cr-org-meta">
              @{org.primaryDomain}
              {org.seatsUsed != null && org.seatsTotal != null && (
                <> · {org.seatsUsed}/{org.seatsTotal} seats</>
              )}
            </div>
          )}
        </div>

        <nav className="cr-nav">
          {NAV.map((item) => {
            if (item.type === 'leaf') {
              return <NavLeaf key={item.key} item={item} base={base} active={activeKey === item.key} />
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
      </aside>

      {/* Mobile select fallback (shown <900px) */}
      <div className="cr-mobile-select">
        <select
          value={activeKey}
          onChange={(e) => {
            const next = e.target.value
            const leaf = NAV.flatMap((n) => (n.type === 'leaf' ? [n] : n.children)).find((l) => l.key === next)
            if (leaf) window.location.assign(`${base}${leaf.path}`)
          }}
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

      {/* Page area */}
      <div className="cr-page-wrap">
        <div className="cr-page">
          {children}
        </div>
      </div>
    </div>
  )
}

function NavLeaf({ item, base, active }: { item: Leaf; base: string; active: boolean }) {
  const Icon = item.icon
  return (
    <Link
      href={`${base}${item.path}`}
      className={cn('cr-nav-item', active && 'active')}
    >
      <Icon className="ico" />
      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {item.label}
      </span>
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
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="cr-nav-item"
        aria-expanded={open}
      >
        <Icon className="ico" />
        <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>{item.label}</span>
        <ChevronRight className={cn('chev', open && 'open')} />
      </button>
      {open && (
        <div className="cr-nav-children">
          {item.children.map((c) => {
            const ChildIcon = c.icon
            const active = activeKey === c.key
            return (
              <Link
                key={c.key}
                href={`${base}${c.path}`}
                className={cn('cr-nav-item', active && 'active')}
              >
                <ChildIcon className="ico" />
                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.label}
                </span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
