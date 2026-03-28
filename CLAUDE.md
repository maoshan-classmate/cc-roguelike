# CLAUDE.md

## 项目概述

这是一个局域网多人联机 Roguelike 闯关游戏，使用 React + Canvas + Node.js + Socket.io + MySQL。

**游戏主题：地牢探险**
- 风格：暗黑地牢、哥特风格、剑与魔法
- 美术：暗色系（深紫黑背景 #2D1B2E）
- 玩法：地牢爬行者、多人合作闯关、技能战斗

## 调试经验

### React StrictMode 问题
- useEffect 在开发环境会执行两次（setup + cleanup）
- Socket 连接和监听器注册要在 cleanup 中**不要**发送 disconnect/leave 消息
- 清理时只清理监听器，不要发送 leave 消息

### Socket.io 连接
- 客户端直接连接后端端口：`io('http://localhost:3001', { transports: ['websocket', 'polling'] })`
- 不要依赖 Vite proxy 转发 WebSocket（不稳定）

### Session 管理
- 创建房间后用户自动加入房间（session.currentRoom 已设置）
- 后续 join 同一房间时服务端应检查 `session.currentRoom === roomId`，避免重复 join
- 用户切换页面时不要清除 session，只在明确点击"离开"按钮时才发 `room:leave`

## Bug 模式警告

### 1. 地牢生成尺寸单位
- `ROOM_MIN_SIZE` / `ROOM_MAX_SIZE` 单位是**像素**，不是 tile（32px=1 tile，所以最小96px=3 tiles）
- BSP 最小叶子尺寸必须 >= ROOM_MIN_SIZE + padding，否则生成的房间为 0px
- 走廊是 1px 宽的线段，碰撞网格必须加 `corridorPadding`（至少1 tile）才能让 48px 精灵通过
- 出生/出口点必须强制清除周围 3x3 tile 区域，不能假设 BSP 房间一定覆盖

### 2. 精灵尺寸规范（800x600 Canvas）
- 玩家：48px，敌人 basic=48/fast=44/tank=56/boss=64
- 道具：28px，子弹：16px
- HP条/名称标签偏移量随精灵 size 调整：玩家 HP 条 y = size/2 + 偏移，名称 y = size/2 + 更大偏移

### 3. getState() 返回副本
- `GameRoom.getState()` 返回的是内部状态的**副本**
- 修改副本（如 `splice`、`push`）不会影响实际数据
- 修复：在 GameRoom 中添加专用方法（如 `removeBullet()`）直接修改 Map

### 4. 服务端/客户端类型必须匹配
- FLOOR_CONFIG.enemyTypes 用 `'slime'/'bat'`，但 ENEMIES 用 `'basic'/'fast'`
- DungeonGenerator 生成 `'health_pack'`，但 ITEMS 配置是 `'health'`
- 修复：确保服务端 constants.ts 和客户端 config 文件使用相同的 ID

### 5. Switch case 用 skill.type 的陷阱
- `shield` 和 `speed_boost` 的 type 都是 `'active'`
- 用 `skill.type` 做 switch case 会导致多个 skill 走到同一个分支
- 修复：用 `skillId` 替代 `skill.type` 做 switch 匹配

### 6. Input Guard 反模式（移动/射击指令）
- `if (dx !== 0 || dy !== 0)` 这类 guard 会阻止 dx=0/dy=0 的静止包发送
- 结果：松开方向键后玩家仍然持续移动
- 正确做法：移除 guard，用节流（33ms）代替，避免无意义的空包也能保证松开键立即停止
- 验证：松开键后玩家应立即停下，不是逐渐减速

### 7. Per-Player 数据全链路模式
- 新增角色属性（如 character_type）需要同时修改多处：
  1. Database.ts: CREATE/ALTER TABLE 添加列
  2. AuthManager: Character 接口 + register/login/getCharacter 返回该字段
  3. GameRoom: PlayerState 接口 + addPlayer() 设置
  4. SocketServer: 事件处理（如 room:selectClass）更新 DB
  5. 客户端: 通过 game:state 同步后直接使用 player.characterType 渲染
- 漏掉任一环节会导致数据不匹配或渲染错误

