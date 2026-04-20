---
description: 贴图三文件同步铁律 — sprites.ts ↔ sprite-inventory.md ↔ sprite-viewer.html 必须一致
globs:
  - "src/config/sprites.ts"
  - "docs/sprite-inventory.md"
  - "sprite-viewer.html"
  - "src/config/characters.ts"
  - "src/config/enemies.ts"
  - "src/config/items.ts"
---

# 贴图三文件同步铁律

## 三个文件必须完全一致

```
sprite-viewer.html  ↔  docs/sprite-inventory.md  ↔  src/config/sprites.ts
```

## 规则

- 任一改动必须同步更新其他两处
- 禁止只改其中 1-2 个文件
- 禁止假设"运行时不被引用就忽略"

## SPRITE_REGISTRY 是唯一数据源

- 所有 config 的 `spriteName` 值必须是 Registry key
- 渲染路径必须通过 `getSpriteEntry(spriteName)`
- 禁止硬编码 sprite key（除 config 初始定义）

## 验证命令

```bash
grep "目标sprite名" sprite-viewer.html docs/sprite-inventory.md src/config/sprites.ts
# 三处必须同时出现且 source/atlasKey 完全一致
```

## 新资产引入流程

解析 → 语义分类(CHARACTER/MONSTER/WEAPON/ITEM/SCENE/UI) → 持久化(TS+MD+HTML) → 编译验证

## 角色种族跨种族分配（铁律）

- warrior=knight_m, ranger=elf_m, mage=wizzard_m, cleric=dwarf_m
- 禁止同系列重复（男女变体在 48px 下视觉不可区分）

## AI 生成精灵背景透明化（铁律）

- 背景色 RGB≈25,17,14，渲染时产生黑框
- 必须执行逐帧主导色检测 + 阈值透明化（tolerance=30）
