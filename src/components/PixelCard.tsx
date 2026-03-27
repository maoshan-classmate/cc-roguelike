import React from 'react'

interface PixelCardProps {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  borderColor?: string
}

export default function PixelCard({
  children,
  className = '',
  style = {},
  borderColor = '#fff'
}: PixelCardProps) {
  return (
    <div
      className={`card-pixel ${className}`}
      style={{
        borderColor: borderColor,
        ...style
      }}
    >
      {children}
    </div>
  )
}
