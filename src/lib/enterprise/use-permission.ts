'use client'

import { useEffect, useState } from 'react'
import type { Permission, PermissionSnapshot } from './permissions'

// In-memory cache keyed by orgId. Single in-flight promise per org so a page
// with 20 buttons that all call usePermission() only fires one network call.
// Cache is per-tab and lives for the session - clear on workspace switch by
// calling clearPermissionCache(orgId).
const cache = new Map<string, PermissionSnapshot>()
const inflight = new Map<string, Promise<PermissionSnapshot | null>>()

async function loadSnapshot(orgId: string): Promise<PermissionSnapshot | null> {
  if (cache.has(orgId)) return cache.get(orgId)!
  if (inflight.has(orgId)) return inflight.get(orgId)!

  const p = (async () => {
    try {
      const res = await fetch(`/api/enterprise/organizations/${orgId}/permissions/me`)
      if (!res.ok) return null
      const snapshot = (await res.json()) as PermissionSnapshot
      cache.set(orgId, snapshot)
      return snapshot
    } catch {
      return null
    } finally {
      inflight.delete(orgId)
    }
  })()
  inflight.set(orgId, p)
  return p
}

export function clearPermissionCache(orgId?: string) {
  if (orgId) {
    cache.delete(orgId)
    inflight.delete(orgId)
  } else {
    cache.clear()
    inflight.clear()
  }
}

export interface UsePermissionOptions {
  /** Department this action targets - required for any 'own_dept' grant */
  departmentId?: string | null
  /** Creator of the resource - required for any 'own_record' grant */
  recordCreatorUserId?: string | null
}

interface UsePermissionResult {
  /** True only when the snapshot has loaded AND the user has the permission */
  allowed: boolean
  /** True while the initial fetch is pending - UI can show a skeleton */
  loading: boolean
  /** The cached snapshot, useful if you need multiple checks at once */
  snapshot: PermissionSnapshot | null
}

/**
 * Returns whether the current user has the given permission in the given org.
 *
 * **Defense in depth only.** This hook hides UI to avoid showing buttons that
 * would 403 - the API server is still the source of truth. A permission
 * change in the DB takes effect on the server immediately, but the UI stays
 * stale until the next snapshot fetch (or page reload).
 *
 * Returns `{ allowed: false }` while loading so buttons stay hidden until
 * we know - fail-closed beats fail-open.
 *
 * Usage:
 * ```
 * const { allowed: canManage } = usePermission(orgId, 'decisions.manage', { departmentId })
 * if (!canManage) return null
 * return <Button>New decision</Button>
 * ```
 */
export function usePermission(
  orgId: string | null | undefined,
  permission: Permission,
  opts: UsePermissionOptions = {},
): UsePermissionResult {
  const [snapshot, setSnapshot] = useState<PermissionSnapshot | null>(orgId ? cache.get(orgId) ?? null : null)
  const [loading, setLoading] = useState<boolean>(orgId ? !cache.has(orgId) : false)

  useEffect(() => {
    if (!orgId) { setSnapshot(null); setLoading(false); return }
    if (cache.has(orgId)) {
      setSnapshot(cache.get(orgId)!)
      setLoading(false)
      return
    }
    setLoading(true)
    let alive = true
    loadSnapshot(orgId).then((s) => {
      if (!alive) return
      setSnapshot(s)
      setLoading(false)
    })
    return () => { alive = false }
  }, [orgId])

  if (!snapshot) return { allowed: false, loading, snapshot: null }

  // Org-wide grant covers anywhere
  if (snapshot.orgWide.includes(permission)) {
    return { allowed: true, loading: false, snapshot }
  }
  // Dept-scoped grant - must match the dept the action targets
  if (opts.departmentId && snapshot.byDepartment[opts.departmentId]?.includes(permission)) {
    return { allowed: true, loading: false, snapshot }
  }
  // own_record handled implicitly: members get records.* for own records
  // which the server enforces. The hook can't see record ownership without
  // a round-trip, so for "Edit my own record" buttons, gate on the JSX side
  // (e.g. `record.createdBy === userId || canManage`) instead of relying on
  // the hook alone.

  return { allowed: false, loading: false, snapshot }
}

/**
 * Imperative variant - returns a function you can call repeatedly without
 * triggering re-renders. Useful for menu builders that decide visibility
 * for many items at once.
 */
export function usePermissionChecker(orgId: string | null | undefined): {
  loading: boolean
  snapshot: PermissionSnapshot | null
  check: (permission: Permission, opts?: UsePermissionOptions) => boolean
  /** True if the user has the permission ANYWHERE - org-wide OR in at least
   *  one dept they manage. Use this to decide whether to show a "+ Create"
   *  button when the dept will be picked inside the form. */
  hasAnywhere: (permission: Permission) => boolean
} {
  const [snapshot, setSnapshot] = useState<PermissionSnapshot | null>(orgId ? cache.get(orgId) ?? null : null)
  const [loading, setLoading] = useState<boolean>(orgId ? !cache.has(orgId) : false)

  useEffect(() => {
    if (!orgId) { setSnapshot(null); setLoading(false); return }
    if (cache.has(orgId)) { setSnapshot(cache.get(orgId)!); setLoading(false); return }
    setLoading(true)
    let alive = true
    loadSnapshot(orgId).then((s) => {
      if (!alive) return
      setSnapshot(s); setLoading(false)
    })
    return () => { alive = false }
  }, [orgId])

  return {
    loading,
    snapshot,
    check: (permission, opts = {}) => {
      if (!snapshot) return false
      if (snapshot.orgWide.includes(permission)) return true
      if (opts.departmentId && snapshot.byDepartment[opts.departmentId]?.includes(permission)) return true
      return false
    },
    hasAnywhere: (permission) => {
      if (!snapshot) return false
      if (snapshot.orgWide.includes(permission)) return true
      for (const deptId of Object.keys(snapshot.byDepartment)) {
        if (snapshot.byDepartment[deptId].includes(permission)) return true
      }
      return false
    },
  }
}
