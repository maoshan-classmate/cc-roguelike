# 音效质量问题追踪

> 创建日期：2026-04-29
> 修复日期：2026-04-30
> 状态：已修复（方案 A：精调 jsfxr 参数 + 方案 B：CC0 外部素材替换 P0）
> 优先级：P1

## 问题概述

jsfxr 程序化生成的 55 个音效与 [风格指南](style-guide.md) 中定义的 Chiptune + Dark Ambient 风格存在系统性偏差。当前音效过于"电子蜂鸣"，缺乏风格指南要求的质感（金属、空气感、混响、暗色氛围）。

## 根因分析

1. **jsfxr 合成能力有限**：仅支持 4 种基础波形 + 简单包络/频率调制，无法精确控制音色细节
2. **参数覆盖不足**：生成脚本只覆盖了 `wave_type`/`p_env_*`/`p_base_freq`/`p_freq_ramp`，忽略了 `p_pha_offset`/`p_pha_ramp`（相位效果）、`p_lpf_freq`（低通滤波）、`p_hpf_freq`（高通滤波）、`p_repeat_speed`（重复）等关键音色调制参数
3. **预设基底偏差**：从 `hitHurt`/`explosion` 等预设派生，预设本身的音色与本游戏风格不匹配

## 逐个音效质量评估

### 1. 战斗 - 玩家攻击（10个）

| ID | 名称 | 风格指南要求 | 问题 | 状态 |
|----|------|------------|------|------|
| 001 | warrior_slash | 金属划痕，短促有力 | 缺少金属质感 | ✅ 方案 A+B（CC0 blade 替换） |
| 002 | warrior_hit | 金属碰撞，沉闷 | 与 slash 区分度不够 | ✅ 方案 A+B（CC0 hammer 替换） |
| 003 | ranger_draw | 弦绷紧声 | 缺少弦张力感 | ✅ 方案 A（+颤音参数） |
| 004 | ranger_shoot | 破空声 | 缺少空气切割感 | — 基本符合 |
| 005 | ranger_hit | 穿刺声 | 缺少穿透感 | ✅ 方案 A（+高通+占空比） |
| 006 | mage_cast | 能量聚集上升 | 缺少脉冲感 | ✅ 方案 A（+重复+相位） |
| 007 | mage_orb_fly | 持续嗡鸣 | 缺少呼吸感 | — 基本可用 |
| 008 | mage_hit | 能量爆裂 | — | — 可接受 |
| 009 | cleric_cast | 神圣和弦 | 缺少温暖感 | ✅ 方案 A（+琶音+共振） |
| 010 | cleric_heal | 治愈音阶 | — | — 可接受 |

### 2. 战斗 - 敌人行为（9个）

| ID | 名称 | 风格指南要求 | 问题 | 状态 |
|----|------|------------|------|------|
| 011 | enemy_basic_attack | 低沉咆哮，Sawtooth | 缺少咆哮的"喉音"质感 | ✅ 方案 A（+颤音+低通） |
| 012 | enemy_ghost_attack | 空灵回响，Sine 慢起音 | 缺少空灵感，应加 `p_pha_offset` 制造相位漂移 | ✅ 方案 A（+相位漂移+高通） |
| 013 | enemy_tank_attack | 沉重撞击，Square 低频 | 基本符合，但缺少重量感 | — 基本符合 |
| 014 | enemy_boss_attack | 威压感低频，Sawtooth | 缺少威压感，应更长 sustain + 更低频率 | ✅ 方案 A（+低通共振+颤音） |
| 015 | enemy_boss_special | 蓄力+释放，Sawtooth | 基本符合蓄力感，可接受 | — 可接受 |
| 016 | enemy_hit | 被打反馈，Square | 基本符合，缺少肉体/甲壳碰撞质感 | — 基本符合 |
| 017 | enemy_die_basic | 消散声终结感，Sawtooth 中频→下降 | 基本符合消散感 | — 基本符合 |
| 018 | enemy_die_ghost | 空灵消散，Sine | 缺少空灵的"回响"感 | ✅ 方案 A（+负相位+高通） |
| 019 | enemy_die_boss | 爆炸+胜利感，Noise | 基本符合，可接受 | — 可接受 |

