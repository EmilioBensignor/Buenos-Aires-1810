// Sprite de NPC (pixel-art por código). Mismo cuerpo base que el jugador, varía
// por paleta y "oficio" (tocado/detalle). No camina, tiene leve idle (bob).
// El catálogo de NPCs vive en game/npc/npcs.js.

const ESCALA = 4

// pal: { piel, pantalon, casaca, casacaSombra, pechera, detalle, oficio }.
// bob: fase de oscilación idle. escala: factor de tamaño (1 = base, como drawPlayer).
export function drawNpc(ctx, sx, sy, pal, bob = 0, escala = 1) {
  ctx.save()
  if (escala !== 1) {
    ctx.translate(sx, sy)
    ctx.scale(escala, escala)
    ctx.translate(-sx, -sy)
  }
  const baseX = Math.round(sx)
  const baseY = Math.round(sy + Math.sin(bob) * 1.5)

  const px = (lx, ly, w, h, color) => {
    ctx.fillStyle = color
    ctx.fillRect(baseX + lx * ESCALA, baseY + ly * ESCALA, w * ESCALA, h * ESCALA)
  }

  // Sombra (anclada a los pies, sin el bob)
  ctx.fillStyle = 'rgba(0,0,0,0.35)'
  ctx.beginPath()
  ctx.ellipse(baseX, Math.round(sy), 14, 6, 0, 0, Math.PI * 2)
  ctx.fill()

  // Piernas / botas
  px(-3, -3, 2, 3, pal.pantalon)
  px(1, -3, 2, 3, pal.pantalon)
  px(-3, 0, 2, 1, '#1c1611')
  px(1, 0, 2, 1, '#1c1611')

  // Casaca / torso
  px(-4, -11, 8, 8, pal.casaca)
  px(-4, -11, 2, 8, pal.casacaSombra)
  px(-1, -11, 2, 6, pal.pechera)

  // Brazos
  px(-5, -10, 2, 5, pal.casaca)
  px(3, -10, 2, 5, pal.casaca)

  // Cabeza
  px(-3, -15, 6, 4, pal.piel)
  ctx.fillStyle = '#1c1611'
  ctx.fillRect(baseX - 2 * ESCALA, baseY - 14 * ESCALA, ESCALA, ESCALA)
  ctx.fillRect(baseX + 1 * ESCALA, baseY - 14 * ESCALA, ESCALA, ESCALA)

  dibujarOficio(px, pal)

  ctx.restore()
}

// Tocado/detalle según el oficio del NPC.
function dibujarOficio(px, pal) {
  switch (pal.oficio) {
    case 'bicornio': // San Martín
      px(-5, -17, 10, 1, pal.detalle)
      px(-2, -19, 4, 2, pal.detalle)
      break
    case 'galera': // sombrero de copa
      px(-3, -16, 6, 1, pal.detalle)
      px(-2, -20, 4, 4, pal.detalle)
      break
    case 'galeraOscura': // mafioso: galera + ala marcada
      px(-4, -16, 8, 1, pal.detalle)
      px(-2, -21, 4, 5, pal.detalle)
      break
    case 'anteojos': // Moreno
      px(-3, -16, 6, 2, pal.detalle)
      px(-3, -14, 2, 1, '#d4c8a0')
      px(1, -14, 2, 1, '#d4c8a0')
      break
    case 'morrion': // guardia: gorro con visera
      px(-4, -16, 8, 2, pal.detalle)
      px(-4, -14, 1, 1, pal.detalle)
      break
    case 'delantal': // pulpero: gorro chico + delantal claro en la pechera
      px(-3, -16, 6, 1, pal.detalle)
      px(-1, -10, 3, 7, pal.pechera)
      break
    case 'panuelo': // feriante/campeona: pañuelo en la cabeza
      px(-4, -16, 8, 2, pal.detalle)
      px(-4, -14, 1, 2, pal.detalle)
      px(3, -14, 1, 2, pal.detalle)
      break
    case 'andrajo': // el caído: pelo despeinado, sin tocado
      px(-3, -16, 6, 1, pal.detalle)
      px(-4, -15, 1, 1, pal.detalle)
      px(3, -15, 1, 1, pal.detalle)
      break
    default:
      px(-3, -16, 6, 2, pal.detalle)
  }
}
