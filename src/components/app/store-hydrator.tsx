'use client'

// Reads the pieces of app-store state that live in localStorage (which is
// only available on the client) and writes them into the store after first
// mount. Flips `hasHydratedStore` so pages that branch on these values can
// wait for a consistent client render instead of mismatching the server HTML.

import { useEffect } from 'react'
import { useAppStore } from '@/stores/app-store'

export function StoreHydrator() {
  const setActiveEnterpriseOrgId = useAppStore((s) => s.setActiveEnterpriseOrgId)
  const setHasHydratedStore = useAppStore((s) => s.setHasHydratedStore)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('active_enterprise_org_id')
      if (stored) setActiveEnterpriseOrgId(stored)
    } catch { /* no-op — private mode / SSR / etc. */ }
    setHasHydratedStore(true)
  }, [setActiveEnterpriseOrgId, setHasHydratedStore])

  return null
}
