# 方案 C：纯 JS 卷积混响后处理方案

> 状态：待实施
> 创建日期：2026-04-30
> 前置条件：方案 A（jsfxr 参数精调）+ 方案 B（CC0 外部素材）已完成

## 目标

为 53 个 jsfxr 生成的 WAV 音效添加**微妙混响**，统一 Dark Ambient 暗色地牢氛围。
混响必须**不压过原始音效的 Chiptune 清晰度**——它是背景层，不是主角。

## 风格对齐

### Dark Ambient 的听觉特征

| 特征 | 描述 | 混响实现 |
|------|------|---------|
| **洞穴感** | 声音在石壁空间中反射 | 混响衰减 0.3-0.6s |
| **暗色** | 高频被吸收，低频保留 | 混响尾音加低通滤波 |
| **距离感** | 声音像从远处传来 | pre-delay 5-15ms + 微妙干湿比 |
| **沉浸** | 包裹感，不是干巴巴的数字音 | 所有音效共享同一空间特征 |

### Chiptune 不能被破坏

8-bit 音效的核心特征是**清晰、锐利、短促**。混响必须：
- **干湿比低**（wet ≤ 0.15）— 原始音效为主，混响为辅
- **不模糊攻击瞬态** — pre-delay 保持攻击清晰
- **不增加过多低频** — 避免与 chiptune 的明亮感冲突

## 声学特征分组（10 组）

混响取决于声音的**物理属性**（材质、空间、距离），不是游戏系统分类。

### 分组定义

| 组 | 声学特征 | 典型声源 | wet | decay | pre-delay | 低通截止 |
|----|---------|---------|-----|-------|-----------|---------|
| **metal** | 金属碰撞，短促明亮，高频反射快 | 剑刃、锤击、钥匙、金币、链条 | 0.10 | 0.3s | 8ms | 2800Hz |
| **flesh** | 肉体/甲壳打击，沉闷短促 | 玩家受伤、敌人受击、敌人死亡 | 0.08 | 0.25s | 5ms | 2000Hz |
| **projectile** | 远程破空，速度快，方向感强 | 箭矢、能量弹飞行、冲刺风声 | 0.06 | 0.2s | 6ms | 3000Hz |
| **burst** | 能量爆裂/释放，瞬态冲击 | 能量弹命中、爆炸、蓄力释放 | 0.10 | 0.35s | 8ms | 2200Hz |
| **ethereal** | 空灵扩散，长尾音，相位漂移 | 幽灵攻击/死亡、护盾、加速 | 0.14 | 0.55s | 12ms | 1600Hz |
| **divine** | 神圣温暖，柔和扩散 | 牧师施法/治疗、玩家治疗/复活 | 0.12 | 0.45s | 10ms | 2000Hz |
| **liquid** | 液体晃动，中频为主 | 药水拾取 | 0.10 | 0.35s | 8ms | 2200Hz |
| **cave** | 洞穴回声，长衰减，空间感最大 | 水滴、环境音、楼层切换 | 0.15 | 0.6s | 15ms | 1800Hz |
| **rumble** | 持续低频，嗡鸣感 | 风声、Boss 威压、能量弹嗡鸣 | 0.12 | 0.5s | 10ms | 1500Hz |
| **clean** | 几乎无混响，干净反馈 | UI 点击/悬停/确认/取消、游戏事件 | 0.04 | 0.15s | 2ms | 4000Hz |

### 音效→分组映射（55 个）

