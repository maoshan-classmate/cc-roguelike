import React from 'react'

interface PixelBadgeProps {
  children: React.ReactNode
  status?: 'waiting' | 'ready' | 'playing'
  className?: string
}

const statusClass = {
  waiting: 'status-badge status-badge-waiting',
  ready: 'status-badge status-badge-ready',
  playing: 'status-badge status-badge-playing',
}

export function PixelBadge({
  children,
  status = 'waiting',
  className = '',
}: PixelBadgeProps) {
  return (
    <span className={`${statusClass[status]} ${className}`}>
      {children}
    </span>
  )
}

export default PixelBadge
