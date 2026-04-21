'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Shield, Key, AlertCircle, Check, Save, Copy, ExternalLink, Trash2, Info,
} from 'lucide-react'

type Provider = 'azure_ad' | 'okta' | 'google_workspace' | 'saml_generic' | 'oidc_generic'

interface SsoConfig {
  id: string
  organizationId: string
  provider: Provider
  domain: string
  clientId: string | null
  clientSecretEncrypted: string | null
  hasSecret?: boolean
  tenantId: string | null
  metadataUrl: string | null
  acsUrl: string | null
  entityId: string | null
  enabled: boolean
  justInTimeProvisioning: boolean
  defaultRole: 'member' | 'guest'
  createdAt: string
  updatedAt: string
}

interface Org {
  id: string
  slug: string
  primaryDomain: string | null
}

const PROVIDER_META: Record<Provider, { label: string; docsUrl: string }> = {
  azure_ad: { label: 'Microsoft Entra ID (Azure AD)', docsUrl: 'https://learn.microsoft.com/azure/active-directory/saas-apps/' },
  okta: { label: 'Okta', docsUrl: 'https://help.okta.com/en-us/Content/Topics/Apps/apps-about-saml.htm' },
  google_workspace: { label: 'Google Workspace', docsUrl: 'https://support.google.com/a/answer/6087519' },
  saml_generic: { label: 'Generic SAML 2.0', docsUrl: '' },
  oidc_generic: { label: 'Generic OIDC', docsUrl: '' },
}

