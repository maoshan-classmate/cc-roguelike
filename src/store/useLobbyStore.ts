import { create } from 'zustand'

interface Room {
  id: string
  name: string
  hostId: string
  hostName: string
  players: { id: string; name: string; ready: boolean }[]
  maxPlayers: number
  status: 'waiting' | 'playing' | 'ended'
}

interface LobbyState {
  rooms: Room[]
  setRooms: (rooms: Room[]) => void
  addRoom: (room: Room) => void
  updateRoom: (room: Room) => void
  removeRoom: (roomId: string) => void
}

export const useLobbyStore = create<LobbyState>((set) => ({
  rooms: [],
  setRooms: (rooms) => set({ rooms }),
  addRoom: (room) => set((state) => ({ rooms: [...state.rooms, room] })),
  updateRoom: (room) => set((state) => ({
    rooms: state.rooms.map(r => r.id === room.id ? room : r)
  })),
  removeRoom: (roomId) => set((state) => ({
    rooms: state.rooms.filter(r => r.id !== roomId)
  }))
}))
