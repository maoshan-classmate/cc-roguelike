import { GAME_CONFIG, FLOOR_CONFIG } from '../../config/constants';
import { MathUtils } from '../../utils/MathUtils';
import { ROOM_TEMPLATES } from './RoomTemplates';
import type { EnvObjectState, EnemyType, ItemPickupType } from '../../../shared/types';
import { PILLAR_HP, PILLAR_SIZE, BOSS_ROOM_MIN_SIZE, TRAP_TYPES, TILE_SIZE } from '../../../shared/constants';
import type { TerrainGenerator, TerrainData } from './types';
import { registerTerrain } from './types';
import { clearAreaAround } from '../../utils/dungeon';

interface DungeonData {
  rooms: Room[];
  corridors: Corridor[];
  corridorTiles: { x: number; y: number }[];
  spawnPoint: { x: number; y: number };
  exitPoint: { x: number; y: number };
  enemies: { type: string; x: number; y: number; count: number }[];
  items: { id: string; x: number; y: number; type: string }[];
  collisionGrid: boolean[][];
  envObjects: EnvObjectState[];
  roomTemplates: string[];
}

interface Room {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'normal' | 'elite' | 'treasure' | 'rest' | 'boss' | 'entrance' | 'exit' | 'trap';
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

export class DungeonGenerator implements TerrainGenerator {
  readonly type = 'dungeon' as const;
  private random!: () => number;
  private envObjectIdCounter = 0;

  generate(floor: number, seed: number): TerrainData {
    this.random = MathUtils.seededRandom(seed);
    this.envObjectIdCounter = 0;
    const width = GAME_CONFIG.DUNGEON_WIDTH;
    const height = GAME_CONFIG.DUNGEON_HEIGHT;

    // Step 1: Layout generation
    const layout = this.generateLayout(floor, width, height);

    // Step 2: Room type assignment
    this.assignRoomTypes(layout.rooms, floor);

    // Step 3: Template application
    const templateResult = this.applyTemplates(layout.rooms);

    // Step 4: Content generation (enemies + items + env objects)
    const content = this.spawnContent(layout.rooms, floor, layout.exitPoint);

    // Step 5: Collision grid generation
    const gridData = this.generateGrid(layout.rooms, layout.corridors, templateResult.carvedTiles, [...templateResult.envObjects, ...content.envObjects], width, height);

    // Force-clear spawn and exit areas
    clearAreaAround(gridData.collisionGrid, Math.floor(layout.spawnPoint.x / TILE_SIZE), Math.floor(layout.spawnPoint.y / TILE_SIZE));
    clearAreaAround(gridData.collisionGrid, Math.floor(layout.exitPoint.x / TILE_SIZE), Math.floor(layout.exitPoint.y / TILE_SIZE));

    // Validate grid
    const walkableCount = gridData.collisionGrid.flat().filter(Boolean).length;
    const totalCount = gridData.collisionGrid.length * (gridData.collisionGrid[0]?.length || 0);
    if (walkableCount === 0) {
      console.error('[DungeonGenerator] FATAL: Collision grid has 0 walkable tiles!');
    } else {
      console.log(`[DungeonGenerator] Grid: ${walkableCount}/${totalCount} tiles walkable (${((walkableCount / totalCount) * 100).toFixed(1)}%)`);
    }

    const allEnvObjects = [...templateResult.envObjects, ...content.envObjects];
    const roomTemplates = layout.rooms.map((_, i) => templateResult.roomTemplates[i] || 'none');

    return {
      rooms: layout.rooms,
      corridorTiles: gridData.corridorTiles,
      spawnPoint: layout.spawnPoint,
      exitPoint: layout.exitPoint,
      enemySpawns: content.enemies as { type: EnemyType; x: number; y: number; count: number }[],
      itemSpawns: content.items as { id: string; x: number; y: number; type: ItemPickupType }[],
      collisionGrid: gridData.collisionGrid,
      envObjects: allEnvObjects,
      roomTemplates,
    };
  }

