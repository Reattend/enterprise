import { db, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { auth } from '@/lib/auth'

interface SharePageProps {
  params: Promise<{ token: string }>
}

async function getShare(token: string) {
  const share = await db.query.sharedLinks.findFirst({
    where: eq(schema.sharedLinks.shareToken, token),
  })
  if (!share) return null
  if (share.expiresAt && new Date(share.expiresAt) < new Date()) return null
  return share
}

export async function generateMetadata({ params }: SharePageProps): Promise<Metadata> {
  const { token } = await params
  const share = await getShare(token)
  if (!share) return { title: 'Not Found — Reattend' }
  return {
    title: `${share.title} — Shared from Reattend`,
    description: share.summary || 'Meeting notes shared from Reattend',
    openGraph: {
      title: share.title,
      description: share.summary || 'Meeting notes shared from Reattend',
      siteName: 'Reattend',
    },
  }
}

export default async function SharePage({ params }: SharePageProps) {
  const { token } = await params
  const share = await getShare(token)
  if (!share) notFound()

  // Logged-in users get auto-redirected to import the memory
  const session = await auth()
  if (session?.user?.id) {
    redirect(`/app/memories?import=${token}`)
  }

  const meta = share.meta ? JSON.parse(share.meta) : {}
  const entities: { kind: string; name: string }[] = share.entities ? JSON.parse(share.entities) : []
  const people = entities.filter((e) => e.kind === 'person')
  const actionItems: string[] = meta.action_items || []
  const decisions: string[] = meta.decisions || []
  const keyPoints: string[] = meta.key_points || []
  const isTranscript = share.recordType === 'transcript'
  const isMeeting = share.recordType === 'meeting' || isTranscript
  const createdDate = new Date(share.createdAt).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  // Teaser: first 3-4 lines of summary
  const previewText = share.summary
    ? (share.summary.length > 280 ? share.summary.slice(0, 280) + '...' : share.summary)
    : null

  const signupUrl = `/register?redirect=${encodeURIComponent(`/share/${token}`)}`
  const loginUrl = `/login?callbackUrl=${encodeURIComponent(`/share/${token}`)}`

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50/30">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="https://www.reattend.com" className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/black_logo.svg" alt="Reattend" className="h-7 w-auto" />
          </a>
          <a
            href="https://reattend.com"
            className="text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            Get Reattend &rarr;
          </a>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-12">
        {/* Type badge + date */}
        <div className="flex items-center gap-2.5 mb-4">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
            isTranscript
              ? 'bg-pink-50 text-pink-600 border border-pink-200'
              : isMeeting
              ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
              : 'bg-slate-50 text-slate-600 border border-slate-200'
          }`}>
            {isTranscript ? '🎙 Audio Recording' : isMeeting ? '💬 Meeting' : '📝 Note'}
          </span>
          <span className="text-xs text-slate-400">{createdDate}</span>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight leading-tight mb-4">
          {share.title}
        </h1>

        {/* Preview text */}
        {previewText && (
          <p className="text-base text-slate-500 leading-relaxed mb-6">
            {previewText}
          </p>
        )}

        {/* Stats pills */}
        {(actionItems.length > 0 || decisions.length > 0 || keyPoints.length > 0 || people.length > 0) && (
          <div className="flex flex-wrap gap-2.5 mb-8">
            {people.length > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 text-xs font-medium border border-blue-100">
                👥 {people.length} participant{people.length !== 1 ? 's' : ''}
              </span>
            )}
            {actionItems.length > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600 text-xs font-medium border border-rose-100">
                ✓ {actionItems.length} action item{actionItems.length !== 1 ? 's' : ''}
              </span>
            )}
            {decisions.length > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-600 text-xs font-medium border border-amber-100">
                💡 {decisions.length} decision{decisions.length !== 1 ? 's' : ''}
              </span>
            )}
            {keyPoints.length > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-50 text-violet-600 text-xs font-medium border border-violet-100">
                💬 {keyPoints.length} key point{keyPoints.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}

        {/* Blurred teaser — hint at content */}
        <div className="relative rounded-2xl border border-slate-200 bg-white overflow-hidden mb-8">
          <div className="p-6 space-y-3">
            {actionItems.slice(0, 2).map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="mt-1 w-4 h-4 rounded border-2 border-rose-300 shrink-0" />
                <span className="text-sm text-slate-700 leading-relaxed">{item}</span>
              </div>
            ))}
            {actionItems.length <= 0 && keyPoints.slice(0, 2).map((k, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="mt-2 w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
                <span className="text-sm text-slate-700 leading-relaxed">{k}</span>
              </div>
            ))}
          </div>
          {/* Gradient fade overlay */}
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white via-white/90 to-transparent flex items-end justify-center pb-4">
            <span className="text-xs text-slate-400 font-medium">
              Sign in to see the full notes
            </span>
          </div>
        </div>

        {/* CTA */}
        <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-violet-50 to-purple-50 p-10 text-center">
          <h3 className="text-xl font-bold text-slate-900 mb-2">
            Save this memory to Reattend
          </h3>
          <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">
            Reattend records, transcribes, and extracts action items from your meetings — all stored securely in your account.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href={loginUrl}
              className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all hover:scale-[1.02]"
            >
              Sign in to save
            </a>
            <a
              href={signupUrl}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-indigo-300 bg-white text-indigo-600 text-sm font-semibold hover:bg-indigo-50 transition-colors"
            >
              Create a free account
            </a>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-100 mt-16 py-8 text-center">
        <p className="text-xs text-slate-400">
          Shared from <a href="https://www.reattend.com" className="text-indigo-500 hover:underline font-medium">Reattend</a> — AI memory layer for your work
        </p>
      </footer>
    </div>
  )
}
