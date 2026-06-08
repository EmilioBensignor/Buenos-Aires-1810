// Edificios del hub, anclados a plaza.png.
// Coords NORMALIZADAS (0-1) sobre la imagen de fondo:
//   zona   = polígono [{x,y}, ...] que sigue la forma isométrica del edificio
//   puerta = punto al que camina el jugador para entrar {x,y}
// Calibrado con el editor visual (tecla E en la plaza).

import { ESCENAS } from '~/composables/useSceneManager'

export const EDIFICIOS = [
  {
    id: 'mercado',
    nombre: 'El Mercado',
    zona: [
      { x: 0.056, y: 0.118 }, { x: 0.127, y: 0.078 }, { x: 0.188, y: 0.064 },
      { x: 0.326, y: 0.171 }, { x: 0.322, y: 0.399 }, { x: 0.267, y: 0.43 },
      { x: 0.195, y: 0.47 }, { x: 0.137, y: 0.424 }, { x: 0.061, y: 0.365 }
    ],
    puerta: { x: 0.265, y: 0.461 },
    cartel: { x: 0.261, y: 0.351 },
    escena: ESCENAS.INT_MERCADO,
    pista: 'Los tres cubiletes. Seguí la bolita con la vista.'
  },
  {
    id: 'iglesia',
    nombre: 'La Iglesia',
    zona: [
      { x: 0.323, y: 0.338 }, { x: 0.328, y: 0.169 }, { x: 0.238, y: 0.101 },
      { x: 0.283, y: 0.03 }, { x: 0.332, y: 0.039 }, { x: 0.463, y: 0.135 },
      { x: 0.467, y: 0.29 }, { x: 0.369, y: 0.374 }
    ],
    puerta: { x: 0.433, y: 0.323 },
    cartel: { x: 0.427, y: 0.223 },
    escena: ESCENAS.INT_IGLESIA,
    pista: 'El bingo de la parroquia. Marcá los números y cantá bingo.'
  },
  {
    id: 'cabildo',
    nombre: 'El Cabildo',
    zona: [
      { x: 0.503, y: 0.005 }, { x: 0.765, y: 0.003 }, { x: 0.932, y: 0.123 },
      { x: 0.939, y: 0.219 }, { x: 0.859, y: 0.29 }, { x: 0.862, y: 0.419 },
      { x: 0.789, y: 0.466 }, { x: 0.745, y: 0.474 }, { x: 0.501, y: 0.29 }
    ],
    puerta: { x: 0.641, y: 0.398 },
    cartel: { x: 0.647, y: 0.263 },
    escena: ESCENAS.INT_CABILDO,
    pista: 'Los dados del Cabildo. Apostá a mayor, menor o exacto a 7.'
  },
  {
    id: 'feria',
    nombre: 'La Feria',
    zona: [
      { x: 0.86, y: 0.29 }, { x: 0.961, y: 0.201 }, { x: 0.998, y: 0.236 },
      { x: 0.994, y: 0.643 }, { x: 0.863, y: 0.525 }
    ],
    puerta: { x: 0.928, y: 0.59 },
    cartel: { x: 0.928, y: 0.456 },
    escena: ESCENAS.INT_FERIA,
    pista: 'El sapo. Clavá la fuerza justa para embocar en la boca.'
  },
  {
    id: 'pulperia',
    nombre: 'La Pulpería',
    zona: [
      { x: 0.068, y: 0.641 }, { x: 0.075, y: 0.586 }, { x: 0.122, y: 0.51 },
      { x: 0.197, y: 0.534 }, { x: 0.306, y: 0.603 }, { x: 0.304, y: 0.854 },
      { x: 0.177, y: 0.945 }, { x: 0.065, y: 0.841 }
    ],
    puerta: { x: 0.268, y: 0.889 },
    cartel: { x: 0.257, y: 0.787 },
    escena: ESCENAS.INT_PULPERIA,
    pista: 'Guerra de naipes contra el pulpero. La carta más alta gana.'
  },
  {
    id: 'garito',
    nombre: 'La Mafia',
    zona: [
      { x: 0.668, y: 0.608 }, { x: 0.789, y: 0.541 }, { x: 0.896, y: 0.611 },
      { x: 0.908, y: 0.829 }, { x: 0.784, y: 0.951 }, { x: 0.665, y: 0.851 }
    ],
    puerta: { x: 0.718, y: 0.898 },
    cartel: { x: 0.719, y: 0.771 },
    escena: ESCENAS.INT_GARITO,
    pista: 'Acá se salda la deuda. Llegá con la guita o no entres.'
  }
]

