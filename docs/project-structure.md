# 项目结构

```
cc-roguelike/
├── src/
│   ├── pages/           # 页面组件（Login/Lobby/Room/Game）
│   ├── store/           # Zustand 状态管理
│   ├── network/         # Socket.io 客户端
│   ├── assets/
│   │   ├── images/      # SVG 图标资源
│   │   └── kenney/      # Kenney 精灵图（PNG）
│   ├── config/          # 客户端配置（enemies.ts, items.ts 等）
│   ├── components/      # React 组件
│   └── utils/           # 工具函数
├── server/
│   ├── game/            # 游戏逻辑（GameManager/GameRoom/Combat/DungeonGenerator）
│   ├── lobby/           # 大厅逻辑（AuthManager/LobbyManager）
│   ├── network/         # SocketServer
│   └── config/          # 服务端配置（constants.ts）
├── resources/kenney/   # Kenney 原始压缩包（8个zip）
├── public/fonts/        # Kenney 像素字体
└── docs/                # 文档
    ├── bugs/            # Bug 记录
    ├── specs/           # 设计文档
    ├── plans/           # 实施计划
    ├── sprites/         # 精灵资源索引
    └── todo/            # TODO 按领域拆分
```

## 架构图

![架构图](./architecture.drawio.png)
