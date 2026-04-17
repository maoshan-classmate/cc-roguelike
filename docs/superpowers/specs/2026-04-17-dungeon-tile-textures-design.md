# Dungeon Tile Textures — Design Spec

**Date**: 2026-04-17
**Status**: Draft → Approved
**Scope**: 游戏副本内地板/墙壁从纯色 fillRect 升级为精灵贴图渲染

---

## 1. Problem

登录页使用 `DungeonBackground` 组件从 0x72 atlas 绘制精美瓷砖贴图（8 种地板变体 + 3D 墙壁 + 旗帜/柱子/宝箱装饰），但游戏副本内仍用纯色 `fillRect`（地板 `#3A2E2C` + 墙壁 `#5C4A3A`），视觉断裂明显，沉浸感缺失。

## 2. Goal

游戏副本内地牢渲染使用与登录页一致的精灵贴图，同时添加伪随机微装饰提升沉浸感，通过离屏 Canvas 缓存保证 60fps 零性能损耗。

## 3. Architecture

### 3.1 新建共享模块

**文件**: `src/utils/dungeonTileRenderer.ts`

从 `DungeonBackground.tsx` 提取并增强：

```
dungeonTileRenderer.ts
├── drawTile(ctx, atlas, spriteName, col, row)     — 从 DungeonBackground 提取
├── renderDungeonTiles(ctx, grid, atlas, seed)      — collisionGrid → 精灵贴图 + 微装饰
├── renderDungeonFromRooms(ctx, rooms, corridorTiles, atlas) — rooms 模式备用
└── drawMicroDecoration(ctx, atlas, col, row, seed) — 伪随机微装饰
```

### 3.2 重构 DungeonBackground

`src/components/DungeonBackground.tsx` 改为调用 `dungeonTileRenderer.ts` 的 `drawTile()`，删除本地重复逻辑。

### 3.3 重构 useGameRenderer

`src/hooks/useGameRenderer.ts` 的三条渲染路径中：

| 路径 | 改动 |
|------|------|
| collisionGrid 模式（主力） | 离屏缓存 + `renderDungeonTiles()` |
| rooms 模式（备用） | 离屏缓存 + `renderDungeonFromRooms()` |
| 空网格 fallback | 不变 |

## 4. Rendering Logic

### 4.1 地板

每个 `grid[row][col] === true` 的格子：
- 变体选择: `floor_1`~`floor_8`，公式 `(row * 7 + col * 3) % 8`
- 绘制: `ctx.drawImage(atlas, entry.x, entry.y, 16, 16, col*32, row*32, 32, 32)`
- 像素风格: `ctx.imageSmoothingEnabled = false`

### 4.2 墙壁

每个 `grid[row][col] === false` 的格子：

**判断逻辑**（按优先级）：
1. 是否邻接地板格（上下左右任一为 true）
2. 不邻接地板 → 跳过（背景色 `#1A1210` 自然填充）
3. 邻接地板 → 根据相邻方向选择贴图

**贴图选择规则**：
```
邻接上方地板 → wall_edge_top_left / wall_edge_top_right（根据左右邻接判断）
邻接左方地板 → wall_edge_left
邻接右方地板 → wall_edge_right
邻接下方地板 → wall_edge_bottom_left / wall_edge_bottom_right
仅邻接上方 + 左方 → wall_edge_mid_left
仅邻接上方 + 右方 → wall_edge_mid_right
L 型角落 → wall_edge_tshape_*
无方向性邻接 → wall_mid
```

简化实现：先绘制 `wall_mid` 作为基底，再在地板邻接边缘叠加 `wall_edge_*` 贴图。这样只需要处理边缘情况，不需要复杂的方向判断矩阵。

### 4.3 微装饰

在地板格子上，约 8% 概率叠加微装饰。种子 `seed = row * 31 + col * 17`：

| seed % 范围 | 装饰类型 | 实现方式 |
|-------------|---------|---------|
| 0-1 | 骷髅头 | `skull` 精灵，alpha 0.6 |
| 2-3 | 裂缝/坑洞 | `hole` 精灵，alpha 0.7 |
| 4-5 | 黏液 | `wall_goo` 精灵，alpha 0.5，旋转 180° |
| 6-7 | 血迹 | Canvas 半透明暗红椭圆，alpha 0.15 |
| 8+ | 无装饰 | — |

规则：
- 出口楼梯格（`exitPoint`）不叠加装饰
- 装饰在离屏缓存阶段一次性生成，运行时零开销

### 4.4 暗角效果

离屏缓存渲染完成后，叠加径向渐变暗角（同登录页 `DungeonBackground` 的 vignette），`rgba(10,5,21,0.4)`。

## 5. Offscreen Cache

```typescript
interface DungeonCache {
  canvas: HTMLCanvasElement
  gridKey: string  // JSON.stringify(collisionGrid) 的 hash
}

// 在 useGameRenderer 内
const cacheRef = useRef<DungeonCache | null>(null)

function getOrBuildCache(grid, atlas): HTMLCanvasElement {
  const key = gridToKey(grid)
  if (cacheRef.current && cacheRef.current.gridKey === key) {
    return cacheRef.current.canvas
  }
  const offscreen = document.createElement('canvas')
  offscreen.width = grid[0].length * 32
  offscreen.height = grid.length * 32
  const ctx = offscreen.getContext('2d')!
  ctx.imageSmoothingEnabled = false
  renderDungeonTiles(ctx, grid, atlas, 42)
  cacheRef.current = { canvas: offscreen, gridKey: key }
  return offscreen
}
```

缓存失效条件：`dungeon.collisionGrid` 引用变化时（新楼层/新房间）。

## 6. Files Changed

| File | Action | Detail |
|------|--------|--------|
| `src/utils/dungeonTileRenderer.ts` | **NEW** | 共享贴图渲染模块 |
| `src/components/DungeonBackground.tsx` | **REFACTOR** | 调用共享模块的 drawTile |
| `src/hooks/useGameRenderer.ts` | **REFACTOR** | 离屏缓存 + 调用共享模块 |
| `src/assets/0x72/spriteIndex.ts` | 不变 | 已有所需全部精灵 |

## 7. Validation

1. `npx tsc --noEmit` — 零 error
2. 登录页视觉无回归 — `DungeonBackground` 渲染结果不变
3. 游戏内副本地板显示 `floor_1`~`floor_8` 变体贴图
4. 游戏内墙壁显示 `wall_mid` + `wall_edge_*` 贴图
5. 微装饰可见（骷髅头、裂缝、黏液、血迹）
6. 帧率不低于 60fps（离屏缓存保证）
7. Playwright E2E 流程通过
