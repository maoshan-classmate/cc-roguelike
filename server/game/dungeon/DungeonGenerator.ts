import { GAME_CONFIG, FLOOR_CONFIG } from '../../config/constants';
import { MathUtils } from '../../utils/MathUtils';

interface DungeonData {
  rooms: Room[];
  corridors: Corridor[];
  spawnPoint: { x: number; y: number };
  exitPoint: { x: number; y: number };
  enemies: { type: string; x: number; y: number; count: number }[];
  items: { id: string; x: number; y: number; type: string }[];
  collisionGrid: boolean[][];  // true = walkable
}

interface Room {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'normal' | 'elite' | 'treasure' | 'rest' | 'boss' | 'entrance' | 'exit';
  doors: { direction: string; x: number; y: number }[];
}

interface Corridor {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface BSPNode {
  x: number;
  y: number;
  width: number;
  height: number;
  left?: BSPNode;
  right?: BSPNode;
  room?: Room;
}

export class DungeonGenerator {
  private random!: () => number;

  generate(floor: number, seed: number): DungeonData {
    this.random = MathUtils.seededRandom(seed);

    const width = GAME_CONFIG.DUNGEON_WIDTH;
    const height = GAME_CONFIG.DUNGEON_HEIGHT;
    const roomCount = 6 + floor * 2;

    // Generate BSP tree
    const root = this.splitBSP(0, 0, width, height, 4);

    // Generate rooms from BSP
    const rooms = this.generateRooms(root, roomCount);

    // Connect rooms with corridors
    const corridors = this.connectRooms(rooms);

    // Place spawn and exit
    const spawnPoint = { x: rooms[0].x + rooms[0].width / 2, y: rooms[0].y + rooms[0].height / 2 };
    const exitRoom = rooms[rooms.length - 1];
    const exitPoint = { x: exitRoom.x + exitRoom.width / 2, y: exitRoom.y + exitRoom.height / 2 };

    // Set room types
    rooms[0].type = 'entrance';
    rooms[rooms.length - 1].type = 'boss';

    // Place some treasure rooms
    if (rooms.length > 3) {
      const treasureRoom = rooms[Math.floor(this.random() * (rooms.length - 2)) + 1];
      treasureRoom.type = 'treasure';
    }

    // Spawn enemies
    const enemies = this.spawnEnemies(rooms, floor);

    // Spawn items
    const items = this.spawnItems(rooms);

    return {
      rooms,
      corridors,
      spawnPoint,
      exitPoint,
      enemies,
      items,
      collisionGrid: this.generateCollisionGrid(rooms, corridors, width, height)
    };
  }

  private splitBSP(x: number, y: number, w: number, h: number, depth: number): BSPNode {
    const node: BSPNode = { x, y, width: w, height: h };

    if (depth > 0 && w > 80 && h > 80) {
      const splitHorizontally = this.random() > 0.5;

      if (splitHorizontally && h > 60) {
        const splitY = y + h * (0.3 + this.random() * 0.4);
        node.left = this.splitBSP(x, y, w, splitY - y, depth - 1);
        node.right = this.splitBSP(x, splitY, w, h - (splitY - y), depth - 1);
      } else if (w > 60) {
        const splitX = x + w * (0.3 + this.random() * 0.4);
        node.left = this.splitBSP(x, y, splitX - x, h, depth - 1);
        node.right = this.splitBSP(splitX, y, w - (splitX - x), h, depth - 1);
      }
    }

    return node;
  }

  private generateRooms(node: BSPNode, targetCount: number): Room[] {
    const rooms: Room[] = [];

    if (!node.left && !node.right) {
      // Leaf node - create room
      const padding = 2;
      const roomW = Math.floor(this.random() * (node.width - GAME_CONFIG.ROOM_MIN_SIZE - padding * 2)) + GAME_CONFIG.ROOM_MIN_SIZE;
      const roomH = Math.floor(this.random() * (node.height - GAME_CONFIG.ROOM_MIN_SIZE - padding * 2)) + GAME_CONFIG.ROOM_MIN_SIZE;
      const roomX = node.x + padding + Math.floor(this.random() * (node.width - roomW - padding * 2));
      const roomY = node.y + padding + Math.floor(this.random() * (node.height - roomH - padding * 2));

      rooms.push({
        id: `room_${rooms.length}`,
        x: roomX,
        y: roomY,
        width: roomW,
        height: roomH,
        type: 'normal',
        doors: []
      });
    } else {
      if (node.left) rooms.push(...this.generateRooms(node.left, targetCount));
      if (node.right) rooms.push(...this.generateRooms(node.right, targetCount));
    }

    return rooms;
  }

