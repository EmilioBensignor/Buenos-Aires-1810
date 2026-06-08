<script setup>
import { ref, watch, onUnmounted } from 'vue'
import { useGameState } from '~/composables/useGameState'

const { puedeleSaldar } = useGameState()

const visible = ref(false)
let estabaPorEncima = puedeleSaldar.value // arranca según el estado actual (no avisa de entrada)
let timer = null

watch(
  () => puedeleSaldar.value,
  (ahora) => {
    // Cruce de abajo→arriba: mostrar el aviso.
    if (ahora && !estabaPorEncima) {
      mostrar()
    }
    estabaPorEncima = ahora
  }
)

function mostrar() {
  visible.value = true
  clearTimeout(timer)
  timer = setTimeout(() => (visible.value = false), 4500)
}

onUnmounted(() => clearTimeout(timer))
</script>

<template>
  <Transition name="aviso">
    <div
      v-if="visible"
      class="absolute top-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-noche/95 border-2 border-ganancia/60 rounded-xl shadow-farol-lg px-6 py-3.5"
    >
      <span class="size-2.5 bg-ganancia rounded-full shadow-[0_0_10px_rgba(123,201,111,0.8)]" />
      <p class="font-display text-lg text-ganancia tracking-wide">
        ¡Ya tenés con qué saldar! Andá al garito a cancelar la deuda.
      </p>
    </div>
  </Transition>
</template>

<style scoped>
.aviso-enter-active,
.aviso-leave-active {
  transition: all 0.4s ease;
}
.aviso-enter-from,
.aviso-leave-to {
  opacity: 0;
  transform: translate(-50%, -12px);
}
</style>
