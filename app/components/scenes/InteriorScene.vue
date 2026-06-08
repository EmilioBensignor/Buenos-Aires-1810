<script setup>
// Interior caminable genérico. Lee qué interior mostrar según la escena actual,
// instancia el renderer, y conecta caminar + interacción (mesa/salida) con la FSM.
import { onMounted, onUnmounted, ref } from 'vue'
import { useGameLoop } from '~/composables/useGameLoop'
import { useInput } from '~/composables/useInput'
import { useSceneManager, INTERIOR_DE } from '~/composables/useSceneManager'
import { INTERIORES } from '~/game/interiors/interiors'
import { InteriorRenderer, ANCHO, ALTO } from '~/game/interiors/InteriorScene'
import NpcDialog from '~/components/ui/NpcDialog.vue'

const { scene, escenaActual, irAJuego, volverAPlaza } = useSceneManager()

const canvasRef = ref(null)
let renderer = null

const loop = useGameLoop()
const input = useInput()

const editor = ref(false)
const panelAbierto = ref(true) // panel del editor plegable
const copiado = ref(false)
const cercaMesa = ref(false)
const etiquetaMesa = ref('')
const escalaActual = ref(1)
const elementoActivo = ref('caminable')
const cartelMesa = ref(null) // { x, y, texto } del cartel sobre la mesa
const npcCerca = ref(false) // hay un NPC al alcance (muestra prompt "E")
const dialogo = ref(null) // { nombre, texto } de la caja abierta
let arrastrando = false

const ELEM_TECLA = { 1: 'caminable', 2: 'mesa', 3: 'salida', 4: 'spawn', 5: 'obstaculo', 6: 'cartel', 7: 'npc' }

onMounted(() => {
  const id = INTERIOR_DE[escenaActual.value]
  const interior = INTERIORES[id]
  etiquetaMesa.value = interior.mesa.etiqueta || 'Jugar'

  renderer = new InteriorRenderer(canvasRef.value, interior)
  renderer.onJugar = (escena) => irAJuego(escena)
  renderer.onSalir = () => volverAPlaza()

  escalaActual.value = interior.escalaJugador || 1
  cartelMesa.value = renderer.cartelMesa()

  loop.start((delta) => {
    renderer.update(delta, input.getVectorDireccion())
    renderer.draw()
    cercaMesa.value = renderer.cercaMesa
    npcCerca.value = !!renderer.npcCerca
    // Si te alejás del NPC con el diálogo abierto, se cierra (corta su SFX).
    if (dialogo.value && !npcCerca.value) dialogo.value = null
    if (editor.value) {
      escalaActual.value = renderer.interior.escalaJugador || 1
      cartelMesa.value = renderer.cartelMesa()
    }
  })

  window.addEventListener('keydown', onKey)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  scene.modoEdicion = false
})

function onKey(e) {
  if (!renderer) return
  const k = e.key.toLowerCase()

  // Si el diálogo está abierto, cualquier tecla lo cierra.
  if (dialogo.value) { dialogo.value = null; return }

  if (k === 'e' && e.shiftKey) {
    renderer.toggleEditor()
    editor.value = renderer.editor
    scene.modoEdicion = renderer.editor
    if (renderer.editor) panelAbierto.value = true
  } else if (k === 'e') {
    // interactuar() prioriza hablar con NPC cercano (devuelve {nombre,texto}).
    const d = renderer.interactuar()
    if (d) dialogo.value = d
  } else if (editor.value && ELEM_TECLA[e.key]) {
    renderer.setElemento(ELEM_TECLA[e.key])
    elementoActivo.value = renderer.elementoActivo
  } else if (editor.value && k === 'n') {
    renderer.nuevoObstaculo()
  } else if (editor.value && (e.key === '+' || e.key === '=')) {
    renderer.ajustarEscala(0.1)
  } else if (editor.value && (e.key === '-' || e.key === '_')) {
    renderer.ajustarEscala(-0.1)
  }
}

function setElem(elem) {
  renderer.setElemento(elem)
  elementoActivo.value = renderer.elementoActivo
}

function onClick(e) {
  if (editor.value) return
  const { x, y } = aCanvas(e)
  // Clic sobre un NPC cercano = hablarle; si no, caminar.
  const d = renderer.clickNpc(x, y)
  if (d) { dialogo.value = d; return }
  renderer.clickEn(x, y)
}

