---
description: 游戏常量速查 — 职业属性/敌人配置/色系/地牢尺寸，开发时免 grep
alwaysApply: true
---

# 游戏常量速查

## 职业配置

| 职业 | HP | ATK | DEF | 速度(px/s) | 贴图 | 武器贴图 |
|------|-----|-----|-----|-----------|------|---------|
| warrior | 100 | 15 | 10 | 180 | knight_m | weapon_knight_sword |
| ranger | 80 | 12 | 5 | 220 | elf_m | weapon_bow |
| mage | 60 | 20 | 3 | 180 | wizzard_m | weapon_red_magic_staff |
| cleric | 70 | 8 | 6 | 190 | dwarf_m | weapon_green_magic_staff |

## 敌人配置

| 类型 | HP | ATK | 速度 | 尺寸 | 碰撞半径 | 贴图源 |
|------|-----|-----|------|------|---------|--------|
| basic | 30 | 5 | 1.0 | 40 | 16 | generated |
| fast | 20 | 8 | 2.0 | 36 | 14 | generated |
| ghost | 40 | 12 | 1.2 | 42 | -- | generated |
| tank | 80 | 10 | 0.5 | 48 | 20 | 0x72 |
| boss | 200 | 20 | 0.8 | 64 | 28 | 0x72 |

## 职业攻击路径（五条独立，不可混用）

- warrior: sword 近战，不产生子弹
- ranger: weapon_arrow 箭矢
- mage: `drawMagicOrb()` 紫色能量弹
- cleric: `spawnHealWave()` AoE 治疗波 (maxRadius=80px)
- enemy: 红色能量弹

## 色系

- FLOOR=#3A2E2C, GRID=#504440, WALL=#5C4A3A, BG=#1A1210
- 网格线与底色色差须 >30 色阶

## 地牢尺寸

- 1024×768 (32×24 tiles, tile=32px)
