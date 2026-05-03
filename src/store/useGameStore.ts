import { create } from 'zustand'
import type { PlayerState, EnemyState, BulletState, ItemState } from '@shared/types'

export type { PlayerState, EnemyState, BulletState, ItemState }

interface GameState {
  floor: number
  players: PlayerState[]
  enemies: EnemyState[]
  bullets: BulletState[]
  items: ItemState[]
  isPaused: boolean
  isGameOver: boolean
  isVictory: boolean
  localPlayerId: string | null
  setState: (state: { floor: number; players: PlayerState[]; enemies: EnemyState[]; bullets: BulletState[]; items: ItemState[] }) => void
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