| ID | 音效 | 组 | 理由 |
|----|------|-----|------|
| 001 | warrior_slash | metal | CC0 blade，金属剑刃划过 |
| 002 | warrior_hit | metal | CC0 hammer，金属锤击碰撞 |
| 003 | ranger_draw | projectile | 弦绷紧，张力方向感 |
| 004 | ranger_shoot | projectile | 箭矢破空 |
| 005 | ranger_hit | flesh | 箭矢穿刺肉体 |
| 006 | mage_cast | burst | 能量聚集释放 |
| 007 | mage_orb_fly | rumble | 能量弹持续嗡鸣 |
| 008 | mage_hit | burst | 能量弹命中爆裂 |
| 009 | cleric_cast | divine | 神圣和弦 |
| 010 | cleric_heal | divine | 治愈音阶 |
| 011 | enemy_basic_attack | flesh | 低沉咆哮，肉体感 |
| 012 | enemy_ghost_attack | ethereal | 幽灵空灵相位 |
| 013 | enemy_tank_attack | flesh | 沉重撞击 |
| 014 | enemy_boss_attack | rumble | 威压低频 |
| 015 | enemy_boss_special | burst | 蓄力+释放 |
| 016 | enemy_hit | flesh | 被打反馈 |
| 017 | enemy_die_basic | flesh | 消散终结 |
| 018 | enemy_die_ghost | ethereal | 幽灵消散 |
| 019 | enemy_die_boss | burst | 爆炸+胜利 |
| 020 | player_hurt | flesh | 玩家闷哼受击 |
| 021 | player_heal | divine | 被治疗温暖恢复 |
| 022 | player_die | flesh | 死亡消散 |
| 023 | player_respawn | divine | 重生上升 |
| 024 | level_up | divine | 升级琶音（不适用，保留分组） |
| 025 | skill_dash | projectile | 冲刺风声 |
| 026 | skill_shield_on | ethereal | 能量护盾嗡鸣 |
| 027 | skill_shield_off | ethereal | 能量消散 |
| 028 | skill_heal | divine | 自我治疗 |
| 029 | skill_speed_on | ethereal | 能量涌动风切 |
| 030 | skill_speed_off | ethereal | 能量衰减 |
| 031 | skill_cooldown | clean | 清脆提示 |
| 032 | pickup_gold | metal | 金币金属碰撞 |
| 033 | pickup_potion_hp | liquid | 液体晃动 |
| 034 | pickup_potion_mp | liquid | 魔法液体 |
| 035 | pickup_key | metal | 钥匙金属碰撞 |
| 036 | pickup_weapon | metal | 装备金属厚重 |
| 037 | pickup_treasure | metal | 宝箱开启金属感 |
| 038 | floor_transition | cave | 楼层过渡空间感 |
| 039 | door_open | cave | 石门移动 |
| 040 | stairs_down | cave | 脚步回声 |
| 041 | ambient_drip | cave | 水滴洞穴回响 |
| 042 | ambient_chain | cave | 链条远距回荡 |
| 043 | ambient_wind | rumble | 持续低频风声 |
| 044 | ui_click | clean | 按钮点击 |
| 045 | ui_hover | clean | 按钮悬停 |
| 046 | ui_select | clean | 选择确认 |
| 047 | ui_back | clean | 返回取消 |
| 048 | ui_error | clean | 错误警告 |
| 049 | game_start | clean | 史诗开场 |
| 050 | game_over | cave | 悲壮结束（需要空间感） |
| 051 | victory | cave | 胜利（需要空间感） |
| 052 | chat_message | clean | 聊天提示 |
| 053 | player_join | clean | 加入提示 |
| 054 | player_leave | clean | 离开提示 |
| 055 | all_ready | clean | 准备确认 |

## 算法设计

### 整体流程

```
读取 WAV → 解析 PCM → 转 Float64 → 卷积混响（含低通滤波 IR）→ 干湿混合 → 转 8-bit → 写回 WAV
```

### 1. WAV 读写

WAV 格式（jsfxr 默认，已验证）：

| 参数 | 值 |
|------|-----|
| 格式 | PCM (format code 1) |
| 采样率 | 44100 Hz |
| 位深 | 8-bit unsigned |
| 声道 | 1 (mono) |
| 头部 | 44 字节固定 |
| 静音值 | 128（不是 0） |
| 文件数 | 53 个 WAV（另有 2 个 OGG 跳过） |
| 大小范围 | 176B（ui_hover）~ 450KB（ambient_wind） |

读取：跳过 44 字节头，逐字节读 `(sample - 128) / 128.0` 转 float。
写回：反向转 `Math.round(sample * 128 + 128)`，clamp 0-255，重建头部。

### 2. Impulse Response 生成

每个分组生成独立的 IR，核心是**指数衰减白噪声 + 低通滤波**：

```js
function generateIR(sampleRate, decay, preDelay, lowpassFreq) {
  const irLength = Math.ceil(sampleRate * decay)
  const preDelaySamples = Math.round(sampleRate * preDelay / 1000)
  const ir = new Float64Array(irLength)

  // 1. pre-delay 区域填零（静音区，制造空间感）
  // 2. 指数衰减白噪声
  for (let i = preDelaySamples; i < irLength; i++) {
    const t = (i - preDelaySamples) / (irLength - preDelaySamples)
    ir[i] = (Math.random() * 2 - 1) * Math.exp(-t * 6.9)  // -60dB at decay end
  }

  // 3. 低通滤波（一阶 IIR，暗化混响尾音）
  const rc = 1.0 / (2 * Math.PI * lowpassFreq)
  const dt = 1.0 / sampleRate
  const alpha = dt / (rc + dt)
  for (let i = 1; i < irLength; i++) {
    ir[i] = ir[i-1] + alpha * (ir[i] - ir[i-1])
  }

  // 4. 归一化
  const peak = Math.max(...ir.map(Math.abs))
  if (peak > 0) for (let i = 0; i < irLength; i++) ir[i] /= peak

  return ir
}
```

