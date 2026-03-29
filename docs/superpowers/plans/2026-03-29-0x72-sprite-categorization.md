# 0x72 Tileset II 资源分类与持久化替换计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 解析 0x72 tileset 370个精灵条目，建立完整分类体系，持久化到 TypeScript 分类注册表，再系统性地替换游戏中的精灵引用。

**Architecture:**
- 步骤一：解析 tile_list_v1.7，按命名规则自动分类（角色/敌人/道具/武器/环境/UI），生成 `spriteRegistry.ts`
- 步骤二：用分类注册表重构 `index.ts`，替换掉当前半残的 `CHARACTER_SPRITES`/`ENEMY_SPRITES`/`WEAPON_SPRITES`
- 步骤三：修正 `characters.ts`/`enemies.ts`/`items.ts` 中的 `spriteName` 引用，全部指向 registry 中的规范键名
- 步骤四：修复 `GamePage.tsx` 中 `getAnimSprite` 的帧号拼接 BUG（非动画精灵如 `flask_big_blue` 不应追加 `_fX`）
- 步骤五：构建 weapon/environment/UI 渲染路径，完成完整替换闭环

**Tech Stack:** TypeScript, Canvas 2D, 0x72 Dungeon Tileset II atlas

---

## 资源分类体系

从 tile_list_v1.7 的 370 条目中，按**精灵尺寸 + 命名前缀**自动分类：

| 类别 | 尺寸 | 命名前缀/规则 | 数量 | 动画 |
|------|------|-------------|------|------|
| **CHARACTER** | 16×28 | `knight_m/f`, `elf_m/f`, `wizzard_m/f`, `dwarf_m/f`, `lizard_m/f` | 40帧 (5角色×4帧×2动作+hit) | idle/run/hit |
| **ENEMY_SMALL** | 16×16 | `slime`, `goblin`, `skelet`, `tiny_zombie`, `imp`, `angel` | ~30帧 | idle/run (4帧) |
| **ENEMY_MEDIUM** | 16×23 | `orc_shaman`, `wogol`, `masked_orc`, `orc_warrior`, `necromancer`, `chort`, `doc`, `pumpkin_dude`, `slug` | ~80帧 | idle/run (4帧) |
| **ENEMY_LARGE** | 32×36 | `big_demon`, `big_zombie`, `ogre` | 24帧 (3×4帧×2动作) | idle/run |
| **WEAPON** | 多种 | `weapon_*` | 29个 | 无动画 |
| **ITEM** | 16×16 | `flask_*`, `coin_anim`, `bomb_f*`, `chest_*_open`, `crate`, `skull` | ~30个 | 部分有帧 |
| **ENVIRONMENT** | 16×16/32/48 | `wall_*`, `floor_*`, `hole`, `doors_*`, `column*`, `edge_*`, `button_*`, `lever_*`, `wall_fountain_*`, `wall_goo*`, `wall_banner_*`, `wall_hole_*`, `wall_edge_*`, `wall_outer_*`, `floor_spikes_*`, `floor_ladder`, `floor_stairs` | ~80个 | 部分有帧 |
| **UI** | 13×12 | `ui_heart_*` | 3个 | 无动画 |

**非动画项（无帧号后缀）：** `flask_big_blue`, `flask_big_red`, `flask_big_green`, `flask_big_yellow`, `flask_blue`, `flask_red`, `flask_green`, `flask_yellow`, `crate`, `column`, `column_wall`, `hole`, `skull`, `ui_heart_*`, `wall_goo`, `wall_goo_base`, 所有 `weapon_*`（除动画外）

---

## 文件结构

```
src/assets/0x72/
├── spriteIndex.ts       ← 已存在，flat name→{x,y,w,h}，不修改
├── spriteRegistry.ts    ← 新建，分类注册表（TYPE → spriteName[]），由 tile_list 生成
├── spriteClassifier.ts  ← 新建，分类规则引擎（命名→类型推断）
└── index.ts             ← 重构，导出分类后的 SPRITE_REGISTRY，移除半残的 CHARACTER_SPRITES 等
```

---

