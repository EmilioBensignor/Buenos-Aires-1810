// El Sapo: una barra de fuerza oscila de 0 a 1. La barra está dividida en franjas
// (según el nivel de dificultad); cada una tiene un ancho y un pago. Pago 0 =
// franja perdedora (los "negros"). Clavás el cursor en la franja que querés.

import { zonasSapoNivel } from '~/composables/useGameConfig'

// Acumula los anchos de las zonas (al nivel dado) en límites 0..1.
export function zonasSapo(nivel = 0) {
  const zonas = zonasSapoNivel(nivel)
  const total = zonas.reduce((s, z) => s + z.ancho, 0)
  let acum = 0
  return zonas.map((z) => {
    const ini = acum / total
    acum += z.ancho
    const fin = acum / total
    return { ...z, ini, fin }
  })
}

// Dada la fuerza (0..1) donde clavó, devuelve { idx, pago, gano, color }.
export function resolverSapo(fuerza, nivel = 0) {
  const zonas = zonasSapo(nivel)
  const f = Math.min(0.999999, Math.max(0, fuerza))
  const idx = zonas.findIndex((z) => f >= z.ini && f < z.fin)
  const zona = zonas[idx] ?? zonas[zonas.length - 1]
  return {
    idx,
    pago: zona.pago,
    gano: zona.pago > 0,
    color: zona.color ?? null,
    centro: (zona.ini + zona.fin) / 2 // centro de la franja (0..1), para la animación
  }
}
