/**
 * PixelSprites - 基于Penpot设计系统的像素风格精灵组件
 * 设计来源: Penpot "Sprite Sheet" 页面
 * 精灵图规格: 640x640, 每个精灵64x64单元格
 */

import React from 'react';

// ============================================
// 精灵配置 - 与Penpot设计完全一致
// ============================================

export const SPRITE_SIZE = 64;
export const SHEET_SIZE = 640;

// 精灵位置定义 (单元格坐标)
export const SpritePosition = {
  // 玩家角色 (行1: y=0-63)
  Warrior: { x: 0, y: 0, color: '#4A9EFF', name: '战士' },
  Ranger: { x: 64, y: 0, color: '#51CF66', name: '游侠' },
  Mage: { x: 128, y: 0, color: '#FFA500', name: '法师' },
  Healer: { x: 192, y: 0, color: '#9B59B6', name: '牧师' },

  // 敌人 (行2-3: y=96-159)
  Basic: { x: 8, y: 104, size: 48, color: '#DC143C', name: '杂兵' },
  Fast: { x: 76, y: 108, size: 40, color: '#FF4500', name: '快兵' },
  Tank: { x: 132, y: 100, size: 56, color: '#8B0000', name: '坦克' },
  Boss: { x: 192, y: 96, size: 64, color: '#FF0000', name: 'BOSS' },

  // 道具 (行4-5: y=192-287)
  Health: { x: 12, y: 204, size: 40, color: '#32CD32', name: '血包' },
  Coin: { x: 76, y: 204, size: 40, color: '#FFD700', name: '金币' },
  Bullet: { x: 140, y: 204, size: 40, color: '#FFA500', name: '子弹' },
  Key: { x: 204, y: 204, size: 40, color: '#FFD700', name: '钥匙' },
  Shield: { x: 12, y: 268, size: 40, color: '#4A9EFF', name: '护盾' },
  Potion: { x: 76, y: 268, size: 40, color: '#9B59B6', name: '药水' },

  // 地牢瓦片 (行1: x=320+)
  Floor: { x: 322, y: 2, size: 60, color: '#3D2B3E', name: '地板' },
  Wall: { x: 386, y: 2, size: 60, color: '#8B4513', name: '墙壁' },
  Door: { x: 450, y: 2, size: 60, color: '#5C3D2E', name: '门' },
  Chest: { x: 514, y: 2, size: 60, color: '#8B4513', name: '宝箱' },
} as const;

export type SpriteType = keyof typeof SpritePosition;

// ============================================
// 基础像素矩形组件
// ============================================

interface PixelRectProps {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  style?: React.CSSProperties;
}

export function PixelRect({ x, y, width, height, color, style }: PixelRectProps) {
  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      fill={color}
      style={style}
    />
  );
}

// ============================================
// 玩家精灵组件
// ============================================

interface PlayerSpriteProps {
  type: 'Warrior' | 'Ranger' | 'Mage' | 'Healer';
  size?: number;
  showLabel?: boolean;
}

