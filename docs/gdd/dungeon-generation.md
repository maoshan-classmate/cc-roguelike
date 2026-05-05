# 地牢生成 GDD

## Overview

程序化生成 1024×768 像素（32×24 tiles，tile=32px）的地牢。普通 Floor 使用 BSP-Enhanced 算法（非矩形房间、A* 弯曲走廊、智能环路），Floor 5 使用固定参数王座厅，迷宫关和竞技关分别使用独立生成器。详见 `room-diversity.md` 的完整关卡结构差异化系统。

## Player Fantasy

每次进入新 floor 都应感受到未知的紧张感：不规则的房间布局、弯曲的走廊、有导航价值的环路。不同 floor 难度递增，Floor 5 王座厅提供截然不同的 Boss 战体验。

## Detailed Rules

### 多生成器路由

| 关卡类型 | 生成器 | 适用场景 |
|---------|--------|---------|
| 普通关（BSP-Enhanced） | `DungeonGenerator.generate(floor, seed)` | Floor 1-4 |
| Boss 关（王座厅） | `BossArenaGenerator.generate(5, seed)` | Floor 5 |
| 迷宫关 | `MazeGenerator.generate(floor, seed)` | Floor 2-4 过渡时 20% 概率 |
| 竞技关（同心双层） | `ColosseumGenerator.generate(floor, seed)` | Floor 2-4 过渡时 10% 概率 |

**文件清单**：
- `server/game/dungeon/DungeonGenerator.ts` — BSP-Enhanced（改造现有）
- `server/game/dungeon/BossArenaGenerator.ts` — Floor 5 王座厅（新增）
- `server/game/dungeon/MazeGenerator.ts` — 陷阱迷宫关（新增）
- `server/game/dungeon/ColosseumGenerator.ts` — 竞技关同心双层（新增）

### 尺寸约束
- 地牢：1024×768 (32×24 tiles, tile=32px)
- `ROOM_MIN_SIZE` 单位是像素不是 tile

### 普通关（BSP-Enhanced）

保留 BSP 分裂作为房间布局骨干（确定性、可控、已验证），增量升级：

**升级 1: 非矩形房间**

BSP 叶节点内按概率选择形状：
| 形状 | 概率 | 描述 |
|------|------|------|
| 矩形 | 60% | 标准 |
| 十字形 | 15% | 中心十字，四角为墙 |
| L 形 | 15% | 两矩形叠加 |
| 椭圆形 | 10% | 椭圆内区域可行走 |

在碰撞网格上按形状方程填充 true，渲染器按 grid 渲染无需改动。

**升级 2: 房间合并**
BSP 生成后，面积之和 < 200px 的相邻叶节点合并为一个大房间。

**升级 3: A* 弯曲走廊**
替代 L 形走廊。A* 在 tile 网格上寻路，代价函数鼓励沿已有路径走（走廊复用=自然形成广场和交叉口）。

**升级 4: 智能环路注入**
在房间连接图上加 3-5 条环路，优先选择"让最远两房间路径缩短 30%+"的边。

**房间类型（简化版）**：
- `rooms[0]` = entrance
- `rooms[last]` = exit (Floor 1-4)
- treasure: 1 个随机中间房间
- 确保 normal 房间 >= 50%
- 陷阱 envObject: normal 房间 10% 概率（Floor 2+），类型随机 spike(60%)/fire(30%)/slow(10%)
- 不再有 trap 房间类型

**BSP 参数（保留）**：
- `bspDepth = min(2 + ceil(floor / 2), 4)` — Floor 1-2 深度 3，Floor 3-5 深度 4
- `minLeafSize = 140` px
- 分割方向：随机 50/50
- 分割位置：父维度的 30%-70%

**走廊连接（升级）**：
- 线性链 + 3-5 条智能环路（替代原 1-2 条随机环路）
- A* 弯曲走廊（替代原 L 形走廊）
- `corridorPadding = 1` tile（走廊实际宽度 2 tiles = 64 px）

### Boss 关（Floor 5 王座厅）

Floor 5 不再用 BSP。固定参数的王座大厅 + 入口走廊。

| 属性 | 值 |
|------|-----|
| 王座大厅 | 832×576 px (26×18 tiles)，居中 (x=96, y=96) |
| 入口走廊 | 64×192 px (2×6 tiles)，连接大厅左侧 |
| 柱子 | 4 根，四角距墙 32px，HP=120 |
| 横幅 | 4 个，墙壁内侧，spriteKey='wall_banner_red' |
| 地板色 | 暗红 #351A1A + 中心红色地毯 #2A0A0A |

详见 `room-diversity.md` Section 3a。

### 迷宫关

递归回溯生成 + Combat Pockets + Dead-End Rewards + Fog of War。

| 属性 | 值 |
|------|-----|
| 迷宫单元格 | 16×12（每个 2×2 tiles） |
| 通道宽度 | 主路径 2 tiles，支路 1-2 tiles |
| Combat Pockets | 3-4 个，每个 4×4 tiles |
| 死胡同奖励 | 60%道具/20%陷阱/20%空 |
| 视野半径 | 128px (4 tiles) |
| 环路 | 8-12 个额外打通 |

详见 `room-diversity.md` Section 3b。

### 竞技关（同心双层）

中央竞技场 + 环形通道的双层结构。

| 属性 | 值 |
|------|-----|
| 中央竞技场 | 512×320 px (16×10 tiles)，居中 |
| 环形通道 | 64px 宽 (2 tiles) |
| 通道口 | 4 个（北/南/西/东），每侧各 1 个，宽 96px |
| 柱子 | 4 根，中央场内四角，HP=120 |
| 陷阱 | 2+floor 个，环形通道四角转角处 |

