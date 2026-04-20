export interface GameRoom {
  id: string
  code: string
  gameType: string
  hostId: string
  hostName: string
  status: 'lobby' | 'playing' | 'finished'
  phase: string
  state: Record<string, any>
  config: Record<string, any> | null
  maxPlayers: number
  version: number
  expiresAt: string
  createdAt: string
  updatedAt: string
}

export interface GamePlayer {
  id: string
  roomId: string
  playerId: string
  name: string
  isHost: boolean
  lastSeenAt: string
  createdAt: string
}

export interface GameAction {
  id: string
  roomId: string
  playerId: string
  actionType: string
  payload: Record<string, any>
  createdAt: string
}

export interface RoomPollResponse {
  room: GameRoom
  players: GamePlayer[]
  actions: GameAction[]
  changed: boolean
}

export type GameMode = 'local' | 'host' | 'player'

// Game types that support room mode
export const ROOM_GAME_TYPES = [
  'hot-takes',
  'would-you-rather',
  'this-or-that',
  'team-trivia',
  'team-superlatives',
  'guess-the-colleague',
  'two-truths-one-lie',
  'team-bingo',
] as const

export type RoomGameType = typeof ROOM_GAME_TYPES[number]
