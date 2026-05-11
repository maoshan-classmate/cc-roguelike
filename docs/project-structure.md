# 项目结构

```
cc-roguelike/
├── shared/                    # 跨端共享（零外部依赖）
│   ├── types.ts               # PlayerState/EnemyState 等跨端类型
│   ├── constants.ts           # 跨端常量
│   ├── protocol.ts            # Socket 消息协议
│   ├── character-definitions.ts # 职业定义（唯一数据源）
│   └── enemy-definitions.ts   # 敌人定义（唯一数据源）
├── src/                       # React 前端（Vite，端口3000）
│   ├── pages/                 # 页面组件
│   │   ├── game/              # 游戏页面（index/Canvas/HUD/Overlay/DebugMenu）
│   │   ├── LoginPage.tsx
│   │   ├── LobbyPage.tsx
│   │   └── RoomPage.tsx
│   ├── rendering/             # 纯绘制函数（ctx,data）=>void，无 React 依赖
│   ├── components/            # React 组件（pixel/ 像素组件库）
│   ├── hooks/                 # React 副作用封装（useGameRenderer/useGameInput）
│   ├── store/                 # Zustand 状态管理
│   ├── config/                # 静态配置数据（sprites/characters/enemies/items/skills）
│   ├── network/               # Socket.io 客户端
│   ├── audio/                 # 音效系统（jsfxr + Howler.js）
│   ├── utils/                 # 纯工具函数
│   ├── types/                 # 仅客户端类型
│   └── assets/                # 静态资源
│       ├── 0x72/              # 0x72 Dungeon Tileset II（精灵图集 + 帧文件）
│       ├── custom/            # 自定义资源
│       ├── generated/         # AI 生成精灵
│       ├── sfx/               # 音效文件
│       └── skills/            # 技能图标
├── server/                    # Node.js 后端（端口3001）
│   ├── game/                  # 游戏逻辑
│   │   ├── GameRoom.ts        # 房间生命周期、模块编排
│   │   ├── GameManager.ts     # 跨房间管理
│   │   ├── collision/         # 碰撞检测（CollisionGrid）
│   │   ├── combat/            # 伤害计算（Combat + SkillHandlers）
│   │   ├── enemy/             # 敌人 AI（EnemyAI）
│   │   ├── dungeon/           # 地牢生成（Dungeon/Maze/BossArena/Colosseum Generator）
│   │   └── status/            # 状态效果（StatusManager + EffectDefinitions）
│   ├── lobby/                 # 大厅逻辑（AuthManager/LobbyManager）
│   ├── network/               # SocketServer
│   ├── config/                # 服务端配置（constants.ts）
│   ├── data/                  # 数据库（Database.ts — SQLite）
│   └── utils/                 # 工具函数
├── scripts/                   # 构建脚本（generate-sfx.js）
├── docs/                      # 项目文档
│   ├── gdd/                   # 游戏设计文档（5 个核心系统）
│   ├── bugs/                  # Bug 记录
│   ├── todo/                  # TODO 按领域拆分
│   └── audio/                 # 音效系统文档
├── public/fonts/              # 像素字体
└── sprite-viewer.html         # 贴图资产可视化预览
```
