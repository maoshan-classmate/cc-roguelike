import { soundEngine } from './SoundEngine'

/**
 * 音效定义 - 55个音效按系统分类
 * 音效文件路径：src/assets/sfx/
 */

// 音效文件基础路径
const SFX_BASE = '/src/assets/sfx'

/**
 * 音效 ID 常量
 */
export const SFX_IDS = {
  // 1. 战斗 - 玩家攻击（10个）
  WARRIOR_SLASH: 'warrior_slash',
  WARRIOR_HIT: 'warrior_hit',
  RANGER_DRAW: 'ranger_draw',
  RANGER_SHOOT: 'ranger_shoot',
  RANGER_HIT: 'ranger_hit',
  MAGE_CAST: 'mage_cast',
  MAGE_ORB_FLY: 'mage_orb_fly',
  MAGE_HIT: 'mage_hit',
  CLERIC_CAST: 'cleric_cast',
  CLERIC_HEAL: 'cleric_heal',

  // 2. 战斗 - 敌人行为（9个）
  ENEMY_BASIC_ATTACK: 'enemy_basic_attack',
  ENEMY_GHOST_ATTACK: 'enemy_ghost_attack',
  ENEMY_TANK_ATTACK: 'enemy_tank_attack',
  ENEMY_BOSS_ATTACK: 'enemy_boss_attack',
  ENEMY_BOSS_SPECIAL: 'enemy_boss_special',
  ENEMY_HIT: 'enemy_hit',
  ENEMY_DIE_BASIC: 'enemy_die_basic',
  ENEMY_DIE_GHOST: 'enemy_die_ghost',
  ENEMY_DIE_BOSS: 'enemy_die_boss',

  // 3. 玩家状态（5个）
  PLAYER_HURT: 'player_hurt',
  PLAYER_HEAL: 'player_heal',
  PLAYER_DIE: 'player_die',
  PLAYER_RESPAWN: 'player_respawn',
  LEVEL_UP: 'level_up',

  // 4. 技能系统（7个）
  SKILL_DASH: 'skill_dash',
  SKILL_SHIELD_ON: 'skill_shield_on',
  SKILL_SHIELD_OFF: 'skill_shield_off',
  SKILL_HEAL: 'skill_heal',
  SKILL_SPEED_ON: 'skill_speed_on',
  SKILL_SPEED_OFF: 'skill_speed_off',
  SKILL_COOLDOWN: 'skill_cooldown',

  // 5. 道具系统（6个）
  PICKUP_GOLD: 'pickup_gold',
  PICKUP_POTION_HP: 'pickup_potion_hp',
  PICKUP_POTION_MP: 'pickup_potion_mp',
  PICKUP_KEY: 'pickup_key',
  PICKUP_WEAPON: 'pickup_weapon',
  PICKUP_TREASURE: 'pickup_treasure',

  // 6. 地牢系统（6个）
  FLOOR_TRANSITION: 'floor_transition',
  DOOR_OPEN: 'door_open',
  STAIRS_DOWN: 'stairs_down',
  AMBIENT_DRIP: 'ambient_drip',
  AMBIENT_CHAIN: 'ambient_chain',
  AMBIENT_WIND: 'ambient_wind',

  // 7. UI 系统（9个）
  UI_CLICK: 'ui_click',
  UI_HOVER: 'ui_hover',
  UI_SELECT: 'ui_select',
  UI_BACK: 'ui_back',
  UI_ERROR: 'ui_error',
  GAME_START: 'game_start',
  GAME_OVER: 'game_over',
  VICTORY: 'victory',
  CHAT_MESSAGE: 'chat_message',

  // 8. 多人联机（3个）
  PLAYER_JOIN: 'player_join',
  PLAYER_LEAVE: 'player_leave',
  ALL_READY: 'all_ready',
} as const

export type SfxId = typeof SFX_IDS[keyof typeof SFX_IDS]

/**
 * 音效定义列表
 */
