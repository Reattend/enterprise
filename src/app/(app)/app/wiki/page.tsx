'use client'

// The Wiki — the org's knowledge surface in three lenses:
//   - Hierarchy: browse by organizational unit (dept tree)
//   - Topics:    browse by tag / entity
//   - People:    browse by member, with "knowledge at risk" flag on offboarded
//
// This page is the shell + three tabs. Each tab renders its own list; clicking
// an item opens a detail view in a side panel. Tab + selection live in the URL
// so links are shareable (?tab=hierarchy&deptId=xxx).

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Building2,
  Hash,
  Users,
  Loader2,
  BookOpen,
  Search,
  ChevronRight,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useAppStore } from '@/stores/app-store'
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
    <Suspense fallback={<div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}>
      <WikiContent />
    </Suspense>
  )
}

function WikiContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { activeEnterpriseOrgId, enterpriseOrgs, hasHydratedStore } = useAppStore()
  const [query, setQuery] = useState('')

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
    return <div className="py-20 flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
  }

  if (!activeEnterpriseOrgId) {
    return (
      <div className="py-20 text-center">
        <BookOpen className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Select an organization to open its wiki.</p>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5 max-w-[1400px]"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" /> Wiki
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            The living map of {activeOrgName}. Summaries auto-generated from your memories.
          </p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter within tab…"
            className="pl-8 h-9 text-sm"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b">
        {TABS.map((t) => {
          const Icon = t.icon
          const active = tab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`relative flex items-center gap-2 px-4 py-2.5 text-sm transition-colors ${
                active ? 'text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
              {active && <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-t" />}
            </button>
          )
        })}
      </div>

      {/* Main two-pane layout: list on left, detail on right. On small screens detail flows below. */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] gap-5">
        <div className="min-w-0">
          {tab === 'hierarchy' && (
            <HierarchyTab
              orgId={activeEnterpriseOrgId}
              selectedDeptId={deptId}
              onSelect={(id) => setSelection('dept', id)}
              filter={query}
            />
          )}
          {tab === 'topics' && (
            <TopicsTab
              orgId={activeEnterpriseOrgId}
              selectedTopic={topicSlug}
              onSelect={(slug) => setSelection('topic', slug)}
              filter={query}
            />
          )}
          {tab === 'people' && (
            <PeopleTab
              orgId={activeEnterpriseOrgId}
              selectedPerson={personId}
              onSelect={(id) => setSelection('person', id)}
              filter={query}
            />
          )}
        </div>
        <div className="min-w-0">
          {tab === 'hierarchy' && deptId && <DeptDetail deptId={deptId} />}
          {tab === 'topics' && topicSlug && <TopicDetail orgId={activeEnterpriseOrgId} topic={topicSlug} />}
          {tab === 'people' && personId && <PersonDetail orgId={activeEnterpriseOrgId} userId={personId} />}
          {!deptId && !topicSlug && !personId && (
            <EmptyDetail tab={tab} />
          )}
        </div>
      </div>
    </motion.div>
  )
}

function EmptyDetail({ tab }: { tab: TabKey }) {
  const copy = {
    hierarchy: 'Pick a department to see its auto-generated summary, recent records, members, and decisions.',
    topics: 'Pick a topic to see every record across the org that touches it, grouped by department.',
    people: 'Pick a person to see their records, decisions, and knowledge-at-risk status if offboarded.',
  }[tab]
  return (
    <div className="rounded-2xl border bg-card/50 p-8 text-center">
      <ChevronRight className="h-5 w-5 text-muted-foreground mx-auto mb-3" />
      <p className="text-sm text-muted-foreground">{copy}</p>
    </div>
  )
}
