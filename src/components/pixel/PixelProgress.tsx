import React from 'react'

interface PixelProgressProps {
  value: number
  max: number
  type?: 'hp' | 'mp' | 'exp'
  showText?: boolean
  className?: string
}

const typeClass = {
  hp: 'progress-bar-hp',
  mp: 'progress-bar-mp',
  exp: 'progress-bar-exp',
}

export function PixelProgress({
  value,
  max,
  type = 'hp',
  showText = true,
  className = '',
}: PixelProgressProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100))

  return (
    <div className={`progress-bar ${className}`}>
      <div
        className={`progress-bar-fill ${typeClass[type]}`}
        style={{ width: `${percentage}%` }}
      />
      {showText && (
        <span className="progress-bar-text">
          {value}/{max}
        </span>
      )}
    </div>
  )
}

export default PixelProgress
