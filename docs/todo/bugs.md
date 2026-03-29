# TODO — Bug 修复清单

> 详细修复记录。

## 高优先级

### 已修复
- [x] 敌人贴图错误（索引25-28空白 → 角色表16/20/24/34）
- [x] 地板/墙壁不对齐（精灵边框接缝 → fillRect像素风格）
- [x] 背景网格消失（添加 import.meta.env.DEV 叠加层）
- [x] 走廊不可见（添加 corridorTiles 协议）
- [x] 敌人穿墙（isWalkable()空网格返回false）
- [x] 碰撞网格空数组危险fallback
- [x] 房间玩家列表显示问题 — 2026-03-29 E2E验证通过
- [x] 角色贴图偶尔看不见 — 2026-03-29 修复onerror/naturalWidth检查
- [x] 角色移动速度过快 — 2026-03-29 改用CLASS_SPEED(180-220px/s)
- [x] 角色技能无法释放 — 2026-03-29 4技能槽位+skillId匹配
- [x] 四种职业都远程子弹攻击 — 2026-03-29 class→weapon映射(warrior=sword)
- [x] 角色子弹贴图不匹配 — 2026-03-29 按characterType区分子弹颜色+发光
- [x] 怪物寻路卡墙角 — 2026-03-29 isWalkableRadius+随机偏移避障
- [x] 角色/怪物移动无过渡动画 — 2026-03-29 客户端lerp插值
- [x] 副本网格太小 — 2026-03-29 1024×768(32×24 tiles)
- [x] 怪物贴图错误 — 2026-03-29 roguelikeSheet正确索引(1671/1721/1648/1725) + drawSheetSprite()
- [x] 当鼠标移动到左右两边时，角色贴图会消失 — 2026-03-29 改为front/back+Canvas翻转，修复空白索引引用
- [x] 怪物贴图不像怪物 — 2026-03-29 资源审计后替换为roguelikeSheet正确索引(史莱姆1671/蝙蝠1665/骷髅1648/恶魔1668)
- [x] 角色武器贴图与设定不符合 — 2026-03-29 子弹颜色按职业区分(warrior金/ranger蓝/mage紫/cleric绿)
- [x] 角色使用1-4任意一个技能之后，游戏卡死且技能无效果 — 2026-03-29 4技能槽位修复
- [x] 角色死亡之后，游戏没有任何提示 — 2026-03-29 40%透明精灵+"☠ 已阵亡"红色文字标记
- [x] 地板颜色丑陋+网格不可见 — 2026-03-29 石褐色色系+网格线色差30+阶，tile级碰撞网格渲染
- [x] 墙壁密度/位置不对 — 2026-03-29 改用collisionGrid逐tile渲染，视觉=物理边界
- [x] 怪物穿墙 — 2026-03-29 碰撞半径按敌人类型分配(basic:16/fast:14/tank:20/boss:28)
- [x] 角色身上有一个白色棍子，确认是什么东西。如无必要需要移除.如有必要，需要用0x72的资源去替换。因为这个武器看不出是什么东西。 — 2026-03-29 根因：drawDirectionArrow 白色12px方向指示器叠加在玩家头顶，已移除该绘制调用（GamePage.tsx）；废弃 PixelSprites/GameAssets/images 目录已清理
- [x] 职业选择法师，无法进行游戏。职业选择游侠和牧师，攻击方式完全相同。 — 2026-03-29 handleSelectClass 同时更新 lobby 内存，handleRoomStart 优先读内存；cleric 武器改为 staff
- [x] 角色技能只有1可用，234技能都不可用。且没有明显的交互反馈和冷却提示。 — 2026-03-29 DB DEFAULT 改为4技能，GameRoom skill fallback 补齐旧角色
- [x] 角色死亡后没有弹窗。 — 2026-03-29 GameRoom update() 加全灭检测，设置 _gameOver 触发 game:end
- [x] 角色图标过小，攻击范围与实际图标大小不符。 — 2026-03-29 SPRITE_REGISTRY CHARACTER size 32→48（atlas原始16px，scale=3x放大到48px使角色在768px canvas中清晰可见）；PLAYER_BASE.radius 保持 20；白色棍子 drawDirectionArrow 已移除
### 未修复

## 中优先级

### 已修复
### 未修复
- [ ] 没有怪物图鉴系统
- [ ] 没有职业系统
## 低优先级

### 已修复
### 未修复
