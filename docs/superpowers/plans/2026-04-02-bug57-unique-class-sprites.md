# Bug #57: 职业贴图唯一性修复 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 牧师武器贴图与法师重复（都是 `weapon_red_magic_staff`），子弹贴图所有职业共用 `weapon_arrow`，需要让每个职业的角色/武器/子弹贴图完全唯一。

**Architecture:** 4层修复 — ① 注册未使用的贴图到 SPRITE_REGISTRY ② 分配唯一武器/子弹贴图给每个职业 ③ 修改渲染逻辑支持职业级子弹贴图分发 ④ 同步三文件（sprites.ts / sprite-inventory.md / sprite-viewer.html）。

**Tech Stack:** React 18 + Canvas + TypeScript + 0x72 Dungeon Tileset II

---

## 问题诊断摘要

| 维度 | 当前状态 | 问题 |
|------|---------|------|
| 角色贴图 | wizzard_f(cleric) vs wizzard_m(mage) — atlas坐标不同 | **无问题**，实际不重复 |
| 武器贴图 | mage=cleric=`weapon_red_magic_staff` | **BUG: 重复** |
| 子弹贴图 | 所有职业=`weapon_arrow`（硬编码） | **BUG: 全部相同** |
| 子弹颜色 | 4种不同光晕颜色 | 已唯一，但被箭矢贴图覆盖 |

## 贴图分配方案（最终态）

| 职业 | 角色贴图 | 武器贴图 | 子弹贴图 |
|------|---------|---------|---------|
| warrior | `knight_m_*` | `weapon_knight_sword` | `weapon_arrow`（保留，战士射箭合理） |
| ranger | `elf_m_*` | `weapon_bow` | `weapon_arrow`（保留，游侠射箭合理） |
| mage | `wizzard_m_*` | `weapon_red_magic_staff` | `weapon_green_magic_staff`（绿色法杖尖端发光弹） |
| **cleric** | `wizzard_f_*` | **`weapon_green_magic_staff`**（新增） | **`weapon_mace`**（锤头光球） |

**选择理由：**
- `weapon_green_magic_staff` → 绿色法杖，坐标 (340,129)，尺寸 8×30，与红色法杖同形异色，符合牧师"自然/治愈"主题
- 子弹：mage 用 `weapon_green_magic_staff` 渲染绿色魔法弹（与武器一致），cleric 用 `weapon_mace` 渲染锤头光球
- warrior/ranger 本来就射箭，保持 `weapon_arrow` 合理

---

## Task 1: 注册新贴图到 SPRITE_REGISTRY

**Files:**
- Modify: `src/config/sprites.ts`（WEAPON 部分新增 `weapon_green_magic_staff` 条目）

**Owner:** 贴图资产三文件管理员

- [ ] **Step 1: 确认 atlas 坐标**

运行 `grep "weapon_green_magic_staff" src/assets/0x72/spriteIndex.ts` 确认坐标为 (340, 129)，尺寸 8×30。

- [ ] **Step 2: 在 SPRITE_REGISTRY 的 WEAPON 部分添加条目**

在 `src/config/sprites.ts` 中，找到 `weapon_red_magic_staff` 条目附近，在其下方添加：

```ts
weapon_green_magic_staff: {
  source: '0x72',
  atlasKey: 'weapon_green_magic_staff',
  category: SpriteCategory.WEAPON,
  size: { w: 8, h: 30 },
  animated: false,
  frameCount: 1,
},
```

- [ ] **Step 3: 验证编译**

Run: `npx tsc --noEmit`
Expected: 零 error

- [ ] **Step 4: Commit**

```bash
git add src/config/sprites.ts
git commit -m "feat: register weapon_green_magic_staff in SPRITE_REGISTRY"
```

---

## Task 2: 修改武器贴图映射 — cleric 使用独立武器

**Files:**
- Modify: `src/hooks/useGameRenderer.ts:45-50`（WEAPON_SPRITE 映射）

**Owner:** 开发工程师

- [ ] **Step 1: 修改 WEAPON_SPRITE 映射**

在 `src/hooks/useGameRenderer.ts` 中，找到 WEAPON_SPRITE 定义：

```ts
// 修改前
const WEAPON_SPRITE: Record<string, string> = {
  warrior: 'weapon_knight_sword',
  ranger:  'weapon_bow',
  mage:    'weapon_red_magic_staff',
  cleric:  'weapon_red_magic_staff',   // BUG: 与 mage 重复
}

// 修改后
const WEAPON_SPRITE: Record<string, string> = {
  warrior: 'weapon_knight_sword',
  ranger:  'weapon_bow',
  mage:    'weapon_red_magic_staff',
  cleric:  'weapon_green_magic_staff',  // 修复: 牧师使用绿色法杖
}
```

- [ ] **Step 2: 验证编译**