const SFX_DEFINITIONS = [
  // 1. 战斗 - 玩家攻击
  { id: SFX_IDS.WARRIOR_SLASH, src: `${SFX_BASE}/warrior_slash.wav` },
  { id: SFX_IDS.WARRIOR_HIT, src: `${SFX_BASE}/warrior_hit.wav` },
  { id: SFX_IDS.RANGER_DRAW, src: `${SFX_BASE}/ranger_draw.wav` },
  { id: SFX_IDS.RANGER_SHOOT, src: `${SFX_BASE}/ranger_shoot.wav` },
  { id: SFX_IDS.RANGER_HIT, src: `${SFX_BASE}/ranger_hit.wav` },
  { id: SFX_IDS.MAGE_CAST, src: `${SFX_BASE}/mage_cast.wav` },
  { id: SFX_IDS.MAGE_ORB_FLY, src: `${SFX_BASE}/mage_orb_fly.wav`, options: { loop: true } as any },
  { id: SFX_IDS.MAGE_HIT, src: `${SFX_BASE}/mage_hit.wav` },
  { id: SFX_IDS.CLERIC_CAST, src: `${SFX_BASE}/cleric_cast.wav` },
  { id: SFX_IDS.CLERIC_HEAL, src: `${SFX_BASE}/cleric_heal.wav` },

  // 2. 战斗 - 敌人行为
  { id: SFX_IDS.ENEMY_BASIC_ATTACK, src: `${SFX_BASE}/enemy_basic_attack.wav` },
  { id: SFX_IDS.ENEMY_GHOST_ATTACK, src: `${SFX_BASE}/enemy_ghost_attack.wav` },
  { id: SFX_IDS.ENEMY_TANK_ATTACK, src: `${SFX_BASE}/enemy_tank_attack.wav` },
  { id: SFX_IDS.ENEMY_BOSS_ATTACK, src: `${SFX_BASE}/enemy_boss_attack.wav` },
  { id: SFX_IDS.ENEMY_BOSS_SPECIAL, src: `${SFX_BASE}/enemy_boss_special.wav` },
  { id: SFX_IDS.ENEMY_HIT, src: `${SFX_BASE}/enemy_hit.wav` },
  { id: SFX_IDS.ENEMY_DIE_BASIC, src: `${SFX_BASE}/enemy_die_basic.wav` },
  { id: SFX_IDS.ENEMY_DIE_GHOST, src: `${SFX_BASE}/enemy_die_ghost.wav` },
  { id: SFX_IDS.ENEMY_DIE_BOSS, src: `${SFX_BASE}/enemy_die_boss.wav` },

  // 3. 玩家状态
  { id: SFX_IDS.PLAYER_HURT, src: `${SFX_BASE}/player_hurt.wav` },
  { id: SFX_IDS.PLAYER_HEAL, src: `${SFX_BASE}/player_heal.wav` },
  { id: SFX_IDS.PLAYER_DIE, src: `${SFX_BASE}/player_die.wav` },
  { id: SFX_IDS.PLAYER_RESPAWN, src: `${SFX_BASE}/player_respawn.wav` },
  { id: SFX_IDS.LEVEL_UP, src: `${SFX_BASE}/level_up.wav` },

  // 4. 技能系统
  { id: SFX_IDS.SKILL_DASH, src: `${SFX_BASE}/skill_dash.wav` },
  { id: SFX_IDS.SKILL_SHIELD_ON, src: `${SFX_BASE}/skill_shield_on.wav` },
  { id: SFX_IDS.SKILL_SHIELD_OFF, src: `${SFX_BASE}/skill_shield_off.wav` },
  { id: SFX_IDS.SKILL_HEAL, src: `${SFX_BASE}/skill_heal.wav` },
  { id: SFX_IDS.SKILL_SPEED_ON, src: `${SFX_BASE}/skill_speed_on.wav` },
  { id: SFX_IDS.SKILL_SPEED_OFF, src: `${SFX_BASE}/skill_speed_off.wav` },
  { id: SFX_IDS.SKILL_COOLDOWN, src: `${SFX_BASE}/skill_cooldown.wav` },

  // 5. 道具系统
  { id: SFX_IDS.PICKUP_GOLD, src: `${SFX_BASE}/pickup_gold.wav` },
  { id: SFX_IDS.PICKUP_POTION_HP, src: `${SFX_BASE}/pickup_potion_hp.wav` },
  { id: SFX_IDS.PICKUP_POTION_MP, src: `${SFX_BASE}/pickup_potion_mp.wav` },
  { id: SFX_IDS.PICKUP_KEY, src: `${SFX_BASE}/pickup_key.wav` },
  { id: SFX_IDS.PICKUP_WEAPON, src: `${SFX_BASE}/pickup_weapon.wav` },
  { id: SFX_IDS.PICKUP_TREASURE, src: `${SFX_BASE}/pickup_treasure.wav` },

  // 6. 地牢系统
  { id: SFX_IDS.FLOOR_TRANSITION, src: `${SFX_BASE}/floor_transition.wav` },
  { id: SFX_IDS.DOOR_OPEN, src: `${SFX_BASE}/door_open.wav` },
  { id: SFX_IDS.STAIRS_DOWN, src: `${SFX_BASE}/stairs_down.wav` },
  { id: SFX_IDS.AMBIENT_DRIP, src: `${SFX_BASE}/ambient_drip.wav`, options: { loop: true } as any },
  { id: SFX_IDS.AMBIENT_CHAIN, src: `${SFX_BASE}/ambient_chain.wav`, options: { loop: true } as any },
  { id: SFX_IDS.AMBIENT_WIND, src: `${SFX_BASE}/ambient_wind.wav`, options: { loop: true } as any },

  // 7. UI 系统
  { id: SFX_IDS.UI_CLICK, src: `${SFX_BASE}/ui_click.wav` },
  { id: SFX_IDS.UI_HOVER, src: `${SFX_BASE}/ui_hover.wav` },
  { id: SFX_IDS.UI_SELECT, src: `${SFX_BASE}/ui_select.wav` },
  { id: SFX_IDS.UI_BACK, src: `${SFX_BASE}/ui_back.wav` },
  { id: SFX_IDS.UI_ERROR, src: `${SFX_BASE}/ui_error.wav` },
  { id: SFX_IDS.GAME_START, src: `${SFX_BASE}/game_start.wav` },
  { id: SFX_IDS.GAME_OVER, src: `${SFX_BASE}/game_over.wav` },
  { id: SFX_IDS.VICTORY, src: `${SFX_BASE}/victory.wav` },
  { id: SFX_IDS.CHAT_MESSAGE, src: `${SFX_BASE}/chat_message.wav` },

  // 8. 多人联机
  { id: SFX_IDS.PLAYER_JOIN, src: `${SFX_BASE}/player_join.wav` },
  { id: SFX_IDS.PLAYER_LEAVE, src: `${SFX_BASE}/player_leave.wav` },
  { id: SFX_IDS.ALL_READY, src: `${SFX_BASE}/all_ready.wav` },
]

