# TODO 和 BUG 列表

## UI 优化

### 页面图标替换 ✅ 已完成
- [x] 登录页面 emoji → 像素 SVG 图标
- [x] 大厅页面 emoji → 像素 SVG 图标
- [x] 房间页面 emoji → 像素 SVG 图标
- [x] 游戏页面 HUD emoji → 像素 SVG 图标
- [x] 房间页面头像 → 像素风格角色头像（战士/游侠/法师/牧师）

### UI 问题修复 ✅ 已完成
- [x] 修复按钮白色边框 → 移除边框 (`border: none`)
- [x] 修复 PlayerIcon 组件引用错误
- [x] 修复缺失的图标导入 (PixelSkull, PixelCrown 等)

### 游戏 Canvas 渲染 ✅ 已完成
- [x] 修复 DungeonSpritesheet 尺寸 (492px) 使精灵计算正确
- [x] 服务端发送地牢数据 (rooms, spawnPoint, exitPoint)
- [x] 客户端渲染地牢墙壁和地板瓦片
- [x] 渲染出口楼梯

### 全面 UI 优化 ✅ 已完成 (2026-03-28)
- [x] 引入 Tailwind CSS v4 (PostCSS 方式 `@tailwindcss/postcss`)
- [x] 配置像素主题色和 Tailwind `@theme` 变量
- [x] 加载 Kenney 像素字体 (Pixel/High/Mini/Mini Square Mono) @font-face
- [x] Canvas 血条 drawHPBar → 像素立体风格 (高光/阴影/分段)
- [x] Canvas 皇冠 drawBossCrown → fillRect 像素块皇冠 + 三色宝石
- [x] Canvas 箭头 drawDirectionArrow → fillRect 像素块箭头 + 阴影
- [x] Canvas 名称 drawNameTag → 暗色背景面板 + Kenney 字体
- [x] 登录页：消除 `━━━` `◆` `⚠` `>>> <<<` 装饰，改用 SVG 图标和 CSS 类
- [x] 大厅页：消除 `⚔` emoji，替换 `alert()` 为内联错误通知 (3s 自动消失)
- [x] 房间页：消除 `✓` `○` `◆` `⏳` Unicode 字符
- [x] PixelSprites：消除 `🛡️⚔️🔮✨` emoji 头像，改用内联 SVG
- [x] PixelSprites：消除 `⚔️🛡️🏹🧪` emoji 技能图标，改用 SVG
- [x] GameAssets：消除 `♥` `◆` `★` Unicode，改用 SVG 图标
- [x] 全局字体 Courier New → Kenney Mini Square Mono
- [x] 补全 CSS 变量 `--pixel-bg-dark: #1a0f1e`, `--pixel-white: #EEEEEE`
- [x] Playwright 逐页验证（登录/大厅/房间/游戏页）

### 游戏闭环 Bug 修复 (2026-03-28)
- [x] Bug 1: 精灵太小（玩家16px→32px，敌人按比例放大） ✅ Playwright 验证
- [x] Bug 2: 无墙壁碰撞（DungeonGenerator 生成碰撞网格，GameRoom 检测） ✅ Playwright 验证
- [x] Bug 3: 技能卡死（删除 SocketServer/GamePage 中所有 DEBUG console.log） ✅ Playwright 验证
- [x] Bug 4: 技能键自动重复（keydown 防重复，仅首次触发） ✅ Playwright 验证
- [x] Bug 5: speed_boost 技能无效（添加 speedBuff 到 PlayerState） ✅ 代码验证
- [x] Bug 6: 敌人伤害硬编码 10（从配置读取 attack） ✅ 代码验证
- [x] Bug 7: 道具掉落类型不匹配 health_pack→health ✅ 代码验证
- [x] Bug 8: 道具拾取未实现（GameRoom 检测玩家-道具碰撞并应用效果） ✅ 代码验证
- [x] Bug 9: gold/keys 始终为 0（PlayerState 添加 gold/keys，拾取时累加） ✅ 代码验证
- [x] Bug 10: 游戏结束未通知客户端（emit game:end） ✅ 代码验证
- [x] Bug 11: 楼层切换未通知客户端（emit game:floor:start） ✅ 代码验证

### 地牢生成 + 精灵修复 ✅ 已完成 (2026-03-28)
- [x] Bug: 精灵太小看不清（玩家48px、敌人48-64px、道具28px、子弹16px）
- [x] Bug: 房间尺寸配置错误（6px→96px，改为像素单位）
- [x] Bug: 玩家被锁死在墙内（BSP深度3+最小叶子140px+走廊加宽+出生点3x3清除）
- [x] Bug: 走廊太窄（collisionPadding=1，走廊宽度2-3 tiles）

