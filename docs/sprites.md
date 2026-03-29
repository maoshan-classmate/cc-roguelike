# 精灵/资源使用指南

## Kenney.nl（主要资源）
- **许可**：Creative Commons CC0（可免费商用）
- **网址**：https://kenney.nl/assets
- **解压资源**：`src/assets/kenney/`
- **字体**：`public/fonts/`（Kenney像素字体）

## 精灵图规格

### 尺寸
- 单个精灵：16x16 像素
- 间距：1px

### 主要 Spritesheet

| 文件 | 尺寸 | 每行精灵数 | 用途 |
|------|------|-----------|------|
| `roguelikeChar_transparent.png` | 918×203 | 54 | 角色 + 装备（**无怪物**） |
| `roguelikeDungeon_transparent.png` | 492×305 | 29 | 地牢瓦片 + 道具（**无怪物**） |
| `roguelikeSheet_transparent.png` | 968×526 | 56 | 综合精灵（含大量怪物变体） |

### 精灵计算公式
```
spritesPerRow = floor(sheetWidth / (tileSize + margin))  // tileSize=16, margin=1
row = floor(index / spritesPerRow)
col = index % spritesPerRow
x = col * (tileSize + margin)
y = row * (tileSize + margin)
```

### 绘制函数路由

| 函数 | 使用的精灵图 | 每行宽度 |
|------|------------|---------|
| `drawCharacterSprite()` | roguelikeChar | 918 |
| `drawDungeonSprite()` | roguelikeDungeon | 492 |
| `drawSheetSprite()` | roguelikeSheet | 968 |

---

## roguelikeChar（918×203）— 角色 + 装备

**此精灵图无任何怪物！索引16+全部是装备/服装。**

### 角色本体（每个角色只有 front+back 2 个精灵）✅ 已使用

> **关键发现**：roguelikeChar 角色按 2 个一组排列（正面+背面），**没有左右朝向精灵**。
> 左右朝向通过 Canvas `ctx.scale(-1, 1)` 水平翻转正面精灵实现。
> 索引 2-5 是**空白**，不是角色！之前引用这些索引导致角色贴图消失。

| 职业ID | 正面索引 | 背面索引 | 颜色 |
|--------|---------|---------|------|
| warrior | 0 (row0,col0) | 1 (row0,col1) | 肤色 #E0C0A0 |
| ranger | 162 (row3,col0) | 163 (row3,col1) | 绿色 #40A060 |
| mage | 108 (row2,col0) | 109 (row2,col1) | 棕色 #A08040 |
| healer | 378 (row7,col0) | 379 (row7,col1) | 肤色重装 #A08060 |

### 装备/服装（索引 16+）❌ 禁止用于怪物

> **历史教训**：之前错误地将索引 16/20/24/34 用作怪物贴图，实际是头盔/铠甲/武器/护符。已修复。

---

## roguelikeDungeon（492×305）— 地牢瓦片 + 道具

### 地板瓦片（索引 0-8）
- 相同风格室内地板，**推荐用 fillRect 像素风格绘制**（消除接缝）

### 墙壁瓦片（索引 9-16）
- 带深色边框，与地板相邻会产生双重边框接缝
- **推荐用 fillRect 像素风格绘制**

### 门（索引 17-20）、宝箱（21-22）、楼梯（23-24）

| 索引 | 类别 | 使用处 |
|------|------|--------|
| 21 | 宝箱 | items.ts `chest` |
| 23 | 下楼梯 | 出口点渲染 |

### ❌ 索引 25-28 不是怪物

> **历史教训**：之前误以为索引 26-28 是史莱姆/蝙蝠/骷髅，实际像素分析证实这些是空白/瓦片，无怪物精灵。

### 道具（索引 29-35）✅ 已使用

| 索引 | 类别 | 使用处 |
|------|------|--------|
| 29 | 生命药水（绿色） | items.ts `health` |
| 30 | 能量药水（蓝色） | items.ts `energy` |
| 31 | 金币 | items.ts `coin` |
| 32 | 钥匙 | items.ts `key` |
| 33 | 大药水（紫色） | items.ts `potion` |
| 34 | 盾牌 | items.ts `shield` |
| 35 | 子弹/弹药 | items.ts `bullet` |

