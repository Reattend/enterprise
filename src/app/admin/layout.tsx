export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ colorScheme: 'light', background: '#f9fafb', color: '#111827' }}>
      {children}
    </div>
  )
}
