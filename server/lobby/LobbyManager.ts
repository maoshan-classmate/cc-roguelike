import { v4 as uuidv4 } from 'uuid';

export interface RoomInfo {
  id: string;
  name: string;
  hostId: string;
  hostName: string;
  players: { id: string; name: string; ready: boolean; characterType?: string }[];
  maxPlayers: number;
  status: 'waiting' | 'playing' | 'ended';
}

export class LobbyManager {
  private rooms: Map<string, RoomInfo> = new Map();
  private roomTimers: Map<string, NodeJS.Timeout> = new Map();

  createRoom(hostId: string, hostName: string, name: string, maxPlayers: number = 4): RoomInfo {
    const room: RoomInfo = {
      id: uuidv4().slice(0, 8),
      name,
      hostId,
      hostName,
      players: [{ id: hostId, name: hostName, ready: false }],
      maxPlayers,
      status: 'waiting'
    };

    this.rooms.set(room.id, room);
    return room;
  }

  getRoom(roomId: string): RoomInfo | undefined {
    return this.rooms.get(roomId);
  }

  getAllRooms(): RoomInfo[] {
    return Array.from(this.rooms.values())
      .filter(r => r.status === 'waiting')
      .map(r => ({
        id: r.id,
        name: r.name,
        hostId: r.hostId,
        hostName: r.hostName,
        players: r.players.map(p => ({ id: p.id, name: p.name, ready: p.ready })),
        maxPlayers: r.maxPlayers,
        status: r.status
      }));
  }

  joinRoom(roomId: string, playerId: string, playerName: string): RoomInfo | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    if (room.players.length >= room.maxPlayers) return null;
    if (room.status !== 'waiting') return null;

    // Check if already in room
    if (room.players.some(p => p.id === playerId)) return null;

    room.players.push({ id: playerId, name: playerName, ready: false });
    return room;
  }

  leaveRoom(roomId: string, playerId: string): RoomInfo | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    room.players = room.players.filter(p => p.id !== playerId);

    // If host left, assign new host or delete room
    if (room.hostId === playerId) {
      if (room.players.length > 0) {
        room.hostId = room.players[0].id;
        room.hostName = room.players[0].name;
      } else {
        this.rooms.delete(roomId);
        return null;
      }
    }

    return room;
  }

  setPlayerReady(roomId: string, playerId: string, ready: boolean): RoomInfo | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const player = room.players.find(p => p.id === playerId);
    if (player) {
      player.ready = ready;
    }
    return room;
  }

  setPlayerCharacterType(roomId: string, playerId: string, characterType: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    const player = room.players.find(p => p.id === playerId);
    if (player) {
      player.characterType = characterType;
    }
  }

  startGame(roomId: string): RoomInfo | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    room.status = 'playing';
    this.clearRoomTimer(roomId);
    return room;
  }

  endGame(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.status = 'ended';
      this.rooms.delete(roomId);
    }
  }

  removeRoom(roomId: string): void {
    this.rooms.delete(roomId);
    this.clearRoomTimer(roomId);
  }

  setRoomTimer(roomId: string, callback: () => void, timeout: number): void {
    this.clearRoomTimer(roomId);
    const timer = setTimeout(callback, timeout);
    this.roomTimers.set(roomId, timer);
  }

  private clearRoomTimer(roomId: string): void {
    const timer = this.roomTimers.get(roomId);
    if (timer) {
      clearTimeout(timer);
      this.roomTimers.delete(roomId);
    }
  }

  isPlayerInRoom(playerId: string): string | null {
    for (const [roomId, room] of this.rooms) {
      if (room.players.some(p => p.id === playerId)) {
        return roomId;
      }
    }
    return null;
  }
}