---

## roguelikeSheet（968×526）— 怪物精灵

**怪物精灵的唯一来源。** 已加载并使用 `drawSheetSprite()` 渲染。

### 怪物（像素验证确认）✅ 已使用

| 索引 | 名称 | 填充率 | 主色调 | enemies.ts key |
|------|------|--------|--------|----------------|
| 1671 | 青绿史莱姆 | 74.2% | cyan(64,192,192) | `basic` |
| 1665 | 绿色蝙蝠 | 74.2% | green(128,192,64) | `fast` |
| 1648 | 灰白骷髅 | 74.2% | gray(192,192,192) | `tank` |
| 1668 | 橙色恶魔 | 74.2% | orange(224,128,64) | `boss` |

> **注意**：索引 1721/1725 超出 perRow=56 的最大索引 1679，已替换为有效索引 1665/1668。

### 同区域怪物变体（可扩展）

**骷髅变体**（行29, col 24-29）: 索引 1648-1653 — 多种灰度骷髅
**兽人变体**（行29, col 18-23）: 索引 1642-1647 — 棕色兽人 rgb(182,94,38)
**恶魔变体**（行29, col 30-34）: 索引 1654-1658 — 橙红恶魔
**绿色蝙蝠**（行29, col 41/43）: 索引 1665, 1667 — rgb(136,189,50)
**橙色恶魔**（行29, col 44/46）: 索引 1668, 1670 — rgb(210,113,52)
**青绿史莱姆**（行29, col 47/49）: 索引 1671, 1673 — rgb(68,187,182)

**深色史莱姆**（行30, col 18-23）: 索引 1698-1703 — rgb(55,170,165)
**米色僵尸**（行30, col 24+）: 索引 1704+ — rgb(217,202,169)

---

## 使用规则

### ✅ 正确用法
- **角色**：roguelikeChar — 每个职业只有 front/back 两个索引，左右用 Canvas 翻转
- **怪物**：roguelikeSheet 索引 1671/1665/1648/1668（史莱姆/蝙蝠/骷髅/恶魔）
- **道具**：roguelikeDungeon 索引 29-35
- **地板/墙壁**：fillRect 像素风格（不用精灵）

### ❌ 禁止用法
- **禁止**用 roguelikeChar 索引 16+ 作为怪物贴图（全是装备）
- **禁止**用 roguelikeDungeon 作为怪物来源（无怪物精灵）
- **禁止**用精灵渲染地板/墙壁（会产生边框接缝）

### 0x72 TilesetII（已集成 ✅）

**许可**：Pay What You Want（商业可用）
**来源**：`assets/inbox/0x72_DungeonTilesetII_v1.7/` → `src/assets/0x72/`

| 分类 | 精灵 key | 说明 |
|------|---------|------|
| 角色 | `knight_m_idle_anim_f0` 等 | 4帧 idle 动画 |
| 怪物 | `goblin_idle_anim_f0` | ⚠️ slime 不在 atlas |
| 怪物 | `skelet_idle_anim_f0` | 骷髅 |
| 怪物 | `big_demon_idle_anim_f0` | BOSS |
| 武器 | `weapon_knight_sword` 等 | 静态 |
| 道具 | `flask_big_red` 等 | 静态/3帧动画 |
| 场景 | `wall_left/mid/right` 等 | 静态 |
| UI | `ui_heart_full/empty/half` | 心形血条 |

**统一 Sprite Registry**：`src/config/sprites.ts` — `SPRITE_REGISTRY` key = spriteName，详见 CLAUDE.md

### 相关文件
- 资源索引：`src/assets/kenney/index.ts`
- 绘制函数：`src/config/sprites.ts`
- 角色配置：`src/config/characters.ts`
- 怪物配置：`src/config/enemies.ts`
- 道具配置：`src/config/items.ts`
- 渲染入口：`src/pages/GamePage.tsx`
