'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Loader2, Shield, ArrowLeft } from 'lucide-react'

type View = 'email' | 'otp'

export default function AdminLoginPage() {
  const router = useRouter()
  const [view, setView] = useState<View>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    fetch('/api/admin/auth/me')
      .then(res => {
        if (res.ok) router.replace('/admin/dashboard')
        else setChecking(false)
      })
      .catch(() => setChecking(false))
  }, [router])

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSending(true)
    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to send code')
        return
      }
      setView('otp')
    } catch {
      setError('Something went wrong')
    } finally {
      setSending(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setVerifying(true)
    try {
      const res = await fetch('/api/admin/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Invalid code')
        return
      }
      router.push('/admin/dashboard')
    } catch {
      setError('Something went wrong')
    } finally {
      setVerifying(false)
    }
  }

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/30">
      <Card className="w-full max-w-sm mx-4">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-foreground">
              <Shield className="h-6 w-6 text-background" />
            </div>
          </div>
          <CardTitle className="text-xl">Admin Panel</CardTitle>
          <CardDescription>
            {view === 'email' ? 'Enter your admin email to receive a login code' : `Code sent to ${email}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {view === 'email' && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="pb@reattend.ai"
                  autoFocus
                  required
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={sending}>
                {sending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Sending...</> : 'Send Login Code'}
              </Button>
            </form>
          )}

          {view === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">6-digit code</label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="123456"
                  maxLength={6}
                  autoFocus
                  required
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={verifying || code.length !== 6}>
                {verifying ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Verifying...</> : 'Sign In'}
              </Button>
              <button
                type="button"
                onClick={() => { setView('email'); setCode(''); setError('') }}
                className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1"
              >
                <ArrowLeft className="h-3 w-3" />
                Back
              </button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