**低通滤波的作用**：Dark Ambient 的"暗"来自高频被空间吸收。
纯白噪声 IR 会产生明亮混响尾音，与哥特地牢氛围冲突。
一阶 IIR 低通（-6dB/oct）简单有效。

### 3. 卷积运算

直接卷积（非 FFT）：

```js
function convolve(input, ir) {
  const output = new Float64Array(input.length + ir.length - 1)
  for (let i = 0; i < input.length; i++) {
    for (let j = 0; j < ir.length; j++) {
      output[i + j] += input[i] * ir[j]
    }
  }
  return output.subarray(0, input.length)
}
```

### 4. 干湿混合

```js
function mixDryWet(dry, wet, wetRatio) {
  const output = new Float64Array(dry.length)
  for (let i = 0; i < dry.length; i++) {
    output[i] = dry[i] * (1 - wetRatio) + wet[i] * wetRatio
  }
  return output
}
```

## 脚本结构

```
scripts/postprocess-sfx.js
├── readWav(buffer)           → { sampleRate, samples: Float64Array }
├── writeWav(samples, sr)     → Buffer (44-byte header + 8-bit PCM)
├── generateIR(sr, config)    → Float64Array
├── convolve(input, ir)       → Float64Array
├── mixDryWet(dry, wet, ratio)→ Float64Array
├── REVERB_PROFILES           → 10 组声学特征参数
├── SFX_REVERB_MAP            → 55 个音效→分组映射
└── main()                    → 遍历 53 个 WAV，逐个处理
```

- 零外部依赖
- 只处理 `.wav`，跳过 `.ogg`（warrior_slash.ogg, warrior_hit.ogg）
- 处理后覆盖原文件
- 输出每个文件的处理日志（分组、参数、前后大小）

## 预期输出

```
=== 音效后处理（纯 JS Dark Ambient 混响） ===
输入: src/assets/sfx/
分组: 10 类声学特征 × 独立参数

[metal]   warrior_slash.ogg → 跳过（OGG 外部素材）
[metal]   warrior_hit.ogg   → 跳过（OGG 外部素材）
[metal]   pickup_gold.wav   → wet=0.10 decay=0.3s (1736B → 1920B)
[flesh]   enemy_hit.wav     → wet=0.08 decay=0.25s (1136B → 1220B)
[ethereal] enemy_ghost_attack.wav → wet=0.14 decay=0.55s (14046B → 16800B)
[cave]    ambient_drip.wav  → wet=0.15 decay=0.6s (25086B → 28340B)
[clean]   ui_click.wav      → wet=0.04 decay=0.15s (336B → 344B)
...

=== 完成: 51 处理, 2 跳过, 0 失败 ===
```

## 性能预估

| IR 长度 | 典型文件大小 | 卷积次数 | 预估时间 |
|---------|------------|---------|---------|
| 6615（clean 0.15s） | ~500B | ~330万 | <0.1s |
| 13230（flesh 0.3s） | ~5KB | ~6600万 | ~0.5s |
| 26460（cave 0.6s） | ~450KB | ~120亿 | ~15-30s |

总计 53 个文件，预计 **1-3 分钟**。

## 验证

1. `node scripts/postprocess-sfx.js` → 53 个 WAV 处理成功，2 个 OGG 跳过
2. `node scripts/generate-sfx.js` → 55 个成功（后处理独立运行）
3. `npx tsc --noEmit` → 零 TS 错误
4. 游戏内听感验证：战斗音效应有微妙空间感但不模糊，环境音效应有明显洞穴感

## 风险

- **8-bit 量化噪声**：混响可能放大量化噪声。缓解：内部用 Float64Array 计算，wet 设低
- **处理时间**：最大文件 ~120 亿次乘加，单线程 JS 可能需 15-30s。构建时工具，可接受
- **OGG 跳过**：2 个 CC0 外部素材不受后处理影响。可接受——它们本身是高质量素材
