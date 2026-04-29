/**
 * 音效生成脚本 - 使用 jsfxr 生成 55 个 .wav 文件
 * 运行：node scripts/generate-sfx.js
 *
 * API 流程：
 *   1. sfxr.generate(preset) 获取基础音效对象
 *   2. 修改参数定制音色
 *   3. sfxr.toWave(sound).wav 获取正确 WAV 数据
 *   4. Buffer.from(wave.wav) 写入文件
 */

const { sfxr } = require('jsfxr')
const fs = require('fs')
const path = require('path')

const OUTPUT_DIR = path.join(__dirname, '../src/assets/sfx')

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
}

/**
 * 音效定义
 * preset: jsfxr 预设名称 (hitHurt/explosion/pickupCoin/powerUp/laserShoot/jump/blipSelect/click)
 * params: 覆盖参数
 */
const SFX_DEFINITIONS = [
  // === 1. 战斗 - 玩家攻击 (10个) ===
  { id: 'warrior_slash', preset: 'hitHurt', params: { wave_type: 1, p_env_attack: 0, p_env_sustain: 0.08, p_env_decay: 0.12, p_base_freq: 0.35, p_freq_ramp: -0.5, p_env_punch: 0.3, p_duty: 0.5 } },
  { id: 'warrior_hit', preset: 'hitHurt', params: { wave_type: 1, p_env_attack: 0, p_env_sustain: 0.04, p_env_decay: 0.15, p_base_freq: 0.2, p_freq_ramp: -0.3, p_env_punch: 0.5, p_duty: 0.5 } },
  { id: 'ranger_draw', preset: 'laserShoot', params: { wave_type: 0, p_env_attack: 0.05, p_env_sustain: 0.12, p_env_decay: 0.05, p_base_freq: 0.25, p_freq_ramp: 0.15, p_env_punch: 0 } },
  { id: 'ranger_shoot', preset: 'laserShoot', params: { wave_type: 3, p_env_attack: 0, p_env_sustain: 0.03, p_env_decay: 0.08, p_base_freq: 0.8, p_freq_ramp: -0.6, p_env_punch: 0.2 } },
  { id: 'ranger_hit', preset: 'hitHurt', params: { wave_type: 1, p_env_attack: 0, p_env_sustain: 0.02, p_env_decay: 0.1, p_base_freq: 0.35, p_freq_ramp: -0.25, p_env_punch: 0.4, p_duty: 0.5 } },
  { id: 'mage_cast', preset: 'powerUp', params: { wave_type: 0, p_env_attack: 0.05, p_env_sustain: 0.15, p_env_decay: 0.1, p_base_freq: 0.2, p_freq_ramp: 0.6, p_env_punch: 0.1 } },
  { id: 'mage_orb_fly', preset: 'synth', params: { wave_type: 0, p_env_attack: 0.1, p_env_sustain: 0.5, p_env_decay: 0.1, p_base_freq: 0.15, p_freq_ramp: 0.05, p_repeat_speed: 0.5 } },
  { id: 'mage_hit', preset: 'explosion', params: { wave_type: 0, p_env_attack: 0, p_env_sustain: 0.05, p_env_decay: 0.2, p_base_freq: 0.5, p_freq_ramp: -0.5, p_env_punch: 0.6 } },
  { id: 'cleric_cast', preset: 'powerUp', params: { wave_type: 0, p_env_attack: 0.08, p_env_sustain: 0.2, p_env_decay: 0.15, p_base_freq: 0.35, p_freq_ramp: 0.25, p_env_punch: 0 } },
  { id: 'cleric_heal', preset: 'powerUp', params: { wave_type: 0, p_env_attack: 0.05, p_env_sustain: 0.3, p_env_decay: 0.2, p_base_freq: 0.4, p_freq_ramp: 0.35, p_env_punch: 0 } },

  // === 2. 战斗 - 敌人行为 (9个) ===
  { id: 'enemy_basic_attack', preset: 'hitHurt', params: { wave_type: 2, p_env_attack: 0.02, p_env_sustain: 0.05, p_env_decay: 0.1, p_base_freq: 0.15, p_freq_ramp: -0.05, p_env_punch: 0.3 } },
  { id: 'enemy_ghost_attack', preset: 'powerUp', params: { wave_type: 0, p_env_attack: 0.1, p_env_sustain: 0.3, p_env_decay: 0.2, p_base_freq: 0.1, p_freq_ramp: 0.2, p_env_punch: 0 } },
  { id: 'enemy_tank_attack', preset: 'explosion', params: { wave_type: 1, p_env_attack: 0.02, p_env_sustain: 0.08, p_env_decay: 0.15, p_base_freq: 0.1, p_freq_ramp: -0.03, p_env_punch: 0.5 } },
  { id: 'enemy_boss_attack', preset: 'explosion', params: { wave_type: 2, p_env_attack: 0.03, p_env_sustain: 0.1, p_env_decay: 0.2, p_base_freq: 0.08, p_freq_ramp: -0.02, p_env_punch: 0.6 } },
  { id: 'enemy_boss_special', preset: 'explosion', params: { wave_type: 2, p_env_attack: 0.1, p_env_sustain: 0.3, p_env_decay: 0.3, p_base_freq: 0.1, p_freq_ramp: 0.4, p_env_punch: 0.4 } },
  { id: 'enemy_hit', preset: 'hitHurt', params: { wave_type: 1, p_env_attack: 0, p_env_sustain: 0.03, p_env_decay: 0.1, p_base_freq: 0.3, p_freq_ramp: -0.15, p_env_punch: 0.4, p_duty: 0.5 } },
  { id: 'enemy_die_basic', preset: 'explosion', params: { wave_type: 2, p_env_attack: 0, p_env_sustain: 0.1, p_env_decay: 0.3, p_base_freq: 0.4, p_freq_ramp: -0.3, p_env_punch: 0.5 } },
  { id: 'enemy_die_ghost', preset: 'powerUp', params: { wave_type: 0, p_env_attack: 0.05, p_env_sustain: 0.2, p_env_decay: 0.4, p_base_freq: 0.3, p_freq_ramp: -0.2, p_env_punch: 0 } },
  { id: 'enemy_die_boss', preset: 'explosion', params: { wave_type: 3, p_env_attack: 0.02, p_env_sustain: 0.2, p_env_decay: 0.5, p_base_freq: 0.2, p_freq_ramp: -0.1, p_env_punch: 0.7 } },

  // === 3. 玩家状态 (5个) ===
  { id: 'player_hurt', preset: 'hitHurt', params: { wave_type: 1, p_env_attack: 0, p_env_sustain: 0.05, p_env_decay: 0.15, p_base_freq: 0.2, p_freq_ramp: -0.1, p_env_punch: 0.6, p_duty: 0.5 } },
  { id: 'player_heal', preset: 'powerUp', params: { wave_type: 0, p_env_attack: 0.05, p_env_sustain: 0.2, p_env_decay: 0.15, p_base_freq: 0.4, p_freq_ramp: 0.2, p_env_punch: 0 } },
  { id: 'player_die', preset: 'explosion', params: { wave_type: 2, p_env_attack: 0.02, p_env_sustain: 0.3, p_env_decay: 0.5, p_base_freq: 0.3, p_freq_ramp: -0.25, p_env_punch: 0.5 } },
  { id: 'player_respawn', preset: 'powerUp', params: { wave_type: 0, p_env_attack: 0.1, p_env_sustain: 0.3, p_env_decay: 0.2, p_base_freq: 0.2, p_freq_ramp: 0.4, p_env_punch: 0.2 } },
  { id: 'level_up', preset: 'powerUp', params: { wave_type: 1, p_env_attack: 0.05, p_env_sustain: 0.2, p_env_decay: 0.3, p_base_freq: 0.3, p_freq_ramp: 0.8, p_env_punch: 0.3 } },

  // === 4. 技能系统 (7个) ===
  { id: 'skill_dash', preset: 'laserShoot', params: { wave_type: 3, p_env_attack: 0, p_env_sustain: 0.05, p_env_decay: 0.1, p_base_freq: 0.6, p_freq_ramp: -0.5, p_env_punch: 0.3 } },
  { id: 'skill_shield_on', preset: 'powerUp', params: { wave_type: 0, p_env_attack: 0.05, p_env_sustain: 0.15, p_env_decay: 0.1, p_base_freq: 0.2, p_freq_ramp: 0.3, p_env_punch: 0.2 } },
  { id: 'skill_shield_off', preset: 'powerUp', params: { wave_type: 0, p_env_attack: 0, p_env_sustain: 0.1, p_env_decay: 0.15, p_base_freq: 0.4, p_freq_ramp: -0.2, p_env_punch: 0 } },
  { id: 'skill_heal', preset: 'powerUp', params: { wave_type: 0, p_env_attack: 0.05, p_env_sustain: 0.25, p_env_decay: 0.15, p_base_freq: 0.3, p_freq_ramp: 0.3, p_env_punch: 0 } },
  { id: 'skill_speed_on', preset: 'powerUp', params: { wave_type: 2, p_env_attack: 0.02, p_env_sustain: 0.1, p_env_decay: 0.05, p_base_freq: 0.3, p_freq_ramp: 0.6, p_env_punch: 0.3 } },
  { id: 'skill_speed_off', preset: 'powerUp', params: { wave_type: 2, p_env_attack: 0, p_env_sustain: 0.08, p_env_decay: 0.1, p_base_freq: 0.5, p_freq_ramp: -0.4, p_env_punch: 0 } },
  { id: 'skill_cooldown', preset: 'blipSelect', params: { wave_type: 1, p_env_attack: 0, p_env_sustain: 0.05, p_env_decay: 0.08, p_base_freq: 0.6, p_freq_ramp: 0.2, p_env_punch: 0.1 } },

  // === 5. 道具系统 (6个) ===
  { id: 'pickup_gold', preset: 'pickupCoin', params: { wave_type: 1, p_env_attack: 0, p_env_sustain: 0.05, p_env_decay: 0.1, p_base_freq: 0.6, p_freq_ramp: 0.5, p_env_punch: 0.3, p_duty: 0.5 } },
  { id: 'pickup_potion_hp', preset: 'pickupCoin', params: { wave_type: 0, p_env_attack: 0.02, p_env_sustain: 0.1, p_env_decay: 0.1, p_base_freq: 0.35, p_freq_ramp: 0.2, p_env_punch: 0.1 } },
  { id: 'pickup_potion_mp', preset: 'pickupCoin', params: { wave_type: 0, p_env_attack: 0.02, p_env_sustain: 0.1, p_env_decay: 0.1, p_base_freq: 0.45, p_freq_ramp: 0.3, p_env_punch: 0.1 } },
  { id: 'pickup_key', preset: 'pickupCoin', params: { wave_type: 1, p_env_attack: 0, p_env_sustain: 0.03, p_env_decay: 0.08, p_base_freq: 0.8, p_freq_ramp: 0.3, p_env_punch: 0.4, p_duty: 0.5 } },
  { id: 'pickup_weapon', preset: 'pickupCoin', params: { wave_type: 2, p_env_attack: 0.02, p_env_sustain: 0.08, p_env_decay: 0.12, p_base_freq: 0.25, p_freq_ramp: 0.15, p_env_punch: 0.3 } },
  { id: 'pickup_treasure', preset: 'pickupCoin', params: { wave_type: 1, p_env_attack: 0.03, p_env_sustain: 0.15, p_env_decay: 0.2, p_base_freq: 0.5, p_freq_ramp: 0.8, p_env_punch: 0.4, p_duty: 0.5 } },

  // === 6. 地牢系统 (6个) ===
  { id: 'floor_transition', preset: 'powerUp', params: { wave_type: 0, p_env_attack: 0.1, p_env_sustain: 0.5, p_env_decay: 0.3, p_base_freq: 0.3, p_freq_ramp: -0.2, p_env_punch: 0 } },
  { id: 'door_open', preset: 'explosion', params: { wave_type: 3, p_env_attack: 0.05, p_env_sustain: 0.2, p_env_decay: 0.15, p_base_freq: 0.1, p_freq_ramp: 0.05, p_env_punch: 0.2 } },
  { id: 'stairs_down', preset: 'jump', params: { wave_type: 0, p_env_attack: 0.02, p_env_sustain: 0.15, p_env_decay: 0.1, p_base_freq: 0.3, p_freq_ramp: -0.15, p_env_punch: 0.1 } },
  { id: 'ambient_drip', preset: 'blipSelect', params: { wave_type: 0, p_env_attack: 0, p_env_sustain: 0.02, p_env_decay: 0.3, p_base_freq: 0.9, p_freq_ramp: -0.8, p_repeat_speed: 0.8 } },
  { id: 'ambient_chain', preset: 'blipSelect', params: { wave_type: 1, p_env_attack: 0, p_env_sustain: 0.05, p_env_decay: 0.2, p_base_freq: 0.6, p_freq_ramp: -0.4, p_repeat_speed: 0.6 } },
  { id: 'ambient_wind', preset: 'explosion', params: { wave_type: 3, p_env_attack: 0.5, p_env_sustain: 2.0, p_env_decay: 0.5, p_base_freq: 0.05, p_freq_ramp: 0.02, p_env_punch: 0 } },

  // === 7. UI 系统 (9个) ===
  { id: 'ui_click', preset: 'click', params: { wave_type: 1, p_env_attack: 0, p_env_sustain: 0.02, p_env_decay: 0.05, p_base_freq: 0.6, p_freq_ramp: 0.2, p_env_punch: 0.3, p_duty: 0.5 } },
  { id: 'ui_hover', preset: 'blipSelect', params: { wave_type: 0, p_env_attack: 0, p_env_sustain: 0.02, p_env_decay: 0.03, p_base_freq: 0.5, p_freq_ramp: 0.1, p_env_punch: 0.1 } },
  { id: 'ui_select', preset: 'blipSelect', params: { wave_type: 1, p_env_attack: 0, p_env_sustain: 0.04, p_env_decay: 0.08, p_base_freq: 0.5, p_freq_ramp: 0.4, p_env_punch: 0.2, p_duty: 0.5 } },
  { id: 'ui_back', preset: 'blipSelect', params: { wave_type: 1, p_env_attack: 0, p_env_sustain: 0.03, p_env_decay: 0.06, p_base_freq: 0.35, p_freq_ramp: -0.2, p_env_punch: 0.2, p_duty: 0.5 } },
  { id: 'ui_error', preset: 'hitHurt', params: { wave_type: 1, p_env_attack: 0, p_env_sustain: 0.1, p_env_decay: 0.1, p_base_freq: 0.18, p_freq_ramp: -0.1, p_env_punch: 0.4, p_duty: 0.5 } },
  { id: 'game_start', preset: 'powerUp', params: { wave_type: 1, p_env_attack: 0.05, p_env_sustain: 0.3, p_env_decay: 0.3, p_base_freq: 0.3, p_freq_ramp: 0.6, p_env_punch: 0.3 } },
  { id: 'game_over', preset: 'explosion', params: { wave_type: 2, p_env_attack: 0.05, p_env_sustain: 0.4, p_env_decay: 0.5, p_base_freq: 0.3, p_freq_ramp: -0.3, p_env_punch: 0.3 } },
  { id: 'victory', preset: 'powerUp', params: { wave_type: 1, p_env_attack: 0.03, p_env_sustain: 0.2, p_env_decay: 0.3, p_base_freq: 0.35, p_freq_ramp: 0.8, p_env_punch: 0.4 } },
  { id: 'chat_message', preset: 'blipSelect', params: { wave_type: 0, p_env_attack: 0, p_env_sustain: 0.03, p_env_decay: 0.05, p_base_freq: 0.7, p_freq_ramp: 0.2, p_env_punch: 0.2 } },

  // === 8. 多人联机 (3个) ===
  { id: 'player_join', preset: 'powerUp', params: { wave_type: 0, p_env_attack: 0.02, p_env_sustain: 0.1, p_env_decay: 0.1, p_base_freq: 0.3, p_freq_ramp: 0.4, p_env_punch: 0.2 } },
  { id: 'player_leave', preset: 'powerUp', params: { wave_type: 0, p_env_attack: 0.02, p_env_sustain: 0.1, p_env_decay: 0.1, p_base_freq: 0.5, p_freq_ramp: -0.4, p_env_punch: 0 } },
  { id: 'all_ready', preset: 'pickupCoin', params: { wave_type: 1, p_env_attack: 0.03, p_env_sustain: 0.15, p_env_decay: 0.15, p_base_freq: 0.4, p_freq_ramp: 0.5, p_env_punch: 0.3, p_duty: 0.5 } },
]

