import { create } from 'zustand'

interface Player {
  id: string
  name: string
  ready: boolean
}

interface RoomState {
  roomId: string | null
  roomName: string
  hostId: string
  players: Player[]
  isHost: boolean
  isReady: boolean
  gameStarted: boolean
  setRoom: (roomId: string, room: any, isHost: boolean) => void
  addPlayer: (player: Player) => void
  removePlayer: (playerId: string, newHostId?: string) => void
  setPlayerReady: (playerId: string, ready: boolean) => void
  setGameStarted: (started: boolean) => void
  clearRoom: () => void
  setReady: (ready: boolean) => void
}

export const useRoomStore = create<RoomState>((set, get) => ({
  roomId: null,
  roomName: '',
  hostId: '',
  players: [],
  isHost: false,
  isReady: false,
  gameStarted: false,

  setRoom: (roomId, room, isHost) => set({
    roomId,
    roomName: room.name,
    hostId: room.hostId,
    players: room.players || [],
    isHost,
    isReady: false,
    gameStarted: false
  }),

  addPlayer: (player) => set((state) => ({
    players: [...state.players, player]
  })),

  removePlayer: (playerId, newHostId) => set((state) => ({
    players: state.players.filter(p => p.id !== playerId),
    hostId: newHostId || state.hostId,
    isHost: newHostId ? state.isHost : (state.hostId === playerId ? state.isHost : false)
  })),

  setPlayerReady: (playerId, ready) => set((state) => ({
    players: state.players.map(p => p.id === playerId ? { ...p, ready } : p)
  })),

  setGameStarted: (started) => set({ gameStarted: started }),

  clearRoom: () => set({
    roomId: null,
    roomName: '',
    hostId: '',
    players: [],
    isHost: false,
    isReady: false,
    gameStarted: false
  }),

  setReady: (ready) => set({ isReady: ready })
}))
