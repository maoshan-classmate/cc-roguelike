import React, { useCallback } from 'react'
import { useSound } from '../../audio/useSound'

interface PixelButtonProps {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'gold'
  glow?: 'gold' | 'green' | 'none'
  disabled?: boolean
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
  className?: string
  style?: React.CSSProperties
}

const variantClass = {
  primary: 'btn-pixel',
  secondary: 'btn-pixel btn-secondary',
  danger: 'btn-pixel btn-danger',
  success: 'btn-pixel btn-success',
  gold: 'btn-pixel btn-gold',
}

const glowClass = {
  gold: 'pixel-glow-gold',
  green: 'pixel-glow-green',
  none: '',
}

export function PixelButton({
  children,
  variant = 'primary',
  glow = 'none',
  disabled = false,
  onClick,
  type = 'button',
  className = '',
  style,
}: PixelButtonProps) {
  const { playClick } = useSound()

  const handleClick = useCallback(() => {
    if (disabled) return
    playClick()
    onClick?.()
  }, [disabled, onClick, playClick])

  return (
    <button
      type={type}
      onClick={handleClick}
      disabled={disabled}
      className={`${variantClass[variant]} ${glow !== 'none' ? glowClass[glow] : ''} ${className}`}
      style={style}
    >
      {children}
    </button>
  )
}

export default PixelButton
