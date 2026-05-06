import type { PlayerState, EnemyState } from '../../shared/types';

export function findNearestPlayer(players: PlayerState[], x: number, y: number): PlayerState | null {
  let nearest: PlayerState | null = null;
  let minDist = Infinity;
  for (const p of players) {
    if (!p.alive) continue;
    const dist = Math.hypot(p.x - x, p.y - y);
    if (dist < minDist) {
      minDist = dist;
      nearest = p;
    }
  }
  return nearest;
}

export function findLowestHpAlly(players: PlayerState[], x: number, y: number, range: number, selfId: string): PlayerState | null {
  let target: PlayerState | null = null;
  for (const p of players) {
    if (!p.alive) continue;
    const dist = Math.hypot(p.x - x, p.y - y);
    if (dist > range) continue;
    if (!target || p.hp < target.hp) {
      target = p;
    }
  }
  return target;
}

export function forEachEnemyInRadius(
  enemies: EnemyState[],
  x: number,
  y: number,
  radius: number,
  callback: (enemy: EnemyState, dist: number) => void,
): void {
  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    const dist = Math.hypot(enemy.x - x, enemy.y - y);
    if (dist <= radius) {
      callback(enemy, dist);
    }
  }
}

export function forEachEnemyInArc(
  enemies: EnemyState[],
  x: number,
  y: number,
  angle: number,
  range: number,
  arc: number,
  callback: (enemy: EnemyState) => void,
): void {
  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    const dx = enemy.x - x;
    const dy = enemy.y - y;
    const dist = Math.hypot(dx, dy);
    if (dist > range + 20) continue;

    const enemyAngle = Math.atan2(dy, dx);
    let diff = enemyAngle - angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;

    if (Math.abs(diff) < arc / 2) {
      callback(enemy);
    }
  }
}

export interface MoveDeps {
  isWalkable(x: number, y: number): boolean;
  isWalkableRadius(x: number, y: number, radius: number): boolean;
}

export function moveEntityToward(
  entity: { x: number; y: number },
  targetX: number,
  targetY: number,
  speed: number,
  radius: number,
  deps: MoveDeps,
): boolean {
  const dx = targetX - entity.x;
  const dy = targetY - entity.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return false;

  const dirX = dx / dist;
  const dirY = dy / dist;
  const newX = entity.x + dirX * speed;
  const newY = entity.y + dirY * speed;

  if (deps.isWalkableRadius(newX, newY, radius)) {
    entity.x = newX;
    entity.y = newY;
    return true;
  }

  // Wall-slide: try X only
  if (deps.isWalkableRadius(newX, entity.y, radius)) {
    entity.x = newX;
    return true;
  }

  // Wall-slide: try Y only
  if (deps.isWalkableRadius(entity.x, newY, radius)) {
    entity.y = newY;
    return true;
  }

  // Escape offsets
  const escapeOffsets = [Math.PI / 4, -Math.PI / 4, Math.PI / 2, -Math.PI / 2, Math.PI, 0];
  for (const offset of escapeOffsets) {
    const escapeX = entity.x + Math.cos(Math.atan2(dirY, dirX) + offset) * speed;
    const escapeY = entity.y + Math.sin(Math.atan2(dirY, dirX) + offset) * speed;
    if (deps.isWalkableRadius(escapeX, escapeY, radius)) {
      entity.x = escapeX;
      entity.y = escapeY;
      return true;
    }
  }

  return false;
}
