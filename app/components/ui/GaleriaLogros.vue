<script setup>
import { onMounted, onUnmounted } from 'vue'
import { useLogros } from '~/composables/useLogros'

const emit = defineEmits(['cerrar'])
const { catalogo, desbloqueados, progreso } = useLogros()

function onEsc(e) {
  if (e.key === 'Escape') emit('cerrar')
}
onMounted(() => window.addEventListener('keydown', onEsc))
onUnmounted(() => window.removeEventListener('keydown', onEsc))
</script>

<template>
  <div
    class="flex justify-center items-center absolute inset-0 z-50 bg-noche/80 backdrop-blur-sm"
    @click.self="emit('cerrar')"
  >
    <div class="w-[720px] max-h-[680px] flex flex-col gap-5 bg-noche-2 border-2 border-farol/40 rounded-2xl shadow-farol-lg p-8">
      <div class="flex justify-between items-center">
        <h3 class="font-display text-3xl text-dorado tracking-wide">Logros</h3>
        <div class="flex items-center gap-4">
          <span class="font-display text-xl text-farol/80 tabular-nums">{{ progreso.hechos }}/{{ progreso.total }}</span>
          <button
            class="size-9 flex justify-center items-center bg-noche border border-light/20 hover:border-farol/50 rounded-lg text-light/70 hover:text-dorado transition-colors"
            @click="emit('cerrar')"
          >
            ✕
          </button>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3 overflow-y-auto pr-1">
        <div
          v-for="l in catalogo"
          :key="l.id"
          class="flex items-start gap-3 border rounded-xl transition-colors p-3.5"
          :class="desbloqueados[l.id]
            ? 'bg-farol/10 border-farol/40'
            : 'bg-noche/50 border-light/10'"
        >
          <span
            class="text-3xl leading-none"
            :class="desbloqueados[l.id] ? '' : 'grayscale opacity-40'"
          >{{ l.icono }}</span>
          <div class="flex flex-col gap-0.5">
            <span
              class="font-display text-base tracking-wide"
              :class="desbloqueados[l.id] ? 'text-dorado' : 'text-light/40'"
            >{{ l.nombre }}</span>
            <span
              class="font-cuerpo text-sm leading-snug"
              :class="desbloqueados[l.id] ? 'text-light/80' : 'text-light/35'"
            >{{ l.desc }}</span>
          </div>
        </div>
      </div>

      <p class="font-cuerpo text-base text-light/40 text-center italic">ESC o clic afuera para cerrar</p>
    </div>
  </div>
</template>