function onDown(e) {
  if (!editor.value) return
  const { x, y } = aCanvas(e)
  arrastrando = renderer.empezarArrastre(x, y)
}

function onMove(e) {
  if (!editor.value || !arrastrando) return
  const { x, y } = aCanvas(e)
  renderer.arrastrar(x, y)
}

function onUp() {
  if (!editor.value) return
  arrastrando = false
  renderer.terminarArrastre()
}

function onDblClick(e) {
  if (!editor.value) return
  const { x, y } = aCanvas(e)
  renderer.agregar(x, y)
}

function onContext(e) {
  if (!editor.value) return
  e.preventDefault()
  const { x, y } = aCanvas(e)
  renderer.borrar(x, y)
}

async function copiar() {
  const json = JSON.stringify(renderer.exportar(), null, 2)
  try {
    await navigator.clipboard.writeText(json)
    copiado.value = true
    setTimeout(() => (copiado.value = false), 1500)
  } catch {
    console.log(`INTERIOR:\n${json}`)
  }
}

const copiadoCartel = ref(false)
async function copiarCartel() {
  const json = JSON.stringify(renderer.exportarCartel())
  try {
    await navigator.clipboard.writeText(json)
    copiadoCartel.value = true
    setTimeout(() => (copiadoCartel.value = false), 1500)
  } catch {
    console.log(`CARTEL:\n${json}`)
  }
}

