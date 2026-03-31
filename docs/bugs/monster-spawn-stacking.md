# Bug: 生成的怪物数量会堆叠在一起

**发现时间**: 2026-03-31
**优先级**: P1
**状态**: 定位中

## 复现步骤
1. 进入游戏
2. 观察怪物生成

## 预期行为
怪物应该分散生成在地图上

## 实际行为
多个怪物堆叠在相同位置

## 相关代码
- 怪物生成逻辑
- 位置随机算法

## 根因分析

**文件**: `server/game/dungeon/DungeonGenerator.ts` 第 250-271 行

**问题**: 原实现每房间只生成一个坐标点 + count，GameRoom 循环创建时所有 enemy 堆叠在同一点（仅 +-20px 随机偏移）

```typescript
// 修复前：count 个敌人共用一个坐标
enemies.push({ type, x, y, count });  // count=6 时全部堆在一起

// 修复后：每个 enemy 独立坐标，分散在房间内
for (let i = 0; i < count; i++) {
  const x = room.x + room.width / 2 + (this.random() - 0.5) * maxOffsetX;
  const y = room.y + room.height / 2 + (this.random() - 0.5) * maxOffsetY;
  enemies.push({ type, x, y, count: 1 });
}
```

## 修复记录
- [x] 2026-03-31: 重构 spawnEnemies()，每 enemy 独立生成坐标
- [x] 2026-03-31: 添加敌人-敌人碰撞分离逻辑 `separateEnemies()`
- [x] 2026-03-31: 减少敌人生成数量（FLOOR_CONFIG 降低约40%）
- [x] 2026-03-31: `npx tsc --noEmit` 编译通过

## 修复详情

### 1. 敌人生成数量减少
```typescript
// constants.ts FLOOR_CONFIG
// 修复前: [6, 10] ~ [15, 22]
// 修复后: [3, 5] ~ [8, 12]
```

### 2. 敌人碰撞分离
```typescript
// GameRoom.ts 新增 separateEnemies() 方法
// - 基于 ENEMY_RADIUS 计算最小安全距离
// - 检测重叠时按半径比例推动分离
// - 验证分离后位置可行走（不穿墙）
```
