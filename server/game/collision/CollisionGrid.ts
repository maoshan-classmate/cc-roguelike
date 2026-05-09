import { TILE_SIZE } from '../../../shared/constants';
import { ENEMY_DEFS } from '../../../shared/enemy-definitions';

export class CollisionGrid {
  private grid: boolean[][] = [];

  setGrid(grid: boolean[][]): void {
    this.grid = grid;
  }

  getGrid(): boolean[][] {
    return this.grid;
  }

  setTile(col: number, row: number, walkable: boolean): void {
    if (this.isEmpty()) return;
    const rows = this.grid.length;
    const cols = this.grid[0]?.length || 0;
    if (row < 0 || row >= rows || col < 0 || col >= cols) return;
    this.grid[row][col] = walkable;
  }

  setGridPartial(tiles: Array<{ col: number; row: number; walkable: boolean }>): void {
    for (const t of tiles) {
      this.setTile(t.col, t.row, t.walkable);
    }
  }

  isEmpty(): boolean {
    return !this.grid || this.grid.length === 0;
  }

  isWalkable(x: number, y: number): boolean {
    if (this.isEmpty()) {
      console.warn('[CollisionGrid] Grid empty, blocking movement');
      return false;
    }
    const col = Math.floor(x / TILE_SIZE);
    const row = Math.floor(y / TILE_SIZE);
    const rows = this.grid.length;
    const cols = this.grid[0]?.length || 0;
    if (row < 0 || row >= rows || col < 0 || col >= cols) return false;
    return this.grid[row][col];
  }

  isWalkableRadius(x: number, y: number, radius: number): boolean {
    return this.isWalkable(x, y)
      && this.isWalkable(x - radius, y - radius)
      && this.isWalkable(x + radius, y - radius)
      && this.isWalkable(x - radius, y + radius)
      && this.isWalkable(x + radius, y + radius);
  }

  hasLineOfSight(x1: number, y1: number, x2: number, y2: number): boolean {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.hypot(dx, dy);
    const steps = Math.ceil(dist / 8);
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const px = x1 + dx * t;
      const py = y1 + dy * t;
      if (!this.isWalkable(px, py)) return false;
    }
    return true;
  }

  separateEnemies(enemies: { x: number; y: number; type: string; alive: boolean }[]): void {
    const separationForce = 0.5;
    for (let i = 0; i < enemies.length; i++) {
      for (let j = i + 1; j < enemies.length; j++) {
        const e1 = enemies[i], e2 = enemies[j];
        const r1 = ENEMY_DEFS[e1.type]?.radius || 16, r2 = ENEMY_DEFS[e2.type]?.radius || 16;
        const minDist = r1 + r2;
        const dx = e2.x - e1.x, dy = e2.y - e1.y;
        const dist = Math.hypot(dx, dy);
        if (dist < minDist) {
          let dirX: number, dirY: number, overlap: number;
          if (dist === 0) {
            // Enemies at same position — apply random separation direction
            const angle = Math.random() * Math.PI * 2;
            dirX = Math.cos(angle);
            dirY = Math.sin(angle);
            overlap = minDist;
          } else {
            dirX = dx / dist;
            dirY = dy / dist;
            overlap = minDist - dist;
          }
          const totalR = r1 + r2;
          const push1 = overlap * (r2 / totalR) * separationForce;
          const push2 = overlap * (r1 / totalR) * separationForce;
          const nx1 = e1.x - dirX * push1, ny1 = e1.y - dirY * push1;
          const nx2 = e2.x + dirX * push2, ny2 = e2.y + dirY * push2;
          if (this.isWalkableRadius(nx1, ny1, r1)) { e1.x = nx1; e1.y = ny1; }
          if (this.isWalkableRadius(nx2, ny2, r2)) { e2.x = nx2; e2.y = ny2; }
        }
      }
    }
  }
}