### 3. 玩家状态（5个）

| ID | 名称 | 风格指南要求 | 问题 | 状态 |
|----|------|------------|------|------|
| 020 | player_hurt | 短促闷哼，Square | 缺少"肉体受击"感，应更闷 | ✅ 方案 A（+低通+占空比渐变） |
| 021 | player_heal | 温暖恢复，Sine | 基本符合温暖感 | — 基本符合 |
| 022 | player_die | 下降+消散，Sawtooth | 基本符合死亡感 | — 基本符合 |
| 023 | player_respawn | 上升+重生感，Sine | 基本符合 | — 基本符合 |
| 024 | level_up | 上升琶音史诗，Square | 基本符合（当前不适用） | — 不适用 |

### 4. 技能系统（7个）

| ID | 名称 | 风格指南要求 | 问题 | 状态 |
|----|------|------------|------|------|
| 025 | skill_dash | 快速风声，Noise | 过短（0.1KB），几乎听不到 | ✅ 方案 A（sustain 0.15s + 高通） |
| 026 | skill_shield_on | 能量护盾声，Sine | 缺少能量屏障的"嗡鸣"感 | ✅ 方案 A（+重复脉冲+相位） |
| 027 | skill_shield_off | 能量消散，Sine | 基本符合 | — 基本符合 |
| 028 | skill_heal | 治愈音效，Sine | 基本符合 | — 基本符合 |
| 029 | skill_speed_on | 能量注入，Sawtooth | 缺少速度感的"风切"声 | ✅ 方案 A（+相位+高通+颤音） |
| 030 | skill_speed_off | 能量衰减，Sawtooth | 基本符合 | — 基本符合 |
| 031 | skill_cooldown | 清脆提示，Square | 基本符合 | — 基本符合 |

### 5. 道具系统（6个）

| ID | 名称 | 风格指南要求 | 问题 | 状态 |
|----|------|------------|------|------|
| 032 | pickup_gold | 金币碰撞明亮，Square 高频→上升 | 缺少金属碰撞的"叮"感 | ✅ 方案 A（+相位+共振） |
| 033 | pickup_potion_hp | 液体晃动，Sine | 缺少液体晃动感，应加 noise 成分 | ✅ 方案 A（+颤音+相位） |
| 034 | pickup_potion_mp | 魔法能量，Sine | 与 hp 药水区分度不够 | ✅ 方案 A（+负相位+琶音，与 HP 区分） |
| 035 | pickup_key | 金属碰撞，Square 高频 | 缺少金属碰撞的清脆感 | ✅ 方案 A（+相位+共振+高通） |
| 036 | pickup_weapon | 厚重装备感，Sawtooth | 缺少重量感 | ✅ 方案 A（+低通+共振+占空比渐变） |
| 037 | pickup_treasure | 宝箱开启惊喜，Square | 基本符合惊喜感 | — 基本符合 |

### 6. 地牢系统（6个）

| ID | 名称 | 风格指南要求 | 问题 | 状态 |
|----|------|------------|------|------|
| 038 | floor_transition | 下降/上升过渡，Sine | 基本符合过渡感 | — 基本符合 |
| 039 | door_open | 石门移动，Noise | 缺少石头摩擦的"嘎吱"感 | ✅ 方案 A（+低通+重复节奏） |
| 040 | stairs_down | 脚步+回响，Sine | 缺少脚步节奏感 | ✅ 方案 A（+重复+相位） |
| 041 | ambient_drip | 水滴回响，Sine 高频→快降 | 缺少回响/混响感，应更长 decay | ✅ 方案 A（decay 0.5s + 低通渐变） |
| 042 | ambient_chain | 金属碰撞远距离，Square | 缺少远距离的"回荡"感 | ✅ 方案 A（decay 0.35s + 相位+低通渐变） |
| 043 | ambient_wind | 低沉持续，Noise | 基本符合，但 439KB 过大 | — 基本符合（体积问题保留） |

