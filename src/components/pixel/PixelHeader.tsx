import React from 'react'

interface PixelHeaderProps {
  title: string
  subtitle?: string
  leftContent?: React.ReactNode
  rightContent?: React.ReactNode
}

export function PixelHeader({
  title,
  subtitle,
  leftContent,
  rightContent,
}: PixelHeaderProps) {
  return (
    <header className="header-pixel">
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {leftContent}
        <div>
          <h1 className="header-pixel-title">
            {title}
          </h1>
          {subtitle && (
            <div className="header-pixel-subtitle">
              {subtitle}
            </div>
          )}
        </div>
      </div>
      {rightContent && (
        <div style={{ display: 'flex', gap: 10 }}>
          {rightContent}
        </div>
      )}
    </header>
  )
}

export default PixelHeader
