/**
 * 音效生成脚本 - 使用 jsfxr 生成 55 个 .wav 文件
 * 运行：node scripts/generate-sfx.js
 *
 * API 流程：
 *   1. sfxr.generate(preset) 获取基础音效对象
 *   2. 修改参数定制音色
 *   3. sfxr.toWave(sound).wav 获取正确 WAV 数据
 *   4. Buffer.from(wave.wav) 写入文件
 *
 * jsfxr 完整参数表（23个）：
 *   参数              范围      默认   用途
 *   wave_type         0-3      varies  波形: 0=SQUARE, 1=SAWTOOTH, 2=SINE, 3=NOISE
 *   p_env_attack      0-1      varies  包络起音时间
 *   p_env_sustain     0-N      varies  包络持续（长音效如 ambient_wind 可用 >1）
 *   p_env_punch       0-1      varies  包络冲击（起音瞬间音量峰）
 *   p_env_decay       0-1      varies  包络衰减
 *   p_base_freq       0-1      varies  基础频率
 *   p_freq_limit      0-1      0       频率上限
 *   p_freq_ramp       -1~1     varies  频率滑动（负=下降，正=上升）
 *   p_freq_dramp      -1~1     0       频率加速度
 *   p_vib_strength    0-1      0       颤音强度（弦振动/能量脉冲）
 *   p_vib_speed       0-1      0       颤音速度
 *   p_arp_mod         -1~1     0       琶音调制（和弦/音程跳跃）
 *   p_arp_speed       0-1      0       琶音速度
 *   p_duty            0-1      varies  占空比（方波/锯齿波）
 *   p_duty_ramp       -1~1     0       占空比滑动
 *   p_repeat_speed    0-1      varies  重复速度（脉冲/节奏感）
 *   p_pha_offset      -1~1     0       相位偏移（正值=金属共鸣，负值=空灵）
 *   p_pha_ramp        -1~1     0       相位滑动
 *   p_lpf_freq        0-1      1       低通滤波频率（1=全开，<0.5=暗色）
 *   p_lpf_ramp        -1~1     0       低通滤波滑动
 *   p_lpf_resonance   0-1      0       低通滤波共振（共振峰=金属/哇音）
 *   p_hpf_freq        0-1      0       高通滤波频率（0=关闭，>0.1=去浑浊/空气感）
 *   p_hpf_ramp        -1~1     0       高通滤波滑动
 *   sound_vol         0-1      0.25    每音效音量
 *
 * 音量标准（sound_vol 按分类）：
 *   战斗/玩家状态/技能: 0.7
 *   道具拾取/UI/多人:   0.5
 *   地牢/氛围:          0.35
 */

const { sfxr } = require('jsfxr')
const fs = require('fs')
const path = require('path')

const OUTPUT_DIR = path.join(__dirname, '../src/assets/sfx')
const INBOX_DIR = path.join(__dirname, '../src/assets/sfx/inbox')

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
}
if (!fs.existsSync(INBOX_DIR)) {
  fs.mkdirSync(INBOX_DIR, { recursive: true })
}

/**
 * 音效定义
 * preset: jsfxr 预设名称 (hitHurt/explosion/pickupCoin/powerUp/laserShoot/jump/blipSelect/click/synth/tone/random)
 * params: 覆盖参数
 */
