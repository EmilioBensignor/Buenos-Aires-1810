// Sprite del jugador (compadrito de 1810) dibujado por código. 4 direcciones,
// 2 frames de caminata. Se ancla por los pies.

const ESCALA = 4

const PAL = {
  piel: '#c98a5e',
  pielSombra: '#a06b45',
  sombrero: '#2b2118',
  poncho: '#8a3b2e',
  ponchoSombra: '#6b2c22',
  pantalon: '#3a3228',
  bota: '#1c1611',
  faja: '#d4a23a'
}

// dir: 'abajo'|'arriba'|'izq'|'der'. frame: 0|1. escala: factor de tamaño (1 = base).
export function drawPlayer(ctx, sx, sy, dir = 'abajo', frame = 0, escala = 1) {
  ctx.save()
  // Escalamos todo el sprite desde los pies (sx,sy).
  if (escala !== 1) {
    ctx.translate(sx, sy)
    ctx.scale(escala, escala)
    ctx.translate(-sx, -sy)
  }
  const baseX = Math.round(sx)
  const baseY = Math.round(sy)

  ctx.fillStyle = 'rgba(0,0,0,0.35)'
  ctx.beginPath()
  ctx.ellipse(baseX, baseY, 14, 6, 0, 0, Math.PI * 2)
  ctx.fill()

  const px = (lx, ly, w, h, color) => {
    ctx.fillStyle = color
    ctx.fillRect(baseX + lx * ESCALA, baseY + ly * ESCALA, w * ESCALA, h * ESCALA)
  }

  const paso = frame === 0 ? 0 : 1

  // Piernas / botas
  if (frame === 0) {
    px(-3, -3, 2, 3, PAL.pantalon)
    px(1, -3, 2, 3, PAL.pantalon)
    px(-3, 0, 2, 1, PAL.bota)
    px(1, 0, 2, 1, PAL.bota)
  } else {
    px(-3, -3, 2, 3, PAL.pantalon)
    px(1, -3, 2, 3, PAL.pantalon)
    px(-4, 0, 2, 1, PAL.bota)
    px(2, 0, 2, 1, PAL.bota)
  }

  // Torso / poncho
  px(-4, -10, 8, 7, PAL.poncho)
  px(-4, -10, 2, 7, PAL.ponchoSombra)
  px(-4, -5, 8, 1, PAL.faja)

  // Brazos
  if (paso === 0) {
    px(-5, -9, 2, 4, PAL.poncho)
    px(3, -9, 2, 4, PAL.poncho)
  } else {
    px(-5, -8, 2, 4, PAL.poncho)
    px(3, -10, 2, 4, PAL.poncho)
  }

  // Cabeza
  px(-3, -14, 6, 4, PAL.piel)
  if (dir === 'izq') px(-3, -14, 2, 4, PAL.pielSombra)
  else if (dir === 'der') px(1, -14, 2, 4, PAL.pielSombra)
  else if (dir === 'arriba') px(-3, -14, 6, 4, PAL.pielSombra)

  if (dir !== 'arriba') {
    ctx.fillStyle = '#1c1611'
    if (dir === 'abajo') {
      ctx.fillRect(baseX - 2 * ESCALA, baseY - 13 * ESCALA, ESCALA, ESCALA)
      ctx.fillRect(baseX + 1 * ESCALA, baseY - 13 * ESCALA, ESCALA, ESCALA)
    } else if (dir === 'der') {
      ctx.fillRect(baseX + 1 * ESCALA, baseY - 13 * ESCALA, ESCALA, ESCALA)
    } else if (dir === 'izq') {
      ctx.fillRect(baseX - 2 * ESCALA, baseY - 13 * ESCALA, ESCALA, ESCALA)
    }
  }

  // Sombrero (chambergo de ala ancha)
  px(-4, -16, 8, 1, PAL.sombrero)
  px(-3, -18, 6, 2, PAL.sombrero)

  ctx.restore()
}

export function dirDesdeVector(vx, vy) {
  if (Math.abs(vx) > Math.abs(vy)) {
    return vx < 0 ? 'izq' : 'der'
  }
  return vy < 0 ? 'arriba' : 'abajo'
}