export function PlayerSprite({ type, size = 64, showLabel = false }: PlayerSpriteProps) {
  const config = SpritePosition[type];
  const scale = size / 64;

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 64 64`}
        style={{ imageRendering: 'pixelated' }}
      >
        {/* 玩家身体 */}
        <rect x="22" y="24" width="20" height="20" fill={config.color} />
        {/* 玩家头部 */}
        <circle cx="32" cy="14" r="10" fill="#FFDAB9" />
        {/* 头盔/帽子 */}
        <rect x="20" y="4" width="24" height="10" fill={config.color} />
        {/* 武器 */}
        {type === 'Warrior' && (
          <>
            <rect x="44" y="12" width="6" height="28" fill="#C0C0C0" />
            <rect x="38" y="38" width="18" height="4" fill="#8B4513" />
          </>
        )}
        {type === 'Ranger' && (
          <>
            <circle cx="50" cy="28" r="14" fill="none" stroke="#8B4513" strokeWidth="3" />
            <rect x="8" y="20" width="4" height="24" fill="#8B4513" />
          </>
        )}
        {type === 'Mage' && (
          <>
            <rect x="46" y="8" width="5" height="36" fill="#8B4513" />
            <circle cx="48" cy="6" r="6" fill="#DC143C" />
          </>
        )}
        {type === 'Healer' && (
          <>
            <rect x="46" y="12" width="5" height="32" fill="#FFFFFF" />
            <circle cx="48" cy="8" r="6" fill="#32CD32" />
          </>
        )}
      </svg>
      {showLabel && (
        <div style={{
          textAlign: 'center',
          fontSize: 10,
          color: config.color,
          fontFamily: 'Courier New, monospace',
          marginTop: 4,
        }}>
          {config.name}
        </div>
      )}
    </div>
  );
}

// ============================================
// 敌人精灵组件
// ============================================

interface EnemySpriteProps {
  type: 'Basic' | 'Fast' | 'Tank' | 'Boss';
  size?: number;
}

export function EnemySprite({ type, size = 48 }: EnemySpriteProps) {
  const config = SpritePosition[type];
  const scale = size / (config.size || 48);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`${config.x} ${config.y} ${config.size || 48} ${config.size || 48}`}
      style={{ imageRendering: 'pixelated' }}
    >
      <rect
        x={config.x + 2}
        y={config.y + 2}
        width={(config.size || 48) - 4}
        height={(config.size || 48) - 4}
        fill={config.color}
      />
      {/* 眼睛 */}
      <rect x={config.x + 10} y={config.y + 12} width="8" height="8" fill="#FFFFFF" />
      <rect x={config.x + (config.size || 48) - 18} y={config.y + 12} width="8" height="8" fill="#FFFFFF" />
      {type === 'Boss' && (
        <>
          {/* BOSS皇冠 */}
          <rect x={config.x + 20} y={config.y - 4} width="16" height="8" fill="#FFD700" />
          {/* 黄色眼睛 */}
          <rect x={config.x + 12} y={config.y + 14} width="10" height="10" fill="#FFFF00" />
          <rect x={config.x + (config.size || 48) - 22} y={config.y + 14} width="10" height="10" fill="#FFFF00" />
        </>
      )}
    </svg>
  );
}

// ============================================
// 道具精灵组件
// ============================================

interface ItemSpriteProps {
  type: 'Health' | 'Coin' | 'Bullet' | 'Key' | 'Shield' | 'Potion';
  size?: number;
}

export function ItemSprite({ type, size = 40 }: ItemSpriteProps) {
  const config = SpritePosition[type];

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 40 40`}
      style={{ imageRendering: 'pixelated' }}
    >
      {type === 'Health' && (
        <>
          <rect x="4" y="4" width="32" height="32" fill={config.color} />
          <rect x="15" y="8" width="10" height="24" fill="#FFFFFF" />
          <rect x="8" y="15" width="24" height="10" fill="#FFFFFF" />
        </>
      )}
      {type === 'Coin' && (
        <>
          <circle cx="20" cy="20" r="16" fill={config.color} />
          <circle cx="20" cy="20" r="12" fill="#FFA500" />
          <text x="14" y="25" fill={config.color} fontSize="16" fontWeight="bold">$</text>
        </>
      )}
      {type === 'Bullet' && (
        <>
          <rect x="2" y="14" width="6" height="12" fill="#FFD700" />
          <rect x="8" y="15" width="24" height="10" fill={config.color} />
        </>
      )}
      {type === 'Key' && (
        <>
          <circle cx="12" cy="12" r="8" fill="none" stroke={config.color} strokeWidth="4" />
          <rect x="16" y="9" width="20" height="6" fill={config.color} />
          <rect x="30" y="15" width="4" height="8" fill={config.color} />
          <rect x="24" y="15" width="4" height="6" fill={config.color} />
        </>
      )}
      {type === 'Shield' && (
        <>
          <rect x="4" y="4" width="32" height="32" fill={config.color} />
          <rect x="8" y="8" width="24" height="24" fill="#6AB4FF" />
        </>
      )}
      {type === 'Potion' && (
        <>
          <rect x="8" y="12" width="24" height="24" fill={config.color} />
          <rect x="14" y="4" width="12" height="10" fill="#8E44AD" />
          <circle cx="16" cy="20" r="4" fill="#BB77DD" />
        </>
      )}
    </svg>
  );
}

// ============================================
// 地牢瓦片组件
// ============================================

interface TileSpriteProps {
  type: 'Floor' | 'Wall' | 'Door' | 'Chest';
  size?: number;
}

export function TileSprite({ type, size = 64 }: TileSpriteProps) {
  const config = SpritePosition[type];

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ imageRendering: 'pixelated' }}
    >
      {type === 'Floor' && (
        <>
          <rect x="0" y="0" width={size} height={size} fill={config.color} />
          <rect x="0" y={size * 0.25} width={size} height="2" fill="#2D1B2E" fillOpacity="0.3" />
          <rect x="0" y={size * 0.6} width={size} height="2" fill="#4D3B4E" fillOpacity="0.3" />
        </>
      )}
      {type === 'Wall' && (
        <>
          <rect x="0" y="0" width={size} height={size} fill={config.color} />
          <rect x="2" y="4" width={size - 4} height={size * 0.22} fill="#7A3D12" />
          <rect x="2" y={size * 0.35} width={size - 4} height={size * 0.22} fill="#9B5523" />
          <rect x="2" y={size * 0.68} width={size - 4} height={size * 0.22} fill="#7A3D12" />
          <rect x="0" y="0" width={size} height="3" fill="#A0522D" />
        </>
      )}
      {type === 'Door' && (
        <>
          <rect x="2" y="0" width={size - 4} height={size} fill="#5C3D2E" />
          <rect x="4" y="2" width={size - 8} height={size - 4} fill={config.color} />
          <circle cx={size - 8} cy={size * 0.5} r="3" fill="#FFD700" />
        </>
      )}
      {type === 'Chest' && (
        <>
          <rect x="2" y="16" width={size - 4} height={size * 0.4} fill={config.color} />
          <rect x="2" y="2" width={size - 4} height="16" fill="#A0522D" />
          <rect x={size * 0.38} y="12" width={size * 0.24} height={size * 0.2} fill="#FFD700" />
          <rect x="2" y="20" width={size - 4} height="3" fill="#5C3D2E" />
        </>
      )}
    </svg>
  );
}

