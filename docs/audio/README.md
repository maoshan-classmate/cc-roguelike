# 音效系统概述

> 55 个程序化生成的 Chiptune + Dark Ambient 音效，覆盖战斗/UI/环境/多人联机全场景。

## 技术栈

| 环节 | 工具 | 说明 |
|------|------|------|
| **生成** | jsfxr | 8-bit 音效生成器，参数化控制 |
| **存储** | `src/assets/sfx/` | 55 个 .wav 文件 |
| **播放** | Howler.js | 跨浏览器音效库，~10KB |
| **触发** | React Hook | `useSound()` 封装播放逻辑 |

## 音效分类

| 类别 | 数量 | 说明 |
|------|------|------|
| 战斗-玩家攻击 | 10 | 4 职业独立音效（战士/游侠/法师/牧师） |
| 战斗-敌人行为 | 9 | 按敌人类型区分（basic/ghost/tank/boss） |
| 玩家状态 | 5 | 受伤/治疗/死亡/复活/升级 |
| 技能系统 | 7 | 冲刺/护盾/加速/冷却完成 |
| 道具系统 | 6 | 金币/药水/钥匙/武器/宝箱 |
| 地牢系统 | 6 | 楼层切换/门/楼梯/环境音 |
| UI 系统 | 9 | 按钮/菜单/游戏事件 |
| 多人联机 | 3 | 加入/离开/准备 |

## 快速上手

```typescript
import { useSound } from '../audio/useSound'

function MyComponent() {
  const { play, playClick, playHurt } = useSound()

  // 播放指定音效
  play(SFX_IDS.WARRIOR_SLASH)

  // 便捷方法
  playClick()  // UI 点击
  playHurt()   // 玩家受伤
}
```

## 文件结构

```
src/
├── audio/
│   ├── SoundEngine.ts      # Howler.js 封装（单例）
│   ├── sfx.ts              # 音效定义（55个）
│   └── useSound.ts         # React Hook
├── assets/
│   └── sfx/
│       ├── warrior_slash.wav
│       ├── warrior_hit.wav
│       └── ... (55个文件)
```

## 相关文档

- [音效清单](sfx-inventory.md) — 55 个音效完整列表，按 8 大系统分类
- [风格指南](style-guide.md) — Chiptune + Dark Ambient 风格规范，打击感设计
- [技术实现](implementation.md) — 架构设计、触发点映射、扩展指南
- [使用状态](usage-status.md) — 55 个音效接入状态（已接入/待接入/不适用），含代码证据
- [接入方案](implementation-plan.md) — 分三阶段实施，按优先级排序

## 已知问题

- [音效质量问题追踪](sfx-quality-issues.md) — 55 个音效逐个评估，含修复方案
