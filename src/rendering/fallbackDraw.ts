export function drawFallbackRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string
): void {
  ctx.fillStyle = color
  ctx.fillRect(x - size / 2, y - size / 2, size, size)
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = 1
  ctx.strokeRect(x - size / 2, y - size / 2, size, size)
}
