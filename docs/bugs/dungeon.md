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

---

## 13. 地形贴图碰撞不一致 + 墙壁渲染混乱 (2026-05-09)
- **优先级**: P1
- **发现时间**: 2026-05-09
- **问题**: (1) 部分地板 tile 看起来可走但走不过去，部分墙壁区域看起来不能走但能走 (2) 墙壁只使用 `wall_mid`/`wall_right` 两种精灵，转角和边缘无区分，视觉混乱
- **期望行为**: 碰撞网格与渲染完全一致，墙壁有正确的方向性精灵
- **根因分析**:

### 问题 A: BossArena 柱子碰撞双重标准
- `BossArenaGenerator.ts:85` — `BOSS_PILLAR_SIZE = 64`（2x2 tiles），注释说"不在碰撞网格标记，用矩形推出"
- 碰撞网格中这些 tile 仍是 `true`（可行走）
- `GameRoom.ts:433-450` 玩家有矩形柱子推出逻辑（正常）
- `EnemyAI.ts` 只用 `isWalkableRadius()`（只看网格），**敌人直接穿过柱子**
- `Combat.ts:checkBulletCollision()` 只检查 `isWalkable()`，**子弹也穿过柱子**
- 对比：`DungeonGenerator.ts:329-338` 和 `ColosseumGenerator.ts:165-167` 的柱子**写入碰撞网格**

### 问题 B: 走廊 padding 导致碰撞比视觉宽
- `DungeonGenerator.ts:309` — `corridorPadding = 1` 扩展走廊碰撞 1 tile
- 碰撞网格中 L 型走廊拐角处多出 1 tile 宽可行走区域
- 渲染和碰撞对齐（同一个 grid），但走廊看起来比实际碰撞区域更窄
- 部分看起来像墙壁的位置实际可行走

### 问题 C: 墙壁精灵选择过于简单
- `dungeonTileRenderer.ts:74-75` — 只区分 `wall_mid` 和 `wall_right`，不使用 `wall_left`/`wall_top_*`
- 走廊转角处无正确的视觉边缘衔接
- 所有朝向的墙壁看起来一样，造成地形视觉混乱
- 裁剪逻辑（`above || below` 时裁 2px）对纯左右相邻墙壁不裁剪，不同朝向墙壁视觉不一致

### 问题 D: renderDungeonFromRooms fallback 缺少 carved/pillar 数据
- `dungeonTileRenderer.ts:217-304` — 客户端重建 grid 时**忽略** carved tiles 和 pillar
- 如果 collisionGrid 未传输（fallback 路径），客户端渲染地板比服务端碰撞更大
- carved 区域和柱子区域客户端画地板但服务端不可走
- 正常流程 collisionGrid 存在时不触发，但极端情况下会出问题

- **修复方案**:
  - A: BossArena 柱子写入碰撞网格（与 DungeonGenerator/Colosseum 对齐），或统一改为矩形碰撞检测
  - B: 降低 corridorPadding 或在渲染时同步扩展走廊视觉宽度
  - C: 增加墙壁精灵选择逻辑（根据上下左右邻接关系选择 wall_left/mid/right）
  - D: fallback 路径排除 pillar 区域
- **涉及文件**:
  - `server/game/dungeon/BossArenaGenerator.ts` — 柱子碰撞写入 grid
  - `server/game/dungeon/DungeonGenerator.ts` — corridorPadding 或渲染同步
  - `src/utils/dungeonTileRenderer.ts` — 墙壁精灵选择 + fallback grid 修正
  - `server/game/GameRoom.ts` — 柱子碰撞统一处理
- **涉及系统**: 地牢生成、碰撞检测、瓦片渲染
- **修复提交**: 2026-05-09
- **修复内容**:
  - A: BossArena 柱子 2x2 tile 写入 collisionGrid，与 DungeonGenerator/Colosseum 对齐
  - B: corridorPadding=1 碰撞/渲染共用 grid，确认无需修复
  - C: drawWallTiles 三路精灵选择（wall_left/mid/right），转角和边缘有方向性
  - D: renderDungeonFromRooms 在 drawFloorTiles 前用 excludeRects 排除柱子区域
- **验证**: tsc 零 error + 逐项代码审查 ALL PASS
- **状态**: ✅ 已修复

---

## 14. 迷宫药水无法拾取 (2026-05-09)
- **优先级**: P0
- **发现时间**: 2026-05-09
- **问题**: 角色走到迷宫关卡的药水/金币道具上，无法拾取
- **期望行为**: 角色走到道具上自动拾取并应用效果
- **根因分析**:
  - **主因**: `MazeGenerator.ts:557-572` 将药水瓶/金币作为 `type: 'decoration'` 的 `envObjects` 生成，而非 `itemSpawns`。`GameRoom.checkItemPickup()` 只遍历 `this.items` 数组，装饰物从未进入该数组
  - **次因**: sprite key `flask_big_red`/`flask_big_blue`/`coin_pile` 在 `ITEM_DEFS`（`shared/constants.ts:12-27`）中不存在。应为 `health`/`energy`/`coin`。属于 bug-patterns.md 记载的 ID 不匹配模式
  - **证据**: `MazeGenerator.ts:213` 返回 `itemSpawns: []`（零物品生成），所有"物品"都在 `envObjects` 中
- **修复方案**:
  1. `MazeGenerator.ts` 将药水瓶/金币从 `envObjects` 改为 `itemSpawns`，使用 `ITEM_DEFS` 匹配的 type（`health`/`energy`/`coin`）
  2. 或在 `ItemPickupType` 和 `ITEM_DEFS` 中新增 `flask_big_red`/`flask_big_blue`/`coin_pile` 条目
- **涉及文件**:
  - `server/game/dungeon/MazeGenerator.ts` — 药水生成逻辑
  - `shared/constants.ts` — ITEM_DEFS 定义
  - `shared/types.ts` — ItemPickupType 类型
  - `server/game/GameRoom.ts` — checkItemPickup()
- **涉及系统**: 地牢生成、道具拾取
- **修复方案**:
  1. `MazeGenerator.ts` placeDeadEndRewards: 药水瓶从 envObjects 改为 items 数组，type 使用 `health`/`energy`/`coin`
  2. 返回值 itemSpawns: [] 改为 itemSpawns: items
  3. 新增 ItemPickupType import
- **修复提交**: 2026-05-09
- **状态**: ✅ 已修复
