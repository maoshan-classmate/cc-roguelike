// 角色模板注册表（唯一数据源）
// 合并原 CLASS_STATS / CLASS_SPEED / CLASS_SKILLS / WEAPON_SPRITE / playAttackSfx / CLASS_AVATARS / characters.ts

import type { CharacterType, SkillId } from './types';

// ── 攻击类型：驱动 Combat.ts 路由 + entityRenderer isMelee ──
export type AttackType = 'melee' | 'ranged_bullet' | 'ranged_heal';

// ── 角色定义接口 ──
export interface CharacterDef {
  // 战斗属性（原 CLASS_STATS）
  hp: number;
  hpMax: number;
  attack: number;
  defense: number;
  energy: number;
  energyMax: number;
  // 移动（原 CLASS_SPEED，px/s）
  speed: number;
  // 加速度趋近速率（加速/减速共用，指数趋近模型）
  accelRate: number;
  // 技能（原 CLASS_SKILLS）
  skills: SkillId[];
  // 武器（原 AuthManager.CLASS_CONFIG.weapon，→ WEAPON_TEMPLATES 的 key）
  weapon: string;
  // 攻击路由（替代 characterType === 'cleric' 硬编码特判）
  attackType: AttackType;
  // 武器贴图（原 entityRenderer.ts WEAPON_SPRITE）
  weaponSprite: string;
  // 弹体渲染器 key（原 projectileRenderer.ts BULLET_RENDERERS key）
  bulletKey: string;
  // 大厅头像组件名（原 PixelPlayerSlot.tsx CLASS_AVATARS）
  avatar: string;
  // 攻击音效 ID（原 sfx.ts playAttackSfx switch）
  attackSfx: string;
  // 精灵/视觉（原 characters.ts）
  color: string;
  name: string;
  description: string;
  spriteIndex: { front: number; back: number };
  spriteName?: { front: string[]; back: string[] };
  spriteRun?: { front: string[]; back: string[] };
  spriteHit?: { front: string; back: string };
}

