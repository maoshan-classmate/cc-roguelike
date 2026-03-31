/**
 * 像素风格图标组件
 * 使用SVG绘制的像素艺术图标
 */

import React from 'react'

interface PixelIconProps {
  size?: number
  color?: string
  className?: string
  style?: React.CSSProperties
}

// 像素剑图标
export function PixelSword({ size = 32, color = '#C0C0C0', style }: PixelIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" style={{ imageRendering: 'pixelated', ...style }}>
      {/* 剑身 */}
      <rect x="14" y="2" width="4" height="18" fill={color} />
      <rect x="15" y="3" width="2" height="16" fill="#E8E8E8" />
      {/* 剑柄 */}
      <rect x="10" y="20" width="12" height="3" fill="#8B4513" />
      <rect x="14" y="23" width="4" height="4" fill="#8B4513" />
      {/* 剑格 */}
      <rect x="8" y="19" width="16" height="2" fill="#FFD700" />
    </svg>
  )
}

// 像素盾牌图标
export function PixelShield({ size = 32, color = '#4A9EFF', style }: PixelIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" style={{ imageRendering: 'pixelated', ...style }}>
      <rect x="8" y="4" width="16" height="4" fill={color} />
      <rect x="6" y="8" width="20" height="16" fill={color} />
      <rect x="8" y="24" width="16" height="4" fill={color} />
      {/* 高光 */}
      <rect x="10" y="10" width="4" height="12" fill="#6AB4FF" />
      {/* 十字装饰 */}
      <rect x="14" y="12" width="4" height="8" fill="#FFD700" />
    </svg>
  )
}

// 像素城堡图标
export function PixelCastle({ size = 32, color = '#8B4513', style }: PixelIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" style={{ imageRendering: 'pixelated', ...style }}>
      {/* 塔楼 */}
      <rect x="4" y="12" width="6" height="16" fill={color} />
      <rect x="22" y="12" width="6" height="16" fill={color} />
      {/* 塔顶 */}
      <rect x="2" y="8" width="10" height="4" fill="#A0522D" />
      <rect x="20" y="8" width="10" height="4" fill="#A0522D" />
      {/* 中央 */}
      <rect x="10" y="16" width="12" height="12" fill={color} />
      <rect x="12" y="20" width="8" height="8" fill="#5C3D2E" />
      {/* 旗帜 */}
      <rect x="6" y="2" width="2" height="6" fill="#8B4513" />
      <rect x="8" y="2" width="4" height="3" fill="#FFD700" />
      <rect x="24" y="2" width="2" height="6" fill="#8B4513" />
      <rect x="26" y="2" width="4" height="3" fill="#FFD700" />
    </svg>
  )
}

// 像素骷髅图标
export function PixelSkull({ size = 32, color = '#FFFFFF', style }: PixelIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" style={{ imageRendering: 'pixelated', ...style }}>
      {/* 头骨 */}
      <rect x="8" y="6" width="16" height="14" fill={color} />
      <rect x="6" y="8" width="2" height="10" fill={color} />
      <rect x="24" y="8" width="2" height="10" fill={color} />
      {/* 眼眶 */}
      <rect x="10" y="10" width="4" height="4" fill="#2D1B2E" />
      <rect x="18" y="10" width="4" height="4" fill="#2D1B2E" />
      {/* 鼻子 */}
      <rect x="14" y="14" width="4" height="2" fill="#2D1B2E" />
      {/* 下巴 */}
      <rect x="10" y="20" width="12" height="4" fill={color} />
      <rect x="12" y="24" width="8" height="2" fill={color} />
      {/* 牙齿 */}
      <rect x="12" y="22" width="2" height="2" fill="#2D1B2E" />
      <rect x="15" y="22" width="2" height="2" fill="#2D1B2E" />
      <rect x="18" y="22" width="2" height="2" fill="#2D1B2E" />
    </svg>
  )
}

