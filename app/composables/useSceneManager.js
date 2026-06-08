// FSM de escenas. Controla la pantalla actual y un fundido corto entre transiciones.
// Recuerda el último edificio (para reaparecer en la plaza) y el último interior
// (para volver del minijuego al interior en vez de a la plaza).

import { reactive, computed, watch } from 'vue'
import { useGameState } from './useGameState'

const FADE_MS = 200

export const ESCENAS = {
  BIENVENIDA: 'BIENVENIDA',
  PLAZA: 'PLAZA',
  INT_PULPERIA: 'INT_PULPERIA', // interior caminable de la pulpería (naipes)
  INT_CABILDO: 'INT_CABILDO', // interior caminable del cabildo (dados)
  INT_MERCADO: 'INT_MERCADO', // interior caminable del mercado (cubiletes)
  INT_FERIA: 'INT_FERIA', // interior caminable de la feria (sortija)
  INT_GARITO: 'INT_GARITO', // interior caminable del garito (saldar deuda)
  INT_IGLESIA: 'INT_IGLESIA', // interior caminable de la iglesia (bingo)
  BINGO: 'BINGO', // placeholder del bingo (sin armar)
  DADOS: 'DADOS',
  NAIPES: 'NAIPES',
  CUBILETES: 'CUBILETES',
  SORTIJA: 'SORTIJA',
  GARITO: 'GARITO',
  RESULTADO: 'RESULTADO'
}

// Escenas que son interiores caminables (mapea escena → id de interior).
export const INTERIOR_DE = {
  [ESCENAS.INT_PULPERIA]: 'pulperia',
  [ESCENAS.INT_CABILDO]: 'cabildo',
  [ESCENAS.INT_MERCADO]: 'mercado',
  [ESCENAS.INT_FERIA]: 'feria',
  [ESCENAS.INT_GARITO]: 'garito',
  [ESCENAS.INT_IGLESIA]: 'iglesia'
}

// Escenas donde el jugador puede "volver a la plaza" desde la barra superior.
const ESCENAS_CON_VOLVER = new Set([
  ESCENAS.INT_PULPERIA,
  ESCENAS.INT_CABILDO,
  ESCENAS.INT_MERCADO,
  ESCENAS.INT_FERIA,
  ESCENAS.INT_GARITO,
  ESCENAS.INT_IGLESIA,
  ESCENAS.BINGO,
  ESCENAS.DADOS,
  ESCENAS.NAIPES,
  ESCENAS.CUBILETES,
  ESCENAS.SORTIJA,
  ESCENAS.GARITO
])

const scene = reactive({
  actual: ESCENAS.BIENVENIDA,
  transicionando: false,
  ultimoEdificio: null, // para reaparecer en la plaza afuera de su puerta
  ultimoInterior: null, // para volver del minijuego al interior
  modoEdicion: false, // editor de mapeo activo: el juego se alinea a la izquierda
  cinematicaPendiente: null // 'derrota' | 'victoria' | null: la plaza la corre antes de RESULTADO (transitorio, no se persiste)
})

const escenaActual = computed(() => scene.actual)
const enTransicion = computed(() => scene.transicionando)
const puedeVolver = computed(() => ESCENAS_CON_VOLVER.has(scene.actual))
const esInterior = computed(() => INTERIOR_DE[scene.actual] != null)
const modoEdicion = computed(() => scene.modoEdicion)

// Victoria → salta a RESULTADO al instante. Derrota NO: te quedás en $0 donde estés
// (interior/minijuego) y el game over se dispara recién al pisar la plaza
// (PlazaScene.onMounted llama chequearDerrota). A futuro: mejora narrativa (mafioso esperando).
const { state: gameState } = useGameState()
watch(
  () => gameState.resultado,
  (res) => {
    if (res === 'victoria') {
      scene.actual = ESCENAS.RESULTADO
      scene.transicionando = false
      scene.ultimoInterior = null
    }
  }
)

function ir(escena) {
  scene.actual = escena
}

async function transicionarA(escena) {
  scene.transicionando = true
  await esperar(FADE_MS)
  scene.actual = escena
  scene.transicionando = false
}

// Entrar a un edificio desde la plaza.
async function entrarA(escena, idEdificio = null) {
  scene.ultimoEdificio = idEdificio
  if (INTERIOR_DE[escena]) scene.ultimoInterior = escena
  await transicionarA(escena)
}

// Desde la mesa de un interior, ir al minijuego (recordando de qué interior vino).
async function irAJuego(escena) {
  if (INTERIOR_DE[scene.actual]) scene.ultimoInterior = scene.actual
  await transicionarA(escena)
}

// Volver: del minijuego al interior si vino de uno; si no, a la plaza.
async function volver() {
  if (scene.ultimoInterior && !INTERIOR_DE[scene.actual]) {
    await transicionarA(scene.ultimoInterior)
  } else {
    await transicionarA(ESCENAS.PLAZA)
  }
}

// Volver siempre a la plaza (desde un interior, o atajo de la barra).
async function volverAPlaza() {
  scene.ultimoInterior = null
  await transicionarA(ESCENAS.PLAZA)
}

// Teleporta a la plaza marcando una cinemática para que la corra al montar.
// Usado por los botones DEV del garito y por saldar la deuda de verdad.
async function irAPlazaConCinematica(tipo) {
  scene.cinematicaPendiente = tipo
  scene.ultimoInterior = null
  scene.ultimoEdificio = null
  await transicionarA(ESCENAS.PLAZA)
}

function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export const useSceneManager = () => ({
  scene,
  ESCENAS,
  INTERIOR_DE,
  escenaActual,
  enTransicion,
  puedeVolver,
  esInterior,
  modoEdicion,
  ir,
  entrarA,
  irAJuego,
  volver,
  volverAPlaza,
  irAPlazaConCinematica
})
