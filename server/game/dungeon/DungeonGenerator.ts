import { GAME_CONFIG, FLOOR_CONFIG } from '../../config/constants';
import { MathUtils } from '../../utils/MathUtils';

interface DungeonData {
  rooms: Room[];
  corridors: Corridor[];
  corridorTiles: { x: number; y: number }[];  // 走廊瓦片坐标（像素中心），用于客户端渲染走廊地板
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

    // BSP depth scales with floor: floor 1→depth 3 (5-7 rooms), floor 5→depth 4 (9-13 rooms)
    const bspDepth = Math.min(2 + Math.ceil(floor / 2), 4);

    // Generate BSP tree
    const root = this.splitBSP(0, 0, width, height, bspDepth);

    // Generate rooms from BSP
    const rooms = this.generateRooms(root, roomCount);

    // Connect rooms with corridors
    const corridors = this.connectRooms(rooms);

    // Place spawn and exit (validate they're in walkable tiles)
    const spawnRoom = rooms[0];
    const spawnPoint = { x: spawnRoom.x + spawnRoom.width / 2, y: spawnRoom.y + spawnRoom.height / 2 };
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

    const collisionGrid = this.generateCollisionGrid(rooms, corridors, width, height);
    const corridorTiles = this.generateCorridorTiles(corridors, width, height);

    // Validate spawn and exit points are walkable, force-clear if needed
    const tileSize = 32;
    const cols = Math.ceil(width / tileSize);
    const rows = Math.ceil(height / tileSize);

    // Ensure spawn area (3x3 tiles) is walkable
    const spawnCol = Math.floor(spawnPoint.x / tileSize);
    const spawnRow = Math.floor(spawnPoint.y / tileSize);
    for (let r = spawnRow - 1; r <= spawnRow + 1; r++) {
      for (let c = spawnCol - 1; c <= spawnCol + 1; c++) {
        if (r >= 0 && r < rows && c >= 0 && c < cols) {
          collisionGrid[r][c] = true;
        }
      }
    }

    // Ensure exit area is walkable
    const exitCol = Math.floor(exitPoint.x / tileSize);
    const exitRow = Math.floor(exitPoint.y / tileSize);
    for (let r = exitRow - 1; r <= exitRow + 1; r++) {
      for (let c = exitCol - 1; c <= exitCol + 1; c++) {
        if (r >= 0 && r < rows && c >= 0 && c < cols) {
          collisionGrid[r][c] = true;
        }
      }
    }

    // 验证碰撞网格
    const walkableCount = collisionGrid.flat().filter(Boolean).length;
    const totalCount = collisionGrid.length * (collisionGrid[0]?.length || 0);
    if (walkableCount === 0) {
      console.error('[DungeonGenerator] FATAL: Collision grid has 0 walkable tiles!');
    } else {
      console.log(`[DungeonGenerator] Grid: ${walkableCount}/${totalCount} tiles walkable (${((walkableCount/totalCount)*100).toFixed(1)}%)`);
    }

