import { useEffect, useRef, type RefObject } from 'react'

interface GameCanvasProps {
  canvasRef: RefObject<HTMLCanvasElement | null>
}

export function GameCanvas({ canvasRef }: GameCanvasProps) {
  return (
    <canvas
      ref={canvasRef}
      width={1024}
      height={768}
      style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        border: '4px solid var(--pixel-brown)', boxShadow: '6px 6px 0 rgba(0,0,0,0.5)',
        imageRendering: 'pixelated'
      }}
    />
  )
}