const copiadoNpcs = ref(false)
async function copiarNpcs() {
  const json = JSON.stringify(renderer.exportarNpcs(), null, 2)
  try {
    await navigator.clipboard.writeText(json)
    copiadoNpcs.value = true
    setTimeout(() => (copiadoNpcs.value = false), 1500)
  } catch {
    console.log(`NPCS:\n${json}`)
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
      :class="editor ? 'cursor-crosshair' : 'cursor-pointer'"
      @click="onClick"
      @mousedown="onDown"
      @mousemove="onMove"
      @mouseup="onUp"
      @mouseleave="onUp"
      @dblclick="onDblClick"
      @contextmenu="onContext"
    />

    <!-- Cartel de la mesa (botón): clic = caminar a la mesa y jugar -->
    <button
      v-if="cartelMesa && !editor"
      class="absolute z-10 -translate-x-1/2 -translate-y-full flex items-center gap-2 bg-noche/85 border border-farol/40 rounded-lg shadow-farol font-display text-dorado text-sm tracking-wide whitespace-nowrap backdrop-blur-sm hover:border-farol hover:text-light hover:scale-105 transition-all duration-200 cursor-pointer px-3 py-1.5"
      :style="{ left: cartelMesa.x * 100 + '%', top: cartelMesa.y * 100 + '%' }"
      @click="renderer.irAMesa()"
    >
      <span class="w-1.5 h-1.5 rounded-full bg-farol shadow-farol" />
      {{ cartelMesa.texto }}
    </button>

    <!-- Prompt de interacción: hablar con NPC tiene prioridad sobre la mesa -->
    <Transition name="prompt">
      <div
        v-if="(npcCerca || cercaMesa) && !dialogo && !editor"
        class="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-noche/90 border border-farol/50 rounded-xl shadow-farol font-display text-dorado tracking-wide backdrop-blur-sm px-5 py-2.5"
      >
        <span class="flex justify-center items-center w-6 h-6 bg-farol/20 border border-farol/60 rounded text-sm">E</span>
        {{ npcCerca ? 'Hablar' : etiquetaMesa }}
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
      v-if="editor && !panelAbierto"
      class="w-11 h-11 flex justify-center items-center fixed top-4 right-4 z-30 bg-noche/95 border border-farol/40 rounded-full shadow-farol text-dorado hover:border-farol hover:scale-105 transition-all duration-200"
      title="Abrir editor"
      @click="panelAbierto = true"
    >
      <span class="font-display text-lg leading-none">⚙</span>
    </button>

    <!-- Panel del editor (Shift+E): columna fija a la derecha, fuera del juego -->
    <div
      v-if="editor && panelAbierto"
      class="w-[360px] h-screen flex flex-col gap-5 fixed top-0 right-0 z-30 bg-noche/95 border-l border-farol/30 backdrop-blur-sm p-6 overflow-y-auto"
    >
      <div class="flex justify-between items-start gap-2">
        <div class="flex flex-col gap-1">
          <h3 class="font-display text-dorado text-lg tracking-wide">Editor de interior</h3>
          <span class="font-cuerpo text-light/40 text-xs">Shift+E para salir</span>
        </div>
        <button
          class="w-8 h-8 flex justify-center items-center shrink-0 bg-noche/60 border border-light/20 rounded-lg text-light/60 hover:text-light hover:border-light/40 transition-colors"
          title="Plegar panel"
          @click="panelAbierto = false"
        >
          <span class="text-lg leading-none">›</span>
        </button>
      </div>

      <!-- Selector de elemento -->
      <div class="flex flex-col gap-2">
        <span class="font-cuerpo text-dorado/60 text-xs uppercase tracking-[0.2em]">Qué estás editando</span>
        <button
          v-for="(elem, tecla) in ELEM_TECLA"
          :key="tecla"
          class="flex items-center gap-2.5 rounded-lg border font-cuerpo text-sm transition-colors duration-150 px-3 py-2"
          :class="elementoActivo === elem
            ? 'border-light/60 text-light bg-light/10'
            : 'border-light/15 text-light/50 hover:text-light/80 hover:border-light/30'"
          @click="setElem(elem)"
        >
          <span class="flex justify-center items-center w-5 h-5 rounded bg-noche/60 text-xs font-mono">{{ tecla }}</span>
          <span class="w-3 h-3 rounded-full" :class="{
            'bg-ganancia': elem === 'caminable', 'bg-farol': elem === 'mesa',
            'bg-perdida': elem === 'salida', 'bg-[#4da3ff]': elem === 'spawn' || elem === 'npc',
            'bg-[#b48cff]': elem === 'obstaculo', 'bg-[#ffd27a]': elem === 'cartel'
          }" />
          {{ elem }}
        </button>
      </div>

      <!-- Escala -->
      <div class="flex flex-col gap-2">
        <span class="font-cuerpo text-dorado/60 text-xs uppercase tracking-[0.2em]">Escala del personaje</span>
        <div class="flex items-center gap-3">
          <button class="w-9 h-9 flex justify-center items-center bg-noche/60 border border-light/20 rounded-lg text-light/70 hover:text-light hover:border-light/40 transition-colors" @click="renderer.ajustarEscala(-0.1)">−</button>
          <span class="font-display text-dorado text-lg w-12 text-center">{{ escalaActual.toFixed(2) }}</span>
          <button class="w-9 h-9 flex justify-center items-center bg-noche/60 border border-light/20 rounded-lg text-light/70 hover:text-light hover:border-light/40 transition-colors" @click="renderer.ajustarEscala(0.1)">+</button>
        </div>
      </div>

      <!-- Instrucciones -->
      <div class="flex flex-col gap-1.5 font-cuerpo text-light/50 text-xs leading-relaxed">
        <span><b class="text-light/70">Doble-clic</b>: agrega punto (spawn/cartel: lo posiciona)</span>
        <span><b class="text-light/70">Arrastrar</b>: mueve punto / NPC</span>
        <span><b class="text-light/70">Clic derecho</b>: borra punto</span>
        <span><b class="text-light/70">N</b>: nuevo obstáculo · <b class="text-light/70">7</b>: NPCs</span>
      </div>

      <button
        class="bg-[#4da3ff]/15 hover:bg-[#4da3ff]/25 border border-[#4da3ff]/50 rounded-lg font-cuerpo text-[#4da3ff] text-sm transition-colors duration-150 px-4 py-2.5 mt-auto"
        @click="copiarNpcs"
      >
        {{ copiadoNpcs ? '¡Copiado!' : 'Copiar NPCs' }}
      </button>

      <button
        class="bg-[#ffd27a]/15 hover:bg-[#ffd27a]/25 border border-[#ffd27a]/50 rounded-lg font-cuerpo text-[#ffd27a] text-sm transition-colors duration-150 px-4 py-2.5"
        @click="copiarCartel"
      >
        {{ copiadoCartel ? '¡Copiado!' : 'Copiar solo cartel' }}
      </button>

      <button
        class="bg-farol/15 hover:bg-farol/25 border border-farol/50 rounded-lg font-cuerpo text-dorado text-sm transition-colors duration-150 px-4 py-2.5"
        @click="copiar"
      >
        {{ copiado ? '¡Copiado!' : 'Copiar interior' }}
      </button>
    </div>
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
