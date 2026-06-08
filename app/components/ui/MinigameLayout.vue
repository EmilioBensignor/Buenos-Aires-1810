<script setup>
import { computed } from 'vue'
import { useSceneManager } from '~/composables/useSceneManager'

defineProps({
  titulo: { type: String, required: true },
  fondo: { type: String, default: '' }
})

const { volver, escenaActual, INTERIOR_DE } = useSceneManager()

// Si ya estamos en un interior → "Volver a la plaza". Si estamos en un minijuego → "Volver a la pulpería" (etc).
const botonTexto = computed(() => {
  if (INTERIOR_DE[escenaActual.value]) return '← Plaza'
  return '← Volver'
})

// ESC sale del minijuego (vuelve al interior si vino de uno, si no a la plaza).
function onKeyDown(e) {
  if (e.key === 'Escape') volver()
}

onMounted(() => window.addEventListener('keydown', onKeyDown))
onUnmounted(() => window.removeEventListener('keydown', onKeyDown))
</script>

<template>
  <div
    class="w-full h-full flex flex-col items-center relative overflow-hidden"
    :style="
      fondo
        ? `background-image:url(${fondo}); background-size:cover; background-position:center;`
        : 'background: radial-gradient(circle at 50% 30%, #2a1f15 0%, #14110d 60%, #0d0b0f 100%);'
    "
  >
    <div class="absolute inset-0 bg-noche/60" />

    <div class="flex flex-col items-center relative z-10 pt-8">
      <h2 class="font-display text-5xl text-dorado tracking-wide drop-shadow-[0_0_20px_rgba(255,178,77,0.4)] leading-none">
        {{ titulo }}
      </h2>
      <div class="w-32 h-px mt-2 bg-gradient-to-r from-transparent via-farol to-transparent" />
    </div>

    <div class="flex-1 w-full flex flex-col justify-center items-center relative z-10">
      <slot />
    </div>

    <!-- Botón volver: arriba izquierda, sin glow -->
    <button
      class="absolute top-4 left-4 bg-noche/80 border border-light/20 rounded-lg text-light/70 font-display text-sm px-4 py-2 hover:border-farol/50 hover:text-dorado transition-all duration-200 z-20"
      @click="volver"
    >
      {{ botonTexto }}
    </button>
  </div>
</template>
