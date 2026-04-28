import Link from 'next/link'
import Image from 'next/image'

// Single shared site footer for every public marketing surface. Same
// columns and bottom strip on landing, sandbox, pricing, compliance,
// privacy, terms, support — so every page reads as part of one site.
export function SiteFooter() {
  const cols: Array<{ heading: string; links: Array<{ label: string; href: string; external?: boolean }> }> = [
    {
      heading: 'Product',
      links: [
        { label: 'Sandbox', href: '/sandbox' },
        { label: 'Pricing', href: '/pricing' },
        { label: 'Compliance', href: '/compliance' },
        { label: 'Sign in', href: '/login' },
      ],
    },
    {
      heading: 'Capabilities',
      links: [
        { label: 'Memory cockpit', href: '/sandbox' },
        { label: 'Time Machine', href: '/sandbox' },
        { label: 'Exit Interview Agent', href: '/sandbox' },
        { label: 'Onboarding Genie', href: '/sandbox' },
      ],
    },
    {
      heading: 'Company',
      links: [
        { label: 'Privacy', href: '/privacy' },
        { label: 'Terms', href: '/terms' },
        { label: 'Support', href: '/support' },
        { label: 'Contact', href: 'mailto:pb@reattend.ai', external: true },
      ],
    },
  ]
  return (
    <footer className="border-t border-neutral-200 bg-white">
      <div className="max-w-6xl mx-auto px-8 py-12 grid grid-cols-2 md:grid-cols-5 gap-8">
        <div className="col-span-2">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/black_logo.svg" alt="Reattend" width={32} height={32} className="h-8 w-8" unoptimized />
            <div className="leading-tight">
              <span className="text-[15px] font-bold tracking-tight text-[#1a1a2e]">Reattend</span>
              <span className="text-[9px] font-semibold text-neutral-400 ml-1 uppercase tracking-widest">Enterprise</span>
            </div>
          </Link>
          <p className="text-[12px] text-neutral-500 mt-4 max-w-xs leading-relaxed">
            Organizational memory for teams that can&apos;t afford to forget. Built by Reattend Technologies Private Limited.
          </p>
        </div>
        {cols.map((c) => (
          <div key={c.heading}>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500 mb-4">{c.heading}</p>
            <ul className="space-y-2">
              {c.links.map((l) => (
                <li key={l.label}>
                  {l.external ? (
                    <a href={l.href} className="text-[12px] text-neutral-600 hover:text-[#1a1a2e] transition-colors">{l.label}</a>
                  ) : (
                    <Link href={l.href} className="text-[12px] text-neutral-600 hover:text-[#1a1a2e] transition-colors">{l.label}</Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-neutral-100">
        <div className="max-w-6xl mx-auto px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-neutral-500">
          <p>&copy; {new Date().getFullYear()} Reattend Technologies Private Limited.</p>
          <div className="flex items-center gap-5">
            <Link href="/privacy" className="hover:text-[#1a1a2e] transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-[#1a1a2e] transition-colors">Terms</Link>
            <Link href="/compliance" className="hover:text-[#1a1a2e] transition-colors">Compliance</Link>
            <Link href="/support" className="hover:text-[#1a1a2e] transition-colors">Support</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
