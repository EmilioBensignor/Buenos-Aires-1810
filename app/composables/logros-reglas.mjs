// Lógica pura de logros: sin Vue, sin localStorage, sin tiempo. Testeable con node.
// El "store" tiene la parte persistida (desbloqueados, contadores, sets) + estado de
// partida transitorio (rachaActual, tocoFondo). El consumidor (useLogros) decide qué persiste.
import { CATALOGO } from './logros-catalogo.mjs'

const APUESTA_MAX = 500   // 500¢ = $5
const PLATA_BOLSA_GORDA = 5000 // 5000¢ = $50
const PLATA_FONDO = 100   // 100¢ = $1
// Tanda 2
const PLATA_FORRADO = 50000      // 50000¢ = $500
const PLATA_PICO_FUNDIDO = 5000  // 5000¢ = $50 (pico de partida para "Lo perdió todo")
const ALL_IN_TECHO = 300         // 300¢ = $3 (all-in heroico solo si tenías ≤ esto)
// NPCs hablables en el juego: 4 en la plaza (san-martin, belgrano, moreno, caido) +
// 6 en interiores, uno por edificio (pulpero, comerciante, guardia, feriante, campeona,
// mafioso) = 10. Ver app/game/npc/npcs.js. Si se agregan/sacan NPCs, ajustar este número.
const TOTAL_NPCS = 10

export function storeInicial() {
  return {
    desbloqueados: {},
    contadores: {
      ganadas: 0, perdidas: 0, jugadas: 0, picoPlata: 0, partidasGanadas: 0, partidasJugadas: 0,
      // Tanda 2: contadores de por vida
      dadosExacto7: 0,        // Exacto 7 acertados (acumulado)
      sapoX3Racha: 0          // x3 del sapo consecutivos (se corta al jugar sapo sin x3)
    },
    sets: { jugados: [], ganados: [], npcs: [] },
    // transitorios (no se persisten): se reinician en partida nueva
    rachaActual: 0,
    tocoFondo: false,
    picoPlataPartida: 0,      // pico de plata de la partida en curso (para "Lo perdió todo")
    ultimoAllIn: false        // el último apostar() fue all-in heroico (consumido por el próximo gano)
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

// Tras desbloquear cualquier cosa, revisar el completista (TODOS los OTROS).
// Re-bloqueable: si al agregar logros nuevos faltan algunos, el completista se des-marca
// (un jugador que ya lo tenía debe volver a completar la colección ampliada).
function chequearCompletista(store, nuevos) {
  const totalSinCompletista = CATALOGO.length - 1
  const hechos = CATALOGO.filter(l => l.id !== 'completista' && store.desbloqueados[l.id]).length
  const completo = hechos >= totalSinCompletista
  if (completo) {
    desbloquear(store, 'completista', nuevos)
  } else if (store.desbloqueados.completista) {
    delete store.desbloqueados.completista
  }
}

// Revisa el completista sin un evento gatillo (al cargar el juego). Sirve para
// re-bloquearlo cuando el catálogo creció: un save viejo con completista=true pero
// sin los logros nuevos lo pierde hasta volver a completar. Devuelve true si cambió.
export function sincronizarCompletista(store) {
  const teniaCompletista = !!store.desbloqueados.completista
  const nuevos = []
  chequearCompletista(store, nuevos)
  return teniaCompletista !== !!store.desbloqueados.completista
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
      if (c.jugadas >= 150) desbloquear(store, 'tahur_bronce', nuevos)
      if (c.jugadas >= 300) desbloquear(store, 'tahur_plata', nuevos)
      if (c.jugadas >= 500) desbloquear(store, 'tahur_oro', nuevos)
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
      if (store.rachaActual >= 10) desbloquear(store, 'racha_larga', nuevos)
      if (evento.apuesta === APUESTA_MAX) desbloquear(store, 'audaz', nuevos)
      // All-in heroico: el apostar() previo marcó la condición; este gano la consume.
      if (store.ultimoAllIn) desbloquear(store, 'all_in_heroico', nuevos)
      store.ultimoAllIn = false
      // Racha de x3 del sapo (única fuente de verdad: el gano lleva si fue x3).
      if (evento.juego === 'sapo') {
        if (evento.x3) {
          c.sapoX3Racha++
          if (c.sapoX3Racha >= 5) desbloquear(store, 'sapo_serial', nuevos)
        } else {
          c.sapoX3Racha = 0 // ganaste el sapo pero no en la boca → se corta
        }
      }
      // Naipes 3-0 sin perder ronda.
      if (evento.juego === 'naipes' && evento.perfecto) desbloquear(store, 'naipes_perfecto', nuevos)
      break
    }
    case 'perdio': {
      c.perdidas++
      store.rachaActual = 0
      store.ultimoAllIn = false
      desbloquear(store, 'primer_tropiezo', nuevos)
      if (c.perdidas >= 25) desbloquear(store, 'curtido', nuevos)
      // Perder en el sapo corta la racha de x3 (jugaste el sapo y no lo embocaste).
      if (evento.juego === 'sapo') c.sapoX3Racha = 0
      break
    }
    case 'hablo': {
      agregarUnico(s.npcs, evento.npcId)
      if (s.npcs.length >= TOTAL_NPCS) desbloquear(store, 'conocido', nuevos)
      break
    }
    case 'sapoX3': desbloquear(store, 'boca_sapo', nuevos); break
    case 'bingoDoble': desbloquear(store, 'linea_bingo', nuevos); break
    case 'dadosExacto7':
      desbloquear(store, 'siete_clavado', nuevos)
      c.dadosExacto7++
      if (c.dadosExacto7 >= 10) desbloquear(store, 'dados_serial', nuevos)
      break
    case 'cubiletesNivel':
      if (evento.nivel >= 3) desbloquear(store, 'segui_bolita', nuevos)
      break
    case 'saldo': {
      store.contadores.partidasGanadas++
      desbloquear(store, 'libre_deuda', nuevos)
      if (store.tocoFondo) desbloquear(store, 'de_rodillas', nuevos)
      if (evento.nivelSapo >= 5 && evento.nivelCubiletes >= 5) desbloquear(store, 'maestro_garito', nuevos)
      if (evento.nivelSapo >= 8 && evento.nivelCubiletes >= 8) desbloquear(store, 'gran_maestro', nuevos)
      break
    }
    // El último apostar() fue un all-in heroico (≤ $3 y apostaste todo). Lo consume el próximo gano.
    case 'apostoAllIn': store.ultimoAllIn = true; break
  }

  if (nuevos.length) chequearCompletista(store, nuevos)
  return { store, nuevos }
}