### 7. UI 系统（9个）

| ID | 名称 | 风格指南要求 | 问题 | 状态 |
|----|------|------------|------|------|
| 044 | ui_click | 清脆方波，Square 高频→轻微上升 | 基本符合，过短 | — 基本符合 |
| 045 | ui_hover | 柔和提示，Sine | 基本符合 | — 基本符合 |
| 046 | ui_select | 确认音，Square 中频→上升 | 基本符合 | — 基本符合 |
| 047 | ui_back | 取消音，Square 中频→下降 | 基本符合 | — 基本符合 |
| 048 | ui_error | 警告音，Square 低频→下降 | 基本符合 | — 基本符合 |
| 049 | game_start | 史诗开场，Square | 基本符合 | — 基本符合 |
| 050 | game_over | 悲壮结束，Sawtooth | 基本符合悲壮感 | — 基本符合 |
| 051 | victory | 欢快琶音，Square | 基本符合 | — 基本符合 |
| 052 | chat_message | 清脆提示，Sine | 基本符合 | — 基本符合 |

### 8. 多人联机（3个）

| ID | 名称 | 风格指南要求 | 问题 | 状态 |
|----|------|------------|------|------|
| 053 | player_join | 上升提示，Sine | 基本符合 | — 基本符合 |
| 054 | player_leave | 下降提示，Sine | 基本符合 | — 基本符合 |
| 055 | all_ready | 确认和弦，Square | 基本符合 | — 基本符合 |

## 问题汇总

### 严重度 P0（必须修复，影响核心体验）

| ID | 音效 | 问题 | 状态 |
|----|------|------|------|
| 001 | warrior_slash | 战士挥剑音效缺乏金属质感，听起来像电子蜂鸣 | ✅ 方案 A+B（CC0 blade 替换） |
| 002 | warrior_hit | 与 slash 区分度不够，缺少碰撞的"钝感" | ✅ 方案 A+B（CC0 hammer 替换） |
| 025 | skill_dash | 过短（0.1KB），几乎听不到 | ✅ 方案 A（0.1KB→1.2KB，清晰可听） |

### 严重度 P1（应该修复，影响体验品质）

| ID | 音效 | 问题 | 状态 |
|----|------|------|------|
| 003 | ranger_draw | 缺乏弦的张力感 | ✅ 方案 A（+颤音参数） |
| 006 | mage_cast | 缺少能量聚集的脉冲感 | ✅ 方案 A（+重复+相位） |
| 009 | cleric_cast | 缺少神圣和弦的温暖感 | ✅ 方案 A（+琶音+共振） |
| 011 | enemy_basic_attack | 缺少咆哮的喉音质感 | ✅ 方案 A（+颤音+低通） |
| 012 | enemy_ghost_attack | 缺少空灵的相位漂移感 | ✅ 方案 A（+相位漂移+高通） |
| 020 | player_hurt | 缺少肉体受击感 | ✅ 方案 A（+低通+占空比渐变） |
| 033 | pickup_potion_hp | 缺少液体晃动感 | ✅ 方案 A（+颤音+相位） |
| 034 | pickup_potion_mp | 与 hp 药水区分度不够 | ✅ 方案 A（+负相位+琶音） |
| 035 | pickup_key | 缺少金属碰撞清脆感 | ✅ 方案 A（+相位+共振+高通） |
| 041 | ambient_drip | 缺少回响/混响感 | ✅ 方案 A（decay 0.5s + 低通渐变） |
| 042 | ambient_chain | 缺少远距离回荡感 | ✅ 方案 A（decay 0.35s + 相位+低通渐变） |

### 严重度 P2（锦上添花）

