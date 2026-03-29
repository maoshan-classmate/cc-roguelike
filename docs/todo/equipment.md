# TODO — 装备系统

## 资源预留 ✅ 已完成
- [x] `src/config/items.ts` 添加 EQUIPMENT_SLOTS 常量（槽位 50-55）
- [ ] 实际装备精灵需从资源包提取到 dungeon sheet 空闲槽位

## 装备槽位规划

| 槽位 | 索引 | 名称 |
|------|------|------|
| weapon | 50 | 武器 |
| armor | 51 | 护甲 |
| helmet | 52 | 头盔 |
| boots | 53 | 鞋子 |
| ring | 54 | 戒指 |
| amulet | 55 | 护符 |

> 注意：shield 盾牌已使用 dungeon 索引 34

## 后续任务
- [ ] 从 Kenney 资源包提取装备图标到 dungeon sheet 槽位 50-55
- [ ] 实现装备穿戴逻辑
- [ ] 实现装备属性加成
