import type { Metadata } from 'next'

// The platform admin console must never appear in search results.
export const metadata: Metadata = { robots: { index: false, follow: false } }

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ colorScheme: 'light', background: '#f9fafb', color: '#111827' }}>
      {children}
    </div>
  )
}