### 8. ALTER TABLE 向后兼容
- 新增列时必须同时写 CREATE TABLE 和 ALTER TABLE 两部分
- ALTER TABLE 用 try/catch 包裹，检查 error.message 包含 'Duplicate column'
- 示例：Database.ts CREATECharactersTable 末尾添加
  try { await this.pool.execute('ALTER TABLE ...'); } catch (e: any) {
    if (!e.message.includes('Duplicate column')) throw e; }

### 9. 技能键 keydown 防重复
- 直接监听 keydown 会因为键盘重复输入产生大量事件（按住1秒 = 30+ 事件）
- 修复：用 Set 记录已按下的键，首次按下才发送，keyup 时移除
- 示例：GamePage.tsx handleKeyDown 用 `skillKeysDown.has(skillKey)` 判断

## 服务端/客户端配置同步
- 敌人/道具/技能等配置必须在 server/config/constants.ts 和 src/config/ 中保持 ID 一致
- 修改配置时要同时检查两端
- 建议：未来考虑共享配置或添加类型检查

## 关键命令

```bash
npm run dev          # 启动开发服务器（前端 3000 + 后端 3001）
# 重启服务器
taskkill //PID <pid> //F && sleep 2 && npm run dev

# 检查端口占用
netstat -ano | grep LISTENING | grep -E "300[01]"

# 检查服务端日志
tail -f logs or check task output
```

## 项目结构

```
docs/           # 文档（架构图、计划、设计稿）
src/
  pages/     # 页面组件 (LoginPage, LobbyPage, RoomPage, GamePage)
  store/     # Zustand 状态管理
  network/   # Socket.io 客户端
  assets/    # 资源文件
    images/  # SVG图标资源
    kenney/  # Kenney精灵图(PNG)
  utils/     # 工具函数 (spriteLoader.ts)
server/
  game/      # 游戏逻辑 (GameManager, GameRoom, Combat, DungeonGenerator)
  lobby/      # 大厅逻辑 (AuthManager, LobbyManager)
  network/    # SocketServer
resources/
  kenney/    # Kenney资源压缩包(原始文件)
public/
  fonts/     # Kenney像素字体
```

## 架构图

![架构图](./architecture.drawio.png)

## 技术栈

- 前端：React 18 + TypeScript + Canvas + Zustand + Socket.io-client + Vite
- 后端：Node.js + Express + Socket.io + MySQL (mysql2)
- 端口：前端 3000，后端 3001

## UI 设计规范

### 美术风格（地牢探险 + 暗色系）

#### 像素复古风格颜色
- 背景：`#2D1B2E` (深紫黑)
- 墙壁：`#8B4513` (棕色)
- 金色：`#FFD700` (强调色)
- 敌人红：`#DC143C`
- 生命绿：`#32CD32`
- 玩家色：玩家1 `#4A9EFF`、玩家2 `#51CF66`、玩家3 `#FFA500`、玩家4 `#9B59B6`

#### 设计原则
- **暗黑地牢氛围**：深色调为主，光源（道具、技能）作为视觉焦点
- **像素风格**：所有游戏内绘制使用 `imageRendering: 'pixelated'`
- **UI保持可读性**：HUD和信息面板使用明亮强调色

### 资源使用规范（强制）

**优先使用现有资源**：在创建或修改任何图片、图标、精灵之前，**必须**先检查 `src/assets/kenney/`、`src/assets/images/`、`public/fonts/` 目录是否有匹配的资源。只有在确实没有合适资源的情况下，才去网络搜索下载。

**搜索下载规则**：
1. 首选 Kenney.nl（已下载的资源在 `resources/kenney/`）
2. 其次 itch.io / opengameart.org（必须 CC0 或 commercial use allowed）
3. 下载后放入对应目录并更新资源索引
4. 禁止直接链接外部图片 URL

### 资源来源

#### Kenney.nl (主要资源)
- **许可**：Creative Commons CC0（可免费商用）
- **网址**：https://kenney.nl/assets
- **内容**：角色精灵、地牢瓦片、UI元素、像素字体
- **原始压缩包**：`resources/kenney/`（8个zip文件）
- **解压资源**：`src/assets/kenney/`（约800+ PNG文件）
- **字体**：`public/fonts/`（12个Kenney像素字体）

