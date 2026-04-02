# 项目结构

```
cc-roguelike/
├── src/
│   ├── pages/           # 页面组件（Login/Lobby/Room/Game）
│   ├── store/           # Zustand 状态管理
│   ├── network/         # Socket.io 客户端
│   ├── assets/
│   │   ├── 0x72/        # 0x72 Dungeon Tileset II（主要精灵图）
│   │   │   ├── main_atlas.png          # 512×512 完整精灵图集
│   │   │   ├── spriteIndex.ts          # 精灵坐标映射
│   │   │   └── frames/                 # 预提取单帧 PNG
│   │   └── images/      # SVG 图标资源
│   ├── config/          # 客户端配置（sprites.ts/characters.ts/enemies.ts/items.ts）
│   ├── components/      # React 组件（pixel/ 像素组件库）
│   ├── hooks/           # 自定义 Hooks（useGameRenderer 等）
│   └── utils/           # 工具函数
├── server/
│   ├── game/            # 游戏逻辑（GameRoom/Combat/DungeonGenerator）
│   ├── lobby/           # 大厅逻辑（AuthManager/LobbyManager）
│   ├── network/         # SocketServer
│   ├── config/          # 服务端配置（constants.ts）
│   ├── data/            # 数据库（Database.ts）
│   └── utils/           # 工具函数
├── docs/                # 文档
│   ├── bugs/            # Bug 记录
│   ├── todo/            # TODO 按领域拆分
│   └── sprites/         # 精灵资源索引
├── public/fonts/        # 像素字体
└── sprite-viewer.html   # 贴图资产可视化预览
```
