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

export const useAppStore = create<AppState>((set) => ({
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
  setEnterpriseOrgs: (enterpriseOrgs) => set({ enterpriseOrgs }),
  // Always null on init (server + first client render agree). The StoreHydrator
  // component mounted in the app layout reads localStorage and calls
  // setActiveEnterpriseOrgId() after first mount, which flips hasHydratedStore.
  activeEnterpriseOrgId: null,
  setActiveEnterpriseOrgId: (id) => {
    if (typeof window !== 'undefined') {
      if (id) localStorage.setItem('active_enterprise_org_id', id)
      else localStorage.removeItem('active_enterprise_org_id')
    }
    set({ activeEnterpriseOrgId: id })
  },
  hasHydratedStore: false,
  setHasHydratedStore: (v) => set({ hasHydratedStore: v }),
}))
