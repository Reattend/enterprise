'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { User, ArrowRight, Users, Plus } from 'lucide-react'
import { GlassCard } from './glass-card'

const PLAYER_NAME_KEY = 'reattend-game-player-name'

interface TeamNameInputProps {
  onContinue: (name: string) => void
  showRoomOptions?: boolean
  onCreateRoom?: () => void
  onJoinRoom?: () => void
  accentColor?: string        // e.g. 'orange', 'pink', 'blue'
  accentFrom?: string         // e.g. '#F97316'
  accentTo?: string           // e.g. '#F59E0B'
}

export function TeamNameInput({
  onContinue,
  showRoomOptions = false,
  onCreateRoom,
  onJoinRoom,
  accentColor = 'indigo',
  accentFrom = '#4F46E5',
  accentTo = '#818CF8',
}: TeamNameInputProps) {
  const [name, setName] = useState('')
  const [hasStoredName, setHasStoredName] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(PLAYER_NAME_KEY)
    if (stored) {
      setName(stored)
      setHasStoredName(true)
    }
  }, [])

  const handleContinue = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    localStorage.setItem(PLAYER_NAME_KEY, trimmed)
    onContinue(trimmed)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleContinue()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-md mx-auto"
    >
      <GlassCard className="p-8 text-center">
        <div
          className="w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center"
          style={{ background: `linear-gradient(135deg, ${accentFrom}20, ${accentTo}10)` }}
        >
          <User className="w-8 h-8" style={{ color: accentFrom }} />
        </div>

        <h2 className="text-xl font-bold mb-2">What&apos;s your name?</h2>
        <p className="text-sm text-gray-500 mb-6">
          {hasStoredName ? 'Welcome back! Change your name or continue.' : 'Enter your name to get started.'}
        </p>

        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Your name"
          maxLength={30}
          autoFocus
          className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-center text-lg font-medium focus:outline-none focus:ring-2 focus:border-transparent mb-4"
          style={{ '--tw-ring-color': accentFrom } as React.CSSProperties}
        />

        <button
          onClick={handleContinue}
          disabled={!name.trim()}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white font-bold text-[15px] transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
          style={{
            background: name.trim() ? `linear-gradient(135deg, ${accentFrom}, ${accentTo})` : undefined,
            backgroundColor: name.trim() ? undefined : '#d1d5db',
          }}
        >
          {showRoomOptions ? 'Continue' : 'Start Playing'} <ArrowRight className="w-4 h-4" />
        </button>

        {showRoomOptions && name.trim() && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-6 pt-6 border-t border-gray-200 space-y-3"
          >
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Multiplayer</p>
            <button
              onClick={() => {
                localStorage.setItem(PLAYER_NAME_KEY, name.trim())
                onCreateRoom?.()
              }}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl border-2 font-bold text-[14px] transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ borderColor: accentFrom, color: accentFrom }}
            >
              <Plus className="w-4 h-4" /> Create Room
            </button>
            <button
              onClick={() => {
                localStorage.setItem(PLAYER_NAME_KEY, name.trim())
                onJoinRoom?.()
              }}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-bold text-[14px] transition-all hover:border-gray-300 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Users className="w-4 h-4" /> Join Room
            </button>
          </motion.div>
        )}
      </GlassCard>
    </motion.div>
  )
}
