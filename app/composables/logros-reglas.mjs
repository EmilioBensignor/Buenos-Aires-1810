// Lógica pura de logros: sin Vue, sin localStorage, sin tiempo. Testeable con node.
// El "store" tiene la parte persistida (desbloqueados, contadores, sets) + estado de
// partida transitorio (rachaActual, tocoFondo). El consumidor (useLogros) decide qué persiste.
import { CATALOGO } from './logros-catalogo.mjs'

const APUESTA_MAX = 500   // 500¢ = $5
const PLATA_BOLSA_GORDA = 5000 // 5000¢ = $50
const PLATA_FONDO = 100   // 100¢ = $1
// NPCs hablables en el juego: 4 en la plaza (san-martin, belgrano, moreno, caido) +
// 6 en interiores, uno por edificio (pulpero, comerciante, guardia, feriante, campeona,
// mafioso) = 10. Ver app/game/npc/npcs.js. Si se agregan/sacan NPCs, ajustar este número.
const TOTAL_NPCS = 10

export function storeInicial() {
  return {
    desbloqueados: {},
    contadores: { ganadas: 0, perdidas: 0, jugadas: 0, picoPlata: 0, partidasGanadas: 0, partidasJugadas: 0 },
    sets: { jugados: [], ganados: [], npcs: [] },
    // transitorios (no se persisten): se reinician en partida nueva
    rachaActual: 0,
    tocoFondo: false
  }
}

// Marca un id como desbloqueado si no lo estaba. Empuja a `nuevos`.
function desbloquear(store, id, nuevos) {
  if (store.desbloqueados[id]) return
  store.desbloqueados[id] = true
  nuevos.push(id)
}

function agregarUnico(arr, valor) {
  if (!arr.includes(valor)) arr.push(valor)
}

// Tras desbloquear cualquier cosa, revisar el completista (los OTROS 19).
function chequearCompletista(store, nuevos) {
  if (store.desbloqueados.completista) return
  const totalSinCompletista = CATALOGO.length - 1 // 19
  const hechos = CATALOGO.filter(l => l.id !== 'completista' && store.desbloqueados[l.id]).length
  if (hechos >= totalSinCompletista) desbloquear(store, 'completista', nuevos)
}

export function procesarEvento(store, evento) {
  const nuevos = []
  const c = store.contadores
  const s = store.sets

  switch (evento.tipo) {
    case 'jugo': {
      c.jugadas++
      agregarUnico(s.jugados, evento.juego)
      if (s.jugados.length >= 5) desbloquear(store, 'timbero', nuevos)
      if (c.jugadas >= 100) desbloquear(store, 'patron', nuevos)
      break
    }
    case 'gano': {
      c.ganadas++
      store.rachaActual++
      desbloquear(store, 'primera_mano', nuevos)
      agregarUnico(s.ganados, evento.juego)
      if (s.ganados.length >= 5) desbloquear(store, 'las_sabe_todas', nuevos)
      if (c.ganadas >= 25) desbloquear(store, 'manos_calientes', nuevos)
      if (store.rachaActual >= 5) desbloquear(store, 'en_racha', nuevos)
      if (evento.apuesta === APUESTA_MAX) desbloquear(store, 'audaz', nuevos)
      break
    }
    case 'perdio': {
      c.perdidas++
      store.rachaActual = 0
      desbloquear(store, 'primer_tropiezo', nuevos)
      if (c.perdidas >= 25) desbloquear(store, 'curtido', nuevos)
      break
    }
    case 'hablo': {
      agregarUnico(s.npcs, evento.npcId)
      if (s.npcs.length >= TOTAL_NPCS) desbloquear(store, 'conocido', nuevos)
      break
    }
    case 'sapoX3': desbloquear(store, 'boca_sapo', nuevos); break
    case 'bingoDoble': desbloquear(store, 'linea_bingo', nuevos); break
    case 'dadosExacto7': desbloquear(store, 'siete_clavado', nuevos); break
    case 'cubiletesNivel':
      if (evento.nivel >= 3) desbloquear(store, 'segui_bolita', nuevos)
      break
    case 'saldo': {
      store.contadores.partidasGanadas++
      desbloquear(store, 'libre_deuda', nuevos)
      if (store.tocoFondo) desbloquear(store, 'de_rodillas', nuevos)
      if (evento.nivelSapo >= 5 && evento.nivelCubiletes >= 5) desbloquear(store, 'maestro_garito', nuevos)
      break
    }
  }

  if (nuevos.length) chequearCompletista(store, nuevos)
  return { store, nuevos }
}

// Reglas derivadas de observar el state global (plata, resultado).
export function procesarState(store, snapshot) {
  const nuevos = []
  const c = store.contadores

  if (snapshot.plata > c.picoPlata) c.picoPlata = snapshot.plata
  if (snapshot.plata >= PLATA_BOLSA_GORDA) desbloquear(store, 'bolsa_gorda', nuevos)
  if (snapshot.plata <= PLATA_FONDO) store.tocoFondo = true
  if (snapshot.resultado === 'derrota') desbloquear(store, 'sin_mango', nuevos)

  if (nuevos.length) chequearCompletista(store, nuevos)
  return { store, nuevos }
}

// Corta la racha y el flag de fondo (partida nueva). Conserva desbloqueados/contadores/sets.
// Cuenta la partida que se cierra como jugada (la de por vida).
export function reiniciarPartida(store) {
  store.contadores.partidasJugadas++
  store.rachaActual = 0
  store.tocoFondo = false
}
