# 贴图资产清单 (Sprite Inventory)

> 项目所有贴图资产的完整分类目录
> 资产策略：优先使用 0x72 Dungeon Tileset II (PWYW商业可用)，Kenney CC0 作为 fallback
> 生成时间：2026-03-29
> **交互预览（推荐）**：`sprite-viewer.html` — 97个精灵全部可视化，含 0x72 PNG 预览 + Kenney canvas 渲染
> **静态文档**：`docs/sprite-inventory.md` — 本文档，快速检索用

---

## 一、文件夹结构总览

```
src/assets/
├── 0x72/                          # 0x72 Dungeon Tileset II（主要来源）
│   ├── main_atlas.png             # 512×512 完整精灵图集 ✅ 使用中
│   ├── spriteIndex.ts             # 精灵坐标映射 (SPRITE_ATLAS)
│   ├── spriteRegistry.ts          # 分类注册表 (SPRITE_REGISTRY)
│   ├── index.ts                   # 模块导出
│   └── frames/                    # 预提取单帧 PNG（~280个，供人工预览）
│       ├── CHARACTER/             # 角色精灵
│       ├── MONSTER/               # 怪物精灵
│       ├── WEAPON/                # 武器精灵
│       ├── ITEM/                  # 道具精灵
│       ├── SCENE/                 # 场景精灵
│       └── UI/                    # UI精灵
│
├── kenney/                       # Kenney CC0 备选来源
│   └── Spritesheet/
│       ├── roguelikeChar_transparent.png   # 918×203 角色+装备 ✅ fallback
│       ├── roguelikeDungeon_transparent.png # 492×305 地牢+道具 ✅ fallback
│       ├── roguelikeSheet_transparent.png   # 968×526 怪物综合 ✅ fallback
│       └── pumpkin_dude.png                # 48×32 南瓜怪4帧动画 ✅
```

---

## 二、分类清单（与 `sprite-viewer.html` 完全 1:1 对应）

### 2.1 角色 (CHARACTER) — 18 0x72 + 4 Kenney

#### 0x72（18个）预览路径：`frames/CHARACTER/*.png`

| 贴图名称 | Atlas坐标 | 尺寸 | 游戏用途 | 状态 | 代码引用 |
|---------|----------|------|---------|------|---------|
| `knight_m_idle_anim_f0` | (128,100) | 16×28 | 战士 warrior 正面 | ✅ | `characters.ts:35` |
| `knight_m_idle_anim_f1` | (144,100) | 16×28 | 战士 warrior 背面 | ✅ | `characters.ts:35` |
| `knight_m_idle_anim_f2` | (160,100) | 16×28 | — | ❌ | |
| `knight_m_idle_anim_f3` | (176,100) | 16×28 | — | ❌ | |
| `knight_f_idle_anim_f0` | (128,68) | 16×28 | — | ❌ | |
| `elf_m_idle_anim_f0` | (128,36) | 16×28 | 游侠 ranger 正面 | ✅ | `characters.ts:49` |
| `elf_m_idle_anim_f1` | (144,36) | 16×28 | 游侠 ranger 背面 | ✅ | `characters.ts:49` |
| `elf_m_idle_anim_f2` | (160,36) | 16×28 | — | ❌ | |
| `elf_m_idle_anim_f3` | (176,36) | 16×28 | — | ❌ | |
| `elf_f_idle_anim_f0` | (128,4) | 16×28 | — | ❌ | |
| `wizzard_m_idle_anim_f0` | (128,164) | 16×28 | 法师 mage 正面 | ✅ | `characters.ts:63` |
| `wizzard_m_idle_anim_f1` | (144,164) | 16×28 | 法师 mage 背面 | ✅ | `characters.ts:63` |
| `wizzard_f_idle_anim_f0` | (128,132) | 16×28 | — | ❌ | |
| `wizzard_f_idle_anim_f1` | (144,132) | 16×28 | — | ❌ | |
| `dwarf_m_idle_anim_f0` | (128,292) | 16×28 | 牧师 cleric 正面 | ✅ | `characters.ts:77` |
| `dwarf_m_idle_anim_f1` | (144,292) | 16×28 | 牧师 cleric 背面 | ✅ | `characters.ts:77` |
| `dwarf_f_idle_anim_f0` | (128,260) | 16×28 | — | ❌ | |
| `lizard_m_idle_anim_f0` | (128,228) | 16×28 | — | ❌ | |
| `lizard_f_idle_anim_f0` | (128,196) | 16×28 | — | ❌ | |

