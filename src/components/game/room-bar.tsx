'use client'

import React from 'react'
import { Wifi, WifiOff, Users, Copy, Check } from 'lucide-react'

interface RoomBarProps {
  roomCode: string
  playerCount: number
  isHost: boolean
  isConnected: boolean
  accentColor?: string
}

export function RoomBar({ roomCode, playerCount, isHost, isConnected, accentColor = '#4F46E5' }: RoomBarProps) {
  const [copied, setCopied] = React.useState(false)

  const copyCode = () => {
    const url = `${window.location.origin}/play?room=${roomCode}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-200/50">
      <div className="max-w-6xl mx-auto px-4 h-10 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <span className="font-mono font-bold tracking-wider" style={{ color: accentColor }}>
            {roomCode}
          </span>
          <button
            onClick={copyCode}
            className="flex items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied' : 'Share'}
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-gray-500">
            <Users className="w-3 h-3" />
            {playerCount}
          </span>
          <span className="flex items-center gap-1 text-gray-500">
            {isConnected ? (
              <Wifi className="w-3 h-3 text-green-500" />
            ) : (
              <WifiOff className="w-3 h-3 text-red-500" />
            )}
          </span>
          {isHost && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-white" style={{ backgroundColor: accentColor }}>
              Host
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
