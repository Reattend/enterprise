'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Lock,
  Users,
  Building2,
  Globe,
  UserPlus,
  X,
  Loader2,
  Share2,
  Shield,
} from 'lucide-react'
import { toast } from 'sonner'

type Visibility = 'private' | 'team' | 'department' | 'org'

type ShareView = {
  id: string
  targetType: 'user' | 'department' | 'role'
  targetId: string
  targetLabel: string
  targetSublabel?: string | null
  sharedBy: string | null
  sharedAt: string
}

type Options = {
  departments: { id: string; name: string; kind: string }[]
  roles: { id: string; title: string }[]
  users: { id: string; name: string | null; email: string }[]
}

const VIS_OPTIONS: { value: Visibility; label: string; hint: string; icon: any }[] = [
  { value: 'private', label: 'Private', hint: 'Only you', icon: Lock },
  { value: 'team', label: 'Team', hint: 'This workspace', icon: Users },
  { value: 'department', label: 'Department', hint: 'Linked department + cascade', icon: Building2 },
  { value: 'org', label: 'Organization', hint: 'Anyone in the org', icon: Globe },
]

export function RecordSharePanel({
  recordId,
  open,
  onOpenChange,
  onVisibilityChange,
}: {
  recordId: string
  open: boolean
  onOpenChange: (v: boolean) => void
  onVisibilityChange?: (v: Visibility) => void
}) {
  const [loading, setLoading] = useState(true)
  const [visibility, setVisibility] = useState<Visibility>('team')
  const [canManage, setCanManage] = useState(false)
  const [isEnterprise, setIsEnterprise] = useState(false)
  const [shares, setShares] = useState<ShareView[]>([])
  const [options, setOptions] = useState<Options>({ departments: [], roles: [], users: [] })

  const [addType, setAddType] = useState<'user' | 'department' | 'role'>('department')
  const [addTargetId, setAddTargetId] = useState('')
  const [filter, setFilter] = useState('')
  const [adding, setAdding] = useState(false)
  const [savingVis, setSavingVis] = useState(false)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/enterprise/records/${recordId}/shares`)
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          toast.error(data.error || 'Failed to load sharing settings')
          return
        }
        const data = await res.json()
        if (cancelled) return
        setVisibility(data.visibility)
        setCanManage(!!data.canManage)
        setIsEnterprise(!!data.isEnterprise)
        setShares(data.shares || [])
        setOptions(data.options || { departments: [], roles: [], users: [] })
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, recordId])

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) {
      if (addType === 'user') return options.users
      if (addType === 'department') return options.departments
      return options.roles
    }
    if (addType === 'user') {
      return options.users.filter((u) =>
        (u.name || '').toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
      )
    }
    if (addType === 'department') {
      return options.departments.filter((d) => d.name.toLowerCase().includes(q))
    }
    return options.roles.filter((r) => r.title.toLowerCase().includes(q))
  }, [filter, addType, options])

  const handleVisibility = async (next: Visibility) => {
    if (next === visibility) return
    setSavingVis(true)
    try {
      const res = await fetch(`/api/enterprise/records/${recordId}/visibility`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibility: next }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || 'Failed to update visibility')
        return
      }
      setVisibility(next)
      onVisibilityChange?.(next)
      toast.success(`Visibility → ${next}`)
    } finally {
      setSavingVis(false)
    }
  }

  const handleAdd = async () => {
    if (!addTargetId) return
    setAdding(true)
    try {
      const res = await fetch(`/api/enterprise/records/${recordId}/shares`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetType: addType, targetId: addTargetId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || 'Failed to share')
        return
      }
      // Re-fetch to get hydrated label
      const refresh = await fetch(`/api/enterprise/records/${recordId}/shares`)
      const data = await refresh.json()
      setShares(data.shares || [])
      setAddTargetId('')
      setFilter('')
      toast.success('Shared')
    } finally {
      setAdding(false)
    }
  }

  const handleRemove = async (shareId: string) => {
    const prev = shares
    setShares((s) => s.filter((x) => x.id !== shareId))
    try {
      const res = await fetch(
        `/api/enterprise/records/${recordId}/shares?shareId=${encodeURIComponent(shareId)}`,
        { method: 'DELETE' },
      )
      if (!res.ok) {
        setShares(prev)
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || 'Failed to remove')
      } else {
        toast.success('Removed')
      }
    } catch {
      setShares(prev)
      toast.error('Failed to remove')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-4 w-4" /> Share memory
          </DialogTitle>
          <DialogDescription className="text-xs">
            Control who can see this memory. Visibility is the default; explicit shares grant
            access beyond that.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-5">
            {/* Visibility selector */}
            <div>
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">
                Visibility
              </div>
              <div className="grid grid-cols-2 gap-2">
                {VIS_OPTIONS.map((opt) => {
                  const Icon = opt.icon
                  const active = visibility === opt.value
                  return (
                    <button
                      key={opt.value}
                      onClick={() => handleVisibility(opt.value)}
                      disabled={!canManage || savingVis}
                      className={`flex items-start gap-2 rounded-lg border p-2.5 text-left transition-colors ${
                        active
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'border-border hover:bg-muted/50'
                      } ${!canManage ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      <Icon className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-medium">{opt.label}</div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          {opt.hint}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Existing shares */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Shared with ({shares.length})
                </div>
              </div>
              {shares.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-2">
                  No explicit shares. Visibility above controls access.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {shares.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center gap-2 rounded-md border px-2.5 py-1.5"
                    >
                      <Badge variant="secondary" className="text-[10px] capitalize">
                        {s.targetType}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">{s.targetLabel}</div>
                        {s.targetSublabel && (
                          <div className="text-[10px] text-muted-foreground truncate">
                            {s.targetSublabel}
                          </div>
                        )}
                      </div>
                      {canManage && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleRemove(s.id)}
                          className="h-6 w-6"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add a share */}
            {canManage && isEnterprise && (
              <div className="border-t pt-4">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                  <UserPlus className="h-3 w-3" /> Add access
                </div>
                <div className="flex gap-2 mb-2">
                  <Select
                    value={addType}
                    onValueChange={(v) => {
                      setAddType(v as typeof addType)
                      setAddTargetId('')
                      setFilter('')
                    }}
                  >
                    <SelectTrigger className="w-32 h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="department" className="text-xs">Department</SelectItem>
                      <SelectItem value="role" className="text-xs">Role</SelectItem>
                      <SelectItem value="user" className="text-xs">User</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    placeholder={`Search ${addType}s…`}
                    className="flex-1 h-9 text-xs"
                  />
                </div>
                <div className="max-h-36 overflow-y-auto rounded-md border">
                  {filtered.length === 0 ? (
                    <div className="text-xs text-muted-foreground p-3 text-center">
                      No matches
                    </div>
                  ) : (
                    filtered.map((item: any) => {
                      const id = item.id
                      const label =
                        addType === 'user'
                          ? (item.name || item.email)
                          : addType === 'department'
                          ? item.name
                          : item.title
                      const sub =
                        addType === 'user' ? item.email :
                        addType === 'department' ? item.kind : null
                      const active = addTargetId === id
                      return (
                        <button
                          key={id}
                          onClick={() => setAddTargetId(id)}
                          className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-left hover:bg-muted transition-colors ${
                            active ? 'bg-primary/10' : ''
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium truncate">{label}</div>
                            {sub && (
                              <div className="text-[10px] text-muted-foreground truncate">
                                {sub}
                              </div>
                            )}
                          </div>
                          {active && <Badge variant="secondary" className="text-[10px]">Selected</Badge>}
                        </button>
                      )
                    })
                  )}
                </div>
                <div className="flex justify-end mt-2">
                  <Button size="sm" onClick={handleAdd} disabled={!addTargetId || adding}>
                    {adding ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <UserPlus className="h-3 w-3 mr-1" />}
                    Share
                  </Button>
                </div>
              </div>
            )}

            {!canManage && (
              <div className="flex items-start gap-2 text-[11px] text-muted-foreground bg-muted/30 rounded-md p-2.5">
                <Shield className="h-3 w-3 mt-0.5 shrink-0" />
                <span>
                  You can view this memory but not change its access. Ask the creator or an org
                  admin to share it further.
                </span>
              </div>
            )}

            {canManage && !isEnterprise && (
              <div className="flex items-start gap-2 text-[11px] text-muted-foreground bg-muted/30 rounded-md p-2.5">
                <Shield className="h-3 w-3 mt-0.5 shrink-0" />
                <span>
                  This memory lives in a non-enterprise workspace. Cross-department sharing
                  requires an org link.
                </span>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
