<script setup>
// Interior caminable genérico. Lee qué interior mostrar según la escena actual,
// instancia el renderer, y conecta caminar + interacción (mesa/salida) con la FSM.
import { onMounted, onUnmounted, ref } from 'vue'
import { useGameLoop } from '~/composables/useGameLoop'
import { useInput } from '~/composables/useInput'
import { useSceneManager, INTERIOR_DE } from '~/composables/useSceneManager'
import { useGameState } from '~/composables/useGameState'
import { INTERIORES } from '~/game/interiors/interiors'
import { InteriorRenderer, ANCHO, ALTO } from '~/game/interiors/InteriorScene'
import NpcDialog from '~/components/ui/NpcDialog.vue'

const { escenaActual, irAJuego, volverAPlaza } = useSceneManager()
const { registrarEvento } = useGameState()

// Abre la caja de diálogo de un NPC y registra el evento (logro "Conocido en la plaza").
function abrirDialogo(d) {
  dialogo.value = d
  if (d?.id) registrarEvento('hablo', { npcId: d.id })
}

const canvasRef = ref(null)
let renderer = null

const loop = useGameLoop()
const input = useInput()

const cercaMesa = ref(false)
const etiquetaMesa = ref('')
const cartelMesa = ref(null) // { x, y, texto } del cartel sobre la mesa
const npcCerca = ref(false) // hay un NPC al alcance (muestra prompt "E")
const dialogo = ref(null) // { nombre, texto } de la caja abierta

onMounted(() => {
  const id = INTERIOR_DE[escenaActual.value]
  const interior = INTERIORES[id]
  etiquetaMesa.value = interior.mesa.etiqueta || 'Jugar'

  renderer = new InteriorRenderer(canvasRef.value, interior)
  renderer.onJugar = (escena) => irAJuego(escena)
  renderer.onSalir = () => volverAPlaza()

  cartelMesa.value = renderer.cartelMesa()

  loop.start((delta) => {
    renderer.update(delta, input.getVectorDireccion())
    renderer.draw()
    cercaMesa.value = renderer.cercaMesa
    npcCerca.value = !!renderer.npcCerca
    // Si te alejás del NPC con el diálogo abierto, se cierra (corta su SFX).
    if (dialogo.value && !npcCerca.value) dialogo.value = null
  })

  window.addEventListener('keydown', onKey)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
})

function onKey(e) {
  if (!renderer) return
  const k = e.key.toLowerCase()

  // Si el diálogo está abierto, cualquier tecla lo cierra.
  if (dialogo.value) { dialogo.value = null; return }

  if (k === 'e') {
    // interactuar() prioriza hablar con NPC cercano (devuelve {nombre,texto}).
    const d = renderer.interactuar()
    if (d) abrirDialogo(d)
  }
}

function onClick(e) {
  const { x, y } = aCanvas(e)
  // Clic sobre un NPC cercano = hablarle; si no, caminar.
  const d = renderer.clickNpc(x, y)
  if (d) { abrirDialogo(d); return }
  renderer.clickEn(x, y)
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
      class="w-full h-full cursor-pointer"
      @click="onClick"
    />

    <!-- Cartel de la mesa (botón): clic = caminar a la mesa y jugar -->
    <button
      v-if="cartelMesa"
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
        v-if="(npcCerca || cercaMesa) && !dialogo"
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
