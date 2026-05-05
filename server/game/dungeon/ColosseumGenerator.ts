import {
  ARENA_CENTRAL_WIDTH,
  ARENA_CENTRAL_HEIGHT,
  ARENA_CENTRAL_COL,
  ARENA_CENTRAL_ROW,
  ARENA_RING_WIDTH,
  ARENA_RING_OUTER_COL_MIN,
  ARENA_RING_OUTER_COL_MAX,
  ARENA_RING_OUTER_ROW_MIN,
  ARENA_RING_OUTER_ROW_MAX,
  PILLAR_HP,
  PILLAR_SIZE,
  TRAP_TYPES,
  TILE_SIZE,
} from '../../../shared/constants';
import type { EnvObjectState } from '../../../shared/types';
import { MathUtils } from '../../utils/MathUtils';

export interface ArenaData {
  room: { x: number; y: number; width: number; height: number };
  collisionGrid: boolean[][];
  envObjects: EnvObjectState[];
  spawnPoint: { x: number; y: number };
  exitPoint: { x: number; y: number };
  exitDoorId: string;
}

const MAP_WIDTH = 1024;
const MAP_HEIGHT = 768;
const COLS = Math.ceil(MAP_WIDTH / TILE_SIZE);
const ROWS = Math.ceil(MAP_HEIGHT / TILE_SIZE);

// Central arena tile range
const CENTRAL_COL_START = ARENA_CENTRAL_COL;
const CENTRAL_COL_END = ARENA_CENTRAL_COL + (ARENA_CENTRAL_WIDTH / TILE_SIZE) - 1;
const CENTRAL_ROW_START = ARENA_CENTRAL_ROW;
const CENTRAL_ROW_END = ARENA_CENTRAL_ROW + (ARENA_CENTRAL_HEIGHT / TILE_SIZE) - 1;

// Ring corridor outer boundary
const RING_COL_MIN = ARENA_RING_OUTER_COL_MIN;
const RING_COL_MAX = ARENA_RING_OUTER_COL_MAX;
const RING_ROW_MIN = ARENA_RING_OUTER_ROW_MIN;
const RING_ROW_MAX = ARENA_RING_OUTER_ROW_MAX;

// Entrance corridor: col 0-5, row 11-12 (connects west ring)
const ENTRANCE_COL_START = 0;
const ENTRANCE_COL_END = 5;
const ENTRANCE_ROW_START = 11;
const ENTRANCE_ROW_END = 12;

// Exit corridor: col 26-31, row 11-12 (connects east ring)
const EXIT_COL_START = 26;
const EXIT_COL_END = 31;
const EXIT_ROW_START = 11;
const EXIT_ROW_END = 12;

// Channel openings (3 tiles wide each)
const CHANNEL_NORTH = { colStart: 14, colEnd: 16, row: 6 };
const CHANNEL_SOUTH = { colStart: 14, colEnd: 16, row: 17 };
const CHANNEL_WEST = { col: 7, rowStart: 10, rowEnd: 12 };
const CHANNEL_EAST = { col: 24, rowStart: 10, rowEnd: 12 };

