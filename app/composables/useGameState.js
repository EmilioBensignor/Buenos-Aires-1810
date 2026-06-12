// Estado global del juego. Singleton reactivo a nivel módulo (client-only).
// Plata y deuda en centavos. Regla de derrota: plata en 0 = game over.
// Persiste en localStorage.

import { reactive, computed, watch } from 'vue'
import { useGameConfig, deudaEnCentavos } from './useGameConfig'

const config = useGameConfig()
// v2: la moneda pasó de reales a centavos; los saves viejos ya no aplican.
const LS_KEY = 'plaza1810_state_v2'

function loadState() {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveState(s) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({
      plata: s.plata,
      deuda: s.deuda,
      edificioVisitado: s.edificioVisitado,
      resultado: s.resultado,
      nivel: s.nivel
    }))
  } catch {}
}

const saved = loadState()

const state = reactive({
  plata: saved?.plata ?? config.PLATA_INICIAL,
  deuda: saved?.deuda ?? deudaEnCentavos(),
  edificioVisitado: saved?.edificioVisitado ?? {},
  resultado: saved?.resultado ?? null,
  // Nivel de dificultad por juego de habilidad: sube al ganar, se reinicia al perder.
  nivel: saved?.nivel ?? { sapo: 0, cubiletes: 0 },
  ultimoDelta: 0
})

const NIVEL_MAX = 10

// Bus de eventos del juego: useLogros (u otros) se suscriben con onEvento.
// useGameState solo emite; no conoce a sus consumidores.
const listeners = new Set()

function registrarEvento(tipo, datos = {}) {
  for (const fn of listeners) {
    try { fn({ tipo, ...datos }) } catch {}
  }
}

function onEvento(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

// Callbacks que corren al empezar partida nueva (reiniciar). useLogros corta su racha acá.
const onReiniciarCbs = new Set()
function onReiniciarPartida(fn) {
  onReiniciarCbs.add(fn)
  return () => onReiniciarCbs.delete(fn)
}

// Sube un nivel de dificultad (con tope). Llamar al ganar.
function subirNivel(juego) {
  if (state.nivel[juego] == null) return
  state.nivel[juego] = Math.min(NIVEL_MAX, state.nivel[juego] + 1)
}

// Reinicia la dificultad a fácil. Llamar al perder.
function reiniciarNivel(juego) {
  if (state.nivel[juego] == null) return
  state.nivel[juego] = 0
}

watch(() => ({ ...state }), (s) => saveState(s), { deep: true })

const puedeleSaldar = computed(() => state.plata >= state.deuda)
const sinPlata = computed(() => state.plata <= 0)

// Resta una apuesta. Devuelve true si pudo pagarla.
// OJO: no chequea derrota acá — un all-in te deja en $0 ANTES de jugar. La
// derrota se evalúa al terminar la jugada (resolverJugada), cuando ya se sabe
// si ganaste o perdiste.
function apostar(monto) {
  if (monto > state.plata) return false
  // All-in heroico: apostaste TODO lo que tenías, teniendo $3 o menos. El logro lo
  // resuelve el próximo gano (el bus marca un flag transitorio en useLogros).
  if (monto === state.plata && state.plata <= 300) registrarEvento('apostoAllIn', {})
  state.plata -= monto
  state.ultimoDelta = -monto
  return true
}

// Acredita la ganancia de una jugada (0 si perdiste) y recién ahí evalúa derrota.
function cobrar(monto) {
  const g = Math.round(monto)
  state.plata += g
  state.ultimoDelta = g
  chequearDerrota()
}

function perder(monto) {
  state.plata = Math.max(0, state.plata - monto)
  state.ultimoDelta = -monto
  chequearDerrota()
}

// Descuenta la deuda. NO marca victoria acá: la cinemática de victoria la marca al
// terminar (vía marcarResultado). El disparo de la cinemática lo hace GaritoScene.
function saldarDeuda() {
  if (!puedeleSaldar.value) return false
  state.plata -= state.deuda
  return true
}

function chequearDerrota() {
  if (state.plata <= 0 && state.resultado === null) {
    state.plata = 0
    state.resultado = 'derrota'
  }
}

// Sella el final (lo llama la cinemática al terminar). El watcher del FSM / el
// onMounted de la plaza reaccionan a state.resultado para ir a la pantalla RESULTADO.
function marcarResultado(tipo) {
  state.resultado = tipo
}

function reiniciar() {
  state.plata = config.PLATA_INICIAL
  state.resultado = null
  state.edificioVisitado = {}
  state.nivel = { sapo: 0, cubiletes: 0 }
  state.ultimoDelta = 0
  for (const fn of onReiniciarCbs) { try { fn() } catch {} }
}

export const useGameState = () => ({
  state,
  puedeleSaldar,
  sinPlata,
  apostar,
  cobrar,
  perder,
  subirNivel,
  reiniciarNivel,
  saldarDeuda,
  marcarResultado,
  chequearDerrota,
  reiniciar,
  registrarEvento,
  onEvento,
  onReiniciarPartida
})