// Zona caminable: polígono que bordea el adoquinado de la plaza. El jugador solo
// puede estar DENTRO de este polígono. Coords normalizadas. Calibrar con el
// editor de zona caminable (tecla M en la plaza).
export const ZONA_CAMINABLE = [
  { x: 0, y: 0.435 }, { x: 0.059, y: 0.376 }, { x: 0.213, y: 0.489 },
  { x: 0.325, y: 0.4 }, { x: 0.324, y: 0.335 }, { x: 0.365, y: 0.376 },
  { x: 0.469, y: 0.279 }, { x: 0.467, y: 0.264 }, { x: 0.501, y: 0.274 },
  { x: 0.784, y: 0.495 }, { x: 0.85, y: 0.424 }, { x: 0.86, y: 0.429 },
  { x: 0.862, y: 0.528 }, { x: 0.998, y: 0.633 }, { x: 0.999, y: 0.844 },
  { x: 0.824, y: 0.998 }, { x: 0.047, y: 0.999 }, { x: 0.001, y: 0.958 },
  { x: 0.002, y: 0.429 }
]

// Posición inicial del jugador (centro del adoquinado), normalizada.
export const POS_INICIAL_JUGADOR = { x: 0.5, y: 0.6 }

// Caminos explícitos entre edificios. Clave "origen>destino" → lista de nodos
// {x,y} que el jugador recorre. "inicio" representa el spawn de la plaza.
// Calibrado con el editor de caminos (tecla W en la plaza).
export const CAMINOS = {
  'inicio>feria': [{ x: 0.792, y: 0.51 }],
  'inicio>pulperia': [{ x: 0.316, y: 0.878 }],
  'inicio>garito': [{ x: 0.651, y: 0.881 }],
  'mercado>garito': [{ x: 0.683, y: 0.908 }],
  'mercado>iglesia': [{ x: 0.35, y: 0.483 }, { x: 0.42, y: 0.404 }],
  'mercado>cabildo': [{ x: 0.447, y: 0.469 }],
  'mercado>feria': [{ x: 0.794, y: 0.511 }],
  'mercado>pulperia': [{ x: 0.373, y: 0.708 }, { x: 0.33, y: 0.89 }],
  'iglesia>garito': [{ x: 0.632, y: 0.868 }],
  'iglesia>pulperia': [{ x: 0.342, y: 0.851 }],
  'iglesia>feria': [{ x: 0.716, y: 0.499 }, { x: 0.799, y: 0.511 }],
  'iglesia>cabildo': [{ x: 0.551, y: 0.389 }],
  'iglesia>mercado': [{ x: 0.402, y: 0.454 }, { x: 0.317, y: 0.486 }],
  'cabildo>mercado': [{ x: 0.431, y: 0.49 }],
  'cabildo>feria': [{ x: 0.739, y: 0.496 }, { x: 0.833, y: 0.529 }],
  'cabildo>pulperia': [{ x: 0.358, y: 0.88 }],
  'cabildo>garito': [{ x: 0.618, y: 0.884 }, { x: 0.684, y: 0.921 }],
  'feria>garito': [{ x: 0.786, y: 0.5 }, { x: 0.626, y: 0.594 }, { x: 0.629, y: 0.918 }],
  'feria>pulperia': [{ x: 0.795, y: 0.502 }, { x: 0.58, y: 0.593 }, { x: 0.335, y: 0.903 }],
  'feria>cabildo': [{ x: 0.787, y: 0.514 }, { x: 0.649, y: 0.461 }],
  'feria>iglesia': [{ x: 0.79, y: 0.506 }, { x: 0.542, y: 0.433 }],
  'feria>mercado': [{ x: 0.792, y: 0.507 }, { x: 0.442, y: 0.511 }],
  'feria>inicio': [{ x: 0.793, y: 0.504 }, { x: 0.61, y: 0.546 }],
  'pulperia>inicio': [{ x: 0.406, y: 0.803 }],
  'pulperia>mercado': [{ x: 0.399, y: 0.774 }, { x: 0.34, y: 0.553 }],
  'pulperia>iglesia': [{ x: 0.388, y: 0.813 }, { x: 0.447, y: 0.449 }],
  'pulperia>cabildo': [{ x: 0.374, y: 0.831 }],
  'pulperia>feria': [{ x: 0.665, y: 0.538 }, { x: 0.797, y: 0.502 }],
  'pulperia>garito': [{ x: 0.579, y: 0.92 }],
  'garito>inicio': [{ x: 0.622, y: 0.886 }],
  'garito>mercado': [{ x: 0.645, y: 0.904 }],
  'garito>iglesia': [{ x: 0.632, y: 0.9 }, { x: 0.49, y: 0.47 }],
  'garito>cabildo': [{ x: 0.617, y: 0.873 }, { x: 0.597, y: 0.511 }],
  'garito>feria': [{ x: 0.609, y: 0.869 }, { x: 0.634, y: 0.576 }, { x: 0.794, y: 0.499 }]
}

