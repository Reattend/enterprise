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
  // One-line setup tip shown after the user connects. Use for "you need to
  // do something on the provider side before data flows" gotchas — e.g. the
  // Slack bot-invite-to-channel step.
  setupHint?: string
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
    key: 'google-calendar-nango',
    providerConfigKey: 'google-calendar',
    name: 'Google Calendar',
    category: 'calendar',
    description: 'Meetings with descriptions and attendees become memories. Used by Meeting Prep to brief you 15 minutes ahead.',
    iconHint: 'calendar',
    models: ['GoogleCalendarEvent', 'CalendarEvent', 'Event'],
    triageAggressiveness: 'medium',
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
    setupHint: 'Invite the Reattend bot to each channel you want captured (type /invite @reattend in the channel). The bot only sees channels it’s invited to — clean privacy model, no firehose.',
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
    setupHint: 'Share each Notion page (or top-level workspace) with the Reattend integration: open the page → top-right ••• → Connections → Reattend. Notion only exposes pages explicitly granted access.',
  },
  {
    key: 'linear-nango',
    providerConfigKey: 'linear',
    name: 'Linear',
    category: 'docs',
    description: 'Capture issue threads and project descriptions. Decisions logged in tickets become memory.',
    iconHint: 'linear',
    models: ['LinearIssue', 'Issue'],
    triageAggressiveness: 'medium',
    setupHint: 'Linear sees every team and issue you have access to in your workspace. To narrow down, use the Scope filter (e.g. include "spec, decision, RFC" to skip routine ticket noise).',
  },
  {
    key: 'github-nango',
    providerConfigKey: 'github',
    name: 'GitHub',
    category: 'docs',
    description: 'Capture PR discussions and issue threads. Where code decisions actually live.',
    iconHint: 'github',
    models: ['GithubPullRequest', 'GithubIssue', 'PullRequest', 'Issue'],
    triageAggressiveness: 'medium',
    setupHint: 'During the OAuth screen, GitHub asks which organizations to grant access to — click Grant (or Request) for each org whose repos you want indexed. Without this, only personal repos appear.',
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
