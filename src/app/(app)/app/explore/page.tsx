'use client'

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
  Brain,
  Scale,
  Network,
  GitBranch,
  Zap,
  Loader2,
  FileText,
  Lightbulb,
  Users,
  Mic,
  Flame,
  CircleCheckBig,
  PenLine,
  ArrowRight,
  TrendingUp,
  Hash,
  CalendarClock,
  Check,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartTooltip,
  ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from 'recharts'

type UpcomingDate = {
  id: string
  date: string
  label: string
  type: string
  recordId: string
  recordTitle: string
}

interface StatsData {
  overview: {
    totalRecords: number
    totalProjects: number
    totalNodes: number
    totalConnections: number
    inboxItems: number
  }
  typeCounts: Record<string, number>
  dailyActivity: { date: string; count: number }[]
  topTags: { tag: string; count: number }[]
  recentRecords: {
    id: string
    type: string
    title: string
    summary: string | null
    createdAt: string
  }[]
}

const typeConfig: Record<string, { icon: any; color: string; bg: string; label: string; pieColor: string }> = {
  meeting:    { icon: Users,          color: 'text-blue-500',    bg: 'bg-blue-500/10',    label: 'Meetings',    pieColor: '#3B82F6' },
  insight:    { icon: Lightbulb,      color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: 'Insights',    pieColor: '#10B981' },
  transcript: { icon: Mic,            color: 'text-pink-500',    bg: 'bg-pink-500/10',    label: 'Transcripts', pieColor: '#EC4899' },
  note:       { icon: PenLine,        color: 'text-yellow-500',  bg: 'bg-yellow-500/10',  label: 'Notes',       pieColor: '#F59E0B' },
  idea:       { icon: Flame,          color: 'text-orange-500',  bg: 'bg-orange-500/10',  label: 'Ideas',       pieColor: '#F97316' },
  decision:   { icon: Scale,          color: 'text-violet-500',  bg: 'bg-violet-500/10',  label: 'Decisions',   pieColor: '#8B5CF6' },
  tasklike:   { icon: CircleCheckBig, color: 'text-red-500',     bg: 'bg-red-500/10',     label: 'Tasks',       pieColor: '#EF4444' },
  context:    { icon: FileText,       color: 'text-slate-500',   bg: 'bg-slate-500/10',   label: 'Context',     pieColor: '#64748B' },
}

const STAT_CARDS = [
  {
    key: 'memories',
    label: 'Memories',
    icon: Brain,
    gradient: 'from-[#5B3FBF] via-[#7C5CBF] to-[#9B79E0]',
    href: '/app/memories',
  },
  {
    key: 'decisions',
    label: 'Decisions',
    icon: Scale,
    gradient: 'from-[#2563EB] via-[#3B82F6] to-[#60A5FA]',
    href: '/app/memories?type=decision',
  },
  {
    key: 'entities',
    label: 'Entities',
    icon: Network,
    gradient: 'from-[#059669] via-[#10B981] to-[#34D399]',
    href: '/app/memories',
  },
  {
    key: 'connections',
    label: 'Connections',
    icon: GitBranch,
    gradient: 'from-[#D97706] via-[#F59E0B] to-[#FCD34D]',
    href: '/app/memories',
  },
  {
    key: 'today',
    label: 'Today',
    icon: Zap,
    gradient: 'from-[#BE185D] via-[#EC4899] to-[#F472B6]',
    href: '/app/memories',
  },
]

function formatRelativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatDay(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function CustomPieLegend({ payload }: any) {
  if (!payload) return null
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 justify-center mt-2">
      {payload.map((entry: any) => (
        <div key={entry.value} className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
          <span className="text-[11px] text-muted-foreground">{entry.value}</span>
        </div>
      ))}
    </div>
  )
}

const UPCOMING_TYPE_COLORS: Record<string, string> = {
  deadline: 'bg-red-500/15 text-red-600 dark:text-red-400',
  follow_up: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  due_date: 'bg-orange-500/15 text-orange-600 dark:text-orange-400',
  launch: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  event: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
  reminder: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
}