#### 其他可用资源站
- itch.io（筛选CC0）
- opengameart.org
- 务必确认CC0或commercial use allowed才可使用

### SVG 资源
- 放置在 `src/assets/images/` 目录
- 使用 ES6 import：`import x from './x.svg'`（不要用 require）
- 资源组件：`src/components/GameAssets.tsx`、`src/components/PixelSprites.tsx`

### Kenney Assets 使用指南

#### 精灵图规格
- 单个精灵：16x16像素
- 间距：1px
- 主要spritesheet：
  - `roguelikeChar_transparent.png` - 角色精灵
  - `roguelikeDungeon_transparent.png` - 地牢/道具精灵

#### 相关文件
- 资源索引：`src/assets/kenney/index.ts`
- 精灵加载器：`src/utils/spriteLoader.ts`
- 绘制函数：`drawSpriteAt(ctx, img, index, x, y, size)`

#### 精灵索引（部分）
```
角色(roguelikeChar): 0-15 (战士、弓箭手、法师、牧师各4方向)
地牢(roguelikeDungeon): 0-8地板、9-16墙壁、17-20门、21-22宝箱、23-24楼梯
敌人：25-28 (⚠️ 经调研确认这些是空白/装饰占位符，非真实怪物贴图)
道具：29-35 (health/coin/key/potion等)
```

### Tailwind CSS
- 使用 PostCSS 方式：`@tailwindcss/postcss` + `postcss.config.js`（不要用 `@tailwindcss/vite`，它是 ESM-only 会报错）
- `src/index.css` 顶部添加 `@import "tailwindcss"` + `@theme` 块配置主题变量

### Canvas 游戏渲染
- 实体绘制使用 `fillRect()` 纯色占位，或精灵图 `drawSpriteAt()`
- 绘制时设置 `imageRendering: 'pixelated'` 保持像素风格
- 精灵加载：`new Image()` + `img.onload`
- 像素艺术元素（血条、皇冠、箭头等）统一用 `fillRect` 绘制，不要用 `moveTo/lineTo` path
- 添加 3D 立体感：高光线（顶部/左侧亮色）+ 阴影线（底部/右侧暗色）
- 名称标签需添加半透明暗色背景面板提升可读性

### Penpot MCP
- `export_shape` 工具可能有 http error，可使用 `generateMarkup` 生成 SVG 代码代替
- 创建图片资源后用 `generateMarkup` 提取坐标和颜色信息，在代码中重建 SVG

### UI 组件规范
- SVG 组件放置在 `src/components/PixelIcons.tsx`
- 像素图标模式：内联 `<svg>` + `imageRendering: 'pixelated'`
- 按钮/卡片使用 `border: none`（无边框）
- SVG 组件必须显式导入，缺失导入会导致运行时错误
- 禁止使用 `alert()`，替换为内联错误通知：`useState(errorMsg)` + `setTimeout` 3秒自动消失

## Git 经验

- 遇到 "diverged branch" 冲突时：先 `git stash`，再 `git pull --rebase`，最后 `git stash pop`
- 推送前先解决本地冲突再 push
- 提交信息必须使用中文

## Playwright MCP 工具

- 可用于自动下载网站资源（如 `browser_navigate` + `browser_click`）
- 下载文件默认保存到 `.playwright-mcp/` 目录
- 验证 UI 改动：`browser_navigate` + `browser_take_screenshot`
- 验证完成后必须删除截图文件（`rm -f *.png`）

## TODO 管理（强制）

- 收到开发任务后，**必须先**将所有子项写入 `TODO.md`，然后再开始开发
- 写入时所有项目标记为 `- [ ]`（未完成）
- 开发过程中**每完成一个子项就立即**将其改为 `- [x]` 并注明完成日期（不要批量标记）
- 发现 bug 或新需求时，先添加到 `TODO.md`，再修复
- 已解决的问题打钩并注明修复方法
- **验证类任务不需要写入 `TODO.md`**（如 Playwright 截图验证、手动测试等）

## Windows Bash 路径

- 使用 `/d/cc-roguelike/` 格式而非 `D:\cc-roguelike`
