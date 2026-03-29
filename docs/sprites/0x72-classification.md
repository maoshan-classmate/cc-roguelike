# 0x72 Dungeon Tileset II — 精灵分类文档

> License: Pay What You Want (Commercial use permitted)
> Source: https://0x72.itch.io/dungeontileset-ii
> 分类维度：语义种类（角色/怪物/场景/道具/武器/UI）+ 游戏命名
> 尺寸/帧数 作为 metadata 记录，不作为分类依据

---

## 角色 CHARACTER

| 游戏职业 | 0x72 Sprite Key | 尺寸 | idle帧 | run帧 |
|---------|----------------|------|--------|-------|
| warrior | knight_m | 16×28 | f0-f3 | f0-f3 |
| ranger | elf_m | 16×28 | f0-f3 | f0-f3 |
| mage | wizzard_m | 16×28 | f0-f3 | f0-f3 |
| cleric | orc_shaman | 16×23 | f0-f3 | f0-f3 |

**额外角色（当前游戏未使用）:**
| 名称 | 0x72 Sprite Key | 尺寸 |
|------|----------------|------|
| 骑士女 | knight_f | 16×28 |
| 精灵女 | elf_f | 16×28 |
| 女巫女 | wizzard_f | 16×28 |
| 矮人男 | dwarf_m | 16×28 |
| 矮人女 | dwarf_f | 16×28 |
| 蜥蜴男 | lizard_m | 16×28 |
| 蜥蜴女 | lizard_f | 16×28 |

---

## 怪物 MONSTER

| 游戏ID | 名称 | 0x72 Sprite Key | 尺寸 | idle帧 | run帧 |
|--------|------|----------------|------|--------|-------|
| basic | 史莱姆 | ~~slime~~(atlas无)→**goblin** | 16×16 | f0-f3 | f0-f3 |
| fast | 哥布林 | goblin | 16×16 | f0-f3 | f0-f3 |
| tank | 骷髅 | skelet | 16×16 | f0-f3 | f0-f3 |
| boss | 恶魔领主 | big_demon | 32×36 | f0-f3 | f0-f3 |

> ⚠️ slime 不存在于 atlas，需从 Kenney roguelikeSheet 导入作为 fallback

**额外怪物（当前游戏未使用）:**
| 名称 | 0x72 Sprite Key | 尺寸 |
|------|----------------|------|
| 小僵尸 | big_zombie | 32×36 |
| 食人魔 | ogre | 32×36 |
| 小鬼/imps | imp | 16×16 |
| 天使 | angel | 16×16 |
| 妖灵 | chort | 16×23 |
| 暗影法师 | necromancer | 16×23 |
| 南瓜头 | pumpkin_dude | 16×23 |
| 沃格尔 | wogol | 16×23 |
| 蒙面兽 | masked_orc | 16×23 |
| 兽战 | orc_warrior | 16×23 |
| 史莱姆(毒) | swampy | 16×16 |
| 泥怪 | muddy | 16×16 |
| -doc- | doc | 16×23 |
| 蛞蝓 | slug | 16×23 |
| 小蛞蝓 | tiny_slug | 16×16 |
| 小僵尸 | tiny_zombie | 16×16 |
| 冰僵尸 | ice_zombie | 16×16 |

---

## 武器 WEAPON

| 游戏武器 | 0x72 Sprite Key | 尺寸 |
|---------|----------------|------|
| sword | weapon_knight_sword | 10×29 |
| pistol/ranger | weapon_arrow | 7×21 |
| staff/mage | weapon_red_magic_staff | 8×30 |
| 备用近战 | weapon_regular_sword | 10×21 |
| 备用 | weapon_katana | 6×29 |
| 备用 | weapon_golden_sword | 10×22 |
| 备用 | weapon_lavish_sword | 10×30 |
| 备用 | weapon_red_gem_sword | 10×21 |
| 备用 | weapon_rusty_sword | 10×21 |
| 备用 | weapon_saw_sword | 10×25 |
| 备用 | weapon_duel_sword | 9×30 |
| 备用 | weapon_anime_sword | 12×30 |
| 备用 | weapon_axe | 9×21 |
| 备用 | weapon_waraxe | 12×23 |
| 备用 | weapon_double_axe | 16×24 |
| 备用 | weapon_throwing_axe | 10×14 |
| 备用 | weapon_machete | 5×22 |
| 备用 | weapon_cleaver | 9×19 |
| 备用 | weapon_hammer | 10×24 |
| 备用 | weapon_big_hammer | 10×37 |
| 备用 | weapon_spear | 6×30 |
| 备用 | weapon_mace | 10×24 |
| 备用 | weapon_baton_with_spikes | 10×22 |
| 弓 | weapon_bow | 14×26 |
| 弓2 | weapon_bow_2 | 14×26 |
| 绿杖 | weapon_green_magic_staff | 8×30 |

---

## 道具 ITEM

| 游戏ID | 名称 | 0x72 Sprite Key | 尺寸 | 动画 | 帧数 |
|--------|------|----------------|------|------|------|
| health | 医疗红 | flask_big_red | 16×16 | 无 | 1 |
| energy | 能量蓝 | flask_big_blue | 16×16 | 无 | 1 |
| potion | 药水蓝 | flask_blue | 16×16 | 无 | 1 |
| — | 绿瓶 | flask_big_green | 16×16 | 无 | 1 |
| — | 黄瓶 | flask_big_yellow | 16×16 | 无 | 1 |
| — | 小红 | flask_red | 16×16 | 无 | 1 |
| — | 小绿 | flask_green | 16×16 | 无 | 1 |
| — | 小黄 | flask_yellow | 16×16 | 无 | 1 |
| coin | 金币 | coin_anim | 6×7 | 有 | 4 |
| chest | 宝箱 | chest_full_open_anim | 16×16 | 有 | 3 |
| — | 空箱 | chest_empty_open_anim | 16×16 | 有 | 3 |
| — | 宝箱怪 | chest_mimic_open_anim | 16×16 | 有 | 3 |
| shield | 护盾/木箱 | crate | 16×24 | 无 | 1 |
| key | 钥匙/骷髅 | skull | 16×16 | 无 | 1 |
| — | 炸弹 | bomb_f | 16×16 | 有 | 3帧(f0-f2) |