export function generateColosseum(floor: number, seed: number): ArenaData {
  const random = MathUtils.seededRandom(seed);
  let nextId = 1;
  const id = (): string => `arena_obj_${nextId++}`;

  const collisionGrid: boolean[][] = Array.from({ length: ROWS }, () =>
    Array(COLS).fill(false),
  );

  // ── Carve ring corridor (outer boundary minus central arena) ──
  for (let r = RING_ROW_MIN; r <= RING_ROW_MAX; r++) {
    for (let c = RING_COL_MIN; c <= RING_COL_MAX; c++) {
      const inCentral = c >= CENTRAL_COL_START && c <= CENTRAL_COL_END &&
                        r >= CENTRAL_ROW_START && r <= CENTRAL_ROW_END;
      if (!inCentral) {
        collisionGrid[r][c] = true;
      }
    }
  }

  // ── Carve central arena ──
  for (let r = CENTRAL_ROW_START; r <= CENTRAL_ROW_END; r++) {
    for (let c = CENTRAL_COL_START; c <= CENTRAL_COL_END; c++) {
      collisionGrid[r][c] = true;
    }
  }

  // ── Carve channel openings ──
  for (let c = CHANNEL_NORTH.colStart; c <= CHANNEL_NORTH.colEnd; c++) {
    collisionGrid[CHANNEL_NORTH.row][c] = true;
  }
  for (let c = CHANNEL_SOUTH.colStart; c <= CHANNEL_SOUTH.colEnd; c++) {
    collisionGrid[CHANNEL_SOUTH.row][c] = true;
  }
  for (let r = CHANNEL_WEST.rowStart; r <= CHANNEL_WEST.rowEnd; r++) {
    collisionGrid[r][CHANNEL_WEST.col] = true;
  }
  for (let r = CHANNEL_EAST.rowStart; r <= CHANNEL_EAST.rowEnd; r++) {
    collisionGrid[r][CHANNEL_EAST.col] = true;
  }

  // ── Carve entrance corridor ──
  for (let r = ENTRANCE_ROW_START; r <= ENTRANCE_ROW_END; r++) {
    for (let c = ENTRANCE_COL_START; c <= ENTRANCE_COL_END; c++) {
      collisionGrid[r][c] = true;
    }
  }

  // ── Carve exit corridor ──
  for (let r = EXIT_ROW_START; r <= EXIT_ROW_END; r++) {
    for (let c = EXIT_COL_START; c <= EXIT_COL_END; c++) {
      collisionGrid[r][c] = true;
    }
  }

  const envObjects: EnvObjectState[] = [];

  // ── 4 pillars at central arena corners ──
  const pillarInset = TILE_SIZE;
  const centralX = CENTRAL_COL_START * TILE_SIZE;
  const centralY = CENTRAL_ROW_START * TILE_SIZE;
  const centralW = (CENTRAL_COL_END - CENTRAL_COL_START + 1) * TILE_SIZE;
  const centralH = (CENTRAL_ROW_END - CENTRAL_ROW_START + 1) * TILE_SIZE;

  const pillarPositions = [
    { x: centralX + pillarInset + TILE_SIZE / 2, y: centralY + pillarInset + TILE_SIZE / 2 },
    { x: centralX + centralW - pillarInset - PILLAR_SIZE + TILE_SIZE / 2, y: centralY + pillarInset + TILE_SIZE / 2 },
    { x: centralX + pillarInset + TILE_SIZE / 2, y: centralY + centralH - pillarInset - PILLAR_SIZE + TILE_SIZE / 2 },
    { x: centralX + centralW - pillarInset - PILLAR_SIZE + TILE_SIZE / 2, y: centralY + centralH - pillarInset - PILLAR_SIZE + TILE_SIZE / 2 },
  ];

  for (const pos of pillarPositions) {
    envObjects.push({
      id: id(),
      type: 'pillar',
      x: pos.x,
      y: pos.y,
      width: PILLAR_SIZE,
      height: PILLAR_SIZE,
      alive: true,
      hp: PILLAR_HP,
      hpMax: PILLAR_HP,
    });
    const col = Math.floor(pos.x / TILE_SIZE);
    const row = Math.floor(pos.y / TILE_SIZE);
    collisionGrid[row][col] = false;
  }

  // ── Traps in ring corridor corners (2+floor, spike/fire only) ──
  const trapCount = 2 + floor;
  const trapCandidates = [
    // Ring corridor corners (tile center coordinates)
    { x: (RING_COL_MIN + 1) * TILE_SIZE + TILE_SIZE / 2, y: (RING_ROW_MIN + 1) * TILE_SIZE + TILE_SIZE / 2 },
    { x: (RING_COL_MAX - 1) * TILE_SIZE + TILE_SIZE / 2, y: (RING_ROW_MIN + 1) * TILE_SIZE + TILE_SIZE / 2 },
    { x: (RING_COL_MIN + 1) * TILE_SIZE + TILE_SIZE / 2, y: (RING_ROW_MAX - 1) * TILE_SIZE + TILE_SIZE / 2 },
    { x: (RING_COL_MAX - 1) * TILE_SIZE + TILE_SIZE / 2, y: (RING_ROW_MAX - 1) * TILE_SIZE + TILE_SIZE / 2 },
    // Additional positions along ring edges
    { x: Math.floor((RING_COL_MIN + RING_COL_MAX) / 2) * TILE_SIZE + TILE_SIZE / 2, y: (RING_ROW_MIN + 1) * TILE_SIZE + TILE_SIZE / 2 },
    { x: Math.floor((RING_COL_MIN + RING_COL_MAX) / 2) * TILE_SIZE + TILE_SIZE / 2, y: (RING_ROW_MAX - 1) * TILE_SIZE + TILE_SIZE / 2 },
    { x: (RING_COL_MIN + 1) * TILE_SIZE + TILE_SIZE / 2, y: Math.floor((RING_ROW_MIN + RING_ROW_MAX) / 2) * TILE_SIZE + TILE_SIZE / 2 },
    { x: (RING_COL_MAX - 1) * TILE_SIZE + TILE_SIZE / 2, y: Math.floor((RING_ROW_MIN + RING_ROW_MAX) / 2) * TILE_SIZE + TILE_SIZE / 2 },
  ];

  // Shuffle and pick trapCount positions with 128px minimum spacing
  const shuffledCandidates = shuffleArray([...trapCandidates], random);
  const placedTraps: { x: number; y: number }[] = [];
  const minTrapSpacing = 128;

  for (const candidate of shuffledCandidates) {
    if (placedTraps.length >= trapCount) break;

    // Verify candidate is in ring corridor (not central arena or wall)
    const col = Math.floor(candidate.x / TILE_SIZE);
    const row = Math.floor(candidate.y / TILE_SIZE);
    const inCentral = col >= CENTRAL_COL_START && col <= CENTRAL_COL_END &&
                      row >= CENTRAL_ROW_START && row <= CENTRAL_ROW_END;
    if (inCentral) continue;
    if (!collisionGrid[row]?.[col]) continue;

    // Check spacing
    const tooClose = placedTraps.some(t =>
      Math.abs(t.x - candidate.x) + Math.abs(t.y - candidate.y) < minTrapSpacing,
    );
    if (tooClose) continue;

    const isSpike = random() < 0.5;
    const trapType = isSpike ? 'spike' : 'fire';
    const timings = TRAP_TYPES[trapType];

    envObjects.push({
      id: id(),
      type: 'trap',
      x: candidate.x,
      y: candidate.y,
      width: TILE_SIZE,
      height: TILE_SIZE,
      alive: true,
      trapType,
      trapActive: false,
      trapCycleTimer: timings.offDuration,
      trapOnDuration: timings.onDuration,
      trapOffDuration: timings.offDuration,
      triggeredEntityIds: [],
    });
    placedTraps.push(candidate);
  }

  // ── Exit door (east side of ring corridor) ──
  const doorX = EXIT_COL_START * TILE_SIZE + TILE_SIZE / 2;
  const doorY = EXIT_ROW_START * TILE_SIZE + TILE_SIZE / 2;
  const doorId = id();
  envObjects.push({
    id: doorId,
    type: 'door',
    x: doorX,
    y: doorY,
    width: TILE_SIZE,
    height: TILE_SIZE,
    alive: true,
    doorOpen: true,
  });
  // Door starts open — corridor already carved

  // ── Force clear 3×3 area around spawn & exit for player radius ──
  const spawnTileCol = ENTRANCE_COL_START + 1;
  const spawnTileRow = Math.floor((ENTRANCE_ROW_START + ENTRANCE_ROW_END) / 2);
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const r = spawnTileRow + dr;
      const c = spawnTileCol + dc;
      if (r >= 0 && r < ROWS && c >= 0 && c < COLS) collisionGrid[r][c] = true;
    }
  }

  const exitTileCol = EXIT_COL_END - 1;
  const exitTileRow = Math.floor((EXIT_ROW_START + EXIT_ROW_END) / 2);
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const r = exitTileRow + dr;
      const c = exitTileCol + dc;
      if (r >= 0 && r < ROWS && c >= 0 && c < COLS) collisionGrid[r][c] = true;
    }
  }

  // ── Spawn point: entrance corridor center ──
  const spawnX = spawnTileCol * TILE_SIZE + TILE_SIZE / 2;
  const spawnY = spawnTileRow * TILE_SIZE + TILE_SIZE / 2;

  // ── Exit point: exit corridor ──
  const exitPoint = { x: exitTileCol * TILE_SIZE + TILE_SIZE / 2, y: exitTileRow * TILE_SIZE + TILE_SIZE / 2 };

  return {
    room: {
      x: RING_COL_MIN * TILE_SIZE,
      y: RING_ROW_MIN * TILE_SIZE,
      width: (RING_COL_MAX - RING_COL_MIN + 1) * TILE_SIZE,
      height: (RING_ROW_MAX - RING_ROW_MIN + 1) * TILE_SIZE,
    },
    collisionGrid,
    envObjects,
    spawnPoint: { x: spawnX, y: spawnY },
    exitPoint,
    exitDoorId: doorId,
  };
}

// ── Helpers ──

function tileAlign(v: number): number {
  return Math.floor(v / TILE_SIZE) * TILE_SIZE;
}

function shuffleArray<T>(arr: T[], random: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
