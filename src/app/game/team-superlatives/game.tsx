'use client'

import React, { useState, useCallback, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, ArrowRight, Brain, Sparkles, Plus, X, Check, ChevronRight, Crown, RotateCcw, Users, Eye } from 'lucide-react'
import { GlassCard } from '@/components/game/glass-card'
import { GameLayout } from '@/components/game/game-layout'
import { TeamNameInput } from '@/components/game/team-name-input'
import { RoomLobby } from '@/components/game/room-lobby'
import { PlayerWaiting } from '@/components/game/player-waiting'
import { RoomBar } from '@/components/game/room-bar'
import { useGameRoom, type UseGameRoomReturn } from '@/hooks/use-game-room'
import { useLocalGameState } from '@/hooks/use-local-game-state'

// ---------- Default Categories ----------

const DEFAULT_CATEGORIES = [
  'Most likely to reply-all by accident',
  'Most likely to survive a zombie apocalypse',
  'Most likely to become a stand-up comedian',
  'Most likely to have a secret talent show act',
  'Most likely to forget they\'re on mute',
  'Most likely to write a best-selling book',
  'Most likely to become famous on TikTok',
  'Most likely to be late to their own wedding',
  'Most likely to befriend a stranger on an airplane',
  'Most likely to win a cooking competition',
  'Most likely to have 100 unread emails',
  'Most likely to adopt 10 pets',
  'Most likely to start a startup',
  'Most likely to run a marathon on a whim',
  'Most likely to fall asleep in a meeting',
  'Most likely to quote a movie in every conversation',
  'Most likely to bring snacks to every meeting',
  'Most likely to plan the team outing',
  'Most likely to accidentally go viral',
  'Most likely to debug code in their sleep',
]

// ---------- Types ----------

type Phase = 'setup' | 'vote' | 'results'

interface VoteResult {
  category: string
  votes: Record<string, number>
  winner: string
  winnerVotes: number
}

interface LocalState {
  phase: Phase
  members: string[]
  selectedCategories: number[]
  customCategories: string[]
  currentCategoryIndex: number
  currentVotes: Record<string, number>
  voteLocked: boolean
  results: VoteResult[]
}

const INITIAL_LOCAL_STATE: LocalState = {
  phase: 'setup',
  members: [],
  selectedCategories: DEFAULT_CATEGORIES.map((_, i) => i),
  customCategories: [],
  currentCategoryIndex: 0,
  currentVotes: {},
  voteLocked: false,
  results: [],
}

// ---------- Room state shape ----------

interface RoomState {
  members: string[]
  categories: string[]
  currentCategoryIndex: number
  results: VoteResult[]
  revealedWinner: boolean
}

// ---------- Bar Chart Component ----------

