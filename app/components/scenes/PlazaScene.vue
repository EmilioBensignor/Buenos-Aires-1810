<script setup>
import { onMounted, onUnmounted, ref, computed } from 'vue'
import { useGameConfig } from '~/composables/useGameConfig'
import { useGameLoop } from '~/composables/useGameLoop'
import { useInput } from '~/composables/useInput'
import { useSceneManager } from '~/composables/useSceneManager'
import { useGameState } from '~/composables/useGameState'
import { useAudio } from '~/composables/useAudio'
import { PlazaRenderer, ANCHO, ALTO } from '~/game/plaza/PlazaScene'
import { EDIFICIOS } from '~/game/plaza/buildings'
import NpcDialog from '~/components/ui/NpcDialog.vue'

const config = useGameConfig()
const { entrarA, scene, ir, ESCENAS } = useSceneManager()
const { state, chequearDerrota, marcarResultado } = useGameState()
const { arrancarPasos, pararPasos } = useAudio()

const canvasRef = ref(null)
let renderer = null

const loop = useGameLoop()
const input = useInput()

const editor = ref(false) // editor de zonas
const editorCaminable = ref(false)
const editorCaminos = ref(false)
const editorNpcs = ref(false)
const panelAbierto = ref(true) // panel del editor plegable
const copiado = ref(false)
let arrastrando = false

const npcCerca = ref(false) // hay un NPC al alcance (muestra prompt "E")
const dialogo = ref(null) // { nombre, texto } de la caja de diálogo abierta

const enCinematica = ref(false) // bloquea carteles/prompt durante la cinemática
const fadeCine = ref(false) // overlay negro al cerrar la cinemática

// Lugares para el editor de caminos: inicio + cada edificio con minijuego.
const lugares = [{ id: 'inicio', nombre: 'Inicio (spawn)' }, ...EDIFICIOS.filter((e) => e.escena).map((e) => ({ id: e.id, nombre: e.nombre }))]
const camOrigen = ref('inicio')
const camDestino = ref(null)

const enEditor = computed(() => editor.value || editorCaminable.value || editorCaminos.value || editorNpcs.value)

// Cartelitos de los edificios (siempre visibles, clic = caminar y entrar).
const carteles = ref([])

onMounted(async () => {
  const pendiente = scene.cinematicaPendiente

  // Sin cinemática pendiente: lógica normal de game over diferido.
  if (!pendiente) {
    chequearDerrota()
    // Si la derrota ya está marcada (acá o en un minijuego), corremos la cinemática
    // de derrota en vez de saltar directo a RESULTADO.
    if (state.resultado === 'derrota') {
      scene.cinematicaPendiente = 'derrota'
    }
  }

  renderer = new PlazaRenderer(canvasRef.value, config)

  if (scene.ultimoEdificio) {
    renderer.reaparecerEn(scene.ultimoEdificio)
  }

  renderer.onEntrar = (edif) => {
    entrarA(edif.escena, edif.id)
  }

  // El player llegó caminando a un NPC → abrir su diálogo.
  renderer.onHablar = (d) => {
    dialogo.value = d
  }

  carteles.value = renderer.carteles()

  loop.start((delta) => {
    renderer.update(delta, input.getVectorDireccion())
    renderer.draw()
    npcCerca.value = !!renderer.npcCerca
    // Pasos: loop mientras el player camina, se corta al frenar.
    if (renderer.caminando) arrancarPasos()
    else pararPasos()
    // Si te alejás del NPC con el diálogo abierto, se cierra (corta su SFX).
    if (dialogo.value && !npcCerca.value) dialogo.value = null
    // Refrescar posición de carteles mientras se editan.
    if (editor.value) carteles.value = renderer.carteles()
  })

  window.addEventListener('keydown', onKey)

  // Disparar la cinemática si quedó pendiente (por DEV, por saldar, o por derrota).
  const tipoCine = scene.cinematicaPendiente
  if (tipoCine) {
    scene.cinematicaPendiente = null
    enCinematica.value = true
    const gsap = (await import('gsap')).default
    renderer.iniciarCinematica(tipoCine, gsap, () => terminarCinematica(tipoCine))
  }
})

// Al terminar la cinemática: fade a negro y sellar el resultado → salta a RESULTADO.
function terminarCinematica(tipo) {
  fadeCine.value = true
  setTimeout(() => {
    marcarResultado(tipo)
    // Saltamos explícito a RESULTADO en ambos casos (no dependemos del watcher de
    // victoria: si resultado ya valía 'victoria' de una partida previa, no cambiaría
    // y el watcher no dispararía).
    ir(ESCENAS.RESULTADO)
  }, 500)
}

function clicCartel(id) {
  renderer.irYEntrar(id)
}

function setOrigen(id) {
  camOrigen.value = id
  if (camDestino.value === id) camDestino.value = null
  renderer.setPar(camOrigen.value, camDestino.value)
}

