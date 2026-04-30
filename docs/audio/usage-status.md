# 音效使用状态文档

> 记录 55 个音效的接入状态，每个条目附带**具体代码证据**。
> 最后更新：2026-04-30

## 统计

| 状态 | 数量 | 说明 |
|------|------|------|
| **已接入** | 22 | 已在代码中调用，有代码证据（14 主线程 + 4 技能 + 4 攻击） |
| **待接入 P1** | 8 | 应该接入，有明确触发位置 |
| **待接入 P2** | 18 | 锦上添花，需服务端支持或新机制 |
| **不适用** | 7 | 无对应游戏机制 |

---

## 已接入（22个）

### 016. enemy_hit — 敌人受击

**触发位置**: `GamePage.tsx:293`

```typescript
// GamePage.tsx:292-296
} else if (!isPlayer) {
  play(SFX_IDS.ENEMY_HIT)
  // 打击感：敌人受击（顿帧 3 帧 + 震动 3px）
  triggerHitEffect(3, 3, 150)
}
```

**触发条件**: 敌人 hp 下降（`e.hp < prevHp` 且 `!isPlayer`）

---

### 017. enemy_die_basic — 普通敌人死亡

**触发位置**: `GamePage.tsx:301`

```typescript
// GamePage.tsx:300-304
if (!state.players?.some((p: any) => p.id === key) && e.hp <= 0 && prevHp !== undefined && prevHp > 0) {
  playEnemyDie(e.type || 'basic')
  // 打击感：敌人死亡（顿帧 5 帧 + 震动 5px）
  triggerHitEffect(5, 5, 200)
}
```

**触发条件**: 非玩家实体 hp 从正数降到 0，`e.type` 为 `'basic'` 或空时走 default 分支

**音效路由**: `playEnemyDie('basic')` → `playSfx(SFX_IDS.ENEMY_DIE_BASIC)` (`sfx.ts:211`)

---

### 018. enemy_die_ghost — 幽灵死亡

**触发位置**: `GamePage.tsx:301`

```typescript
// 同上，playEnemyDie(e.type || 'basic')
// sfx.ts:205-207
case 'ghost':
  playSfx(SFX_IDS.ENEMY_DIE_GHOST)
  break
```

**触发条件**: 敌人 type 为 `'ghost'` 且 hp 降到 0

---

### 019. enemy_die_boss — Boss 死亡

**触发位置**: `GamePage.tsx:301`

```typescript
// 同上，playEnemyDie(e.type || 'basic')
// sfx.ts:208-210
case 'boss':
  playSfx(SFX_IDS.ENEMY_DIE_BOSS)
  break
```

**触发条件**: 敌人 type 为 `'boss'` 且 hp 降到 0

---

### 020. player_hurt — 玩家受伤

**触发位置**: `GamePage.tsx:289`

```typescript
// GamePage.tsx:288-291
if (isPlayer && e.id === user?.id) {
  playHurt()
  // 打击感：玩家受伤（顿帧 2 帧 + 震动 2px）
  triggerHitEffect(2, 2, 100)
}
```

**触发条件**: 本地玩家 hp 下降（`e.hp < prevHp` 且 `isPlayer && e.id === user?.id`）

---

### 022. player_die — 玩家死亡

**触发位置**: `GamePage.tsx:311`

```typescript
// GamePage.tsx:307-314
const prevAlive = prevAliveRef.current.get(key)
if (prevAlive !== undefined && e.alive === false && prevAlive === true) {
  const isPlayer = state.players?.some((p: any) => p.id === key)
  if (isPlayer && e.id === user?.id) {
    playDie()
    // 打击感：玩家死亡（顿帧 8 帧 + 震动 6px）
    triggerHitEffect(8, 6, 300)
  }
}
prevAliveRef.current.set(key, e.alive)
```

**触发条件**: 本地玩家 `alive` 从 `true` 变为 `false`（使用 `prevAliveRef` 追踪）

---

### 032. pickup_gold — 拾取金币

**触发位置**: `GamePage.tsx:334`

