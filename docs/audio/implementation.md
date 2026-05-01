# 音效系统技术实现

> sfxr 生成 + Howler.js 播放，React Hook 封装，事件驱动触发。

## 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                      GamePage.tsx                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ game:state  │  │ game:end    │  │ game:floor  │        │
│  │ 事件监听    │  │ 事件监听    │  │ 事件监听    │        │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │
│         │                │                │                │
│         └────────────────┼────────────────┘                │
│                          │                                 │
│                          ▼                                 │
│                   ┌─────────────┐                          │
│                   │  useSound() │                          │
│                   └──────┬──────┘                          │
│                          │                                 │
│                          ▼                                 │
│                   ┌─────────────┐                          │
│                   │ sfx.ts      │                          │
│                   │ (55个音效)  │                          │
│                   └──────┬──────┘                          │
│                          │                                 │
│                          ▼                                 │
│                   ┌─────────────┐                          │
│                   │SoundEngine  │                          │
│                   │(Howler.js)  │                          │
│                   └──────┬──────┘                          │
│                          │                                 │
│                          ▼                                 │
│                   ┌─────────────┐                          │
│                   │.wav/.ogg    │                          │
│                   │(55个音效)   │                          │
│                   └─────────────┘                          │
└─────────────────────────────────────────────────────────────┘
```

## 核心组件

### 1. SoundEngine.ts

Howler.js 封装的单例音效引擎。

**职责**：
- 注册音效（`register` / `registerAll`）
- 播放音效（`play`）
- 音量控制（`setMasterVolume` / `setSfxVolume`）
- 静音控制（`toggleMute` / `setMuted`）

**API**：
```typescript
const engine = SoundEngine.getInstance()

// 注册音效
engine.register('my_sfx', '/path/to/sound.wav')

// 播放音效
engine.play('my_sfx')

// 音量控制
engine.setMasterVolume(0.8)
engine.setSfxVolume(0.7)

// 静音
engine.toggleMute()
```

### 2. sfx.ts

音效定义文件，包含 55 个音效的 ID 常量和注册配置。

**职责**：
- 定义音效 ID 常量（`SFX_IDS`）
- 定义音效注册配置（`SFX_DEFINITIONS`）
- 提供便捷播放函数（`playSfx` / `playAttackSfx` / `playEnemyDieSfx` / `playPickupSfx`）

**API**：
```typescript
import { SFX_IDS, playSfx, playAttackSfx, playEnemyDieSfx, playPickupSfx } from './sfx'

// 播放指定音效
playSfx(SFX_IDS.WARRIOR_SLASH)

// 按职业播放攻击音效
playAttackSfx('warrior')

// 按敌人类型播放死亡音效
playEnemyDieSfx('boss')

// 按道具类型播放拾取音效
playPickupSfx('gold')
```

### 3. useSound.ts

React Hook，封装音效播放逻辑。

**职责**：
- 初始化音效系统（`initSfx`）
- 提供便捷播放方法（`play` / `playClick` / `playHurt` 等）
- 提供音量控制方法（`setMasterVolume` / `setSfxVolume`）

**API**：
```typescript
import { useSound } from '../audio/useSound'

function MyComponent() {
  const {
    play,
    playAttack,
    playEnemyDie,
    playPickup,
    playClick,
    playHurt,
    playHeal,
    playDie,
    playDash,
    playShield,
    playSpeed,
    playFloorTransition,
    playVictory,
    playGameOver,
    setMasterVolume,
    setSfxVolume,
    toggleMute,
    isMuted,
    SFX_IDS,
  } = useSound()
}
```

## 触发点映射

### GamePage.tsx

| 事件 | 触发位置 | 音效 | 说明 |
|------|---------|------|------|
| 玩家受伤 | `game:state` 事件（`e.hp < prevHp`） | `player_hurt` | 仅本地玩家 |
| 敌人受伤 | `game:state` 事件（`e.hp < prevHp`） | `enemy_hit` | 非玩家实体 |
| 敌人死亡 | `game:state` 事件（`hp <= 0`） | `enemy_die_*` | 按敌人类型 |
| 道具拾取 | `game:state` 事件（items 数量减少） | `pickup_*` | 按道具类型 |
| 楼层切换 | `game:floor:start` 事件 | `floor_transition` | 每次楼层切换 |
| 游戏胜利 | `game:end` 事件（`win: true`） | `victory` | 游戏胜利 |
| 游戏失败 | `game:end` 事件（`win: false`） | `game_over` | 游戏失败 |

### PixelButton.tsx

| 事件 | 触发位置 | 音效 | 说明 |
|------|---------|------|------|
| 按钮点击 | `onClick` 事件 | `ui_click` | 所有像素按钮 |

### 技能系统

| 事件 | 触发位置 | 音效 | 说明 |
|------|---------|------|------|
| 冲刺 | `game:input` 事件（`skill: 0`） | `skill_dash` | 已接入 |
| 护盾 | `game:input` 事件（`skill: 1`） | `skill_shield_on` | 已接入 |
| 治疗 | `game:input` 事件（`skill: 2`） | `skill_heal` | 已接入 |
| 加速 | `game:input` 事件（`skill: 3`） | `skill_speed_on` | 已接入 |

## 性能优化

Howler.js 内置音效池，支持同时播放多个相同音效。音效在 `initSfx()` 时通过 `registerAll()` 批量注册。

## 扩展指南

### 添加新音效

1. 在 `scripts/generate-sfx.js` 中添加音效定义
2. 运行 `node scripts/generate-sfx.js` 生成 .wav 文件
3. 在 `src/audio/sfx.ts` 中添加音效 ID 和注册配置
4. 在 `src/audio/useSound.ts` 中添加便捷方法
5. 在触发点调用音效

### 调整音效参数

1. 在 [jsfxr](https://sfxr.me/) 中调整参数
2. 点击 "Serialize" 获取参数 JSON
3. 更新 `scripts/generate-sfx.js` 中的音效定义
4. 运行 `node scripts/generate-sfx.js` 重新生成

### 添加音效触发点

1. 在 `src/audio/useSound.ts` 中添加便捷方法
2. 在触发点调用音效
3. 测试音效触发是否正常
