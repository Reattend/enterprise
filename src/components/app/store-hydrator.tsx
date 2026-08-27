'use client'

// Reads the pieces of app-store state that live in localStorage (which is
// only available on the client) and writes them into the store after first
// mount. Flips `hasHydratedStore` so pages that branch on these values can
// wait for a consistent client render instead of mismatching the server HTML.

import { useEffect } from 'react'
import { useAppStore } from '@/stores/app-store'

export function StoreHydrator() {
  // hydrateActiveEnterpriseOrgId (not setActiveEnterpriseOrgId) deliberately -
  // this is reading back a value we're not validating yet, so it shouldn't
  // fire a POST to /api/me/active-context or rewrite localStorage with what
  // we just read from it. The full setter's side effects assume the id is
  // already known-good; that assumption is exactly what caused a stale org
  // id to both 403 on that POST *and* win a race against the self-heal in
  // setEnterpriseOrgs (app-store.ts) before it had a chance to clear a bad
  // value. See today.md 2026-08-26.
  const hydrateActiveEnterpriseOrgId = useAppStore((s) => s.hydrateActiveEnterpriseOrgId)
  const setHasHydratedStore = useAppStore((s) => s.setHasHydratedStore)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('active_enterprise_org_id')
      if (stored) hydrateActiveEnterpriseOrgId(stored)
    } catch { /* no-op - private mode / SSR / etc. */ }
    setHasHydratedStore(true)
  }, [hydrateActiveEnterpriseOrgId, setHasHydratedStore])

  return null
}