  private nextEnvId(): string {
    return `env_${++this.envObjectIdCounter}`;
  }

  // ── Step 1: Layout Generation ──

  private generateLayout(floor: number, width: number, height: number): {
    rooms: Room[]; corridors: Corridor[]; spawnPoint: { x: number; y: number }; exitPoint: { x: number; y: number };
  } {
    const roomCount = 6 + floor * 2;
    const bspDepth = Math.min(2 + Math.ceil(floor / 2), 4);
    const root = this.splitBSP(0, 0, width, height, bspDepth);
    const rooms = this.generateRooms(root, roomCount);
    const corridors = this.connectRooms(rooms);

    // Enforce boss room minimum size
    const lastRoom = rooms[rooms.length - 1];
    const isLastFloor = floor >= (GAME_CONFIG.FLOOR_COUNT || 5);
    if (isLastFloor) {
      if (lastRoom.width < BOSS_ROOM_MIN_SIZE) lastRoom.width = BOSS_ROOM_MIN_SIZE;
      if (lastRoom.height < BOSS_ROOM_MIN_SIZE) lastRoom.height = BOSS_ROOM_MIN_SIZE;
      // Clamp to dungeon bounds
      if (lastRoom.x + lastRoom.width > width) lastRoom.width = width - lastRoom.x;
      if (lastRoom.y + lastRoom.height > height) lastRoom.height = height - lastRoom.y;
    }

    const spawnPoint = { x: rooms[0].x + rooms[0].width / 2, y: rooms[0].y + rooms[0].height / 2 };
    const exitPoint = { x: lastRoom.x + lastRoom.width / 2, y: lastRoom.y + lastRoom.height / 2 };

    return { rooms, corridors, spawnPoint, exitPoint };
  }

  // ── Step 2: Room Type Assignment ──

  private assignRoomTypes(rooms: Room[], floor: number): void {
    rooms[0].type = 'entrance';
    const isLastFloor = floor >= (GAME_CONFIG.FLOOR_COUNT || 5);
    rooms[rooms.length - 1].type = isLastFloor ? 'boss' : 'exit';

    // Treasure room
    if (rooms.length > 3) {
      const idx = Math.floor(this.random() * (rooms.length - 2)) + 1;
      rooms[idx].type = 'treasure';
    }

    // Trap rooms (Floor 2+)
    if (floor >= 2) {
      const trapCount = Math.floor(this.random() * (Math.min(floor - 1, 2) + 1));
      const candidates = rooms.filter((r, i) =>
        i > 0 && i < rooms.length - 1 && r.type === 'normal'
      );
      const normalCount = rooms.filter(r => r.type === 'normal').length;
      const minNormal = Math.ceil(rooms.length * 0.5);

      for (let t = 0; t < trapCount && t < candidates.length; t++) {
        if (normalCount - t <= minNormal) break;
        const ci = Math.floor(this.random() * candidates.length);
        candidates[ci].type = 'trap';
        candidates.splice(ci, 1);
      }
    }
  }

  // ── Step 3: Template Application ──

  private applyTemplates(rooms: Room[]): { carvedTiles: { col: number; row: number }[]; envObjects: EnvObjectState[]; roomTemplates: string[] } {
    const allCarvedTiles: { col: number; row: number }[] = [];
    const allEnvObjects: EnvObjectState[] = [];
    const roomTemplates: string[] = [];

    for (const room of rooms) {
      let templateName = 'none';

      if (room.type === 'entrance' || room.type === 'boss') {
        templateName = 'none';
      } else if (room.type === 'treasure') {
        templateName = this.random() < 0.5 ? 'none' : 'cross';
      } else if (room.type === 'trap') {
        templateName = 'l_shape';
      } else {
        // normal
        const roll = this.random();
        if (roll < 0.6) templateName = 'none';
        else if (roll < 0.75) templateName = 'cross';
        else if (roll < 0.85) templateName = 'l_shape';
        else if (roll < 0.95) templateName = 'pillars_4';
        else templateName = 'diamond';
      }

      const template = ROOM_TEMPLATES[templateName];
      if (template && room.width >= template.minWidth && room.height >= template.minHeight && templateName !== 'none') {
        const result = template.carve(room.x, room.y, room.width, room.height);
        allCarvedTiles.push(...result.carvedTiles);
        for (const obj of result.envObjects) {
          allEnvObjects.push({ ...obj, id: this.nextEnvId() });
        }
      }

      roomTemplates.push(templateName);
    }

    return { carvedTiles: allCarvedTiles, envObjects: allEnvObjects, roomTemplates };
  }

