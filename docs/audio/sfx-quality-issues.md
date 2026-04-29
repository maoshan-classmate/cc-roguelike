# 音效质量问题追踪

> 创建日期：2026-04-29
> 状态：待修复
> 优先级：P1

## 问题概述

jsfxr 程序化生成的 55 个音效与 [风格指南](style-guide.md) 中定义的 Chiptune + Dark Ambient 风格存在系统性偏差。当前音效过于"电子蜂鸣"，缺乏风格指南要求的质感（金属、空气感、混响、暗色氛围）。

## 根因分析

1. **jsfxr 合成能力有限**：仅支持 4 种基础波形 + 简单包络/频率调制，无法精确控制音色细节
2. **参数覆盖不足**：生成脚本只覆盖了 `wave_type`/`p_env_*`/`p_base_freq`/`p_freq_ramp`，忽略了 `p_pha_offset`/`p_pha_ramp`（相位效果）、`p_lpf_freq`（低通滤波）、`p_hpf_freq`（高通滤波）、`p_repeat_speed`（重复）等关键音色调制参数
3. **预设基底偏差**：从 `hitHurt`/`explosion` 等预设派生，预设本身的音色与本游戏风格不匹配

## 逐个音效质量评估

### 1. 战斗 - 玩家攻击（10个）

| ID | 名称 | 风格指南要求 | 当前实际 | 问题 |
|----|------|------------|---------|------|
| 001 | warrior_slash | 金属划痕，短促有力，Sawtooth 高频→快降 | 短促电子蜂鸣，缺乏金属质感 | 缺少 `p_pha_offset` 相位效果模拟金属共鸣 |
| 002 | warrior_hit | 金属碰撞，沉闷，Square 高频→尖锐下降 | 类似 slash 但更低沉，辨识度差 | 与 slash 区分度不够，缺少碰撞的"钝感" |
| 003 | ranger_draw | 弦绷紧声，Sine 低频→上升 | 简单上升音，缺乏弦的张力感 | 缺少 `p_vib_strength` 颤音模拟弦振动 |
| 004 | ranger_shoot | 破空声，Noise 高频→快降 | 噪声爆破，勉强可用 | 基本符合，但缺少空气切割感 |
| 005 | ranger_hit | 穿刺声，Square 高频→尖锐下降 | 短促电子音 | 缺少穿刺的"穿透感"，应更尖锐 |
| 006 | mage_cast | 能量聚集上升，Sine 低频→上升 | 上升音调，缺少能量感 | 缺少 `p_repeat_speed` 制造脉冲感 |
| 007 | mage_orb_fly | 持续嗡鸣（循环），Sine | 单调嗡鸣 | 基本可用，但缺少魔法能量的"呼吸感" |
| 008 | mage_hit | 能量爆裂，Sine+快速衰减 | 爆破音 | 基本符合，可接受 |
| 009 | cleric_cast | 神圣和弦，Sine 慢起音 | 上升音，缺少神圣感 | 缺少多层叠加的和弦感，应更温暖 |
| 010 | cleric_heal | 治愈音阶温暖，Sine | 上升琶音 | 基本符合，可接受 |

### 2. 战斗 - 敌人行为（9个）

| ID | 名称 | 风格指南要求 | 当前实际 | 问题 |
|----|------|------------|---------|------|
| 011 | enemy_basic_attack | 低沉咆哮，Sawtooth | 低频噪声 | 缺少咆哮的"喉音"质感 |
| 012 | enemy_ghost_attack | 空灵回响，Sine 慢起音 | 缓慢上升音 | 缺少空灵感，应加 `p_pha_offset` 制造相位漂移 |
| 013 | enemy_tank_attack | 沉重撞击，Square 低频 | 低频冲击 | 基本符合，但缺少重量感 |
| 014 | enemy_boss_attack | 威压感低频，Sawtooth | 低频噪声 | 缺少威压感，应更长 sustain + 更低频率 |
| 015 | enemy_boss_special | 蓄力+释放，Sawtooth | 上升后爆破 | 基本符合蓄力感，可接受 |
| 016 | enemy_hit | 被打反馈，Square | 短促电子音 | 基本符合，缺少肉体/甲壳碰撞质感 |
| 017 | enemy_die_basic | 消散声终结感，Sawtooth 中频→下降 | 下降音 | 基本符合消散感 |
| 018 | enemy_die_ghost | 空灵消散，Sine | 缓慢下降音 | 缺少空灵的"回响"感 |
| 019 | enemy_die_boss | 爆炸+胜利感，Noise | 长噪声爆破 | 基本符合，可接受 |