#### 职业→精灵映射

| 职业 | 正面 | 背面 | 颜色 |
|------|------|------|------|
| warrior | `knight_m_idle_anim_f0` | `knight_m_idle_anim_f1` | #4A9EFF |
| ranger | `elf_m_idle_anim_f0` | `elf_m_idle_anim_f1` | #51CF66 |
| mage | `wizzard_m_idle_anim_f0` | `wizzard_m_idle_anim_f1` | #FFA500 |
| cleric | `dwarf_m_idle_anim_f0` | `dwarf_m_idle_anim_f1` | #9B59B6 |

---

### 2.2 怪物 (MONSTER) — 22 0x72 + 3 Kenney

#### 0x72（22个）

| 贴图名称 | Atlas坐标 | 尺寸 | 游戏用途 | 状态 | 代码引用 |
|---------|----------|------|---------|------|---------|
| `goblin_idle_anim_f0` | (368,40) | 16×16 | basic/fast 敌人 | ✅ | `enemies.ts:28` |
| `skelet_idle_anim_f0` | (368,88) | 16×16 | tank 敌人 | ✅ | `enemies.ts:58` |
| `big_demon_idle_anim_f0` | (16,428) | 32×36 | boss 敌人 | ✅ | `enemies.ts:74` |
| `angel_idle_anim_f0` | (368,304) | 16×16 | — | ❌ | |
| `chort_idle_anim_f0` | (368,273) | 16×23 | — | ❌ | |
| `necromancer_anim_f0` | (368,225) | 16×23 | — | ❌ | |
| `masked_orc_idle_anim_f0` | (368,153) | 16×23 | — | ❌ | |
| `orc_warrior_idle_anim_f0` | (368,177) | 16×23 | — | ❌ | |
| `orc_shaman_idle_anim_f0` | (368,201) | 16×23 | ⚠️ 已废弃 | ❌ | |
| `wogol_idle_anim_f0` | (368,249) | 16×23 | — | ❌ | |
| `imp_idle_anim_f0` | (368,64) | 16×16 | — | ❌ | |
| `tiny_zombie_idle_anim_f0` | (368,16) | 16×16 | — | ❌ | |
| `pumpkin_dude_idle_anim_f0` | (368,321) | 16×23 | — | ❌ | |
| `swampy_anim_f0` | (432,112) | 16×16 | — | ❌ | |
| `muddy_anim_f0` | (368,112) | 16×16 | — | ❌ | |
| `slug_anim_f0` | (368,369) | 16×23 | — | ❌ | |
| `tiny_slug_anim_f0` | (432,376) | 16×16 | — | ❌ | |
| `ice_zombie_anim_f0` | (432,136) | 16×16 | — | ❌ | |
| `zombie_anim_f10` | (368,136) | 16×16 | — | ❌ | |
| `big_zombie_idle_anim_f0` | (16,332) | 32×36 | — | ❌ | |
| `ogre_idle_anim_f0` | (16,380) | 32×36 | — | ❌ | |
| `doc_idle_anim_f0` | (368,345) | 16×23 | — | ❌ | |

#### 敌人→精灵映射

| 敌人 | 精灵 | 尺寸 | 颜色 |
|------|-----|------|------|
| basic | `goblin_idle_anim_f0` | 40px | #40B0B0 |
| fast | `goblin_idle_anim_f0` | 36px | #80C040 |
| tank | `skelet_idle_anim_f0` | 48px | #C0C0C0 |
| boss | `big_demon_idle_anim_f0` | 64px | #E08040 |

---

### 2.3 武器 (WEAPON) — 25 0x72

#### 0x72（25个）预览路径：`frames/WEAPON/*.png`