// 像素龙图标
export function PixelDragon({ size = 32, color = '#DC143C', style }: PixelIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" style={{ imageRendering: 'pixelated', ...style }}>
      {/* 身体 */}
      <rect x="8" y="12" width="16" height="10" fill={color} />
      {/* 头 */}
      <rect x="20" y="8" width="8" height="8" fill={color} />
      {/* 眼睛 */}
      <rect x="24" y="10" width="2" height="2" fill="#FFFF00" />
      {/* 角 */}
      <rect x="22" y="4" width="2" height="4" fill="#FFD700" />
      <rect x="26" y="4" width="2" height="4" fill="#FFD700" />
      {/* 尾巴 */}
      <rect x="2" y="14" width="6" height="4" fill={color} />
      <rect x="0" y="12" width="4" height="4" fill={color} />
      {/* 腿 */}
      <rect x="10" y="22" width="4" height="6" fill="#8B0000" />
      <rect x="18" y="22" width="4" height="6" fill="#8B0000" />
    </svg>
  )
}

// 像素皇冠图标
export function PixelCrown({ size = 32, color = '#FFD700', style }: PixelIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" style={{ imageRendering: 'pixelated', ...style }}>
      <rect x="4" y="14" width="24" height="12" fill={color} />
      <rect x="6" y="12" width="4" height="4" fill={color} />
      <rect x="14" y="10" width="4" height="6" fill={color} />
      <rect x="22" y="12" width="4" height="4" fill={color} />
      {/* 宝石 */}
      <rect x="8" y="18" width="4" height="4" fill="#DC143C" />
      <rect x="14" y="18" width="4" height="4" fill="#4A9EFF" />
      <rect x="20" y="18" width="4" height="4" fill="#32CD32" />
    </svg>
  )
}

// 像素钥匙图标
export function PixelKey({ size = 32, color = '#FFD700', style }: PixelIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" style={{ imageRendering: 'pixelated', ...style }}>
      {/* 钥匙环 */}
      <rect x="4" y="4" width="12" height="12" fill="none" stroke={color} strokeWidth="4" />
      {/* 钥匙杆 */}
      <rect x="14" y="8" width="14" height="4" fill={color} />
      {/* 钥匙齿 */}
      <rect x="22" y="12" width="4" height="6" fill={color} />
      <rect x="26" y="12" width="2" height="4" fill={color} />
    </svg>
  )
}

// 像素宝石图标
export function PixelGem({ size = 32, color = '#4A9EFF', style }: PixelIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" style={{ imageRendering: 'pixelated', ...style }}>
      <rect x="8" y="4" width="16" height="4" fill={color} />
      <rect x="6" y="8" width="20" height="8" fill={color} />
      <rect x="10" y="16" width="12" height="8" fill={color} />
      <rect x="14" y="24" width="4" height="4" fill={color} />
      {/* 高光 */}
      <rect x="10" y="10" width="4" height="4" fill="#8AE0FF" />
    </svg>
  )
}

// 像素药水图标
export function PixelPotion({ size = 32, color = '#9B59B6', style }: PixelIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" style={{ imageRendering: 'pixelated', ...style }}>
      {/* 瓶身 */}
      <rect x="10" y="12" width="12" height="16" fill={color} />
      {/* 瓶口 */}
      <rect x="12" y="4" width="8" height="8" fill="#8E44AD" />
      <rect x="14" y="2" width="4" height="4" fill="#8E44AD" />
      {/* 液体高光 */}
      <rect x="12" y="14" width="4" height="10" fill="#BB77DD" />
      {/* 气泡 */}
      <rect x="16" y="18" width="2" height="2" fill="#DDAAFF" />
    </svg>
  )
}

// 像素心形图标
export function PixelHeart({ size = 32, color = '#DC143C', style }: PixelIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" style={{ imageRendering: 'pixelated', ...style }}>
      <rect x="6" y="6" width="8" height="8" fill={color} />
      <rect x="18" y="6" width="8" height="8" fill={color} />
      <rect x="4" y="10" width="10" height="8" fill={color} />
      <rect x="18" y="10" width="10" height="8" fill={color} />
      <rect x="6" y="14" width="6" height="6" fill={color} />
      <rect x="20" y="14" width="6" height="6" fill={color} />
      <rect x="10" y="18" width="12" height="6" fill={color} />
      <rect x="14" y="24" width="4" height="4" fill={color} />
      {/* 高光 */}
      <rect x="8" y="8" width="2" height="2" fill="#FF6B6B" />
    </svg>
  )
}

