import React from 'react'

interface PixelInputProps {
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  type?: 'text' | 'password'
  className?: string
  autoFocus?: boolean
  onKeyDown?: (e: React.KeyboardEvent) => void
}

export function PixelInput({
  value,
  onChange,
  placeholder = '',
  type = 'text',
  className = '',
  autoFocus = false,
  onKeyDown,
}: PixelInputProps) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`input-pixel ${className}`}
      autoFocus={autoFocus}
      onKeyDown={onKeyDown}
    />
  )
}

export default PixelInput
