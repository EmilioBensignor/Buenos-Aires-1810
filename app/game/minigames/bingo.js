// Bingo de la Parroquia. Carrera contra 3 viejas: vos + 3 NPCs, cada uno con un
// cartón 5x5 (centro libre). Se cantan bolillas en orden; dos premios:
//   - LÍNEA: primer jugador en completar una fila/columna/diagonal → pago chico.
//   - BINGO: primer jugador en llenar el cartón entero → pago mayor.
// Tu velocidad marcando NO decide: gana quien la completa con la bolilla más
// temprana del bombo (azar puro). Marcar a mano es ritual de tensión.

// Las 12 líneas de un 5x5 (5 filas + 5 columnas + 2 diagonales), como celdas [r,c].
const LINEAS = (() => {
  const ls = []
  for (let r = 0; r < 5; r++) ls.push([...Array(5)].map((_, c) => [r, c]))
  for (let c = 0; c < 5; c++) ls.push([...Array(5)].map((_, r) => [r, c]))
  ls.push([[0, 0], [1, 1], [2, 2], [3, 3], [4, 4]])
  ls.push([[0, 4], [1, 3], [2, 2], [3, 1], [4, 0]])
  return ls
})()

// Genera un cartón 5x5 con centro libre, estilo bingo clásico: cada columna sortea
// de su propio rango. Con `total` repartido en 5 columnas (ej: total=50 → B 1-10,
// I 11-20, N 21-30, G 31-40, O 41-50). Cada columna aporta 5 números (la del centro,
// 4 + el casillero libre). Devuelve { grid (5x5, centro=null), numeros (los 24) }.
function nuevoCarton(total) {
  const porColumna = total / 5
  const grid = [[], [], [], [], []]
  const nums = []
  for (let c = 0; c < 5; c++) {
    // Rango de la columna: [c*porColumna+1 .. (c+1)*porColumna]
    const rango = []
    for (let n = c * porColumna + 1; n <= (c + 1) * porColumna; n++) rango.push(n)
    // Barajar y tomar 5 (o 4 en la columna del centro, que lleva el casillero libre).
    for (let i = rango.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[rango[i], rango[j]] = [rango[j], rango[i]]
    }
    let k = 0
    for (let r = 0; r < 5; r++) {
      if (r === 2 && c === 2) {
        grid[r][c] = null // centro libre
      } else {
        const v = rango[k++]
        grid[r][c] = v
        nums.push(v)
      }
    }
  }
  return { grid, numeros: nums }
}

// Bombo: todos los números 1..total barajados (orden en que se cantan).
function barajarBombo(total) {
  const pool = []
  for (let n = 1; n <= total; n++) pool.push(n)
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool
}

// Turno (índice 0-based en el bombo) en que un cartón completa su PRIMERA línea.
function turnoLinea(carton, posDe) {
  let mejor = Infinity
  for (const L of LINEAS) {
    let t = 0
    for (const [r, c] of L) {
      const v = carton.grid[r][c]
      if (v !== null) t = Math.max(t, posDe[v])
    }
    mejor = Math.min(mejor, t)
  }
  return mejor
}

// Turno en que un cartón se llena entero (bingo).
function turnoBingo(carton, posDe) {
  let t = 0
  for (const n of carton.numeros) t = Math.max(t, posDe[n])
  return t
}

// Genera la mano completa: tu cartón (jugadores[0]), los de las viejas, el bombo,
// y quién gana cada premio (resuelto de antemano por el orden del bombo).
// Devuelve:
//   jugadores: [{ esVos, nombre, carton }]
//   bombo: [n, ...]  (orden de canto)
//   ganadorLinea / ganadorBingo: índice del jugador, o -1 si empate múltiple sin vos
//   turnoLineaGanadora / turnoBingoGanador: índice en el bombo donde se resuelve
export function generarMano(config) {
  const total = config.BINGO.totalBombo
  const nombres = config.BINGO.viejas
  const cantViejas = nombres.length

  const jugadores = [{ esVos: true, nombre: 'Vos', carton: nuevoCarton(total) }]
  for (let i = 0; i < cantViejas; i++) {
    jugadores.push({ esVos: false, nombre: nombres[i], carton: nuevoCarton(total) })
  }

  const bombo = barajarBombo(total)
  const posDe = {}
  bombo.forEach((n, i) => (posDe[n] = i))

  const tL = jugadores.map((j) => turnoLinea(j.carton, posDe))
  const tB = jugadores.map((j) => turnoBingo(j.carton, posDe))

  const minL = Math.min(...tL)
  const minB = Math.min(...tB)
  // Ganador: el de menor turno. En empate se sortea entre los empatados (justo);
  // con cartones por columna los empates son frecuentes, así que un sesgo a "vos"
  // rompería el balance (EV se dispara). Sorteo neutro → cada jugador ~25%.
  const sorteoEmpate = (turnos, min) => {
    const empatados = []
    turnos.forEach((t, i) => t === min && empatados.push(i))
    return empatados[Math.floor(Math.random() * empatados.length)]
  }
  const ganadorLinea = sorteoEmpate(tL, minL)
  const ganadorBingo = sorteoEmpate(tB, minB)

  return {
    jugadores,
    bombo,
    total,
    ganadorLinea,
    ganadorBingo,
    turnoLineaGanadora: minL,
    turnoBingoGanador: minB
  }
}

// Cobro de la mano según quién ganó cada premio. Premios independientes: podés
// cobrar línea y bingo en la misma mano. Devuelve { multiplicador } total.
export function cobroMano(mano, config) {
  let mult = 0
  if (mano.ganadorLinea === 0) mult += config.BINGO.pagoLinea
  if (mano.ganadorBingo === 0) mult += config.BINGO.pagoBingo
  return { multiplicador: mult }
}

export { LINEAS }