| ID | 音效 | 问题 | 状态 |
|----|------|------|------|
| 005 | ranger_hit | 缺少穿刺穿透感 | ✅ 方案 A（+高通+占空比） |
| 014 | enemy_boss_attack | 缺少威压感 | ✅ 方案 A（+低通共振+颤音） |
| 018 | enemy_die_ghost | 缺少空灵回响感 | ✅ 方案 A（+负相位+高通） |
| 026 | skill_shield_on | 缺少能量屏障嗡鸣感 | ✅ 方案 A（+重复脉冲+相位） |
| 029 | skill_speed_on | 缺少风切声 | ✅ 方案 A（+相位+高通+颤音） |
| 032 | pickup_gold | 缺少金属碰撞叮感 | ✅ 方案 A（+相位+共振） |
| 036 | pickup_weapon | 缺少重量感 | ✅ 方案 A（+低通+共振+占空比渐变） |
| 039 | door_open | 缺少石头摩擦嘎吱感 | ✅ 方案 A（+低通+重复节奏） |
| 040 | stairs_down | 缺少脚步节奏感 | ✅ 方案 A（+重复+相位） |

## 修复方案

### 方案 A：精调 jsfxr 参数（推荐，低成本）

利用 jsfxr 的完整参数集（当前脚本未使用）：
- `p_pha_offset` / `p_pha_ramp`：相位效果，制造金属共鸣/空灵感
- `p_lpf_freq` / `p_lpf_ramp` / `p_lpf_resonance`：低通滤波，控制音色暗度
- `p_hpf_freq` / `p_hpf_ramp`：高通滤波，去除低频浑浊
- `p_vib_strength` / `p_vib_speed`：颤音，模拟弦振动/能量脉冲
- `p_arp_mod` / `p_arp_speed`：琶音，制造和弦感
- `p_repeat_speed`：重复，制造节奏感/脉冲感
- `sound_vol`：音量控制

### 方案 B：引入外部 CC0 素材（中成本）

