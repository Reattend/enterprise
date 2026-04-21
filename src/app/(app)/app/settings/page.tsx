'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  User,
  Building,
  Users,
  Palette,
  Bot,
  Terminal,
  Trash2,
  Mail,
  Loader2,
  Play,
  RotateCcw,
  Zap,
  Shield,
  Crown,
  X,
  Clock,
  UserMinus,
  Monitor,
  Key,
  Copy,
  Check,
  Eye,
  EyeOff,
  Chrome,
  Smartphone,
  Puzzle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { TourTooltip } from '@/components/app/tour-tooltip'
import { useAppStore } from '@/stores/app-store'

interface UserData {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
  createdAt: string
}

interface WorkspaceData {
  id: string
  name: string
  type: string
  createdAt: string
}

interface MemberData {
  id: string
  userId: string
  name: string | null
  email: string
  avatarUrl: string | null
  role: string
  createdAt: string
}

interface InviteData {
  id: string
  email: string
  role: string
  status: string
  invitedBy: string | null
  createdAt: string
  expiresAt: string | null
}

interface ApiToken {
  id: string
  name: string
  prefix: string
  lastUsedAt: string | null
  createdAt: string
}

interface AgentLog {
  id: string
  type: string
  status: string
  payload: string | null
  result: string | null
  error: string | null
  createdAt: string
}

