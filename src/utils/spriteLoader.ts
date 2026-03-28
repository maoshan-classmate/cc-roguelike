/**
 * 精灵加载器工具
 * 用于加载和管理游戏精灵图
 */

import { TILE_SIZE, TILE_MARGIN } from '../assets/kenney';

// 预加载的精灵图缓存
const imageCache: Map<string, HTMLImageElement> = new Map();

/**
 * 加载图片（带缓存）
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  if (imageCache.has(src)) {
    return Promise.resolve(imageCache.get(src)!);
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      imageCache.set(src, img);
      resolve(img);
    };
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * 预加载所有游戏精灵
 */
export async function preloadSprites(spriteSources: Record<string, string>): Promise<void> {
  const promises = Object.entries(spriteSources).map(([key, src]) =>
    loadImage(src).then(img => ({ key, img }))
  );
  await Promise.all(promises);
}

/**
 * 根据索引从spritesheet绘制精灵
 * @param ctx Canvas 2D上下文
 * @param img 精灵图
 * @param index 精灵索引（从0开始）
 * @param dx 目标x坐标
 * @param dy 目标y坐标
 * @param dw 目标宽度（可选，默认16）
 * @param dh 目标高度（可选，默认16）
 */
export function drawSprite(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  index: number,
  dx: number,
  dy: number,
  dw: number = TILE_SIZE,
  dh: number = TILE_SIZE
): void {
  const spritesPerRow = Math.floor(img.width / (TILE_SIZE + TILE_MARGIN));
  const row = Math.floor(index / spritesPerRow);
  const col = index % spritesPerRow;
  const sx = col * (TILE_SIZE + TILE_MARGIN);
  const sy = row * (TILE_SIZE + TILE_MARGIN);

  ctx.drawImage(img, sx, sy, TILE_SIZE, TILE_SIZE, dx, dy, dw, dh);
}

/**
 * 根据网格坐标绘制精灵（居中）
 */
export function drawSpriteAt(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  index: number,
  x: number,
  y: number,
  size: number = TILE_SIZE
): void {
  const halfSize = size / 2;
  drawSprite(ctx, img, index, x - halfSize, y - halfSize, size, size);
}

/**
 * 创建空精灵图（用于调试或占位）
 */
export function createPlaceholderSprite(
  color: string,
  size: number = TILE_SIZE
): HTMLImageElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, size, size);
  const img = new Image();
  img.src = canvas.toDataURL();
  return img;
}
