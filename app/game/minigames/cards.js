// Naipes de la pulpería: a cada uno le reparten una MANO FIJA de cartas tapadas
// (baraja española 1-12). Cada ronda el jugador elige a ciegas una carta de su mano
// y el pulpero juega una de la suya; gana la más alta. Es azar puro: elegir entre
// cartas tapadas no cambia las probabilidades, pero se siente como "azar elegido".
// Serie al mejor de N (primero en ganar la mayoría de las rondas posibles).

const CARTAS_MANO = 5

function nuevoMazo() {
  const mazo = []
  const palos = ['oro', 'copa', 'espada', 'basto']
  for (const palo of palos) {
    for (let n = 1; n <= 12; n++) {
      mazo.push({ palo, numero: n })
    }
  }
  return mazo
}

function sacarCarta(mazo) {
  const i = Math.floor(Math.random() * mazo.length)
  return mazo.splice(i, 1)[0]
}

// Reparte mano fija de 5 para el jugador y 5 para el pulpero (todas tapadas).
export function nuevaPartidaNaipes() {
  const mazo = nuevoMazo()
  const manoJugador = []
  const manoCroupier = []
  for (let i = 0; i < CARTAS_MANO; i++) {
    manoJugador.push(sacarCarta(mazo))
    manoCroupier.push(sacarCarta(mazo))
  }
  return {
    manoJugador, // cartas que le quedan al jugador (tapadas)
    manoCroupier,
    rondasJugador: 0,
    rondasCroupier: 0,
    empates: 0,
    terminada: false
  }
}

// Cuántas rondas hay que ganar para llevarse la serie (mayoría de CARTAS_MANO).
export const RONDAS_PARA_GANAR = Math.ceil(CARTAS_MANO / 2) // 3 de 5

// El pulpero juega UNA carta AL AZAR de su mano (no siempre la más alta).
// El jugador SÍ ve sus 5 cartas (todas cara arriba) y elige cuál jugar.
// Serie al mejor de 5 (quien gana 3 rondas primero).
export function jugarRonda(partida, indiceJugador) {
  const i = Math.max(0, Math.min(indiceJugador, partida.manoJugador.length - 1))
  const jugador = partida.manoJugador.splice(i, 1)[0]
  // Pulpero: carta random de su mano (no siempre la más alta).
  const idxCroupier = Math.floor(Math.random() * partida.manoCroupier.length)
  const croupier = partida.manoCroupier.splice(idxCroupier, 1)[0]

  let resultado
  if (jugador.numero > croupier.numero) {
    resultado = 'jugador'
    partida.rondasJugador++
  } else if (croupier.numero > jugador.numero) {
    resultado = 'croupier'
    partida.rondasCroupier++
  } else {
    resultado = 'empate'
    partida.empates++
  }

  // Termina si alguien ya aseguró la mayoría, o si se agotaron las manos.
  if (
    partida.rondasJugador >= RONDAS_PARA_GANAR ||
    partida.rondasCroupier >= RONDAS_PARA_GANAR ||
    partida.manoJugador.length === 0
  ) {
    partida.terminada = true
  }

  return { jugador, croupier, resultado }
}

// Gana la serie quien tenga más rondas al cerrar. Empate de serie = gana el pulpero.
export function ganoSerie(partida) {
  return partida.rondasJugador > partida.rondasCroupier
}

// Resultado de la serie en 3 estados: 'gano' | 'perdio' | 'empate'.
// Empate (mismas rondas c/u) devuelve la apuesta (ni ganás ni perdés).
export function resultadoSerie(partida) {
  if (partida.rondasJugador > partida.rondasCroupier) return 'gano'
  if (partida.rondasJugador < partida.rondasCroupier) return 'perdio'
  return 'empate'
}
