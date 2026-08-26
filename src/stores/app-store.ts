import { create } from 'zustand'

interface SubscriptionState {
  plan: 'normal' | 'smart'
  isSmartActive: boolean
  isTrialing: boolean
  trialDaysLeft: number
  aiQueriesUsed: number
  aiQueriesLimit: number | null
}

interface WorkspaceItem {
  id: string
  name: string
  type: string
  role: string
}

interface ChatSessionItem {
  id: string
  title: string
  updatedAt: string
}

interface AppState {
  // Sidebar
  sidebarOpen: boolean
  sidebarCollapsed: boolean
  mobileSidebarOpen: boolean
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setMobileSidebarOpen: (open: boolean) => void

  // Workspace
  currentWorkspaceId: string | null
  setCurrentWorkspaceId: (id: string) => void
  workspaceName: string | null
  workspaceType: 'personal' | 'team' | null
  setWorkspaceInfo: (name: string, type: 'personal' | 'team') => void
  allWorkspaces: WorkspaceItem[]
  setAllWorkspaces: (ws: WorkspaceItem[]) => void

  // Ask panel
  askOpen: boolean
  setAskOpen: (open: boolean) => void
  askInitialQuestion: string | null
  setAskInitialQuestion: (q: string | null) => void

  // Inbox panel
  inboxPanelOpen: boolean
  setInboxPanelOpen: (open: boolean) => void

  // Command palette
  commandOpen: boolean
  setCommandOpen: (open: boolean) => void

  // Create team modal (shared between topbar and onboarding)
  createTeamOpen: boolean
  setCreateTeamOpen: (open: boolean) => void

  // Universal capture drawer (opens from anywhere via sidebar + shortcuts)
  captureOpen: boolean
  setCaptureOpen: (open: boolean) => void

  // Invite modal (shared between topbar dropdown and sidebar)
  inviteOpen: boolean
  setInviteOpen: (open: boolean) => void

  // Subscription
  subscription: SubscriptionState | null
  setSubscription: (sub: SubscriptionState | null) => void

  // Recent chats (sidebar)
  recentChats: ChatSessionItem[]
  setRecentChats: (chats: ChatSessionItem[]) => void
  upsertRecentChat: (chat: ChatSessionItem) => void
  removeRecentChat: (id: string) => void

  // Inbox unread count
  inboxUnread: number
  setInboxUnread: (count: number) => void
  inboxBannerDismissed: boolean
  setInboxBannerDismissed: (dismissed: boolean) => void

  // Onboarding
  onboardingCompleted: boolean | null
  setOnboardingCompleted: (completed: boolean) => void

  // Enterprise orgs (list the user belongs to)
  enterpriseOrgs: EnterpriseOrgMembership[]
  setEnterpriseOrgs: (orgs: EnterpriseOrgMembership[]) => void
  activeEnterpriseOrgId: string | null
  setActiveEnterpriseOrgId: (id: string | null) => void
  // True once the layout's /api/enterprise/organizations fetch has resolved
  // at least once. Pages dispatching between org/no-org renders should
  // gate on this - without it, real org users briefly see the no-org
  // (Solo) experience while the fetch is in flight.
  enterpriseOrgsLoaded: boolean
  setEnterpriseOrgsLoaded: (v: boolean) => void
  // False during SSR and until the client hydrator component mounts. Pages
  // that branch on activeEnterpriseOrgId should render a neutral loading
  // state while this is false, otherwise the server HTML (null orgId) won't
  // match the client render (localStorage orgId).
  hasHydratedStore: boolean
  setHasHydratedStore: (v: boolean) => void
}

export interface EnterpriseOrgMembership {
  orgId: string
  orgName: string
  orgSlug: string
  orgPlan: string
  orgDeployment: string
  role: 'super_admin' | 'admin' | 'member' | 'guest'
}

