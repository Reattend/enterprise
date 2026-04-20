import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import { db, schema } from '../db'
import { eq, and } from 'drizzle-orm'
import { cookies } from 'next/headers'
import { sendWelcomeEmail } from '../email'

/**
 * Find or create a user + workspace + subscription.
 * Shared by OTP and Google OAuth flows.
 */
async function findOrCreateUser(email: string, name?: string, avatarUrl?: string) {
  let user = await db.query.users.findFirst({
    where: eq(schema.users.email, email),
  })

  if (!user) {
    const userId = crypto.randomUUID()
    const workspaceId = crypto.randomUUID()

    await db.insert(schema.users).values({
      id: userId,
      email,
      name: name || email.split('@')[0],
      avatarUrl: avatarUrl || null,
    })

    await db.insert(schema.workspaces).values({
      id: workspaceId,
      name: 'Personal',
      type: 'personal',
      createdBy: userId,
    })

    await db.insert(schema.workspaceMembers).values({
      workspaceId,
      userId,
      role: 'owner',
    })

    await db.insert(schema.projects).values({
      workspaceId,
      name: 'Unassigned',
      description: 'Memories not yet assigned to a project',
      isDefault: true,
      color: '#94a3b8',
    })

    await db.insert(schema.subscriptions).values({
      userId,
      planKey: 'normal',
      status: 'active',
    })

    user = await db.query.users.findFirst({
      where: eq(schema.users.id, userId),
    })

    // Fire-and-forget welcome email
    sendWelcomeEmail(email, name || email.split('@')[0])
  } else if (avatarUrl && !user.avatarUrl) {
    // Update avatar if not set (e.g. user first used OTP, now signing in with Google)
    await db.update(schema.users)
      .set({ avatarUrl })
      .where(eq(schema.users.id, user.id))
  }

  return user!
}

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  trustHost: true,
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/login',
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: { prompt: 'select_account' },
      },
    }),
    CredentialsProvider({
      id: 'otp',
      name: 'Email OTP',
      credentials: {
        email: { label: 'Email', type: 'email' },
        code: { label: 'OTP Code', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.code) return null

        const email = (credentials.email as string).toLowerCase().trim()
        const code = credentials.code as string

        // Find valid OTP
        const otp = await db.query.otpCodes.findFirst({
          where: and(
            eq(schema.otpCodes.email, email),
            eq(schema.otpCodes.code, code),
            eq(schema.otpCodes.used, false),
          ),
        })

        if (!otp) return null
        if (new Date(otp.expiresAt) < new Date()) return null

        // Mark OTP as used
        await db.update(schema.otpCodes)
          .set({ used: true })
          .where(eq(schema.otpCodes.id, otp.id))

        const user = await findOrCreateUser(email)

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.avatarUrl,
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // For Google OAuth: ensure user + workspace exist in our DB
      if (account?.provider === 'google' && user.email) {
        const dbUser = await findOrCreateUser(
          user.email.toLowerCase().trim(),
          user.name || undefined,
          user.image || undefined,
        )
        // Override the user.id with our DB user ID
        user.id = dbUser.id
      }
      return true
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string
      }
      return session
    },
  },
})

export async function requireAuth() {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  const cookieStore = await cookies()
  const activeWorkspaceId = cookieStore.get('workspace_id')?.value

  let membership
  if (activeWorkspaceId) {
    membership = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(schema.workspaceMembers.userId, session.user.id),
        eq(schema.workspaceMembers.workspaceId, activeWorkspaceId),
      ),
    })
  }

  if (!membership) {
    membership = await db.query.workspaceMembers.findFirst({
      where: eq(schema.workspaceMembers.userId, session.user.id),
    })
  }

  // If somehow a user reached here without a workspace, it means
  // findOrCreateUser never ran (or failed). Throw loudly — do NOT lazy-create,
  // because that creates half-baked state (workspace without projects).
  // Proper bootstrap happens in findOrCreateUser on signup.
  if (!membership) {
    throw new Error('No workspace found — run findOrCreateUser on signup')
  }

  return {
    userId: session.user.id,
    workspaceId: membership.workspaceId,
    role: membership.role,
    session,
  }
}

export async function requireRole(minRole: 'member' | 'admin' | 'owner') {
  const authResult = await requireAuth()
  const roleHierarchy = { member: 0, admin: 1, owner: 2 }
  if (roleHierarchy[authResult.role as keyof typeof roleHierarchy] < roleHierarchy[minRole]) {
    throw new Error('Forbidden')
  }
  return authResult
}

export async function getUserSubscription(userId: string) {
  const subscription = await db.query.subscriptions.findFirst({
    where: eq(schema.subscriptions.userId, userId),
  })

  if (!subscription) {
    return {
      plan: 'normal' as const,
      isSmartActive: false,
      isTrialing: false,
      trialDaysLeft: 0,
      status: 'active' as const,
      trialEndsAt: null as string | null,
      renewsAt: null as string | null,
      paddleSubscriptionId: null as string | null,
    }
  }

  const isTrialing = subscription.status === 'trialing'
    && subscription.trialEndsAt
    && new Date(subscription.trialEndsAt) > new Date()

  const isActive = subscription.status === 'active'
  const isSmartActive = subscription.planKey === 'smart' && (!!isTrialing || isActive)

  const trialDaysLeft = subscription.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(subscription.trialEndsAt).getTime() - Date.now()) / 86400000))
    : 0

  return {
    plan: subscription.planKey as 'normal' | 'smart',
    isSmartActive,
    isTrialing: !!isTrialing,
    trialDaysLeft,
    status: subscription.status,
    trialEndsAt: subscription.trialEndsAt,
    renewsAt: subscription.renewsAt,
    paddleSubscriptionId: subscription.paddleSubscriptionId,
  }
}

export async function requireSmartMemories() {
  const authResult = await requireAuth()
  const subscription = await getUserSubscription(authResult.userId)

  if (!subscription.isSmartActive) {
    throw new Error('SmartMemoriesRequired')
  }

  return { ...authResult, subscription }
}
