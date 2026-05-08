import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import { Apple, Chrome, ExternalLink, Sparkles, Mic, Layers } from 'lucide-react'
import { SiteNav } from '@/components/landing/site-nav'
import { SiteFooter } from '@/components/landing/site-footer'

export const metadata: Metadata = {
  title: 'Download Reattend',
  description: 'Capture, ask, and act on your organizational memory from anywhere. Reattend for Mac, Chrome, and the web.',
}

// Single download hub. Replaces the older one-link install button by giving
// users a real choice surface for every install vector we ship.
//
// Order is intentional: Mac (newest, most capable surface) → Chrome (the
// proven workflow for browser-native users) → Web (the always-available
// fallback). Each card has a primary CTA and a one-line "what you get".
//
// The Mac dmg URL is a public asset behind /downloads/ on the droplet.
// Cut a fresh build with `npm run tauri build` in the desktop repo, then
// upload the .dmg to /var/www/enterprise/public/downloads/ and bump the
// MAC_DMG_VERSION constant below. Once we have an updater endpoint live
// the explicit version pin can go.
const MAC_DMG_VERSION = '0.1.13'
const MAC_DMG_HREF = `/downloads/Reattend_${MAC_DMG_VERSION}_aarch64.dmg`
const CHROME_STORE_HREF =
  'https://chromewebstore.google.com/detail/reattend-enterprise/nndcdadidlnohfebdkdehfeokgplcnkl'

export default function DownloadPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-[#fafafa] to-[#f5f5f7] flex flex-col">
      <SiteNav />

      <main className="flex-1">
        <section className="max-w-5xl mx-auto px-8 pt-16 pb-12 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-neutral-200 rounded-full text-[11px] font-semibold text-neutral-600 mb-6">
            <Sparkles className="w-3 h-3 text-indigo-500" />
            <span className="tracking-wide uppercase">Get Reattend</span>
          </div>
          <h1 className="text-[44px] md:text-[56px] leading-[1.05] font-semibold text-[#1a1a2e] tracking-tight mb-5">
            Reattend, where you already are.
          </h1>
          <p className="text-[17px] text-neutral-600 max-w-xl mx-auto leading-relaxed">
            Save a memory in two keystrokes. Ask any question across your decisions, meetings, and notes. Pick the surface that fits your day.
          </p>
        </section>

        <section className="max-w-5xl mx-auto px-8 pb-16 grid md:grid-cols-3 gap-5">
          <DownloadCard
            badge="Mac"
            badgeColor="bg-zinc-100 text-zinc-700"
            icon={<Apple className="w-7 h-7 text-[#1a1a2e]" strokeWidth={1.5} />}
            title="Reattend for Mac"
            tagline="Tray-only. Capture, ask, ambient — all in one floating click."
            features={[
              { icon: <Layers className="w-3.5 h-3.5" />, label: '⌘⇧R — Quick capture' },
              { icon: <Sparkles className="w-3.5 h-3.5" />, label: '⌘⇧A — Ask spotlight' },
              { icon: <Mic className="w-3.5 h-3.5" />, label: 'Smart clipboard auto-capture' },
            ]}
            primary={{
              label: `Download for Mac · ${MAC_DMG_VERSION}`,
              href: MAC_DMG_HREF,
              external: false,
            }}
            secondary={{
              label: 'Apple silicon · macOS 13+',
              note: 'Intel build coming soon. Drag to Applications, then paste your API token from Settings.',
            }}
            highlight
          />

          <DownloadCard
            badge="Chrome"
            badgeColor="bg-blue-50 text-blue-700"
            icon={<Chrome className="w-7 h-7 text-[#4285F4]" strokeWidth={1.5} />}
            title="Reattend for Chrome"
            tagline="Right-click anything to save. Ask in any tab. Selection capture."
            features={[
              { icon: <Layers className="w-3.5 h-3.5" />, label: 'Right-click → Save to Reattend' },
              { icon: <Sparkles className="w-3.5 h-3.5" />, label: 'Inline ask popup' },
              { icon: <Mic className="w-3.5 h-3.5" />, label: 'Auto-capture from Gmail, Notion, Linear' },
            ]}
            primary={{
              label: 'Add to Chrome',
              href: CHROME_STORE_HREF,
              external: true,
            }}
            secondary={{
              label: 'Free · works in Chrome, Brave, Arc',
              note: 'Sign in once with the same account as your web app.',
            }}
          />

          <DownloadCard
            badge="Web"
            badgeColor="bg-emerald-50 text-emerald-700"
            icon={
              <div className="w-7 h-7 rounded-md bg-[#1a1a2e] flex items-center justify-center">
                <Image src="/white_logo.svg" alt="Reattend" width={18} height={18} className="h-4 w-4" unoptimized />
              </div>
            }
            title="Reattend on the web"
            tagline="The full memory surface — graph, decisions, admin. Nothing to install."
            features={[
              { icon: <Layers className="w-3.5 h-3.5" />, label: 'Memory graph + Time Machine' },
              { icon: <Sparkles className="w-3.5 h-3.5" />, label: 'DeepThink mode + Oracle' },
              { icon: <Mic className="w-3.5 h-3.5" />, label: 'Admin: members, policies, audit' },
            ]}
            primary={{
              label: 'Open the dashboard',
              href: '/app',
              external: false,
            }}
            secondary={{
              label: 'Bookmarkable · always up-to-date',
              note: 'Works in any modern browser, no install.',
            }}
          />
        </section>

        <section className="max-w-3xl mx-auto px-8 pb-24 text-center">
          <h2 className="text-[24px] font-semibold text-[#1a1a2e] tracking-tight mb-3">
            Need Windows or Linux?
          </h2>
          <p className="text-[14.5px] text-neutral-600 leading-relaxed mb-5">
            Native builds are on the way. In the meantime the Chrome extension covers most of what the desktop app does — captures, ambient ask popup, right-click save.
          </p>
          <Link
            href="/help"
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#1a1a2e] hover:text-[#2d2b55]"
          >
            Reach out for early Windows access
            <ExternalLink className="w-3 h-3" />
          </Link>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}