Run: `npx tsc --noEmit`
Expected: 零 error

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useGameRenderer.ts
git commit -m "fix: cleric weapon sprite unique — green magic staff"
```

---

## Task 3: 修改子弹渲染逻辑 — 支持职业级贴图分发

**Files:**
- Modify: `src/hooks/useGameRenderer.ts`（子弹渲染循环 + BULLET_SPRITE 映射）
- Modify: `src/config/sprites.ts`（drawBulletSprite 函数签名）

**Owner:** 开发工程师

- [ ] **Step 1: 在 useGameRenderer.ts 添加子弹贴图映射**

在 `BULLET_COLORS` 下方添加：

```ts
const BULLET_SPRITE: Record<string, string> = {
  warrior: 'weapon_arrow',
  ranger:  'weapon_arrow',
  mage:    'weapon_green_magic_staff',
  cleric:  'weapon_mace',
}
```

- [ ] **Step 2: 修改 drawBulletSprite 函数签名**

在 `src/config/sprites.ts` 中，将 `drawBulletSprite` 的硬编码 `weapon_arrow` 改为接受 `spriteName` 参数：

```ts
// 修改前
export function drawBulletSprite(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number, y: number,
  angle: number,
  size: number = 12
): void {
  const entry = SPRITE_ATLAS['weapon_arrow']  // 硬编码
  ...

// 修改后
export function drawBulletSprite(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number, y: number,
  angle: number,
  size: number = 12,
  spriteName: string = 'weapon_arrow'  // 默认值保持向后兼容
): void {
  const entry = SPRITE_ATLAS[spriteName]  // 动态查找
  ...
```

函数内部其余逻辑不变（已有的 fallback 分支等保持原样）。

- [ ] **Step 3: 修改子弹渲染循环**

在 `src/hooks/useGameRenderer.ts` 的子弹渲染循环中，将 `drawBulletSprite` 调用改为传入职业对应的贴图名：

```ts
// 修改前
if (tileset2Atlas.complete) {
  const bulletAngle = Math.atan2(bullet.vy, bullet.vx)
  const bulletSize = Math.max((bullet.radius || 4) * 3, 10)
  drawBulletSprite(ctx, tileset2Atlas, bullet.x, bullet.y, bulletAngle, bulletSize)
}

// 修改后
if (tileset2Atlas.complete) {
  const bulletAngle = Math.atan2(bullet.vy, bullet.vx)
  const bulletSize = Math.max((bullet.radius || 4) * 3, 10)
  const bulletSprite = bullet.friendly
    ? (BULLET_SPRITE[bullet.ownerType] || 'weapon_arrow')
    : 'weapon_arrow'
  drawBulletSprite(ctx, tileset2Atlas, bullet.x, bullet.y, bulletAngle, bulletSize, bulletSprite)
}
```

- [ ] **Step 4: 验证编译**

Run: `npx tsc --noEmit`
Expected: 零 error

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useGameRenderer.ts src/config/sprites.ts
git commit -m "feat: per-class bullet sprites — mage=green_staff, cleric=mace"
```

---

## Task 4: 同步三文件（sprites.ts → sprite-inventory.md → sprite-viewer.html）

**Files:**
- Modify: `docs/sprite-inventory.md`（新增 weapon_green_magic_staff 条目）
- Modify: `sprite-viewer.html`（新增 weapon_green_magic_staff 条目）

**Owner:** 贴图资产三文件管理员

- [ ] **Step 1: 确认 sprites.ts 已注册 weapon_green_magic_staff**

在 Task 1 中已完成。验证：
```bash
grep "weapon_green_magic_staff" src/config/sprites.ts
```

- [ ] **Step 2: 在 sprite-inventory.md 添加条目**

在 `docs/sprite-inventory.md` 的 WEAPON 部分，找到 `weapon_red_magic_staff` 条目附近，添加：

```markdown
| weapon_green_magic_staff | 0x72 | WEAPON | 340 | 129 | 8 | 30 | false | true | 绿色魔法杖，cleric专用 |
```

各字段需与 sprites.ts 的注册信息一致（source=0x72, atlasKey=weapon_green_magic_staff, category=WEAPON）。

- [ ] **Step 3: 在 sprite-viewer.html 添加条目**

在 `sprite-viewer.html` 中，找到 WEAPON 类型的条目区域，添加 weapon_green_magic_staff 的 JavaScript 数据条目：

```javascript
{ name: 'weapon_green_magic_staff', x: 340, y: 129, w: 8, h: 30, cat: 'WEAPON', src: '0x72', u: true }
```

- [ ] **Step 4: 三文件一致性验证**

```bash
grep "weapon_green_magic_staff" src/config/sprites.ts docs/sprite-inventory.md sprite-viewer.html
# 三处必须同时出现
```

- [ ] **Step 5: Commit**

```bash
git add docs/sprite-inventory.md sprite-viewer.html
git commit -m "sync: weapon_green_magic_staff three-file sync"
```

---

## Task 5: 补充 BulletState 类型定义

**Files:**
- Modify: `src/store/useGameStore.ts`（BulletState 接口）

**Owner:** 开发工程师

- [ ] **Step 1: 确认当前 BulletState 接口**

读取 `src/store/useGameStore.ts`，找到 BulletState 接口。如果缺少 `ownerType` 字段则添加：

```ts
// 确保包含 ownerType 字段
interface BulletState {
  id: string
  x: number
  y: number
  vx: number
  vy: number
  ownerId: string
  ownerType: string     // 必须存在，用于 BULLET_COLORS 和 BULLET_SPRITE 查找
  damage: number
  friendly: boolean
  piercing: number
  radius?: number
}
```

- [ ] **Step 2: 验证编译**

Run: `npx tsc --noEmit`
Expected: 零 error

- [ ] **Step 3: Commit**

```bash
git add src/store/useGameStore.ts
git commit -m "fix: add ownerType to BulletState interface"
```

---

## Task 6: E2E 闭环测试 — Playwright 验证

**Files:**
- 无文件变更，纯验证

**Owner:** Playwright 测试工程师

- [ ] **Step 1: 启动开发服务器**

```bash
npm run dev
```
确认前端 3000 和后端 3001 端口正常监听。

- [ ] **Step 2: 使用 Playwright MCP 执行完整流程**

按照 `docs/playwright.md` 中的流程：
1. 登录 → 创建房间 → 选择法师职业 → 准备 → 开始冒险
2. 截图确认：法师武器显示为红色法杖（`weapon_red_magic_staff`），子弹为绿色魔法弹
3. 返回房间 → 选择牧师职业 → 准备 → 开始冒险
4. 截图确认：牧师武器显示为绿色法杖（`weapon_green_magic_staff`），子弹为锤头光球（`weapon_mace`）
5. 检查控制台无 `[0x72] Sprite not found` 错误

- [ ] **Step 3: 验证所有4个职业**

依次选择 warrior/ranger/mage/cleric，确认：
- 每个职业武器贴图唯一且正确
- 每个职业子弹贴图/颜色唯一且正确
- 控制台零 sprite 错误

- [ ] **Step 4: 报告测试结果**

输出测试报告到对话中，包含截图证据和验证结果。

---

## Task 7: 蓝军审查 — 全面挑刺

**Files:**
- 无文件变更（发现问题则创建新 Task）

**Owner:** 蓝军攻击者

- [ ] **Step 1: 审查贴图分配方案合理性**

检查点：
- `weapon_green_magic_staff` 是否在 atlas 中确实存在且坐标正确？
- `weapon_mace` 作为 cleric 子弹贴图是否视觉合理？（锤头光球 vs 治疗弹）
- 是否有更合适的未使用贴图？（如 `weapon_spear`、`weapon_hammer`）
- 4个职业的角色贴图是否真的不重复？（wizzard_f vs wizzard_m atlas 坐标确认）

- [ ] **Step 2: 审查代码变更质量**

检查点：
- `drawBulletSprite` 新参数是否有默认值？向后兼容？
- `BULLET_SPRITE` 映射是否覆盖了所有可能的 `ownerType` 值？
- 如果 `bullet.ownerType` 为 undefined（敌方子弹），是否正确 fallback？
- `weapon_mace` 在 SPRITE_REGISTRY 中是否已注册且坐标正确？
- 三文件同步是否完全一致（坐标/尺寸/source/category）？

- [ ] **Step 3: 审查边界情况**

检查点：
- 多人同屏时，4个职业的子弹是否能正确区分？
- 断线重连后子弹贴图是否正确？
- 旧角色（数据库中 weapon 字段为空或 pistol）的处理是否兼容？
- `isMelee` 判断是否需要调整？（cleric 用 staff，不应被判定为 melee）

- [ ] **Step 4: 输出审查报告**

格式：
```
🟢 通过项: ...
🟡 建议项: ...
🔴 必修项: ...
```

如果发现必修项，创建新 Task 并指回开发工程师修复。

---

## Task 8: Bug #57 标记完成 + 文档更新

**Files:**
- Modify: `docs/todo/bugs.md`（标记 Bug #57 为已修复）

**Owner:** 开发工程师

- [ ] **Step 1: 编译检查**

Run: `npx tsc --noEmit`
Expected: 零 error

- [ ] **Step 2: 标记 Bug #57 完成**

在 `docs/todo/bugs.md` 中，将 Bug #57 行改为：
```markdown
- [x] 牧师角色贴图与法师贴图重复、武器也重复。每个职业的角色、武器、攻击子弹贴图必须要唯一。利用好贴图资产三文件里面未使用的贴图。 — 2026-04-02 cleric武器改用weapon_green_magic_staff，子弹按职业分发(mage=green_staff, cleric=mace)
```

- [ ] **Step 3: 最终 Commit**

```bash
git add docs/todo/bugs.md
git commit -m "docs: mark Bug #57 as fixed"
```
