'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Users, Brain, FolderKanban, Plug, Inbox, UserPlus, Crown, Shield,
  Loader2, LogOut, Gift, Trash2, TrendingUp, MessageCircle, Building2,
  CheckCircle2, Eye, Monitor, AlertTriangle, Clock, BarChart3,
  MessageSquare, Database,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'

type Section = 'overview' | 'users' | 'feedback' | 'access'

interface AdminUser { id: string; email: string; name: string; role: string }
interface FeedbackRequest { id: string; email: string; name: string | null; type: string; message: string; status: string; createdAt: string }
interface IntegrationRequest { id: string; appName: string; email: string | null; status: string; createdAt: string }

interface Stats {
  totalUsers: number; paidUsers: number; trialingUsers: number; freeUsers: number
  professionalUsers: number; enterpriseUsers: number
  totalMemories: number; totalTeams: number; totalWorkspaces: number; totalProjects: number
  totalIntegrations: number; totalInboxItems: number; recentSignups: number
  totalApiTokens: number; pendingJobs: number; failedJobs: number; totalChats: number
}

interface RecentUser {
  id: string; email: string; name: string; createdAt: string
  plan: string; tier: 'free' | 'professional' | 'enterprise'
  seatCount: number; billingCycle: 'monthly' | 'annual' | null
  status: string; trialEndsAt: string | null; renewsAt: string | null
  paddleSubId: string | null; memoryCount: number; inboxCount: number
  workspaceCount: number; chatCount: number; lastActive: string | null
}

