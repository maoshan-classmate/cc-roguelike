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
export const SHEET_SPRITESHEET_WIDTH = 968;   // roguelikeSheet: 968x526

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

// 地牢精灵索引 (roguelikeDungeon_transparent.png)
// 注意：这些常量已迁移到 src/config/ 下使用
// 此处保留文档注释供参考
// 地板: 0-8 | 墙壁: 9-16 | 门: 17-20 | 宝箱: 21-22 | 楼梯: 23-24 | 道具: 29-35
