import {
  MAZE_CELLS_X,
  MAZE_CELLS_Y,
  MAZE_EXTRA_LOOPS_MIN,
  MAZE_EXTRA_LOOPS_MAX,
  MAZE_COMBAT_POCKETS_MIN,
  MAZE_COMBAT_POCKETS_MAX,
  MAZE_PATROL_ENEMIES_MIN,
  MAZE_PATROL_ENEMIES_MAX,
  TILE_SIZE,
  PILLAR_HP,
  PILLAR_SIZE,
  TRAP_TYPES,
  TRAP_DETECTION_RADIUS,
} from '../../../shared/constants';
import type { EnvObjectState, DungeonData, DungeonRoom } from '../../../shared/types';
import { MathUtils } from '../../utils/MathUtils';

// Grid dimensions (tile coordinates)
const COLS = 32;
const ROWS = 24;

// Entrance/exit tile positions (west center / east center)
const ENTRANCE_COL = 0;
const ENTRANCE_ROW = 11; // rows 11-12
const EXIT_COL = 30;     // cols 30-31
const EXIT_ROW = 11;     // rows 11-12

/**
 * Generate a 32x24 tile maze using recursive backtracking.
 *
 * Returns a DungeonData compatible with the existing dungeon system.
 * The maze is represented entirely as a collision grid + env objects.
 */