---

## 场景 SCENE

### 地板 FLOOR
| 名称 | 0x72 Sprite Key | 尺寸 |
|------|----------------|------|
| 地板1-8 | floor_1~floor_8 | 16×16 |
| 楼梯 | floor_stairs | 16×16 |
| 梯子 | floor_ladder | 16×16 |
| 陷阱(动画) | floor_spikes_anim | 16×16 |
| 坑 | hole | 16×16 |

### 墙壁 WALL
| 名称 | 0x72 Sprite Key | 尺寸 |
|------|----------------|------|
| 墙-左 | wall_left | 16×16 |
| 墙-中 | wall_mid | 16×16 |
| 墙-右 | wall_right | 16×16 |
| 墙-顶左 | wall_top_left | 16×16 |
| 墙-顶中 | wall_top_mid | 16×16 |
| 墙-顶右 | wall_top_right | 16×16 |

### 门 DOOR
| 名称 | 0x72 Sprite Key | 尺寸 |
|------|----------------|------|
| 门框左 | doors_frame_left | 16×32 |
| 门框右 | doors_frame_right | 16×32 |
| 门框顶 | doors_frame_top | 32×16 |
| 门-关 | doors_leaf_closed | 32×32 |
| 门-开 | doors_leaf_open | 32×32 |

### 装饰 DECORATION
| 名称 | 0x72 Sprite Key | 尺寸 |
|------|----------------|------|
| 石柱 | column | 16×48 |
| 墙柱 | column_wall | 16×48 |
| 板条箱 | crate | 16×24 |
| 边缘下 | edge_down | 16×16 |

### 墙装饰 WALL_DECORATION
| 类型 | 0x72 Sprite Key |
|------|----------------|
| 边缘系 | wall_edge_*, wall_outer_* |
| 洞 | wall_hole_1, wall_hole_2 |
| 旗 | wall_banner_blue, wall_banner_red, wall_banner_green, wall_banner_yellow |
| 喷泉(蓝/红) | wall_fountain_mid_blue_anim, wall_fountain_mid_red_anim (3帧) |
| 喷泉盆 | wall_fountain_basin_red_anim, wall_fountain_basin_blue_anim (3帧) |
| 墙-Gooh | wall_goo_base, wall_goo |

### 机关 MECHANISM
| 名称 | 0x72 Sprite Key |
|------|----------------|
| 按钮-红上/下 | button_red_up, button_red_down |
| 按钮-蓝上/下 | button_blue_up, button_blue_down |
| 拉杆-左/右 | lever_left, lever_right |

---

## UI

| 名称 | 0x72 Sprite Key | 尺寸 |
|------|----------------|------|
| 血条-满 | ui_heart_full | 13×12 |
| 血条-空 | ui_heart_empty | 13×12 |
| 血条-半 | ui_heart_half | 13×12 |

---

## 游戏实体 → 0x72 最终映射（当前游戏使用）

### 角色 CHARACTER

| 游戏职业 | idle base | run base | back帧 | 尺寸 |
|---------|-----------|---------|--------|------|
| warrior | knight_m_idle_anim | knight_m_run_anim | f1 | 16×28 |
| ranger | elf_m_idle_anim | elf_m_run_anim | f1 | 16×28 |
| mage | wizzard_m_idle_anim | wizzard_m_run_anim | f1 | 16×28 |
| cleric | orc_shaman_idle_anim | orc_shaman_run_anim | f1 | 16×23 |

### 敌人 MONSTER

| 游戏ID | idle base | 尺寸 | 备注 |
|--------|-----------|------|------|
| basic | goblin_idle_anim | 16×16 | ⚠️ slime不在atlas |
| fast | goblin_idle_anim | 16×16 | — |
| tank | skelet_idle_anim | 16×16 | — |
| boss | big_demon_idle_anim | 32×36 | — |

### 道具 ITEM

| 游戏ID | sprite key | 动画 | 帧数 |
|--------|-----------|------|------|
| health | flask_big_red | 无 | 1 |
| energy | flask_big_blue | 无 | 1 |
| coin | coin_anim | 有 | 4 |
| key | skull | 无 | 1 |
| potion | flask_blue | 无 | 1 |
| shield | crate | 无 | 1 |
| chest | chest_full_open_anim | 有 | 3 |

### 武器 WEAPON

| 游戏武器 | sprite key | 尺寸 |
|---------|-----------|------|
| sword | weapon_knight_sword | 10×29 |
| pistol | weapon_arrow | 7×21 |
| staff | weapon_red_magic_staff | 8×30 |

---

## 帧动画规则

| 格式 | 例子 | 规则 |
|------|------|------|
| `{name}_anim_f{n}` | knight_m_idle_anim_f0 | 有 `_anim_fX`：替换帧号 |
| `{name}_f{n}` | bomb_f0 | 有 `_fX` 无 `_anim`：替换帧号（bomb 3帧→%3） |
| 静态名 | flask_big_blue | 无 `_anim` 无 `_fX`：直接返回原名 |
