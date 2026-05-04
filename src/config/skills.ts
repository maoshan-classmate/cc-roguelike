// 技能展示信息（客户端专用，数值仅供参考展示，实际逻辑在服务端 SKILL_TEMPLATES）
import skillDash from '../assets/skills/shared/skill_dash.png'
import skillWarCry from '../assets/skills/warrior/skill_war_cry.png'
import skillShieldBash from '../assets/skills/warrior/skill_shield_bash.png'
import skillDodgeRoll from '../assets/skills/ranger/skill_dodge_roll.png'
import skillArrowRain from '../assets/skills/ranger/skill_arrow_rain.png'
import skillFrostNova from '../assets/skills/mage/skill_frost_nova.png'
import skillMeteor from '../assets/skills/mage/skill_meteor.png'
import skillHolyLight from '../assets/skills/cleric/skill_holy_light.png'
import skillSanctuary from '../assets/skills/cleric/skill_sanctuary.png'

export interface SkillInfo {
  name: string
  description: string
  icon: string
  color: string
  energyCost: number
  cooldown: number // 秒
}

export const SKILL_INFO: Record<string, SkillInfo> = {
  dash: {
    name: '冲刺',
    description: '朝前方瞬移200px，获得0.3秒无敌',
    icon: skillDash,
    color: '#C0C0C0',
    energyCost: 20,
    cooldown: 2,
  },
  war_cry: {
    name: '战吼',
    description: '嘲讽周围敌人攻击自己，获得60%减伤持续3秒',
    icon: skillWarCry,
    color: '#FFD700',
    energyCost: 30,
    cooldown: 8,
  },
  shield_bash: {
    name: '盾击',
    description: '击退前方敌人60px并眩晕1秒',
    icon: skillShieldBash,
    color: '#FFaa33',
    energyCost: 25,
    cooldown: 5,
  },
  dodge_roll: {
    name: '翻滚',
    description: '朝移动方向翻滚150px，期间无敌，落点减速敌人',
    icon: skillDodgeRoll,
    color: '#44FFaa',
    energyCost: 25,
    cooldown: 6,
  },
  arrow_rain: {
    name: '箭雨',
    description: '标记前方区域，延迟后落下3波箭雨造成范围伤害',
    icon: skillArrowRain,
    color: '#FF4444',
    energyCost: 35,
    cooldown: 10,
  },
  frost_nova: {
    name: '冰霜新星',
    description: '冻结周围敌人，造成0.8x伤害并减速50%持续3秒',
    icon: skillFrostNova,
    color: '#88DDFF',
    energyCost: 30,
    cooldown: 7,
  },
  meteor: {
    name: '陨石',
    description: '召唤陨石轰击目标区域，造成2.5x伤害并灼烧',
    icon: skillMeteor,
    color: '#FF4400',
    energyCost: 40,
    cooldown: 12,
  },
  holy_light: {
    name: '圣光',
    description: '治疗自身或150px内血量最低的队友50HP',
    icon: skillHolyLight,
    color: '#FFDD44',
    energyCost: 25,
    cooldown: 6,
  },
  sanctuary: {
    name: '圣域',
    description: '创造安全区域，范围内队友获得30%减伤和持续回复',
    icon: skillSanctuary,
    color: '#FFD700',
    energyCost: 40,
    cooldown: 12,
  },
}

export const CLASS_SKILLS: Record<string, string[]> = {
  warrior: ['dash', 'war_cry', 'shield_bash'],
  ranger:  ['dash', 'dodge_roll', 'arrow_rain'],
  mage:    ['dash', 'frost_nova', 'meteor'],
  cleric:  ['dash', 'holy_light', 'sanctuary'],
}