// Reglas derivadas de observar el state global (plata, resultado).
export function procesarState(store, snapshot) {
  const nuevos = []
  const c = store.contadores

  if (snapshot.plata > c.picoPlata) c.picoPlata = snapshot.plata
  if (snapshot.plata > store.picoPlataPartida) store.picoPlataPartida = snapshot.plata
  if (snapshot.plata >= PLATA_BOLSA_GORDA) desbloquear(store, 'bolsa_gorda', nuevos)
  if (snapshot.plata >= PLATA_FORRADO) desbloquear(store, 'forrado', nuevos)
  if (snapshot.plata <= PLATA_FONDO) store.tocoFondo = true
  if (snapshot.resultado === 'derrota') {
    desbloquear(store, 'sin_mango', nuevos)
    // Lo perdió todo: cayó habiendo tenido $50+ en esta partida.
    if (store.picoPlataPartida >= PLATA_PICO_FUNDIDO) desbloquear(store, 'fundido_grande', nuevos)
  }

  if (nuevos.length) chequearCompletista(store, nuevos)
  return { store, nuevos }
}

// Corta la racha y el flag de fondo (partida nueva). Conserva desbloqueados/contadores/sets.
// Cuenta la partida que se cierra como jugada (la de por vida).
export function reiniciarPartida(store) {
  store.contadores.partidasJugadas++
  store.rachaActual = 0
  store.tocoFondo = false
  store.picoPlataPartida = 0
  store.ultimoAllIn = false
}