function setDestino(id) {
  camDestino.value = id === camDestino.value ? null : id
  renderer.setPar(camOrigen.value, camDestino.value)
}

onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  pararPasos() // que no queden sonando al salir de la plaza
  scene.modoEdicion = false
})

// Fuera de editores: E = hablar con NPC cercano.
// Toggles de editor: Shift+E zonas · Shift+M zona caminable · Shift+W caminos · Shift+N npcs.
function onKey(e) {
  if (!renderer) return
  if (enCinematica.value) return
  const k = e.key.toLowerCase()

  // Si el diálogo está abierto, cualquier tecla lo cierra.
  if (dialogo.value) { dialogo.value = null; return }

  // Hablar con NPC (solo en juego, sin editor).
  if (k === 'e' && !e.shiftKey && !enEditor.value) {
    const d = renderer.hablarConCerca()
    if (d) dialogo.value = d
    return
  }

  // Toggles de editor (requieren Shift para no chocar con E=hablar).
  if (k === 'e' && e.shiftKey) {
    renderer.toggleEditor()
  } else if (k === 'm' && e.shiftKey) {
    renderer.toggleEditorCaminable()
  } else if (k === 'w' && e.shiftKey) {
    renderer.toggleEditorCaminos()
  } else if (k === 'n' && e.shiftKey) {
    renderer.toggleEditorNpcs()
  } else {
    return
  }
  syncEditor()
}

function syncEditor() {
  editor.value = renderer.editor
  editorCaminable.value = renderer.editorCaminable
  editorCaminos.value = renderer.editorCaminos
  editorNpcs.value = renderer.editorNpcs
  scene.modoEdicion = renderer.enEditor
  if (renderer.enEditor) panelAbierto.value = true
  if (renderer.editorCaminos) renderer.setPar(camOrigen.value, camDestino.value)
}

function onClick(e) {
  if (enEditor.value || enCinematica.value) return
  const { x, y } = aCanvas(e)
  // Clic sobre un NPC cercano = hablarle; si no, navegación normal.
  const d = renderer.clickNpc(x, y)
  if (d) { dialogo.value = d; return }
  renderer.clickEn(x, y)
}

function onDown(e) {
  const { x, y } = aCanvas(e)
  if (editor.value) {
    arrastrando = renderer.empezarArrastre(x, y)
  } else if (editorCaminable.value) {
    arrastrando = renderer.caminableEmpezarArrastre(x, y)
  } else if (editorCaminos.value) {
    arrastrando = renderer.caminosEmpezar(x, y)
  } else if (editorNpcs.value) {
    arrastrando = renderer.npcsEmpezar(x, y)
  }
}

function onMove(e) {
  const { x, y } = aCanvas(e)
  if (editor.value) {
    if (arrastrando) renderer.arrastrar(x, y)
  } else if (editorCaminable.value) {
    if (arrastrando) renderer.caminableArrastrar(x, y)
  } else if (editorCaminos.value) {
    if (arrastrando) renderer.caminosArrastrar(x, y)
  } else if (editorNpcs.value) {
    if (arrastrando) renderer.npcsArrastrar(x, y)
  } else {
    renderer.moverMouse(x, y)
  }
}

function onUp() {
  arrastrando = false
  if (editor.value) renderer.terminarArrastre()
  else if (editorCaminable.value) renderer.caminableTerminarArrastre()
  else if (editorCaminos.value) renderer.caminosTerminar()
  else if (editorNpcs.value) renderer.npcsTerminar()
}

function onDblClick(e) {
  const { x, y } = aCanvas(e)
  if (editor.value) renderer.agregarVertice(x, y)
  else if (editorCaminable.value) renderer.caminableAgregar(x, y)
}

function onContext(e) {
  if (!enEditor.value) return
  e.preventDefault()
  const { x, y } = aCanvas(e)
  if (editor.value) renderer.borrarVertice(x, y)
  else if (editorCaminable.value) renderer.caminableBorrar(x, y)
  else if (editorCaminos.value) renderer.caminosBorrar(x, y)
}

async function copiar(datos, etiqueta) {
  const json = JSON.stringify(datos, null, 2)
  try {
    await navigator.clipboard.writeText(json)
    copiado.value = true
    setTimeout(() => (copiado.value = false), 1500)
  } catch {
    console.log(`${etiqueta}:\n${json}`)
  }
}

function aCanvas(e) {
  const rect = canvasRef.value.getBoundingClientRect()
  return {
    x: ((e.clientX - rect.left) / rect.width) * ANCHO,
    y: ((e.clientY - rect.top) / rect.height) * ALTO
  }
}
</script>