export default function SettingsPage() {
  const { setWorkspaceInfo, workspaceType } = useAppStore()

  const [user, setUser] = useState<UserData | null>(null)
  const [workspace, setWorkspace] = useState<WorkspaceData | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [agentLogs, setAgentLogs] = useState<AgentLog[]>([])
  const [loading, setLoading] = useState(true)

  const [editName, setEditName] = useState('')
  const [editAvatar, setEditAvatar] = useState('')
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Workspace settings
  const [wsName, setWsName] = useState('')
  const [savingWs, setSavingWs] = useState(false)

  // Members
  const [members, setMembers] = useState<MemberData[]>([])
  const [invites, setInvites] = useState<InviteData[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [inviting, setInviting] = useState(false)

  // API Keys
  const [apiTokens, setApiTokens] = useState<ApiToken[]>([])
  const [tokenName, setTokenName] = useState('My App')
  const [generatingToken, setGeneratingToken] = useState(false)
  const [newToken, setNewToken] = useState<string | null>(null)
  const [tokenCopied, setTokenCopied] = useState(false)
  const [showToken, setShowToken] = useState(false)
  const [loadingTokens, setLoadingTokens] = useState(false)

  const [triageRunning, setTriageRunning] = useState(false)
  const [relinkRunning, setRelinkRunning] = useState(false)
  const [rebuildRunning, setRebuildRunning] = useState(false)

  // Chat history
  const [deletingChats, setDeletingChats] = useState(false)

  // Delete workspace
  const [deleteConfirmName, setDeleteConfirmName] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Delete account
  const [showDeleteAccount, setShowDeleteAccount] = useState(false)
  const [deleteAccountConfirm, setDeleteAccountConfirm] = useState('')
  const [deletingAccount, setDeletingAccount] = useState(false)

  const isAdmin = role === 'admin' || role === 'owner'
  const isOwner = role === 'owner'

  useEffect(() => {
    fetchData()
    fetchApiTokens()
  }, [])

  const fetchApiTokens = async () => {
    setLoadingTokens(true)
    try {
      const res = await fetch('/api/tray/tokens')
      const data = await res.json()
      if (data.tokens) setApiTokens(data.tokens)
    } catch {
      // silent
    } finally {
      setLoadingTokens(false)
    }
  }

  const handleGenerateToken = async () => {
    setGeneratingToken(true)
    try {
      const res = await fetch('/api/tray/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: tokenName || 'My App' }),
      })
      const data = await res.json()
      if (res.ok && data.token) {
        setNewToken(data.token)
        setShowToken(true)
        setApiTokens(prev => [{ id: data.id, name: tokenName || 'My App', prefix: data.prefix, lastUsedAt: null, createdAt: new Date().toISOString() }, ...prev])
        setTokenName('My App')
        toast.success('API key generated — copy it now, it won\'t be shown again')
      } else {
        toast.error(data.error || 'Failed to generate key')
      }
    } catch {
      toast.error('Failed to generate key')
    } finally {
      setGeneratingToken(false)
    }
  }

  const handleRevokeToken = async (tokenId: string) => {
    if (!confirm('Revoke this key? Any app using it will lose access immediately.')) return
    try {
      const res = await fetch('/api/tray/tokens', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: tokenId }),
      })
      if (res.ok) {
        setApiTokens(prev => prev.filter(t => t.id !== tokenId))
        toast.success('API key revoked')
      }
    } catch {
      toast.error('Failed to revoke key')
    }
  }

  const handleCopyToken = () => {
    if (newToken) {
      navigator.clipboard.writeText(newToken)
      setTokenCopied(true)
      setTimeout(() => setTokenCopied(false), 2000)
    }
  }

  const handleDeleteAllChats = async () => {
    if (!confirm('Delete all chat history? This cannot be undone.')) return
    setDeletingChats(true)
    try {
      const res = await fetch('/api/chats', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      })
      if (res.ok) toast.success('All chat history deleted.')
      else toast.error('Failed to delete chats.')
    } catch {
      toast.error('Failed to delete chats.')
    } finally {
      setDeletingChats(false)
    }
  }

  const fetchData = async () => {
    try {
      const [userRes, logsRes, membersRes, invitesRes] = await Promise.all([
        fetch('/api/user'),
        fetch('/api/agent-logs'),
        fetch('/api/workspaces/members'),
        fetch('/api/workspaces/invite'),
      ])
      const userData = await userRes.json()
      const logsData = await logsRes.json()
      const membersData = await membersRes.json()
      const invitesData = await invitesRes.json()

      if (userData.user) {
        setUser(userData.user)
        setEditName(userData.user.name || '')
        setEditAvatar(userData.user.avatarUrl || '')
        setAvatarPreview(userData.user.avatarUrl || null)
      }
      if (userData.workspace) {
        setWorkspace(userData.workspace)
        setWsName(userData.workspace.name)
      }
      if (userData.role) setRole(userData.role)
      if (logsData.jobs) setAgentLogs(logsData.jobs)
      if (membersData.members) setMembers(membersData.members)
      if (invitesData.invites) setInvites(invitesData.invites)
    } catch {
      toast.error('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const handleRunTriage = async () => {
    setTriageRunning(true)
    try {
      const res = await fetch('/api/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bulk: true }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(`Triage complete: ${data.processed || 0} items processed`)
        fetchData()
      } else {
        toast.error(data.error || 'Triage failed')
      }
    } catch {
      toast.error('Failed to run triage')
    } finally {
      setTriageRunning(false)
    }
  }

  const handleRelink = async () => {
    setRelinkRunning(true)
    try {
      const res = await fetch('/api/jobs/relink', {
        method: 'POST',
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(`Re-link queued: ${data.queued || 0} memories`)
        fetchData()
      } else {
        toast.error(data.error || 'Re-link failed')
      }
    } catch {
      toast.error('Failed to run re-link')
    } finally {
      setRelinkRunning(false)
    }
  }

  const handleRebuildSuggestions = async () => {
    setRebuildRunning(true)
    try {
      const res = await fetch('/api/jobs/rebuild-suggestions', {
        method: 'POST',
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(`Rebuild complete: ${data.queued || 0} suggestions regenerated`)
        fetchData()
      } else {
        toast.error(data.error || 'Rebuild failed')
      }
    } catch {
      toast.error('Failed to rebuild suggestions')
    } finally {
      setRebuildRunning(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteAccountConfirm !== 'delete my account') return
    setDeletingAccount(true)
    try {
      const res = await fetch('/api/user', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: 'delete my account' }),
      })
      if (res.ok) {
        window.location.href = '/api/auth/signout?callbackUrl=/'
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to delete account')
      }
    } catch {
      toast.error('Failed to delete account')
    } finally {
      setDeletingAccount(false)
    }
  }

  const handleDeleteWorkspace = async () => {
    if (!workspace || deleteConfirmName !== workspace.name) return
    setDeleting(true)
    try {
      const res = await fetch('/api/workspaces', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmName: deleteConfirmName }),
      })
      if (res.ok) {
        toast.success('Workspace deleted')
        window.location.href = '/app'
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to delete workspace')
      }
    } catch {
      toast.error('Failed to delete workspace')
    } finally {
      setDeleting(false)
    }
  }

  const handleSaveWorkspace = async () => {
    if (!wsName.trim() || savingWs) return
    setSavingWs(true)
    try {
      const res = await fetch('/api/workspaces', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: wsName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to update workspace')
        return
      }
      // Update local state immediately
      setWorkspace(prev => prev ? { ...prev, name: data.name } : prev)
      // Update global store so sidebar/topbar reflect the change instantly
      setWorkspaceInfo(data.name, workspaceType || 'personal')
      toast.success('Workspace name updated')
    } catch {
      toast.error('Failed to update workspace')
    } finally {
      setSavingWs(false)
    }
  }

  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName || undefined,
          avatarUrl: editAvatar || undefined,
        }),
      })
      const data = await res.json()
      if (res.ok && data.user) {
        setUser(data.user)
        toast.success('Profile updated')
      } else {
        toast.error(data.error || 'Failed to update')
      }
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return
    setInviting(true)
    try {
      const res = await fetch('/api/workspaces/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to send invite')
        return
      }
      toast.success(`Invitation sent to ${inviteEmail}`)
      setInviteEmail('')
      setInviteRole('member')
      if (data.invite) setInvites(prev => [data.invite, ...prev])
    } catch {
      toast.error('Failed to send invite')
    } finally {
      setInviting(false)
    }
  }

  const handleRevokeInvite = async (inviteId: string) => {
    try {
      const res = await fetch('/api/workspaces/invite', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: inviteId }),
      })
      if (res.ok) {
        setInvites(prev => prev.filter(i => i.id !== inviteId))
        toast.success('Invite revoked')
      }
    } catch {
      toast.error('Failed to revoke invite')
    }
  }

  const handleChangeRole = async (memberId: string, newRole: string) => {
    try {
      const res = await fetch('/api/workspaces/members', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, role: newRole }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to change role')
        return
      }
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m))
      toast.success('Role updated')
    } catch {
      toast.error('Failed to change role')
    }
  }

  const handleRemoveMember = async (memberId: string, memberName: string | null) => {
    if (!confirm(`Remove ${memberName || 'this member'} from the workspace?`)) return
    try {
      const res = await fetch('/api/workspaces/members', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to remove member')
        return
      }
      setMembers(prev => prev.filter(m => m.id !== memberId))
      toast.success('Member removed')
    } catch {
      toast.error('Failed to remove member')
    }
  }

  const formatLogTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 max-w-4xl"
    >
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your account and workspace.</p>
      </div>

      <Tabs defaultValue="profile">
        {/* Enterprise Settings = only personal account stuff.
            Workspace / Members / Agent Logs / API Keys / Desktop are managed
            in the org-level admin cockpit (/app/admin/[orgId]), not here. */}
        <TabsList className="w-full justify-start">
          <TabsTrigger value="profile"><User className="h-3.5 w-3.5 mr-1.5" /> Profile</TabsTrigger>
          <TabsTrigger value="preferences"><Palette className="h-3.5 w-3.5 mr-1.5" /> Preferences</TabsTrigger>
        </TabsList>

        {/* Profile */}
        <TabsContent value="profile" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Profile</CardTitle>
              <CardDescription>Your personal information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Name</label>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Email</label>
                  <Input value={user?.email || ''} disabled />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Profile Picture</label>
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-full bg-primary/10 overflow-hidden flex items-center justify-center shrink-0 border border-border">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Avatar" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-xl font-bold text-primary">
                        {editName ? editName[0].toUpperCase() : (user?.email?.[0]?.toUpperCase() ?? 'U')}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-background hover:bg-muted text-sm font-medium transition-colors">
                      <User className="h-3.5 w-3.5" />
                      Upload photo
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        className="sr-only"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          if (file.size > 2_000_000) { toast.error('Image too large — max 2MB'); return }
                          const reader = new FileReader()
                          reader.onload = () => {
                            const dataUrl = reader.result as string
                            setAvatarPreview(dataUrl)
                            setEditAvatar(dataUrl)
                          }
                          reader.readAsDataURL(file)
                        }}
                      />
                    </label>
                    {avatarPreview && (
                      <button
                        type="button"
                        className="text-xs text-muted-foreground hover:text-destructive transition-colors text-left"
                        onClick={() => { setAvatarPreview(null); setEditAvatar('') }}
                      >
                        Remove photo
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <Button size="sm" onClick={handleSaveProfile} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Save Changes
              </Button>
            </CardContent>
          </Card>

          <Card className="border-destructive/20">
            <CardHeader>
              <CardTitle className="text-base text-destructive flex items-center gap-2">
                <Trash2 className="h-4 w-4" /> Delete Account
              </CardTitle>
              <CardDescription>
                Permanently delete your account and all associated data. This cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!showDeleteAccount ? (
                <Button variant="destructive" size="sm" onClick={() => setShowDeleteAccount(true)}>
                  Delete My Account
                </Button>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-destructive font-medium">
                    Type <span className="font-bold">&quot;delete my account&quot;</span> to confirm:
                  </p>
                  <Input
                    value={deleteAccountConfirm}
                    onChange={(e) => setDeleteAccountConfirm(e.target.value)}
                    placeholder="delete my account"
                    className="border-destructive/30 focus-visible:ring-destructive/30"
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={deleteAccountConfirm !== 'delete my account' || deletingAccount}
                      onClick={handleDeleteAccount}
                    >
                      {deletingAccount ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                      {deletingAccount ? 'Deleting...' : 'Permanently Delete Account'}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { setShowDeleteAccount(false); setDeleteAccountConfirm('') }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Workspace */}
        <TabsContent value="workspace" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Workspace Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Workspace Name</label>
                <Input value={wsName} onChange={(e) => setWsName(e.target.value)} />
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="text-xs capitalize">{workspace?.type}</Badge>
                <span className="text-xs text-muted-foreground">
                  Created: {workspace?.createdAt ? new Date(workspace.createdAt).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              <Button size="sm" disabled={!isAdmin || savingWs} onClick={handleSaveWorkspace}>
                {savingWs && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                {isAdmin ? (savingWs ? 'Saving...' : 'Save') : 'Only admins can edit'}
              </Button>
            </CardContent>
          </Card>

          {isOwner && workspace?.type === 'team' && (
            <Card className="border-destructive/20">
              <CardHeader>
                <CardTitle className="text-base text-destructive flex items-center gap-2">
                  <Trash2 className="h-4 w-4" /> Danger Zone
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!showDeleteConfirm ? (
                  <>
                    <p className="text-sm text-muted-foreground mb-3">
                      Permanently delete this workspace and all its data. This action cannot be undone.
                    </p>
                    <Button variant="destructive" size="sm" onClick={() => setShowDeleteConfirm(true)}>
                      Delete Workspace
                    </Button>
                  </>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-destructive font-medium">
                      Type <span className="font-bold">&quot;{workspace.name}&quot;</span> to confirm deletion:
                    </p>
                    <Input
                      value={deleteConfirmName}
                      onChange={(e) => setDeleteConfirmName(e.target.value)}
                      placeholder={workspace.name}
                      className="border-destructive/30 focus-visible:ring-destructive/30"
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={deleteConfirmName !== workspace.name || deleting}
                        onClick={handleDeleteWorkspace}
                      >
                        {deleting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                        {deleting ? 'Deleting...' : 'Permanently Delete'}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmName('') }}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Members */}
        <TabsContent value="members" className="space-y-4 mt-4">
          {isAdmin ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Mail className="h-4 w-4" /> Invite Members
                </CardTitle>
                <CardDescription>Invite team members to collaborate on shared memories.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@company.com"
                    className="flex-1"
                    onKeyDown={(e) => { if (e.key === 'Enter') handleInvite() }}
                  />
                  <Select value={inviteRole} onValueChange={setInviteRole}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="member">Member</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={handleInvite} disabled={!inviteEmail.trim() || inviting}>
                    {inviting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Mail className="h-4 w-4 mr-1" /> Invite
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed border-muted-foreground/20">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-muted-foreground">
                  <Shield className="h-4 w-4" /> Invite Members
                </CardTitle>
                <CardDescription>
                  Only workspace admins and owners can invite new members.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 rounded-lg bg-muted/30 border border-border/40 px-4 py-3">
                  <Users className="h-5 w-5 text-muted-foreground/50 shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    You are a <span className="font-medium text-foreground capitalize">{role}</span> of this workspace.
                    Ask your workspace admin or owner to invite new members.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {invites.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Pending Invitations ({invites.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {invites.map((invite) => (
                    <div key={invite.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground">
                          <Mail className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{invite.email}</p>
                          <p className="text-xs text-muted-foreground">
                            Invited by {invite.invitedBy} &middot; {formatLogTime(invite.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs capitalize">{invite.role}</Badge>
                        <Badge variant="secondary" className="text-[10px] text-amber-500">Pending</Badge>
                        {isAdmin && (
                          <Button variant="ghost" size="icon-sm" onClick={() => handleRevokeInvite(invite.id)}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <TourTooltip
                tourKey="settings_members"
                title="Team Members"
                description="Manage your team members here. Invite new people, change roles, or remove members."
              >
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" /> Current Members ({members.length})
                </CardTitle>
              </TourTooltip>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {members.map((member) => {
                  const isSelf = member.userId === user?.id
                  const memberIsOwner = member.role === 'owner'
                  const canChangeRole = isAdmin && !isSelf && !memberIsOwner
                  const canRemove = isAdmin && !isSelf && !memberIsOwner && (isOwner || member.role !== 'admin')

                  return (
                    <div key={member.id} className="flex items-center justify-between py-2.5 px-2 rounded-md hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                          {(member.name || member.email)[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {member.name || 'No name set'}
                            {isSelf ? <span className="text-xs text-muted-foreground ml-1">(you)</span> : null}
                          </p>
                          <p className="text-xs text-muted-foreground">{member.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {memberIsOwner ? (
                          <Badge className="text-xs gap-1 bg-amber-500/10 text-amber-600 border-amber-500/20">
                            <Crown className="h-3 w-3" /> Owner
                          </Badge>
                        ) : canChangeRole ? (
                          <Select
                            value={member.role}
                            onValueChange={(val) => handleChangeRole(member.id, val)}
                          >
                            <SelectTrigger className="w-28 h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">
                                <div className="flex items-center gap-1.5">
                                  <Shield className="h-3 w-3" /> Admin
                                </div>
                              </SelectItem>
                              <SelectItem value="member">
                                <div className="flex items-center gap-1.5">
                                  <User className="h-3 w-3" /> Member
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="secondary" className="text-xs capitalize">
                            {member.role === 'admin' ? (
                              <><Shield className="h-3 w-3 mr-1" /> Admin</>
                            ) : (
                              member.role
                            )}
                          </Badge>
                        )}
                        {canRemove && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleRemoveMember(member.id, member.name)}
                          >
                            <UserMinus className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences */}
        <TabsContent value="preferences" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Palette className="h-4 w-4" /> Appearance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Theme</p>
                  <p className="text-xs text-muted-foreground">Choose between light and dark mode.</p>
                </div>
                <Select defaultValue="dark">
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Bot className="h-4 w-4" /> AI Agent Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Auto-triage Inbox</p>
                  <p className="text-xs text-muted-foreground">Automatically triage new inbox items.</p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Auto-link Memories</p>
                  <p className="text-xs text-muted-foreground">Automatically create links between related memories.</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Agent Aggressiveness</p>
                <p className="text-xs text-muted-foreground mb-2">How aggressively should the AI create connections and suggestions?</p>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">Conservative</span>
                  <input type="range" min="0" max="100" defaultValue="50" className="flex-1 accent-primary" />
                  <span className="text-xs text-muted-foreground">Aggressive</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Trash2 className="h-4 w-4" /> Chat History
              </CardTitle>
              <CardDescription>Manage your saved AI conversations. Up to 30 chats are kept.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Delete all chats</p>
                  <p className="text-xs text-muted-foreground">Permanently remove all saved conversations.</p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteAllChats}
                  disabled={deletingChats}
                >
                  {deletingChats ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Deleting...</> : <><Trash2 className="h-3.5 w-3.5 mr-1.5" />Delete All Chats</>}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Agent Logs */}
        <TabsContent value="agent-logs" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Terminal className="h-4 w-4" /> Agent Logs
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="text-xs" onClick={handleRunTriage} disabled={triageRunning}>
                    {triageRunning ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Play className="h-3 w-3 mr-1" />} Run Triage
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs" onClick={handleRelink} disabled={relinkRunning}>
                    {relinkRunning ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <RotateCcw className="h-3 w-3 mr-1" />} Re-link
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs" onClick={handleRebuildSuggestions} disabled={rebuildRunning}>
                    {rebuildRunning ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Zap className="h-3 w-3 mr-1" />} Rebuild Suggestions
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {agentLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Terminal className="h-6 w-6 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No agent jobs yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {agentLogs.map((log) => (
                    <div key={log.id} className="flex items-center gap-3 rounded-md p-2 border text-xs">
                      <Badge
                        variant={log.status === 'completed' ? 'secondary' : log.status === 'failed' ? 'destructive' : 'outline'}
                        className="text-[9px] min-w-[70px] justify-center"
                      >
                        {log.status}
                      </Badge>
                      <Badge variant="secondary" className="text-[9px]">{log.type}</Badge>
                      <span className="flex-1 truncate text-muted-foreground">
                        {log.error || log.result || log.payload || '-'}
                      </span>
                      <span className="text-muted-foreground shrink-0">{formatLogTime(log.createdAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Keys */}
        <TabsContent value="api-keys" className="space-y-4 mt-4">
          {/* What are API keys */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Key className="h-4 w-4 text-[#4F46E5]" /> API Keys
              </CardTitle>
              <CardDescription>
                Generate API keys to authenticate Reattend clients. The same key works across all integrations.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3 mb-5">
                {[
                  { icon: Monitor, label: 'Desktop App', desc: 'Mac / Windows tray app' },
                  { icon: Puzzle, label: 'Chrome Extension', desc: 'Browser capture & recall' },
                  { icon: Smartphone, label: 'Mobile (coming soon)', desc: 'iOS & Android apps' },
                ].map(({ icon: Icon, label, desc }) => (
                  <div key={label} className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/20 p-3">
                    <div className="h-8 w-8 rounded-lg bg-[#4F46E5]/10 flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4 text-[#4F46E5]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium leading-tight">{label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Generate new key */}
              <div className="space-y-3 border-t pt-4">
                <p className="text-sm font-medium">Generate a new key</p>
                <div className="flex gap-2">
                  <Input
                    value={tokenName}
                    onChange={e => setTokenName(e.target.value)}
                    placeholder="Key name (e.g. Desktop App, Chrome)"
                    className="flex-1"
                    onKeyDown={e => { if (e.key === 'Enter') handleGenerateToken() }}
                  />
                  <Button onClick={handleGenerateToken} disabled={generatingToken}>
                    {generatingToken ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Key className="h-4 w-4 mr-1.5" />}
                    Generate
                  </Button>
                </div>

                {/* Newly generated token — shown once */}
                {newToken && (
                  <div className="rounded-xl border border-[#4F46E5]/30 bg-[#4F46E5]/5 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-[#4F46E5]">Your new API key</p>
                      <Badge variant="outline" className="text-[10px] border-amber-400/40 text-amber-500 bg-amber-500/5">
                        Copy now — shown once
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 font-mono text-xs bg-background border border-border rounded-lg px-3 py-2 truncate select-all">
                        {showToken ? newToken : '•'.repeat(40)}
                      </code>
                      <Button variant="ghost" size="icon" onClick={() => setShowToken(v => !v)}>
                        {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button size="icon" onClick={handleCopyToken} className="shrink-0">
                        {tokenCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Paste this key into your desktop app or Chrome extension settings. It won&apos;t be shown again.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Existing keys */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4" /> Active Keys
                {apiTokens.length > 0 && (
                  <Badge variant="secondary" className="text-xs ml-1">{apiTokens.length}</Badge>
                )}
              </CardTitle>
              <CardDescription>Revoke a key to immediately block access from that client.</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingTokens ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/40" />
                </div>
              ) : apiTokens.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Key className="h-7 w-7 mx-auto mb-2 opacity-25" />
                  <p className="text-sm">No API keys yet. Generate one above.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {apiTokens.map(token => (
                    <div key={token.id} className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-4 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-8 w-8 rounded-lg bg-[#4F46E5]/10 flex items-center justify-center shrink-0">
                          <Key className="h-3.5 w-3.5 text-[#4F46E5]" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{token.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {token.prefix}••••••••
                            {token.lastUsedAt
                              ? <span className="font-sans ml-2 not-italic">· Last used {formatLogTime(token.lastUsedAt)}</span>
                              : <span className="font-sans ml-2 not-italic">· Never used</span>
                            }
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        <span className="text-[11px] text-muted-foreground/60">
                          {formatLogTime(token.createdAt)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRevokeToken(token.id)}
                          title="Revoke key"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Desktop App — redirect to dedicated page */}
        <TabsContent value="desktop" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Monitor className="h-4 w-4" /> Reattend Desktop App
              </CardTitle>
              <CardDescription>
                Download, setup instructions, and API token management have moved to their own page.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild size="sm">
                <a href="/app/desktop">
                  <Monitor className="h-3.5 w-3.5 mr-1.5" />
                  Go to Desktop App page
                </a>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  )
}
