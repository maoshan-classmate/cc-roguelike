# Roguelike 多人联机游戏

一款网页端的局域网多人联机Roguelike闯关游戏。

## 游戏特色

- **即时战斗** - 俯视角射击弹幕玩法，参考《元气骑士》
- **多人联机** - 支持最多4人局域网联机，大厅+房间系统
- **程序生成地牢** - 5层地牢，每层随机生成房间和敌人
- **Boss战** - 每层结尾都有Boss等着你
- **存档系统** - 账号注册登录，角色数据永久保存
- **4职业系统** - 战士(近战)/游侠(远程)/法师(魔法)/牧师(治疗)，各职业独立攻击路径
- **技能系统** - 冲刺、护盾、治疗、加速等多种技能

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React + TypeScript + Canvas |
| 后端 | Node.js + Socket.io + Express |
| 数据库 | MySQL |
| 状态管理 | Zustand |
| 构建工具 | Vite |
| 精灵图 | 0x72 Dungeon Tileset II |

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置数据库

复制 `.env.example` 为 `.env` 并修改数据库配置：

```env
DB_HOST=192.168.2.9
DB_PORT=9901
DB_USER=root
DB_PASSWORD=你的密码
DB_NAME=roguelike
JWT_SECRET=你的JWT密钥
SERVER_PORT=3001
CLIENT_URL=http://localhost:3000
```

### 3. 创建数据库

在MySQL中创建数据库：

```sql
CREATE DATABASE roguelike;
```

数据库表会在首次启动时自动创建。

### 4. 启动开发服务器

```bash
npm run dev
```

- 客户端: http://localhost:3000
- 服务端: http://localhost:3001

## 游戏操作

| 操作 | 按键 |
|------|------|
| 移动 | WASD 或 方向键 |
| 瞄准射击 | 鼠标左键 |
| 技能1-4 | 1 / 2 / 3 / 4 |
| 暂停 | ESC |
| 调试菜单(DEV) | D |

## 职业系统

| 职业 | 武器 | 攻击方式 | 速度 |
|------|------|---------|------|
| 战士 warrior | 骑士剑 | 近战挥砍 | 180 px/s |
| 游侠 ranger | 弓 | 远程箭矢 | 220 px/s |
| 法师 mage | 红法杖 | 远程魔法弹 | 180 px/s |
| 牧师 cleric | 绿法杖 | AoE治疗波 | 190 px/s |

## 游戏机制

### 地牢结构
- **5层递进** - 每层难度递增
- **BSP随机生成** - 不规则房间+走廊+环路
- **碰撞网格** - 32×24 tiles，逐tile碰撞检测

### 战斗系统
- **4职业独立路径** - 近战/箭矢/魔法弹/治疗波，互不干扰
- **技能系统** - 冲刺/护盾/治疗/加速，按职业不同排列
- **拾取道具** - 血包、能量包、金币、钥匙

### 同步机制
- 服务端tick率: 10Hz
- 状态同步率: 10Hz
- 客户端输入率: ~30Hz
- 客户端插值: lerp平滑

## 项目结构

```
cc-roguelike/
├── server/                 # 服务端代码
│   ├── config/            # 游戏常量(constants.ts)
│   ├── data/              # 数据库(Database.ts)
│   ├── game/              # 游戏逻辑
│   │   ├── combat/         # 战斗系统(Combat.ts)
│   │   ├── dungeon/        # 地牢生成(DungeonGenerator.ts)
│   │   └── GameRoom.ts     # 房间状态+游戏循环
│   ├── lobby/              # 大厅系统(AuthManager/LobbyManager)
│   ├── network/            # SocketServer
│   └── utils/              # 工具函数
│
├── src/                   # 客户端代码
│   ├── components/        # React组件(pixel/像素组件库)
│   ├── pages/             # 页面(Login/Lobby/Room/Game)
│   ├── store/             # Zustand状态管理
│   ├── hooks/             # 自定义Hooks(useGameRenderer等)
│   ├── config/            # 客户端配置(sprites/characters/enemies/items)
│   ├── network/           # Socket.io客户端
│   └── assets/            # 静态资源(0x72精灵图)
│
├── docs/                  # 项目文档
└── package.json
```

## 待实现功能

- [ ] 更多怪物类型
- [ ] 更多技能
- [ ] 商店系统
- [ ] 成就系统
- [ ] 音效

## License

MIT