export default function ExplorePage() {
  const [data, setData] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [upcoming, setUpcoming] = useState<UpcomingDate[]>([])
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(d => { if (!d.error) setData(d) })
      .catch(() => {})
      .finally(() => setLoading(false))

    fetch('/api/dates')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setUpcoming(d) })
      .catch(() => {})
  }, [])

  const markDone = async (id: string) => {
    setDoneIds(prev => new Set(Array.from(prev).concat(id)))
    await fetch('/api/dates', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, done: true }),
    }).catch(() => {})
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/40" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        Failed to load stats
      </div>
    )
  }

  const { overview, typeCounts, dailyActivity, topTags, recentRecords } = data

  const todayStr = new Date().toISOString().slice(0, 10)
  const todayCount = dailyActivity.find(d => d.date === todayStr)?.count ?? 0

  const statValues: Record<string, number> = {
    memories: overview.totalRecords,
    decisions: typeCounts['decision'] ?? 0,
    entities: overview.totalNodes,
    connections: overview.totalConnections,
    today: todayCount,
  }

  // All type breakdown cards
  const allTypes = Object.entries(typeConfig).map(([key, cfg]) => ({
    key,
    ...cfg,
    count: typeCounts[key] ?? 0,
  }))

  // Activity chart: last 14 days
  const activityChartData = dailyActivity.map(d => ({
    date: formatDay(d.date),
    count: d.count,
  }))

  // Pie chart data
  const pieData = Object.entries(typeCounts)
    .filter(([, count]) => count > 0)
    .map(([type, count]) => ({
      name: typeConfig[type]?.label ?? type,
      value: count,
      color: typeConfig[type]?.pieColor ?? '#6B7280',
    }))
    .sort((a, b) => b.value - a.value)

  function statNumClass(val: number) {
    const len = val.toLocaleString().replace(/,/g, '').length
    if (len >= 4) return 'text-xl'
    if (len === 3) return 'text-2xl'
    return 'text-3xl'
  }

  return (
    <div className="flex flex-col gap-5 w-full min-w-0">
      {/* Header */}
      <div className="flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-[#4F46E5]" />
        <h1 className="text-xl font-bold tracking-tight">Explore</h1>
      </div>

      {/* Large Stat Cards */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="grid grid-cols-2 sm:grid-cols-5 gap-3"
      >
        {STAT_CARDS.map((stat, i) => (
          <motion.div
            key={stat.key}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.06 }}
            className={i === STAT_CARDS.length - 1 && STAT_CARDS.length % 2 !== 0 ? 'col-span-2 sm:col-span-1' : ''}
          >
            <Link href={stat.href} className="group block">
              <div className={`relative rounded-2xl bg-gradient-to-br ${stat.gradient} p-4 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity`}>
                {/* Subtle circle decoration */}
                <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10" />
                <div className="absolute -right-1 bottom-2 h-12 w-12 rounded-full bg-white/5" />
                <div className="relative">
                  <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-white/20 mb-3">
                    <stat.icon className="h-4.5 w-4.5 text-white h-5 w-5" />
                  </div>
                  <div className={`${statNumClass(statValues[stat.key])} font-bold text-white tabular-nums leading-tight`}>
                    {statValues[stat.key].toLocaleString()}
                  </div>
                  <div className="text-sm text-white/80 mt-0.5 font-medium">{stat.label}</div>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </motion.div>

      {/* Type Breakdown Row */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="grid grid-cols-4 sm:grid-cols-8 gap-2 min-w-0"
      >
        {allTypes.map(({ key, icon: Icon, color, bg, label, count }) => (
          <Link key={key} href={`/app/memories?type=${key}`} className="group">
            <div className="rounded-xl border border-border/60 bg-background/60 p-3 text-center hover:border-[#4F46E5]/20 hover:shadow-sm transition-all">
              <div className={`inline-flex items-center justify-center h-7 w-7 rounded-lg ${bg} mb-2`}>
                <Icon className={`h-3.5 w-3.5 ${color}`} />
              </div>
              <div className="text-sm font-bold tabular-nums leading-tight">{count.toLocaleString()}</div>
              <div className="text-[9px] sm:text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wide font-medium truncate">{label}</div>
            </div>
          </Link>
        ))}
      </motion.div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Activity Chart */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="lg:col-span-2 rounded-2xl border border-border/60 bg-background/60 p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold tracking-tight">Activity — Last 14 Days</p>
            <span className="text-xs text-muted-foreground">Memories created</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={activityChartData} barSize={18} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                axisLine={false}
                tickLine={false}
                interval={1}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                axisLine={false}
                tickLine={false}
              />
              <RechartTooltip
                contentStyle={{
                  background: 'var(--background)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  fontSize: 12,
                }}
                cursor={{ fill: 'rgba(79,70,229,0.08)' }}
              />
              <Bar dataKey="count" name="Memories" radius={[4, 4, 0, 0]}>
                {activityChartData.map((entry, i) => (
                  <Cell key={i} fill={entry.count > 0 ? '#4F46E5' : '#4F46E525'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Memory Types Donut */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="rounded-2xl border border-border/60 bg-background/60 p-5"
        >
          <p className="text-sm font-semibold tracking-tight mb-3">Memory Types</p>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="45%"
                  innerRadius={52}
                  outerRadius={78}
                  paddingAngle={2}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Legend content={<CustomPieLegend />} />
                <RechartTooltip
                  contentStyle={{
                    background: 'var(--background)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">No data yet</div>
          )}
        </motion.div>
      </div>

      {/* Upcoming / Todo */}
      {upcoming.filter(d => !doneIds.has(d.id)).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.18 }}
          className="rounded-2xl border border-border/60 bg-background/60 overflow-hidden"
        >
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40">
            <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm font-semibold tracking-tight">Upcoming</span>
          </div>
          <div className="divide-y divide-border/30">
            {upcoming.filter(d => !doneIds.has(d.id)).slice(0, 8).map(d => {
              const dateObj = new Date(d.date + 'T00:00:00')
              const today = new Date(); today.setHours(0, 0, 0, 0)
              const diffDays = Math.round((dateObj.getTime() - today.getTime()) / 86400000)
              const dateLabel = diffDays === 0 ? 'Today'
                : diffDays === 1 ? 'Tomorrow'
                : diffDays <= 6 ? dateObj.toLocaleDateString('en', { weekday: 'short' })
                : dateObj.toLocaleDateString('en', { month: 'short', day: 'numeric' })
              const isUrgent = diffDays <= 1
              return (
                <div key={d.id} className="flex items-center gap-3 px-4 py-2.5 group hover:bg-muted/20 transition-colors">
                  <button
                    onClick={() => markDone(d.id)}
                    className="h-4 w-4 shrink-0 rounded border border-border/60 hover:border-primary hover:bg-primary/10 flex items-center justify-center transition-colors"
                  >
                    <Check className="h-2.5 w-2.5 text-primary opacity-0 group-hover:opacity-60 transition-opacity" />
                  </button>
                  <span className={cn(
                    'text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0',
                    isUrgent ? 'bg-red-500/15 text-red-600 dark:text-red-400' : 'bg-muted/60 text-muted-foreground'
                  )}>
                    {dateLabel}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{d.label}</p>
                    <Link href={`/app/memories/${d.recordId}`} className="text-[10px] text-muted-foreground/60 hover:text-primary truncate block transition-colors">
                      {d.recordTitle}
                    </Link>
                  </div>
                  <span className={cn('text-[10px] px-1.5 py-0.5 rounded shrink-0', UPCOMING_TYPE_COLORS[d.type] || UPCOMING_TYPE_COLORS.reminder)}>
                    {d.type.replace('_', ' ')}
                  </span>
                </div>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Memories */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="lg:col-span-2 rounded-2xl border border-border/60 bg-background/60 p-5 flex flex-col"
        >
          <div className="flex items-center justify-between mb-4 shrink-0">
            <p className="text-sm font-semibold tracking-tight">Recent Memories</p>
            <Link href="/app/memories" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-1 overflow-y-auto">
            {recentRecords.slice(0, 6).map((record) => {
              const tc = typeConfig[record.type]
              const Icon = tc?.icon ?? FileText
              return (
                <Link
                  key={record.id}
                  href={`/app/memories/${record.id}`}
                  className="group flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-muted/40 transition-colors"
                >
                  <div className={`flex h-7 w-7 items-center justify-center rounded-lg shrink-0 ${tc?.bg ?? 'bg-muted'}`}>
                    <Icon className={`h-3.5 w-3.5 ${tc?.color ?? ''}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate group-hover:text-[#4F46E5] transition-colors">{record.title}</p>
                    {record.summary && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{record.summary}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: (tc?.pieColor ?? '#6B7280') + '20', color: tc?.pieColor ?? '#6B7280' }}>
                      {tc?.label ?? record.type}
                    </span>
                    <span className="text-[11px] text-muted-foreground/60 whitespace-nowrap">{formatRelativeTime(record.createdAt)}</span>
                  </div>
                </Link>
              )
            })}
          </div>
        </motion.div>

        {/* Top Tags */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
          className="rounded-2xl border border-border/60 bg-background/60 p-5 flex flex-col min-h-0"
        >
          <div className="flex items-center gap-2 mb-4 shrink-0">
            <Hash className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-semibold tracking-tight">Top Tags</p>
          </div>
          {topTags.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No tags yet</p>
          ) : (
            <div className="flex flex-wrap gap-2 overflow-y-auto">
              {topTags.map(({ tag, count }) => (
                <Link
                  key={tag}
                  href={`/app/memories?tag=${encodeURIComponent(tag)}`}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border/60 bg-muted/40 hover:border-[#4F46E5]/40 hover:bg-[#4F46E5]/[0.06] transition-all group"
                >
                  <span className="text-xs font-medium text-foreground/80 group-hover:text-[#4F46E5] transition-colors">{tag}</span>
                  <span className="text-[10px] text-muted-foreground tabular-nums bg-muted rounded-full px-1.5 py-0.5">{count}</span>
                </Link>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