const SFX_DEFINITIONS = [
  // === 1. 战斗 - 玩家攻击 (10个) ===
  { id: 'warrior_slash', type: 'external', src: 'warrior_slash.ogg' },
  { id: 'warrior_hit', type: 'external', src: 'warrior_hit.ogg' },
  { id: 'ranger_draw', preset: 'laserShoot', params: { wave_type: 0, p_env_attack: 0.05, p_env_sustain: 0.12, p_env_decay: 0.05, p_base_freq: 0.25, p_freq_ramp: 0.15, p_env_punch: 0, p_vib_strength: 0.2, p_vib_speed: 0.5, p_pha_offset: 0.1, sound_vol: 0.7 } },
  { id: 'ranger_shoot', preset: 'laserShoot', params: { wave_type: 3, p_env_attack: 0, p_env_sustain: 0.03, p_env_decay: 0.08, p_base_freq: 0.8, p_freq_ramp: -0.6, p_env_punch: 0.2, sound_vol: 0.7 } },
  { id: 'ranger_hit', preset: 'hitHurt', params: { wave_type: 1, p_env_attack: 0, p_env_sustain: 0.02, p_env_decay: 0.1, p_base_freq: 0.45, p_freq_ramp: -0.35, p_env_punch: 0.5, p_duty: 0.3, p_pha_offset: 0.15, p_hpf_freq: 0.1, sound_vol: 0.7 } },
  { id: 'mage_cast', preset: 'powerUp', params: { wave_type: 0, p_env_attack: 0.05, p_env_sustain: 0.15, p_env_decay: 0.1, p_base_freq: 0.2, p_freq_ramp: 0.6, p_env_punch: 0.1, p_repeat_speed: 0.4, p_pha_offset: -0.15, p_vib_strength: 0.15, p_vib_speed: 0.6, sound_vol: 0.7 } },
  { id: 'mage_orb_fly', preset: 'synth', params: { wave_type: 0, p_env_attack: 0.1, p_env_sustain: 0.5, p_env_decay: 0.1, p_base_freq: 0.15, p_freq_ramp: 0.05, p_repeat_speed: 0.5, sound_vol: 0.7 } },
  { id: 'mage_hit', preset: 'explosion', params: { wave_type: 0, p_env_attack: 0, p_env_sustain: 0.05, p_env_decay: 0.2, p_base_freq: 0.5, p_freq_ramp: -0.5, p_env_punch: 0.6, sound_vol: 0.7 } },
  { id: 'cleric_cast', preset: 'powerUp', params: { wave_type: 0, p_env_attack: 0.08, p_env_sustain: 0.2, p_env_decay: 0.15, p_base_freq: 0.35, p_freq_ramp: 0.25, p_env_punch: 0, p_arp_mod: 0.3, p_arp_speed: 0.4, p_lpf_freq: 0.8, p_lpf_resonance: 0.15, p_vib_strength: 0.08, p_vib_speed: 0.4, sound_vol: 0.7 } },
  { id: 'cleric_heal', preset: 'powerUp', params: { wave_type: 0, p_env_attack: 0.05, p_env_sustain: 0.3, p_env_decay: 0.2, p_base_freq: 0.4, p_freq_ramp: 0.35, p_env_punch: 0, sound_vol: 0.7 } },

  // === 2. 战斗 - 敌人行为 (9个) ===
  { id: 'enemy_basic_attack', preset: 'hitHurt', params: { wave_type: 2, p_env_attack: 0.02, p_env_sustain: 0.05, p_env_decay: 0.1, p_base_freq: 0.15, p_freq_ramp: -0.05, p_env_punch: 0.3, p_vib_strength: 0.25, p_vib_speed: 0.7, p_lpf_freq: 0.5, p_hpf_freq: 0.05, sound_vol: 0.7 } },
  { id: 'enemy_ghost_attack', preset: 'powerUp', params: { wave_type: 0, p_env_attack: 0.1, p_env_sustain: 0.3, p_env_decay: 0.2, p_base_freq: 0.1, p_freq_ramp: 0.2, p_env_punch: 0, p_pha_offset: -0.4, p_pha_ramp: 0.1, p_lpf_freq: 0.6, p_hpf_freq: 0.1, p_vib_strength: 0.1, p_vib_speed: 0.3, sound_vol: 0.7 } },
  { id: 'enemy_tank_attack', preset: 'explosion', params: { wave_type: 1, p_env_attack: 0.02, p_env_sustain: 0.08, p_env_decay: 0.15, p_base_freq: 0.1, p_freq_ramp: -0.03, p_env_punch: 0.5, sound_vol: 0.7 } },
  { id: 'enemy_boss_attack', preset: 'explosion', params: { wave_type: 2, p_env_attack: 0.03, p_env_sustain: 0.15, p_env_decay: 0.25, p_base_freq: 0.06, p_freq_ramp: -0.02, p_env_punch: 0.7, p_lpf_freq: 0.3, p_lpf_resonance: 0.25, p_vib_strength: 0.15, p_vib_speed: 0.3, sound_vol: 0.7 } },
  { id: 'enemy_boss_special', preset: 'explosion', params: { wave_type: 2, p_env_attack: 0.1, p_env_sustain: 0.3, p_env_decay: 0.3, p_base_freq: 0.1, p_freq_ramp: 0.4, p_env_punch: 0.4, sound_vol: 0.7 } },
  { id: 'enemy_hit', preset: 'hitHurt', params: { wave_type: 1, p_env_attack: 0, p_env_sustain: 0.03, p_env_decay: 0.1, p_base_freq: 0.3, p_freq_ramp: -0.15, p_env_punch: 0.4, p_duty: 0.5, sound_vol: 0.7 } },
  { id: 'enemy_die_basic', preset: 'explosion', params: { wave_type: 2, p_env_attack: 0, p_env_sustain: 0.1, p_env_decay: 0.3, p_base_freq: 0.4, p_freq_ramp: -0.3, p_env_punch: 0.5, sound_vol: 0.7 } },
  { id: 'enemy_die_ghost', preset: 'powerUp', params: { wave_type: 0, p_env_attack: 0.05, p_env_sustain: 0.2, p_env_decay: 0.5, p_base_freq: 0.3, p_freq_ramp: -0.2, p_env_punch: 0, p_pha_offset: -0.3, p_pha_ramp: 0.15, p_hpf_freq: 0.1, p_lpf_freq: 0.6, p_vib_strength: 0.1, p_vib_speed: 0.3, sound_vol: 0.7 } },
  { id: 'enemy_die_boss', preset: 'explosion', params: { wave_type: 3, p_env_attack: 0.02, p_env_sustain: 0.2, p_env_decay: 0.5, p_base_freq: 0.2, p_freq_ramp: -0.1, p_env_punch: 0.7, sound_vol: 0.7 } },

  // === 3. 玩家状态 (5个) ===
  { id: 'player_hurt', preset: 'hitHurt', params: { wave_type: 1, p_env_attack: 0, p_env_sustain: 0.05, p_env_decay: 0.15, p_base_freq: 0.2, p_freq_ramp: -0.1, p_env_punch: 0.6, p_duty: 0.5, p_lpf_freq: 0.35, p_lpf_resonance: 0.15, p_duty_ramp: -0.2, sound_vol: 0.7 } },
  { id: 'player_heal', preset: 'powerUp', params: { wave_type: 0, p_env_attack: 0.05, p_env_sustain: 0.2, p_env_decay: 0.15, p_base_freq: 0.4, p_freq_ramp: 0.2, p_env_punch: 0, sound_vol: 0.7 } },
  { id: 'player_die', preset: 'explosion', params: { wave_type: 2, p_env_attack: 0.02, p_env_sustain: 0.3, p_env_decay: 0.5, p_base_freq: 0.3, p_freq_ramp: -0.25, p_env_punch: 0.5, sound_vol: 0.7 } },
  { id: 'player_respawn', preset: 'powerUp', params: { wave_type: 0, p_env_attack: 0.1, p_env_sustain: 0.3, p_env_decay: 0.2, p_base_freq: 0.2, p_freq_ramp: 0.4, p_env_punch: 0.2, sound_vol: 0.7 } },
  { id: 'level_up', preset: 'powerUp', params: { wave_type: 1, p_env_attack: 0.05, p_env_sustain: 0.2, p_env_decay: 0.3, p_base_freq: 0.3, p_freq_ramp: 0.8, p_env_punch: 0.3, sound_vol: 0.7 } },

  // === 4. 技能系统 (7个) ===
  { id: 'skill_dash', preset: 'laserShoot', params: { wave_type: 3, p_env_attack: 0.01, p_env_sustain: 0.15, p_env_decay: 0.2, p_base_freq: 0.5, p_freq_ramp: -0.7, p_env_punch: 0.4, p_hpf_freq: 0.15, p_lpf_freq: 0.6, sound_vol: 0.7 } },
  { id: 'skill_shield_on', preset: 'powerUp', params: { wave_type: 0, p_env_attack: 0.05, p_env_sustain: 0.2, p_env_decay: 0.15, p_base_freq: 0.2, p_freq_ramp: 0.3, p_env_punch: 0.2, p_repeat_speed: 0.6, p_lpf_freq: 0.7, p_pha_offset: 0.1, sound_vol: 0.7 } },
  { id: 'skill_shield_off', preset: 'powerUp', params: { wave_type: 0, p_env_attack: 0, p_env_sustain: 0.1, p_env_decay: 0.15, p_base_freq: 0.4, p_freq_ramp: -0.2, p_env_punch: 0, sound_vol: 0.7 } },
  { id: 'skill_heal', preset: 'powerUp', params: { wave_type: 0, p_env_attack: 0.05, p_env_sustain: 0.25, p_env_decay: 0.15, p_base_freq: 0.3, p_freq_ramp: 0.3, p_env_punch: 0, sound_vol: 0.7 } },
  { id: 'skill_speed_on', preset: 'powerUp', params: { wave_type: 2, p_env_attack: 0.02, p_env_sustain: 0.1, p_env_decay: 0.05, p_base_freq: 0.3, p_freq_ramp: 0.6, p_env_punch: 0.3, p_pha_offset: 0.15, p_pha_ramp: -0.1, p_hpf_freq: 0.1, p_vib_strength: 0.1, p_vib_speed: 0.6, sound_vol: 0.7 } },
  { id: 'skill_speed_off', preset: 'powerUp', params: { wave_type: 2, p_env_attack: 0, p_env_sustain: 0.08, p_env_decay: 0.1, p_base_freq: 0.5, p_freq_ramp: -0.4, p_env_punch: 0, sound_vol: 0.7 } },
  { id: 'skill_cooldown', preset: 'blipSelect', params: { wave_type: 1, p_env_attack: 0, p_env_sustain: 0.05, p_env_decay: 0.08, p_base_freq: 0.6, p_freq_ramp: 0.2, p_env_punch: 0.1, sound_vol: 0.7 } },

  // === 5. 道具系统 (6个) ===
  { id: 'pickup_gold', preset: 'pickupCoin', params: { wave_type: 1, p_env_attack: 0, p_env_sustain: 0.05, p_env_decay: 0.12, p_base_freq: 0.6, p_freq_ramp: 0.5, p_env_punch: 0.3, p_duty: 0.5, p_pha_offset: 0.2, p_lpf_resonance: 0.25, p_hpf_freq: 0.08, sound_vol: 0.5 } },
  { id: 'pickup_potion_hp', preset: 'pickupCoin', params: { wave_type: 0, p_env_attack: 0.02, p_env_sustain: 0.1, p_env_decay: 0.1, p_base_freq: 0.35, p_freq_ramp: 0.2, p_env_punch: 0.1, p_vib_strength: 0.2, p_vib_speed: 0.8, p_pha_offset: 0.15, p_lpf_freq: 0.85, sound_vol: 0.5 } },
  { id: 'pickup_potion_mp', preset: 'pickupCoin', params: { wave_type: 0, p_env_attack: 0.02, p_env_sustain: 0.1, p_env_decay: 0.1, p_base_freq: 0.5, p_freq_ramp: 0.35, p_env_punch: 0.1, p_pha_offset: -0.2, p_pha_ramp: 0.1, p_lpf_freq: 0.9, p_vib_strength: 0.1, p_vib_speed: 0.5, p_arp_mod: 0.15, p_arp_speed: 0.3, sound_vol: 0.5 } },
  { id: 'pickup_key', preset: 'pickupCoin', params: { wave_type: 1, p_env_attack: 0, p_env_sustain: 0.03, p_env_decay: 0.1, p_base_freq: 0.8, p_freq_ramp: 0.3, p_env_punch: 0.5, p_duty: 0.5, p_pha_offset: 0.25, p_pha_ramp: -0.15, p_lpf_resonance: 0.3, p_hpf_freq: 0.1, sound_vol: 0.5 } },
  { id: 'pickup_weapon', preset: 'pickupCoin', params: { wave_type: 2, p_env_attack: 0.02, p_env_sustain: 0.1, p_env_decay: 0.15, p_base_freq: 0.2, p_freq_ramp: 0.1, p_env_punch: 0.4, p_lpf_freq: 0.5, p_lpf_resonance: 0.2, p_duty_ramp: -0.15, sound_vol: 0.5 } },
  { id: 'pickup_treasure', preset: 'pickupCoin', params: { wave_type: 1, p_env_attack: 0.03, p_env_sustain: 0.15, p_env_decay: 0.2, p_base_freq: 0.5, p_freq_ramp: 0.8, p_env_punch: 0.4, p_duty: 0.5, sound_vol: 0.5 } },

  // === 6. 地牢系统 (6个) ===
  { id: 'floor_transition', preset: 'powerUp', params: { wave_type: 0, p_env_attack: 0.1, p_env_sustain: 0.5, p_env_decay: 0.3, p_base_freq: 0.3, p_freq_ramp: -0.2, p_env_punch: 0, sound_vol: 0.35 } },
  { id: 'door_open', preset: 'explosion', params: { wave_type: 3, p_env_attack: 0.05, p_env_sustain: 0.25, p_env_decay: 0.2, p_base_freq: 0.08, p_freq_ramp: 0.05, p_env_punch: 0.2, p_lpf_freq: 0.35, p_lpf_resonance: 0.2, p_hpf_freq: 0.02, p_repeat_speed: 0.3, sound_vol: 0.35 } },
  { id: 'stairs_down', preset: 'jump', params: { wave_type: 0, p_env_attack: 0.02, p_env_sustain: 0.1, p_env_decay: 0.12, p_base_freq: 0.3, p_freq_ramp: -0.15, p_env_punch: 0.15, p_repeat_speed: 0.4, p_pha_offset: 0.05, p_lpf_freq: 0.6, p_hpf_freq: 0.03, sound_vol: 0.35 } },
  { id: 'ambient_drip', preset: 'blipSelect', params: { wave_type: 0, p_env_attack: 0, p_env_sustain: 0.02, p_env_decay: 0.5, p_base_freq: 0.9, p_freq_ramp: -0.8, p_repeat_speed: 0.8, p_pha_offset: 0.1, p_lpf_freq: 0.7, p_lpf_ramp: -0.2, p_hpf_freq: 0.05, sound_vol: 0.35 } },
  { id: 'ambient_chain', preset: 'blipSelect', params: { wave_type: 1, p_env_attack: 0, p_env_sustain: 0.05, p_env_decay: 0.35, p_base_freq: 0.6, p_freq_ramp: -0.4, p_repeat_speed: 0.6, p_pha_offset: 0.3, p_pha_ramp: -0.2, p_lpf_freq: 0.5, p_lpf_ramp: -0.15, p_hpf_freq: 0.05, sound_vol: 0.35 } },
  { id: 'ambient_wind', preset: 'explosion', params: { wave_type: 3, p_env_attack: 0.5, p_env_sustain: 2.0, p_env_decay: 0.5, p_base_freq: 0.05, p_freq_ramp: 0.02, p_env_punch: 0, sound_vol: 0.35 } },

  // === 7. UI 系统 (9个) ===
  { id: 'ui_click', preset: 'click', params: { wave_type: 1, p_env_attack: 0, p_env_sustain: 0.02, p_env_decay: 0.05, p_base_freq: 0.6, p_freq_ramp: 0.2, p_env_punch: 0.3, p_duty: 0.5, sound_vol: 0.5 } },
  { id: 'ui_hover', preset: 'blipSelect', params: { wave_type: 0, p_env_attack: 0, p_env_sustain: 0.02, p_env_decay: 0.03, p_base_freq: 0.5, p_freq_ramp: 0.1, p_env_punch: 0.1, sound_vol: 0.5 } },
  { id: 'ui_select', preset: 'blipSelect', params: { wave_type: 1, p_env_attack: 0, p_env_sustain: 0.04, p_env_decay: 0.08, p_base_freq: 0.5, p_freq_ramp: 0.4, p_env_punch: 0.2, p_duty: 0.5, sound_vol: 0.5 } },
  { id: 'ui_back', preset: 'blipSelect', params: { wave_type: 1, p_env_attack: 0, p_env_sustain: 0.03, p_env_decay: 0.06, p_base_freq: 0.35, p_freq_ramp: -0.2, p_env_punch: 0.2, p_duty: 0.5, sound_vol: 0.5 } },
  { id: 'ui_error', preset: 'hitHurt', params: { wave_type: 1, p_env_attack: 0, p_env_sustain: 0.1, p_env_decay: 0.1, p_base_freq: 0.18, p_freq_ramp: -0.1, p_env_punch: 0.4, p_duty: 0.5, sound_vol: 0.5 } },
  { id: 'game_start', preset: 'powerUp', params: { wave_type: 1, p_env_attack: 0.05, p_env_sustain: 0.3, p_env_decay: 0.3, p_base_freq: 0.3, p_freq_ramp: 0.6, p_env_punch: 0.3, sound_vol: 0.5 } },
  { id: 'game_over', preset: 'explosion', params: { wave_type: 2, p_env_attack: 0.05, p_env_sustain: 0.4, p_env_decay: 0.5, p_base_freq: 0.3, p_freq_ramp: -0.3, p_env_punch: 0.3, sound_vol: 0.5 } },
  { id: 'victory', preset: 'powerUp', params: { wave_type: 1, p_env_attack: 0.03, p_env_sustain: 0.2, p_env_decay: 0.3, p_base_freq: 0.35, p_freq_ramp: 0.8, p_env_punch: 0.4, sound_vol: 0.5 } },
  { id: 'chat_message', preset: 'blipSelect', params: { wave_type: 0, p_env_attack: 0, p_env_sustain: 0.03, p_env_decay: 0.05, p_base_freq: 0.7, p_freq_ramp: 0.2, p_env_punch: 0.2, sound_vol: 0.5 } },

  // === 8. 多人联机 (3个) ===
  { id: 'player_join', preset: 'powerUp', params: { wave_type: 0, p_env_attack: 0.02, p_env_sustain: 0.1, p_env_decay: 0.1, p_base_freq: 0.3, p_freq_ramp: 0.4, p_env_punch: 0.2, sound_vol: 0.5 } },
  { id: 'player_leave', preset: 'powerUp', params: { wave_type: 0, p_env_attack: 0.02, p_env_sustain: 0.1, p_env_decay: 0.1, p_base_freq: 0.5, p_freq_ramp: -0.4, p_env_punch: 0, sound_vol: 0.5 } },
  { id: 'all_ready', preset: 'pickupCoin', params: { wave_type: 1, p_env_attack: 0.03, p_env_sustain: 0.15, p_env_decay: 0.15, p_base_freq: 0.4, p_freq_ramp: 0.5, p_env_punch: 0.3, p_duty: 0.5, sound_vol: 0.5 } },
]