| 贴图名称 | Atlas坐标 | 尺寸 | 游戏用途 | 状态 | 代码引用 |
|---------|----------|------|---------|------|---------|
| `weapon_knight_sword` | (339,98) | 10×29 | 战士武器 | ✅ | `GamePage.tsx:548` |
| `weapon_arrow` | (324,202) | 7×21 | 子弹(bullet视觉) | ✅ | `sprites.ts:68` |
| `weapon_red_magic_staff` | (324,129) | 8×30 | 法师/牧师武器 | ✅ | `GamePage.tsx:550` |
| `weapon_bow` | (289,195) | 14×26 | 游侠武器 | ✅ | `GamePage.tsx:549` |
| `weapon_axe` | (341,74) | 9×21 | — | ❌ |
| `weapon_katana` | (293,66) | 6×29 | — | ❌ |
| `weapon_spear` | (309,161) | 6×30 | — | ❌ |
| `weapon_mace` | (339,39) | 10×24 | — | ❌ | |
| `weapon_hammer` | (307,39) | 10×24 | — | ❌ |
| `weapon_big_hammer` | (291,26) | 10×37 | — | ❌ |
| `weapon_anime_sword` | (322,65) | 12×30 | — | ✅ | `GamePage.tsx:410` |
| `weapon_duel_sword` | (325,97) | 9×30 | — | ❌ |
| `weapon_golden_sword` | (291,137) | 10×22 | — | ❌ |
| `weapon_lavish_sword` | (307,129) | 10×30 | — | ❌ |
| `weapon_red_gem_sword` | (339,10) | 10×21 | — | ❌ |
| `weapon_regular_sword` | (323,10) | 10×21 | — | ❌ |
| `weapon_rusty_sword` | (307,10) | 10×21 | — | ❌ |
| `weapon_saw_sword` | (307,70) | 10×25 | — | ❌ |
| `weapon_cleaver` | (310,108) | 9×19 | — | ❌ |
| `weapon_machete` | (294,105) | 5×22 | — | ❌ |
| `weapon_double_axe` | (288,167) | 16×24 | — | ❌ |
| `weapon_waraxe` | (324,168) | 12×23 | — | ❌ |
| `weapon_throwing_axe` | (340,161) | 10×14 | — | ❌ |
| `weapon_baton_with_spikes` | (323,41) | 10×22 | — | ❌ |
| `weapon_green_magic_staff` | (340,129) | 8×30 | cleric武器,mage子弹 | ✅ |

#### 职业→武器映射

| 职业 | 武器精灵 | 类型 |
|------|---------|------|
| warrior | `weapon_knight_sword` | 近战剑 |
| ranger | `weapon_bow` | 远程弓 |
| mage | `weapon_red_magic_staff` | 魔法杖 |
| cleric | `weapon_red_magic_staff` | 魔法杖 |

---

### 2.4 道具 (ITEM) — 13 0x72 + 4 Kenney

#### 0x72（13个）预览路径：`frames/ITEM/*.png`

| 贴图名称 | Atlas坐标 | 尺寸 | 游戏用途 | 状态 | 代码引用 |
|---------|----------|------|---------|------|---------|
| `flask_big_red` | (288,336) | 16×16 | 医疗包 health | ✅ | `items.ts:28` |
| `flask_big_blue` | (304,336) | 16×16 | 能量包 energy | ✅ | `items.ts:91` |
| `flask_big_green` | (320,336) | 16×16 | 治疗弹 healer bullet | ✅ | `useGameRenderer.ts:49` |
| `flask_big_yellow` | (336,336) | 16×16 | — | ❌ | |
| `flask_blue` | (304,352) | 16×16 | 药水 potion | ✅ | `items.ts:60` |
| `flask_red` | (288,352) | 16×16 | — | ❌ | |
| `flask_green` | (320,352) | 16×16 | — | ❌ | |
| `flask_yellow` | (336,352) | 16×16 | — | ❌ | |
| `coin_anim_f0` | (289,385) | 6×7 | 金币 coin | ✅ | `items.ts:39` |
| `skull` | (288,432) | 16×16 | 钥匙 key | ✅ | `items.ts:49` |
| `crate` | (288,408) | 16×24 | 护盾 shield | ✅ | `items.ts:71` |
| `chest_full_open_anim_f0` | (304,416) | 16×16 | 宝箱 chest | ✅ | `items.ts:101` |
| `bomb_f0` | (288,320) | 16×16 | — | ❌ | |