// 像素星星图标
export function PixelStar({ size = 32, color = '#FFD700', style }: PixelIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" style={{ imageRendering: 'pixelated', ...style }}>
      <rect x="14" y="2" width="4" height="8" fill={color} />
      <rect x="14" y="22" width="4" height="8" fill={color} />
      <rect x="2" y="14" width="8" height="4" fill={color} />
      <rect x="22" y="14" width="8" height="4" fill={color} />
      <rect x="6" y="6" width="6" height="6" fill={color} />
      <rect x="20" y="6" width="6" height="6" fill={color} />
      <rect x="6" y="20" width="6" height="6" fill={color} />
      <rect x="20" y="20" width="6" height="6" fill={color} />
      <rect x="12" y="12" width="8" height="8" fill={color} />
    </svg>
  )
}

// 像素炸弹图标
export function PixelBomb({ size = 32, color = '#2D1B2E', style }: PixelIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" style={{ imageRendering: 'pixelated', ...style }}>
      {/* 炸弹主体 */}
      <rect x="8" y="10" width="16" height="16" fill={color} />
      <rect x="6" y="12" width="2" height="12" fill={color} />
      <rect x="24" y="12" width="2" height="12" fill={color} />
      {/* 引线 */}
      <rect x="14" y="4" width="4" height="6" fill="#8B4513" />
      {/* 火花 */}
      <rect x="12" y="2" width="2" height="2" fill="#FF4500" />
      <rect x="18" y="2" width="2" height="2" fill="#FFD700" />
      <rect x="14" y="0" width="4" height="2" fill="#FF4500" />
    </svg>
  )
}

// 像素弓箭图标
export function PixelBow({ size = 32, color = '#8B4513', style }: PixelIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" style={{ imageRendering: 'pixelated', ...style }}>
      {/* 弓臂 */}
      <rect x="4" y="4" width="4" height="24" fill={color} />
      <rect x="24" y="4" width="4" height="24" fill={color} />
      {/* 弓弦 */}
      <rect x="6" y="15" width="20" height="2" fill="#C0C0C0" />
      {/* 箭 */}
      <rect x="8" y="14" width="16" height="4" fill="#8B4513" />
      <rect x="4" y="15" width="4" height="2" fill="#C0C0C0" />
      <rect x="2" y="13" width="4" height="6" fill="#C0C0C0" />
    </svg>
  )
}

// 像素法师杖图标
export function PixelStaff({ size = 32, color = '#8B4513', style }: PixelIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" style={{ imageRendering: 'pixelated', ...style }}>
      {/* 杖身 */}
      <rect x="14" y="8" width="4" height="22" fill={color} />
      {/* 顶部宝石 */}
      <rect x="10" y="2" width="12" height="8" fill="#DC143C" />
      <rect x="12" y="4" width="8" height="4" fill="#FF6B6B" />
    </svg>
  )
}

// 像素玩家头像 - 战士
export function PixelAvatarWarrior({ size = 56, color = '#4A9EFF', style }: PixelIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" style={{ imageRendering: 'pixelated', ...style }}>
      {/* 背景 */}
      <rect x="2" y="2" width="28" height="28" fill={color} opacity="0.3" />
      {/* 头部 */}
      <rect x="12" y="4" width="8" height="8" fill="#FFDAB9" />
      {/* 身体 */}
      <rect x="10" y="12" width="12" height="10" fill={color} />
      {/* 剑 */}
      <rect x="22" y="8" width="3" height="16" fill="#C0C0C0" />
      <rect x="20" y="10" width="7" height="2" fill="#FFD700" />
      {/* 盾牌 */}
      <rect x="4" y="14" width="6" height="8" fill="#8B4513" />
      <rect x="5" y="15" width="4" height="6" fill="#A0522D" />
      {/* 腿 */}
      <rect x="11" y="22" width="4" height="6" fill="#5C3D2E" />
      <rect x="17" y="22" width="4" height="6" fill="#5C3D2E" />
    </svg>
  )
}