interface CardCTA {
  label: string
  href: string
  external: boolean
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
  const ButtonInner = (
    <span className="inline-flex items-center justify-center gap-1.5 w-full px-4 h-10 bg-[#1a1a2e] text-white text-[13px] font-semibold rounded-lg hover:bg-[#2d2b55] transition-colors">
      {primary.label}
      {primary.external && <ExternalLink className="w-3 h-3 opacity-80" />}
    </span>
  )

  return (
    <div
      className={`relative bg-white border rounded-2xl p-6 flex flex-col ${
        highlight ? 'border-[#1a1a2e]/15 shadow-[0_8px_32px_rgba(26,26,46,0.08)]' : 'border-neutral-200'
      }`}
    >
      <div className="flex items-center justify-between mb-5">
        {icon}
        <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${badgeColor}`}>
          {badge}
        </span>
      </div>

      <h3 className="text-[18px] font-semibold text-[#1a1a2e] tracking-tight mb-1.5">
        {title}
      </h3>
      <p className="text-[13px] text-neutral-600 leading-relaxed mb-4">
        {tagline}
      </p>

      <ul className="space-y-2 mb-6 flex-1">
        {features.map((f, i) => (
          <li key={i} className="flex items-center gap-2 text-[12.5px] text-neutral-700">
            <span className="text-indigo-500">{f.icon}</span>
            {f.label}
          </li>
        ))}
      </ul>

      <div className="space-y-2">
        {primary.external ? (
          <a href={primary.href} target="_blank" rel="noopener noreferrer">
            {ButtonInner}
          </a>
        ) : primary.href.startsWith('/downloads/') ? (
          <a href={primary.href} download>
            {ButtonInner}
          </a>
        ) : (
          <Link href={primary.href}>{ButtonInner}</Link>
        )}
        <p className="text-[11px] text-neutral-500 leading-snug">
          <span className="font-medium text-neutral-600">{secondary.label}</span>
          {secondary.note && <span className="text-neutral-500"> · {secondary.note}</span>}
        </p>
      </div>
    </div>
  )
}
