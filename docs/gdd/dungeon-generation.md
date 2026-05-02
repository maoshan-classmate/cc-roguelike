# 地牢生成 GDD

## Overview

程序化生成 1024×768 像素（32×24 tiles，tile=32px）的地牢，包含房间、走廊、出生点和出口。

## Player Fantasy

每次进入新 floor 都应感受到未知的紧张感：不规则的房间布局、需要探索才能找到出口、不同 floor 难度递增。

## Detailed Rules

### 尺寸约束
- 地牢：1024×768 (32×24 tiles, tile=32px)
- `ROOM_MIN_SIZE` 单位是像素不是 tile

### 房间生成

**算法**：BSP（Binary Space Partitioning）树分割 + 叶节点房间雕刻

**BSP 参数**：
- `bspDepth = min(2 + ceil(floor / 2), 4)` — Floor 1-2 深度 3，Floor 3-5 深度 4
- `minLeafSize = 140` px — 叶节点最小尺寸，保证房间不会太小
- 分割方向：随机 50/50（水平 vs 垂直）
- 分割位置：父维度的 30%-70%（`0.3 + random * 0.4`）

**房间参数**（从 BSP 叶节点雕刻）：
- `ROOM_MIN_SIZE = 96` px（~3 tiles）
- `ROOM_MAX_SIZE = 350` px（~11 tiles）
- 房间内 padding = 8 px（与叶节点边缘的间距）
- 房间尺寸 = `random(MIN, min(nodeSize - 2×padding, MAX))`
- 房间位置 = 叶节点内随机偏移

**目标房间数**：`roomCount = 6 + floor × 2`（Floor 1→8, Floor 5→16）
- BSP 生成叶节点后，超过 target 的随机移除
- 不足 target 时不补充

**走廊连接**：
- 线性链：rooms[0]→rooms[1]→...→rooms[n-1]
- 随机环路：1-2 条额外连接（非相邻房间间）
- L 形走廊（水平+垂直段，随机先横后纵或先纵后横）
- `corridorPadding = 1` tile（走廊实际宽度 2 tiles = 64 px）

**特殊房间**：
- `rooms[0]` = entrance（出生点）
- `rooms[last]` = boss（出口点）
- 1 个随机中间房间 = treasure（道具生成点）

**确定性**：使用 seeded random（LCG: `seed × 1103515245 + 12345 & 0x7fffffff`），每局开局预生成 5 个 floor 的种子

### 走廊连接
- 走廊必须加 `corridorPadding`

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

**碰撞检测**：
- `isWalkable(x, y)`: 单点检查，`collisionGrid[floor(y/32)][floor(x/32)]`
- `isWalkableRadius(x, y, r)`: 5 点采样（中心 + 四角），全部 walkable 才通过

**出口坐标对齐**（客户端）：
```
renderX = Math.floor(exitPoint.x / 32) × 32
renderY = Math.floor(exitPoint.y / 32) × 32
```
服务端 `exitPoint` 是浮点坐标（如 933.3），客户端渲染前必须 tile 对齐。

**TODO — 地牢生成优化计划**：

| 优先级 | 优化项 | 描述 | 预期效果 |
|--------|--------|------|---------|
| P0 | **房间类型多样化** | 增加 trap（陷阱房）、mob_arena（刷怪笼房）、puzzle（谜题房）类型 | 探索更有惊喜 |
| P1 | **房间模板系统** | 预制房间布局模板（十字形、L 形、环形），BSP 叶节点随机选模板 | 房间形状更多样 |
| P1 | **环境变化** | 不同 Floor 使用不同墙壁/地板色调（Floor 1 石砖，Floor 5 暗红） | 视觉推进感 |
| P1 | **最小连通保证** | BSP 生成后验证所有房间连通，不连通则重新生成 | 消除理论上的孤立房间风险 |
| P2 | **走廊宽度按类型** | 主走廊 2 tiles，支走廊 1 tile，boss 前走廊加宽到 3 tiles | 空间节奏感 |
| P2 | **房间内障碍物** | 房间内随机放置柱子/桌椅等碰撞体 | 增加战术掩体 |
| P2 | **出口门机制** | 出口需钥匙开启（当前 key 物品定义但未使用） | 增加探索动机 |

## Edge Cases

- 碰撞网格空时 `isWalkable()` 必须返回 `false`
- 出口坐标浮点对齐：`Math.floor(exitPoint.x / 32) * 32`
- 房间重叠检测

## Dependencies

- 贴图系统（0x72 瓦片）
- 碰撞系统（可行走判定）
- 关卡推进（出口触发下一 floor）

## Tuning Knobs

| 参数 | 当前值 | 范围 | 影响 |
|------|--------|------|------|
| 地牢尺寸 | 1024×768 | 固定 | 游戏区域大小 |
| tile 大小 | 32px | 固定 | 像素精度 |
| ROOM_MIN_SIZE | 96 px | 64-128 | 房间最小尺寸 |
| ROOM_MAX_SIZE | 350 px | 200-500 | 房间最大尺寸 |
| corridorPadding | 1 tile (32px) | 0-2 tiles | 走廊宽度 |
| BSP minLeafSize | 140 px | 100-200 | BSP 叶节点最小尺寸 |
| exitDetectionRange | 40 px | 30-60 | 出口触发距离 |

## Acceptance Criteria

1. 每次生成地牢房间布局不同
2. 所有房间可达（无孤立区域）
3. 出生点和出口点周围 3×3 tile 空旷
4. 出口渲染坐标与服务端坐标对齐
