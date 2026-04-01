import React from 'react'

interface PixelCardProps {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  glow?: 'gold' | 'green' | 'none'
}

const glowClass = {
  gold: 'pixel-glow-gold',
  green: 'pixel-glow-green',
  none: '',
}

export function PixelCard({
  children,
  className = '',
  style = {},
  glow = 'none',
}: PixelCardProps) {
  return (
    <div
      className={`card-pixel ${glow !== 'none' ? glowClass[glow] : ''} ${className}`}
      style={style}
    >
      {children}
    </div>
  )
}

export default PixelCard
