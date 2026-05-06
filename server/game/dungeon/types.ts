import type { TerrainType, EnvObjectState, EnemyType, ItemPickupType, DungeonRoom } from '../../../shared/types';

/** 所有地形生成器的统一输出 */
export interface TerrainData {
  collisionGrid: boolean[][];
  spawnPoint: { x: number; y: number };
  exitPoint: { x: number; y: number };
  envObjects: EnvObjectState[];
  enemySpawns: { type: EnemyType; x: number; y: number; count: number }[];
  itemSpawns: { id: string; x: number; y: number; type: ItemPickupType }[];
  rooms?: DungeonRoom[];
  corridorTiles?: { x: number; y: number }[];
  roomTemplates?: string[];
}

/** 所有地形生成器的统一接口 */
export interface TerrainGenerator {
  readonly type: TerrainType;
  generate(floor: number, seed: number): TerrainData;
}

/** 地形生成器注册表 */
export const TERRAIN_GENERATORS: Partial<Record<TerrainType, TerrainGenerator>> = {};

export function registerTerrain(generator: TerrainGenerator): void {
  TERRAIN_GENERATORS[generator.type] = generator;
}