// ============================================
// 玩家头像组件 (用于房间页面)
// ============================================

interface PlayerAvatarProps {
  playerIndex: 0 | 1 | 2 | 3;
  size?: number;
  isReady?: boolean;
}

const PLAYER_COLORS = ['#4A9EFF', '#51CF66', '#FFA500', '#9B59B6'];
const PLAYER_NAMES = ['战士', '游侠', '法师', '牧师'];
const PLAYER_ICONS = ['🛡️', '⚔️', '🔮', '✨'];

export function PlayerAvatar({ playerIndex, size = 56, isReady = false }: PlayerAvatarProps) {
  const color = PLAYER_COLORS[playerIndex];
  const name = PLAYER_NAMES[playerIndex];
  const icon = PLAYER_ICONS[playerIndex];

  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: 8,
      border: `3px solid ${color}`,
      background: '#2D1B2E',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: size * 0.5,
      boxShadow: `0 0 15px ${color}40, inset 0 0 10px ${color}20`,
      position: 'relative',
    }}>
      {icon}
      {isReady && (
        <div style={{
          position: 'absolute',
          top: -4,
          right: -4,
          width: 12,
          height: 12,
          borderRadius: '50%',
          background: '#32CD32',
          animation: 'pulse 1s infinite',
        }} />
      )}
    </div>
  );
}

// ============================================
// 状态条组件
// ============================================

interface ProgressBarProps {
  type: 'hp' | 'mp' | 'exp';
  current: number;
  max: number;
  width?: number;
  height?: number;
}

export function PixelProgressBar({ type, current, max, width = 180, height = 24 }: ProgressBarProps) {
  const percent = Math.min(100, Math.max(0, (current / max) * 100));
  const colors = {
    hp: '#32CD32',
    mp: '#4A9EFF',
    exp: '#FFD700',
  };
  const color = colors[type];
  const labels = { hp: 'HP', mp: 'MP', exp: 'EXP' };

  return (
    <div style={{
      width,
      height,
      background: '#1a0f1e',
      border: `3px solid #8B4513`,
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        width: `${percent}%`,
        height: '100%',
        background: color,
        transition: 'width 0.3s ease',
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '50%',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.2) 0%, transparent 100%)',
        }} />
      </div>
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        fontFamily: 'Courier New, monospace',
        fontSize: 11,
        fontWeight: 'bold',
        color: 'white',
        textShadow: '1px 1px 0 rgba(0,0,0,0.8)',
      }}>
        {labels[type]} {current}/{max}
      </div>
    </div>
  );
}

// ============================================
// 技能图标组件
// ============================================

interface SkillIconProps {
  type: 'sword' | 'shield' | 'arrow' | 'potion';
  size?: number;
  cooldown?: boolean;
  onClick?: () => void;
}

export function PixelSkillIcon({ type, size = 48, cooldown = false, onClick }: SkillIconProps) {
  const configs = {
    sword: { bg: 'linear-gradient(135deg, #C0C0C0 0%, #808080 100%)', icon: '⚔️' },
    shield: { bg: 'linear-gradient(135deg, #4A9EFF 0%, #2a5a8f 100%)', icon: '🛡️' },
    arrow: { bg: 'linear-gradient(135deg, #8B4513 0%, #5a3a1a 100%)', icon: '🏹' },
    potion: { bg: 'linear-gradient(135deg, #DC143C 0%, #8a0a2a 100%)', icon: '🧪' },
  };
  const config = configs[type];

  return (
    <div
      onClick={onClick}
      style={{
        width: size,
        height: size,
        background: config.bg,
        border: '3px solid #FFFFFF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.45,
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
        transition: 'transform 0.1s',
      }}
      onMouseOver={(e) => {
        if (onClick) e.currentTarget.style.transform = 'scale(1.1)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      {config.icon}
      {cooldown && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
        }} />
      )}
    </div>
  );
}
