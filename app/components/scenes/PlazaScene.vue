<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { useGameConfig } from '~/composables/useGameConfig'
import { useGameLoop } from '~/composables/useGameLoop'
import { useInput } from '~/composables/useInput'
import { useSceneManager } from '~/composables/useSceneManager'
import { useGameState } from '~/composables/useGameState'
import { useAudio } from '~/composables/useAudio'
import { PlazaRenderer, ANCHO, ALTO } from '~/game/plaza/PlazaScene'
import NpcDialog from '~/components/ui/NpcDialog.vue'

const config = useGameConfig()
const { entrarA, scene, ir, ESCENAS } = useSceneManager()
const { state, chequearDerrota, marcarResultado, registrarEvento } = useGameState()
const { arrancarPasos, pararPasos } = useAudio()

// Abre la caja de diálogo de un NPC y registra el evento (para el logro "Conocido en la plaza").
function abrirDialogo(d) {
  dialogo.value = d
  if (d?.id) registrarEvento('hablo', { npcId: d.id })
}

const canvasRef = ref(null)
let renderer = null

const loop = useGameLoop()
const input = useInput()

const npcCerca = ref(false) // hay un NPC al alcance (muestra prompt "E")
const dialogo = ref(null) // { nombre, texto } de la caja de diálogo abierta

const enCinematica = ref(false) // bloquea carteles/prompt durante la cinemática
const fadeCine = ref(false) // overlay negro al cerrar la cinemática

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
    abrirDialogo(d)
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

onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  pararPasos() // que no queden sonando al salir de la plaza
})

// E = hablar con NPC cercano. Cualquier tecla cierra el diálogo abierto.
function onKey(e) {
  if (!renderer) return
  if (enCinematica.value) return
  const k = e.key.toLowerCase()

  // Si el diálogo está abierto, cualquier tecla lo cierra.
  if (dialogo.value) { dialogo.value = null; return }

  // Hablar con NPC.
  if (k === 'e' && !e.shiftKey) {
    const d = renderer.hablarConCerca()
    if (d) abrirDialogo(d)
  }
}

function onClick(e) {
  if (enCinematica.value) return
  const { x, y } = aCanvas(e)
  // Clic sobre un NPC cercano = hablarle; si no, navegación normal.
  const d = renderer.clickNpc(x, y)
  if (d) { abrirDialogo(d); return }
  renderer.clickEn(x, y)
}

// Hover de edificios para resaltar al pasar el mouse.
function onMove(e) {
  const { x, y } = aCanvas(e)
  renderer.moverMouse(x, y)
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
      @mousemove="onMove"
    />

    <!-- Cartelitos de los edificios (siempre visibles, clic = entrar) -->
    <template v-if="!enCinematica">
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
        v-if="npcCerca && !dialogo && !enCinematica"
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