---

### 2.5 场景 (SCENE) — 16 0x72

#### 0x72（16个）预览路径：`frames/SCENE/*.png`

| 贴图名称 | Atlas坐标 | 尺寸 | 用途 | 状态 |
|---------|----------|------|-----|------|
| `wall_left` | (16,16) | 16×16 | 碰撞墙(fillRect绘制) | ❌ |
| `wall_mid` | (32,16) | 16×16 | — | ❌ |
| `wall_right` | (48,16) | 16×16 | — | ❌ |
| `floor_1` | (16,64) | 16×16 | — | ❌ |
| `floor_2` | (32,64) | 16×16 | — | ❌ |
| `floor_3` | (48,64) | 16×16 | — | ❌ |
| `floor_stairs` | (80,192) | 16×16 | 楼梯出口(0x72) | ✅ |
| `doors_leaf_closed` | (32,240) | 32×32 | — | ❌ |
| `column` | (80,80) | 16×48 | — | ❌ |
| `column_wall` | (96,80) | 16×48 | — | ❌ |
| `hole` | (96,144) | 16×16 | — | ❌ |
| `floor_spikes_anim_f0` | (16,192) | 16×16 | — | ❌ |
| `button_red_up` | (16,208) | 16×16 | — | ❌ |
| `button_blue_up` | (48,208) | 16×16 | — | ❌ |
| `lever_left` | (80,208) | 16×16 | — | ❌ |
| `lever_right` | (96,208) | 16×16 | — | ❌ |

> ⚠️ 地牢墙壁使用 `fillRect` 像素风格渲染，不依赖精灵贴图。

---

### 2.6 UI 元素 (UI) — 3 0x72

#### 0x72（3个）预览路径：`frames/UI/*.png`

| 贴图名称 | Atlas坐标 | 尺寸 | 用途 | 状态 |
|---------|----------|------|-----|------|
| `ui_heart_full` | (289,370) | 13×12 | (代码绘制血条) | ❌ |
| `ui_heart_empty` | (321,370) | 13×12 | — | ❌ |
| `ui_heart_half` | (305,370) | 13×12 | — | ❌ |

> ⚠️ UI 心形使用 `drawHPBar()` 代码绘制，未用精灵贴图。

---

## 三、精灵渲染函数索引

| 函数名 | 文件 | 用途 |
|-------|------|-----|
| `draw0x72Sprite()` | sprites.ts | 绘制0x72 Atlas精灵 |
| `drawCharacterSprite()` | sprites.ts | 绘制Kenney角色精灵 |
| `drawSheetSprite()` | sprites.ts | 绘制Kenney怪物精灵 |
| `drawDungeonSprite()` | sprites.ts | 绘制Kenney地牢精灵 |
| `drawWeaponSprite()` | sprites.ts | 绘制武器精灵（旋转朝鼠标） |
| `drawBulletSprite()` | sprites.ts | 绘制子弹精灵 |
| `drawHPBar()` | sprites.ts | 绘制像素血条 |
| `drawBossCrown()` | sprites.ts | 绘制BOSS皇冠 |

---

## 四、配置→渲染映射表

```
characters.ts ──→ SPRITE_REGISTRY ──→ draw0x72Sprite() ──→ main_atlas.png
enemies.ts ────→ SPRITE_REGISTRY ──→ draw0x72Sprite() ──→ main_atlas.png
items.ts ──────→ SPRITE_REGISTRY ──→ draw0x72Sprite() ──→ main_atlas.png
GamePage.tsx ──→ WEAPON_SPRITE ─────→ drawWeaponSprite() ──→ main_atlas.png
```

---

## 五、相关文档索引

- [交互预览（推荐）](../sprite-viewer.html) — 97精灵可视化
- [资源审计报告](resource-audit.md) — 像素级精灵图分析
- [角色配置](../src/config/characters.ts)
- [敌人配置](../src/config/enemies.ts)
- [统一精灵注册表](../src/config/sprites.ts)