```typescript
// GamePage.tsx:322-337
const prevItems = gameStateRef.current.items || []
const newItems = state.items || []
if (newItems.length < prevItems.length) {
  const removedItems = prevItems.filter((item: any) => !newItems.some((newItem: any) => newItem.id === item.id))
  for (const item of removedItems) {
    const localPlayer = state.players?.find((p: any) => p.id === user?.id)
    if (localPlayer) {
      const dist = Math.sqrt((localPlayer.x - item.x) ** 2 + (localPlayer.y - item.y) ** 2)
      if (dist < 50) {
        playPickup(item.type || 'gold')
      }
    }
  }
}
```

**触发条件**: items 数组数量减少，且被移除的 item 距本地玩家 < 50px，`item.type` 为 `'coin'` 或空时走 default

**音效路由**: `playPickup('coin')` → `playSfx(SFX_IDS.PICKUP_GOLD)` (`sfx.ts:222`)

---

### 033. pickup_potion_hp — 拾取血瓶

**触发位置**: `GamePage.tsx:334`

```typescript
// 同上，playPickup(item.type || 'gold')
// sfx.ts:224-226
case 'health':
  playSfx(SFX_IDS.PICKUP_POTION_HP)
  break
```

**触发条件**: `item.type === 'health'`

---

### 034. pickup_potion_mp — 拾取蓝瓶

**触发位置**: `GamePage.tsx:334`

```typescript
// 同上，playPickup(item.type || 'gold')
// sfx.ts:227-229
case 'energy':
  playSfx(SFX_IDS.PICKUP_POTION_MP)
  break
```

**触发条件**: `item.type === 'energy'`

---

### 035. pickup_key — 拾取钥匙

**触发位置**: `GamePage.tsx:334`

```typescript
// 同上，playPickup(item.type || 'gold')
// sfx.ts:230-232
case 'key':
  playSfx(SFX_IDS.PICKUP_KEY)
  break
```

**触发条件**: `item.type === 'key'`

---

### 038. floor_transition — 楼层切换

**触发位置**: `GamePage.tsx:363`

```typescript
// GamePage.tsx:353-364
networkClient.on('game:floor:start', (data: any) => {
  prevPositions.current.clear()
  targetPositions.current.clear()
  gameStateRef.current = { players: [], enemies: [], bullets: [], healWaves: [], items: [], gold: 0, keys: 0, dungeon: null }
  floorSessionRef.current = data.floor
  gameSessionRef.current = data.gameSession
  lastStateTime.current = performance.now()
  setFloor(data.floor)

  // 音效：楼层切换
  playFloorTransition()
})
```

**触发条件**: 收到 `game:floor:start` socket 事件

---

### 044. ui_click — 按钮点击

**触发位置**: `PixelButton.tsx:43`

```typescript
// PixelButton.tsx:39-44
const { playClick } = useSound()

const handleClick = useCallback(() => {
  if (disabled) return
  playClick()
  onClick?.()
}, [disabled, onClick, playClick])
```

**触发条件**: 使用 `<PixelButton>` 组件的按钮被点击

---

### 050. game_over — 游戏结束

**触发位置**: `GamePage.tsx:373`

```typescript
// GamePage.tsx:366-375
networkClient.on('game:end', (data: any) => {
  setGameOver(true, data.win)

  // 音效：游戏结束/胜利
  if (data.win) {
    playVictory()
  } else {
    playGameOver()
  }
})
```

**触发条件**: 收到 `game:end` 事件且 `data.win === false`

---

### 051. victory — 胜利

**触发位置**: `GamePage.tsx:371`

```typescript
// 同上
if (data.win) {
  playVictory()
}
```

**触发条件**: 收到 `game:end` 事件且 `data.win === true`

---

## 已接入 — 技能音效（4个）

### 025. skill_dash — 冲刺

**触发位置**: `GamePage.tsx:404`

