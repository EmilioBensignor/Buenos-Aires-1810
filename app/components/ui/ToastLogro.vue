<script setup>
import { ref, watch, onUnmounted } from 'vue'
import { useLogros } from '~/composables/useLogros'
import { useAudio } from '~/composables/useAudio'

const { toastActual, descartarToast } = useLogros()
const { sfx } = useAudio()

const visible = ref(false)
let timer = null

// Cada vez que hay un logro al frente de la cola, mostrarlo ~4.5s y luego avanzar.
watch(
  toastActual,
  (logro) => {
    if (logro && !visible.value) mostrar()
  },
  { immediate: true }
)

function mostrar() {
  visible.value = true
  sfx('logro') // suena al aparecer cada toast (uno por logro, respeta la cola)
  clearTimeout(timer)
  timer = setTimeout(cerrar, 4500)
}

function cerrar() {
  visible.value = false
  // Esperar a que termine la transición de salida antes de avanzar la cola.
  setTimeout(() => {
    descartarToast()
    if (toastActual.value) mostrar() // quedan más en la cola
  }, 420)
}

onUnmounted(() => clearTimeout(timer))
</script>

<template>
  <Transition name="logro">
    <div
      v-if="visible && toastActual"
      class="flex items-center gap-3.5 absolute top-6 left-1/2 -translate-x-1/2 z-40 bg-noche/95 border-2 border-farol/60 rounded-xl shadow-farol-lg px-6 py-3.5"
    >
      <span class="text-3xl leading-none">{{ toastActual.icono }}</span>
      <div class="flex flex-col">
        <span class="font-display text-dorado text-xs uppercase tracking-[0.2em]">¡Logro desbloqueado!</span>
        <span class="font-display text-light text-lg tracking-wide">{{ toastActual.nombre }}</span>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.logro-enter-active,
.logro-leave-active {
  transition: all 0.4s ease;
}
.logro-enter-from,
.logro-leave-to {
  opacity: 0;
  transform: translate(-50%, -12px);
}
</style>
