import Link from 'next/link'
import Image from 'next/image'

// Single shared top nav for every public marketing surface (landing,
// sandbox, pricing, compliance, privacy, terms, support). Keeps the
// chrome consistent so users feel they're on one site instead of a
// patchwork of pages with subtly different headers.
//
// Layout: logo on the left, four nav items + dark "Sign in" pill on the
// right. Transparent background so each page can sit it on top of
// whatever subtle wash it wants without a hard separator.
export function SiteNav() {
  return (
    <nav className="relative z-10 flex items-center justify-between px-8 py-5 max-w-6xl mx-auto">
      <Link href="/" className="flex items-center gap-2.5">
        <Image src="/black_logo.svg" alt="Reattend" width={32} height={32} className="h-8 w-8" unoptimized />
        <div className="leading-tight">
          <span className="text-[17px] font-bold text-[#1a1a2e] tracking-tight">Reattend</span>
          <span className="text-[10px] font-semibold text-neutral-400 ml-1.5 uppercase tracking-wider">Enterprise</span>
        </div>
      </Link>
      <div className="flex items-center gap-6 text-[13px] font-medium text-neutral-600">
        <Link href="/product" className="hover:text-[#1a1a2e] transition-colors hidden sm:inline">Product</Link>
        <Link href="/integrations" className="hover:text-[#1a1a2e] transition-colors hidden sm:inline">Integrations</Link>
        <Link href="/pricing" className="hover:text-[#1a1a2e] transition-colors">Pricing</Link>
        <Link href="/compliance" className="hover:text-[#1a1a2e] transition-colors">Compliance</Link>
        <Link
          href="/login"
          className="text-[#1a1a2e] hover:text-[#2d2b55] transition-colors"
        >
          Sign in
        </Link>
        <Link
          href="/sandbox"
          className="inline-flex items-center px-3.5 h-8 border border-[#1a1a2e]/15 text-[#1a1a2e] text-[12px] font-semibold rounded-full hover:bg-neutral-50 transition-colors"
        >
          Try for free
        </Link>
        <a
          href="https://calendly.com/pb-reattend/30min"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center px-3.5 h-8 bg-[#1a1a2e] text-white text-[12px] font-semibold rounded-full hover:bg-[#2d2b55] transition-colors"
        >
          Book a demo
        </a>
      </div>
    </nav>
  )
}
