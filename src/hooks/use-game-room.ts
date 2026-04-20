'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import type {
  GameRoom,
  GamePlayer,
  GameAction,
  RoomPollResponse,
} from '@/lib/game/types'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PLAYER_ID_KEY = 'reattend-game-player-id'
const PLAYER_NAME_KEY = 'reattend-game-player-name'
const DEFAULT_POLL_INTERVAL = 2500

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readLocalStorage(key: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeLocalStorage(key: string, value: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, value)
  } catch {
    // silently ignore
  }
}

function getOrCreatePlayerId(): string {
  const existing = readLocalStorage(PLAYER_ID_KEY)
  if (existing) return existing
  const id = crypto.randomUUID()
  writeLocalStorage(PLAYER_ID_KEY, id)
  return id
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseGameRoomOptions {
  gameType: string
  pollInterval?: number // default 2500
}

export interface UseGameRoomReturn {
  // Player identity
  playerId: string
  playerName: string | null
  setPlayerName: (name: string) => void

  // Room state
  room: GameRoom | null
  players: GamePlayer[]
  actions: GameAction[]
  isHost: boolean
  isConnected: boolean
  isLoading: boolean
  error: string | null

  // Room actions
  createRoom: (config?: any) => Promise<string>
  updateRoom: (updates: {
    phase?: string
    status?: string
    state?: any
  }) => Promise<void>
  joinRoom: (code: string) => Promise<void>
  submitAction: (actionType: string, payload: any) => Promise<void>

  // Query helpers
  getActionsOfType: (type: string) => GameAction[]
  getPlayerActions: (playerId: string, type?: string) => GameAction[]
  roomCode: string | null
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useGameRoom(options: UseGameRoomOptions): UseGameRoomReturn {
  const { gameType, pollInterval = DEFAULT_POLL_INTERVAL } = options

  const searchParams = useSearchParams()

  // ---- Player identity (stable across sessions) ----
  const [playerId] = useState<string>(() => getOrCreatePlayerId())
  const [playerName, setPlayerNameState] = useState<string | null>(() =>
    readLocalStorage(PLAYER_NAME_KEY)
  )

  const setPlayerName = useCallback((name: string) => {
    setPlayerNameState(name)
    writeLocalStorage(PLAYER_NAME_KEY, name)
  }, [])

  // ---- Room state ----
  const [room, setRoom] = useState<GameRoom | null>(null)
  const [players, setPlayers] = useState<GamePlayer[]>([])
  const [actions, setActions] = useState<GameAction[]>([])
  const [isHost, setIsHost] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Room code: from URL on mount, then managed internally
  const urlRoomCode = searchParams.get('room')
  const [roomCode, setRoomCode] = useState<string | null>(urlRoomCode)

  // Keep roomCode in sync if URL changes externally
  useEffect(() => {
    if (urlRoomCode && urlRoomCode !== roomCode) {
      setRoomCode(urlRoomCode)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlRoomCode])

  // Refs for polling
  const pollRef = useRef<NodeJS.Timeout | null>(null)
  const versionRef = useRef<number>(0)
  const isPollingRef = useRef(false)

  // Track mount state to prevent state updates after unmount
  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  // ---- Polling ----

  const poll = useCallback(async (code: string) => {
    // Guard against concurrent polls
    if (isPollingRef.current) return
    isPollingRef.current = true

    try {
      const params = new URLSearchParams({
        code,
        version: String(versionRef.current),
        playerId,
      })

      const res = await fetch(`/api/game-rooms?${params.toString()}`)

      if (!mountedRef.current) return

      if (res.status === 404 || res.status === 410) {
        setError('Room not found or expired')
        setIsConnected(false)
        stopPolling()
        return
      }

      if (!res.ok) {
        // Transient error — mark disconnected but keep polling
        setIsConnected(false)
        return
      }

      const data: RoomPollResponse = await res.json()

      if (!mountedRef.current) return

      setIsConnected(true)
      setError(null)

      if (data.changed) {
        setRoom(data.room)
        setPlayers(data.players)
        setActions(data.actions)
        versionRef.current = data.room.version
      }
    } catch {
      if (mountedRef.current) {
        setIsConnected(false)
      }
    } finally {
      isPollingRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId])

  const startPolling = useCallback(
    (code: string) => {
      stopPolling()
      // Do an immediate poll, then set up interval
      poll(code)
      pollRef.current = setInterval(() => poll(code), pollInterval)
    },
    [poll, pollInterval]
  )

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling()
    }
  }, [stopPolling])

  // ---- createRoom ----

  const createRoom = useCallback(
    async (config?: any): Promise<string> => {
      setIsLoading(true)
      setError(null)

      try {
        const res = await fetch('/api/game-rooms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameType,
            hostName: playerName,
            hostId: playerId,
            config: config ?? null,
          }),
        })

        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error || 'Failed to create room')
        }

        const data = await res.json()
        const createdRoom: GameRoom = data.room ?? data

        if (!mountedRef.current) return createdRoom.code

        setRoom(createdRoom)
        setPlayers(data.players ?? [])
        setActions([])
        setIsHost(true)
        setRoomCode(createdRoom.code)
        versionRef.current = createdRoom.version

        // Update URL without navigation
        const url = new URL(window.location.href)
        url.searchParams.set('room', createdRoom.code)
        window.history.replaceState({}, '', url.toString())

        startPolling(createdRoom.code)

        return createdRoom.code
      } catch (err: any) {
        if (mountedRef.current) {
          setError(err.message || 'Failed to create room')
        }
        throw err
      } finally {
        if (mountedRef.current) {
          setIsLoading(false)
        }
      }
    },
    [gameType, playerName, playerId, startPolling]
  )

  // ---- joinRoom ----

  const joinRoom = useCallback(
    async (code: string): Promise<void> => {
      setIsLoading(true)
      setError(null)

      try {
        const res = await fetch('/api/game-rooms/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code,
            playerName,
            playerId,
          }),
        })

        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error || 'Failed to join room')
        }

        const data = await res.json()
        const joinedRoom: GameRoom = data.room ?? data

        if (!mountedRef.current) return

        setRoom(joinedRoom)
        setPlayers(data.players ?? [])
        setActions(data.actions ?? [])
        setIsHost(joinedRoom.hostId === playerId)
        setRoomCode(code)
        versionRef.current = joinedRoom.version

        // Update URL without navigation
        const url = new URL(window.location.href)
        url.searchParams.set('room', code)
        window.history.replaceState({}, '', url.toString())

        startPolling(code)
      } catch (err: any) {
        if (mountedRef.current) {
          setError(err.message || 'Failed to join room')
        }
        throw err
      } finally {
        if (mountedRef.current) {
          setIsLoading(false)
        }
      }
    },
    [playerName, playerId, startPolling]
  )

  // ---- updateRoom (host only) ----

  const updateRoom = useCallback(
    async (updates: {
      phase?: string
      status?: string
      state?: any
    }): Promise<void> => {
      if (!roomCode) {
        throw new Error('No room to update')
      }

      setError(null)

      try {
        const res = await fetch('/api/game-rooms', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: roomCode,
            hostId: playerId,
            ...updates,
          }),
        })

        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error || 'Failed to update room')
        }

        const data = await res.json()

        if (!mountedRef.current) return

        if (data.room) {
          setRoom(data.room)
          versionRef.current = data.room.version
        }
      } catch (err: any) {
        if (mountedRef.current) {
          setError(err.message || 'Failed to update room')
        }
        throw err
      }
    },
    [roomCode, playerId]
  )

  // ---- submitAction ----

  const submitAction = useCallback(
    async (actionType: string, payload: any): Promise<void> => {
      if (!roomCode) {
        throw new Error('No room to submit action to')
      }

      setError(null)

      try {
        const res = await fetch('/api/game-rooms/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: roomCode,
            playerId,
            actionType,
            payload,
          }),
        })

        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error || 'Failed to submit action')
        }
      } catch (err: any) {
        if (mountedRef.current) {
          setError(err.message || 'Failed to submit action')
        }
        throw err
      }
    },
    [roomCode, playerId]
  )

  // ---- Query helpers ----

  const getActionsOfType = useCallback(
    (type: string): GameAction[] => {
      return actions.filter((a) => a.actionType === type)
    },
    [actions]
  )

  const getPlayerActions = useCallback(
    (targetPlayerId: string, type?: string): GameAction[] => {
      return actions.filter(
        (a) =>
          a.playerId === targetPlayerId &&
          (type === undefined || a.actionType === type)
      )
    },
    [actions]
  )

  // ---- Auto-join on mount ----

  const hasAutoJoined = useRef(false)

  useEffect(() => {
    // Auto-join if URL has a room code, player has a name, and we haven't
    // already joined or created a room in this session
    if (
      urlRoomCode &&
      playerName &&
      !hasAutoJoined.current &&
      !room
    ) {
      hasAutoJoined.current = true
      joinRoom(urlRoomCode).catch(() => {
        // Error is already captured in state via joinRoom
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlRoomCode, playerName])

  // ---- Return ----

  return useMemo(
    () => ({
      playerId,
      playerName,
      setPlayerName,

      room,
      players,
      actions,
      isHost,
      isConnected,
      isLoading,
      error,

      createRoom,
      updateRoom,
      joinRoom,
      submitAction,

      getActionsOfType,
      getPlayerActions,
      roomCode,
    }),
    [
      playerId,
      playerName,
      setPlayerName,
      room,
      players,
      actions,
      isHost,
      isConnected,
      isLoading,
      error,
      createRoom,
      updateRoom,
      joinRoom,
      submitAction,
      getActionsOfType,
      getPlayerActions,
      roomCode,
    ]
  )
}
