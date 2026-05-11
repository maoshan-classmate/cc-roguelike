# doc-stale-scanner 判定模式与案例

> agent 启动时读取本文件，按当前 Phase 编号定位对应段落。
> 扫描中发现新的判定模式或假阳性时，追加到对应段落末尾。

---

## Phase 1 路径引用

**验证方法**：提取 .md 中的文件路径 → Glob 验证存在性

**真实案例**：

```
文档写的:
  .claude/rules/rendering.md 的 globs 字段:
    - "src/pages/GamePage.tsx"

实际:
  src/pages/GamePage.tsx 不存在
  文件已拆分为 src/pages/game/index.tsx, GameCanvas.tsx, GameHUD.tsx, GameOverlay.tsx, DebugMenu.tsx
  → 🔴 globs 应改为 "src/pages/game/**"
```

```
文档写的:
  CLAUDE.md 索引: [Pencil UI 设计架构](pencil/docs/architecture.md)

实际:
  pencil/ 目录不存在，从未创建
  → 🔴 死链接，应删除该索引行
```

```
文档写的:
  CLAUDE.md 资源管理: 入口目录 assets/inbox/

实际:
  assets/inbox/ 目录不存在
  实际入口是 src/assets/ 下对应子目录
  → 🔴 路径引用不存在的目录
```

**假阳性**：
- architecture-guard.md 列出 `server/game/player/` 目录职责 → 该目录不存在但 player 逻辑在 GameRoom.ts 中 → 🔵 建议更新描述，不标 🔴（逻辑还在）

---

## Phase 2 状态标记

**验证方法**：读"待修复"/`[ ]` 项的问题关键词 → Grep 代码找修复实现

**真实案例**：

```
文档写的 (docs/bugs/combat.md:31):
  - **状态**: 🔴 待修复
  问题描述: 技能冷却中按键仍可触发

实际代码:
  src/hooks/useGameInput.ts:72 有 isSkillOnCooldown 检查
  src/pages/game/index.tsx:416 实现了 isSkillOnCooldown
  src/pages/game/index.tsx:354 有 SKILL_REJECTED 处理器
  → 🔴 已修复，文档应标 ✅
```

```
文档写的 (docs/requirements.md:21):
  - [ ] 四种职业的攻击方式应匹配自身定位（战士近战/游侠远程等）

实际代码:
  shared/character-definitions.ts 定义了 attackType: melee / ranged_bullet / ranged_heal
  → 🔴 已实现，应标 [x]
```

**假阳性**：
- requirements.md `- [ ] 房间玩家列表显示不同同步` → 部分实现但仍有问题 → 拿不准标 🔵 不标 🔴

---

## Phase 3 源码注释

**验证方法**：Grep `@deprecated|TODO|FIXME|// any:|不注册|未实现` → 逐项验证

**真实案例**：

```
注释写的 (shared/types.ts:111):
  angle: number;           // @deprecated 迁移期保留，由 aimAngle 替代

实际代码:
  server/game/GameRoom.ts:320-322 仍在做 player.angle = input.aimAngle 双写
  server/game/combat/SkillHandlers.ts:122 handleDodgeRoll 直接使用 player.angle
  src/rendering/entityRenderer.ts:312 客户端做 player.aimAngle ?? player.angle 兜底
  → 🔴 角度 仍是活跃字段，@deprecated 误导开发者以为可安全移除
```

```
注释写的 (src/config/sprites.ts:53):
  // wizzard_f_idle_anim_f2/f3: 存在于atlas但未被任何角色使用（cleric仅用f0/f1），不注册

实际代码 (同文件第 64-65 行):
  wizzard_f_idle_anim_f2: { category: 'CHARACTER', source: '0x72', ... },
  wizzard_f_idle_anim_f3: { category: 'CHARACTER', source: '0x72', ... },
  → 🔴 注释说"不注册"但下面就是注册代码，矛盾
```

