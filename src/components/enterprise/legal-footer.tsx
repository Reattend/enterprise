import Link from 'next/link'

// Minimal legal footer used on the public Enterprise marketing pages
// (home, pricing, sandbox, compliance) until Sprint O ships the full
// footer. Just copyright + the three legal links so the Chrome Web Store
// listing has somewhere to point at for Privacy and Terms.
export function LegalFooter() {
  return (
    <footer className="relative z-10 border-t border-neutral-200/60 bg-white/40 backdrop-blur-sm">
      <div className="max-w-5xl mx-auto px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[12px] text-neutral-500">
        <p>&copy; {new Date().getFullYear()} Reattend Technologies Private Limited.</p>
        <div className="flex items-center gap-5">
          <Link href="/privacy" className="hover:text-[#1a1a2e] transition-colors">Privacy</Link>
          <Link href="/terms" className="hover:text-[#1a1a2e] transition-colors">Terms &amp; Conditions</Link>
          <Link href="/compliance" className="hover:text-[#1a1a2e] transition-colors">Compliance</Link>
        </div>
      </div>
    </footer>
  )
}
