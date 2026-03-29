# 统一 Sprite Registry 架构重构计划

> **问题根因：** 当前 sprite 资源没有统一管理——Kenney 和 0x72 各一套，config 分散，无单一索引。需要建立统一分类注册表，按 CHARACTER/MONSTER/WEAPON/ITEM/SCENE/UI 分类，所有游戏配置引用同一 Registry。

---

## 现状分析

```
src/assets/kenney/index.ts        → 只有文件路径，无分类
src/assets/0x72/spriteIndex.ts   → flat 370条，无分类
src/assets/0x72/spriteRegistry.ts → 0x72 有分类（新建）
src/config/sprites.ts             → 纯绘图工具，无分类元数据
src/config/characters.ts          → 引用 Kenney spriteIndex，分散
src/config/enemies.ts            → 引用 Kenney spriteIndex，分散
src/config/items.ts              → 引用 Kenney spriteIndex，分散
```

**缺失的关键层：** `src/config/sprites.ts` 应改造为**统一 Sprite Registry**，所有游戏实体配置都引用它。

---

## 文件结构

```
src/config/
├── sprites.ts        ← 重构：统一 Sprite Registry + 绘图工具
├── characters.ts      ← 修改：spriteName 引用 Registry key
├── enemies.ts        ← 修改：spriteName 引用 Registry key
└── items.ts         ← 修改：spriteName 引用 Registry key

src/assets/kenney/
└── (现有文件不变)
```

---

## Task 1: 重构 sprites.ts → 统一 Sprite Registry

**Files:**
- Modify: `src/config/sprites.ts`

- [ ] **Step 1: 定义 SpriteSource 类型 + Registry 结构**

```typescript
/**
 * 精灵来源
 */
export type SpriteSource = 'kenney' | '0x72'

/**
 * 统一精灵分类
 */
export type SpriteCategory =
  | 'CHARACTER'   // 游戏角色
  | 'MONSTER'     // 怪物
  | 'WEAPON'      // 武器
  | 'ITEM'        // 可拾取道具
  | 'SCENE'       // 场景（墙/地板/门/机关）
  | 'UI'          // UI 元素

/**
 * 统一精灵条目
 */
export interface SpriteEntry {
  id: string           // 唯一键名，如 'knight_m_idle'
  category: SpriteCategory
  source: SpriteSource
  /** Kenney: spriteIndex (grid); 0x72: spriteName (atlas key) */
  kenneyIndex?: number
  ox72Name?: string
  size: number         // 渲染尺寸（px）
  animated: boolean
  frameCount: number    // 0 = 静态
}
```

- [ ] **Step 2: 从 0x72 spriteRegistry 导入数据**

```typescript
import { SPRITE_REGISTRY as OX72_REGISTRY, GAME_ENTITY_SPRITES } from '../assets/0x72/spriteRegistry'
```

- [ ] **Step 3: 合并 Kenney 分类数据**

Kenney 没有结构化 registry，手动建立 CHARACTER/MONSTER/ITEM 的 Kenney 分支：

```typescript
export const SPRITE_REGISTRY: Record<string, SpriteEntry> = {
  // ─── 0x72 ───────────────────────────────────────────────────────────
  // CHARACTER
  'knight_m_idle':   { id: 'knight_m_idle',   category: 'CHARACTER', source: '0x72', ox72Name: 'knight_m_idle_anim_f0',   size: 32, animated: true,  frameCount: 4 },
  'elf_m_idle':      { id: 'elf_m_idle',      category: 'CHARACTER', source: '0x72', ox72Name: 'elf_m_idle_anim_f0',       size: 32, animated: true,  frameCount: 4 },
  'wizzard_m_idle':  { id: 'wizzard_m_idle',  category: 'CHARACTER', source: '0x72', ox72Name: 'wizzard_m_idle_anim_f0',  size: 32, animated: true,  frameCount: 4 },
  'orc_shaman_idle': { id: 'orc_shaman_idle', category: 'CHARACTER', source: '0x72', ox72Name: 'orc_shaman_idle_anim_f0', size: 32, animated: true,  frameCount: 4 },
  // ─── MONSTER ────────────────────────────────────────────────────────
  'goblin_idle':    { id: 'goblin_idle',    category: 'MONSTER', source: '0x72', ox72Name: 'goblin_idle_anim_f0',    size: 32, animated: true, frameCount: 4 },
  'skelet_idle':    { id: 'skelet_idle',    category: 'MONSTER', source: '0x72', ox72Name: 'skelet_idle_anim_f0',    size: 32, animated: true, frameCount: 4 },
  'big_demon_idle': { id: 'big_demon_idle', category: 'MONSTER', source: '0x72', ox72Name: 'big_demon_idle_anim_f0', size: 64, animated: true, frameCount: 4 },
  // ─── WEAPON ──────────────────────────────────────────────────────────
  'weapon_knight_sword':  { id: 'weapon_knight_sword',  category: 'WEAPON', source: '0x72', ox72Name: 'weapon_knight_sword',  size: 32, animated: false, frameCount: 1 },
  'weapon_arrow':         { id: 'weapon_arrow',         category: 'WEAPON', source: '0x72', ox72Name: 'weapon_arrow',         size: 32, animated: false, frameCount: 1 },
  'weapon_red_magic_staff':{id:'weapon_red_magic_staff',category:'WEAPON', source: '0x72', ox72Name:'weapon_red_magic_staff', size: 32, animated: false, frameCount: 1 },
  // ─── ITEM ───────────────────────────────────────────────────────────
  'flask_big_red':    { id: 'flask_big_red',    category: 'ITEM', source: '0x72', ox72Name: 'flask_big_red',    size: 28, animated: false, frameCount: 1 },
  'flask_big_blue':   { id: 'flask_big_blue',   category: 'ITEM', source: '0x72', ox72Name: 'flask_big_blue',   size: 28, animated: false, frameCount: 1 },
  'coin_anim':        { id: 'coin_anim',        category: 'ITEM', source: '0x72', ox72Name: 'coin_anim_f0',      size: 28, animated: true,  frameCount: 4 },
  'skull':            { id: 'skull',            category: 'ITEM', source: '0x72', ox72Name: 'skull',            size: 28, animated: false, frameCount: 1 },
  'crate':            { id: 'crate',            category: 'ITEM', source: '0x72', ox72Name: 'crate',            size: 28, animated: false, frameCount: 1 },
  'chest_full_open':  { id: 'chest_full_open',  category: 'ITEM', source: '0x72', ox72Name: 'chest_full_open_anim_f0', size: 28, animated: true, frameCount: 3 },
  // ─── SCENE ───────────────────────────────────────────────────────────
  'wall_left':      { id: 'wall_left',      category: 'SCENE', source: '0x72', ox72Name: 'wall_left',      size: 32, animated: false, frameCount: 1 },
  'wall_mid':       { id: 'wall_mid',       category: 'SCENE', source: '0x72', ox72Name: 'wall_mid',       size: 32, animated: false, frameCount: 1 },
  'wall_right':     { id: 'wall_right',     category: 'SCENE', source: '0x72', ox72Name: 'wall_right',     size: 32, animated: false, frameCount: 1 },
  'doors_leaf_closed': { id: 'doors_leaf_closed', category: 'SCENE', source: '0x72', ox72Name: 'doors_leaf_closed', size: 64, animated: false, frameCount: 1 },
  'floor_stairs':   { id: 'floor_stairs',   category: 'SCENE', source: '0x72', ox72Name: 'floor_stairs',   size: 32, animated: false, frameCount: 1 },
  // ─── UI ───────────────────────────────────────────────────────────────
  'ui_heart_full':  { id: 'ui_heart_full',  category: 'UI', source: '0x72', ox72Name: 'ui_heart_full',  size: 26, animated: false, frameCount: 1 },
  'ui_heart_empty': { id: 'ui_heart_empty', category: 'UI', source: '0x72', ox72Name: 'ui_heart_empty', size: 26, animated: false, frameCount: 1 },
}
```