### 角色职业 + 移动修复 ✅ 已完成 (2026-03-28)
- [x] 角色贴图与职业不匹配（全链路 characterType: DB→AuthManager→GameRoom→客户端渲染）
- [x] 停止移动时贴图消失（移除 input guard，每帧发送含 dx=0,dy=0 的输入包）
- [x] 按一下方向键持续移动（改为 33ms 节流发送输入，松开键发零速度包）
- [x] RoomPage 添加职业选择 UI（战士/游侠/法师/牧师 四选一）
- [x] SocketServer 添加 room:selectClass 事件处理
- [x] Database ALTER TABLE 添加 character_type 列

### 待优化
- [ ] 优化技能栏图标
- [ ] 添加地牢楼层切换动画
- [ ] 利用 roguelikeSheet_transparent.png 第三张精灵图增加更多精灵种类

## 待解决问题（下次继续）

### 怪物/角色精灵问题
- [ ] 当前敌人贴图（索引25-28）不是怪物，是空白占位符
- [ ] 怪物贴图需要找 16x16 pixel art 风格匹配的资源
- [ ] Floor tile (索引4) 颜色丑陋，需要换更好的地牢地板贴图

### 地图墙壁问题
- [ ] 墙壁太密不自然，需要调整地牢生成算法或贴图

### 代码清理
- [ ] GamePage.tsx 有部分 sheetSpriteSheet 修改未完成，需检查是否需要回滚
- [ ] `roguelikeSheet_transparent.png` 已复制到 public/ 待删除

## 当前 BUG

### 1. 房主无法准备和开始游戏 ✅ 已修复
- **问题**：房主创建房间后，显示"开始游戏"按钮但被禁用，因为房主没有准备
- **修复**：让所有玩家都能准备，房主准备后可以开始游戏

### 2. 游戏无法移动和攻击 ✅ 已修复
- **问题**：游戏开始后玩家无法移动和攻击
- **根因**：
  - 服务器端：`GameRoom.start()` 中 tick 计数器递增但从未调用 `update(dt)` 处理游戏逻辑
  - 客户端：React 闭包问题，游戏循环使用 `players` state 是旧值
- **已修复**：
  - 服务器端添加 `this.update(dt)` 调用
  - 客户端使用 `gameStateRef` 确保读取最新状态
- **验证**：Playwright 测试确认游戏状态正常同步

### 3. 技能类型 case 错误 ⚠️ 已修复
- **问题**：`Combat.ts` 中技能 switch 使用 `'shield'` `'speed_boost'` 作为 case，但 skill.type 是 `'active'`
- **修复**：改为使用 `skill.type` 匹配正确的 case 值

### 4. DungeonGenerator 初始化错误 ⚠️ 已修复
- **问题**：`random` 属性没有初始化就使用
- **修复**：添加确定赋值断言 `random!`

### 5. 子弹碰撞删除逻辑错误 ✅ 已修复
- **问题**：`checkBulletCollision` 用 `splice` 从 `getState()` 副本删除子弹，而非实际 bullets Map
- **修复**：在 GameRoom 添加 `removeBullet()` 方法

### 6. 敌人类型不匹配 ✅ 已修复
- **问题**：FLOOR_CONFIG 用 `'slime'/'bat'`，ENEMIES 用 `'basic'/'fast'/'tank'`
- **修复**：统一使用 `'basic'/'fast'/'tank'`

### 7. createEnemy 硬编码 HP ✅ 已修复
- **问题**：总是用 `baseHp = 50`，忽略敌人类型
- **修复**：根据敌人类型从 ENEMY_BASE_HP 映射获取正确 HP

### 8. 道具类型不匹配 ✅ 已修复
- **问题**：DungeonGenerator 生成 `'health_pack'/'energy_pack'`，ITEMS 配置是 `'health'/'energy'`
- **修复**：统一使用 `'health'/'energy'`

### 9. 子弹精灵索引错误 ✅ 已修复
- **问题**：子弹使用精灵索引 30 (energy) 和 31 (coin)
- **修复**：改用正确的子弹精灵索引 35

### 10. 其他待发现...

## TODO 功能完善

### 高优先级
- [ ] 修复房间玩家列表显示问题（玩家状态可能不同步）
- [ ] 修复游戏开始后地图/敌人显示问题
- [ ] 添加错误提示（网络断开等）
- [ ] 测试游戏移动和攻击是否正常工作

### 中优先级
- [ ] 添加更多武器类型
- [ ] 添加更多技能
- [ ] 完善地牢生成算法
- [ ] 添加商店系统

### 低优先级
- [ ] 添加音效
- [ ] 添加好友系统
- [ ] 添加成就系统

## 已完成

- [x] 用户注册/登录
- [x] 创建房间
- [x] 加入房间
- [x] 房间准备逻辑
- [x] 多人 Socket 连接
- [x] 地牢程序生成
- [x] 战斗系统基础
- [x] 弹幕系统
- [x] GameRoom.update() 游戏循环修复
- [x] UI 图标全面替换为像素 SVG
- [x] 全面 UI 优化：Tailwind CSS + 像素字体 + 消除所有 emoji/Unicode
- [x] Canvas 像素艺术风格血条/皇冠/箭头/名称标签
