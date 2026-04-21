// Catalog of Nango-powered providers we support.
//
// `providerConfigKey` must match an integration key set up in the Nango
// dashboard (self-hosted or SaaS). The `models` field lists the sync model
// names our webhook handler knows how to normalize — one entry per model.
//
// Adding a new provider is:
//   1. Configure it in Nango (OAuth credentials + a sync script)
//   2. Register it here with the provider key used in Nango
//   3. Write a normalizer in ./providers/<key>.ts that turns Nango records
//      into our raw_items rows

export interface NangoProviderDef {
  key: string               // our local integrations_catalog key, e.g. "gmail-nango"
  providerConfigKey: string // Nango dashboard provider config key, e.g. "google-mail"
  name: string              // user-facing label
  category: 'email' | 'docs' | 'chat' | 'wiki' | 'calendar' | 'files' | 'other'
  description: string
  iconHint: string          // e.g. "gmail" — UI maps this to its SVG
  // Sync models the provider publishes. Every event whose model name appears
  // here is handed to the normalizer. Unlisted models are ignored.
  models: string[]
  // How aggressive the default triage should be. 'high' = most things become
  // records (e.g. policy docs); 'medium' = filtered (only things that look
  // like decisions / insights); 'low' = everything lands in raw_items but
  // triage rarely promotes (e.g. chat noise).
  triageAggressiveness: 'high' | 'medium' | 'low'
}

export const NANGO_PROVIDERS: NangoProviderDef[] = [
  {
    key: 'gmail-nango',
    providerConfigKey: 'google-mail',
    name: 'Gmail',
    category: 'email',
    description: 'Pull threads from Gmail. Decisions, approvals, and policy discussions get captured automatically.',
    iconHint: 'gmail',
    models: ['GmailEmail', 'Email'],
    triageAggressiveness: 'medium',
  },
  {
    key: 'google-drive-nango',
    providerConfigKey: 'google-drive',
    name: 'Google Drive',
    category: 'docs',
    description: 'Sync Google Docs, Sheets, and Slides. Long-form decisions and specs become searchable memories.',
    iconHint: 'drive',
    models: ['Document', 'GoogleDriveFile'],
    triageAggressiveness: 'high',
  },
  {
    key: 'slack-nango',
    providerConfigKey: 'slack',
    name: 'Slack',
    category: 'chat',
    description: 'Capture channel conversations. Decisions made in-thread stop evaporating.',
    iconHint: 'slack',
    models: ['SlackMessage', 'Message'],
    triageAggressiveness: 'low',
  },
  {
    key: 'notion-nango',
    providerConfigKey: 'notion',
    name: 'Notion',
    category: 'docs',
    description: 'Sync Notion pages. Your second brain joins the org memory.',
    iconHint: 'notion',
    models: ['NotionPage', 'Page'],
    triageAggressiveness: 'high',
  },
  {
    key: 'confluence-nango',
    providerConfigKey: 'confluence',
    name: 'Confluence',
    category: 'wiki',
    description: 'Sync Confluence spaces. Replace Confluence search with AI.',
    iconHint: 'confluence',
    models: ['ConfluencePage', 'Page'],
    triageAggressiveness: 'high',
  },
]

export function getProviderByKey(key: string): NangoProviderDef | null {
  return NANGO_PROVIDERS.find((p) => p.key === key) ?? null
}

export function getProviderByConfigKey(providerConfigKey: string): NangoProviderDef | null {
  return NANGO_PROVIDERS.find((p) => p.providerConfigKey === providerConfigKey) ?? null
}