function generateSfx(definition) {
  const { id, preset, params } = definition

  try {
    // 1. 从预设生成基础音效对象
    const baseSound = sfxr.generate(preset)

    // 2. 覆盖自定义参数
    const sound = { ...baseSound, ...params }

    // 3. 转换为 WAV 数据
    const wave = sfxr.toWave(sound)

    if (!wave.wav || wave.wav.length <= 44) {
      console.error(`✗ Failed: ${id}.wav - empty WAV data`)
      return false
    }

    // 4. 写入文件
    const filePath = path.join(OUTPUT_DIR, `${id}.wav`)
    fs.writeFileSync(filePath, Buffer.from(wave.wav))

    const sizeKb = (wave.wav.length / 1024).toFixed(1)
    console.log(`✓ ${id}.wav (${sizeKb} KB)`)
    return true
  } catch (error) {
    console.error(`✗ ${id}.wav - ${error.message}`)
    return false
  }
}

function main() {
  console.log('=== jsfxr 音效生成器 ===')
  console.log(`输出: ${OUTPUT_DIR}`)
  console.log(`待生成: ${SFX_DEFINITIONS.length} 个音效\n`)

  let ok = 0, fail = 0

  for (const def of SFX_DEFINITIONS) {
    if (generateSfx(def)) ok++
    else fail++
  }

  console.log(`\n=== 完成: ${ok} 成功, ${fail} 失败 ===`)
}

main()
