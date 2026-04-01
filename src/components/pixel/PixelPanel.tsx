import React from 'react'

interface PixelPanelProps {
  title?: string
  icon?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function PixelPanel({
  title,
  icon,
  children,
  className = '',
}: PixelPanelProps) {
  return (
    <div className={`panel-pixel ${className}`}>
      {title && (
        <h2 className="panel-pixel-title">
          {icon}
          {title}
        </h2>
      )}
      {children}
    </div>
  )
}

export default PixelPanel