```
注释写的 (src/config/items.ts:162):
  * - 装备图标叠加在角色精灵上方（通过 drawEquipmentOverlay 实现）

实际代码:
  Grep drawEquipmentOverlay → 0 结果，函数从未实现
  → 🔴 注释引用不存在的函数
```

```
文件写的 (src/assets/0x72/index.ts):
  // Deprecated - This file only exists for backwards compatibility with imports

实际:
  Grep "from.*0x72/index" → 0 结果，无任何导入者
  → 🔴 死代码，应删除
```

**假阳性**：
- `// any:` 注释理由是否成立需人工判断 → 只标 🔵

---

## Phase 4 数值准确性

**验证方法**：读代码定义文件 → 与文档逐字段对比

**真实案例**：

```
文档写的 (.claude/rules/game-constants.md 敌人表格):
  | basic | 30 | 8 | 1.0 | 40 | 16 | generated |
  | fast  | 20 | 10 | 2.0 | 36 | 14 | generated |
  | ghost | 40 | 12 | 1.2 | 42 | -- | generated |

实际代码 (shared/enemy-definitions.ts):
  basic:  { hp: 30, attack: 8, speed: 60,  radius: 16 }
  fast:   { hp: 20, attack: 10, speed: 120, radius: 14 }
  ghost:  { hp: 40, attack: 12, speed: 70,  radius: 16 }

差异:
  - 速度列: 文档 1.0/2.0/1.2 vs 代码 60/120/70 (px/s) → 🔴 单位不匹配
  - ghost 碰撞半径: 文档 "--" vs 代码 16 → 🔴 缺失值
  - 贴图源: 文档 "generated" vs 代码无 spriteSource 字段 (sheet='sheet') → 🔴 来源标记错误
```

```
文档写的 (docs/sprite-inventory.md:20):
  预提取单帧 PNG（~280个，供人工预览）

实际:
  Glob src/assets/0x72/frames/**/*.png → 370 个文件
  → 🔴 统计偏差过大
```

---

## Phase 5 配置-代码同步

**验证方法**：读 rules/ 中的目录表和 globs → Glob 验证

**真实案例**：

```
文档写的 (architecture-guard.md 目录职责表):
  | server/game/player/ | 玩家逻辑 | 敌人/碰撞/道具 |
  | server/game/skill/  | 技能系统 | 伤害计算（归 combat） |

实际:
  Glob server/game/player/* → 无结果
  Glob server/game/skill/*  → 无结果
  → 🔴 两个目录不存在
```

---

## Phase 6 死代码

**验证方法**：Grep `Deprecated|废弃` → 验证是否有导入者

**真实案例**：

```
文件 (src/assets/0x72/index.ts):
  // Deprecated - This file only exists for backwards compatibility with imports
  export { SPRITE_ATLAS, type SpriteEntry } from './spriteIndex';
  export const mainAtlasPath = '/src/assets/0x72/main_atlas.png';

验证:
  Grep "from.*0x72/index" → 0 结果（排除自身）
  Grep "mainAtlasPath" → 仅在定义处出现
  → 🔴 无导入者，死代码可删除

文档引用:
  CLAUDE.md:286 "src/assets/0x72/index.ts — 已废弃"
  architecture-guard.md:137 "禁止 import 废弃文件：src/assets/0x72/index.ts"
  → 🔴 文档仍引用已删除文件
```

---

## Phase 7 贴图资源

**验证方法**：对比 SPRITE_REGISTRY 条目数 vs 文档声明、source 标记

**真实案例**：

```
文档写的 (sprite-inventory.md 标题):
  ### 2.2 怪物 (MONSTER) — 23 0x72 + 3 generated + 3 Kenney

实际:
  SPRITE_REGISTRY 中 category: 'MONSTER' 的 0x72 条目数可能不同
  "3 Kenney" 引用的 src/assets/kenney/ 目录不存在
  → 🔴 统计不符 + 引用不存在目录
```

