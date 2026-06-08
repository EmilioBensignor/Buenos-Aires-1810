// Interiores caminables. Espejo de la plaza pero adentro de un edificio.
// Coords NORMALIZADAS (0-1) sobre la imagen de fondo del interior:
//   caminable = polígono donde el jugador puede caminar
//   mesa      = polígono que dispara el minijuego (tiene .escena, .etiqueta)
//   salida    = polígono que vuelve a la plaza
//   spawn     = punto donde aparece al entrar {x,y} (o null hasta definirlo)
//   obstaculos = polígonos no caminables (sillas, cajas, etc.)
//   escalaJugador = factor de tamaño del sprite
// Se arman con el editor (Shift+E): teclas 1/2/3/4/5 eligen qué editás.

import { ESCENAS } from '~/composables/useSceneManager'

export const INTERIORES = {
  pulperia: {
    id: 'pulperia',
    nombre: 'La Pulpería',
    edificioPlaza: 'pulperia',
    fondo: '/assets/pulperia.png',
    escalaJugador: 3,
    caminable: [
      { x: 0.285, y: 0.463 }, { x: 0.356, y: 0.426 }, { x: 0.399, y: 0.418 },
      { x: 0.439, y: 0.408 }, { x: 0.583, y: 0.514 }, { x: 0.885, y: 0.729 },
      { x: 0.999, y: 0.809 }, { x: 0.997, y: 0.878 }, { x: 0.94, y: 0.92 },
      { x: 0.863, y: 0.99 }, { x: 0.593, y: 0.994 }, { x: 0.097, y: 0.989 },
      { x: 0.078, y: 0.846 }, { x: 0.008, y: 0.833 }, { x: 0.006, y: 0.686 },
      { x: 0.219, y: 0.545 }, { x: 0.278, y: 0.499 }
    ],
    mesa: {
      poly: [
        { x: 0.34, y: 0.527 }, { x: 0.215, y: 0.619 }, { x: 0.447, y: 0.791 },
        { x: 0.64, y: 0.644 }, { x: 0.419, y: 0.477 }
      ],
      escena: ESCENAS.NAIPES,
      etiqueta: 'Jugar a los naipes',
      juego: 'Naipes',
      cartel: { x: 0.428, y: 0.598 }
    },
    salida: {
      poly: [
        { x: 0.278, y: 0.463 }, { x: 0.274, y: 0.181 },
        { x: 0.374, y: 0.137 }, { x: 0.376, y: 0.423 }
      ]
    },
    spawn: { x: 0.317, y: 0.481 },
    obstaculos: [
      [
        { x: 0.235, y: 0.919 }, { x: 0.236, y: 0.801 }, { x: 0.286, y: 0.764 },
        { x: 0.337, y: 0.803 }, { x: 0.34, y: 0.921 }
      ]
    ]
  },

  cabildo: {
    id: 'cabildo',
    nombre: 'El Cabildo',
    edificioPlaza: 'cabildo',
    fondo: '/assets/cabildo.png',
    escalaJugador: 2.1,
    caminable: [
      { x: 0.872, y: 0.486 }, { x: 0.774, y: 0.449 }, { x: 0.546, y: 0.35 },
      { x: 0.133, y: 0.603 }, { x: 0.144, y: 0.678 }, { x: 0.137, y: 0.76 },
      { x: 0.05, y: 0.768 }, { x: 0.358, y: 0.995 }, { x: 0.66, y: 0.991 },
      { x: 0.992, y: 0.736 }, { x: 0.995, y: 0.611 }
    ],
    mesa: {
      poly: [
        { x: 0.399, y: 0.594 }, { x: 0.497, y: 0.668 }, { x: 0.669, y: 0.541 },
        { x: 0.674, y: 0.493 }, { x: 0.583, y: 0.426 }, { x: 0.395, y: 0.539 }
      ],
      escena: ESCENAS.DADOS,
      etiqueta: 'Tirar los dados',
      juego: 'Dados',
      cartel: { x: 0.549, y: 0.52 }
    },
    salida: {
      poly: [
        { x: 0.755, y: 0.449 }, { x: 0.86, y: 0.494 }, { x: 0.861, y: 0.269 },
        { x: 0.819, y: 0.219 }, { x: 0.765, y: 0.205 }
      ]
    },
    spawn: { x: 0.785, y: 0.501 },
    obstaculos: [
      [
        { x: 0.565, y: 0.731 }, { x: 0.599, y: 0.755 }, { x: 0.631, y: 0.73 },
        { x: 0.631, y: 0.65 }, { x: 0.601, y: 0.624 }, { x: 0.563, y: 0.644 }
      ],
      [
        { x: 0.33, y: 0.856 }, { x: 0.383, y: 0.866 }, { x: 0.377, y: 0.751 },
        { x: 0.353, y: 0.741 }, { x: 0.329, y: 0.761 }
      ],
      [
        { x: 0.015, y: 0.754 }, { x: 0.126, y: 0.749 }, { x: 0.135, y: 0.668 },
        { x: 0.124, y: 0.59 }, { x: 0.07, y: 0.596 }, { x: 0.025, y: 0.636 }
      ]
    ]
  },

  mercado: {
    id: 'mercado',
    nombre: 'El Mercado',
    edificioPlaza: 'mercado',
    fondo: '/assets/casadejuego.png',
    escalaJugador: 2.8,
    caminable: [
      { x: 0.36, y: 0.383 }, { x: 0.283, y: 0.424 }, { x: 0.265, y: 0.506 },
      { x: 0.212, y: 0.561 }, { x: 0.111, y: 0.636 }, { x: 0.055, y: 0.586 },
      { x: 0.003, y: 0.616 }, { x: 0.005, y: 0.7 }, { x: 0.362, y: 0.993 },
      { x: 0.618, y: 0.999 }, { x: 0.997, y: 0.678 }, { x: 0.885, y: 0.59 },
      { x: 0.825, y: 0.599 }, { x: 0.725, y: 0.533 }, { x: 0.717, y: 0.468 },
      { x: 0.59, y: 0.389 }, { x: 0.506, y: 0.315 }, { x: 0.435, y: 0.336 }
    ],
    mesa: {
      poly: [
        { x: 0.31, y: 0.575 }, { x: 0.471, y: 0.693 }, { x: 0.62, y: 0.6 },
        { x: 0.631, y: 0.556 }, { x: 0.477, y: 0.433 }, { x: 0.313, y: 0.543 }
      ],
      escena: ESCENAS.CUBILETES,
      etiqueta: 'Jugar a los cubiletes',
      juego: 'Cubiletes',
      cartel: { x: 0.478, y: 0.553 }
    },
    salida: {
      poly: [
        { x: 0.283, y: 0.419 }, { x: 0.435, y: 0.346 },
        { x: 0.433, y: 0.014 }, { x: 0.284, y: 0.02 }
      ]
    },
    spawn: { x: 0.383, y: 0.411 },
    obstaculos: [
      [
        { x: 0.308, y: 0.858 }, { x: 0.349, y: 0.891 }, { x: 0.389, y: 0.854 },
        { x: 0.381, y: 0.729 }, { x: 0.349, y: 0.71 }, { x: 0.314, y: 0.733 }
      ],
      [
        { x: 0.564, y: 0.865 }, { x: 0.597, y: 0.886 }, { x: 0.643, y: 0.864 },
        { x: 0.637, y: 0.746 }, { x: 0.601, y: 0.714 }, { x: 0.56, y: 0.736 }
      ],
      [
        { x: 0.325, y: 0.711 }, { x: 0.327, y: 0.596 }, { x: 0.467, y: 0.704 },
        { x: 0.622, y: 0.606 }, { x: 0.624, y: 0.729 }, { x: 0.56, y: 0.736 },
        { x: 0.478, y: 0.85 }
      ],
      [
        { x: 0.726, y: 0.531 }, { x: 0.834, y: 0.6 }, { x: 0.879, y: 0.565 },
        { x: 0.728, y: 0.47 }
      ],
      [
        { x: 0.06, y: 0.566 }, { x: 0.115, y: 0.614 }, { x: 0.221, y: 0.54 },
        { x: 0.218, y: 0.458 }
      ],
      [
        { x: 0.233, y: 0.485 }, { x: 0.26, y: 0.486 }, { x: 0.276, y: 0.425 },
        { x: 0.229, y: 0.423 }
      ]
    ]
  },

  feria: {
    id: 'feria',
    nombre: 'La Feria',
    edificioPlaza: 'feria',
    fondo: '/assets/feria.png',
    escalaJugador: 2.3,
    caminable: [
      { x: 0.219, y: 0.515 }, { x: 0.199, y: 0.516 }, { x: 0.182, y: 0.565 },
      { x: 0.062, y: 0.554 }, { x: 0.368, y: 0.32 }, { x: 0.444, y: 0.381 },
      { x: 0.536, y: 0.316 }, { x: 0.828, y: 0.5 }, { x: 0.82, y: 0.553 },
      { x: 0.875, y: 0.601 }, { x: 0.849, y: 0.64 }, { x: 0.86, y: 0.714 },
      { x: 0.891, y: 0.75 }, { x: 0.958, y: 0.73 }, { x: 0.999, y: 0.715 },
      { x: 0.997, y: 0.789 }, { x: 0.746, y: 0.996 }, { x: 0.002, y: 0.993 },
      { x: 0.005, y: 0.731 }, { x: 0.059, y: 0.73 }, { x: 0.125, y: 0.699 },
      { x: 0.195, y: 0.66 }, { x: 0.214, y: 0.6 }, { x: 0.23, y: 0.574 }
    ],
    mesa: {
      poly: [
        { x: 0.377, y: 0.561 }, { x: 0.381, y: 0.744 }, { x: 0.481, y: 0.818 },
        { x: 0.592, y: 0.723 }, { x: 0.593, y: 0.555 }, { x: 0.524, y: 0.499 },
        { x: 0.531, y: 0.416 }, { x: 0.494, y: 0.393 }, { x: 0.477, y: 0.439 },
        { x: 0.424, y: 0.48 }, { x: 0.422, y: 0.525 }
      ],
      escena: ESCENAS.SORTIJA,
      etiqueta: 'Jugar al sapo',
      juego: 'Sapo',
      cartel: { x: 0.487, y: 0.569 }
    },
    salida: {
      poly: [
        { x: 0.147, y: 0.514 }, { x: 0.232, y: 0.44 },
        { x: 0.222, y: 0.18 }, { x: 0.137, y: 0.236 }
      ]
    },
    spawn: { x: 0.263, y: 0.489 },
    obstaculos: [
      [
        { x: 0.002, y: 0.724 }, { x: 0.049, y: 0.725 }, { x: 0.163, y: 0.679 },
        { x: 0.2, y: 0.641 }, { x: 0.208, y: 0.596 }, { x: 0.192, y: 0.573 },
        { x: 0.149, y: 0.579 }, { x: 0.092, y: 0.566 }, { x: 0.001, y: 0.563 }
      ],
      [
        { x: 0.86, y: 0.708 }, { x: 0.89, y: 0.736 }, { x: 0.951, y: 0.716 },
        { x: 0.946, y: 0.611 }, { x: 0.885, y: 0.601 }, { x: 0.86, y: 0.626 }
      ],
      [
        { x: 0.379, y: 0.324 }, { x: 0.45, y: 0.376 }, { x: 0.531, y: 0.31 },
        { x: 0.516, y: 0.234 }, { x: 0.447, y: 0.193 }, { x: 0.377, y: 0.241 }
      ],
      [
        { x: 0.192, y: 0.576 }, { x: 0.219, y: 0.57 }, { x: 0.22, y: 0.529 },
        { x: 0.196, y: 0.528 }
      ],
      [
        { x: 0.321, y: 0.456 }, { x: 0.338, y: 0.478 }, { x: 0.353, y: 0.45 },
        { x: 0.333, y: 0.421 }
      ],
      [
        { x: 0.54, y: 0.419 }, { x: 0.556, y: 0.449 }, { x: 0.567, y: 0.429 },
        { x: 0.556, y: 0.383 }
      ],
      [
        { x: 0.663, y: 0.535 }, { x: 0.681, y: 0.544 }, { x: 0.697, y: 0.518 },
        { x: 0.683, y: 0.478 }, { x: 0.66, y: 0.494 }
      ],
      [
        { x: 0.776, y: 0.611 }, { x: 0.794, y: 0.628 }, { x: 0.814, y: 0.611 },
        { x: 0.804, y: 0.566 }, { x: 0.779, y: 0.569 }
      ],
      [
        { x: 0.831, y: 0.553 }, { x: 0.999, y: 0.693 }, { x: 0.994, y: 0.496 },
        { x: 0.881, y: 0.43 }, { x: 0.834, y: 0.465 }
      ]
    ]
  },

  iglesia: {
    id: 'iglesia',
    nombre: 'La Iglesia',
    edificioPlaza: 'iglesia',
    fondo: '/assets/iglesia.png',
    escalaJugador: 2,
    caminable: [
      { x: 0.31, y: 0.544 }, { x: 0.616, y: 0.812 }, { x: 0.609, y: 0.905 },
      { x: 0.735, y: 0.811 }, { x: 0.922, y: 0.661 }, { x: 0.921, y: 0.518 },
      { x: 0.763, y: 0.386 }, { x: 0.558, y: 0.236 }, { x: 0.54, y: 0.293 },
      { x: 0.428, y: 0.331 }, { x: 0.403, y: 0.26 }, { x: 0.361, y: 0.285 },
      { x: 0.385, y: 0.321 }, { x: 0.387, y: 0.4 }, { x: 0.203, y: 0.544 },
      { x: 0.111, y: 0.464 }, { x: 0.067, y: 0.493 }, { x: 0.128, y: 0.541 },
      { x: 0.135, y: 0.584 }, { x: 0.181, y: 0.652 }
    ],
    mesa: {
      poly: [
        { x: 0.686, y: 0.753 }, { x: 0.744, y: 0.798 }, { x: 0.894, y: 0.686 },
        { x: 0.897, y: 0.595 }, { x: 0.877, y: 0.528 }, { x: 0.853, y: 0.501 },
        { x: 0.818, y: 0.54 }, { x: 0.681, y: 0.646 }
      ],
      escena: ESCENAS.BINGO,
      etiqueta: 'Jugar al bingo',
      juego: 'Bingo',
      cartel: { x: 0.775, y: 0.645 }
    },
    salida: {
      poly: [
        { x: 0.653, y: 0.331 }, { x: 0.749, y: 0.393 },
        { x: 0.748, y: 0.134 }, { x: 0.661, y: 0.078 }
      ]
    },
    spawn: { x: 0.645, y: 0.383 },
    obstaculos: [
      [
        { x: 0.417, y: 0.548 }, { x: 0.637, y: 0.728 }, { x: 0.674, y: 0.704 },
        { x: 0.67, y: 0.63 }, { x: 0.763, y: 0.573 }, { x: 0.763, y: 0.533 },
        { x: 0.584, y: 0.371 }, { x: 0.416, y: 0.491 }
      ],
      [
        { x: 0.149, y: 0.68 }, { x: 0.31, y: 0.563 }, { x: 0.606, y: 0.82 },
        { x: 0.606, y: 0.914 }, { x: 0.461, y: 0.999 }, { x: 0.122, y: 0.718 }
      ],
      [
        { x: 0.12, y: 0.45 }, { x: 0.208, y: 0.521 }, { x: 0.373, y: 0.395 },
        { x: 0.374, y: 0.31 }, { x: 0.303, y: 0.243 }, { x: 0.143, y: 0.351 }
      ],
      [
        { x: 0.926, y: 0.661 }, { x: 0.999, y: 0.593 }, { x: 0.959, y: 0.416 },
        { x: 0.942, y: 0.354 }, { x: 0.921, y: 0.423 }
      ],
      [
        { x: 0.426, y: 0.314 }, { x: 0.54, y: 0.278 }, { x: 0.551, y: 0.22 },
        { x: 0.508, y: 0.175 }, { x: 0.41, y: 0.246 }
      ],
      [
        { x: 0.006, y: 0.595 }, { x: 0.121, y: 0.715 }, { x: 0.193, y: 0.639 },
        { x: 0.074, y: 0.474 }, { x: 0, y: 0.55 }
      ]
    ]
  },

  garito: {
    id: 'garito',
    nombre: 'La Mafia',
    edificioPlaza: 'garito',
    fondo: '/assets/garito.png',
    escalaJugador: 3,
    caminable: [
      { x: 0.195, y: 0.85 }, { x: 0.219, y: 0.834 }, { x: 0.226, y: 0.723 },
      { x: 0.293, y: 0.666 }, { x: 0.379, y: 0.759 }, { x: 0.379, y: 0.869 },
      { x: 0.3, y: 0.943 }, { x: 0.363, y: 0.996 }, { x: 0.783, y: 0.991 },
      { x: 0.994, y: 0.821 }, { x: 0.997, y: 0.643 }, { x: 0.708, y: 0.399 },
      { x: 0.451, y: 0.349 }, { x: 0.228, y: 0.574 }, { x: 0.054, y: 0.729 },
      { x: 0.098, y: 0.771 }
    ],
    mesa: {
      poly: [
        { x: 0.513, y: 0.833 }, { x: 0.658, y: 0.718 }, { x: 0.674, y: 0.555 },
        { x: 0.465, y: 0.383 }, { x: 0.299, y: 0.5 }, { x: 0.324, y: 0.675 }
      ],
      escena: ESCENAS.GARITO,
      etiqueta: 'Saldar la deuda',
      juego: 'Saldar deuda',
      cartel: { x: 0.488, y: 0.55 }
    },
    salida: {
      poly: [
        { x: 0.814, y: 0.514 }, { x: 0.905, y: 0.603 },
        { x: 0.913, y: 0.185 }, { x: 0.82, y: 0.119 }
      ]
    },
    spawn: { x: 0.815, y: 0.578 },
    obstaculos: [
      [
        { x: 0.702, y: 0.899 }, { x: 0.701, y: 0.799 }, { x: 0.844, y: 0.686 },
        { x: 0.9, y: 0.744 }, { x: 0.909, y: 0.856 }, { x: 0.774, y: 0.965 }
      ],
      [
        { x: 0.31, y: 0.923 }, { x: 0.371, y: 0.876 }, { x: 0.372, y: 0.755 },
        { x: 0.29, y: 0.686 }, { x: 0.228, y: 0.738 }, { x: 0.228, y: 0.851 }
      ],
      [
        { x: 0.676, y: 0.565 }, { x: 0.708, y: 0.286 }, { x: 0.633, y: 0.234 },
        { x: 0.56, y: 0.45 }
      ]
    ]
  }
}

// Ray casting: ¿el punto (x,y) cae dentro del polígono? (vacío = false)
export function puntoEnPoligono(x, y, poly) {
  if (!poly || poly.length < 3) return false
  let dentro = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y
    const xj = poly[j].x, yj = poly[j].y
    const cruza = (yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
    if (cruza) dentro = !dentro
  }
  return dentro
}

// ¿(x,y) es caminable? Dentro del caminable (o de la salida, que es zona de paso)
// y fuera de los obstáculos. Si el caminable está vacío, se permite todo.
export function esCaminable(interior, x, y) {
  if (interior.obstaculos) {
    for (const o of interior.obstaculos) {
      if (puntoEnPoligono(x, y, o)) return false
    }
  }
  if (!interior.caminable || interior.caminable.length < 3) return true
  if (puntoEnPoligono(x, y, interior.caminable)) return true
  if (interior.salida && puntoEnPoligono(x, y, interior.salida.poly)) return true
  return false
}

// Centroide de un polígono.
export function centroide(poly) {
  let cx = 0, cy = 0
  for (const v of poly) { cx += v.x; cy += v.y }
  return { x: cx / poly.length, y: cy / poly.length }
}
