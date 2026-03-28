/**
 * Kenney Assets 资源索引
 * CC0 License - www.kenney.nl
 *
 * 资源组织：
 * - Spritesheet: 精灵图合集
 * - Tiles: 单个瓦片图
 * - Tilemap: 整图瓦片
 * - Fonts: 像素字体
 */

// 精灵图路径（使用ES6 import，Vite默认支持PNG导入）
import roguelikeCharSheetPath from './Spritesheet/roguelikeChar_transparent.png';
import roguelikeDungeonSheetPath from './Spritesheet/roguelikeDungeon_transparent.png';
import roguelikeSheetPath from './Spritesheet/roguelikeSheet_transparent.png';

export { roguelikeCharSheetPath, roguelikeDungeonSheetPath, roguelikeSheetPath };

// 瓦片规格
export const TILE_SIZE = 16;
export const TILE_MARGIN = 1;

// Spritesheet宽度（用于计算精灵位置）
export const CHAR_SPRITESHEET_WIDTH = 918;   // roguelikeChar: 918x203
export const DUNGEON_SPRITESHEET_WIDTH = 492; // roguelikeDungeon: 492x305

/**
 * 从spritesheet提取单个精灵的坐标
 */
export function getSpritePosition(
  index: number,
  sheetWidth: number,
  tileSize: number = TILE_SIZE,
  margin: number = TILE_MARGIN
): { x: number; y: number } {
  const spritesPerRow = Math.floor(sheetWidth / (tileSize + margin));
  const row = Math.floor(index / spritesPerRow);
  const col = index % spritesPerRow;
  return {
    x: col * (tileSize + margin),
    y: row * (tileSize + margin)
  };
}

// 角色精灵索引 (roguelikeChar_transparent.png)
export const CharacterSprites = {
  WarriorFront: 0,
  WarriorBack: 1,
  WarriorLeft: 2,
  WarriorRight: 3,
  RangerFront: 4,
  RangerBack: 5,
  RangerLeft: 6,
  RangerRight: 7,
  MageFront: 8,
  MageBack: 9,
  MageLeft: 10,
  MageRight: 11,
  HealerFront: 12,
  HealerBack: 13,
  HealerLeft: 14,
  HealerRight: 15,
} as const;

// 地牢精灵索引 (roguelikeDungeon_transparent.png)
export const DungeonSprites = {
  FloorTopLeft: 0,
  FloorTop: 1,
  FloorTopRight: 2,
  FloorLeft: 3,
  FloorCenter: 4,
  FloorRight: 5,
  FloorBottomLeft: 6,
  FloorBottom: 7,
  FloorBottomRight: 8,
  WallTopLeft: 9,
  WallTop: 10,
  WallTopRight: 11,
  WallSideLeft: 12,
  WallSideRight: 13,
  WallBottomLeft: 14,
  WallBottom: 15,
  WallBottomRight: 16,
  DoorHorizontal: 17,
  DoorVertical: 18,
  DoorTop: 19,
  DoorBottom: 20,
  ChestClosed: 21,
  ChestOpen: 22,
  StairsDown: 23,
  StairsUp: 24,
} as const;

// 敌人类型映射
export const EnemySprites: Record<string, { index: number; sheet: 'char' | 'dungeon' }> = {
  basic: { index: 25, sheet: 'char' },
  fast: { index: 26, sheet: 'char' },
  tank: { index: 27, sheet: 'char' },
  boss: { index: 28, sheet: 'char' },
};

// 道具类型映射
export const ItemSprites: Record<string, { index: number; sheet: 'dungeon' }> = {
  health: { index: 29, sheet: 'dungeon' },
  coin: { index: 31, sheet: 'dungeon' },
  key: { index: 32, sheet: 'dungeon' },
  potion: { index: 33, sheet: 'dungeon' },
  shield: { index: 34, sheet: 'dungeon' },
  bullet: { index: 35, sheet: 'dungeon' },
};

export type CharacterSpriteKey = keyof typeof CharacterSprites;
export type DungeonSpriteKey = keyof typeof DungeonSprites;
