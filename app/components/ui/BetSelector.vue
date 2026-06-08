<script setup>
import { computed } from 'vue'
import { useGameConfig, formatMoneda } from '~/composables/useGameConfig'
import { useGameState } from '~/composables/useGameState'

const config = useGameConfig()
const { state } = useGameState()

const props = defineProps({
  seleccionada: { type: Number, default: null },
  deshabilitado: { type: Boolean, default: false }
})
const emit = defineEmits(['elegir'])

const apuestas = config.APUESTAS

function puede(monto) {
  return state.plata >= monto
}
</script>

<template>
  <div class="flex flex-col gap-3 items-center">
    <span class="font-display text-dorado text-xl uppercase tracking-widest">Tu apuesta</span>
    <div class="flex gap-3">
      <button
        v-for="monto in apuestas"
        :key="monto"
        :disabled="deshabilitado || !puede(monto)"
        class="min-w-[104px] bg-noche border-2 rounded-xl font-display text-2xl px-6 py-3.5 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
        :class="
          seleccionada === monto
            ? 'border-farol text-dorado shadow-farol scale-105'
            : 'border-madera-claro/40 text-light/70 hover:border-farol/60 hover:text-dorado'
        "
        @click="emit('elegir', monto)"
      >
        {{ formatMoneda(monto) }}
      </button>
    </div>
  </div>
</template>