```typescript
// GamePage.tsx:397-408
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

**触发条件**: 按键 `1`（技能槽 0 = dash）

---

### 026. skill_shield_on — 护盾开启

**触发位置**: `GamePage.tsx:405`

**触发条件**: 按键 `2`（技能槽 1 = shield）

---

### 028. skill_heal — 自我治疗

**触发位置**: `GamePage.tsx:406`

**触发条件**: 按键 `3`（技能槽 2 = heal）

---

### 029. skill_speed_on — 加速开启

**触发位置**: `GamePage.tsx:407`

**触发条件**: 按键 `4`（技能槽 3 = speed_boost）

---

## 已接入 — 攻击音效（4个）

### 001. warrior_slash — 战士攻击

**触发位置**: `GamePage.tsx:488`

```typescript
// GamePage.tsx:482-490
const isAttacking = mouseRef.current.down
if (isAttacking && !prevAttackRef.current) {
  attackFlashRef.current = 1.0
  // 播放攻击音效
  const localPlayer = gameStateRef.current.players.find((p: any) => p.id === user?.id)
  if (localPlayer) {
    playAttack(localPlayer.characterType || 'warrior')
  }
}
```

**音效路由**: `playAttack('warrior')` → `playSfx(SFX_IDS.WARRIOR_SLASH)` (`sfx.ts:184`)

**音效来源**: CC0 外部素材 — `blade_01.ogg`（80 CC0 RPG SFX by rubberduck），真实金属剑刃音效

---

### 004. ranger_shoot — 游侠攻击

**触发位置**: `GamePage.tsx:488`

**音效路由**: `playAttack('ranger')` → `playSfx(SFX_IDS.RANGER_SHOOT)` (`sfx.ts:187`)

---

### 006. mage_cast — 法师攻击

**触发位置**: `GamePage.tsx:488`

**音效路由**: `playAttack('mage')` → `playSfx(SFX_IDS.MAGE_CAST)` (`sfx.ts:190`)

---

### 009. cleric_cast — 牧师攻击

**触发位置**: `GamePage.tsx:488`

**音效路由**: `playAttack('cleric')` → `playSfx(SFX_IDS.CLERIC_CAST)` (`sfx.ts:193`)

---

## 已接入 — 打击感系统

### useHitEffect Hook

**引入位置**: `GamePage.tsx:176`

```typescript
// GamePage.tsx:175-176
const { play, playAttack, playHurt, playEnemyDie, playPickup, playFloorTransition, playVictory, playGameOver, playDash, playShield, playSpeed, playDie } = useSound()
const { triggerHitEffect, updateShake, isHitlagging, updateHitlag } = useHitEffect()
```

**顿帧处理**: `GamePage.tsx:494-500`

```typescript
// 打击感：顿帧处理
updateHitlag()
if (isHitlagging()) {
  // 顿帧中，跳过渲染但继续请求下一帧
  animationRef.current = requestAnimationFrame(gameLoop)
  return
}
```

**屏幕震动**: `GamePage.tsx:502-515`

```typescript
// 打击感：屏幕震动
const shake = updateShake()
const canvas = canvasRef.current
if (canvas && (shake.x !== 0 || shake.y !== 0)) {
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.save()
    ctx.translate(shake.x, shake.y)
    render()
    ctx.restore()
  }
} else {
  render()
}
```

**打击感触发汇总**:

| 事件 | 顿帧 | 震动强度 | 震动时长 | 代码位置 |
|------|------|---------|---------|---------|
| 玩家受伤 | 2帧 | 2px | 100ms | GamePage.tsx:291 |
| 敌人受击 | 3帧 | 3px | 150ms | GamePage.tsx:295 |
| 敌人死亡 | 5帧 | 5px | 200ms | GamePage.tsx:303 |
| 玩家死亡 | 8帧 | 6px | 300ms | GamePage.tsx:313 |

---

## 待接入 - P1 应该接入（8个）

| ID | 音效 | 预期触发位置 | 预期触发条件 | 修改文件 |
|----|------|---------|---------|---------|
| 002 | warrior_hit | GamePage.tsx:293 | 战士命中敌人（需按职业区分命中音效）CC0: hammer_02.ogg | GamePage.tsx |
| 005 | ranger_hit | GamePage.tsx:293 | 游侠命中敌人 | GamePage.tsx |
| 008 | mage_hit | GamePage.tsx:293 | 法师命中敌人 | GamePage.tsx |
| 010 | cleric_heal | GamePage.tsx:293 | 牧师治疗命中 | GamePage.tsx |
| 040 | stairs_down | GamePage.tsx | 接近出口 + 敌人全灭 | GamePage.tsx |
| 041 | ambient_drip | GamePage.tsx | 进入地牢循环播放 | GamePage.tsx |
| 042 | ambient_chain | GamePage.tsx | 进入地牢循环播放 | GamePage.tsx |
| 043 | ambient_wind | GamePage.tsx | 进入地牢循环播放 | GamePage.tsx |

---

## 待接入 - P2 锦上添花（18个）

| ID | 音效 | 预期触发位置 | 预期触发条件 | 修改文件 |
|----|------|---------|---------|---------|
| 003 | ranger_draw | GamePage.tsx | 游侠拉弓（攻击前摇） | GamePage.tsx |
| 007 | mage_orb_fly | useGameRenderer.ts | 能量弹飞行中（循环） | GamePage.tsx |
| 011 | enemy_basic_attack | GameRoom.ts | basic 敌人攻击 | 服务端+客户端 |
| 012 | enemy_ghost_attack | GameRoom.ts | 幽灵攻击 | 服务端+客户端 |
| 013 | enemy_tank_attack | GameRoom.ts | tank 攻击 | 服务端+客户端 |
| 014 | enemy_boss_attack | GameRoom.ts | Boss 攻击 | 服务端+客户端 |
| 015 | enemy_boss_special | GameRoom.ts | Boss 技能 | 服务端+客户端 |
| 021 | player_heal | GamePage.tsx | 被治疗（healWaves 检测） | GamePage.tsx |
| 023 | player_respawn | GamePage.tsx | 楼层切换复活 | GamePage.tsx |
| 045 | ui_hover | 全部页面 | 鼠标悬停按钮 | 全部页面 |
| 046 | ui_select | RoomPage.tsx | 职业选择 | RoomPage.tsx |
| 047 | ui_back | GamePage.tsx | 退出游戏 | GamePage.tsx |
| 048 | ui_error | LobbyPage.tsx | 房间错误 | LobbyPage.tsx |
| 049 | game_start | RoomPage.tsx | 游戏开始 | RoomPage.tsx |
| 052 | chat_message | 全部页面 | 收到聊天消息 | 全部页面 |
| 053 | player_join | RoomPage.tsx | 玩家加入房间 | RoomPage.tsx |
| 054 | player_leave | RoomPage.tsx | 玩家离开房间 | RoomPage.tsx |
| 055 | all_ready | RoomPage.tsx | 全员准备 | RoomPage.tsx |

---

## 不适用（7个）

| ID | 音效 | 原因 | 证据 |
|----|------|------|------|
| 024 | level_up | 无升级系统 | `GameRoom.ts` 无 `level` 字段，无经验值机制 |
| 027 | skill_shield_off | 服务端无事件通知 | `GameRoom.ts` 技能结束不发 socket 事件 |
| 030 | skill_speed_off | 服务端无事件通知 | 同上 |
| 031 | skill_cooldown | 服务端无事件通知 | 同上 |
| 036 | pickup_weapon | 服务端无 weapon 道具类型 | `GameRoom.ts` item types: coin/health/energy/key |
| 037 | pickup_treasure | 服务端无 treasure 道具类型 | 同上 |
| 039 | door_open | 无门机制 | `GameRoom.ts` 无门/开关逻辑 |



## 更新日志

| 日期 | 更新内容 |
|------|---------|
| 2026-04-29 | 初始版本，完成全面审查 |
| 2026-04-29 | 添加具体代码证据（文件:行号 + 代码片段） |
| 2026-04-29 | 修复 WAV 文件为空 bug（jsfxr API 修正） |
| 2026-04-29 | 修复道具类型映射 bug（health_pack→health） |
| 2026-04-30 | warrior_slash/warrior_hit 替换为 CC0 外部素材（OpenGameArt rubberduck） |
| 2026-04-30 | 修正统计数据：移除 P1 中已接入的 033/034，移除 P2 中不适用的 027/030/031/036/037 |
