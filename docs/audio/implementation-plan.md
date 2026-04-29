# 音效接入实现方案

> 分三阶段实施，按优先级排序。

## Phase 1: P0 核心音效（立即实施）

### 1.1 修复道具类型映射 Bug

**文件**: `src/audio/sfx.ts`

**修改**:
```typescript
// 修改前
case 'health_pack':
case 'energy_pack':

// 修改后
case 'health':
case 'energy':
```

### 1.2 接入玩家攻击音效

**文件**: `src/pages/GamePage.tsx`

**修改位置**: L462 附近，`attackFlashRef.current = 1.0` 处

**代码**:
```typescript
// 解构出 playAttack
const { play, playAttack, playHurt, playEnemyDie, playPickup, playFloorTransition, playVictory, playGameOver } = useSound()

// 在攻击触发处添加
if (isAttacking && !prevAttackRef.current) {
  attackFlashRef.current = 1.0
  // 获取玩家职业并播放攻击音效
  const localPlayer = gameStateRef.current.players.find((p: any) => p.id === user?.id)
  if (localPlayer) {
    playAttack(localPlayer.characterType || 'warrior')
  }
}
```

### 1.3 接入玩家死亡音效

**文件**: `src/pages/GamePage.tsx`

**修改位置**: L280-306 的 HP 检测逻辑

**代码**:
```typescript
// 添加 alive 变化检测
const prevAlive = prevAliveRef.current.get(key)
if (prevAlive !== undefined && e.alive === false && prevAlive === true) {
  if (isPlayer && e.id === user?.id) {
    playDie()
    triggerHitEffect(8, 6, 300) // 死亡打击感更强
  }
}
prevAliveRef.current.set(key, e.alive)

// 添加 ref 声明
const prevAliveRef = useRef<Map<string, boolean>>(new Map())
```

### 1.4 接入技能音效

**文件**: `src/pages/GamePage.tsx`

**修改位置**: L387 的技能按键处理

**代码**:
```typescript
// 解构出技能音效方法
const { playDash, playShield, playSpeed, play } = useSound()

// 在技能触发处添加
const skillKey = e.key
if (['1', '2', '3', '4'].includes(skillKey) && !skillKeysDown.has(skillKey)) {
  skillKeysDown.add(skillKey)
  networkClient.emit('game:input', { skill: parseInt(skillKey) - 1 })

  // 播放技能音效
  switch (skillKey) {
    case '1': playDash(); break
    case '2': playShield(); break
    case '3': play(SFX_IDS.SKILL_HEAL); break
    case '4': playSpeed(); break
  }
}
```

---

## Phase 2: P1 体验提升（第二阶段）

### 2.1 接入敌人攻击音效

**方案**: 客户端通过 hp 变化推断，不修改服务端

**文件**: `src/pages/GamePage.tsx`

**代码**:
```typescript
// 在 hp 检测中，如果是玩家受伤，根据最近敌人类型播放音效
if (isPlayer && e.id === user?.id) {
  playHurt()
  triggerHitEffect(2, 2, 100)

  // 检查最近敌人类型，播放对应攻击音效
  const nearestEnemy = findNearestEnemy(e.x, e.y)
  if (nearestEnemy) {
    playEnemyAttack(nearestEnemy.type)
  }
}
```

### 2.2 接入楼梯/出口音效

**文件**: `src/pages/GamePage.tsx`

**代码**:
```typescript
// 在 game:state 监听中添加出口检测
const localPlayer = state.players?.find((p: any) => p.id === user?.id)
const allEnemiesDead = state.enemies?.filter((e: any) => e.alive !== false).length === 0
if (localPlayer && state.dungeon?.exitPoint && allEnemiesDead) {
  const exit = state.dungeon.exitPoint
  const dist = Math.sqrt((localPlayer.x - exit.x) ** 2 + (localPlayer.y - exit.y) ** 2)
  if (dist < 60 && !exitSoundPlayed.current) {
    play(SFX_IDS.STAIRS_DOWN)
    exitSoundPlayed.current = true
  }
}
```

### 2.3 接入环境音循环

**文件**: `src/pages/GamePage.tsx`

**代码**:
```typescript
// 在组件挂载时启动环境音
useEffect(() => {
  const ambientSounds = [SFX_IDS.AMBIENT_DRIP, SFX_IDS.AMBIENT_CHAIN, SFX_IDS.AMBIENT_WIND]
  const randomAmbient = ambientSounds[Math.floor(Math.random() * ambientSounds.length)]
  play(randomAmbient)

  return () => {
    // 退出时停止环境音
    soundEngine.stop(SFX_IDS.AMBIENT_DRIP)
    soundEngine.stop(SFX_IDS.AMBIENT_CHAIN)
    soundEngine.stop(SFX_IDS.AMBIENT_WIND)
  }
}, [])
```

### 2.4 接入多人联机音效

**文件**: `src/pages/RoomPage.tsx`

**代码**:
```typescript
const { play } = useSound()

// 玩家加入
networkClient.on('room:join:push', (data: any) => {
  play(SFX_IDS.PLAYER_JOIN)
  // ... 现有逻辑
})

// 玩家离开
networkClient.on('room:leave:push', (data: any) => {
  play(SFX_IDS.PLAYER_LEAVE)
  // ... 现有逻辑
})

// 全员准备
useEffect(() => {
  if (allReady) {
    play(SFX_IDS.ALL_READY)
  }
}, [allReady])
```

---

## Phase 3: P2 锦上添花（第三阶段）

### 3.1 UI 按钮音效统一

**文件**: `LoginPage.tsx`, `LobbyPage.tsx`, `RoomPage.tsx`

**方案**: 将原生 `<motion.button>` 替换为 PixelButton，或手动添加 `playClick()`

### 3.2 按钮悬停音效

**文件**: 全部页面

**代码**:
```typescript
const handleMouseEnter = () => {
  playHover()
}

<button onMouseEnter={handleMouseEnter} ...>
```

### 3.3 聊天消息音效

**文件**: `GamePage.tsx`, `LobbyPage.tsx`

**代码**:
```typescript
networkClient.on('game:chat:push', (data: any) => {
  play(SFX_IDS.CHAT_MESSAGE)
  // ... 现有逻辑
})
```

---

## 验证清单

- [ ] 编译检查 `npx tsc --noEmit` 零错误
- [ ] 道具拾取音效正确（health/energy 映射修复）
- [ ] 4 种职业攻击音效触发正确
- [ ] 玩家死亡音效触发正确
- [ ] 4 个技能音效触发正确
- [ ] 楼梯音效触发正确
- [ ] 环境音循环播放
- [ ] 多人联机音效触发正确
- [ ] UI 按钮音效统一