## Task 1: 生成 spriteRegistry.ts + 分类结果持久化 MD

**Files:**
- Create: `src/assets/0x72/spriteRegistry.ts`
- Create: `docs/sprites/0x72-classification.md` ← **分类结果持久化文档**
- Source: `assets/inbox/0x72_DungeonTilesetII_v1.7/tile_list_v1.7`
- Script: 分析 370 条目的命名规则，按尺寸+前缀分类

- [ ] **Step 1: 分析 tile_list_v1.7 分类逻辑，写入注释**

格式：`name x y w h`

分类规则：
```typescript
// 16x28 → CHARACTER (5角色: knight, elf, wizzard, dwarf, lizard × m/f)
// 16x16 + goblin/skelet/tiny_zombie/imp/angel → ENEMY_SMALL
// 16x23 + orc_shaman/wogol/masked_orc/orc_warrior/necromancer/chort/doc/pumpkin_dude/slug → ENEMY_MEDIUM
// 32x36 + big_demon/big_zombie/ogre → ENEMY_LARGE
// weapon_* → WEAPON
// flask_*/coin_*/bomb_*/chest_*/crate/skull → ITEM
// wall_*/floor_*/hole/doors_*/column*/edge_*/button_*/lever_*/ui_heart* → ENVIRONMENT/UI
```

- [ ] **Step 2: 生成完整 TypeScript 注册表 + MD 分类文档**

```typescript
// Auto-generated from tile_list_v1.7 - DO NOT EDIT MANUALLY
export type SpriteType = 'CHARACTER' | 'ENEMY_SMALL' | 'ENEMY_MEDIUM' | 'ENEMY_LARGE' | 'WEAPON' | 'ITEM' | 'ENVIRONMENT' | 'UI'

export interface SpriteInfo {
  name: string
  x: number; y: number; w: number; h: number
  type: SpriteType
  animated: boolean
  frameCount: number  // 0 = no animation
  animType?: 'idle' | 'run' | 'hit' | 'open' | 'fountain' | 'spikes' | 'coin'
}

export const SPRITE_REGISTRY: Record<string, SpriteInfo> = { /* 370 entries */ }

// 按类型索引
export const SPRITES_BY_TYPE: Record<SpriteType, string[]> = {
  CHARACTER: [...],
  ENEMY_SMALL: [...],
  ENEMY_MEDIUM: [...],
  ENEMY_LARGE: [...],
  WEAPON: [...],
  ITEM: [...],
  ENVIRONMENT: [...],
  UI: [...],
}
```

同时生成 `docs/sprites/0x72-classification.md`：

```markdown
# 0x72 Dungeon Tileset II — 精灵分类文档

## CHARACTER (16×28)

| 游戏职业 | 0x72 Sprite Key | 尺寸 | 动画帧数 |
|---------|----------------|------|---------|
| warrior | knight_m_idle_anim_f0 | 16×28 | 4帧 idle |
| ranger  | elf_m_idle_anim_f0    | 16×28 | 4帧 idle |
| mage    | wizzard_m_idle_anim_f0| 16×28 | 4帧 idle |
| cleric  | orc_shaman_idle_anim_f0| 16×23 | 4帧 idle |

## ENEMY_SMALL (16×16)
...
```

- [ ] **Step 3: 运行编译验证**

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 4: Commit**

```bash
git add src/assets/0x72/spriteRegistry.ts
git commit -m "feat: 0x72 spriteRegistry 完整分类注册表 (370条目)"
```

---

## Task 2: 重构 index.ts — 导出分类数据

**Files:**
- Modify: `src/assets/0x72/index.ts`

- [ ] **Step 1: 替换半残的 CHARACTER_SPRITES/ENEMY_SPRITES/WEAPON_SPRITES**

从 `SPRITE_REGISTRY` 派生：

