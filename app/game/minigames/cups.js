// Cubiletes: 3 cubiletes (0,1,2), una bolita. Se muestra, se baraja, elegís.

import { barajadasCubiletesNivel, velocidadFinalCubiletesNivel } from '~/composables/useGameConfig'

// Devuelve { posInicial, swaps: [[a,b], ...], posFinal }. `nivel` sube la dificultad.
export function generarBarajada(config, nivel = 0) {
  const cantidad = barajadasCubiletesNivel(nivel)
  let pos = Math.floor(Math.random() * 3)
  const posInicial = pos
  const swaps = []

  for (let i = 0; i < cantidad; i++) {
    const a = Math.floor(Math.random() * 3)
    let b = Math.floor(Math.random() * 3)
    while (b === a) b = Math.floor(Math.random() * 3)
    swaps.push([a, b])
    if (pos === a) pos = b
    else if (pos === b) pos = a
  }

  return { posInicial, swaps, posFinal: pos }
}

// Duración (seg) de cada swap, acelerando del primero al último. El nivel baja
// la velocidad final (más rápido al final).
export function duracionSwap(indice, total, config, nivel = 0) {
  const velocidadInicial = config.CUBILETES.velocidadInicial
  const velocidadFinal = velocidadFinalCubiletesNivel(nivel)
  if (total <= 1) return velocidadInicial
  const t = indice / (total - 1)
  return velocidadInicial + (velocidadFinal - velocidadInicial) * t
}

export function resolverCubiletes(eleccion, posFinal, config) {
  const gano = eleccion === posFinal
  return {
    gano,
    multiplicador: gano ? config.CUBILETES.pago : 0
  }
}
