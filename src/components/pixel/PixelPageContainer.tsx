import React from 'react'

interface PixelPageContainerProps {
  children: React.ReactNode
  showGrid?: boolean
  style?: React.CSSProperties
}

export function PixelPageContainer({
  children,
  showGrid = true,
  style = {},
}: PixelPageContainerProps) {
  return (
    <div
      style={{
        minHeight: '100vh',
        padding: 20,
        background: 'var(--pixel-bg)',
        position: 'relative',
        overflowY: 'auto',
        ...style,
      }}
    >
      {/* Pixel grid background */}
      {showGrid && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: `
              linear-gradient(rgba(139, 69, 19, 0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(139, 69, 19, 0.03) 1px, transparent 1px)
            `,
            backgroundSize: '32px 32px',
            pointerEvents: 'none',
          }}
        />
      )}
      {children}
    </div>
  )
}

export default PixelPageContainer