export function generateMaze(floor: number, seed: number): DungeonData {
  const random = MathUtils.seededRandom(seed);
  let nextEnvId = 1;
  const envId = (): string => `maze_obj_${nextEnvId++}`;

  // ── Step 1: Initialize all-false (wall) grid ──
  const grid: boolean[][] = Array.from({ length: ROWS }, () => Array(COLS).fill(false));

  // ── Step 2: Recursive backtracking maze ──
  // Maze cells: 16x12 (MAZE_CELLS_X x MAZE_CELLS_Y)
  // Cell (cx,cy) maps to tile (cx*2+1, cy*2+1)
  // Wall between cell (cx,cy) and (cx+1,cy) is at tile (cx*2+2, cy*2+1)
  // Wall between cell (cx,cy) and (cx,cy+1) is at tile (cx*2+1, cy*2+2)
  const visited: boolean[][] = Array.from({ length: MAZE_CELLS_Y }, () =>
    Array(MAZE_CELLS_X).fill(false),
  );

  // Carve entrance (cell 0,0) and start backtracking from there
  carveCell(grid, 0, 0);
  visited[0][0] = true;
  backtrack(0, 0, visited, grid, random);

  // ── Step 3: Carve entrance and exit corridors ──
  // Entrance: west center (col 0-1, row 11-12) → must connect to nearest maze cell
  // The entrance cell in maze coords is (0, 5) which maps to tile (1, 11)
  // Carve tiles col 0-1, rows 11-12
  grid[11][0] = true;
  grid[11][1] = true;
  grid[12][0] = true;
  grid[12][1] = true;

  // Exit: east center (col 30-31, row 11-12) → must connect to nearest maze cell
  // The exit cell in maze coords is (15, 5) which maps to tile (31, 11)
  // Carve tiles col 30-31, rows 11-12
  grid[11][30] = true;
  grid[11][31] = true;
  grid[12][30] = true;
  grid[12][31] = true;

  // Connect entrance/exit to their adjacent maze cells
  // Entrance corridor connects to cell (0, 5) at tile (1, 11)
  // If cell (0,5) is carved but the wall between entrance area and it is not, ensure path
  // The entrance opens col 0-1, row 11-12. Cell(0,5)=tile(1,11) should already be carved by backtracking.
  // Exit corridor connects to cell (15, 5) at tile (31, 11)
  // Cell(15,5)=tile(31,11) should already be carved.

  // ── Step 4: Remove random walls to create loops ──
  const loopCount = MAZE_EXTRA_LOOPS_MIN + Math.floor(random() * (MAZE_EXTRA_LOOPS_MAX - MAZE_EXTRA_LOOPS_MIN + 1));
  removeRandomWalls(grid, loopCount, random);

  // ── Step 5: BFS shortest path entrance→exit, widen to 2 tiles ──
  const entranceTile = { col: 0, row: 11 };
  const exitTile = { col: 31, row: 11 };
  const shortestPath = bfsShortestPath(grid, entranceTile, exitTile);
  if (shortestPath.length > 0) {
    widenPath(grid, shortestPath);
  }

  // ── Step 6: Find dead ends and create Combat Pockets ──
  const deadEnds = findDeadEndCells(visited, grid, random);
  const combatPockets = createCombatPockets(grid, deadEnds, random);

  // ── Step 7: Dead-End Rewards ──
  const envObjects: EnvObjectState[] = [];
  const deadEndsWithRewards = placeDeadEndRewards(grid, deadEnds, combatPockets, envObjects, envId, random);

  // ── Step 8: Place Combat Pocket enemies ──
  // Enemies are returned as env objects? No — enemies are spawned by GameRoom.
  // We return the grid + env objects. GameRoom reads the dungeon data and spawns enemies.
  // For maze enemies, we'll use the room structure to communicate enemy spawn info.
  // Actually, the spec says to place enemies. DungeonData doesn't have an enemies field
  // in the shared types — that's in the DungeonGenerator's local interface.
  // We use rooms to encode combat pocket locations. GameRoom will read rooms to spawn enemies.

  // Build rooms list for combat pocket enemy placement info
  const rooms: DungeonRoom[] = [];

  // Combat pocket rooms
  for (let i = 0; i < combatPockets.length; i++) {
    const pocket = combatPockets[i];
    rooms.push({
      x: pocket.col * TILE_SIZE,
      y: pocket.row * TILE_SIZE,
      width: 4 * TILE_SIZE,
      height: 4 * TILE_SIZE,
      type: 'combat_pocket',
    });
  }

  // Patrol enemy spawn points (corridor positions away from pockets and main path)
  const patrolCount = MAZE_PATROL_ENEMIES_MIN +
    Math.floor(random() * (MAZE_PATROL_ENEMIES_MAX - MAZE_PATROL_ENEMIES_MIN + 1));
  const patrolPoints = findPatrolSpawnPoints(grid, combatPockets, shortestPath, patrolCount, random);

  for (let i = 0; i < patrolPoints.length; i++) {
    const pt = patrolPoints[i];
    rooms.push({
      x: pt.col * TILE_SIZE,
      y: pt.row * TILE_SIZE,
      width: TILE_SIZE,
      height: TILE_SIZE,
      type: 'maze_patrol',
    });
  }

  // ── Step 9: Compute spawn and exit pixel coordinates ──
  const spawnPoint = {
    x: ENTRANCE_COL * TILE_SIZE + TILE_SIZE / 2,
    y: ENTRANCE_ROW * TILE_SIZE + TILE_SIZE / 2,
  };
  const exitPoint = {
    x: EXIT_COL * TILE_SIZE + TILE_SIZE + TILE_SIZE / 2,
    y: EXIT_ROW * TILE_SIZE + TILE_SIZE / 2,
  };

  // ── Step 10: Force-clear 3x3 around spawn and exit ──
  forceClearArea(grid, 0, 11);
  forceClearArea(grid, 30, 11);

  // ── Step 11: Validate ──
  const walkableCount = grid.flat().filter(Boolean).length;
  const totalCount = COLS * ROWS;
  if (walkableCount === 0) {
    console.error('[MazeGenerator] FATAL: Collision grid has 0 walkable tiles!');
  } else {
    console.log(
      `[MazeGenerator] Grid: ${walkableCount}/${totalCount} tiles walkable (${((walkableCount / totalCount) * 100).toFixed(1)}%)`,
    );
  }

  // Verify path exists
  const verifyPath = bfsShortestPath(grid, entranceTile, exitTile);
  if (verifyPath.length === 0) {
    console.error('[MazeGenerator] FATAL: No path from entrance to exit!');
  }

  // Corridor tiles (all walkable tiles as pixel coords)
  const corridorTiles: { x: number; y: number }[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c]) {
        corridorTiles.push({
          x: c * TILE_SIZE + TILE_SIZE / 2,
          y: r * TILE_SIZE + TILE_SIZE / 2,
        });
      }
    }
  }

  return {
    rooms,
    corridorTiles,
    spawnPoint,
    exitPoint,
    collisionGrid: grid,
    envObjects,
  };
}

// ─────────────────────────────────────────────────
// Recursive Backtracking
// ─────────────────────────────────────────────────

const DIRS = [
  { dx: 0, dy: -1 }, // up
  { dx: 0, dy: 1 },  // down
  { dx: -1, dy: 0 }, // left
  { dx: 1, dy: 0 },  // right
];