```typescript
// 角色：4个可用角色 (warrior=ranger=knight, elf, wizzard, orc_shaman)
export const CHARACTERS = {
  warrior: { idle: 'knight_m_idle_anim', run: 'knight_m_run_anim' },
  ranger:  { idle: 'elf_m_idle_anim',    run: 'elf_m_run_anim' },
  mage:    { idle: 'wizzard_m_idle_anim', run: 'wizzard_m_run_anim' },
  cleric:  { idle: 'orc_shaman_idle_anim', run: 'orc_shaman_run_anim' },
} as const

// 敌人
export const ENEMIES = {
  basic:  { idle: 'slime_idle_anim',    spriteType: 'ENEMY_SMALL' },
  fast:   { idle: 'goblin_idle_anim',   spriteType: 'ENEMY_SMALL' },
  tank:   { idle: 'skelet_idle_anim',   spriteType: 'ENEMY_SMALL' },
  boss:   { idle: 'big_demon_idle_anim', spriteType: 'ENEMY_LARGE' },
} as const

// 武器 (key = game weapon type, value = 0x72 sprite)
export const WEAPONS = {
  sword:   'weapon_knight_sword',
  pistol:  'weapon_arrow',
  staff:   'weapon_red_magic_staff',
  axe:     'weapon_axe',
  bow:     'weapon_bow',
  hammer:  'weapon_hammer',
  spear:   'weapon_spear',
  katana:  'weapon_katana',
  mace:    'weapon_mace',
} as const

// 道具
export const ITEMS = {
  health:  { sprite: 'flask_big_red',   animated: false },
  energy:  { sprite: 'flask_big_blue',  animated: false },
  coin:    { sprite: 'coin_anim',       animated: true,  frames: 4 },
  key:     { sprite: 'skull',           animated: false },
  potion:  { sprite: 'flask_blue',      animated: false },
  shield:  { sprite: 'crate',           animated: false },
  chest:   { sprite: 'chest_full_open_anim', animated: true, frames: 3 },
} as const

// 环境物件
export const ENVIRONMENT = {
  floor: ['floor_1','floor_2','floor_3','floor_4','floor_5','floor_6','floor_7','floor_8'],
  wall:  ['wall_left','wall_mid','wall_right','wall_top_left','wall_top_mid','wall_top_right'],
  door:  ['doors_leaf_closed','doors_leaf_open'],
  stairs:'floor_stairs',
  ladder:'floor_ladder',
  hole:  'hole',
  spike: 'floor_spikes_anim',
  chest: 'chest_full_open_anim',
  crate: 'crate',
  pillar:'column',
} as const

// UI
export const UI_SPRITES = {
  heartFull:  'ui_heart_full',
  heartEmpty:  'ui_heart_empty',
  heartHalf:   'ui_heart_half',
} as const
```

- [ ] **Step 2: 编译验证**

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 3: Commit**

```bash
git add src/assets/0x72/index.ts
git commit -m "refactor: 0x72 index.ts 用 spriteRegistry 重构分类导出"
```

---

## Task 3: 修正 config 配置文件 spriteName 引用

**Files:**
- Modify: `src/config/characters.ts`
- Modify: `src/config/enemies.ts`
- Modify: `src/config/items.ts`

### Task 3a: characters.ts

- [ ] **Step 1: 修正 warrior/ranger/mage/cleric 的 spriteName**

spriteName 引用 registry 中的准确条目（不含帧号）

### Task 3b: enemies.ts

- [ ] **Step 2: 修正 enemy spriteName（关键！）**

```typescript
// basic 史莱姆: slime_idle_anim_f0 (16x16)
spriteName: 'slime_idle_anim_f0'

// fast 哥布林: goblin_idle_anim_f0 (16x16)
spriteName: 'goblin_idle_anim_f0'

// tank 骷髅: skelet_idle_anim_f0 (16x16)
spriteName: 'skelet_idle_anim_f0'

// boss 恶魔: big_demon_idle_anim_f0 (32x36)
spriteName: 'big_demon_idle_anim_f0'
```

### Task 3c: items.ts

- [ ] **Step 3: 修正 item spriteName（关键！非动画项不得追加帧号）**