  private connectRooms(rooms: Room[]): Corridor[] {
    const corridors: Corridor[] = [];

    // Simple approach: connect each room to the next
    for (let i = 0; i < rooms.length - 1; i++) {
      const roomA = rooms[i];
      const roomB = rooms[i + 1];

      const ax = roomA.x + roomA.width / 2;
      const ay = roomA.y + roomA.height / 2;
      const bx = roomB.x + roomB.width / 2;
      const by = roomB.y + roomB.height / 2;

      // L-shaped corridor
      if (this.random() > 0.5) {
        corridors.push({ x1: ax, y1: ay, x2: bx, y2: ay });
        corridors.push({ x1: bx, y1: ay, x2: bx, y2: by });
      } else {
        corridors.push({ x1: ax, y1: ay, x2: ax, y2: by });
        corridors.push({ x1: ax, y1: by, x2: bx, y2: by });
      }
    }

    return corridors;
  }

  private spawnEnemies(rooms: Room[], floor: number): { type: string; x: number; y: number; count: number }[] {
    const config = FLOOR_CONFIG[floor];
    const enemies: { type: string; x: number; y: number; count: number }[] = [];

    for (const room of rooms) {
      if (room.type === 'entrance' || room.type === 'boss' || room.type === 'treasure') continue;

      const count = Math.floor(config.enemyCount[0] + this.random() * (config.enemyCount[1] - config.enemyCount[0]));
      const type = config.enemyTypes[Math.floor(this.random() * config.enemyTypes.length)];

      // Spawn in room center with some randomness
      const x = room.x + room.width / 2 + (this.random() - 0.5) * room.width * 0.5;
      const y = room.y + room.height / 2 + (this.random() - 0.5) * room.height * 0.5;

      enemies.push({ type, x, y, count });
    }

    return enemies;
  }

  private spawnItems(rooms: Room[]): { id: string; x: number; y: number; type: string }[] {
    const items: { id: string; x: number; y: number; type: string }[] = [];

    // Add some health packs in rooms
    for (const room of rooms) {
      if (room.type !== 'treasure') continue;

      const x = room.x + room.width / 2 + (this.random() - 0.5) * 30;
      const y = room.y + room.height / 2 + (this.random() - 0.5) * 30;

      items.push({
        id: `item_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        x,
        y,
        type: this.random() > 0.5 ? 'health' : 'energy'
      });
    }

    return items;
  }

  /**
   * 生成 tile 级碰撞网格
   * tileSize = 32px, 网格 25x19 (800/32 x 600/32)
   * true = 可行走, false = 墙壁
   */
  private generateCollisionGrid(rooms: Room[], corridors: Corridor[], mapW: number, mapH: number): boolean[][] {
    const tileSize = 32;
    const cols = Math.ceil(mapW / tileSize);
    const rows = Math.ceil(mapH / tileSize);

    // 初始化全部为墙
    const grid: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));

    // 标记房间区域为可行走
    for (const room of rooms) {
      const startCol = Math.floor(room.x / tileSize);
      const startRow = Math.floor(room.y / tileSize);
      const endCol = Math.ceil((room.x + room.width) / tileSize);
      const endRow = Math.ceil((room.y + room.height) / tileSize);

      for (let r = startRow; r < endRow && r < rows; r++) {
        for (let c = startCol; c < endCol && c < cols; c++) {
          if (r >= 0 && c >= 0) grid[r][c] = true;
        }
      }
    }

    // 标记走廊区域为可行走（走廊宽度 = 1 tile = 32px）
    for (const corridor of corridors) {
      const minC = Math.floor(Math.min(corridor.x1, corridor.x2) / tileSize);
      const maxC = Math.floor(Math.max(corridor.x1, corridor.x2) / tileSize);
      const minR = Math.floor(Math.min(corridor.y1, corridor.y2) / tileSize);
      const maxR = Math.floor(Math.max(corridor.y1, corridor.y2) / tileSize);

      for (let r = minR; r <= maxR && r < rows; r++) {
        for (let c = minC; c <= maxC && c < cols; c++) {
          if (r >= 0 && c >= 0) grid[r][c] = true;
        }
      }
    }

    return grid;
  }
}
