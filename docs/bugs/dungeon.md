# BUG — 地牢生成

## 1. DungeonGenerator 初始化错误 ✅ 已修复
- **问题**：`random` 属性没有初始化就使用
- **修复**：添加确定赋值断言 `random!`

## 2. 玩家被锁死在墙内 ✅ 已修复 (2026-03-28)
- **修复**：BSP深度3+最小叶子140px+走廊加宽+出生点3x3清除

## 3. 走廊太窄 ✅ 已修复 (2026-03-28)
- **问题**：collisionPadding=1 导致走廊宽度不足
- **修复**：走廊宽度调整为 2-3 tiles

## 4. 走廊不可见 ✅ 已修复 (2026-03-29)
- **问题**：服务端有走廊数据但客户端不渲染
- **修复**：添加 `corridorTiles` 协议，服务端生成并发送给客户端

## 5. 墙壁/地板不对齐 ✅ 已修复 (2026-03-29)
- **问题**：精灵图地板(0-8)和墙壁(9-16)边框重叠导致接缝
- **修复**：改用 `fillRect` 像素风格绘制地板和墙壁

## 6. 背景网格消失 ✅ 已修复 (2026-03-29)
- **问题**：开发时需要网格辅助但精灵加载后不显示
- **修复**：添加 `import.meta.env.DEV` 网格叠加层

## 7. Boss房间2x2旗帜范围内有其他装饰物 🔴 待修复
- **问题**：Boss房间四角2x2柱子区域（floor_banner）内出现了骷髅头等micro-decorations，视觉上与旗帜重叠
- **根因**：`drawMicroDecorations` 的 `excludeRects` 参数在 Boss 房间渲染路径中未正确传入，或 pillar 位置计算与 excludeRects 不匹配
- **相关文件**：`server/game/dungeon/BossArenaGenerator.ts`（pillarPositions）、`src/utils/dungeonTileRenderer.ts`（drawMicroDecorations excludeRects 逻辑）
- **发现日期**：2026-05-06

## 8. Boss房间没有出口楼梯贴图 🔴 待修复
- **问题**：Floor 5 Boss房间没有 `floor_stairs` 出口贴图，玩家清完怪后无法进入下一层，卡关
- **根因**：BossArenaGenerator 的 `exitPoint` 设在房间中心（与boss位置重叠），且 Boss 房间有特殊的"全灭即胜利"逻辑，但客户端仍需出口贴图或胜利跳转
- **相关文件**：`server/game/dungeon/BossArenaGenerator.ts`（exitPoint）、`server/game/GameRoom.ts`（Boss 全灭判定）、`src/utils/dungeonTileRenderer.ts`（exit 渲染）
- **发现日期**：2026-05-06

## 9. 迷宫关卡无法进入下一层 🔴 待修复
- **问题**：迷宫关卡设置有问题，没有正常的路可以进入下一层
- **根因**：待排查 — 可能是 exitPoint 位置不可达、迷宫通道生成错误、或 fog of war 遮住了出口
- **相关文件**：`server/game/dungeon/MazeGenerator.ts`、`server/game/GameRoom.ts`
- **发现日期**：2026-05-06

## 10. Boss房间宝箱无法打开 🔴 待修复
- **问题**：Boss房间中央宝箱（`chest_full_open_anim_f0` decoration）无法交互/打开
- **根因**：宝箱是 `type: 'decoration'` 的 EnvObject，纯装饰无交互逻辑。需要实现宝箱交互机制（靠近+E键 → 开箱 → 掉落物品）
- **相关文件**：`server/game/dungeon/BossArenaGenerator.ts`（宝箱定义）、`server/game/GameRoom.ts`（交互逻辑）、`src/hooks/useGameInput.ts`（E键交互）
- **发现日期**：2026-05-06