<template>
  <div class="w-full h-full relative">
    <canvas
      ref="canvasRef"
      :width="ANCHO"
      :height="ALTO"
      class="w-full h-full"
      :class="enEditor ? 'cursor-crosshair' : 'cursor-pointer'"
      @click="onClick"
      @mousedown="onDown"
      @mousemove="onMove"
      @mouseup="onUp"
      @mouseleave="onUp"
      @dblclick="onDblClick"
      @contextmenu="onContext"
    />

    <!-- Cartelitos de los edificios (siempre visibles, clic = entrar) -->
    <template v-if="!enEditor && !enCinematica">
      <button
        v-for="c in carteles"
        :key="c.id"
        class="absolute z-10 -translate-x-1/2 -translate-y-full flex items-center gap-2 rounded-lg font-display text-sm tracking-wide whitespace-nowrap backdrop-blur-sm transition-all duration-200 px-3 py-1.5"
        :class="c.disponible
          ? 'bg-noche/85 border border-farol/40 shadow-farol text-dorado hover:border-farol hover:text-light hover:scale-105 cursor-pointer'
          : 'bg-noche/70 border border-light/15 text-light/40 cursor-default'"
        :style="{ left: c.x * 100 + '%', top: c.y * 100 + '%' }"
        :disabled="!c.disponible"
        @click="c.disponible && clicCartel(c.id)"
      >
        <span class="w-1.5 h-1.5 rounded-full" :class="c.disponible ? 'bg-farol shadow-farol' : 'bg-light/30'" />
        {{ c.nombre }}
        <span v-if="!c.disponible" class="text-light/30 text-xs italic">· pronto</span>
      </button>
    </template>

    <!-- Prompt de interacción al estar cerca de un NPC -->
    <Transition name="prompt">
      <div
        v-if="npcCerca && !dialogo && !enEditor && !enCinematica"
        class="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-noche/90 border border-farol/50 rounded-xl shadow-farol font-display text-dorado tracking-wide backdrop-blur-sm px-5 py-2.5"
      >
        <span class="flex justify-center items-center w-6 h-6 bg-farol/20 border border-farol/60 rounded text-sm">E</span>
        Hablar
      </div>
    </Transition>

    <!-- Caja de diálogo del NPC -->
    <NpcDialog
      v-if="dialogo"
      :nombre="dialogo.nombre"
      :texto="dialogo.texto"
      @cerrar="dialogo = null"
    />

    <!-- Botón flotante para reabrir el panel cuando está plegado -->
    <button
      v-if="enEditor && !panelAbierto"
      class="w-11 h-11 flex justify-center items-center fixed top-4 right-4 z-30 bg-noche/95 border border-farol/40 rounded-full shadow-farol text-dorado hover:border-farol hover:scale-105 transition-all duration-200"
      title="Abrir editor"
      @click="panelAbierto = true"
    >
      <span class="font-display text-lg leading-none">⚙</span>
    </button>

    <!-- Panel de edición de la plaza (columna fija a la derecha, fuera del juego) -->
    <div
      v-if="enEditor && panelAbierto"
      class="w-[360px] h-screen flex flex-col gap-5 fixed top-0 right-0 z-30 bg-noche/95 border-l border-farol/30 backdrop-blur-sm p-6 overflow-y-auto"
    >
      <div class="flex justify-between items-start gap-2">
        <div class="flex flex-col gap-1">
          <h3 class="font-display text-dorado text-lg tracking-wide">Editor de la plaza</h3>
          <span class="font-cuerpo text-light/40 text-xs">⇧E zonas · ⇧M caminable · ⇧W caminos · ⇧N npcs</span>
        </div>
        <button
          class="w-8 h-8 flex justify-center items-center shrink-0 bg-noche/60 border border-light/20 rounded-lg text-light/60 hover:text-light hover:border-light/40 transition-colors"
          title="Plegar panel"
          @click="panelAbierto = false"
        >
          <span class="text-lg leading-none">›</span>
        </button>
      </div>

      <template v-if="editor">
        <span class="font-cuerpo text-farol/80 text-sm font-semibold">Zonas de edificio</span>
        <div class="flex flex-col gap-1.5 font-cuerpo text-light/50 text-xs leading-relaxed">
          <span><b class="text-light/70">Arrastrar</b>: vértice / puerta (verde) / cartel (azul)</span>
          <span><b class="text-light/70">Doble-clic</b>: agrega vértice</span>
          <span><b class="text-light/70">Clic derecho</b>: borra vértice</span>
        </div>
        <button class="bg-farol/15 hover:bg-farol/25 border border-farol/50 rounded-lg font-cuerpo text-dorado text-sm transition-colors px-4 py-2.5 mt-auto" @click="copiar(renderer.exportarZonas(), 'ZONAS')">
          {{ copiado ? '¡Copiado!' : 'Copiar zonas' }}
        </button>
      </template>

      <template v-else-if="editorCaminable">
        <span class="font-cuerpo text-ganancia/90 text-sm font-semibold">Zona caminable</span>
        <div class="flex flex-col gap-1.5 font-cuerpo text-light/50 text-xs leading-relaxed">
          <span><b class="text-light/70">Arrastrar</b>: mueve vértice</span>
          <span><b class="text-light/70">Doble-clic</b>: agrega vértice</span>
          <span><b class="text-light/70">Clic derecho</b>: borra vértice</span>
        </div>
        <button class="bg-ganancia/15 hover:bg-ganancia/25 border border-ganancia/50 rounded-lg font-cuerpo text-ganancia text-sm transition-colors px-4 py-2.5 mt-auto" @click="copiar(renderer.exportarCaminable(), 'ZONA_CAMINABLE')">
          {{ copiado ? '¡Copiado!' : 'Copiar zona' }}
        </button>
      </template>

      <template v-else-if="editorCaminos">
        <span class="font-cuerpo text-[#4da3ff] text-sm font-semibold">Caminos entre lugares</span>

        <!-- Origen -->
        <div class="flex flex-col gap-1.5">
          <span class="font-cuerpo text-ganancia/80 text-xs uppercase tracking-[0.2em]">Desde (origen)</span>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="l in lugares"
              :key="'o-' + l.id"
              class="rounded-md border font-cuerpo text-xs px-2.5 py-1 transition-colors"
              :class="camOrigen === l.id ? 'border-ganancia/70 text-ganancia bg-ganancia/10' : 'border-light/15 text-light/50 hover:text-light/80'"
              @click="setOrigen(l.id)"
            >{{ l.nombre }}</button>
          </div>
        </div>

        <!-- Destino -->
        <div class="flex flex-col gap-1.5">
          <span class="font-cuerpo text-perdida/80 text-xs uppercase tracking-[0.2em]">Hacia (destino)</span>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="l in lugares.filter(x => x.id !== camOrigen)"
              :key="'d-' + l.id"
              class="rounded-md border font-cuerpo text-xs px-2.5 py-1 transition-colors"
              :class="camDestino === l.id ? 'border-perdida/70 text-perdida bg-perdida/10' : 'border-light/15 text-light/50 hover:text-light/80'"
              @click="setDestino(l.id)"
            >{{ l.nombre }}</button>
          </div>
        </div>

        <div class="flex flex-col gap-1.5 font-cuerpo text-light/50 text-xs leading-relaxed">
          <span v-if="!camDestino" class="text-perdida/70">Elegí un destino para marcar el camino.</span>
          <template v-else>
            <span><b class="text-light/70">Clic</b>: agrega un nodo al camino</span>
            <span><b class="text-light/70">Arrastrar</b>: mueve nodo · <b class="text-light/70">Clic derecho</b>: borra</span>
            <span class="text-light/35 mt-1">El personaje irá origen → nodos → destino.</span>
          </template>
        </div>

        <button class="bg-[#4da3ff]/15 hover:bg-[#4da3ff]/25 border border-[#4da3ff]/50 rounded-lg font-cuerpo text-[#4da3ff] text-sm transition-colors px-4 py-2.5 mt-auto" @click="copiar(renderer.exportarCaminos(), 'CAMINOS')">
          {{ copiado ? '¡Copiado!' : 'Copiar caminos' }}
        </button>
      </template>

      <template v-else-if="editorNpcs">
        <span class="font-cuerpo text-[#4da3ff] text-sm font-semibold">Personajes (NPCs)</span>
        <div class="flex flex-col gap-1.5 font-cuerpo text-light/50 text-xs leading-relaxed">
          <span><b class="text-light/70">Arrastrar</b>: mueve el personaje</span>
          <span class="text-light/35 mt-1">Acomodá cada prócer y el ciudadano sobre el adoquinado.</span>
        </div>
        <button class="bg-[#4da3ff]/15 hover:bg-[#4da3ff]/25 border border-[#4da3ff]/50 rounded-lg font-cuerpo text-[#4da3ff] text-sm transition-colors px-4 py-2.5 mt-auto" @click="copiar(renderer.exportarNpcs(), 'NPCS_PLAZA')">
          {{ copiado ? '¡Copiado!' : 'Copiar NPCs' }}
        </button>
      </template>
    </div>

    <!-- Fade negro al cerrar la cinemática (antes de saltar a RESULTADO) -->
    <div
      class="absolute inset-0 z-40 bg-noche pointer-events-none transition-opacity duration-500"
      :class="fadeCine ? 'opacity-100' : 'opacity-0'"
    />
  </div>
</template>

<style scoped>
.prompt-enter-active,
.prompt-leave-active {
  transition: all 0.2s ease;
}
.prompt-enter-from,
.prompt-leave-to {
  opacity: 0;
  transform: translate(-50%, 8px);
}
</style>
