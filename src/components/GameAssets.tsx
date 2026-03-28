/**
 * GameAssets - 使用Penpot设计资源的图片组件
 * 资源来源: src/assets/images/
 */

import React from 'react';
import { PlayerImages, EnemyImages, ItemImages, TileImages } from '../assets/images';

// 玩家角色头像
interface PlayerIconProps {
  playerIndex: 0 | 1 | 2 | 3;
  size?: number;
  isReady?: boolean;
}

const PLAYER_SVGS = [
  PlayerImages.warrior,
  PlayerImages.ranger,
  PlayerImages.mage,
  PlayerImages.healer,
];

export function PlayerIcon({ playerIndex, size = 56, isReady = false }: PlayerIconProps) {
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: 8,
      border: `3px solid var(--player-${playerIndex + 1})`,
      background: 'var(--pixel-bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: `0 0 15px var(--player-${playerIndex + 1})40`,
    }}>
      <img
        src={PLAYER_SVGS[playerIndex]}
        alt={`Player ${playerIndex + 1}`}
        style={{
          width: size * 0.85,
          height: size * 0.85,
          imageRendering: 'pixelated',
        }}
      />
      {isReady && (
        <div style={{
          position: 'absolute',
          top: 4,
          right: 4,
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: 'var(--pixel-green)',
          animation: 'pulse 1s infinite',
        }} />
      )}
    </div>
  );
}

// 敌人图标
interface EnemyIconProps {
  type: 'basic' | 'fast' | 'tank' | 'boss';
  size?: number;
}

const ENEMY_SVGS = {
  basic: EnemyImages.basic,
  fast: EnemyImages.fast,
  tank: EnemyImages.tank,
  boss: EnemyImages.boss,
};

export function EnemyIcon({ type, size = 48 }: EnemyIconProps) {
  return (
    <img
      src={ENEMY_SVGS[type]}
      alt={`Enemy ${type}`}
      style={{
        width: size,
        height: size,
        imageRendering: 'pixelated',
      }}
    />
  );
}

// 道具图标
interface ItemIconProps {
  type: 'health' | 'coin' | 'bullet' | 'key' | 'shield' | 'potion';
  size?: number;
}

const ITEM_SVGS = {
  health: ItemImages.health,
  coin: ItemImages.coin,
  bullet: ItemImages.bullet,
  key: ItemImages.key,
  shield: ItemImages.shield,
  potion: ItemImages.potion,
};

export function ItemIcon({ type, size = 40 }: ItemIconProps) {
  return (
    <img
      src={ITEM_SVGS[type]}
      alt={`Item ${type}`}
      style={{
        width: size,
        height: size,
        imageRendering: 'pixelated',
      }}
    />
  );
}

// 地牢瓦片
interface TileIconProps {
  type: 'floor' | 'wall' | 'door' | 'chest';
  size?: number;
}

const TILE_SVGS = {
  floor: TileImages.floor,
  wall: TileImages.wall,
  door: TileImages.door,
  chest: TileImages.chest,
};

export function TileIcon({ type, size = 64 }: TileIconProps) {
  return (
    <img
      src={TILE_SVGS[type]}
      alt={`Tile ${type}`}
      style={{
        width: size,
        height: size,
        imageRendering: 'pixelated',
      }}
    />
  );
}

// Logo图标
export function LogoIcon({ size = 64 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      style={{ imageRendering: 'pixelated' }}
    >
      <rect width="64" height="64" fill="#2D1B2E"/>
      <rect x="26" y="4" width="12" height="40" fill="#C0C0C0"/>
      <rect x="28" y="6" width="8" height="36" fill="#E8E8E8"/>
      <rect x="16" y="40" width="32" height="8" fill="#8B4513"/>
      <rect x="24" y="48" width="16" height="4" fill="#8B4513"/>
      <rect x="26" y="52" width="12" height="8" fill="#FFD700"/>
      <rect x="14" y="38" width="36" height="4" fill="#A0522D"/>
    </svg>
  );
}

// 武器图标
export function WeaponIcon({ type, size = 32 }: { type: 'sword' | 'bow' | 'staff'; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      style={{ imageRendering: 'pixelated' }}
    >
      <rect width="32" height="32" fill="#2D1B2E"/>
      {type === 'sword' && (
        <>
          <rect x="13" y="2" width="6" height="20" fill="#C0C0C0"/>
          <rect x="14" y="4" width="4" height="16" fill="#E8E8E8"/>
          <rect x="8" y="20" width="16" height="4" fill="#8B4513"/>
          <rect x="14" y="24" width="4" height="4" fill="#8B4513"/>
        </>
      )}
      {type === 'bow' && (
        <>
          <ellipse cx="16" cy="16" rx="10" ry="10" fill="none" stroke="#8B4513" strokeWidth="3"/>
          <rect x="4" y="14" width="24" height="4" fill="#8B4513"/>
        </>
      )}
      {type === 'staff' && (
        <>
          <rect x="14" y="4" width="4" height="24" fill="#8B4513"/>
          <circle cx="16" cy="6" r="5" fill="#DC143C"/>
        </>
      )}
    </svg>
  );
}

// 状态图标
export function StatusIcon({ type, size = 24 }: { type: 'hp' | 'mp' | 'exp'; size?: number }) {
  const colors = { hp: '#32CD32', mp: '#4A9EFF', exp: '#FFD700' };
  const icons = { hp: '♥', mp: '◆', exp: '★' };

  return (
    <span style={{
      fontSize: size,
      color: colors[type],
      textShadow: `0 0 8px ${colors[type]}`,
    }}>
      {icons[type]}
    </span>
  );
}
