import { TILE_SIZE, PILLAR_HP, PILLAR_SIZE } from '../../shared/constants';
import type { EnvObjectState, TrapType } from '../../shared/types';

export function shuffleArray<T>(arr: T[], random: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function tileAlign(v: number): number {
  return Math.floor(v / TILE_SIZE) * TILE_SIZE;
}

export function clearAreaAround(grid: boolean[][], col: number, row: number, radius: number = 1): void {
  for (let dr = -radius; dr <= radius + 1; dr++) {
    for (let dc = -radius; dc <= radius + 1; dc++) {
      const r = row + dr;
      const c = col + dc;
      if (r >= 0 && r < grid.length && c >= 0 && c < (grid[0]?.length ?? 0)) {
        grid[r][c] = true;
      }
    }
  }
}

export function generateCornerPillars(
  area: { x: number; y: number; width: number; height: number },
  inset: number,
  idPrefix: string,
  counter: { value: number },
): EnvObjectState[] {
  const makePillar = (px: number, py: number): EnvObjectState => ({
    id: `${idPrefix}_${counter.value++}`,
    type: 'pillar',
    x: px,
    y: py,
    width: PILLAR_SIZE,
    height: PILLAR_SIZE,
    alive: true,
    hp: PILLAR_HP,
    hpMax: PILLAR_HP,
  });

  return [
    makePillar(area.x + inset, area.y + inset),
    makePillar(area.x + area.width - PILLAR_SIZE - inset, area.y + inset),
    makePillar(area.x + inset, area.y + area.height - PILLAR_SIZE - inset),
    makePillar(area.x + area.width - PILLAR_SIZE - inset, area.y + area.height - PILLAR_SIZE - inset),
  ];
}

export function createTrapEnvObject(
  id: string,
  x: number,
  y: number,
  trapType: TrapType,
): EnvObjectState {
  return {
    id,
    type: 'trap',
    x,
    y,
    width: 32,
    height: 32,
    alive: true,
    trapType,
    trapActive: false,
    trapCycleTimer: 0,
    trapOnDuration: 2000,
    trapOffDuration: 3000,
    triggeredEntityIds: [],
  };
}