function backtrack(
  cx: number,
  cy: number,
  visited: boolean[][],
  grid: boolean[][],
  random: () => number,
): void {
  const directions = shuffleArray([...DIRS], random);

  for (const dir of directions) {
    const nx = cx + dir.dx;
    const ny = cy + dir.dy;

    if (nx < 0 || nx >= MAZE_CELLS_X || ny < 0 || ny >= MAZE_CELLS_Y) continue;
    if (visited[ny][nx]) continue;

    // Carve wall between current cell and neighbor
    const wallCol = cx * 2 + 1 + dir.dx;
    const wallRow = cy * 2 + 1 + dir.dy;
    if (wallRow >= 0 && wallRow < ROWS && wallCol >= 0 && wallCol < COLS) {
      grid[wallRow][wallCol] = true;
    }

    // Carve neighbor cell
    carveCell(grid, nx, ny);
    visited[ny][nx] = true;

    backtrack(nx, ny, visited, grid, random);
  }
}

function carveCell(grid: boolean[][], cx: number, cy: number): void {
  const tileCol = cx * 2 + 1;
  const tileRow = cy * 2 + 1;
  if (tileRow >= 0 && tileRow < ROWS && tileCol >= 0 && tileCol < COLS) {
    grid[tileRow][tileCol] = true;
  }
}

// ─────────────────────────────────────────────────
// Remove Random Walls (Create Loops)
// ─────────────────────────────────────────────────

function removeRandomWalls(grid: boolean[][], count: number, random: () => number): void {
  // Collect all internal wall tiles (not on border) that are currently walls
  const candidates: { col: number; row: number }[] = [];

  for (let r = 1; r < ROWS - 1; r++) {
    for (let c = 1; c < COLS - 1; c++) {
      if (grid[r][c]) continue; // already walkable

      // Check if this wall separates two walkable tiles (either horizontally or vertically)
      const horizOk =
        c > 0 && c < COLS - 1 && grid[r][c - 1] && grid[r][c + 1];
      const vertOk =
        r > 0 && r < ROWS - 1 && grid[r - 1][c] && grid[r + 1][c];

      if (horizOk || vertOk) {
        candidates.push({ col: c, row: r });
      }
    }
  }

  shuffleArray(candidates, random);

  const toRemove = Math.min(count, candidates.length);
  for (let i = 0; i < toRemove; i++) {
    const { col, row } = candidates[i];
    grid[row][col] = true;
  }
}

// ─────────────────────────────────────────────────
// BFS Shortest Path
// ─────────────────────────────────────────────────

function bfsShortestPath(
  grid: boolean[][],
  start: { col: number; row: number },
  end: { col: number; row: number },
): { col: number; row: number }[] {
  const key = (c: number, r: number) => `${c},${r}`;
  const visited = new Set<string>();
  const parent = new Map<string, { col: number; row: number } | null>();
  const queue: { col: number; row: number }[] = [start];

  visited.add(key(start.col, start.row));
  parent.set(key(start.col, start.row), null);

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (current.col === end.col && current.row === end.row) {
      // Reconstruct path
      const path: { col: number; row: number }[] = [];
      let k: string | undefined = key(end.col, end.row);
      while (k !== undefined) {
        const node = parent.get(k);
        if (!node) {
          // This is the start node
          const [sc, sr] = k.split(',').map(Number);
          path.unshift({ col: sc, row: sr });
          break;
        }
        const [nc, nr] = k.split(',').map(Number);
        path.unshift({ col: nc, row: nr });
        k = key(node.col, node.row);
      }
      return path;
    }

    for (const dir of DIRS) {
      const nc = current.col + dir.dx;
      const nr = current.row + dir.dy;

      if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) continue;
      if (!grid[nr][nc]) continue;

      const nk = key(nc, nr);
      if (visited.has(nk)) continue;

      visited.add(nk);
      parent.set(nk, current);
      queue.push({ col: nc, row: nr });
    }
  }

  return []; // No path found
}

// ─────────────────────────────────────────────────
// Widen Path to 2 Tiles
// ─────────────────────────────────────────────────

function widenPath(grid: boolean[][], path: { col: number; row: number }[]): void {
  for (const tile of path) {
    // For each tile on the path, ensure it and one adjacent tile are walkable
    grid[tile.row][tile.col] = true;

    // Try to widen: prefer widening perpendicular to movement direction
    // Widen right/down as default
    if (tile.col + 1 < COLS) {
      grid[tile.row][tile.col + 1] = true;
    }
    if (tile.row + 1 < ROWS) {
      grid[tile.row + 1][tile.col] = true;
    }
    // Also ensure the diagonal is open for smooth movement
    if (tile.col + 1 < COLS && tile.row + 1 < ROWS) {
      grid[tile.row + 1][tile.col + 1] = true;
    }
  }
}

// ─────────────────────────────────────────────────
// Find Dead-End Cells
// ─────────────────────────────────────────────────

