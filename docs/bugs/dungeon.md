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

## 7. Boss房间2x2旗帜范围内有其他装饰物 ✅ 已修复 (2026-05-06)
- **问题**：Boss房间四角2x2柱子区域（floor_banner）内出现了骷髅头等micro-decorations，视觉上与旗帜重叠
- **根因**：`drawMicroDecorations` 未排除 envObjects 占位区域
- **修复**：调用点传入 `excludeRects`（所有 envObjects 的 tile 范围），drawMicroDecorations 跳过排除区域内的 tile
- **相关文件**：`src/utils/dungeonTileRenderer.ts`、`src/hooks/useGameRenderer.ts`
- **发现日期**：2026-05-06

## 8. Boss房间没有出口楼梯贴图 ✅ 已修复 (2026-05-06)
- **问题**：Floor 5 Boss房间没有出口楼梯，设计意图是全灭即 VICTORY
- **根因**：验证了全灭→VICTORY 跳转链路正常（Boss 全灭 → phase='VICTORY' → emit game:end → 客户端跳转）
- **修复**：链路正常，无需出口楼梯。Boss 全灭直接触发胜利界面
- **相关文件**：`server/game/GameRoom.ts`（checkFloorCompletion VICTORY 逻辑）
- **发现日期**：2026-05-06

## 9. 迷宫关卡无法进入下一层 ✅ 已修复 (2026-05-06)
- **问题**：迷宫关卡 fog of war 遮住出口，清完怪后看不到引导光线
- **根因**：(1) BFS 验证失败时仅 console.error 不阻止 (2) fog 遮住出口引导光线 (3) spawnPoint 钳位阈值偏大
- **修复**：
  1. BFS 验证失败重试 3 次不同 seed，全部失败降级保底走廊
  2. 出口引导光线在迷雾层之后用 `globalCompositeOperation='lighter'` 重绘，穿透迷雾
  3. spawnPoint 钳位阈值从 20 改为 16
- **相关文件**：`server/game/dungeon/MazeGenerator.ts`、`src/hooks/useGameRenderer.ts`、`server/game/GameRoom.ts`
- **发现日期**：2026-05-06

## 10. Boss房间宝箱无法打开 ✅ 已修复 (2026-05-06)
- **问题**：Boss房间中央宝箱无法交互/打开
- **根因**：宝箱是 `type: 'decoration'` 的 EnvObject，纯装饰无交互逻辑
- **修复**：
  1. `shared/types.ts` EnvObjectType 新增 'chest'
  2. `BossArenaGenerator.ts` 宝箱 type 从 'decoration' 改为 'chest'
  3. `GameRoom.ts` 新增 checkChestInteraction()：玩家靠近自动打开，掉落随机物品
  4. `useGameRenderer.ts` 新增 chest 渲染分支：alive 显示关闭贴图，!alive 显示打开贴图
- **相关文件**：`shared/types.ts`、`server/game/dungeon/BossArenaGenerator.ts`、`server/game/GameRoom.ts`、`src/hooks/useGameRenderer.ts`
- **发现日期**：2026-05-06

## 11. 竞技关出口走廊出现两个楼梯 ✅ 已修复 (2026-05-06)
- **问题**：竞技关（colosseum）右侧出口走廊出现两个向下楼梯贴图
- **根因**：`drawEnvObjects` 的 `case 'door'` 分支在 `doorOpen=true` 时画了 `floor_stairs`（col=26），同时 `renderDungeonTiles` 在 `exitPoint` 也画了 `floor_stairs`（col=30）
- **修复**：删除 `case 'door'` 打开门时的楼梯绘制，打开的门不渲染任何图形
- **相关文件**：`src/hooks/useGameRenderer.ts`（drawEnvObjects door 分支）
- **发现日期**：2026-05-06

## 12. 竞技关楼梯触发逻辑错误 ✅ 已修复 (2026-05-06)
- **问题**：(1) Wave 0 跳过触发在 door 位置而非楼梯 (2) Wave 3 清完后无退出机制，反复调用 spawnArenaRewards
- **根因**：checkArenaState 逻辑分散，未统一"清完怪→走楼梯→下一层"规则
- **修复**：重写 checkArenaState，统一规则：aliveEnemies > 0 → 禁止出口；aliveEnemies = 0 → wave 推进或楼梯检测
- **相关文件**：`server/game/GameRoom.ts`（checkArenaState）
- **发现日期**：2026-05-06
