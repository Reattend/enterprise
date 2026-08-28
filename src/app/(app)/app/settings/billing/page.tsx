'use client'

import Link from 'next/link'
import { KeyRound } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

// /app/settings/billing - legacy-no-org accounts only.
//
// Reattend is BYOK-only across the board as of the 2026-08-28 pivot: bring
// your own Anthropic/OpenAI/Gemini key and it's free forever, for personal
// accounts and orgs alike. There is no Reattend-hosted AI plan to buy, so
// there's nothing to check out - this page used to be a full Paddle
// checkout/subscription-management UI ($19/$29 per seat, 45-day trial,
// add-a-card flow) and has been replaced with a plain status page.
//
// Org accounts never reach this page at all - the sidebar hides "Billing &
// plan" whenever activeEnterpriseOrgId is set (org plan/AI-provider is
// Control-Room-only, admin-only - see ai-provider-section.tsx's identical
// reasoning). Anyone who does land here is a legacy pre-org account.
export default function BillingPage() {
  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
        <p className="text-sm text-muted-foreground mt-1">Reattend is free forever - bring your own AI key.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-primary" />
            Bring your own key
          </CardTitle>
          <CardDescription>
            Connect your own Anthropic, OpenAI, or Gemini key and Reattend runs on it - unlimited questions,
            unlimited retention, no seat cost, nothing billed by Reattend. Your own vendor bill is the only cost.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/app/settings">Manage your AI key</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Want Reattend to run the AI for you?</CardTitle>
          <CardDescription>
            Managed is for organizations - we provision and govern the key centrally, with admin-set rate limits.
            It&apos;s scoped per org, not self-serve. Create an organization to get started.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild>
            <Link href="/app/admin/onboarding">Create an organization</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
