import { create } from 'zustand'

interface PlayerState {
  id: string
  name: string
  x: number
  y: number
  hp: number
  hpMax: number
  energy: number
  energyMax: number
  alive: boolean
  angle: number
}

interface EnemyState {
  id: string
  type: string
  x: number
  y: number
  hp: number
  hpMax: number
  alive: boolean
  state?: string  // 'idle' | 'chase' | 'attack' | 'dying'
  deathTimer?: number
}

interface BulletState {
  id: string
  x: number
  y: number
  vx: number
  vy: number
  friendly: boolean
  radius: number
  ownerType: string
}

interface GameState {
  floor: number
  players: PlayerState[]
  enemies: EnemyState[]
  bullets: BulletState[]
  items: { id: string; x: number; y: number; type: string }[]
  isPaused: boolean
  isGameOver: boolean
  isVictory: boolean
  localPlayerId: string | null
  setState: (state: any) => void
  setFloor: (floor: number) => void
  setPaused: (paused: boolean) => void
  setGameOver: (over: boolean, victory: boolean) => void
  setLocalPlayerId: (id: string) => void
  reset: () => void
}

export const useGameStore = create<GameState>((set) => ({
  floor: 1,
  players: [],
  enemies: [],
  bullets: [],
  items: [],
  isPaused: false,
  isGameOver: false,
  isVictory: false,
  localPlayerId: null,

  setState: (state) => set({
    floor: state.floor,
    players: state.players || [],
    enemies: state.enemies || [],
    bullets: state.bullets || [],
    items: state.items || []
  }),

  setFloor: (floor) => set({ floor }),
  setPaused: (isPaused) => set({ isPaused }),
  setGameOver: (isGameOver, isVictory) => set({ isGameOver, isVictory }),
  setLocalPlayerId: (id) => set({ localPlayerId: id }),
  reset: () => set({
    floor: 1,
    players: [],
    enemies: [],
    bullets: [],
    items: [],
    isPaused: false,
    isGameOver: false,
    isVictory: false
  })
}))
