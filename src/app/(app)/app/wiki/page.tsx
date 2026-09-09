'use client'

// The Wiki - the org's living map. Three tabs / lenses:
//   - Hierarchy: dept tree
//   - Topics:    tags / entities
//   - People:    members, with knowledge-at-risk flag on offboarded
//
// New design (Wiki.html): serif h1 ("The living map of <Org>."), filter
// input in the header tools, underline-style tabs with monospace counts,
// 320px tree column + 1fr article column. Tab + selection still live in
// the URL so links are shareable.
//
// Wiring untouched: each tab still owns its own fetch/select; URL params
// (?tab=, ?deptId=, ?topic=, ?person=) drive selection; detail panels
// hit the same endpoints they always did.

import { Suspense, useMemo, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Loader2, Search, Building2, Hash, Users, BookOpen, Sparkles, ArrowRight } from 'lucide-react'
import { useAppStore } from '@/stores/app-store'
import { cn } from '@/lib/utils'
import { HierarchyTab } from './_components/hierarchy-tab'
import { TopicsTab } from './_components/topics-tab'
import { PeopleTab } from './_components/people-tab'
import { DeptDetail } from './_components/dept-detail'
import { TopicDetail } from './_components/topic-detail'
import { PersonDetail } from './_components/person-detail'

type TabKey = 'hierarchy' | 'topics' | 'people'

const TABS: { key: TabKey; label: string; icon: any }[] = [
  { key: 'hierarchy', label: 'Hierarchy', icon: Building2 },
  { key: 'topics', label: 'Topics', icon: Hash },
  { key: 'people', label: 'People', icon: Users },
]

export default function WikiPage() {
  return (
    <Suspense fallback={
      <div className="wiki-page-wrap">
        <div className="wiki-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
          <Loader2 className="animate-spin" size={20} style={{ color: 'var(--ink-3)' }} />
        </div>
      </div>
    }>
      <WikiContent />
    </Suspense>
  )
}

function WikiContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { activeEnterpriseOrgId, enterpriseOrgs, hasHydratedStore } = useAppStore()
  const [query, setQuery] = useState('')

  // Tab counts - each tab calls back with its loaded count so the tab strip
  // can show ("Hierarchy 14"). Stored in a single map keyed by tab.
  const [counts, setCounts] = useState<Partial<Record<TabKey, number>>>({})

  const tab = (searchParams.get('tab') as TabKey) || 'hierarchy'
  const deptId = searchParams.get('deptId')
  const topicSlug = searchParams.get('topic')
  const personId = searchParams.get('person')

  const activeOrgName = useMemo(() => {
    return enterpriseOrgs.find((o) => o.orgId === activeEnterpriseOrgId)?.orgName || 'your organization'
  }, [enterpriseOrgs, activeEnterpriseOrgId])

  const setTab = (next: TabKey) => {
    const params = new URLSearchParams()
    params.set('tab', next)
    router.replace(`/app/wiki?${params.toString()}`)
  }

  const setSelection = (kind: 'dept' | 'topic' | 'person', key: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)
    ;['deptId', 'topic', 'person'].forEach((p) => params.delete(p))
    if (key) {
      if (kind === 'dept') params.set('deptId', key)
      if (kind === 'topic') params.set('topic', key)
      if (kind === 'person') params.set('person', key)
    }
    router.replace(`/app/wiki?${params.toString()}`)
  }

  if (!hasHydratedStore) {
    return (
      <div className="wiki-page-wrap">
        <div className="wiki-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
          <Loader2 className="animate-spin" size={20} style={{ color: 'var(--ink-3)' }} />
        </div>
      </div>
    )
  }

  if (!activeEnterpriseOrgId) {
    return (
      <div className="wiki-page-wrap">
        <div className="wiki-page">
          <div className="wiki-empty" style={{ marginTop: 40 }}>
            <BookOpen size={32} style={{ display: 'block', margin: '0 auto 12px', color: 'var(--ink-4)' }} />
            <p>Select an organization to open its wiki.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="wiki-page-wrap">
      <div className="wiki-page">
        <span className="wiki-crumb">
          <BookOpen size={9} strokeWidth={2} /> Wiki
        </span>

        <div className="wiki-head">
          <div>
            <h1>The living map of <span className="accent">{activeOrgName}</span>.</h1>
            <p className="sub">
              Every department, topic, and person - auto-summarized from the memories the AI has captured. Nothing here is hand-written; everything stays in sync as the org changes.
            </p>
          </div>
          <div className="wiki-head-tools">
            <div className="wiki-filter-input">
              <Search size={13} strokeWidth={1.8} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter within tab…"
              />
            </div>
          </div>
        </div>

        <section className="wiki-intelligence" aria-label="Wiki intelligence map">
          <div className="wiki-intelligence-copy">
            <span><Sparkles size={12} /> Continuously synthesized</span>
            <b>One corpus. Three ways to understand it.</b>
            <small>The map updates as new meetings, decisions, and notes enter organizational memory.</small>
          </div>
          <div className="wiki-map-mini" aria-hidden="true">
            {TABS.map((item, index) => {
              const Icon = item.icon
              return (
                <div key={item.key} className={cn('wiki-map-node', tab === item.key && 'active')}>
                  <Icon size={14} />
                  <span>{item.label}<small>{counts[item.key] == null ? 'live index' : `${counts[item.key]} indexed`}</small></span>
                  {index < TABS.length - 1 && <ArrowRight size={11} className="wiki-map-arrow" />}
                </div>
              )
            })}
          </div>
        </section>

        <div className="wiki-tabs" role="tablist">
          {TABS.map((t) => {
            const Icon = t.icon
            const active = tab === t.key
            const count = counts[t.key]
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn('wiki-tab', active && 'active')}
                role="tab"
                aria-selected={active}
              >
                <Icon size={14} strokeWidth={1.8} />
                {t.label}
                {count != null && <span className="count">{count.toLocaleString()}</span>}
              </button>
            )
          })}
        </div>

        <div className="wiki-layout">
          {/* Tree / list column */}
          <div>
            {tab === 'hierarchy' && (
              <HierarchyTab
                orgId={activeEnterpriseOrgId}
                selectedDeptId={deptId}
                onSelect={(id) => setSelection('dept', id)}
                filter={query}
                onCount={(n) => setCounts((c) => ({ ...c, hierarchy: n }))}
              />
            )}
            {tab === 'topics' && (
              <TopicsTab
                orgId={activeEnterpriseOrgId}
                selectedTopic={topicSlug}
                onSelect={(slug) => setSelection('topic', slug)}
                filter={query}
                onCount={(n) => setCounts((c) => ({ ...c, topics: n }))}
              />
            )}
            {tab === 'people' && (
              <PeopleTab
                orgId={activeEnterpriseOrgId}
                selectedPerson={personId}
                onSelect={(id) => setSelection('person', id)}
                filter={query}
                onCount={(n) => setCounts((c) => ({ ...c, people: n }))}
              />
            )}
          </div>

          {/* Article column */}
          <div className="min-w-0">
            {tab === 'hierarchy' && deptId && <DeptDetail deptId={deptId} orgName={activeOrgName} />}
            {tab === 'topics' && topicSlug && <TopicDetail orgId={activeEnterpriseOrgId} topic={topicSlug} orgName={activeOrgName} />}
            {tab === 'people' && personId && <PersonDetail orgId={activeEnterpriseOrgId} userId={personId} orgName={activeOrgName} />}
            {!deptId && !topicSlug && !personId && (
              <EmptyDetail tab={tab} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function EmptyDetail({ tab }: { tab: TabKey }) {
  const copy = {
    hierarchy: 'Pick a department on the left to see its auto-generated summary, recent records, members, and decisions.',
    topics: 'Pick a topic on the left to see every record across the org that touches it, grouped by department.',
    people: 'Pick a person on the left to see their records, decisions, and knowledge-at-risk status if offboarded.',
  }[tab]
  return (
    <div className="wiki-empty">
      <div className="wiki-empty-map" aria-hidden="true">
        <span className="wiki-orbit orbit-one" />
        <span className="wiki-orbit orbit-two" />
        <span className="wiki-map-core"><Sparkles size={18} /></span>
        <span className="wiki-map-dot dot-one" />
        <span className="wiki-map-dot dot-two" />
        <span className="wiki-map-dot dot-three" />
      </div>
      <p>{copy}</p>
    </div>
  )
}