function findDeadEndCells(
  mazeVisited: boolean[][],
  grid: boolean[][],
  random: () => number,
): { cx: number; cy: number; tileCol: number; tileRow: number }[] {
  const deadEnds: { cx: number; cy: number; tileCol: number; tileRow: number }[] = [];

  for (let cy = 0; cy < MAZE_CELLS_Y; cy++) {
    for (let cx = 0; cx < MAZE_CELLS_X; cx++) {
      if (!mazeVisited[cy][cx]) continue;

      // Count how many adjacent cells are connected (have open walls)
      let openSides = 0;
      for (const dir of DIRS) {
        const nx = cx + dir.dx;
        const ny = cy + dir.dy;
        if (nx < 0 || nx >= MAZE_CELLS_X || ny < 0 || ny >= MAZE_CELLS_Y) continue;

        // Check if the wall between this cell and neighbor is carved
        const wallCol = cx * 2 + 1 + dir.dx;
        const wallRow = cy * 2 + 1 + dir.dy;
        if (wallRow >= 0 && wallRow < ROWS && wallCol >= 0 && wallCol < COLS && grid[wallRow][wallCol]) {
          openSides++;
        }
      }

      // Dead end = only 1 open side (one way in, no way out beyond that)
      if (openSides <= 1) {
        deadEnds.push({
          cx,
          cy,
          tileCol: cx * 2 + 1,
          tileRow: cy * 2 + 1,
        });
      }
    }
  }

  shuffleArray(deadEnds, random);
  return deadEnds;
}

// ─────────────────────────────────────────────────
// Combat Pockets
// ─────────────────────────────────────────────────

interface CombatPocket {
  col: number;
  row: number;
  enemyCount: number;
}

function createCombatPockets(
  grid: boolean[][],
  deadEnds: { cx: number; cy: number; tileCol: number; tileRow: number }[],
  random: () => number,
): CombatPocket[] {
  const pocketCount =
    MAZE_COMBAT_POCKETS_MIN +
    Math.floor(random() * (MAZE_COMBAT_POCKETS_MAX - MAZE_COMBAT_POCKETS_MIN + 1));

  const pockets: CombatPocket[] = [];
  const used = new Set<string>();

  for (let i = 0; i < deadEnds.length && pockets.length < pocketCount; i++) {
    const de = deadEnds[i];

    // Top-left of the 4x4 pocket region centered on the dead-end cell
    // The cell tile is at (tileCol, tileRow), pocket spans 4x4 tiles from there
    const pocketCol = Math.max(0, Math.min(COLS - 4, de.tileCol - 1));
    const pocketRow = Math.max(0, Math.min(ROWS - 4, de.tileRow - 1));

    const pocketKey = `${pocketCol},${pocketRow}`;
    if (used.has(pocketKey)) continue;

    // Check no overlap with existing pockets
    let overlaps = false;
    for (const existing of pockets) {
      if (
        pocketCol < existing.col + 4 + 2 &&
        pocketCol + 4 + 2 > existing.col &&
        pocketRow < existing.row + 4 + 2 &&
        pocketRow + 4 + 2 > existing.row
      ) {
        overlaps = true;
        break;
      }
    }
    if (overlaps) continue;

    // Carve the 4x4 pocket
    for (let r = pocketRow; r < pocketRow + 4 && r < ROWS; r++) {
      for (let c = pocketCol; c < pocketCol + 4 && c < COLS; c++) {
        grid[r][c] = true;
      }
    }

    // Ensure connectivity: carve a corridor from the dead-end cell to the pocket
    const cellCol = de.tileCol;
    const cellRow = de.tileRow;
    // Carve a 1-tile corridor from cell to pocket center
    const pocketCenterCol = pocketCol + 2;
    const pocketCenterRow = pocketRow + 2;
    carveCorridor(grid, cellCol, cellRow, pocketCenterCol, pocketCenterRow);

    const enemyCount = random() < 0.5 ? 1 : 2;
    pockets.push({ col: pocketCol, row: pocketRow, enemyCount });
    used.add(pocketKey);
  }

  return pockets;
}

/**
 * Carve a simple L-shaped corridor between two tile positions.
 */
function carveCorridor(
  grid: boolean[][],
  fromCol: number,
  fromRow: number,
  toCol: number,
  toRow: number,
): void {
  let c = fromCol;
  let r = fromRow;

  // Move horizontally first
  while (c !== toCol) {
    if (r >= 0 && r < ROWS && c >= 0 && c < COLS) grid[r][c] = true;
    c += c < toCol ? 1 : -1;
  }
  // Then move vertically
  while (r !== toRow) {
    if (r >= 0 && r < ROWS && c >= 0 && c < COLS) grid[r][c] = true;
    r += r < toRow ? 1 : -1;
  }
  // Ensure destination
  if (r >= 0 && r < ROWS && c >= 0 && c < COLS) grid[r][c] = true;
}

