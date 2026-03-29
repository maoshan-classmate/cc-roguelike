# Bug: 第二次进入游戏角色高速瞬移

> **日期**: 2026-03-29
> **严重程度**: P0 — 游戏无法正常运行
> **状态**: ✅ 已修复

## 问题描述

第一次进入游戏正常，ESC退出或死亡后返回大厅，再次创建房间进入游戏，角色出现高速瞬移（从随机位置瞬移到目标位置，有残影拖尾）。

## 根因分析

### 链路梳理

```
第一次进游戏:
  GamePage mount → gameSessionRef=0 → 第一帧 game:state 通过 → 正常

退出游戏（返回大厅）:
  handleExit → navigate('/lobby') → GamePage unmount
  ❌ 但服务器端 GameRoom tick 继续运行！
  旧 room 的 game:state(10Hz) 继续向该 socket 广播

第二次进游戏:
  GamePage mount → gameSessionRef 保持旧值（非0）
  旧 room 的 game:state 带着旧的 gameSession 到达
  过滤逻辑：gameSessionRef !== 0 && state.gameSession !== gameSessionRef → 通过！
  → 旧 room 的状态被渲染 → 瞬跳

  或另一路径：
  新 room 的 game:state 先到达 → gameSessionRef 建立新基准
  → 旧 room 的 game:state 被过滤掉 → 正常
  （这就是为什么有时候正常有时候不正常）
```

### 三层失效

| 层级 | 问题 |
|------|------|
| **服务端** | `handleRoomLeave` 和 `handleDisconnect` 只从 LobbyManager 移除玩家，不清理 GameRoom。GameRoom tick 继续运行，10Hz 广播 game:state |
| **客户端** | `gameSessionRef` 在 handleExit 时没有重置为 0；cleanup 函数中也没有重置 |
| **过滤逻辑** | 依赖 `floorSessionRef`（不为0时才检查），而初始 floor=1 时 floorSessionRef=0 导致所有状态都通过 |

## 修复方案

### 1. 客户端 — handleExit 重置 session

**文件**: `src/pages/GamePage.tsx`

```typescript
const handleExit = () => {
  // 通知服务器离开房间，停止旧游戏实例的 tick 广播
  networkClient.emit('room:leave')
  // 重置 session 计数器，确保下次进入游戏时第一帧建立新基准
  floorSessionRef.current = 0
  gameSessionRef.current = 0
  prevPositions.current.clear()
  targetPositions.current.clear()
  reset()
  navigate('/lobby')
}
```

### 2. 客户端 — cleanup 重置 session

```typescript
return () => {
  networkClient.off('game:state')
  networkClient.off('game:floor:start')
  networkClient.off('game:end')
  floorSessionRef.current = 0
  gameSessionRef.current = 0
}
```

### 3. 客户端 — 简化 game:state 过滤逻辑

```typescript
networkClient.on('game:state', (state: any) => {
  // gameSessionRef === 0 表示"尚未确立 session"（刚进入或刚退出），接受第一帧建立基准
  // gameSessionRef !== 0 时，只接受匹配 session 的状态
  if (gameSessionRef.current !== 0 && state.gameSession !== gameSessionRef.current) return
  // ...
})
```

### 4. 服务端 — handleRoomLeave 清理 GameRoom

**文件**: `server/network/SocketServer.ts`

```typescript
private handleRoomLeave(socket: Socket): void {
  this.requireAuth(socket, (session) => {
    if (!session.currentRoom) return
    const room = this.lobbyManager.leaveRoom(session.currentRoom, session.accountId)
    socket.leave(`room:${session.currentRoom}`)

    if (room) {
      socket.to(`room:${room.id}`).emit(RoomMessages.LEAVE_PUSH, {
        playerId: session.accountId,
        newHostId: room.hostId
      })
      // 如果房间正在游戏中，从 GameRoom 移除玩家并清理
      if (room.status === 'playing') {
        const gameRoom = this.gameManager.getRoom(session.currentRoom)
        if (gameRoom) {
          gameRoom.removePlayer(session.accountId)
          if (gameRoom.getPlayerCount() === 0) {
            this.gameManager.removeRoom(session.currentRoom)  // 停止 tick 广播
          }
        }
      }
    }
    session.currentRoom = undefined
  })
}
```

### 5. 服务端 — handleDisconnect 清理 GameRoom

```typescript
private handleDisconnect(socket: Socket): void {
  const session = this.sessions.get(socket.id)
  if (session && session.currentRoom) {
    const room = this.lobbyManager.leaveRoom(session.currentRoom, session.accountId)
    if (room && room.status === 'playing') {
      const gameRoom = this.gameManager.getRoom(session.currentRoom)
      if (gameRoom) {
        gameRoom.removePlayer(session.accountId)
        if (gameRoom.getPlayerCount() === 0) {
          this.gameManager.removeRoom(session.currentRoom)
        }
      }
    }
  }
  this.sessions.delete(socket.id)
}
```

## 教训

1. **Socket.io room 隔离不等于游戏逻辑隔离**。玩家离开游戏页面（navigate to lobby）时，如果服务器不主动清理，GameRoom 的 tick 循环会继续向断开的 socket 广播
2. **Session 过滤必须在组件级别重置**。ref 不会自动清零，必须在 unmount/cleanup 时显式重置
3. **game:floor:start 不覆盖初始 floor=1**。服务器对 floor=1 不发送 `game:floor:start`（只设置 `_floorChanged=true` 时才发送），所以客户端必须靠 `game:state` 的第一帧建立基准
4. **调试技巧**：GIF 动画能清晰看到"两个角色重叠"——一个在左下角（spawn），一个在随机位置（旧 room 残留），直接指向 `prevPositions` 未清除或被旧 session 污染

## 验证

- [x] `npx tsc --noEmit` — 服务端文件零 error
- [x] 第一次进游戏 — 地牢地板正常 ✅
- [x] 第二次进游戏 — 地牢地板正常，无瞬移 ✅
- [x] 第三次进游戏 — 地牢地板正常，无瞬移 ✅
- [x] 截图存档：`game-second-entry-check.png`、`game-third-entry-check.png`
