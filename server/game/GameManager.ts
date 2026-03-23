import { Database } from '../data/Database';
import { GameRoom } from './GameRoom';

export class GameManager {
  private rooms: Map<string, GameRoom> = new Map();
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  createRoom(roomId: string): GameRoom {
    const gameRoom = new GameRoom(roomId, this.db);
    this.rooms.set(roomId, gameRoom);
    return gameRoom;
  }

  getRoom(roomId: string): GameRoom | undefined {
    return this.rooms.get(roomId);
  }

  removeRoom(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.destroy();
      this.rooms.delete(roomId);
    }
  }

  getPlayerCount(): number {
    let count = 0;
    for (const room of this.rooms.values()) {
      count += room.getPlayerCount();
    }
    return count;
  }
}