详见 `room-diversity.md` Section 5。

### 确定性
使用 seeded random（LCG: `seed × 1103515245 + 12345 & 0x7fffffff`），每局开局预生成 5 个 floor 的种子。

### 出生/出口点
- 出生/出口点必须清除 3×3 tile 区域
- 服务端 `exitPoint` 是房间中心（浮点坐标如 933.3）
- 客户端渲染出口效果必须先对齐：`Math.floor(exitPoint.x / 32) * 32`

### 墙壁渲染
- `wall_top_*` (atlas y=0) = 墙壁顶部装饰条，不能单独用作墙壁
- `wall_mid/right/left` (atlas y=16) = 墙壁主体
- 朝向房间的用 `drawWallTileCropped` 裁掉顶部2px

## Formulas

```
roomCount = 6 + floor × 2
bspDepth = min(2 + ceil(floor / 2), 4)
roomSize = random(ROOM_MIN_SIZE, min(nodeWidth - 16, ROOM_MAX_SIZE))
corridorWidth = (1 + corridorPadding) × 2 × tileSize = 64 px
exitDetectionRange = 40 px
```

**BSP-Enhanced 参数**：
```
房间形状概率: 矩形 60% / 十字形 15% / L形 15% / 椭圆 10%
房间合并阈值: 面积之和 < 200px 的相邻叶节点合并
A* 走廊: tile 网格寻路，代价函数鼓励走廊复用
智能环路: 3-5 条，优先"最远两房间路径缩短 30%+"的边
```

**碰撞检测**：
- `isWalkable(x, y)`: 单点检查，`collisionGrid[floor(y/32)][floor(x/32)]`
- `isWalkableRadius(x, y, r)`: 5 点采样（中心 + 四角），全部 walkable 才通过

**出口坐标对齐**（客户端）：
```
renderX = Math.floor(exitPoint.x / 32) × 32
renderY = Math.floor(exitPoint.y / 32) × 32
```

## Edge Cases

- 碰撞网格空时 `isWalkable()` 必须返回 `false`
- 出口坐标浮点对齐：`Math.floor(exitPoint.x / 32) * 32`
- 房间重叠检测
- 迷宫生成后无死胡同时回退：减少环路数重新生成
- 竞技关同心双层通道口被柱子堵住：不会发生（柱子仅在中央场内四角）

## Dependencies

- **room-diversity.md**（上游）：完整关卡差异化系统定义（状态机、触发机制、环境物体）
- 贴图系统（0x72 瓦片）
- 碰撞系统（可行走判定）
- 关卡推进（出口触发下一 floor）

## Tuning Knobs

### BSP-Enhanced

| 参数 | 默认值 | 范围 | 影响 |
|------|--------|------|------|
| 地牢尺寸 | 1024×768 | 固定 | 游戏区域大小 |
| tile 大小 | 32px | 固定 | 像素精度 |
| ROOM_MIN_SIZE | 96 px | 64-128 | 房间最小尺寸 |
| ROOM_MAX_SIZE | 350 px | 200-500 | 房间最大尺寸 |
| corridorPadding | 1 tile (32px) | 0-2 tiles | 走廊宽度 |
| BSP minLeafSize | 140 px | 100-200 | BSP 叶节点最小尺寸 |
| exitDetectionRange | 40 px | 30-60 | 出口触发距离 |
| 非矩形房间概率 | 40% | 0-60% | normal 房间形状多样性 |
| 房间形状权重 | 矩形60%/十字15%/L15%/椭圆10% | - | 房间形状分布 |
| 房间合并面积阈值 | 200px | 100-400 | 小房间合并频率 |
| A* 走廊代价权重 | 0.5 | 0.1-1.0 | 走廊复用程度 |
| 智能环路数 | 3-5 | 1-8 | 环路密度 |
| 环路路径缩短阈值 | 30% | 10-50% | 环路导航价值过滤 |

### Boss 关（固定参数）

| 参数 | 默认值 | 范围 | 影响 |
|------|--------|------|------|
| 大厅尺寸 | 832×576 px | 固定 | Boss 战斗空间 |
| 柱子数 | 4 | 2-8 | 掩体数量 |

### 迷宫关

| 参数 | 默认值 | 范围 | 影响 |
|------|--------|------|------|
| 迷宫单元格 | 16×12 | 固定 | 迷宫规模 |
| 视野半径 | 128px | 64-192 | 迷雾紧张度 |
| 额外环路数 | 8-12 | 4-20 | 替代路径密度 |
| Combat Pockets | 3-4 | 1-6 | 战斗遭遇密度 |

### 竞技关

| 参数 | 默认值 | 范围 | 影响 |
|------|--------|------|------|
| 中央场尺寸 | 512×320 px | 384×192 ~ 640×384 | 竞技场战斗空间 |
| 通道宽度 | 64px (2 tiles) | 32-96 | 环形通道宽度 |
| 柱子数 | 4 | 2-8 | 掩体密度 |
| 陷阱数 | 2+floor | 1-8 | 环形通道危险度 |

## Acceptance Criteria

1. 每次生成地牢房间布局不同
2. 所有房间可达（无孤立区域）
3. 出生点和出口点周围 3×3 tile 空旷
4. 出口渲染坐标与服务端坐标对齐
5. BSP-Enhanced 生成非矩形房间（十字/L/椭圆）+ A* 弯曲走廊 + 3-5 条智能环路
6. BossArenaGenerator 生成固定参数王座厅（832×576px + 4 柱子 + 4 横幅）
7. MazeGenerator 生成 16×12 单元格迷宫 + 3-4 Combat Pockets + 死胡同奖励
8. ColosseumGenerator 生成同心双层结构（中央场 512×320 + 环形通道 + 4 通道口）
