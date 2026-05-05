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
  isArena: boolean
  isMaze: boolean
  arenaWave: number
  arenaTriggered: boolean
  mazeTriggered: boolean
  phase: string
  setState: (state: { floor: number; players: PlayerState[]; enemies: EnemyState[]; bullets: BulletState[]; items: ItemState[]; isArenaFloor?: boolean; isMazeFloor?: boolean; arenaWave?: number; arenaTriggered?: boolean; mazeTriggered?: boolean; phase?: string }) => void
  setFloor: (floor: number) => void
  setPaused: (paused: boolean) => void
  setGameOver: (over: boolean, victory: boolean) => void
  setLocalPlayerId: (id: string) => void
  setArenaState: (isArena: boolean, wave: number, triggered: boolean) => void
  setPhase: (phase: string) => void
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
  isArena: false,
  isMaze: false,
  arenaWave: 0,
  arenaTriggered: false,
  mazeTriggered: false,
  phase: 'LOBBY',

  setState: (state) => set({
    floor: state.floor,
    players: state.players || [],
    enemies: state.enemies || [],
    bullets: state.bullets || [],
    items: state.items || [],
    isArena: state.isArenaFloor || false,
    isMaze: state.isMazeFloor || false,
    arenaWave: state.arenaWave || 0,
    arenaTriggered: state.arenaTriggered || false,
    mazeTriggered: state.mazeTriggered || false,
    phase: state.phase || 'PLAYING',
  }),

  setFloor: (floor) => set({ floor }),
  setPaused: (isPaused) => set({ isPaused }),
  setGameOver: (isGameOver, isVictory) => set({ isGameOver, isVictory }),
  setLocalPlayerId: (id) => set({ localPlayerId: id }),
  setArenaState: (isArena, arenaWave, arenaTriggered) => set({ isArena, arenaWave, arenaTriggered }),
  setPhase: (phase) => set({ phase }),
  reset: () => set({
    floor: 1,
    players: [],
    enemies: [],
    bullets: [],
    items: [],
    isPaused: false,
    isGameOver: false,
    isVictory: false,
    isArena: false,
    isMaze: false,
    arenaWave: 0,
    arenaTriggered: false,
    mazeTriggered: false,
    phase: 'LOBBY',
  })
}))
