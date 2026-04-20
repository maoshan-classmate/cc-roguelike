---
description: Canvas 渲染管线规则 — 绘制顺序、精灵渲染规范、像素渲染
globs:
  - "src/pages/GamePage.tsx"
  - "src/config/sprites.ts"
  - "src/components/DungeonBackground.tsx"
  - "src/components/AnimatedSprite.tsx"
  - "src/components/animations/**"
---

# 渲染管线规则

## Canvas 绘制顺序（从底到顶，禁止改变）

1. 背景色 / 网格线
2. 地牢地板（fillRect）
3. 地牢墙壁（fillRect）
4. 出口楼梯（唯一用精灵的地牢物体，`drawDungeonSprite(23)`）
5. 道具（0x72 优先 → Kenney fallback）
6. 敌人（0x72 优先 → Kenney fallback）
7. 子弹/特效
8. 玩家
9. UI 叠加层（血条、名称、皇冠）

## 精灵渲染规范

- 0x72 检测用 `is0x72Sprite()`，禁止 `spriteName !== undefined`
- 动画帧用 `getAnimSprite(spriteName, elapsedMs)`
- 静态精灵（无 `_anim_f` / `_f` 后缀）不追加帧号
- 水平翻转用 `ctx.scale(-1,1)`，禁止 `ctx.rotate(π)`
- 所有 0x72 精灵默认朝右，`flipH=true` 仅在向左移动时

## 精灵命名

- `_anim_f{n}` = 4帧动画
- `_f{n}`（无 `_anim`）= 3帧动画
- 无后缀 = 静态

## 墙壁精灵区分

- `wall_top_*` (atlas y=0) = 墙壁顶部装饰条，不能单独用作墙壁
- `wall_mid/right/left` (atlas y=16) = 墙壁主体，朝向房间的用 `drawWallTileCropped` 裁掉顶部2px

## 像素渲染

- `imageRendering: 'pixelated'`
- 血条/皇冠/箭头统一 `fillRect`
- 3D 立体感：顶部/左侧亮色 + 底部/右侧暗色