// ─────────────────────────────────────────────────
// Dead-End Rewards
// ─────────────────────────────────────────────────

function placeDeadEndRewards(
  grid: boolean[][],
  deadEnds: { cx: number; cy: number; tileCol: number; tileRow: number }[],
  combatPockets: CombatPocket[],
  envObjects: EnvObjectState[],
  envId: () => string,
  random: () => number,
): void {
  // Determine which dead-ends are part of combat pockets (skip those)
  const pocketTiles = new Set<string>();
  for (const pocket of combatPockets) {
    for (let r = pocket.row; r < pocket.row + 4; r++) {
      for (let c = pocket.col; c < pocket.col + 4; c++) {
        pocketTiles.add(`${c},${r}`);
      }
    }
  }

  for (const de of deadEnds) {
    // Skip dead-ends inside combat pockets
    if (pocketTiles.has(`${de.tileCol},${de.tileRow}`)) continue;

    const roll = random();

    if (roll < 0.6) {
      // 60% item (health / energy / coin)
      const itemRoll = random();
      const spriteKey =
        itemRoll < 0.33 ? 'flask_big_red' : itemRoll < 0.66 ? 'flask_big_blue' : 'coin_pile';

      envObjects.push({
        id: envId(),
        type: 'decoration',
        x: de.tileCol * TILE_SIZE + TILE_SIZE / 2,
        y: de.tileRow * TILE_SIZE + TILE_SIZE / 2,
        width: TILE_SIZE,
        height: TILE_SIZE,
        alive: true,
        spriteKey,
      });
    } else if (roll < 0.8) {
      // 20% trap (spike 60% / fire 30% / slow 10%)
      const trapRoll = random();
      const trapType: 'spike' | 'fire' | 'slow' =
        trapRoll < 0.6 ? 'spike' : trapRoll < 0.9 ? 'fire' : 'slow';
      const timings = TRAP_TYPES[trapType];

      envObjects.push({
        id: envId(),
        type: 'trap',
        x: de.tileCol * TILE_SIZE + TILE_SIZE / 2,
        y: de.tileRow * TILE_SIZE + TILE_SIZE / 2,
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
    }
    // 20% empty — do nothing
  }
}

// ─────────────────────────────────────────────────
// Patrol Enemy Spawn Points
// ─────────────────────────────────────────────────

function findPatrolSpawnPoints(
  grid: boolean[][],
  combatPockets: CombatPocket[],
  mainPath: { col: number; row: number }[],
  count: number,
  random: () => number,
): { col: number; row: number }[] {
  // Build exclusion sets
  const pocketTiles = new Set<string>();
  for (const pocket of combatPockets) {
    for (let r = pocket.row; r < pocket.row + 4; r++) {
      for (let c = pocket.col; c < pocket.col + 4; c++) {
        pocketTiles.add(`${c},${r}`);
      }
    }
  }

  const pathTiles = new Set<string>();
  for (const t of mainPath) {
    pathTiles.add(`${t.col},${t.row}`);
  }

  // Collect candidate corridor positions (walkable tiles not in pockets or main path)
  const candidates: { col: number; row: number }[] = [];
  for (let r = 1; r < ROWS - 1; r++) {
    for (let c = 1; c < COLS - 1; c++) {
      if (!grid[r][c]) continue;
      if (pocketTiles.has(`${c},${r}`)) continue;
      if (pathTiles.has(`${c},${r}`)) continue;

      // Ensure not too close to entrance/exit
      if ((c <= 2 && r >= 10 && r <= 13) || (c >= 29 && r >= 10 && r <= 13)) continue;

      candidates.push({ col: c, row: r });
    }
  }

  shuffleArray(candidates, random);

  // Pick positions with minimum spacing of 4 tiles
  const result: { col: number; row: number }[] = [];
  for (const candidate of candidates) {
    if (result.length >= count) break;

    const tooClose = result.some(
      (p) =>
        Math.abs(p.col - candidate.col) + Math.abs(p.row - candidate.row) < 4,
    );
    if (tooClose) continue;

    result.push(candidate);
  }

  return result;
}

// ─────────────────────────────────────────────────
// Utility
// ─────────────────────────────────────────────────

function shuffleArray<T>(arr: T[], random: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function forceClearArea(grid: boolean[][], col: number, row: number): void {
  for (let dr = -1; dr <= 2; dr++) {
    for (let dc = -1; dc <= 2; dc++) {
      const r = row + dr;
      const c = col + dc;
      if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
        grid[r][c] = true;
      }
    }
  }
}
