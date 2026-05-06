import { GAME_CONFIG } from '../config/constants';

export const TWO_PI = Math.PI * 2;

export function clampToDungeon(x: number, y: number): { x: number; y: number } {
  return {
    x: Math.max(20, Math.min(GAME_CONFIG.DUNGEON_WIDTH - 20, x)),
    y: Math.max(20, Math.min(GAME_CONFIG.DUNGEON_HEIGHT - 20, y)),
  };
}

export function normalizeAngleDiff(a: number, b: number): number {
  let diff = a - b;
  while (diff > Math.PI) diff -= TWO_PI;
  while (diff < -Math.PI) diff += TWO_PI;
  return diff;
}