// 像素玩家头像 - 游侠
export function PixelAvatarRanger({ size = 56, color = '#51CF66', style }: PixelIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" style={{ imageRendering: 'pixelated', ...style }}>
      {/* 背景 */}
      <rect x="2" y="2" width="28" height="28" fill={color} opacity="0.3" />
      {/* 头部 */}
      <rect x="12" y="4" width="8" height="8" fill="#FFDAB9" />
      {/* 身体 */}
      <rect x="10" y="12" width="12" height="10" fill={color} />
      {/* 弓 */}
      <rect x="2" y="10" width="2" height="14" fill="#8B4513" />
      <rect x="4" y="10" width="2" height="14" fill="#8B4513" />
      <rect x="4" y="16" width="6" height="2" fill="#C0C0C0" />
      {/* 箭 */}
      <rect x="8" y="15" width="8" height="2" fill="#8B4513" />
      <rect x="14" y="13" width="2" height="6" fill="#C0C0C0" />
      {/* 腿 */}
      <rect x="11" y="22" width="4" height="6" fill="#5C3D2E" />
      <rect x="17" y="22" width="4" height="6" fill="#5C3D2E" />
    </svg>
  )
}

// 像素玩家头像 - 法师
export function PixelAvatarMage({ size = 56, color = '#FFA500', style }: PixelIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" style={{ imageRendering: 'pixelated', ...style }}>
      {/* 背景 */}
      <rect x="2" y="2" width="28" height="28" fill={color} opacity="0.3" />
      {/* 帽子 */}
      <rect x="10" y="0" width="12" height="4" fill="#9B59B6" />
      <rect x="8" y="4" width="16" height="2" fill="#9B59B6" />
      {/* 头部 */}
      <rect x="12" y="6" width="8" height="8" fill="#FFDAB9" />
      {/* 身体 */}
      <rect x="10" y="14" width="12" height="10" fill="#9B59B6" />
      {/* 杖 */}
      <rect x="22" y="6" width="3" height="20" fill="#8B4513" />
      <rect x="20" y="4" width="7" height="4" fill="#DC143C" />
      {/* 腿 */}
      <rect x="11" y="24" width="4" height="4" fill="#5C3D2E" />
      <rect x="17" y="24" width="4" height="4" fill="#5C3D2E" />
    </svg>
  )
}

// 像素玩家头像 - 牧师
export function PixelAvatarHealer({ size = 56, color = '#9B59B6', style }: PixelIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" style={{ imageRendering: 'pixelated', ...style }}>
      {/* 背景 */}
      <rect x="2" y="2" width="28" height="28" fill={color} opacity="0.3" />
      {/* 头部 */}
      <rect x="12" y="4" width="8" height="8" fill="#FFDAB9" />
      {/* 身体 */}
      <rect x="8" y="12" width="16" height="12" fill={color} />
      {/* 十字 */}
      <rect x="14" y="14" width="4" height="8" fill="#FFFFFF" />
      <rect x="12" y="16" width="8" height="4" fill="#FFFFFF" />
      {/* 圣杯/杖 */}
      <rect x="4" y="16" width="4" height="10" fill="#FFD700" />
      <rect x="2" y="14" width="8" height="4" fill="#FFD700" />
      {/* 腿 */}
      <rect x="10" y="24" width="5" height="4" fill="#5C3D2E" />
      <rect x="17" y="24" width="5" height="4" fill="#5C3D2E" />
    </svg>
  )
}

// Logo组合：剑+盾+皇冠
export function PixelLogo({ size = 64, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" style={{ imageRendering: 'pixelated', ...style }}>
      {/* 盾牌背景 */}
      <rect x="8" y="16" width="24" height="40" fill="#4A9EFF" />
      <rect x="12" y="20" width="16" height="32" fill="#6AB4FF" />
      {/* 剑 */}
      <rect x="28" y="8" width="6" height="32" fill="#C0C0C0" />
      <rect x="29" y="10" width="4" height="28" fill="#E8E8E8" />
      <rect x="24" y="40" width="14" height="4" fill="#8B4513" />
      <rect x="30" y="44" width="2" height="6" fill="#8B4513" />
      {/* 皇冠 */}
      <rect x="34" y="20" width="24" height="16" fill="#FFD700" />
      <rect x="36" y="16" width="6" height="6" fill="#FFD700" />
      <rect x="46" y="16" width="6" height="6" fill="#FFD700" />
      <rect x="41" y="12" width="6" height="10" fill="#FFD700" />
      {/* 宝石 */}
      <rect x="40" y="26" width="4" height="4" fill="#DC143C" />
      <rect x="48" y="26" width="4" height="4" fill="#4A9EFF" />
    </svg>
  )
}
