'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Users, Loader2, CheckCircle, XCircle, ArrowRight, Shield, Lock } from 'lucide-react'
import { toast } from 'sonner'

interface InviteData {
  id: string
  email: string
  role: string
  status: string
  workspaceName: string | null
  inviterName: string | null
  expiresAt: string | null
}

export default function InviteAcceptPage() {
  const params = useParams()
  const router = useRouter()
  const inviteId = params.id as string

  const [invite, setInvite] = useState<InviteData | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [accepted, setAccepted] = useState(false)

  useEffect(() => {
    fetchInvite()
  }, [inviteId])

  const fetchInvite = async () => {
    try {
      const res = await fetch(`/api/invite/${inviteId}`)
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Invite not found')
        return
      }
      setInvite(data.invite)
      if (data.invite.status !== 'pending') {
        setError(data.invite.status === 'accepted' ? 'This invitation has already been accepted' : 'This invitation has expired')
      }
    } catch {
      setError('Failed to load invitation')
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async () => {
    setAccepting(true)
    try {
      const res = await fetch(`/api/invite/${inviteId}`, { method: 'POST' })
      const data = await res.json()

      if (res.status === 401) {
        router.push(`/login?callbackUrl=${encodeURIComponent(`/invite/${inviteId}`)}`)
        return
      }

      if (!res.ok) {
        toast.error(data.error || 'Failed to accept invitation')
        return
      }

      setAccepted(true)
      toast.success('Welcome to the team!')
      setTimeout(() => { window.location.href = '/app' }, 1500)
    } catch {
      toast.error('Failed to accept invitation')
    } finally {
      setAccepting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-gradient-to-br from-[#4F46E5]/8 via-[#818CF8]/5 to-transparent blur-3xl pointer-events-none" />
        <Loader2 className="h-6 w-6 animate-spin text-[#4F46E5]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAFAFA] px-6 relative overflow-hidden">
      {/* Background gradient blobs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-gradient-to-br from-[#4F46E5]/8 via-[#818CF8]/5 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -left-40 w-[500px] h-[500px] rounded-full bg-[#4F46E5]/5 blur-3xl pointer-events-none" />
      <div className="absolute top-20 -right-40 w-[500px] h-[500px] rounded-full bg-[#818CF8]/5 blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-[420px]">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-center gap-2.5 mb-8"
        >
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/black_logo.svg" alt="Reattend" width={36} height={36} className="h-9 w-9" unoptimized />
            <span className="text-[20px] font-bold text-[#1a1a2e] tracking-tight">Reattend</span>
          </Link>
        </motion.div>

        {/* Glassmorphic Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-2xl shadow-[0_8px_32px_rgba(79,70,229,0.06)] p-8"
        >
          {accepted ? (
            <div className="text-center py-4">
              <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
              <h2 className="text-[22px] font-bold text-[#1a1a2e] mb-2">You&apos;re in!</h2>
              <p className="text-[14px] text-gray-500">Redirecting to your new workspace...</p>
            </div>
          ) : error ? (
            <div className="text-center py-4">
              <XCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h2 className="text-[22px] font-bold text-[#1a1a2e] mb-2">Invitation Unavailable</h2>
              <p className="text-[14px] text-gray-500 mb-6">{error}</p>
              <Link
                href="/app"
                className="inline-flex items-center justify-center w-full h-[48px] bg-[#4F46E5] hover:bg-[#4338CA] text-white text-[14px] font-semibold rounded-full transition-all shadow-[0_4px_14px_rgba(79,70,229,0.3)]"
              >
                Go to App
              </Link>
            </div>
          ) : invite ? (
            <div className="space-y-6">
              <div className="text-center">
                <div className="h-14 w-14 rounded-xl bg-[#4F46E5]/10 flex items-center justify-center mx-auto mb-4">
                  <Users className="h-7 w-7 text-[#4F46E5]" />
                </div>
                <h2 className="text-[22px] font-bold text-[#1a1a2e] mb-1">
                  Join {invite.workspaceName}
                </h2>
                <p className="text-[14px] text-gray-500">
                  {invite.inviterName || 'Someone'} has invited you to collaborate on shared memories.
                </p>
              </div>

              {/* Invite details */}
              <div className="rounded-xl bg-white/70 backdrop-blur-sm border border-white/80 p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Workspace</span>
                  <span className="font-medium text-[#1a1a2e]">{invite.workspaceName}</span>
                </div>
                <div className="flex justify-between text-sm items-center">
                  <span className="text-gray-500">Invited as</span>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#4F46E5]/10 text-[#4F46E5] capitalize">{invite.role}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Your email</span>
                  <span className="text-xs text-[#1a1a2e]">{invite.email}</span>
                </div>
              </div>

              {/* Accept button */}
              <button
                onClick={handleAccept}
                disabled={accepting}
                className="w-full h-[48px] bg-[#4F46E5] hover:bg-[#4338CA] active:scale-[0.98] text-white text-[14px] font-semibold rounded-full transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-[0_4px_14px_rgba(79,70,229,0.3)]"
              >
                {accepting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Joining...
                  </>
                ) : (
                  <>
                    Accept Invitation
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          ) : null}
        </motion.div>

        {/* Trust badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex items-center justify-center gap-5 mt-6 text-[11px] text-gray-400"
        >
          <span className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" /> SOC2-ready</span>
          <span className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" /> Encrypted</span>
        </motion.div>
      </div>
    </div>
  )
}
