// Sistema de logros. Singleton reactivo (como useGameState). Escucha el bus de eventos
// y observa el state para desbloquear logros, persiste en localStorage, encola toasts.
import { reactive, computed, watch } from 'vue'
import { CATALOGO } from './logros-catalogo.mjs'
import { storeInicial, procesarEvento, procesarState, reiniciarPartida } from './logros-reglas.mjs'
import { useGameState } from './useGameState'

const LS_KEY = 'plaza1810_logros_v1'

function load() {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function persistir() {
  if (typeof window === 'undefined') return
  try {
    // Solo la parte persistente (no racha/tocoFondo, que son de partida).
    localStorage.setItem(LS_KEY, JSON.stringify({
      desbloqueados: store.desbloqueados,
      contadores: store.contadores,
      sets: store.sets
    }))
  } catch {}
}

// store reactivo: arranca del default + lo guardado (si hay).
const guardado = load()
const base = storeInicial()
const store = reactive({
  ...base,
  desbloqueados: guardado?.desbloqueados ?? base.desbloqueados,
  contadores: { ...base.contadores, ...(guardado?.contadores ?? {}) },
  sets: {
    jugados: guardado?.sets?.jugados ?? [],
    ganados: guardado?.sets?.ganados ?? [],
    npcs: guardado?.sets?.npcs ?? []
  }
})

// Cola de toasts: ids pendientes de mostrar.
const colaToasts = reactive([])

function encolar(ids) {
  for (const id of ids) colaToasts.push(id)
}

let iniciado = false
function iniciar() {
  if (iniciado || typeof window === 'undefined') return
  iniciado = true
  const { onEvento, onReiniciarPartida, state } = useGameState()

  // Eventos del juego.
  onEvento((evento) => {
    const { nuevos } = procesarEvento(store, evento)
    if (nuevos.length) { encolar(nuevos); persistir() }
  })

  // Observar state (plata, resultado) para los logros derivados.
  watch(
    () => ({ plata: state.plata, resultado: state.resultado }),
    (snap) => {
      const { nuevos } = procesarState(store, snap)
      if (nuevos.length) { encolar(nuevos); persistir() }
    },
    { immediate: true }
  )

  // Partida nueva: cortar racha y flag de fondo (no toca logros/contadores).
  onReiniciarPartida(() => reiniciarPartida(store))
}

const progreso = computed(() => ({
  hechos: CATALOGO.filter(l => store.desbloqueados[l.id]).length,
  total: CATALOGO.length
}))

const toastActual = computed(() => {
  const id = colaToasts[0]
  if (!id) return null
  return CATALOGO.find(l => l.id === id) ?? null
})

function descartarToast() {
  colaToasts.shift()
}

export const useLogros = () => {
  iniciar()
  return {
    catalogo: CATALOGO,
    desbloqueados: store.desbloqueados,
    progreso,
    toastActual,
    descartarToast
  }
}