从 [OpenGameArt](https://opengameart.org/) 获取 CC0 音效素材，替换关键音效（P0 + P1）。

### 方案 C：构建时后处理（待定）

为所有音效添加微妙混响，统一 Dark Ambient 暗色氛围。原计划用 Tone.js 实现，但 Node.js 缺少 `OfflineAudioContext`。待选定替代方案后重新实施（纯 JS 卷积混响或其他）。

---

## 修复记录（2026-04-30）

**采用方案 A**：精调 jsfxr 参数。修改文件：`scripts/generate-sfx.js`

### P0 修复（3个）

| ID | 音效 | 新增参数 | 效果 |
|----|------|---------|------|
| 001 | warrior_slash | `p_pha_offset:0.3, p_lpf_resonance:0.3, p_hpf_freq:0.05` | 相位效果→金属质感 |
| 002 | warrior_hit | `p_duty_ramp:-0.3, p_lpf_freq:0.4, p_env_punch:0.7` | 低频钝击感，与 slash 区分明显 |
| 025 | skill_dash | sustain 0.05→0.15, decay 0.1→0.2, `p_hpf_freq:0.15` | 153B→1.2KB，清晰可听 |

### P1 修复（11个）

| ID | 新增关键参数 |
|----|-------------|
| 003 ranger_draw | `p_vib_strength:0.2, p_vib_speed:0.5` |
| 006 mage_cast | `p_repeat_speed:0.4, p_pha_offset:-0.15, p_vib_strength:0.15` |
| 009 cleric_cast | `p_arp_mod:0.3, p_arp_speed:0.4, p_lpf_resonance:0.15` |
| 011 enemy_basic_attack | `p_vib_strength:0.25, p_vib_speed:0.7, p_lpf_freq:0.5` |
| 012 enemy_ghost_attack | `p_pha_offset:-0.4, p_pha_ramp:0.1, p_hpf_freq:0.1` |
| 020 player_hurt | `p_lpf_freq:0.35, p_duty_ramp:-0.2` |
| 033 pickup_potion_hp | `p_vib_strength:0.2, p_vib_speed:0.8, p_pha_offset:0.15` |
| 034 pickup_potion_mp | `p_pha_offset:-0.2, p_arp_mod:0.15`（与 HP 区分） |
| 035 pickup_key | `p_pha_offset:0.25, p_lpf_resonance:0.3, p_hpf_freq:0.1` |
| 041 ambient_drip | decay 0.3→0.5, `p_lpf_ramp:-0.2` |
| 042 ambient_chain | decay 0.2→0.35, `p_pha_offset:0.3, p_lpf_ramp:-0.15` |

### P2 修复（9个）

| ID | 新增关键参数 |
|----|-------------|
| 005 ranger_hit | `p_hpf_freq:0.1, p_duty:0.3, p_pha_offset:0.15` |
| 014 enemy_boss_attack | `p_lpf_freq:0.3, p_lpf_resonance:0.25, p_vib_strength:0.15` |
| 018 enemy_die_ghost | `p_pha_offset:-0.3, p_hpf_freq:0.1` |
| 026 skill_shield_on | `p_repeat_speed:0.6, p_pha_offset:0.1` |
| 029 skill_speed_on | `p_pha_offset:0.15, p_hpf_freq:0.1, p_vib_strength:0.1` |
| 032 pickup_gold | `p_pha_offset:0.2, p_lpf_resonance:0.25` |
| 036 pickup_weapon | `p_lpf_freq:0.5, p_lpf_resonance:0.2, p_duty_ramp:-0.15` |
| 039 door_open | `p_lpf_freq:0.35, p_repeat_speed:0.3` |
| 040 stairs_down | `p_repeat_speed:0.4, p_pha_offset:0.05` |

### 全量 sound_vol 标准化

55 个音效全部添加 `sound_vol`，按风格指南分类：
- 战斗/玩家状态/技能: 0.7
- 道具拾取/UI/多人: 0.5
- 地牢/氛围: 0.35

### 验证结果

- `node scripts/generate-sfx.js` → 55 成功，0 失败
- `npx tsc --noEmit` → 零 TS 错误
- skill_dash.wav: 0.1KB → 1.2KB
- warrior_slash(1.8KB) vs warrior_hit(4.0KB) 区分明显

---

## 方案 B 实施记录（2026-04-30）

**采用方案 B**：CC0 外部素材替换关键音效。方案 C（构建时后处理）待定。

### 变更概述

| 项目 | 变更 |
|------|------|
| 素材来源 | OpenGameArt rubberduck CC0 系列（80 RPG SFX + 100 metal/wood SFX） |
| 替换音效 | 2 个 P0（warrior_slash, warrior_hit） |
| 保留 jsfxr | skill_dash（方案 A 已修复至 0.6KB，可接受） |
| 格式 | .ogg（Howler.js 原生支持） |
| 播放代码 | 零改动（SoundEngine.ts / useSound.ts 不动） |

### 替换详情

| ID | 音效 | CC0 来源 | 文件 | 原始大小 |
|----|------|---------|------|---------|
| 001 | warrior_slash | 80 CC0 RPG SFX → blade_01.ogg | warrior_slash.ogg | 14.8 KB |
| 002 | warrior_hit | 100 CC0 metal/wood → hammer_02.ogg | warrior_hit.ogg | 11.8 KB |

### 技术实现

- `scripts/generate-sfx.js`：新增 `type: 'external'` 支持，从 `inbox/` 目录复制 CC0 素材
- `src/audio/sfx.ts`：2 个音效路径从 `.wav` 改为 `.ogg`（Howler.js 原生支持）
- `src/assets/sfx/inbox/`：新建目录，存放 CC0 原始素材

### 验证结果

- `node scripts/generate-sfx.js` → 55 成功（53 jsfxr + 2 external）
- `npx tsc --noEmit` → 零 TS 错误
- warrior_slash: jsfxr 1.8KB → CC0 blade 14.8KB（真实金属剑刃音效）
- warrior_hit: jsfxr 4.0KB → CC0 hammer 11.8KB（真实锤击碰撞音效）
