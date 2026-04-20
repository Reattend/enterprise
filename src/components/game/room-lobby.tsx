'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Copy, Check, Play, QrCode } from 'lucide-react'
import { GlassCard } from './glass-card'
import type { GamePlayer } from '@/lib/game/types'

interface RoomLobbyProps {
  roomCode: string
  players: GamePlayer[]
  isHost: boolean
  onStart: () => void
  minPlayers?: number
  accentColor?: string
  gameTitle?: string
}

export function RoomLobby({
  roomCode,
  players,
  isHost,
  onStart,
  minPlayers = 2,
  accentColor = '#4F46E5',
  gameTitle = 'Game',
}: RoomLobbyProps) {
  const [copied, setCopied] = React.useState(false)
  const [showQR, setShowQR] = React.useState(false)
  const joinUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://reattend.com'}/play?room=${roomCode}`
  const canStart = players.length >= minPlayers

  const copyCode = () => {
    navigator.clipboard.writeText(joinUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <GlassCard className="p-8 text-center">
      <h2 className="text-lg font-bold mb-1">{gameTitle}</h2>
      <p className="text-sm text-gray-500 mb-6">
        {isHost ? 'Share this code with your team to join' : 'Waiting for the host to start...'}
      </p>

      {/* Room Code */}
      <div className="mb-6">
        <div className="flex items-center justify-center gap-2 mb-2">
          {roomCode.split('').map((char, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="w-12 h-14 flex items-center justify-center text-2xl font-black rounded-xl border-2"
              style={{ borderColor: accentColor, color: accentColor, backgroundColor: `${accentColor}08` }}
            >
              {char}
            </motion.span>
          ))}
        </div>

        <div className="flex items-center justify-center gap-3 mt-3">
          <button
            onClick={copyCode}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied!' : 'Copy link'}
          </button>
          <button
            onClick={() => setShowQR(!showQR)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <QrCode className="w-3.5 h-3.5" />
            QR Code
          </button>
        </div>

        <p className="text-xs text-gray-400 mt-2">
          Join at <span className="font-medium">reattend.com/play</span>
        </p>
      </div>

      {/* QR Code (simple text-based fallback, real QR in /play page) */}
      <AnimatePresence>
        {showQR && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 overflow-hidden"
          >
            <div className="inline-block p-4 bg-white rounded-xl border border-gray-200">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(joinUrl)}`}
                alt={`QR code for room ${roomCode}`}
                width={180}
                height={180}
                className="mx-auto"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Player List */}
      <div className="mb-6">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Users className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-600">
            {players.length} player{players.length !== 1 ? 's' : ''} joined
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <AnimatePresence>
            {players.map((player, i) => (
              <motion.span
                key={player.playerId}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium"
                style={{
                  backgroundColor: `${accentColor}10`,
                  color: accentColor,
                }}
              >
                {player.name}
                {player.isHost && (
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">Host</span>
                )}
              </motion.span>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Start Button (host only) */}
      {isHost && (
        <button
          onClick={onStart}
          disabled={!canStart}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white font-bold text-[15px] transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
          style={{ backgroundColor: canStart ? accentColor : '#9ca3af' }}
        >
          <Play className="w-4 h-4" />
          {canStart ? 'Start Game' : `Need ${minPlayers - players.length} more player${minPlayers - players.length !== 1 ? 's' : ''}`}
        </button>
      )}

      {/* Player waiting state */}
      {!isHost && (
        <div className="flex items-center justify-center gap-2 py-3">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            className="w-5 h-5 border-2 border-t-transparent rounded-full"
            style={{ borderColor: accentColor, borderTopColor: 'transparent' }}
          />
          <span className="text-sm text-gray-500">Waiting for host to start...</span>
        </div>
      )}
    </GlassCard>
  )
}