export default function AdminDashboard() {
  const router = useRouter()
  const [section, setSection] = useState<Section>('overview')
  const [admin, setAdmin] = useState<AdminUser | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([])
  const [loading, setLoading] = useState(true)
  const [showExtendTrial, setShowExtendTrial] = useState(false)
  const [trialEmail, setTrialEmail] = useState('')
  const [trialDays, setTrialDays] = useState('45')
  const [trialTier, setTrialTier] = useState<'professional' | 'enterprise'>('professional')
  const [trialSeats, setTrialSeats] = useState('1')
  const [extending, setExtending] = useState(false)
  const [showGrantPro, setShowGrantPro] = useState(false)
  const [grantProEmail, setGrantProEmail] = useState('')
  const [grantProTier, setGrantProTier] = useState<'professional' | 'enterprise'>('professional')
  const [grantProSeats, setGrantProSeats] = useState('1')
  const [grantProCycle, setGrantProCycle] = useState<'monthly' | 'annual'>('monthly')
  const [grantingPro, setGrantingPro] = useState(false)
  const [showAddAdmin, setShowAddAdmin] = useState(false)
  const [newAdminEmail, setNewAdminEmail] = useState('')
  const [newAdminName, setNewAdminName] = useState('')
  const [addingAdmin, setAddingAdmin] = useState(false)
  const [adminList, setAdminList] = useState<AdminUser[]>([])
  const [feedbackList, setFeedbackList] = useState<FeedbackRequest[]>([])
  const [integrationRequests, setIntegrationRequests] = useState<IntegrationRequest[]>([])

  const isSuperAdmin = admin?.role === 'super_admin'
  const newFeedback = feedbackList.filter(f => f.status === 'new').length
  const newIntegrations = integrationRequests.filter(r => r.status === 'new').length

  const fetchAdmin = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/auth/me')
      if (!res.ok) { router.replace('/admin/login'); return }
      const data = await res.json()
      setAdmin(data.admin)
    } catch { router.replace('/admin/login') }
  }, [router])

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/stats')
      if (!res.ok) return
      const data = await res.json()
      setStats(data.stats)
      setRecentUsers(data.recentUsers)
    } catch { } finally { setLoading(false) }
  }, [])

  const fetchAdmins = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/admins')
      if (!res.ok) return
      setAdminList((await res.json()).admins)
    } catch { }
  }, [])

  const fetchFeedback = useCallback(async () => {
    try {
      const res = await fetch('/api/feedback')
      if (!res.ok) return
      setFeedbackList((await res.json()).requests || [])
    } catch { }
  }, [])

  const fetchIntegrationRequests = useCallback(async () => {
    try {
      const res = await fetch('/api/integration-requests')
      if (!res.ok) return
      setIntegrationRequests((await res.json()).requests || [])
    } catch { }
  }, [])

  useEffect(() => {
    fetchAdmin().then(() => {
      fetchStats(); fetchAdmins(); fetchFeedback(); fetchIntegrationRequests()
    })
  }, [fetchAdmin, fetchStats, fetchAdmins, fetchFeedback, fetchIntegrationRequests])

  const handleLogout = async () => {
    await fetch('/api/admin/auth/logout', { method: 'POST' })
    router.replace('/admin/login')
  }

  const handleExtendTrial = async () => {
    setExtending(true)
    try {
      const res = await fetch('/api/admin/extend-trial', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trialEmail,
          days: parseInt(trialDays),
          tier: trialTier,
          seatCount: parseInt(trialSeats) || (trialTier === 'enterprise' ? 5 : 1),
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Failed'); return }
      toast.success(data.message)
      setShowExtendTrial(false); setTrialEmail(''); setTrialDays('45')
      setTrialTier('professional'); setTrialSeats('1')
      fetchStats()
    } catch { toast.error('Something went wrong') } finally { setExtending(false) }
  }

  const handleGrantPro = async () => {
    setGrantingPro(true)
    try {
      const res = await fetch('/api/admin/grant-pro', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: grantProEmail,
          tier: grantProTier,
          seatCount: parseInt(grantProSeats) || (grantProTier === 'enterprise' ? 5 : 1),
          billingCycle: grantProCycle,
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Failed'); return }
      toast.success(data.message)
      setShowGrantPro(false); setGrantProEmail('')
      setGrantProTier('professional'); setGrantProSeats('1'); setGrantProCycle('monthly')
      fetchStats()
    } catch { toast.error('Something went wrong') } finally { setGrantingPro(false) }
  }

  const handleAddAdmin = async () => {
    setAddingAdmin(true)
    try {
      const res = await fetch('/api/admin/admins', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newAdminEmail, name: newAdminName }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Failed'); return }
      toast.success(`${data.admin.email} can now log in via OTP`)
      setShowAddAdmin(false); setNewAdminEmail(''); setNewAdminName('')
      fetchAdmins()
    } catch { toast.error('Something went wrong') } finally { setAddingAdmin(false) }
  }

  const handleDeleteAdmin = async (adminId: string, adminEmail: string) => {
    if (!confirm(`Remove admin access for ${adminEmail}?`)) return
    try {
      const res = await fetch('/api/admin/admins', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId }),
      })
      if (!res.ok) { toast.error((await res.json()).error || 'Failed'); return }
      toast.success(`Removed ${adminEmail}`); fetchAdmins()
    } catch { toast.error('Something went wrong') }
  }

  const handleMarkFeedbackReviewed = async (id: string) => {
    try {
      await fetch('/api/feedback', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'reviewed' }),
      })
      setFeedbackList(prev => prev.map(f => f.id === id ? { ...f, status: 'reviewed' } : f))
    } catch { toast.error('Failed') }
  }

  const handleMarkIntegrationReviewed = async (id: string) => {
    try {
      await fetch('/api/integration-requests', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'reviewed' }),
      })
      setIntegrationRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'reviewed' } : r))
    } catch { toast.error('Failed') }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  const navItems: { id: Section; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'users', label: 'Users', icon: Users, badge: stats?.recentSignups || 0 },
    { id: 'feedback', label: 'Feedback', icon: MessageCircle, badge: newFeedback + newIntegrations },
    { id: 'access', label: 'Access', icon: Shield },
  ]

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900" style={{ colorScheme: 'light' }}>
      {/* Sidebar */}
      <aside className="w-56 shrink-0 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-gray-200">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-900">
            <Shield className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Admin</p>
            <p className="text-[10px] text-gray-400 truncate max-w-[100px]">{admin?.email}</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setSection(item.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                section === item.id
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left">{item.label}</span>
              {!!item.badge && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Bottom */}
        <div className="p-3 border-t border-gray-200 space-y-1">
          {isSuperAdmin && (
            <>
              <button
                onClick={() => setShowExtendTrial(true)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors"
              >
                <Gift className="h-4 w-4" />
                Extend Trial
              </button>
              <button
                onClick={() => setShowGrantPro(true)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-gray-500 hover:text-amber-700 hover:bg-amber-50 transition-colors"
              >
                <Crown className="h-4 w-4" />
                Grant Pro
              </button>
              <button
                onClick={() => { setSection('access'); setShowAddAdmin(true) }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors"
              >
                <UserPlus className="h-4 w-4" />
                Add Admin
              </button>
            </>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto p-6 space-y-6">

          {/* ── OVERVIEW ── */}
          {section === 'overview' && (
            <>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Overview</h1>
                <p className="text-sm text-gray-500 mt-0.5">Platform-wide metrics</p>
              </div>

              {stats && (
                <>
                  {/* Growth */}
                  <section>
                    <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Growth</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <StatCard label="Total Users" value={stats.totalUsers} icon={Users} />
                      <StatCard label="Signups (7d)" value={stats.recentSignups} icon={TrendingUp} accent />
                      <StatCard label="Paid" value={stats.paidUsers} icon={Crown} accent />
                      <StatCard label="Trialing" value={stats.trialingUsers} icon={Gift} />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                      <StatCard label="Free" value={stats.freeUsers} icon={Users} />
                      <StatCard label="Professional" value={stats.professionalUsers ?? 0} icon={Crown} />
                      <StatCard label="Enterprise" value={stats.enterpriseUsers ?? 0} icon={Building2} />
                      <StatCard
                        label="Conversion"
                        value={stats.totalUsers > 0
                          ? `${Math.round(((stats.paidUsers + stats.trialingUsers) / stats.totalUsers) * 100)}%`
                          : '0%'}
                        icon={TrendingUp}
                      />
                    </div>
                  </section>

                  {/* Engagement */}
                  <section>
                    <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Engagement</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <StatCard label="Memories" value={stats.totalMemories} icon={Brain} />
                      <StatCard label="Inbox Items" value={stats.totalInboxItems} icon={Inbox} />
                      <StatCard label="Chat Sessions" value={stats.totalChats} icon={MessageSquare} />
                      <StatCard label="Desktop / Ext" value={stats.totalApiTokens} icon={Monitor} />
                    </div>
                  </section>

                  {/* Product */}
                  <section>
                    <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Product</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <StatCard label="Workspaces" value={stats.totalWorkspaces} icon={Building2} />
                      <StatCard label="Teams" value={stats.totalTeams} icon={Users} />
                      <StatCard label="Projects" value={stats.totalProjects} icon={FolderKanban} />
                      <StatCard label="Integrations" value={stats.totalIntegrations} icon={Plug} />
                    </div>
                  </section>

                  {/* Health */}
                  <section>
                    <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Health</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <StatCard
                        label="Pending Jobs" value={stats.pendingJobs} icon={Clock}
                        accent={stats.pendingJobs > 0}
                      />
                      <StatCard
                        label="Failed Jobs" value={stats.failedJobs} icon={AlertTriangle}
                        danger={stats.failedJobs > 0}
                      />
                      <StatCard
                        label="New Feedback" value={feedbackList.filter(f => f.status === 'new').length}
                        icon={MessageCircle}
                        accent={feedbackList.some(f => f.status === 'new')}
                      />
                      <StatCard
                        label="Integrations Asked"
                        value={integrationRequests.filter(r => r.status === 'new').length}
                        icon={Plug}
                        accent={integrationRequests.some(r => r.status === 'new')}
                      />
                    </div>
                  </section>
                </>
              )}
            </>
          )}

          {/* ── USERS ── */}
          {section === 'users' && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Users</h1>
                  <p className="text-sm text-gray-500 mt-0.5">{recentUsers.length} most recent shown</p>
                </div>
                {isSuperAdmin && (
                  <Button size="sm" onClick={() => setShowExtendTrial(true)}>
                    <Gift className="h-3.5 w-3.5 mr-1.5" /> Extend Trial
                  </Button>
                )}
              </div>

              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        {['Email', 'Plan', 'Memories', 'Inbox', 'Chats', 'Workspaces', 'Last Active', 'Trial / Renews', 'Joined', ...(isSuperAdmin ? [''] : [])].map(h => (
                          <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {recentUsers.map((u) => {
                        const trialDays = u.trialEndsAt
                          ? Math.max(0, Math.ceil((new Date(u.trialEndsAt).getTime() - Date.now()) / 86400000))
                          : null
                        // Prefer tier (new model) when present; planKey is legacy fallback.
                        const tier = u.tier || (u.plan === 'smart' ? 'professional' : 'free')
                        const planLabel = u.status === 'trialing'
                          ? (tier === 'enterprise' ? 'Ent · Trial' : 'Pro · Trial')
                          : tier === 'enterprise' ? 'Enterprise'
                          : tier === 'professional' ? 'Professional'
                          : 'Free'
                        const planColor =
                          tier === 'enterprise' ? 'bg-violet-100 text-violet-700' :
                          tier === 'professional' && u.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                          u.status === 'trialing' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-600'
                        return (
                          <tr key={u.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2.5">
                              <div className="font-mono text-xs text-gray-900">{u.email}</div>
                              <div className="text-[10px] text-gray-400">{u.name}</div>
                            </td>
                            <td className="px-3 py-2.5">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${planColor}`}>
                                {planLabel}
                              </span>
                              {u.seatCount > 1 && (
                                <div className="text-[10px] text-gray-400 mt-0.5">{u.seatCount} seats · {u.billingCycle || 'monthly'}</div>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <span className={`text-sm font-semibold ${u.memoryCount > 0 ? 'text-gray-900' : 'text-gray-300'}`}>
                                {u.memoryCount}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <span className={`text-sm ${u.inboxCount > 0 ? 'text-gray-700' : 'text-gray-300'}`}>
                                {u.inboxCount}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <span className={`text-sm ${u.chatCount > 0 ? 'text-gray-700' : 'text-gray-300'}`}>
                                {u.chatCount}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-center text-sm text-gray-600">{u.workspaceCount}</td>
                            <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">
                              {u.lastActive ? formatRelativeTime(u.lastActive) : '—'}
                            </td>
                            <td className="px-3 py-2.5 text-xs whitespace-nowrap">
                              {trialDays !== null ? (
                                <span className={trialDays <= 7 ? 'text-amber-600 font-semibold' : 'text-gray-500'}>
                                  {trialDays}d left
                                </span>
                              ) : u.renewsAt ? (
                                <span className="text-gray-400">{new Date(u.renewsAt).toLocaleDateString()}</span>
                              ) : '—'}
                            </td>
                            <td className="px-3 py-2.5 text-xs text-gray-400 whitespace-nowrap">
                              {new Date(u.createdAt).toLocaleDateString()}
                            </td>
                            {isSuperAdmin && (
                              <td className="px-3 py-2.5">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => { setTrialEmail(u.email); setShowExtendTrial(true) }}
                                    className="text-gray-400 hover:text-blue-600 transition-colors"
                                    title="Extend trial"
                                  >
                                    <Gift className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => { setGrantProEmail(u.email); setShowGrantPro(true) }}
                                    className="text-gray-400 hover:text-amber-600 transition-colors"
                                    title="Grant Pro"
                                  >
                                    <Crown className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        )
                      })}
                      {recentUsers.length === 0 && (
                        <tr>
                          <td colSpan={10} className="px-3 py-10 text-center text-sm text-gray-400">No users yet</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* ── FEEDBACK ── */}
          {section === 'feedback' && (
            <>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Feedback & Requests</h1>
                <p className="text-sm text-gray-500 mt-0.5">User feedback, bug reports, enterprise inquiries, integration requests</p>
              </div>

              {/* Feedback */}
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                  <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-gray-400" />
                    Feedback
                    {feedbackList.filter(f => f.status === 'new').length > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                        {feedbackList.filter(f => f.status === 'new').length}
                      </span>
                    )}
                  </h2>
                </div>
                {feedbackList.length === 0 ? (
                  <p className="py-8 text-center text-sm text-gray-400">No feedback yet</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          {['Type', 'From', 'Message', 'Status', 'Date', ''].map(h => (
                            <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {feedbackList.map((fb) => (
                          <tr key={fb.id} className={`hover:bg-gray-50 ${fb.status === 'new' ? 'bg-amber-50' : ''}`}>
                            <td className="px-3 py-2.5">
                              <TypeBadge type={fb.type} />
                            </td>
                            <td className="px-3 py-2.5 whitespace-nowrap">
                              <div className="text-xs font-medium text-gray-900">{fb.name || '—'}</div>
                              <div className="text-[10px] text-gray-400 font-mono">{fb.email}</div>
                            </td>
                            <td className="px-3 py-2.5 max-w-sm">
                              <p className="text-xs text-gray-700 whitespace-pre-wrap break-words line-clamp-3">{fb.message}</p>
                            </td>
                            <td className="px-3 py-2.5">
                              {fb.status === 'new'
                                ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700">New</span>
                                : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-500"><CheckCircle2 className="h-3 w-3" />Done</span>
                              }
                            </td>
                            <td className="px-3 py-2.5 text-xs text-gray-400 whitespace-nowrap">
                              {new Date(fb.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-3 py-2.5">
                              {fb.status === 'new' && (
                                <button onClick={() => handleMarkFeedbackReviewed(fb.id)} className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1">
                                  <Eye className="h-3.5 w-3.5" /> Done
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Integration Requests */}
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                  <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <Plug className="h-4 w-4 text-gray-400" />
                    Integration Requests
                    {newIntegrations > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                        {newIntegrations}
                      </span>
                    )}
                  </h2>
                </div>
                {integrationRequests.length === 0 ? (
                  <p className="py-8 text-center text-sm text-gray-400">No integration requests yet</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          {['App', 'Email', 'Status', 'Date', ''].map(h => (
                            <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {integrationRequests.map((req) => (
                          <tr key={req.id} className={`hover:bg-gray-50 ${req.status === 'new' ? 'bg-violet-50' : ''}`}>
                            <td className="px-3 py-2.5 font-medium text-gray-900 text-sm">{req.appName}</td>
                            <td className="px-3 py-2.5 text-xs font-mono text-gray-400">{req.email || '—'}</td>
                            <td className="px-3 py-2.5">
                              {req.status === 'new'
                                ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-100 text-violet-700">New</span>
                                : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-500"><CheckCircle2 className="h-3 w-3" />Done</span>
                              }
                            </td>
                            <td className="px-3 py-2.5 text-xs text-gray-400 whitespace-nowrap">
                              {new Date(req.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-3 py-2.5">
                              {req.status === 'new' && (
                                <button onClick={() => handleMarkIntegrationReviewed(req.id)} className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1">
                                  <Eye className="h-3.5 w-3.5" /> Done
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── ACCESS ── */}
          {section === 'access' && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Admin Access</h1>
                  <p className="text-sm text-gray-500 mt-0.5">Manage who can access this panel</p>
                </div>
                {isSuperAdmin && (
                  <Button size="sm" onClick={() => setShowAddAdmin(true)}>
                    <UserPlus className="h-3.5 w-3.5 mr-1.5" /> Add Admin
                  </Button>
                )}
              </div>

              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="divide-y divide-gray-100">
                  {adminList.map((a) => (
                    <div key={a.id} className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-600">
                          {a.name[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{a.name}</p>
                          <p className="text-xs text-gray-400">{a.email}</p>
                        </div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          a.role === 'super_admin' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {a.role === 'super_admin' ? 'Super Admin' : 'Viewer'}
                        </span>
                      </div>
                      {isSuperAdmin && a.id !== admin?.id && (
                        <button
                          onClick={() => handleDeleteAdmin(a.id, a.email)}
                          className="text-gray-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  {adminList.length === 0 && (
                    <p className="py-8 text-center text-sm text-gray-400">No admins yet</p>
                  )}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                <div className="flex items-start gap-2">
                  <Database className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                  <div className="text-xs text-blue-700">
                    <p className="font-semibold mb-1">Auth: Email OTP only</p>
                    <p>Anyone in this list can log in at <span className="font-mono">/admin/login</span> using their email + a one-time code. No passwords stored.</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Dialogs */}
      <Dialog open={showExtendTrial} onOpenChange={setShowExtendTrial}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Gift className="h-5 w-5 text-violet-500" />Extend Free Trial</DialogTitle>
            <DialogDescription>Grant a user a comp trial of a paid tier — no card required. Stacks on top of any existing trial.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">User Email</label>
              <Input type="email" value={trialEmail} onChange={(e) => setTrialEmail(e.target.value)} placeholder="user@example.com" autoFocus />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Tier</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => { setTrialTier('professional'); if (parseInt(trialSeats) < 1) setTrialSeats('1') }}
                  className={`px-3 py-2 rounded-md border text-sm font-medium transition ${trialTier === 'professional' ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  Professional ($19)
                </button>
                <button
                  type="button"
                  onClick={() => { setTrialTier('enterprise'); if (parseInt(trialSeats) < 5) setTrialSeats('5') }}
                  className={`px-3 py-2 rounded-md border text-sm font-medium transition ${trialTier === 'enterprise' ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  Enterprise ($29)
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Days</label>
                <Input type="number" min={1} max={365} value={trialDays} onChange={(e) => setTrialDays(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Seats {trialTier === 'enterprise' && <span className="text-xs text-gray-500 font-normal">(min 5)</span>}</label>
                <Input type="number" min={trialTier === 'enterprise' ? 5 : 1} value={trialSeats} onChange={(e) => setTrialSeats(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowExtendTrial(false)}>Cancel</Button>
            <Button onClick={handleExtendTrial} disabled={!trialEmail.trim() || extending}>
              {extending ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />Extending...</> : <><Gift className="h-4 w-4 mr-1" />Extend Trial</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showGrantPro} onOpenChange={setShowGrantPro}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Crown className="h-5 w-5 text-amber-500" />Grant Paid Tier</DialogTitle>
            <DialogDescription>Flip a user to an active paid tier — no Paddle interaction. Overrides any existing plan.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">User Email</label>
              <Input type="email" value={grantProEmail} onChange={(e) => setGrantProEmail(e.target.value)} placeholder="user@example.com" autoFocus />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Tier</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => { setGrantProTier('professional'); if (parseInt(grantProSeats) < 1) setGrantProSeats('1') }}
                  className={`px-3 py-2 rounded-md border text-sm font-medium transition ${grantProTier === 'professional' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  Professional
                </button>
                <button
                  type="button"
                  onClick={() => { setGrantProTier('enterprise'); if (parseInt(grantProSeats) < 5) setGrantProSeats('5') }}
                  className={`px-3 py-2 rounded-md border text-sm font-medium transition ${grantProTier === 'enterprise' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  Enterprise
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Seats {grantProTier === 'enterprise' && <span className="text-xs text-gray-500 font-normal">(min 5)</span>}</label>
                <Input type="number" min={grantProTier === 'enterprise' ? 5 : 1} value={grantProSeats} onChange={(e) => setGrantProSeats(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Cycle</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setGrantProCycle('monthly')}
                    className={`px-2 py-2 rounded-md border text-xs font-medium transition ${grantProCycle === 'monthly' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    onClick={() => setGrantProCycle('annual')}
                    className={`px-2 py-2 rounded-md border text-xs font-medium transition ${grantProCycle === 'annual' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    Annual
                  </button>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowGrantPro(false)}>Cancel</Button>
            <Button onClick={handleGrantPro} disabled={!grantProEmail.trim() || grantingPro} className="bg-amber-600 hover:bg-amber-700 text-white">
              {grantingPro ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />Granting...</> : <><Crown className="h-4 w-4 mr-1" />Grant {grantProTier === 'professional' ? 'Pro' : 'Enterprise'}</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddAdmin} onOpenChange={setShowAddAdmin}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5" />Add Admin</DialogTitle>
            <DialogDescription>They will log in via email OTP — no password needed.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Email</label>
              <Input type="email" value={newAdminEmail} onChange={(e) => setNewAdminEmail(e.target.value)} placeholder="admin@example.com" autoFocus />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Name</label>
              <Input value={newAdminName} onChange={(e) => setNewAdminName(e.target.value)} placeholder="Name" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowAddAdmin(false)}>Cancel</Button>
            <Button onClick={handleAddAdmin} disabled={!newAdminEmail.trim() || addingAdmin}>
              {addingAdmin ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />Adding...</> : <><UserPlus className="h-4 w-4 mr-1" />Add Admin</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StatCard({ label, value, icon: Icon, accent, danger }: {
  label: string; value: number | string; icon: React.ElementType; accent?: boolean; danger?: boolean
}) {
  return (
    <div className={`bg-white rounded-lg border p-4 ${danger ? 'border-red-200 bg-red-50' : accent ? 'border-blue-200 bg-blue-50' : 'border-gray-200'}`}>
      <div className="flex items-center justify-between mb-2">
        <Icon className={`h-4 w-4 ${danger ? 'text-red-500' : accent ? 'text-blue-500' : 'text-gray-400'}`} />
      </div>
      <p className={`text-2xl font-bold ${danger ? 'text-red-700' : accent ? 'text-blue-700' : 'text-gray-900'}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  )
}

function TypeBadge({ type }: { type: string }) {
  const map: Record<string, { label: string; className: string }> = {
    enterprise_inquiry: { label: 'Enterprise', className: 'bg-purple-100 text-purple-700' },
    feature_request: { label: 'Feature', className: 'bg-blue-100 text-blue-700' },
    bug_report: { label: 'Bug', className: 'bg-red-100 text-red-700' },
    feedback: { label: 'Feedback', className: 'bg-gray-100 text-gray-600' },
  }
  const { label, className } = map[type] || { label: type, className: 'bg-gray-100 text-gray-600' }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${className}`}>{label}</span>
  )
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}
