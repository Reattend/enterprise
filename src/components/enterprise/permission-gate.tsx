'use client'

import Link from 'next/link'
import { Loader2, ShieldOff } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { usePermission, type UsePermissionOptions } from '@/lib/enterprise/use-permission'
import type { Permission } from '@/lib/enterprise/permissions'

interface PermissionGateProps {
  orgId: string
  permission: Permission
  scope?: UsePermissionOptions
  /** Whether to show the access-denied card or render nothing when blocked. */
  fallback?: 'denied-card' | 'silent'
  /** Override the denied-card title (default uses the permission key). */
  deniedTitle?: string
  /** Override the denied-card message. */
  deniedDescription?: string
  children: React.ReactNode
}

/**
 * Wrap any admin page or section with this to hide it from users who lack
 * the required permission. Server still enforces — this is purely UX so
 * we don't show "Loading…" → 403 → blank.
 *
 * Usage:
 * ```
 * <PermissionGate orgId={orgId} permission="org.audit.read">
 *   <AuditLogContent />
 * </PermissionGate>
 * ```
 *
 * For dept-scoped permissions, pass scope: `{ departmentId }`.
 */
export function PermissionGate({
  orgId,
  permission,
  scope,
  fallback = 'denied-card',
  deniedTitle,
  deniedDescription,
  children,
}: PermissionGateProps) {
  const { allowed, loading } = usePermission(orgId, permission, scope)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!allowed) {
    if (fallback === 'silent') return null
    return (
      <Card className="p-8 text-center max-w-md mx-auto mt-8">
        <ShieldOff className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
        <h2 className="text-lg font-semibold mb-1">{deniedTitle || 'You don\'t have access to this'}</h2>
        <p className="text-sm text-muted-foreground mb-4">
          {deniedDescription || (
            <>This page requires the <code className="font-mono text-xs">{permission}</code> permission.
            Ask an admin to grant it to you, or to assign you a role that includes it.
            See <Link href="/docs/permissions" className="underline">permissions guide</Link>.</>
          )}
        </p>
        <Link href={`/app/admin/${orgId}`}>
          <Button variant="outline" size="sm">Back to overview</Button>
        </Link>
      </Card>
    )
  }

  return <>{children}</>
}