- [ ] **Step 4: 添加 `getSpriteEntry()` 查找函数**

```typescript
export function getSpriteEntry(id: string): SpriteEntry | undefined {
  return SPRITE_REGISTRY[id]
}

export function getSpritesByCategory(category: SpriteCategory): SpriteEntry[] {
  return Object.values(SPRITE_REGISTRY).filter(e => e.category === category)
}
```

- [ ] **Step 5: 保留原有绘图工具（draw0x72Sprite 等），不删除**

- [ ] **Step 6: 编译验证** → `npx tsc --noEmit`

- [ ] **Step 7: Commit**

---

## Task 2: 重构 characters.ts → 引用 Registry

**Files:**
- Modify: `src/config/characters.ts`

将 Kenney spriteIndex 替换为 Registry `id` 引用：

```typescript
// 原: spriteIndex: 0
spriteName: 'knight_m_idle'   // → 指向 SPRITE_REGISTRY['knight_m_idle']
```

- [ ] 编译验证 → `npx tsc --noEmit`
- [ ] Commit

---

## Task 3: 重构 enemies.ts → 引用 Registry

**Files:**
- Modify: `src/config/enemies.ts`

```typescript
// 原: spriteIndex: 1671
spriteName: 'goblin_idle'   // → 指向 SPRITE_REGISTRY['goblin_idle']
```

- [ ] 编译验证 → `npx tsc --noEmit`
- [ ] Commit

---

## Task 4: 重构 items.ts → 引用 Registry

**Files:**
- Modify: `src/config/items.ts`

```typescript
// health
spriteName: 'flask_big_red'    // → SPRITE_REGISTRY['flask_big_red']
// coin
spriteName: 'coin_anim'       // → SPRITE_REGISTRY['coin_anim']
// key
spriteName: 'skull'            // → SPRITE_REGISTRY['skull']
```

- [ ] 编译验证 → `npx tsc --noEmit`
- [ ] Commit

---

## Task 5: 重构 GamePage.tsx → 使用 Registry 统一渲染

**Files:**
- Modify: `src/pages/GamePage.tsx`

- [ ] 将所有 `drawCharacterSprite/...` 调用改为查 Registry → `source` 判断用 Kenney 还是 0x72 渲染器
- [ ] 统一 `getAnimSprite` 使用 Registry 中的 `frameCount` 判断是否动画（而非字符串检测）
- [ ] 编译验证 → `npx tsc --noEmit`
- [ ] Playwright E2E 验证
- [ ] Commit

---

## 验证

- [ ] `npx tsc --noEmit` 零错误
- [ ] Playwright E2E：登录→游戏→零 `[0x72] Sprite not found` 警告
- [ ] 截图确认角色/怪物/道具渲染正确

---

## 关键文件

| 文件 | 作用 |
|------|------|
| `src/config/sprites.ts` | 重构为统一 Sprite Registry + 绘图工具 |
| `src/config/characters.ts` | 改用 Registry id 引用 |
| `src/config/enemies.ts` | 改用 Registry id 引用 |
| `src/config/items.ts` | 改用 Registry id 引用 |
| `src/pages/GamePage.tsx` | 统一渲染入口 |
| `docs/sprites/0x72-classification.md` | 已有的 0x72 分类文档 |
| `src/assets/0x72/spriteRegistry.ts` | 已有的 0x72 分类数据 |
