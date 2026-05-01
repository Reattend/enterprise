// Tiny pub/sub for cross-component data invalidation.
//
// Why not SWR/React Query? Adding a query lib mid-project would mean
// rewriting every fetch hook. This is a minimal stop-gap: any mutation
// can broadcast a scope name, any consumer can subscribe and refetch.
//
// Usage:
//   - After mutating: emit('orgs')          // single scope
//   - After mutating: emit(['orgs','user']) // multiple scopes
//   - In a fetcher:   useRevalidate('orgs', fetchOrgs)
//
// `useRevalidate` also refetches when the tab regains focus, so a name
// changed in another tab/window propagates the next time the user
// returns to this one — without an explicit broadcast.

import { useEffect } from 'react'

type Scope = string

export function emit(scope: Scope | Scope[], detail?: unknown) {
  if (typeof window === 'undefined') return
  const scopes = Array.isArray(scope) ? scope : [scope]
  for (const s of scopes) {
    window.dispatchEvent(new CustomEvent(`reattend:updated:${s}`, { detail }))
  }
  // Wildcard channel so a debug listener can observe all updates.
  window.dispatchEvent(new CustomEvent('reattend:updated', { detail: { scopes, ...(detail as object || {}) } }))
}

export function listen(scope: Scope, handler: (detail?: unknown) => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const wrapper = (e: Event) => handler((e as CustomEvent).detail)
  window.addEventListener(`reattend:updated:${scope}`, wrapper)
  return () => window.removeEventListener(`reattend:updated:${scope}`, wrapper)
}

/**
 * Calls `refetch` whenever:
 *   - One of `scopes` is broadcast via `emit()`
 *   - The browser tab regains focus (debounced via the event itself)
 *   - The tab becomes visible after being hidden
 *
 * `refetch` should be wrapped in useCallback to avoid re-subscribing on
 * every render.
 */
export function useRevalidate(scopes: Scope | Scope[], refetch: () => void) {
  useEffect(() => {
    if (typeof window === 'undefined') return
    const list = Array.isArray(scopes) ? scopes : [scopes]
    const offs = list.map((s) => listen(s, refetch))
    const onFocus = () => refetch()
    const onVis = () => { if (document.visibilityState === 'visible') refetch() }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      offs.forEach((fn) => fn())
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [scopes, refetch]) // eslint-disable-line react-hooks/exhaustive-deps
}

// Convenience: fixed list of well-known scopes. Components can use
// any string but these centralize the names so we don't typo them.
export const SCOPES = {
  orgs: 'orgs',         // enterprise orgs / org name / role
  user: 'user',         // session user (name, email, avatar)
  teams: 'teams',       // departments + sub-teams
  memories: 'memories', // any record create/update/delete
  projects: 'projects', // project list
  chats: 'chats',       // recent chats sidebar
  inbox: 'inbox',       // inbox unread count
  policies: 'policies', // policy list
} as const
