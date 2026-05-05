import {
  PILLAR_HP,
  PILLAR_SIZE,
  TILE_SIZE,
} from '../../../shared/constants';
import type { EnvObjectState, DungeonData, DungeonRoom } from '../../../shared/types';
import { MathUtils } from '../../utils/MathUtils';

const MAP_COLS = 32;
const MAP_ROWS = 24;

// Boss hall: 26×18 tiles = 832×576 px, centered at (96, 96) = col 3, row 3
const HALL_COL_START = 3;
const HALL_ROW_START = 3;
const HALL_TILE_W = 26;
const HALL_TILE_H = 18;

// Entrance corridor: 2×6 tiles at col 1-2, row 9-14
const CORRIDOR_COL_START = 1;
const CORRIDOR_COL_END = 2;
const CORRIDOR_ROW_START = 9;
const CORRIDOR_ROW_END = 14;

function tileAlign(v: number): number {
  return Math.floor(v / TILE_SIZE) * TILE_SIZE;
}

export function generateBossArena(floor: number, seed: number): DungeonData {
  const random = MathUtils.seededRandom(seed);
  let nextId = 1;
  const id = (): string => `boss_obj_${nextId++}`;

  // All false grid
  const collisionGrid: boolean[][] = Array.from({ length: MAP_ROWS }, () =>
    Array(MAP_COLS).fill(false),
  );

  // Carve hall
  for (let r = HALL_ROW_START; r < HALL_ROW_START + HALL_TILE_H; r++) {
    for (let c = HALL_COL_START; c < HALL_COL_START + HALL_TILE_W; c++) {
      collisionGrid[r][c] = true;
    }
  }

  // Carve entrance corridor
  for (let r = CORRIDOR_ROW_START; r <= CORRIDOR_ROW_END; r++) {
    for (let c = CORRIDOR_COL_START; c <= CORRIDOR_COL_END; c++) {
      collisionGrid[r][c] = true;
    }
  }

  const envObjects: EnvObjectState[] = [];
  const hallX = HALL_COL_START * TILE_SIZE;
  const hallY = HALL_ROW_START * TILE_SIZE;
  const hallW = HALL_TILE_W * TILE_SIZE;
  const hallH = HALL_TILE_H * TILE_SIZE;

  // 4 pillars at corners, 2×2 tiles (64×64px), tile-aligned
  const BOSS_PILLAR_SIZE = TILE_SIZE * 2;
  const offset = TILE_SIZE;
  const pillarPositions = [
    { x: hallX + offset + TILE_SIZE, y: hallY + offset + TILE_SIZE },
    { x: hallX + hallW - offset - TILE_SIZE, y: hallY + offset + TILE_SIZE },
    { x: hallX + offset + TILE_SIZE, y: hallY + hallH - offset - TILE_SIZE },
    { x: hallX + hallW - offset - TILE_SIZE, y: hallY + hallH - offset - TILE_SIZE },
  ];

  for (const pos of pillarPositions) {
    envObjects.push({
      id: id(),
      type: 'pillar',
      x: pos.x,
      y: pos.y,
      width: BOSS_PILLAR_SIZE,
      height: BOSS_PILLAR_SIZE,
      alive: true,
      hp: PILLAR_HP,
      hpMax: PILLAR_HP,
    });
    // Don't mark collision grid — pillar collision handled via entity-based rect check
  }

  // Decorations using atlas sprites that match dungeon theme
  // 2 skulls at hall corners (atmosphere)
  const skullPositions = [
    { x: hallX + TILE_SIZE * 2 + TILE_SIZE / 2, y: hallY + TILE_SIZE * 2 + TILE_SIZE / 2 },
    { x: hallX + hallW - TILE_SIZE * 3 + TILE_SIZE / 2, y: hallY + hallH - TILE_SIZE * 3 + TILE_SIZE / 2 },
  ];
  for (const pos of skullPositions) {
    envObjects.push({
      id: id(),
      type: 'decoration',
      x: pos.x,
      y: pos.y,
      width: TILE_SIZE,
      height: TILE_SIZE,
      alive: true,
      spriteKey: 'skull',
    });
  }

  // Throne at hall center (custom sprite)
  const throneX = hallX + Math.floor(hallW / 2 / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2;
  const throneY = hallY + Math.floor(hallH / 2 / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2;
  envObjects.push({
    id: id(),
    type: 'decoration',
    x: throneX,
    y: throneY,
    width: TILE_SIZE * 2,
    height: TILE_SIZE * 2,
    alive: true,
    spriteKey: 'throne',
  });

  // 2 floor banners flanking throne (custom sprites)
  const bannerOffset = TILE_SIZE * 3;
  envObjects.push({
    id: id(),
    type: 'decoration',
    x: throneX - bannerOffset,
    y: throneY,
    width: TILE_SIZE,
    height: TILE_SIZE,
    alive: true,
    spriteKey: 'floor_banner',
  });
  envObjects.push({
    id: id(),
    type: 'decoration',
    x: throneX + bannerOffset,
    y: throneY,
    width: TILE_SIZE,
    height: TILE_SIZE,
    alive: true,
    spriteKey: 'floor_banner',
  });

  // Treasure chest at throne position (right-center of hall)
  const chestX = hallX + hallW - TILE_SIZE * 3 + TILE_SIZE / 2;
  const chestY = hallY + Math.floor(hallH / 2 / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2;
  envObjects.push({
    id: id(),
    type: 'decoration',
    x: chestX,
    y: chestY,
    width: TILE_SIZE,
    height: TILE_SIZE,
    alive: true,
    spriteKey: 'chest_full_open_anim_f0',
  });

  // Spawn point: corridor left end center
  const spawnX = CORRIDOR_COL_START * TILE_SIZE + TILE_SIZE / 2;
  const spawnY = Math.floor((CORRIDOR_ROW_START + CORRIDOR_ROW_END) / 2) * TILE_SIZE + TILE_SIZE / 2;

  // Exit: Boss room has no normal exit (Floor 5 → VICTORY on all enemies dead)
  const exitPoint = { x: hallX + hallW / 2, y: hallY + hallH / 2 };

  // Boss position: hall center-right
  const bossX = tileAlign(hallX + hallW * 0.65);
  const bossY = tileAlign(hallY + hallH / 2);

  // Pre-boss items at entrance: health + energy
  const items = [
    { id: `boss_item_1`, x: tileAlign(hallX - TILE_SIZE), y: tileAlign(hallY + hallH / 2 - TILE_SIZE), type: 'health' },
    { id: `boss_item_2`, x: tileAlign(hallX - TILE_SIZE), y: tileAlign(hallY + hallH / 2 + TILE_SIZE), type: 'energy' },
  ];

  const room: DungeonRoom = {
    x: hallX,
    y: hallY,
    width: hallW,
    height: hallH,
    type: 'boss',
  };

  return {
    rooms: [room],
    corridorTiles: [],
    spawnPoint: { x: spawnX, y: spawnY },
    exitPoint,
    collisionGrid,
    envObjects,
    enemies: [
      { type: 'boss', x: bossX, y: bossY, count: 1 },
    ],
    items,
    roomTemplates: [],
  };
}