export default function SsoPage({ params }: { params: { orgId: string } }) {
  const { orgId } = params
  const [org, setOrg] = useState<Org | null>(null)
  const [cfg, setCfg] = useState<SsoConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const [provider, setProvider] = useState<Provider>('azure_ad')
  const [domain, setDomain] = useState('')
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [tenantId, setTenantId] = useState('')
  const [metadataUrl, setMetadataUrl] = useState('')
  const [entityId, setEntityId] = useState('')
  const [acsUrl, setAcsUrl] = useState('')
  const [enabled, setEnabled] = useState(false)
  const [justInTime, setJustInTime] = useState(true)
  const [defaultRole, setDefaultRole] = useState<'member' | 'guest'>('member')

  async function load() {
    setErr(null)
    const [oRes, sRes] = await Promise.all([
      fetch(`/api/enterprise/organizations/${orgId}`),
      fetch(`/api/enterprise/organizations/${orgId}/sso`),
    ])
    if (!oRes.ok) {
      setErr((await oRes.json().catch(() => ({ error: 'failed' }))).error || 'failed')
      setLoading(false)
      return
    }
    const oBody = await oRes.json()
    setOrg(oBody.organization)
    if (sRes.ok) {
      const sBody = await sRes.json()
      const s: SsoConfig | null = sBody.sso
      setCfg(s)
      if (s) {
        setProvider(s.provider)
        setDomain(s.domain)
        setClientId(s.clientId ?? '')
        setTenantId(s.tenantId ?? '')
        setMetadataUrl(s.metadataUrl ?? '')
        setEntityId(s.entityId ?? '')
        setAcsUrl(s.acsUrl ?? '')
        setEnabled(s.enabled)
        setJustInTime(s.justInTimeProvisioning)
        setDefaultRole(s.defaultRole)
      } else if (oBody.organization?.primaryDomain) {
        setDomain(oBody.organization.primaryDomain)
      }
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [orgId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    setSaving(true)
    setErr(null)
    setNotice(null)
    try {
      const res = await fetch(`/api/enterprise/organizations/${orgId}/sso`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          domain,
          clientId: clientId || null,
          // Only send secret field if user typed a new one (empty = keep existing)
          ...(clientSecret ? { clientSecret } : {}),
          tenantId: tenantId || null,
          metadataUrl: metadataUrl || null,
          entityId: entityId || null,
          acsUrl: acsUrl || null,
          enabled,
          justInTimeProvisioning: justInTime,
          defaultRole,
        }),
      })
      const body = await res.json().catch(() => ({ error: 'failed' }))
      if (!res.ok) {
        setErr(body.error || 'failed')
        return
      }
      setNotice('SSO configuration saved.')
      setTimeout(() => setNotice(null), 4000)
      setClientSecret('') // clear so we don't re-send
      await load()
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!confirm('Delete SSO configuration? Users will fall back to email/OTP login.')) return
    await fetch(`/api/enterprise/organizations/${orgId}/sso`, { method: 'DELETE' })
    setCfg(null)
    setEnabled(false)
    await load()
  }

  function copy(s: string) {
    navigator.clipboard.writeText(s)
    setNotice('Copied to clipboard.')
    setTimeout(() => setNotice(null), 2000)
  }

  if (loading) return <Card className="p-8 text-sm text-muted-foreground text-center">Loading SSO config…</Card>

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const metadataLink = org ? `${origin}/api/enterprise/sso/${org.slug}/metadata` : ''
  const defaultEntityId = org ? `${origin}/api/enterprise/sso/${org.slug}` : ''
  const defaultAcsUrl = org ? `${origin}/api/enterprise/sso/${org.slug}/acs` : ''

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h2 className="font-display text-3xl tracking-tight flex items-center gap-3">
          <Shield className="h-6 w-6 text-primary" />
          Single Sign-On
        </h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Configure SSO so your team logs in with their existing identity provider. Currently supported: Microsoft Entra ID, Okta, Google Workspace, generic SAML 2.0, generic OIDC.
        </p>
      </div>

      {err && (
        <div className="flex items-center gap-2 text-sm text-destructive border border-destructive/30 bg-destructive/10 rounded p-2">
          <AlertCircle className="h-4 w-4" />
          {err}
        </div>
      )}
      {notice && (
        <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 rounded p-2">
          <Check className="h-4 w-4" />
          {notice}
        </div>
      )}

      {/* Step 1: SP details (to give the IdP admin) */}
      <Card className="p-5">
        <div className="flex items-start gap-3 mb-4 pb-3 border-b border-border">
          <Info className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold">Step 1 — Give these to your IdP admin</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              They use these values to configure the trust on their end (Azure AD, Okta, etc.).
            </p>
          </div>
        </div>
        <CopyRow label="SP metadata URL" value={metadataLink} onCopy={copy} />
        <CopyRow label="Entity ID (default)" value={defaultEntityId} onCopy={copy} />
        <CopyRow label="Assertion Consumer URL (ACS)" value={defaultAcsUrl} onCopy={copy} />
        <div className="text-xs text-muted-foreground mt-3">
          <a href={metadataLink} target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
            Preview metadata XML <ExternalLink className="h-3 w-3" />
          </a>
          <span className="ml-2">(works once SSO is enabled below)</span>
        </div>
      </Card>

      {/* Step 2: IdP-side details (we store these) */}
      <Card className="p-5">
        <div className="flex items-start gap-3 mb-4 pb-3 border-b border-border">
          <Key className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold">Step 2 — Paste your IdP details here</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              After the IdP admin configures the trust, they give you these values.
            </p>
          </div>
        </div>
        <div className="space-y-3">
          <Field label="Provider">
            <select
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={provider}
              onChange={(e) => setProvider(e.target.value as Provider)}
            >
              {Object.entries(PROVIDER_META).map(([k, m]) => (
                <option key={k} value={k}>{m.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Email domain" hint="The domain that should trigger SSO login (e.g. acme.com).">
            <Input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="acme.com" />
          </Field>
          {provider === 'azure_ad' && (
            <Field label="Azure AD Tenant ID">
              <Input value={tenantId} onChange={(e) => setTenantId(e.target.value)} placeholder="00000000-0000-0000-0000-000000000000" />
            </Field>
          )}
          {(provider === 'azure_ad' || provider === 'oidc_generic' || provider === 'okta') && (
            <>
              <Field label="Client ID">
                <Input value={clientId} onChange={(e) => setClientId(e.target.value)} />
              </Field>
              <Field
                label="Client Secret"
                hint={cfg?.hasSecret ? 'A secret is already stored. Leave blank to keep; paste a new one to rotate.' : 'Stored encrypted at rest.'}
              >
                <Input
                  type="password"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  placeholder={cfg?.hasSecret ? '••••••••' : 'client-secret-value'}
                />
              </Field>
            </>
          )}
          {(provider === 'saml_generic' || provider === 'azure_ad' || provider === 'okta') && (
            <Field label="IdP Metadata URL">
              <Input value={metadataUrl} onChange={(e) => setMetadataUrl(e.target.value)} placeholder="https://login.microsoftonline.com/.../FederationMetadata.xml" />
            </Field>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Override Entity ID (optional)">
              <Input value={entityId} onChange={(e) => setEntityId(e.target.value)} placeholder={defaultEntityId} />
            </Field>
            <Field label="Override ACS URL (optional)">
              <Input value={acsUrl} onChange={(e) => setAcsUrl(e.target.value)} placeholder={defaultAcsUrl} />
            </Field>
          </div>
        </div>
      </Card>

      {/* Step 3: Provisioning + enable */}
      <Card className="p-5">
        <div className="flex items-start gap-3 mb-4 pb-3 border-b border-border">
          <Shield className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold">Step 3 — Provisioning & activation</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              How new users are handled when they sign in via SSO.
            </p>
          </div>
        </div>
        <div className="space-y-3">
          <label className="flex items-start gap-3 p-3 border border-border rounded-lg hover:bg-muted/30 cursor-pointer">
            <input
              type="checkbox"
              checked={justInTime}
              onChange={(e) => setJustInTime(e.target.checked)}
              className="mt-0.5"
            />
            <div>
              <div className="text-sm font-medium">Just-in-time provisioning</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                When a user from your IdP signs in for the first time, auto-create their account and add them to this org.
                When off, only users with existing invites can sign in.
              </div>
            </div>
          </label>

          <Field label="Default role for JIT-provisioned users">
            <select
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={defaultRole}
              onChange={(e) => setDefaultRole(e.target.value as 'member' | 'guest')}
            >
              <option value="member">Member</option>
              <option value="guest">Guest (read-only)</option>
            </select>
          </Field>

          <label className="flex items-start gap-3 p-3 border border-primary/30 bg-primary/5 rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="mt-0.5"
            />
            <div>
              <div className="text-sm font-medium">Enable SSO</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Activates the SSO login flow for users on the <span className="font-mono">{domain || 'domain'}</span> email domain.
                The SP metadata URL becomes accessible to your IdP.
              </div>
            </div>
          </label>
        </div>
      </Card>

      {/* Status + actions */}
      {cfg && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          Saved: {new Date(cfg.updatedAt).toLocaleString()} ·
          <span className={cfg.enabled ? 'text-emerald-600 dark:text-emerald-400' : ''}>
            {cfg.enabled ? 'Enabled' : 'Draft (not enabled)'}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between sticky bottom-0 bg-background/80 backdrop-blur-md py-3 -mx-3 px-3 border-t border-border">
        {cfg ? (
          <Button variant="outline" onClick={remove} className="text-rose-600 dark:text-rose-400 border-rose-500/30">
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Remove SSO
          </Button>
        ) : (
          <span />
        )}
        <Button onClick={save} disabled={saving || !domain.trim()}>
          <Save className="h-3.5 w-3.5 mr-1" />
          {saving ? 'Saving…' : cfg ? 'Update SSO' : 'Save SSO'}
        </Button>
      </div>

      {/* Implementation note */}
      <Card className="p-4 bg-muted/30">
        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <div>
            <div className="font-medium text-foreground mb-1">Implementation status</div>
            <p>
              Configuration storage + SP metadata endpoint are live. The SAML/OIDC auth callback (ACS) is scaffolded.
              To complete the handshake, we integrate <code className="px-1 rounded bg-background text-[11px]">@node-saml/node-saml</code> or{' '}
              <code className="px-1 rounded bg-background text-[11px]">openid-client</code> in the login flow — this requires testing against a real IdP tenant
              and is the next step after your first enterprise pilot customer is ready.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-medium block mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  )
}

function CopyRow({ label, value, onCopy }: { label: string; value: string; onCopy: (s: string) => void }) {
  return (
    <div className="flex items-center gap-2 py-2 border-b border-border last:border-0">
      <div className="text-xs text-muted-foreground w-36 shrink-0">{label}</div>
      <code className="flex-1 min-w-0 text-xs truncate font-mono bg-muted/50 px-2 py-1 rounded">{value || '—'}</code>
      <button
        onClick={() => value && onCopy(value)}
        className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground"
        title="Copy"
      >
        <Copy className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