export const useAppStore = create<AppState>((set, get) => ({
  sidebarOpen: true,
  sidebarCollapsed: false,
  mobileSidebarOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),

  currentWorkspaceId: null,
  setCurrentWorkspaceId: (id) => set({ currentWorkspaceId: id }),
  workspaceName: null,
  workspaceType: null,
  setWorkspaceInfo: (name, type) => set({ workspaceName: name, workspaceType: type }),
  allWorkspaces: [],
  setAllWorkspaces: (allWorkspaces) => set({ allWorkspaces }),

  askOpen: false,
  setAskOpen: (open) => set({ askOpen: open }),
  askInitialQuestion: null,
  setAskInitialQuestion: (askInitialQuestion) => set({ askInitialQuestion }),

  inboxPanelOpen: false,
  setInboxPanelOpen: (open) => set({ inboxPanelOpen: open }),

  commandOpen: false,
  setCommandOpen: (open) => set({ commandOpen: open }),

  createTeamOpen: false,
  setCreateTeamOpen: (open) => set({ createTeamOpen: open }),

  captureOpen: false,
  setCaptureOpen: (open) => set({ captureOpen: open }),

  inviteOpen: false,
  setInviteOpen: (open) => set({ inviteOpen: open }),

  subscription: null,
  setSubscription: (subscription) => set({ subscription }),

  recentChats: [],
  setRecentChats: (recentChats) => set({ recentChats }),
  upsertRecentChat: (chat) => set((s) => {
    const without = s.recentChats.filter(c => c.id !== chat.id)
    return { recentChats: [chat, ...without].slice(0, 30) }
  }),
  removeRecentChat: (id) => set((s) => ({ recentChats: s.recentChats.filter(c => c.id !== id) })),

  inboxUnread: 0,
  setInboxUnread: (inboxUnread) => set({ inboxUnread }),
  inboxBannerDismissed: false,
  setInboxBannerDismissed: (inboxBannerDismissed) => set({ inboxBannerDismissed }),

  onboardingCompleted: null,
  setOnboardingCompleted: (onboardingCompleted) => set({ onboardingCompleted }),

  enterpriseOrgs: [],
  // Self-heals a stale activeEnterpriseOrgId every time the REAL org list
  // loads. localStorage isn't scoped per-account - StoreHydrator restores
  // active_enterprise_org_id on mount straight from localStorage, so a
  // value left over from a *different* login on this same browser (or a
  // since-deleted org) survives into a brand new session untouched. Every
  // consumer used to trust `activeEnterpriseOrgId` truthiness on its own
  // (page.tsx's org-dashboard branch, sidebar's Control Room button) -
  // that's how a deleted-account's leftover org id made a fresh signup
  // render a phantom "your organization" dashboard instead of either
  // Personal or the onboarding redirect. Fixed at the source instead of
  // patching every read site: the moment we know the CURRENT user's real
  // memberships, cross-check and clear if it doesn't match. See today.md
  // 2026-08-26.
  setEnterpriseOrgs: (enterpriseOrgs) => {
    set({ enterpriseOrgs })
    const current = get().activeEnterpriseOrgId
    if (current && !enterpriseOrgs.some((o) => o.orgId === current)) {
      get().setActiveEnterpriseOrgId(null)
    }
  },
  enterpriseOrgsLoaded: false,
  setEnterpriseOrgsLoaded: (v) => set({ enterpriseOrgsLoaded: v }),
  // Always null on init (server + first client render agree). The StoreHydrator
  // component mounted in the app layout reads localStorage and calls
  // setActiveEnterpriseOrgId() after first mount, which flips hasHydratedStore.
  activeEnterpriseOrgId: null,
  setActiveEnterpriseOrgId: (id) => {
    if (typeof window !== 'undefined') {
      if (id) localStorage.setItem('active_enterprise_org_id', id)
      else localStorage.removeItem('active_enterprise_org_id')
      // Marker the layout reads to decide whether to auto-pick the first
      // org on mount. Without this, the layout's auto-pick would override
      // a deliberate "Personal" choice (id=null) with the first org each
      // time fetchOrgs runs. Set on every explicit call - covers both
      // picking an org and picking Personal.
      localStorage.setItem('view_context_chosen', '1')
      // Mirror the pick to the server so the desktop app, Chrome extension,
      // and other web tabs read the same context. Best-effort: a network
      // failure here just means the choice doesn't sync - local state
      // (the localStorage marker above) still works.
      const body = id
        ? { context: 'org' as const, orgId: id }
        : { context: 'personal' as const }
      fetch('/api/me/active-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).catch(() => { /* silent - non-critical */ })
    }
    set({ activeEnterpriseOrgId: id })
  },
  hasHydratedStore: false,
  setHasHydratedStore: (v) => set({ hasHydratedStore: v }),
}))