// ── 角色注册表 ──
export const CHARACTER_DEFS: Record<CharacterType, CharacterDef> = {
  warrior: {
    hp: 100, hpMax: 100, attack: 15, defense: 10, energy: 50, energyMax: 50,
    speed: 180, accelRate: 50,
    skills: ['dash', 'war_cry', 'shield_bash'],
    weapon: 'sword',
    attackType: 'melee',
    weaponSprite: 'weapon_knight_sword',
    bulletKey: 'warrior',
    avatar: 'PixelSword',
    attackSfx: 'warrior_slash',
    color: '#4A9EFF',
    name: '战士',
    description: '近战战士，持剑攻击',
    spriteIndex: { front: 0, back: 1 },
    spriteName: {
      front: ['knight_m_idle_anim_f0', 'knight_m_idle_anim_f1', 'knight_m_idle_anim_f2', 'knight_m_idle_anim_f3'],
      back: ['knight_m_idle_anim_f0', 'knight_m_idle_anim_f1', 'knight_m_idle_anim_f2', 'knight_m_idle_anim_f3'],
    },
    spriteRun: {
      front: ['knight_m_run_anim_f0', 'knight_m_run_anim_f1', 'knight_m_run_anim_f2', 'knight_m_run_anim_f3'],
      back: ['knight_m_run_anim_f0', 'knight_m_run_anim_f1', 'knight_m_run_anim_f2', 'knight_m_run_anim_f3'],
    },
    spriteHit: { front: 'knight_m_hit_anim_f0', back: 'knight_m_hit_anim_f0' },
  },
  ranger: {
    hp: 80, hpMax: 80, attack: 12, defense: 5, energy: 50, energyMax: 50,
    speed: 220, accelRate: 60,
    skills: ['dash', 'dodge_roll', 'arrow_rain'],
    weapon: 'pistol',
    attackType: 'ranged_bullet',
    weaponSprite: 'weapon_bow',
    bulletKey: 'ranger',
    avatar: 'PixelShield',
    attackSfx: 'ranger_shoot',
    color: '#51CF66',
    name: '游侠',
    description: '远程弓箭手，机动性强',
    spriteIndex: { front: 162, back: 163 },
    spriteName: {
      front: ['elf_m_idle_anim_f0', 'elf_m_idle_anim_f1', 'elf_m_idle_anim_f2', 'elf_m_idle_anim_f3'],
      back: ['elf_m_idle_anim_f0', 'elf_m_idle_anim_f1', 'elf_m_idle_anim_f2', 'elf_m_idle_anim_f3'],
    },
    spriteRun: {
      front: ['elf_m_run_anim_f0', 'elf_m_run_anim_f1', 'elf_m_run_anim_f2', 'elf_m_run_anim_f3'],
      back: ['elf_m_run_anim_f0', 'elf_m_run_anim_f1', 'elf_m_run_anim_f2', 'elf_m_run_anim_f3'],
    },
    spriteHit: { front: 'elf_m_hit_anim_f0', back: 'elf_m_hit_anim_f0' },
  },
  mage: {
    hp: 60, hpMax: 60, attack: 20, defense: 3, energy: 60, energyMax: 60,
    speed: 180, accelRate: 50,
    skills: ['dash', 'frost_nova', 'meteor'],
    weapon: 'pistol',
    attackType: 'ranged_bullet',
    weaponSprite: 'weapon_red_magic_staff',
    bulletKey: 'mage',
    avatar: 'PixelStar',
    attackSfx: 'mage_cast',
    color: '#FFA500',
    name: '法师',
    description: '魔法攻击，伤害高但防御弱',
    spriteIndex: { front: 108, back: 109 },
    spriteName: {
      front: ['wizzard_m_idle_anim_f0', 'wizzard_m_idle_anim_f1', 'wizzard_m_idle_anim_f2', 'wizzard_m_idle_anim_f3'],
      back: ['wizzard_m_idle_anim_f0', 'wizzard_m_idle_anim_f1', 'wizzard_m_idle_anim_f2', 'wizzard_m_idle_anim_f3'],
    },
    spriteRun: {
      front: ['wizzard_m_run_anim_f0', 'wizzard_m_run_anim_f1', 'wizzard_m_run_anim_f2', 'wizzard_m_run_anim_f3'],
      back: ['wizzard_m_run_anim_f0', 'wizzard_m_run_anim_f1', 'wizzard_m_run_anim_f2', 'wizzard_m_run_anim_f3'],
    },
    spriteHit: { front: 'wizzard_m_hit_anim_f0', back: 'wizzard_m_hit_anim_f0' },
  },
  cleric: {
    hp: 70, hpMax: 70, attack: 8, defense: 6, energy: 50, energyMax: 50,
    speed: 190, accelRate: 50,
    skills: ['dash', 'holy_light', 'sanctuary'],
    weapon: 'pistol',
    attackType: 'ranged_heal',
    weaponSprite: 'weapon_green_magic_staff',
    bulletKey: 'cleric',
    avatar: 'PixelGem',
    attackSfx: 'cleric_cast',
    color: '#9B59B6',
    name: '牧师',
    description: '治疗辅助，可为队友恢复',
    spriteIndex: { front: 378, back: 379 },
    spriteName: {
      front: ['dwarf_m_idle_anim_f0', 'dwarf_m_idle_anim_f1', 'dwarf_m_idle_anim_f2', 'dwarf_m_idle_anim_f3'],
      back: ['dwarf_m_idle_anim_f0', 'dwarf_m_idle_anim_f1', 'dwarf_m_idle_anim_f2', 'dwarf_m_idle_anim_f3'],
    },
    spriteRun: {
      front: ['dwarf_m_run_anim_f0', 'dwarf_m_run_anim_f1', 'dwarf_m_run_anim_f2', 'dwarf_m_run_anim_f3'],
      back: ['dwarf_m_run_anim_f0', 'dwarf_m_run_anim_f1', 'dwarf_m_run_anim_f2', 'dwarf_m_run_anim_f3'],
    },
    spriteHit: { front: 'dwarf_m_hit_anim_f0', back: 'dwarf_m_hit_anim_f0' },
  },
};
