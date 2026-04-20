'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { CheckCircle, Clock } from 'lucide-react'
import { GlassCard } from './glass-card'

interface PlayerWaitingProps {
  message?: string
  submittedMessage?: string
  hasSubmitted?: boolean
  accentColor?: string
  roomCode?: string
}

export function PlayerWaiting({
  message = 'Waiting for the host...',
  submittedMessage = 'Your answer has been submitted!',
  hasSubmitted = false,
  accentColor = '#4F46E5',
  roomCode,
}: PlayerWaitingProps) {
  return (
    <GlassCard className="p-8 text-center">
      {hasSubmitted ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div
            className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{ backgroundColor: `${accentColor}15` }}
          >
            <CheckCircle className="w-7 h-7" style={{ color: accentColor }} />
          </div>
          <p className="font-bold text-lg mb-1">{submittedMessage}</p>
          <p className="text-sm text-gray-500">{message}</p>
        </motion.div>
      ) : (
        <div>
          <div
            className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{ backgroundColor: `${accentColor}15` }}
          >
            <Clock className="w-7 h-7" style={{ color: accentColor }} />
          </div>
          <p className="font-medium text-gray-600 mb-2">{message}</p>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="w-6 h-6 border-2 border-t-transparent rounded-full mx-auto"
            style={{ borderColor: accentColor, borderTopColor: 'transparent' }}
          />
        </div>
      )}

      {roomCode && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-400">
            Room: <span className="font-mono font-bold tracking-wider" style={{ color: accentColor }}>{roomCode}</span>
          </p>
        </div>
      )}
    </GlassCard>
  )
}
