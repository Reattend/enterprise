'use client'

// In-dashboard download hub. Lives inside the authenticated app shell so
// users get the same nav + topbar chrome instead of being kicked out to a
// public marketing page. Replaces the previous public /download route.
//
// Three install vectors:
//   1. Mac (signed .app.zip — Apple silicon) — newest, most capable surface
//   2. Windows (.msi installer) — built via GitHub Actions per release
//   3. Chrome extension — proven workflow for browser-native users
//
// Asset URLs point at /downloads/* on the same origin, served as static
// files from the droplet's /var/www/enterprise/public/downloads/. The
// CI release workflow uploads to that directory; bumping LATEST_VERSION
// here flips every download link in one edit.

import Link from 'next/link'
import {
  Apple, Chrome, ExternalLink, Sparkles, Mic, Layers,
  MonitorPlay, ShieldCheck,
} from 'lucide-react'

const LATEST_VERSION = '0.1.13'
const MAC_HREF = `/downloads/Reattend_${LATEST_VERSION}_aarch64.app.zip`
const WIN_HREF = `/downloads/Reattend_${LATEST_VERSION}_x64-setup.exe`
const CHROME_STORE_HREF =
  'https://chromewebstore.google.com/detail/reattend-enterprise/nndcdadidlnohfebdkdehfeokgplcnkl'

export default function DownloadsPage() {
  return (
    <div className="px-6 py-8 max-w-6xl mx-auto">
      <header className="mb-8">
        <div className="inline-flex items-center gap-2 px-2.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 rounded-full text-[10px] font-semibold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider mb-3">
          <Sparkles className="w-3 h-3" />
          Apps
        </div>
        <h1 className="text-[28px] font-semibold tracking-tight mb-2">
          Reattend, where you already are
        </h1>
        <p className="text-[14px] text-muted-foreground max-w-2xl leading-relaxed">
          Two keystrokes to save. One spotlight to ask. Pick the surface that fits your day — every install signs in with the same API token from{' '}
          <Link href="/app/settings" className="underline underline-offset-2 hover:text-foreground">Settings</Link>.
        </p>
      </header>

      <section className="grid md:grid-cols-3 gap-4 mb-10">
        <DownloadCard
          badge="Mac"
          badgeColor="bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
          icon={<Apple className="w-7 h-7" strokeWidth={1.5} />}
          title="Reattend for Mac"
          tagline="Tray-only. Capture, ask, ambient — one floating click."
          features={[
            { icon: <Layers className="w-3.5 h-3.5" />, label: '⌘⇧R · Quick capture' },
            { icon: <Sparkles className="w-3.5 h-3.5" />, label: '⌘⇧A · Ask spotlight (Normal + Deep)' },
            { icon: <Mic className="w-3.5 h-3.5" />, label: 'Smart clipboard auto-capture' },
          ]}
          primary={{ label: `Download · ${LATEST_VERSION}`, href: MAC_HREF, external: false }}
          secondary={{
            label: 'Apple silicon · macOS 13+',
            note: 'Unzip, drag Reattend.app to Applications.',
          }}
          highlight
        />

        <DownloadCard
          badge="Windows"
          badgeColor="bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300"
          icon={<MonitorPlay className="w-7 h-7" strokeWidth={1.5} />}
          title="Reattend for Windows"
          tagline="Same tray-only experience, native to Windows."
          features={[
            { icon: <Layers className="w-3.5 h-3.5" />, label: 'Ctrl⇧R · Quick capture' },
            { icon: <Sparkles className="w-3.5 h-3.5" />, label: 'Ctrl⇧A · Ask spotlight' },
            { icon: <Mic className="w-3.5 h-3.5" />, label: 'Smart clipboard auto-capture' },
          ]}
          primary={{
            label: `Download · ${LATEST_VERSION}`,
            href: WIN_HREF,
            external: false,
            disabled: true,
            disabledLabel: 'Windows build · soon',
          }}
          secondary={{
            label: 'Windows 10 · 11 · x64',
            note: 'CI build pending. Notify me when it lands.',
          }}
        />

        <DownloadCard
          badge="Chrome"
          badgeColor="bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
          icon={<Chrome className="w-7 h-7" strokeWidth={1.5} />}
          title="Reattend for Chrome"
          tagline="Right-click to save. Ask in any tab. Selection capture."
          features={[
            { icon: <Layers className="w-3.5 h-3.5" />, label: 'Right-click → Save to Reattend' },
            { icon: <Sparkles className="w-3.5 h-3.5" />, label: 'Inline ask popup' },
            { icon: <Mic className="w-3.5 h-3.5" />, label: 'Auto-capture from Gmail, Notion, Linear' },
          ]}
          primary={{ label: 'Add to Chrome', href: CHROME_STORE_HREF, external: true }}
          secondary={{
            label: 'Free · works in Chrome, Brave, Arc',
            note: 'Same account, no extra setup.',
          }}
        />
      </section>

      <section className="rounded-xl border border-border bg-muted/30 p-5 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
        <div className="text-[13px] leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">Code-signed, sandbox-respectful.</span>{' '}
          The Mac build is signed with our Apple Developer ID and notarized — Gatekeeper opens it without warnings.
          The Windows build will be signed with Authenticode once the cert is provisioned.
          Auto-updates flow through{' '}
          <code className="text-[11px] px-1 py-0.5 bg-background rounded">/api/updater</code>{' '}
          so installed clients pick up new versions without you doing anything.
        </div>
      </section>
    </div>
  )
}