```
文档写的 (sprite-inventory.md:84):
  | skelet_idle_anim_f0 | ... | tank 敌人 | ✅ | enemies.ts:58 |

实际:
  src/config/enemies.ts 只有 42 行，定义已移至 shared/enemy-definitions.ts
  → 🔴 行号引用失效
```

```
文档写的 (sprite-inventory.md:46):
  | knight_m_idle_anim_f0 | ... | 战士 | ✅ | characters.ts:35 |

实际:
  src/config/characters.ts 只有 60 行，精灵定义在 shared/character-definitions.ts
  → 🔴 文件名和行号都过时
```

**假阳性**：
- 文档没列 run/hit 动画帧但 Registry 有注册 → 🔵 不标 🔴

---

## Phase 8 音效资源

**验证方法**：对比 SFX_IDS 定义 vs 文档清单、验证使用状态

**真实案例**：

```
文档写的 (docs/audio/implementation-plan.md:79):
  if (['1', '2', '3', '4'].includes(skillKey))

实际代码:
  src/hooks/useGameInput.ts:49 只使用 ['1', '2', '3']（3 个技能槽）
  → 🔴 技能键数量错误
```

---

## Phase 9 页面-组件映射

**验证方法**：读 components.md 映射 → Grep 页面文件的 import 语句

**真实案例**：

```
文档写的 (docs/components.md:33):
  - LoginPage → PixelButton / PixelInput / PixelCard

实际代码 (src/pages/LoginPage.tsx):
  无 import PixelButton / PixelInput / PixelCard
  实际 import: motion, DungeonParticles, AnimatedSprite
  → 🔴 页面根本没用像素组件库
```

---

## Phase 10 目录结构

**验证方法**：读 project-structure.md → Glob 验证列出的目录 → ls 检查遗漏

**真实案例**：

```
文档写的 (docs/project-structure.md):
  列出 src/assets/images/      # SVG 图标资源
  列出 src/assets/kenney/       # Kenney CC0 备选

实际:
  src/assets/images/ 不存在
  src/assets/kenney/ 不存在
  → 🔴 两个目录不存在

文档遗漏:
  未列出 shared/ (types.ts/constants.ts/protocol.ts/character-definitions.ts/enemy-definitions.ts)
  未列出 src/rendering/ (7 个渲染器文件)
  未列出 src/audio/ (SoundEngine.ts/sfx.ts/useSound.ts)
  未列出 server/game/collision/、combat/、enemy/、status/、dungeon/
  → 🔵 大量核心目录遗漏
```

---

## Phase 11 跨文档一致性

**验证方法**：同一事实在多处出现 → 对比是否矛盾

**真实案例**：

```
CLAUDE.md:305 写:
  4 技能槽: dash/shield/heal/speed_boost 按职业不同排列

shared/types.ts 实际定义:
  SkillId = 'dash' | 'war_cry' | 'shield_bash' | 'dodge_roll' | 'arrow_rain' | 'frost_nova' | 'meteor' | 'holy_light' | 'sanctuary'

→ 🔴 文档的技能名和数量与代码完全不符
```

---

## Phase 12 技术描述

**验证方法**：Grep 过时技术名称 → 读上下文确认 → 读实际代码验证

**真实案例**：

```
文档写的 (docs/DEVELOPMENT_STANDARD.md:188):
  数据层（MySQL via ORM）

实际代码:
  server/data/Database.ts 使用 require('better-sqlite3')
  → 🔴 技术选型描述错误，不是 MySQL 也不是 ORM
```

```
文档写的 (CLAUDE.md:218):
  netstat -ano | grep LISTENING | grep -E "300[01]"

实际:
  项目在 Windows PowerShell 环境下，grep 不可用
  正确命令: netstat -ano | findstr "300[01]"
  → 🔴 命令在项目实际环境不可用
```

---

## 发现记录

> agent 每次扫描后，在此追加新发现的判定模式或假阳性案例。
> 格式：`- YYYY-MM-DD | Phase N | 描述`

- 2026-05-11 | 初始版本 | 从首次全项目扫描中提取的真实案例