export function claveCamino(origen, destino) {
  return `${origen}>${destino}`
}

// Devuelve los nodos del camino origen→destino, o [] si no está definido.
export function caminoEntre(origen, destino) {
  return CAMINOS[claveCamino(origen, destino)] || []
}

// Red de caminos: todos los segmentos de todos los caminos (para "subirse" a la red).
// Se construye una vez; cada entrada es [puntoA, puntoB].
const SEGMENTOS_RED = (() => {
  const segs = []
  for (const ruta of Object.values(CAMINOS)) {
    for (let i = 0; i < ruta.length - 1; i++) {
      segs.push([ruta[i], ruta[i + 1]])
    }
  }
  return segs
})()

// Punto más cercano sobre un segmento [a,b] al punto p.
function proyectarEnSegmento(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y
  const lenSq = dx * dx + dy * dy
  let t = lenSq ? ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq : 0
  t = Math.max(0, Math.min(1, t))
  return { x: a.x + t * dx, y: a.y + t * dy }
}

// Punto más cercano de TODA la red de caminos al punto p (para subirse a la ruta).
// Devuelve null si no hay segmentos (no debería pasar).
export function puntoMasCercanoEnRed(p) {
  let mejor = null, mejorD = Infinity
  for (const [a, b] of SEGMENTOS_RED) {
    const q = proyectarEnSegmento(p, a, b)
    const d = (q.x - p.x) ** 2 + (q.y - p.y) ** 2
    if (d < mejorD) { mejorD = d; mejor = q }
  }
  return mejor
}

// ¿El punto (x,y) es NO caminable? Fuera de la zona caminable o dentro de un edificio.
export function esBloqueado(x, y) {
  if (!puntoEnPoligono(x, y, ZONA_CAMINABLE)) return true
  for (const e of EDIFICIOS) {
    if (puntoEnPoligono(x, y, e.zona)) return true
  }
  return false
}

// ¿El punto (x,y) cae dentro del polígono de algún edificio? (ray casting)
export function edificioEnPunto(x, y) {
  for (const e of EDIFICIOS) {
    if (puntoEnPoligono(x, y, e.zona)) return e
  }
  return null
}

export function puntoEnPoligono(x, y, poly) {
  let dentro = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y
    const xj = poly[j].x, yj = poly[j].y
    const cruza = (yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
    if (cruza) dentro = !dentro
  }
  return dentro
}

// Edificio cuya puerta está siendo tocada por el jugador (para entrar caminando).
export function edificioEnPuerta(x, y, radio = 0.05) {
  for (const e of EDIFICIOS) {
    const dx = x - e.puerta.x
    const dy = y - e.puerta.y
    if (Math.sqrt(dx * dx + dy * dy) < radio) return e
  }
  return null
}