### 3. 玩家状态（5个）

| ID | 名称 | 风格指南要求 | 当前实际 | 问题 |
|----|------|------------|---------|------|
| 020 | player_hurt | 短促闷哼，Square | 短促下降音 | 缺少"肉体受击"感，应更闷 |
| 021 | player_heal | 温暖恢复，Sine | 上升音 | 基本符合温暖感 |
| 022 | player_die | 下降+消散，Sawtooth | 长下降音 | 基本符合死亡感 |
| 023 | player_respawn | 上升+重生感，Sine | 上升音 | 基本符合 |
| 024 | level_up | 上升琶音史诗，Square | 上升琶音 | 基本符合（当前不适用） |

### 4. 技能系统（7个）

| ID | 名称 | 风格指南要求 | 当前实际 | 问题 |
|----|------|------------|---------|------|
| 025 | skill_dash | 快速风声，Noise | 极短噪声 | 过短（0.1KB），几乎听不到 |
| 026 | skill_shield_on | 能量护盾声，Sine | 上升音 | 缺少能量屏障的"嗡鸣"感 |
| 027 | skill_shield_off | 能量消散，Sine | 下降音 | 基本符合 |
| 028 | skill_heal | 治愈音效，Sine | 上升音 | 基本符合 |
| 029 | skill_speed_on | 能量注入，Sawtooth | 上升音 | 缺少速度感的"风切"声 |
| 030 | skill_speed_off | 能量衰减，Sawtooth | 下降音 | 基本符合 |
| 031 | skill_cooldown | 清脆提示，Square | 短促音 | 基本符合 |

### 5. 道具系统（6个）

| ID | 名称 | 风格指南要求 | 当前实际 | 问题 |
|----|------|------------|---------|------|
| 032 | pickup_gold | 金币碰撞明亮，Square 高频→上升 | 上升音 | 基本符合，但缺少金属碰撞的"叮"感 |
| 033 | pickup_potion_hp | 液体晃动，Sine | 上升音 | 缺少液体晃动感，应加 noise 成分 |
| 034 | pickup_potion_mp | 魔法能量，Sine | 上升音 | 与 hp 药水区分度不够 |
| 035 | pickup_key | 金属碰撞，Square 高频 | 短促上升音 | 缺少金属碰撞的清脆感 |
| 036 | pickup_weapon | 厚重装备感，Sawtooth | 上升音 | 缺少重量感 |
| 037 | pickup_treasure | 宝箱开启惊喜，Square | 长上升琶音 | 基本符合惊喜感 |

### 6. 地牢系统（6个）

| ID | 名称 | 风格指南要求 | 当前实际 | 问题 |
|----|------|------------|---------|------|
| 038 | floor_transition | 下降/上升过渡，Sine | 长下降音 | 基本符合过渡感 |
| 039 | door_open | 石门移动，Noise | 噪声 | 缺少石头摩擦的"嘎吱"感 |
| 040 | stairs_down | 脚步+回响，Sine | 下降音 | 缺少脚步节奏感 |
| 041 | ambient_drip | 水滴回响，Sine 高频→快降 | 短促滴答 | 缺少回响/混响感，应更长 decay |
| 042 | ambient_chain | 金属碰撞远距离，Square | 短促金属音 | 缺少远距离的"回荡"感 |
| 043 | ambient_wind | 低沉持续，Noise | 长噪声 | 基本符合，但 439KB 过大 |