```typescript
// health: flask_big_red (无 _anim 后缀，非动画)
spriteName: 'flask_big_red'

// energy: flask_big_blue (无 _anim 后缀，非动画)
spriteName: 'flask_big_blue'

// coin: coin_anim_f0 (有 _anim 后缀，4帧动画)
spriteName: 'coin_anim_f0'

// key: skull (无动画)
spriteName: 'skull'

// potion: flask_blue (无 _anim 后缀)
spriteName: 'flask_blue'

// chest: chest_full_open_anim_f0 (3帧开门动画)
spriteName: 'chest_full_open_anim_f0'
```

- [ ] **Step 4: 编译验证**

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 5: Commit**

```bash
git add src/config/characters.ts src/config/enemies.ts src/config/items.ts
git commit -m "fix: config 配置文件 spriteName 引用对齐 spriteRegistry"
```

---

## Task 4: 修复 getAnimSprite BUG

**Files:**
- Modify: `src/pages/GamePage.tsx:113-126`

- [ ] **Step 1: 修复帧号拼接逻辑**

当前错误逻辑：
```typescript
// 基础名（无 _anim 后缀）→ 拼接 _fX → flask_big_blue_f0 (不存在！)
return `${spriteName}_f${frame}`
```

正确逻辑：
- 有 `_anim_fX` 后缀：替换帧号
- 无 `_anim` 但有 `_fX` 后缀（如 bomb）：替换帧号（bomb 只有 3 帧）
- 静态项（flask_big_blue, skull, weapon_* 等）：直接返回原名

```typescript
function getAnimSprite(spriteName: string, elapsedMs: number): string {
  const frame = Math.floor(elapsedMs / animInterval) % 4

  // 情况1: 有 _anim_fX 后缀 → 替换帧号
  if (/_anim_f\d+$/.test(spriteName)) {
    return spriteName.replace(/_f\d+$/, `_f${frame}`)
  }

  // 情况2: 无 _anim 但有 _fX 后缀（bomb_f0）→ 替换帧号（bomb 只有 3 帧）
  if (/_f\d+$/.test(spriteName)) {
    return spriteName.replace(/_f\d+$/, `_f${frame % 3}`)
  }

  // 情况3: 静态项（flask_big_blue, skull, weapon_* 等）→ 不追加帧号
  return spriteName
}
```

- [ ] **Step 2: 编译验证**

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 3: Commit**

```bash
git add src/pages/GamePage.tsx
git commit -m "fix: getAnimSprite 非动画精灵不追加帧号"
```

---

## Task 5: 环境/武器/UI 渲染路径（后续扩展）

当前游戏只用到了角色/怪物/道具。后续扩展：

- **Weapon rendering**: 在 `sprites.ts` 中添加 `drawWeaponSprite()`，从 `WEAPONS` 映射绘制
- **Environment**: 地牢墙壁/地板/门使用 `ENVIRONMENT` 中的 0x72 精灵替代像素绘制
- **UI hearts**: 用 `ui_heart_*` 替代 Canvas 绘制的爱心

---

## 验证计划

- [ ] **Step 1: TypeScript 编译** — `npx tsc --noEmit` 零错误
- [ ] **Step 2: Playwright E2E** — 登录→创建房间→选 Warrior→开始游戏→检查 console 无 `[0x72] Sprite not found` 警告
- [ ] **Step 3: 视觉验证** — 截图确认角色是像素骑士（而非色块），怪物是对应精灵

---

## 关键文件

| 文件 | 作用 |
|------|------|
| `src/assets/0x72/spriteIndex.ts` | 370条 flat 注册表，不修改 |
| `src/assets/0x72/spriteRegistry.ts` | **新建**，完整分类注册表 |
| `src/assets/0x72/spriteClassifier.ts` | **新建**，分类规则引擎 |
| `src/assets/0x72/index.ts` | 重构，导出分类数据 |
| `docs/sprites/0x72-classification.md` | **新建**，分类结果持久化文档（游戏实体→0x72 sprite 映射表） |
| `src/config/characters.ts` | 修正 spriteName 引用 |
| `src/config/enemies.ts` | 修正 spriteName 引用 |
| `src/config/items.ts` | 修正 spriteName 引用 |
| `src/pages/GamePage.tsx` | 修复 getAnimSprite BUG |
