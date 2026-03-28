/**
 * 游戏资源图片导出
 * 基于Penpot设计系统创建的像素风格资源
 */

// 玩家角色
import warriorSvg from './characters/player-warrior.svg';
import rangerSvg from './characters/player-ranger.svg';
import mageSvg from './characters/player-mage.svg';
import healerSvg from './characters/player-healer.svg';

// 敌人
import basicSvg from './enemies/enemy-basic.svg';
import fastSvg from './enemies/enemy-fast.svg';
import tankSvg from './enemies/enemy-tank.svg';
import bossSvg from './enemies/enemy-boss.svg';

// 道具
import healthSvg from './items/item-health.svg';
import coinSvg from './items/item-coin.svg';
import bulletSvg from './items/item-bullet.svg';
import keySvg from './items/item-key.svg';
import shieldSvg from './items/item-shield.svg';
import potionSvg from './items/item-potion.svg';

// 地牢瓦片
import floorSvg from './tiles/tile-floor.svg';
import wallSvg from './tiles/tile-wall.svg';
import doorSvg from './tiles/tile-door.svg';
import chestSvg from './tiles/object-chest.svg';

export const PlayerImages = {
  warrior: warriorSvg,
  ranger: rangerSvg,
  mage: mageSvg,
  healer: healerSvg,
} as const;

export const EnemyImages = {
  basic: basicSvg,
  fast: fastSvg,
  tank: tankSvg,
  boss: bossSvg,
} as const;

export const ItemImages = {
  health: healthSvg,
  coin: coinSvg,
  bullet: bulletSvg,
  key: keySvg,
  shield: shieldSvg,
  potion: potionSvg,
} as const;

export const TileImages = {
  floor: floorSvg,
  wall: wallSvg,
  door: doorSvg,
  chest: chestSvg,
} as const;

export type PlayerType = keyof typeof PlayerImages;
export type EnemyType = keyof typeof EnemyImages;
export type ItemType = keyof typeof ItemImages;
export type TileType = keyof typeof TileImages;