function VoteBar({ name, votes, maxVotes, isWinner }: { name: string; votes: number; maxVotes: number; isWinner: boolean }) {
  const percentage = maxVotes > 0 ? (votes / maxVotes) * 100 : 0

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4 }}
      className="flex items-center gap-3"
    >
      <span className={`text-[14px] font-semibold w-28 text-right truncate ${isWinner ? 'text-amber-700' : 'text-gray-600'}`}>
        {isWinner && <Crown className="w-4 h-4 inline mr-1 text-amber-500" />}
        {name}
      </span>
      <div className="flex-1 h-10 bg-amber-100/50 rounded-xl overflow-hidden relative">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
          className={`h-full rounded-xl ${isWinner ? 'bg-gradient-to-r from-amber-400 to-yellow-500' : 'bg-amber-300/60'}`}
        />
        <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[13px] font-bold ${isWinner ? 'text-amber-800' : 'text-amber-600/70'}`}>
          {votes}
        </span>
      </div>
    </motion.div>
  )
}

// ---------- Winner Reveal ----------

function WinnerReveal({ winner, category }: { winner: string; category: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="text-center py-6"
    >
      <motion.div
        initial={{ rotate: -10, scale: 0.5 }}
        animate={{ rotate: 0, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2, type: 'spring', stiffness: 200 }}
        className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 shadow-[0_8px_32px_rgba(245,158,11,0.4)] mb-4"
      >
        <Trophy className="w-10 h-10 text-white" />
      </motion.div>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-gray-500 text-[14px] mb-2"
      >
        {category}
      </motion.p>
      <motion.h3
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="text-[32px] md:text-[40px] font-bold text-amber-700"
      >
        {winner}
      </motion.h3>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="flex items-center justify-center gap-1 mt-2"
      >
        {[...Array(3)].map((_, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 + i * 0.1 }}
            className="text-[24px]"
          >
            {i === 1 ? '\u{1F3C6}' : '\u{1F389}'}
          </motion.span>
        ))}
      </motion.div>
    </motion.div>
  )
}

// ---------- Result Card ----------

function ResultCard({ result, index }: { result: VoteResult; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      className="bg-white/70 backdrop-blur-sm border border-amber-200/60 rounded-2xl p-5 shadow-[0_4px_16px_rgba(245,158,11,0.06)]"
    >
      <p className="text-gray-500 text-[13px] mb-2">{result.category}</p>
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center flex-shrink-0">
          <Trophy className="w-4 h-4 text-white" />
        </div>
        <span className="text-[18px] font-bold text-amber-800 truncate">{result.winner}</span>
        <span className="text-amber-500/60 text-[13px] font-medium ml-auto flex-shrink-0">{result.winnerVotes} vote{result.winnerVotes !== 1 ? 's' : ''}</span>
      </div>
    </motion.div>
  )
}

// ---------- Awards Ceremony (shared between modes) ----------

function AwardsCeremony({ results, mostAwarded, onPlayAgain }: {
  results: VoteResult[]
  mostAwarded: { name: string; count: number } | null
  onPlayAgain: () => void
}) {
  return (
    <motion.div
      key="results"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
    >
      {/* Awards Ceremony Header */}
      <div className="text-center mb-8">
        <motion.div
          initial={{ scale: 0.5, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 0.6, type: 'spring', stiffness: 200 }}
          className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 shadow-[0_12px_48px_rgba(245,158,11,0.4)] mb-6"
        >
          <Trophy className="w-12 h-12 text-white" />
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-[32px] md:text-[44px] font-bold bg-gradient-to-r from-amber-600 via-yellow-500 to-orange-500 bg-clip-text text-transparent"
        >
          Awards Ceremony
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-gray-500 text-[16px] mt-2"
        >
          And the winners are...
        </motion.p>
      </div>

      {/* Most Awarded player */}
      {mostAwarded && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500 rounded-2xl p-6 md:p-8 mb-6 text-center shadow-[0_8px_32px_rgba(245,158,11,0.25)]"
        >
          <Crown className="w-10 h-10 text-white/90 mx-auto mb-3" />
          <p className="text-white/80 text-[14px] font-medium mb-1">Most Awarded Player</p>
          <h3 className="text-[28px] md:text-[36px] font-bold text-white">{mostAwarded.name}</h3>
          <p className="text-white/80 text-[15px] mt-1">Won {mostAwarded.count} categor{mostAwarded.count !== 1 ? 'ies' : 'y'}</p>
        </motion.div>
      )}

      {/* All results */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
        {results.map((result, i) => (
          <ResultCard key={i} result={result} index={i} />
        ))}
      </div>

      {/* Play Again */}
      <div className="text-center">
        <motion.button
          onClick={onPlayAgain}
          className="px-8 py-3.5 rounded-full font-bold text-[16px] bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500 text-white hover:shadow-[0_8px_32px_rgba(245,158,11,0.4)] shadow-[0_4px_16px_rgba(245,158,11,0.3)] transition-all active:scale-[0.97]"
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
        >
          <span className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5" />
            Play Again
          </span>
        </motion.button>
      </div>
    </motion.div>
  )
}

// ---------- getMostAwarded helper ----------

function getMostAwarded(results: VoteResult[]): { name: string; count: number } | null {
  if (results.length === 0) return null
  const wins: Record<string, number> = {}
  for (const r of results) {
    wins[r.winner] = (wins[r.winner] || 0) + 1
  }
  let topName = ''
  let topCount = 0
  for (const [name, count] of Object.entries(wins)) {
    if (count > topCount) {
      topCount = count
      topName = name
    }
  }
  return { name: topName, count: topCount }
}

// ---------- computeWinner helper ----------

function computeWinner(votes: Record<string, number>, members: string[]): { winner: string; winnerVotes: number } {
  let winner = members[0] || ''
  let maxVotes = 0
  for (const [name, count] of Object.entries(votes)) {
    if (count > maxVotes) {
      maxVotes = count
      winner = name
    }
  }
  return { winner, winnerVotes: maxVotes }
}

// ======================================================================
// LOCAL MODE
// ======================================================================

function LocalMode() {
  const [state, setState, clearState] = useLocalGameState<LocalState>(
    'reattend-game-team-superlatives',
    INITIAL_LOCAL_STATE
  )

  const {
    phase,
    members,
    selectedCategories,
    customCategories,
    currentCategoryIndex,
    currentVotes,
    voteLocked,
    results,
  } = state

  const [memberInput, setMemberInput] = useState('')
  const [customInput, setCustomInput] = useState('')

  const selectedCategoriesSet = useMemo(() => new Set(selectedCategories), [selectedCategories])

  // All active categories (selected defaults + custom)
  const activeCategories = useMemo(() => {
    const selected = DEFAULT_CATEGORIES.filter((_, i) => selectedCategoriesSet.has(i))
    return [...selected, ...customCategories]
  }, [selectedCategoriesSet, customCategories])

  // Setup validation
  const canStart = members.length >= 3 && activeCategories.length >= 3

  // ---------- Setup Handlers ----------

  const addMember = useCallback(() => {
    const name = memberInput.trim()
    if (name && !members.includes(name)) {
      setState(prev => ({ ...prev, members: [...prev.members, name] }))
      setMemberInput('')
    }
  }, [memberInput, members, setState])

  const removeMember = useCallback((name: string) => {
    setState(prev => ({ ...prev, members: prev.members.filter(m => m !== name) }))
  }, [setState])

  const toggleCategory = useCallback((index: number) => {
    setState(prev => {
      const set = new Set(prev.selectedCategories)
      if (set.has(index)) {
        set.delete(index)
      } else {
        set.add(index)
      }
      return { ...prev, selectedCategories: Array.from(set) }
    })
  }, [setState])

  const addCustomCategory = useCallback(() => {
    const cat = customInput.trim()
    if (cat && !customCategories.includes(cat)) {
      const formatted = cat.startsWith('Most likely to') ? cat : `Most likely to ${cat}`
      setState(prev => ({ ...prev, customCategories: [...prev.customCategories, formatted] }))
      setCustomInput('')
    }
  }, [customInput, customCategories, setState])

  const removeCustomCategory = useCallback((cat: string) => {
    setState(prev => ({ ...prev, customCategories: prev.customCategories.filter(c => c !== cat) }))
  }, [setState])

  const selectAll = useCallback(() => {
    setState(prev => ({ ...prev, selectedCategories: DEFAULT_CATEGORIES.map((_, i) => i) }))
  }, [setState])

  const deselectAll = useCallback(() => {
    setState(prev => ({ ...prev, selectedCategories: [] }))
  }, [setState])

  // ---------- Vote Handlers ----------

  const startVoting = useCallback(() => {
    setState(prev => ({
      ...prev,
      phase: 'vote',
      currentCategoryIndex: 0,
      currentVotes: {},
      voteLocked: false,
      results: [],
    }))
  }, [setState])

  const castVote = useCallback((name: string) => {
    if (voteLocked) return
    setState(prev => ({
      ...prev,
      currentVotes: {
        ...prev.currentVotes,
        [name]: (prev.currentVotes[name] || 0) + 1,
      },
    }))
  }, [voteLocked, setState])

  const lockVotes = useCallback(() => {
    const { winner, winnerVotes } = computeWinner(currentVotes, members)
    const result: VoteResult = {
      category: activeCategories[currentCategoryIndex],
      votes: { ...currentVotes },
      winner,
      winnerVotes,
    }
    setState(prev => ({
      ...prev,
      voteLocked: true,
      results: [...prev.results, result],
    }))
  }, [currentVotes, members, activeCategories, currentCategoryIndex, setState])

  const nextCategory = useCallback(() => {
    const nextIdx = currentCategoryIndex + 1
    if (nextIdx >= activeCategories.length) {
      setState(prev => ({ ...prev, phase: 'results' }))
    } else {
      setState(prev => ({
        ...prev,
        currentCategoryIndex: nextIdx,
        currentVotes: {},
        voteLocked: false,
      }))
    }
  }, [currentCategoryIndex, activeCategories.length, setState])

  const playAgain = useCallback(() => {
    clearState()
  }, [clearState])

  // Computed values
  const totalCurrentVotes = Object.values(currentVotes).reduce((sum, v) => sum + v, 0)
  const maxCurrentVotes = Math.max(...Object.values(currentVotes), 0)
  const currentResult = voteLocked ? results[results.length - 1] : null
  const mostAwarded = useMemo(() => getMostAwarded(results), [results])

  // ---- Render voting area (children) ----
  const votingContent = (
    <AnimatePresence mode="wait">
      {/* ==================== SETUP PHASE ==================== */}
      {phase === 'setup' && (
        <motion.div
          key="setup"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4 }}
        >
          {/* Add Team Members */}
          <GlassCard className="p-6 md:p-8 mb-6 !shadow-[0_8px_32px_rgba(245,158,11,0.06)]">
            <h2 className="text-[20px] font-bold mb-1 flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-500" />
              Team Members
            </h2>
            <p className="text-gray-400 text-[13px] mb-5">Add at least 3 team members to start</p>

            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={memberInput}
                onChange={e => setMemberInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addMember()}
                placeholder="Enter a name..."
                className="flex-1 px-4 py-3 rounded-xl border border-gray-200/80 bg-white/80 text-[15px] outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all placeholder:text-gray-300"
              />
              <button
                onClick={addMember}
                disabled={!memberInput.trim()}
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-bold text-[14px] hover:shadow-[0_4px_16px_rgba(245,158,11,0.3)] disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.97] flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>

            {members.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {members.map(name => (
                  <motion.span
                    key={name}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-amber-50 border border-amber-200/60 text-[14px] font-medium text-amber-800"
                  >
                    {name}
                    <button
                      onClick={() => removeMember(name)}
                      className="w-4 h-4 rounded-full bg-amber-200/60 hover:bg-amber-300/80 flex items-center justify-center transition-colors"
                    >
                      <X className="w-2.5 h-2.5 text-amber-700" />
                    </button>
                  </motion.span>
                ))}
              </div>
            )}

            {members.length > 0 && (
              <p className="text-gray-400 text-[12px] mt-3">{members.length} member{members.length !== 1 ? 's' : ''} added</p>
            )}
          </GlassCard>

          {/* Select Categories */}
          <GlassCard className="p-6 md:p-8 mb-6 !shadow-[0_8px_32px_rgba(245,158,11,0.06)]">
            <h2 className="text-[20px] font-bold mb-1 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              Categories
            </h2>
            <p className="text-gray-400 text-[13px] mb-4">Pick at least 3 categories to vote on</p>

            <div className="flex gap-2 mb-4">
              <button
                onClick={selectAll}
                className="text-[12px] font-semibold text-amber-600 hover:text-amber-700 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 transition-colors"
              >
                Select all
              </button>
              <button
                onClick={deselectAll}
                className="text-[12px] font-semibold text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                Deselect all
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[400px] overflow-y-auto pr-1">
              {DEFAULT_CATEGORIES.map((cat, i) => (
                <button
                  key={i}
                  onClick={() => toggleCategory(i)}
                  className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-left text-[13px] font-medium transition-all ${
                    selectedCategoriesSet.has(i)
                      ? 'bg-amber-50 border border-amber-300/60 text-amber-800'
                      : 'bg-white/40 border border-gray-200/60 text-gray-400 hover:border-gray-300'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ${
                    selectedCategoriesSet.has(i)
                      ? 'bg-gradient-to-br from-amber-400 to-yellow-500'
                      : 'bg-gray-200/60'
                  }`}>
                    {selectedCategoriesSet.has(i) && <Check className="w-3 h-3 text-white" />}
                  </span>
                  <span className="truncate">{cat}</span>
                </button>
              ))}
            </div>

            {/* Custom categories */}
            {customCategories.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200/40">
                <p className="text-[12px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Custom</p>
                <div className="flex flex-wrap gap-2">
                  {customCategories.map(cat => (
                    <span
                      key={cat}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-50 border border-orange-200/60 text-[13px] font-medium text-orange-700"
                    >
                      {cat}
                      <button
                        onClick={() => removeCustomCategory(cat)}
                        className="w-4 h-4 rounded-full bg-orange-200/60 hover:bg-orange-300/80 flex items-center justify-center transition-colors"
                      >
                        <X className="w-2.5 h-2.5 text-orange-700" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Add custom category */}
            <div className="mt-4 pt-4 border-t border-gray-200/40">
              <p className="text-[13px] font-semibold text-gray-500 mb-2">Add a custom category</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customInput}
                  onChange={e => setCustomInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addCustomCategory()}
                  placeholder="Most likely to..."
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200/80 bg-white/80 text-[14px] outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all placeholder:text-gray-300"
                />
                <button
                  onClick={addCustomCategory}
                  disabled={!customInput.trim()}
                  className="px-4 py-2.5 rounded-xl bg-orange-100 hover:bg-orange-200 text-orange-700 font-bold text-[13px] disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.97]"
                >
                  Add
                </button>
              </div>
            </div>

            <p className="text-gray-400 text-[12px] mt-3">{activeCategories.length} categor{activeCategories.length !== 1 ? 'ies' : 'y'} selected</p>
          </GlassCard>

          {/* Start Button */}
          <div className="text-center">
            <motion.button
              onClick={startVoting}
              disabled={!canStart}
              className={`
                px-10 py-4 rounded-full font-bold text-[18px] text-white transition-all active:scale-[0.97]
                ${canStart
                  ? 'bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500 hover:shadow-[0_8px_32px_rgba(245,158,11,0.4)] shadow-[0_4px_16px_rgba(245,158,11,0.3)]'
                  : 'bg-gray-300 cursor-not-allowed'
                }
              `}
              whileHover={canStart ? { scale: 1.04 } : {}}
              whileTap={canStart ? { scale: 0.97 } : {}}
            >
              Start Voting
              <ChevronRight className="w-5 h-5 inline ml-1" />
            </motion.button>
            {!canStart && (
              <p className="text-gray-400 text-[13px] mt-3">
                {members.length < 3 && `Add ${3 - members.length} more member${3 - members.length !== 1 ? 's' : ''}`}
                {members.length < 3 && activeCategories.length < 3 && ' and '}
                {activeCategories.length < 3 && `select ${3 - activeCategories.length} more categor${3 - activeCategories.length !== 1 ? 'ies' : 'y'}`}
              </p>
            )}
          </div>
        </motion.div>
      )}

      {/* ==================== VOTE PHASE ==================== */}
      {phase === 'vote' && (
        <motion.div
          key={`vote-${currentCategoryIndex}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4 }}
        >
          {/* Progress bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[13px] font-medium text-gray-400">
                Category {currentCategoryIndex + 1} of {activeCategories.length}
              </span>
              <span className="text-[13px] font-medium text-amber-500">
                {results.length} completed
              </span>
            </div>
            <div className="w-full h-2 bg-amber-100/60 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${((currentCategoryIndex + (voteLocked ? 1 : 0)) / activeCategories.length) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* Category card */}
          <GlassCard className="p-6 md:p-8 mb-6 !border-amber-200/60 !shadow-[0_8px_32px_rgba(245,158,11,0.08)]">
            <motion.h2
              key={activeCategories[currentCategoryIndex]}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[24px] sm:text-[30px] md:text-[36px] font-bold text-center leading-[1.3] text-[#1a1a2e]"
            >
              {activeCategories[currentCategoryIndex]}
            </motion.h2>
            <p className="text-gray-400 text-[14px] text-center mt-3">
              {voteLocked ? 'Votes are locked!' : 'Everyone tap a name to vote - multiple votes allowed'}
            </p>
          </GlassCard>

          {/* Vote buttons */}
          {!voteLocked && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
              {members.map(name => (
                <motion.button
                  key={name}
                  onClick={() => castVote(name)}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.96 }}
                  className="relative bg-white/70 backdrop-blur-sm border-2 border-amber-200/60 hover:border-amber-400 rounded-2xl p-4 md:p-5 text-center transition-all hover:shadow-[0_4px_20px_rgba(245,158,11,0.15)]"
                >
                  <span className="text-[16px] md:text-[18px] font-bold text-[#1a1a2e] block truncate">{name}</span>
                  {currentVotes[name] && (
                    <motion.span
                      key={currentVotes[name]}
                      initial={{ scale: 1.4 }}
                      animate={{ scale: 1 }}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 text-white text-[12px] font-bold flex items-center justify-center shadow-sm"
                    >
                      {currentVotes[name]}
                    </motion.span>
                  )}
                </motion.button>
              ))}
            </div>
          )}

          {/* Lock button */}
          {!voteLocked && (
            <div className="text-center mb-6">
              <motion.button
                onClick={lockVotes}
                disabled={totalCurrentVotes === 0}
                className={`
                  px-8 py-3.5 rounded-full font-bold text-[16px] transition-all active:scale-[0.97]
                  ${totalCurrentVotes > 0
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white hover:shadow-[0_4px_20px_rgba(245,158,11,0.3)] shadow-[0_4px_14px_rgba(245,158,11,0.2)]'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }
                `}
                whileHover={totalCurrentVotes > 0 ? { scale: 1.03 } : {}}
                whileTap={totalCurrentVotes > 0 ? { scale: 0.97 } : {}}
              >
                Lock Votes ({totalCurrentVotes})
              </motion.button>
            </div>
          )}

          {/* Results after locking */}
          {voteLocked && currentResult && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              {/* Winner reveal */}
              <WinnerReveal winner={currentResult.winner} category={currentResult.category} />

              {/* Vote distribution */}
              <GlassCard className="p-6 mt-4 mb-6 !border-amber-200/60">
                <h3 className="text-[15px] font-bold text-gray-500 mb-4">Vote Distribution</h3>
                <div className="space-y-3">
                  {members
                    .sort((a, b) => (currentResult.votes[b] || 0) - (currentResult.votes[a] || 0))
                    .map(name => (
                      <VoteBar
                        key={name}
                        name={name}
                        votes={currentResult.votes[name] || 0}
                        maxVotes={maxCurrentVotes}
                        isWinner={name === currentResult.winner}
                      />
                    ))}
                </div>
              </GlassCard>

              {/* Next button */}
              <div className="text-center">
                <motion.button
                  onClick={nextCategory}
                  className="px-8 py-3.5 rounded-full font-bold text-[16px] bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500 text-white hover:shadow-[0_8px_32px_rgba(245,158,11,0.4)] shadow-[0_4px_16px_rgba(245,158,11,0.3)] transition-all active:scale-[0.97]"
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                >
                  {currentCategoryIndex + 1 >= activeCategories.length ? (
                    <span className="flex items-center gap-2">
                      <Trophy className="w-5 h-5" />
                      See Awards Ceremony
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Next Category
                      <ChevronRight className="w-5 h-5" />
                    </span>
                  )}
                </motion.button>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )

  // ---- Render results (awards ceremony) ----
  const resultsContent = (
    <AwardsCeremony results={results} mostAwarded={mostAwarded} onPlayAgain={playAgain} />
  )

  return (
    <>
      {phase === 'results' ? resultsContent : votingContent}
    </>
  )
}

// ======================================================================
// HOST MODE
// ======================================================================

function HostMode({ gameRoom }: { gameRoom: UseGameRoomReturn }) {
  const roomState: RoomState | null = gameRoom.room?.state as RoomState | null
  const roomPhase = (gameRoom.room?.phase || 'lobby') as string

  // Local setup state (before room is started)
  const [members, setMembers] = useState<string[]>([])
  const [memberInput, setMemberInput] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<Set<number>>(() => new Set(DEFAULT_CATEGORIES.map((_, i) => i)))
  const [customCategories, setCustomCategories] = useState<string[]>([])
  const [customInput, setCustomInput] = useState('')

  const activeCategories = useMemo(() => {
    const selected = DEFAULT_CATEGORIES.filter((_, i) => selectedCategories.has(i))
    return [...selected, ...customCategories]
  }, [selectedCategories, customCategories])

  const canStart = members.length >= 3 && activeCategories.length >= 3

  // Setup handlers
  const addMember = useCallback(() => {
    const name = memberInput.trim()
    if (name && !members.includes(name)) {
      setMembers(prev => [...prev, name])
      setMemberInput('')
    }
  }, [memberInput, members])

  const removeMember = useCallback((name: string) => {
    setMembers(prev => prev.filter(m => m !== name))
  }, [])

  const toggleCategory = useCallback((index: number) => {
    setSelectedCategories(prev => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }, [])

  const addCustomCategory = useCallback(() => {
    const cat = customInput.trim()
    if (cat && !customCategories.includes(cat)) {
      const formatted = cat.startsWith('Most likely to') ? cat : `Most likely to ${cat}`
      setCustomCategories(prev => [...prev, formatted])
      setCustomInput('')
    }
  }, [customInput, customCategories])

  const removeCustomCategory = useCallback((cat: string) => {
    setCustomCategories(prev => prev.filter(c => c !== cat))
  }, [])

  const selectAll = useCallback(() => {
    setSelectedCategories(new Set(DEFAULT_CATEGORIES.map((_, i) => i)))
  }, [])

  const deselectAll = useCallback(() => {
    setSelectedCategories(new Set())
  }, [])

  // Start game (transition from lobby to voting)
  const startGame = useCallback(async () => {
    await gameRoom.updateRoom({
      phase: 'voting',
      state: {
        members,
        categories: activeCategories,
        currentCategoryIndex: 0,
        results: [],
        revealedWinner: false,
      } satisfies RoomState,
    })
  }, [gameRoom, members, activeCategories])

  // Get live vote tally from actions
  const currentCategoryIndex = roomState?.currentCategoryIndex ?? 0
  const currentCategory = roomState?.categories?.[currentCategoryIndex] ?? ''
  const voteActions = gameRoom.getActionsOfType('vote')

  const liveVotes = useMemo(() => {
    const tally: Record<string, number> = {}
    for (const action of voteActions) {
      if (action.payload?.categoryIndex === currentCategoryIndex) {
        const name = action.payload?.memberName
        if (name) {
          tally[name] = (tally[name] || 0) + 1
        }
      }
    }
    return tally
  }, [voteActions, currentCategoryIndex])

  const totalLiveVotes = Object.values(liveVotes).reduce((sum, v) => sum + v, 0)

  // Count unique players who voted for this category
  const uniqueVotersThisCategory = useMemo(() => {
    const voters = new Set<string>()
    for (const action of voteActions) {
      if (action.payload?.categoryIndex === currentCategoryIndex) {
        voters.add(action.playerId)
      }
    }
    return voters.size
  }, [voteActions, currentCategoryIndex])

  // Reveal winner
  const revealWinner = useCallback(async () => {
    if (!roomState) return
    const { winner, winnerVotes } = computeWinner(liveVotes, roomState.members)
    const result: VoteResult = {
      category: currentCategory,
      votes: { ...liveVotes },
      winner,
      winnerVotes,
    }
    await gameRoom.updateRoom({
      state: {
        ...roomState,
        results: [...(roomState.results || []), result],
        revealedWinner: true,
      },
    })
  }, [gameRoom, roomState, liveVotes, currentCategory])

  // Next category
  const nextCat = useCallback(async () => {
    if (!roomState) return
    const nextIdx = currentCategoryIndex + 1
    if (nextIdx >= roomState.categories.length) {
      await gameRoom.updateRoom({
        phase: 'awards',
        state: { ...roomState, revealedWinner: false },
      })
    } else {
      await gameRoom.updateRoom({
        state: {
          ...roomState,
          currentCategoryIndex: nextIdx,
          revealedWinner: false,
        },
      })
    }
  }, [gameRoom, roomState, currentCategoryIndex])

  // Play again
  const playAgain = useCallback(async () => {
    await gameRoom.updateRoom({
      phase: 'lobby',
      state: null,
    })
    setMembers([])
    setSelectedCategories(new Set(DEFAULT_CATEGORIES.map((_, i) => i)))
    setCustomCategories([])
  }, [gameRoom])

  // Current result after reveal
  const currentRevealedResult = roomState?.revealedWinner && roomState.results.length > 0
    ? roomState.results[roomState.results.length - 1]
    : null

  const maxLiveVotes = Math.max(...Object.values(liveVotes), 0)
  const allResults = roomState?.results || []
  const mostAwarded = useMemo(() => getMostAwarded(allResults), [allResults])

  // ---- LOBBY ----
  if (roomPhase === 'lobby' || !roomPhase) {
    return (
      <div>
        {/* Setup: Members + Categories */}
        <GlassCard className="p-6 md:p-8 mb-6 !shadow-[0_8px_32px_rgba(245,158,11,0.06)]">
          <h2 className="text-[20px] font-bold mb-1 flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-500" />
            Team Members
          </h2>
          <p className="text-gray-400 text-[13px] mb-5">Add at least 3 team members for voting</p>

          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={memberInput}
              onChange={e => setMemberInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addMember()}
              placeholder="Enter a name..."
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200/80 bg-white/80 text-[15px] outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all placeholder:text-gray-300"
            />
            <button
              onClick={addMember}
              disabled={!memberInput.trim()}
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-bold text-[14px] hover:shadow-[0_4px_16px_rgba(245,158,11,0.3)] disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.97] flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>

          {members.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {members.map(name => (
                <motion.span
                  key={name}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-amber-50 border border-amber-200/60 text-[14px] font-medium text-amber-800"
                >
                  {name}
                  <button
                    onClick={() => removeMember(name)}
                    className="w-4 h-4 rounded-full bg-amber-200/60 hover:bg-amber-300/80 flex items-center justify-center transition-colors"
                  >
                    <X className="w-2.5 h-2.5 text-amber-700" />
                  </button>
                </motion.span>
              ))}
            </div>
          )}
          {members.length > 0 && (
            <p className="text-gray-400 text-[12px] mt-3">{members.length} member{members.length !== 1 ? 's' : ''} added</p>
          )}
        </GlassCard>

        <GlassCard className="p-6 md:p-8 mb-6 !shadow-[0_8px_32px_rgba(245,158,11,0.06)]">
          <h2 className="text-[20px] font-bold mb-1 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            Categories
          </h2>
          <p className="text-gray-400 text-[13px] mb-4">Pick at least 3 categories to vote on</p>

          <div className="flex gap-2 mb-4">
            <button onClick={selectAll} className="text-[12px] font-semibold text-amber-600 hover:text-amber-700 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 transition-colors">
              Select all
            </button>
            <button onClick={deselectAll} className="text-[12px] font-semibold text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors">
              Deselect all
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[400px] overflow-y-auto pr-1">
            {DEFAULT_CATEGORIES.map((cat, i) => (
              <button
                key={i}
                onClick={() => toggleCategory(i)}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-left text-[13px] font-medium transition-all ${
                  selectedCategories.has(i)
                    ? 'bg-amber-50 border border-amber-300/60 text-amber-800'
                    : 'bg-white/40 border border-gray-200/60 text-gray-400 hover:border-gray-300'
                }`}
              >
                <span className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ${
                  selectedCategories.has(i)
                    ? 'bg-gradient-to-br from-amber-400 to-yellow-500'
                    : 'bg-gray-200/60'
                }`}>
                  {selectedCategories.has(i) && <Check className="w-3 h-3 text-white" />}
                </span>
                <span className="truncate">{cat}</span>
              </button>
            ))}
          </div>

          {customCategories.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200/40">
              <p className="text-[12px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Custom</p>
              <div className="flex flex-wrap gap-2">
                {customCategories.map(cat => (
                  <span key={cat} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-50 border border-orange-200/60 text-[13px] font-medium text-orange-700">
                    {cat}
                    <button onClick={() => removeCustomCategory(cat)} className="w-4 h-4 rounded-full bg-orange-200/60 hover:bg-orange-300/80 flex items-center justify-center transition-colors">
                      <X className="w-2.5 h-2.5 text-orange-700" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-gray-200/40">
            <p className="text-[13px] font-semibold text-gray-500 mb-2">Add a custom category</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={customInput}
                onChange={e => setCustomInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCustomCategory()}
                placeholder="Most likely to..."
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200/80 bg-white/80 text-[14px] outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all placeholder:text-gray-300"
              />
              <button
                onClick={addCustomCategory}
                disabled={!customInput.trim()}
                className="px-4 py-2.5 rounded-xl bg-orange-100 hover:bg-orange-200 text-orange-700 font-bold text-[13px] disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.97]"
              >
                Add
              </button>
            </div>
          </div>

          <p className="text-gray-400 text-[12px] mt-3">{activeCategories.length} categor{activeCategories.length !== 1 ? 'ies' : 'y'} selected</p>
        </GlassCard>

        {/* Players in room */}
        {gameRoom.players.length > 0 && (
          <GlassCard className="p-5 mb-6 !shadow-[0_8px_32px_rgba(245,158,11,0.06)]">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-amber-500" />
              <span className="text-[14px] font-semibold text-gray-600">{gameRoom.players.length} player{gameRoom.players.length !== 1 ? 's' : ''} in room</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {gameRoom.players.map(p => (
                <span key={p.playerId} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-amber-50 text-[13px] font-medium text-amber-700">
                  {p.name}
                  {p.isHost && <span className="text-[10px] font-bold uppercase tracking-wider opacity-60 ml-1">Host</span>}
                </span>
              ))}
            </div>
          </GlassCard>
        )}

        {/* Start button */}
        <div className="text-center">
          <motion.button
            onClick={startGame}
            disabled={!canStart}
            className={`
              px-10 py-4 rounded-full font-bold text-[18px] text-white transition-all active:scale-[0.97]
              ${canStart
                ? 'bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500 hover:shadow-[0_8px_32px_rgba(245,158,11,0.4)] shadow-[0_4px_16px_rgba(245,158,11,0.3)]'
                : 'bg-gray-300 cursor-not-allowed'
              }
            `}
            whileHover={canStart ? { scale: 1.04 } : {}}
            whileTap={canStart ? { scale: 0.97 } : {}}
          >
            Start Game
            <ChevronRight className="w-5 h-5 inline ml-1" />
          </motion.button>
          {!canStart && (
            <p className="text-gray-400 text-[13px] mt-3">
              {members.length < 3 && `Add ${3 - members.length} more member${3 - members.length !== 1 ? 's' : ''}`}
              {members.length < 3 && activeCategories.length < 3 && ' and '}
              {activeCategories.length < 3 && `select ${3 - activeCategories.length} more categor${3 - activeCategories.length !== 1 ? 'ies' : 'y'}`}
            </p>
          )}
        </div>
      </div>
    )
  }

  // ---- VOTING ----
  if (roomPhase === 'voting' && roomState) {
    return (
      <div>
        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] font-medium text-gray-400">
              Category {currentCategoryIndex + 1} of {roomState.categories.length}
            </span>
            <span className="text-[13px] font-medium text-amber-500">
              {uniqueVotersThisCategory} voted &middot; {totalLiveVotes} total votes
            </span>
          </div>
          <div className="w-full h-2 bg-amber-100/60 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${((currentCategoryIndex + (roomState.revealedWinner ? 1 : 0)) / roomState.categories.length) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        {/* Category card */}
        <GlassCard className="p-6 md:p-8 mb-6 !border-amber-200/60 !shadow-[0_8px_32px_rgba(245,158,11,0.08)]">
          <motion.h2
            key={currentCategory}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[24px] sm:text-[30px] md:text-[36px] font-bold text-center leading-[1.3] text-[#1a1a2e]"
          >
            {currentCategory}
          </motion.h2>
          <p className="text-gray-400 text-[14px] text-center mt-3">
            {roomState.revealedWinner ? 'Winner revealed!' : 'Players are voting on their phones...'}
          </p>
        </GlassCard>

        {/* Live vote tally */}
        {!roomState.revealedWinner && (
          <GlassCard className="p-6 mb-6 !border-amber-200/60">
            <h3 className="text-[15px] font-bold text-gray-500 mb-4">Live Vote Count</h3>
            <div className="space-y-3">
              {roomState.members.map(name => (
                <VoteBar
                  key={name}
                  name={name}
                  votes={liveVotes[name] || 0}
                  maxVotes={maxLiveVotes}
                  isWinner={false}
                />
              ))}
            </div>
          </GlassCard>
        )}

        {/* Reveal Winner button */}
        {!roomState.revealedWinner && (
          <div className="text-center mb-6">
            <motion.button
              onClick={revealWinner}
              disabled={totalLiveVotes === 0}
              className={`
                px-8 py-3.5 rounded-full font-bold text-[16px] transition-all active:scale-[0.97]
                ${totalLiveVotes > 0
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white hover:shadow-[0_4px_20px_rgba(245,158,11,0.3)] shadow-[0_4px_14px_rgba(245,158,11,0.2)]'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }
              `}
              whileHover={totalLiveVotes > 0 ? { scale: 1.03 } : {}}
              whileTap={totalLiveVotes > 0 ? { scale: 0.97 } : {}}
            >
              <span className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Reveal Winner ({totalLiveVotes} votes)
              </span>
            </motion.button>
          </div>
        )}

        {/* After reveal */}
        {roomState.revealedWinner && currentRevealedResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <WinnerReveal winner={currentRevealedResult.winner} category={currentRevealedResult.category} />

            <GlassCard className="p-6 mt-4 mb-6 !border-amber-200/60">
              <h3 className="text-[15px] font-bold text-gray-500 mb-4">Vote Distribution</h3>
              <div className="space-y-3">
                {roomState.members
                  .sort((a, b) => (currentRevealedResult.votes[b] || 0) - (currentRevealedResult.votes[a] || 0))
                  .map(name => (
                    <VoteBar
                      key={name}
                      name={name}
                      votes={currentRevealedResult.votes[name] || 0}
                      maxVotes={currentRevealedResult.winnerVotes}
                      isWinner={name === currentRevealedResult.winner}
                    />
                  ))}
              </div>
            </GlassCard>

            <div className="text-center">
              <motion.button
                onClick={nextCat}
                className="px-8 py-3.5 rounded-full font-bold text-[16px] bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500 text-white hover:shadow-[0_8px_32px_rgba(245,158,11,0.4)] shadow-[0_4px_16px_rgba(245,158,11,0.3)] transition-all active:scale-[0.97]"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
              >
                {currentCategoryIndex + 1 >= roomState.categories.length ? (
                  <span className="flex items-center gap-2">
                    <Trophy className="w-5 h-5" />
                    Awards Ceremony
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Next Category
                    <ChevronRight className="w-5 h-5" />
                  </span>
                )}
              </motion.button>
            </div>
          </motion.div>
        )}
      </div>
    )
  }

  // ---- AWARDS ----
  if (roomPhase === 'awards' && roomState) {
    return (
      <AwardsCeremony results={allResults} mostAwarded={mostAwarded} onPlayAgain={playAgain} />
    )
  }

  return null
}

// ======================================================================
// PLAYER MODE
// ======================================================================

function PlayerMode({ gameRoom }: { gameRoom: UseGameRoomReturn }) {
  const roomState: RoomState | null = gameRoom.room?.state as RoomState | null
  const roomPhase = (gameRoom.room?.phase || 'lobby') as string

  const currentCategoryIndex = roomState?.currentCategoryIndex ?? 0
  const currentCategory = roomState?.categories?.[currentCategoryIndex] ?? ''

  // Track which categories this player has already voted on
  const myVotes = gameRoom.getPlayerActions(gameRoom.playerId, 'vote')
  const hasVotedThisCategory = useMemo(() => {
    return myVotes.some(a => a.payload?.categoryIndex === currentCategoryIndex)
  }, [myVotes, currentCategoryIndex])

  const submitVote = useCallback(async (memberName: string) => {
    await gameRoom.submitAction('vote', {
      categoryIndex: currentCategoryIndex,
      memberName,
    })
  }, [gameRoom, currentCategoryIndex])

  const allResults = roomState?.results || []
  const mostAwarded = useMemo(() => getMostAwarded(allResults), [allResults])

  // ---- LOBBY ----
  if (roomPhase === 'lobby' || !roomPhase) {
    return (
      <PlayerWaiting
        message="Waiting for the host to start the game..."
        accentColor="#D97706"
        roomCode={gameRoom.roomCode || undefined}
      />
    )
  }

  // ---- VOTING ----
  if (roomPhase === 'voting' && roomState) {
    if (hasVotedThisCategory) {
      return (
        <PlayerWaiting
          hasSubmitted
          submittedMessage="Vote submitted!"
          message={roomState.revealedWinner && roomState.results.length > 0
            ? `Winner: ${roomState.results[roomState.results.length - 1].winner}`
            : 'Waiting for the host to reveal the winner...'
          }
          accentColor="#D97706"
          roomCode={gameRoom.roomCode || undefined}
        />
      )
    }

    return (
      <div>
        {/* Category display */}
        <GlassCard className="p-6 mb-6 !border-amber-200/60 !shadow-[0_8px_32px_rgba(245,158,11,0.08)]">
          <p className="text-amber-500 text-[12px] font-bold uppercase tracking-wider text-center mb-2">
            Category {currentCategoryIndex + 1} of {roomState.categories.length}
          </p>
          <h2 className="text-[22px] sm:text-[28px] font-bold text-center leading-[1.3] text-[#1a1a2e]">
            {currentCategory}
          </h2>
          <p className="text-gray-400 text-[13px] text-center mt-2">Tap a name to vote</p>
        </GlassCard>

        {/* Vote buttons - big tap targets for mobile */}
        <div className="space-y-3">
          {roomState.members.map(name => (
            <motion.button
              key={name}
              onClick={() => submitVote(name)}
              whileTap={{ scale: 0.96 }}
              className="w-full bg-white/70 backdrop-blur-sm border-2 border-amber-200/60 hover:border-amber-400 rounded-2xl p-5 text-center transition-all hover:shadow-[0_4px_20px_rgba(245,158,11,0.15)] active:bg-amber-50"
            >
              <span className="text-[18px] font-bold text-[#1a1a2e]">{name}</span>
            </motion.button>
          ))}
        </div>
      </div>
    )
  }

  // ---- AWARDS ----
  if (roomPhase === 'awards' && roomState) {
    return (
      <AwardsCeremony
        results={allResults}
        mostAwarded={mostAwarded}
        onPlayAgain={() => {}}
      />
    )
  }

  return (
    <PlayerWaiting
      message="Waiting..."
      accentColor="#D97706"
      roomCode={gameRoom.roomCode || undefined}
    />
  )
}

// ======================================================================
// MAIN COMPONENT
// ======================================================================

export function TeamSuperlatives() {
  const gameRoom = useGameRoom({ gameType: 'team-superlatives' })
  const [mode, setMode] = useState<'name' | 'join' | 'local' | 'host' | 'player'>('name')

  // Determine mode from URL room code on mount
  const hasRoomCode = !!gameRoom.roomCode

  // Auto-detect mode based on room state
  useEffect(() => {
    if (hasRoomCode && gameRoom.room) {
      if (gameRoom.isHost) {
        setMode('host')
      } else {
        setMode('player')
      }
    }
  }, [hasRoomCode, gameRoom.room, gameRoom.isHost])

  // If URL has room code but we haven't joined yet, show name input then auto-join
  useEffect(() => {
    if (hasRoomCode && !gameRoom.room && !gameRoom.isLoading && gameRoom.playerName && mode === 'name') {
      // The hook auto-joins when playerName is set and URL has room code
      // We just need to wait for it
    }
  }, [hasRoomCode, gameRoom.room, gameRoom.isLoading, gameRoom.playerName, mode])

  const handleNameContinue = useCallback((_name: string) => {
    gameRoom.setPlayerName(_name)
    if (hasRoomCode) {
      // URL has room code, will auto-join via hook
    } else {
      setMode('local')
    }
  }, [gameRoom, hasRoomCode])

  const handleCreateRoom = useCallback(async () => {
    try {
      await gameRoom.createRoom()
      setMode('host')
    } catch {
      // Error is captured in gameRoom.error
    }
  }, [gameRoom])

  const handleJoinRoom = useCallback(() => {
    setMode('join')
  }, [])

  // Join code input
  const [joinCode, setJoinCode] = useState('')
  const handleJoinSubmit = useCallback(async () => {
    const code = joinCode.trim().toUpperCase()
    if (!code) return
    try {
      await gameRoom.joinRoom(code)
      setMode('player')
    } catch {
      // Error is captured in gameRoom.error
    }
  }, [joinCode, gameRoom])

  // Shared hero content
  const heroContent = (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-300/40 bg-white/70 backdrop-blur-sm text-[13px] font-medium text-amber-600 mb-6">
        <Sparkles className="w-3.5 h-3.5" />
        Free team game
      </span>
      <h1 className="text-[36px] md:text-[52px] font-bold tracking-[-0.03em] leading-[1.1]">
        Team{' '}
        <span className="bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500 bg-clip-text text-transparent">
          Superlatives
        </span>
      </h1>
      <p className="text-gray-500 mt-4 text-[16px] md:text-[18px] max-w-xl mx-auto">
        Vote on &quot;Most likely to...&quot; categories and crown your team&apos;s superstars.
        Perfect for TGIF, team bonding, and office celebrations.
      </p>
    </motion.div>
  )

  // Background blobs
  const bgBlobs = (
    <>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-gradient-to-br from-amber-400/10 via-yellow-400/8 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute top-60 -left-40 w-[500px] h-[500px] rounded-full bg-amber-400/8 blur-3xl pointer-events-none" />
      <div className="absolute top-80 -right-40 w-[500px] h-[500px] rounded-full bg-yellow-400/8 blur-3xl pointer-events-none" />
    </>
  )

  // How to play
  const howToPlay = (
    <div className="max-w-3xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-2xl shadow-[0_8px_32px_rgba(245,158,11,0.06)] p-8 md:p-10"
      >
        <h2 className="text-[22px] font-bold mb-6 text-center">How to Play</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-yellow-500 text-white flex items-center justify-center text-[18px] font-bold mx-auto mb-3">
              1
            </div>
            <h3 className="font-bold text-[15px] mb-1">Add your team</h3>
            <p className="text-gray-500 text-[13px]">Enter everyone&apos;s names and pick the superlative categories you want to vote on.</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 text-white flex items-center justify-center text-[18px] font-bold mx-auto mb-3">
              2
            </div>
            <h3 className="font-bold text-[15px] mb-1">Vote together</h3>
            <p className="text-gray-500 text-[13px]">Pass the screen around or project it. Everyone taps a name to cast their vote.</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-red-500 text-white flex items-center justify-center text-[18px] font-bold mx-auto mb-3">
              3
            </div>
            <h3 className="font-bold text-[15px] mb-1">Crown the winners</h3>
            <p className="text-gray-500 text-[13px]">See who wins each category and find out who takes home the most awards overall.</p>
          </div>
        </div>
      </motion.div>
    </div>
  )

  // CTA section
  const ctaSection = (
    <section className="relative z-10 py-16 md:py-20 px-5">
      <div className="max-w-[1200px] mx-auto relative">
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[#4F46E5]/10 via-[#818CF8]/5 to-[#C7D2FE]/10 blur-xl" />
        <div className="relative z-10">
          <div className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-2xl shadow-[0_8px_32px_rgba(79,70,229,0.06)] max-w-[600px] mx-auto p-10 md:p-14 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#4F46E5]/10 flex items-center justify-center mx-auto mb-6">
              <Brain className="h-7 w-7 text-[#4F46E5]" />
            </div>
            <h2 className="text-[22px] font-bold mb-3 text-[#1a1a2e]">Built by Reattend</h2>
            <p className="text-gray-600 text-[14px] mb-6 max-w-md mx-auto">
              Reattend captures every team decision and makes your knowledge searchable forever.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold text-[14px] transition-colors shadow-[0_4px_14px_rgba(79,70,229,0.3)] active:scale-[0.98]"
            >
              Try Reattend free <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )

  // Room bar for multiplayer
  const roomBar = (mode === 'host' || mode === 'player') && gameRoom.roomCode ? (
    <RoomBar
      roomCode={gameRoom.roomCode}
      playerCount={gameRoom.players.length}
      isHost={gameRoom.isHost}
      isConnected={gameRoom.isConnected}
      accentColor="#D97706"
    />
  ) : null

  // Determine showResults for split layout
  const showResults = mode === 'local'
    ? false // local mode handles its own awards in the children slot
    : false

  // Main content based on mode
  let mainContent: React.ReactNode = null

  if (mode === 'name') {
    // Show name input (or join screen if URL has room code)
    mainContent = (
      <TeamNameInput
        onContinue={handleNameContinue}
        showRoomOptions={!hasRoomCode}
        onCreateRoom={handleCreateRoom}
        onJoinRoom={handleJoinRoom}
        accentFrom="#D97706"
        accentTo="#F59E0B"
      />
    )
  } else if (mode === 'join') {
    // Join room screen
    mainContent = (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="w-full max-w-md mx-auto"
      >
        <GlassCard className="p-8 text-center">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center bg-amber-100/50">
            <Users className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-xl font-bold mb-2">Join a Room</h2>
          <p className="text-sm text-gray-500 mb-6">Enter the room code shared by your host.</p>

          <input
            type="text"
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && handleJoinSubmit()}
            placeholder="ABCDEF"
            maxLength={6}
            autoFocus
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-center text-2xl font-mono font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent mb-4 uppercase"
          />

          {gameRoom.error && (
            <p className="text-red-500 text-sm mb-4">{gameRoom.error}</p>
          )}

          <button
            onClick={handleJoinSubmit}
            disabled={joinCode.trim().length < 4 || gameRoom.isLoading}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white font-bold text-[15px] transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] bg-gradient-to-r from-amber-500 to-yellow-500"
            style={{ backgroundColor: joinCode.trim().length < 4 ? '#d1d5db' : undefined }}
          >
            {gameRoom.isLoading ? 'Joining...' : 'Join Room'}
          </button>

          <button
            onClick={() => setMode('name')}
            className="mt-4 text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            Back
          </button>
        </GlassCard>
      </motion.div>
    )
  } else if (mode === 'local') {
    mainContent = <LocalMode />
  } else if (mode === 'host') {
    mainContent = <HostMode gameRoom={gameRoom} />
  } else if (mode === 'player') {
    mainContent = <PlayerMode gameRoom={gameRoom} />
  }

  return (
    <GameLayout
      heroContent={heroContent}
      showResults={showResults}
      bgBlobs={bgBlobs}
      howToPlay={howToPlay}
      ctaSection={ctaSection}
      roomBar={roomBar}
    >
      <div className="max-w-3xl mx-auto">
        {mainContent}
      </div>
    </GameLayout>
  )
}
