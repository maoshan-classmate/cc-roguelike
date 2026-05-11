# 像素风格组件库

> 入口：`src/components/pixel/index.ts`
> 设计详情：`src/components/pixel/` 源码

## Atoms

| 组件 | 说明 |
|------|------|
| `PixelButton` | 5 变体 + glow（primary/secondary/danger/success/gold） |
| `PixelInput` | 像素风格输入框，支持 password 类型 |
| `PixelBadge` | 状态徽章（waiting/ready/playing） |
| `PixelProgress` | HP/SP/EXP 进度条 |

## Molecules

| 组件 | 说明 |
|------|------|
| `PixelCard` | 卡片容器，支持 glow 变体 |
| `PixelPanel` | 带石头质感边框的面板 |
| `PixelPlayerSlot` | 玩家槽位，显示头像+状态 |
| `PixelHeader` | 页面顶栏（标题+副标题+左右操作区） |

## Organisms

| 组件 | 说明 |
|------|------|
| `PixelRoomCard` | 房间卡片，含房间信息+状态+玩家预览 |
| `PixelPageContainer` | 页面框架容器，带背景网格 |

## 已用页面

- `LoginPage` → motion / DungeonParticles / AnimatedSprite（未使用像素组件库）
- `LobbyPage` → PixelRoomCard
- `RoomPage` → PixelPlayerSlot / PixelPanel
