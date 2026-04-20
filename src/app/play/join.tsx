'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowRight, Gamepad2, AlertCircle } from 'lucide-react'
import { Navbar } from '@/components/landing/navbar'
import { Footer } from '@/components/landing/footer'
import { GlassCard } from '@/components/game/glass-card'

const PLAYER_NAME_KEY = 'reattend-game-player-name'

export function PlayJoin() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const prefilledRoom = searchParams.get('room') || ''

  const [code, setCode] = useState<string[]>(prefilledRoom.padEnd(6, '').split('').slice(0, 6))
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    const stored = localStorage.getItem(PLAYER_NAME_KEY)
    if (stored) setName(stored)
    // Focus first empty box
    const firstEmpty = code.findIndex(c => !c.trim())
    if (firstEmpty >= 0) inputRefs.current[firstEmpty]?.focus()
    else inputRefs.current[0]?.focus()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleCodeInput = (index: number, value: string) => {
    const char = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(-1)
    const newCode = [...code]
    newCode[index] = char
    setCode(newCode)
    setError(null)

    // Auto-advance to next box
    if (char && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
      const newCode = [...code]
      newCode[index - 1] = ''
      setCode(newCode)
    }
    if (e.key === 'Enter') {
      handleJoin()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
    const newCode = pasted.padEnd(6, '').split('').slice(0, 6)
    setCode(newCode)
    // Focus the last filled input or the name input
    const lastFilled = pasted.length - 1
    if (lastFilled >= 5) {
      // All filled, focus name input
      document.getElementById('player-name-input')?.focus()
    } else {
      inputRefs.current[lastFilled + 1]?.focus()
    }
  }

  const handleJoin = async () => {
    const roomCode = code.join('')
    if (roomCode.length !== 6) {
      setError('Enter a 6-character room code')
      return
    }
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Enter your name')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Look up the room to get gameType
      const res = await fetch(`/api/game-rooms?code=${roomCode}`)
      const data = await res.json()

      if (!res.ok || !data.room) {
        setError(data.error || 'Room not found or expired')
        setIsLoading(false)
        return
      }

      // Save name
      localStorage.setItem(PLAYER_NAME_KEY, trimmedName)

      // Redirect to the game
      router.push(`/game/${data.room.gameType}?room=${roomCode}`)
    } catch {
      setError('Failed to connect. Try again.')
      setIsLoading(false)
    }
  }

  const isFilled = code.every(c => c.trim()) && name.trim()

  return (
    <div className="min-h-screen bg-[#F5F5FF] text-[#1a1a2e] overflow-x-hidden">
      <Navbar />

      {/* Background blobs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-gradient-to-br from-[#4F46E5]/8 via-[#818CF8]/5 to-transparent blur-3xl pointer-events-none" />

      <section className="relative z-10 pt-20 md:pt-28 pb-20 px-5">
        <div className="max-w-sm mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#4F46E5]/20 to-[#818CF8]/10 flex items-center justify-center mx-auto mb-4">
              <Gamepad2 className="w-8 h-8 text-[#4F46E5]" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Join Game</h1>
            <p className="text-sm text-gray-500">Enter the room code shown on the host&apos;s screen</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <GlassCard className="p-6">
              {/* Room Code Input - 6 boxes */}
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 text-center">
                Room Code
              </label>
              <div className="flex items-center justify-center gap-2 mb-6" onPaste={handlePaste}>
                {code.map((char, i) => (
                  <input
                    key={i}
                    ref={el => { inputRefs.current[i] = el }}
                    type="text"
                    inputMode="text"
                    value={char}
                    onChange={(e) => handleCodeInput(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    maxLength={1}
                    className="w-12 h-14 text-center text-xl font-black rounded-xl border-2 border-gray-200 bg-white focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20 outline-none transition-all uppercase"
                  />
                ))}
              </div>

              {/* Name Input */}
              <label htmlFor="player-name-input" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 text-center">
                Your Name
              </label>
              <input
                id="player-name-input"
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); setError(null) }}
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                placeholder="Enter your name"
                maxLength={30}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-center text-base font-medium focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/30 focus:border-[#4F46E5] mb-4"
              />

              {/* Error */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-center gap-2 text-sm text-red-500 mb-4"
                >
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </motion.div>
              )}

              {/* Join Button */}
              <button
                onClick={handleJoin}
                disabled={!isFilled || isLoading}
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold text-[15px] transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                {isLoading ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                    />
                    Joining...
                  </>
                ) : (
                  <>
                    Join Game <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </GlassCard>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