interface CardCTA {
  label: string
  href: string
  external: boolean
  disabled?: boolean
  disabledLabel?: string
}

function DownloadCard({
  badge, badgeColor, icon, title, tagline, features, primary, secondary, highlight = false,
}: {
  badge: string
  badgeColor: string
  icon: React.ReactNode
  title: string
  tagline: string
  features: Array<{ icon: React.ReactNode; label: string }>
  primary: CardCTA
  secondary: { label: string; note?: string }
  highlight?: boolean
}) {
  const buttonClasses = `inline-flex items-center justify-center gap-1.5 w-full px-4 h-10 text-[13px] font-semibold rounded-lg transition-colors ${
    primary.disabled
      ? 'bg-muted text-muted-foreground cursor-not-allowed'
      : 'bg-foreground text-background hover:opacity-90'
  }`

  const ButtonInner = (
    <span className={buttonClasses}>
      {primary.disabled ? primary.disabledLabel || primary.label : primary.label}
      {!primary.disabled && primary.external && <ExternalLink className="w-3 h-3 opacity-80" />}
    </span>
  )

  return (
    <div
      className={`relative bg-card border rounded-xl p-5 flex flex-col ${
        highlight ? 'border-foreground/20 shadow-sm' : 'border-border'
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        {icon}
        <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${badgeColor}`}>
          {badge}
        </span>
      </div>

      <h3 className="text-[16px] font-semibold tracking-tight mb-1">
        {title}
      </h3>
      <p className="text-[12.5px] text-muted-foreground leading-relaxed mb-4">
        {tagline}
      </p>

      <ul className="space-y-1.5 mb-5 flex-1">
        {features.map((f, i) => (
          <li key={i} className="flex items-center gap-2 text-[12px] text-foreground/80">
            <span className="text-indigo-500 dark:text-indigo-400">{f.icon}</span>
            {f.label}
          </li>
        ))}
      </ul>

      <div className="space-y-2">
        {primary.disabled ? (
          <button type="button" disabled className="w-full">{ButtonInner}</button>
        ) : primary.external ? (
          <a href={primary.href} target="_blank" rel="noopener noreferrer">{ButtonInner}</a>
        ) : primary.href.startsWith('/downloads/') ? (
          <a href={primary.href}>{ButtonInner}</a>
        ) : (
          <Link href={primary.href}>{ButtonInner}</Link>
        )}
        <p className="text-[10.5px] text-muted-foreground leading-snug">
          <span className="font-medium text-foreground/80">{secondary.label}</span>
          {secondary.note && <span> · {secondary.note}</span>}
        </p>
      </div>
    </div>
  )
}