function generateSfx(definition) {
  const { id, preset, params, type = 'jsfxr', src } = definition

  // External: 从 inbox 目录复制 CC0 素材（保留原始扩展名）
  if (type === 'external') {
    const srcPath = path.join(INBOX_DIR, src || `${id}.wav`)
    const ext = path.extname(srcPath)
    const destPath = path.join(OUTPUT_DIR, `${id}${ext}`)
    try {
      if (!fs.existsSync(srcPath)) {
        console.error(`✗ Missing external source: ${srcPath}`)
        return false
      }
      fs.copyFileSync(srcPath, destPath)
      const sizeKb = (fs.statSync(destPath).size / 1024).toFixed(1)
      console.log(`✓ ${id}${ext} (${sizeKb} KB) [external]`)
      return true
    } catch (error) {
      console.error(`✗ ${id}${ext} - ${error.message}`)
      return false
    }
  }

  // Default: jsfxr 程序化生成
  try {
    const baseSound = sfxr.generate(preset)
    const sound = { ...baseSound, ...params }
    const wave = sfxr.toWave(sound)

    if (!wave.wav || wave.wav.length <= 44) {
      console.error(`✗ Failed: ${id}.wav - empty WAV data`)
      return false
    }

    const filePath = path.join(OUTPUT_DIR, `${id}.wav`)
    fs.writeFileSync(filePath, Buffer.from(wave.wav))

    const sizeKb = (wave.wav.length / 1024).toFixed(1)
    console.log(`✓ ${id}.wav (${sizeKb} KB) [jsfxr]`)
    return true
  } catch (error) {
    console.error(`✗ ${id}.wav - ${error.message}`)
    return false
  }
}

function main() {
  const jsfxrCount = SFX_DEFINITIONS.filter(d => (d.type || 'jsfxr') === 'jsfxr').length
  const extCount = SFX_DEFINITIONS.filter(d => d.type === 'external').length

  console.log('=== 音效生成器（jsfxr + CC0 混合源） ===')
  console.log(`输出: ${OUTPUT_DIR}`)
  console.log(`待生成: ${SFX_DEFINITIONS.length} 个音效 (jsfxr: ${jsfxrCount}, external: ${extCount})\n`)

  let ok = 0, fail = 0

  for (const def of SFX_DEFINITIONS) {
    if (generateSfx(def)) ok++
    else fail++
  }

  console.log(`\n=== 完成: ${ok} 成功, ${fail} 失败 ===`)
}

main()