  // ── Step 4: Content Generation ──

  private spawnContent(rooms: Room[], floor: number, exitPoint: { x: number; y: number }): {
    enemies: { type: string; x: number; y: number; count: number }[];
    items: { id: string; x: number; y: number; type: string }[];
    envObjects: EnvObjectState[];
  } {
    const enemies = this.spawnEnemies(rooms, floor, exitPoint);
    const items = this.spawnItems(rooms);
    const envObjects: EnvObjectState[] = [];

    // Boss room decorations
    const bossRoom = rooms.find(r => r.type === 'boss');
    if (bossRoom) {
      // 4 pillars at corners (32px from walls)
      const offsets = [
        { dx: 32, dy: 32 },
        { dx: bossRoom.width - 64, dy: 32 },
        { dx: 32, dy: bossRoom.height - 64 },
        { dx: bossRoom.width - 64, dy: bossRoom.height - 64 },
      ];
      for (let i = 0; i < offsets.length; i++) {
        const px = Math.floor((bossRoom.x + offsets[i].dx) / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2;
        const py = Math.floor((bossRoom.y + offsets[i].dy) / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2;
        envObjects.push({
          id: this.nextEnvId(),
          type: 'pillar',
          x: px, y: py,
          width: PILLAR_SIZE, height: PILLAR_SIZE,
          alive: true,
          hp: PILLAR_HP, hpMax: PILLAR_HP,
        });
      }
    }

    // Trap room env objects
    for (const room of rooms) {
      if (room.type !== 'trap') continue;
      const trapCount = 3 + Math.floor(this.random() * 4); // 3-6 traps
      const trapType = this.random() < 0.6 ? 'spike' : this.random() < 0.75 ? 'fire' : 'slow';
      const timings = TRAP_TYPES[trapType];
      const centerX = room.x + room.width / 2;
      const centerY = room.y + room.height / 2;

      for (let t = 0; t < trapCount; t++) {
        // Symmetric placement, avoid center 3x3
        let tx: number, ty: number;
        for (let attempt = 0; attempt < 20; attempt++) {
          const angle = (t / trapCount) * Math.PI * 2 + this.random() * 0.5;
          const dist = 64 + this.random() * (Math.min(room.width, room.height) / 2 - 80);
          tx = Math.floor((centerX + Math.cos(angle) * dist) / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2;
          ty = Math.floor((centerY + Math.sin(angle) * dist) / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2;
          // Avoid center 3x3
          if (Math.abs(tx - Math.floor(centerX / TILE_SIZE) * TILE_SIZE) < TILE_SIZE * 2 &&
              Math.abs(ty - Math.floor(centerY / TILE_SIZE) * TILE_SIZE) < TILE_SIZE * 2) continue;
          // Stay in room
          if (tx >= room.x && tx < room.x + room.width && ty >= room.y && ty < room.y + room.height) break;
        }
        envObjects.push({
          id: this.nextEnvId(),
          type: 'trap',
          x: tx!, y: ty!,
          width: TILE_SIZE, height: TILE_SIZE,
          alive: true,
          trapType: trapType as 'spike' | 'fire' | 'slow',
          trapActive: false,
          trapCycleTimer: timings.offDuration,
          trapOnDuration: timings.onDuration,
          trapOffDuration: timings.offDuration,
          triggeredEntityIds: [],
        });
      }
    }

    return { enemies, items, envObjects };
  }

  // ── Step 5: Grid Generation ──

  private generateGrid(rooms: Room[], corridors: Corridor[], carvedTiles: { col: number; row: number }[], envObjects: EnvObjectState[], mapW: number, mapH: number): {
    collisionGrid: boolean[][]; corridorTiles: { x: number; y: number }[];
  } {
    const cols = Math.ceil(mapW / TILE_SIZE);
    const rows = Math.ceil(mapH / TILE_SIZE);
    const grid: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));

    // Mark rooms
    for (const room of rooms) {
      const sc = Math.floor(room.x / TILE_SIZE);
      const sr = Math.floor(room.y / TILE_SIZE);
      const ec = Math.ceil((room.x + room.width) / TILE_SIZE);
      const er = Math.ceil((room.y + room.height) / TILE_SIZE);
      for (let r = sr; r < er && r < rows; r++) {
        for (let c = sc; c < ec && c < cols; c++) {
          if (r >= 0 && c >= 0) grid[r][c] = true;
        }
      }
    }

    // Mark corridors — pad only perpendicular to corridor direction to avoid fat corners
    const corridorPadding = 1;
    for (const corridor of corridors) {
      const minC = Math.floor(Math.min(corridor.x1, corridor.x2) / TILE_SIZE);
      const maxC = Math.floor(Math.max(corridor.x1, corridor.x2) / TILE_SIZE);
      const minR = Math.floor(Math.min(corridor.y1, corridor.y2) / TILE_SIZE);
      const maxR = Math.floor(Math.max(corridor.y1, corridor.y2) / TILE_SIZE);
      const isHorizontal = Math.abs(corridor.y1 - corridor.y2) < TILE_SIZE;
      // Horizontal: pad rows; Vertical: pad cols
      const rMin = isHorizontal ? minR - corridorPadding : minR;
      const rMax = isHorizontal ? maxR + corridorPadding : maxR;
      const cMin = isHorizontal ? minC : minC - corridorPadding;
      const cMax = isHorizontal ? maxC : maxC + corridorPadding;
      for (let r = rMin; r <= rMax && r < rows; r++) {
        for (let c = cMin; c <= cMax && c < cols; c++) {
          if (r >= 0 && c >= 0) grid[r][c] = true;
        }
      }
    }

    // Apply carved tiles (template carving)
    for (const t of carvedTiles) {
      if (t.row >= 0 && t.row < rows && t.col >= 0 && t.col < cols) {
        grid[t.row][t.col] = false;
      }
    }

    // Bake pillar envObjects into grid (non-walkable)
    for (const obj of envObjects) {
      if (obj.type === 'pillar' && obj.alive) {
        const col = Math.floor(obj.x / TILE_SIZE);
        const row = Math.floor(obj.y / TILE_SIZE);
        if (row >= 0 && row < rows && col >= 0 && col < cols) {
          grid[row][col] = false;
        }
      }
    }

    const corridorTiles = this.generateCorridorTiles(corridors, mapW, mapH);

    return { collisionGrid: grid, corridorTiles };
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

  private spawnEnemies(rooms: Room[], floor: number, exitPoint: { x: number; y: number }): { type: string; x: number; y: number; count: number }[] {
    const config = FLOOR_CONFIG[floor];
    const enemies: { type: string; x: number; y: number; count: number }[] = [];
    const isBossFloor = floor >= (GAME_CONFIG.FLOOR_COUNT || 5);

    for (const room of rooms) {
      // Boss room: spawn 1 boss at exit point
      if (room.type === 'boss') {
        enemies.push({ type: 'boss', x: exitPoint.x, y: exitPoint.y, count: 1 });
        continue;
      }

      // Boss floor (Floor 5): only the boss, no regular enemies
      if (isBossFloor) continue;

      if (room.type === 'entrance' || room.type === 'treasure') continue;

      const count = Math.floor(config.enemyCount[0] + this.random() * (config.enemyCount[1] - config.enemyCount[0]));
      const type = config.enemyTypes[Math.floor(this.random() * config.enemyTypes.length)];

      const padding = 32;
      const maxOffsetX = Math.max(0, room.width / 2 - padding);
      const maxOffsetY = Math.max(0, room.height / 2 - padding);

      for (let i = 0; i < count; i++) {
        const x = room.x + room.width / 2 + (this.random() - 0.5) * maxOffsetX;
        const y = room.y + room.height / 2 + (this.random() - 0.5) * maxOffsetY;
        enemies.push({ type, x, y, count: 1 });
      }
    }

    return enemies;
  }

  private spawnItems(rooms: Room[]): { id: string; x: number; y: number; type: string }[] {
    const items: { id: string; x: number; y: number; type: string }[] = [];

    for (const room of rooms) {
      if (room.type === 'treasure') {
        // Treasure rooms: 1-2 random items
        const count = this.random() > 0.5 ? 2 : 1;
        for (let i = 0; i < count; i++) {
          const x = room.x + room.width / 2 + (this.random() - 0.5) * 30;
          const y = room.y + room.height / 2 + (this.random() - 0.5) * 30;

          const roll = this.random();
          const type = roll < 0.3 ? 'health'
            : roll < 0.5 ? 'energy'
            : roll < 0.7 ? 'potion'
            : roll < 0.85 ? 'shield'
            : 'coin';

          items.push({
            id: `item_${Date.now()}_${Math.random().toString(36).slice(2)}_${i}`,
            x,
            y,
            type
          });
        }
      } else if (room.type === 'boss') {
        // Boss room: pre-fight supplies (1 health + 1 potion)
        const cx = room.x + room.width / 2;
        const cy = room.y + room.height / 2;
        items.push(
          { id: `item_boss_hp_${Date.now()}`, x: cx - 24, y: cy - 20, type: 'health' },
          { id: `item_boss_pot_${Date.now()}`, x: cx + 24, y: cy - 20, type: 'potion' }
        );
      }
    }

    return items;
  }

  // generateCollisionGrid removed — merged into generateGrid()

  /**
   * 将走廊线段光栅化为瓦片坐标列表（用于客户端渲染）
   * corridorPadding 与碰撞网格一致 — 只沿垂直方向扩展
   */
  private generateCorridorTiles(corridors: Corridor[], mapW: number, mapH: number): { x: number; y: number }[] {
    const tileSize = 32;
    const cols = Math.ceil(mapW / tileSize);
    const rows = Math.ceil(mapH / tileSize);
    const corridorPadding = 1;
    const tiles = new Set<string>();

    for (const corridor of corridors) {
      const minC = Math.floor(Math.min(corridor.x1, corridor.x2) / tileSize);
      const maxC = Math.floor(Math.max(corridor.x1, corridor.x2) / tileSize);
      const minR = Math.floor(Math.min(corridor.y1, corridor.y2) / tileSize);
      const maxR = Math.floor(Math.max(corridor.y1, corridor.y2) / tileSize);
      const isHorizontal = Math.abs(corridor.y1 - corridor.y2) < tileSize;
      const rMin = isHorizontal ? minR - corridorPadding : minR;
      const rMax = isHorizontal ? maxR + corridorPadding : maxR;
      const cMin = isHorizontal ? minC : minC - corridorPadding;
      const cMax = isHorizontal ? maxC : maxC + corridorPadding;

      for (let r = rMin; r <= rMax && r < rows; r++) {
        for (let c = cMin; c <= cMax && c < cols; c++) {
          if (r >= 0 && c >= 0) {
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

registerTerrain(new DungeonGenerator());
