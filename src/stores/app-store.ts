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
}))