    return {
      rooms,
      corridors,
      corridorTiles,
      spawnPoint,
      exitPoint,
      enemies,
      items,
      collisionGrid
    };
  }

  private splitBSP(x: number, y: number, w: number, h: number, depth: number): BSPNode {
    const node: BSPNode = { x, y, width: w, height: h };
    const minLeafSize = 140; // ensure leaf nodes large enough for rooms

    if (depth > 0 && w > minLeafSize && h > minLeafSize) {
      const splitHorizontally = this.random() > 0.5;

      if (splitHorizontally && h > minLeafSize) {
        const splitY = y + h * (0.3 + this.random() * 0.4);
        node.left = this.splitBSP(x, y, w, splitY - y, depth - 1);
        node.right = this.splitBSP(x, splitY, w, h - (splitY - y), depth - 1);
      } else if (w > minLeafSize) {
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
      const padding = 8;
      const maxSize = GAME_CONFIG.ROOM_MAX_SIZE || 280;
      const minSize = GAME_CONFIG.ROOM_MIN_SIZE || 96;

      // Calculate room size: between minSize and min(nodeSize - padding, maxSize)
      const maxW = Math.min(node.width - padding * 2, maxSize);
      const maxH = Math.min(node.height - padding * 2, maxSize);
      const roomW = Math.floor(this.random() * (maxW - minSize)) + minSize;
      const roomH = Math.floor(this.random() * (maxH - minSize)) + minSize;

      // Position room within node with some randomness
      const maxOffsetX = Math.max(0, node.width - roomW - padding * 2);
      const maxOffsetY = Math.max(0, node.height - roomH - padding * 2);
      const roomX = node.x + padding + Math.floor(this.random() * maxOffsetX);
      const roomY = node.y + padding + Math.floor(this.random() * maxOffsetY);

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

    // If we have more rooms than target, randomly remove some
    while (rooms.length > targetCount) {
      const removeIdx = Math.floor(this.random() * rooms.length);
      rooms.splice(removeIdx, 1);
    }

    return rooms;
  }

  private connectRooms(rooms: Room[]): Corridor[] {
    const corridors: Corridor[] = [];

    // Linear chain: connect each room to the next
    for (let i = 0; i < rooms.length - 1; i++) {
      corridors.push(...this.makeLCorridor(rooms[i], rooms[i + 1]));
    }

    // Add 1-2 random loop connections between non-adjacent rooms
    if (rooms.length > 3) {
      const loopCount = 1 + Math.floor(this.random() * 2); // 1 or 2 loops
      for (let n = 0; n < loopCount; n++) {
        const a = Math.floor(this.random() * rooms.length);
        let b = Math.floor(this.random() * rooms.length);
        // Ensure different and non-adjacent
        let attempts = 0;
        while ((b === a || b === a - 1 || b === a + 1) && attempts < 10) {
          b = Math.floor(this.random() * rooms.length);
          attempts++;
        }
        if (b !== a && b !== a - 1 && b !== a + 1) {
          corridors.push(...this.makeLCorridor(rooms[a], rooms[b]));
        }
      }
    }

    return corridors;
  }

  private makeLCorridor(roomA: Room, roomB: Room): Corridor[] {
    const ax = roomA.x + roomA.width / 2;
    const ay = roomA.y + roomA.height / 2;
    const bx = roomB.x + roomB.width / 2;
    const by = roomB.y + roomB.height / 2;

    if (this.random() > 0.5) {
      return [
        { x1: ax, y1: ay, x2: bx, y2: ay },
        { x1: bx, y1: ay, x2: bx, y2: by }
      ];
    } else {
      return [
        { x1: ax, y1: ay, x2: ax, y2: by },
        { x1: ax, y1: by, x2: bx, y2: by }
      ];
    }
  }

  private spawnEnemies(rooms: Room[], floor: number): { type: string; x: number; y: number; count: number }[] {
    const config = FLOOR_CONFIG[floor];
    const enemies: { type: string; x: number; y: number; count: number }[] = [];

    for (const room of rooms) {
      if (room.type === 'entrance' || room.type === 'boss' || room.type === 'treasure') continue;

      const count = Math.floor(config.enemyCount[0] + this.random() * (config.enemyCount[1] - config.enemyCount[0]));
      const type = config.enemyTypes[Math.floor(this.random() * config.enemyTypes.length)];

      // Spawn in room center with some randomness, clamped to room interior
      const padding = 32; // Keep away from walls
      const maxOffsetX = Math.max(0, room.width / 2 - padding);
      const maxOffsetY = Math.max(0, room.height / 2 - padding);
      const x = room.x + room.width / 2 + (this.random() - 0.5) * maxOffsetX;
      const y = room.y + room.height / 2 + (this.random() - 0.5) * maxOffsetY;

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

    // 标记走廊区域为可行走（走廊宽度 = 2 tiles = 64px, 方便48px玩家通过）
    const corridorPadding = 1; // 额外加1 tile宽度
    for (const corridor of corridors) {
      const minC = Math.floor(Math.min(corridor.x1, corridor.x2) / tileSize) - corridorPadding;
      const maxC = Math.floor(Math.max(corridor.x1, corridor.x2) / tileSize) + corridorPadding;
      const minR = Math.floor(Math.min(corridor.y1, corridor.y2) / tileSize) - corridorPadding;
      const maxR = Math.floor(Math.max(corridor.y1, corridor.y2) / tileSize) + corridorPadding;

      for (let r = minR; r <= maxR && r < rows; r++) {
        for (let c = minC; c <= maxC && c < cols; c++) {
          if (r >= 0 && c >= 0) grid[r][c] = true;
        }
      }
    }

    return grid;
  }

  /**
   * 将走廊线段光栅化为瓦片坐标列表（用于客户端渲染）
   * corridorPadding 与碰撞网格一致（1 tile 宽度扩展）
   */
  private generateCorridorTiles(corridors: Corridor[], mapW: number, mapH: number): { x: number; y: number }[] {
    const tileSize = 32;
    const cols = Math.ceil(mapW / tileSize);
    const rows = Math.ceil(mapH / tileSize);
    const corridorPadding = 1;
    const tiles = new Set<string>();

    for (const corridor of corridors) {
      const minC = Math.floor(Math.min(corridor.x1, corridor.x2) / tileSize) - corridorPadding;
      const maxC = Math.floor(Math.max(corridor.x1, corridor.x2) / tileSize) + corridorPadding;
      const minR = Math.floor(Math.min(corridor.y1, corridor.y2) / tileSize) - corridorPadding;
      const maxR = Math.floor(Math.max(corridor.y1, corridor.y2) / tileSize) + corridorPadding;

      for (let r = minR; r <= maxR && r < rows; r++) {
        for (let c = minC; c <= maxC && c < cols; c++) {
          if (r >= 0 && c >= 0) {
            // 瓦片像素中心坐标
            tiles.add(`${c * tileSize + tileSize / 2},${r * tileSize + tileSize / 2}`);
          }
        }
      }
    }

    return Array.from(tiles).map(s => {
      const [x, y] = s.split(',').map(Number);
      return { x, y };
    });
  }
}