### 7. UI 系统（9个）

| ID | 名称 | 风格指南要求 | 当前实际 | 问题 |
|----|------|------------|---------|------|
| 044 | ui_click | 清脆方波，Square 高频→轻微上升 | 极短点击 | 基本符合，过短 |
| 045 | ui_hover | 柔和提示，Sine | 极短音 | 基本符合 |
| 046 | ui_select | 确认音，Square 中频→上升 | 短上升音 | 基本符合 |
| 047 | ui_back | 取消音，Square 中频→下降 | 短下降音 | 基本符合 |
| 048 | ui_error | 警告音，Square 低频→下降 | 下降音 | 基本符合 |
| 049 | game_start | 史诗开场，Square | 长上升琶音 | 基本符合 |
| 050 | game_over | 悲壮结束，Sawtooth | 长下降音 | 基本符合悲壮感 |
| 051 | victory | 欢快琶音，Square | 上升琶音 | 基本符合 |
| 052 | chat_message | 清脆提示，Sine | 极短音 | 基本符合 |

### 8. 多人联机（3个）

| ID | 名称 | 风格指南要求 | 当前实际 | 问题 |
|----|------|------------|---------|------|
| 053 | player_join | 上升提示，Sine | 上升音 | 基本符合 |
| 054 | player_leave | 下降提示，Sine | 下降音 | 基本符合 |
| 055 | all_ready | 确认和弦，Square | 上升琶音 | 基本符合 |

## 问题汇总

### 严重度 P0（必须修复，影响核心体验）

| ID | 音效 | 问题 |
|----|------|------|
| 001 | warrior_slash | 战士挥剑音效缺乏金属质感，听起来像电子蜂鸣 |
| 002 | warrior_hit | 与 slash 区分度不够，缺少碰撞的"钝感" |
| 025 | skill_dash | 过短（0.1KB），几乎听不到 |

### 严重度 P1（应该修复，影响体验品质）

| ID | 音效 | 问题 |
|----|------|------|
| 003 | ranger_draw | 缺乏弦的张力感 |
| 006 | mage_cast | 缺少能量聚集的脉冲感 |
| 009 | cleric_cast | 缺少神圣和弦的温暖感 |
| 011 | enemy_basic_attack | 缺少咆哮的喉音质感 |
| 012 | enemy_ghost_attack | 缺少空灵的相位漂移感 |
| 020 | player_hurt | 缺少肉体受击感 |
| 033 | pickup_potion_hp | 缺少液体晃动感 |
| 034 | pickup_potion_mp | 与 hp 药水区分度不够 |
| 035 | pickup_key | 缺少金属碰撞清脆感 |
| 041 | ambient_drip | 缺少回响/混响感 |
| 042 | ambient_chain | 缺少远距离回荡感 |

### 严重度 P2（锦上添花）

| ID | 音效 | 问题 |
|----|------|------|
| 005 | ranger_hit | 缺少穿刺穿透感 |
| 014 | enemy_boss_attack | 缺少威压感 |
| 018 | enemy_die_ghost | 缺少空灵回响感 |
| 026 | skill_shield_on | 缺少能量屏障嗡鸣感 |
| 029 | skill_speed_on | 缺少风切声 |
| 032 | pickup_gold | 缺少金属碰撞叮感 |
| 036 | pickup_weapon | 缺少重量感 |
| 039 | door_open | 缺少石头摩擦嘎吱感 |
| 040 | stairs_down | 缺少脚步节奏感 |

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

从 [Freesound](https://freesound.org/) 或 [Kenney](https://kenney.nl/assets) 获取 CC0 音效素材，替换关键音效（P0 + P1）。

### 方案 C：使用 Tone.js 合成（高成本，高质量）

用 Tone.js 的专业合成器替代 jsfxr，支持 FM 合成、AM 合成、滤波器链等高级音色控制。