/**
 * 初始化音效系统
 */
export function initSfx(): void {
  soundEngine.registerAll(SFX_DEFINITIONS)
}

/**
 * 便捷播放函数
 */
export function playSfx(id: SfxId): void {
  soundEngine.play(id)
}

/**
 * 按职业播放攻击音效
 */
export function playAttackSfx(characterClass: string): void {
  switch (characterClass) {
    case 'warrior':
      playSfx(SFX_IDS.WARRIOR_SLASH)
      break
    case 'ranger':
      playSfx(SFX_IDS.RANGER_SHOOT)
      break
    case 'mage':
      playSfx(SFX_IDS.MAGE_CAST)
      break
    case 'cleric':
      playSfx(SFX_IDS.CLERIC_CAST)
      break
  }
}

/**
 * 按敌人类型播放死亡音效
 */
export function playEnemyDieSfx(enemyType: string): void {
  switch (enemyType) {
    case 'ghost':
      playSfx(SFX_IDS.ENEMY_DIE_GHOST)
      break
    case 'boss':
      playSfx(SFX_IDS.ENEMY_DIE_BOSS)
      break
    default:
      playSfx(SFX_IDS.ENEMY_DIE_BASIC)
      break
  }
}

/**
 * 按道具类型播放拾取音效
 */
export function playPickupSfx(itemType: string): void {
  switch (itemType) {
    case 'coin':
      playSfx(SFX_IDS.PICKUP_GOLD)
      break
    case 'health':
      playSfx(SFX_IDS.PICKUP_POTION_HP)
      break
    case 'energy':
      playSfx(SFX_IDS.PICKUP_POTION_MP)
      break
    case 'key':
      playSfx(SFX_IDS.PICKUP_KEY)
      break
    case 'weapon':
      playSfx(SFX_IDS.PICKUP_WEAPON)
      break
    case 'treasure':
      playSfx(SFX_IDS.PICKUP_TREASURE)
      break
    default:
      playSfx(SFX_IDS.PICKUP_GOLD)
      break
  }
}
