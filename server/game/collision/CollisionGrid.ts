import { TILE_SIZE, ENEMY_RADIUS } from '../../../shared/constants';

export class CollisionGrid {
  private grid: boolean[][] = [];

  setGrid(grid: boolean[][]): void {
    this.grid = grid;
  }

  getGrid(): boolean[][] {
    return this.grid;
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

  separateEnemies(enemies: { x: number; y: number; type: string; alive: boolean }[]): void {
    const separationForce = 0.5;
    for (let i = 0; i < enemies.length; i++) {
      for (let j = i + 1; j < enemies.length; j++) {
        const e1 = enemies[i], e2 = enemies[j];
        const r1 = ENEMY_RADIUS[e1.type] || 16, r2 = ENEMY_RADIUS[e2.type] || 16;
        const minDist = r1 + r2;
        const dx = e2.x - e1.x, dy = e2.y - e1.y;
        const dist = Math.hypot(dx, dy);
        if (dist < minDist && dist > 0) {
          const overlap = minDist - dist;
          const dirX = dx / dist, dirY = dy / dist;
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
