<script setup>
// Carta de baraja española dibujada en CSS/SVG (sin imágenes).
// tapada = muestra el reverso. estado resalta ganadora/perdedora.
import { computed } from 'vue'

const props = defineProps({
  carta: { type: Object, default: null }, // { palo, numero } | null
  tapada: { type: Boolean, default: false },
  estado: { type: String, default: null }, // 'ganadora' | 'perdedora' | null
  seleccionable: { type: Boolean, default: false },
  seleccionada: { type: Boolean, default: false }
})

// Palo cálido (oro/copa) vs frío (espada/basto): define el color del símbolo.
const calido = computed(() => props.carta && (props.carta.palo === 'oro' || props.carta.palo === 'copa'))

</script>

<template>
  <div
    class="w-[88px] h-[132px] relative select-none transition-all duration-300"
    :class="[
      seleccionable ? 'cursor-pointer' : '',
      estado === 'ganadora' ? 'scale-105 -translate-y-1' : '',
      estado === 'perdedora' ? 'opacity-50' : '',
      seleccionada ? '-translate-y-3' : ''
    ]"
  >
    <!-- REVERSO -->
    <div
      v-if="tapada || !carta"
      class="w-full h-full bg-gradient-to-br from-[#5b2f1a] to-[#3a1c10] border-2 border-dorado/70 rounded-lg p-1 overflow-hidden"
      :class="[
        estado === 'ganadora' ? 'shadow-farol-lg ring-2 ring-ganancia' : 'shadow-lg',
        seleccionable ? 'hover:border-dorado hover:shadow-farol' : ''
      ]"
    >
      <div class="w-full h-full flex justify-center items-center reverso-patron border border-dorado/40 rounded">
        <!-- Emblema central: sol estilizado -->
        <svg viewBox="0 0 24 24" class="w-11 h-11 text-dorado/85">
          <circle cx="12" cy="12" r="4" fill="currentColor" />
          <g stroke="currentColor" stroke-width="1.3" stroke-linecap="round">
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
            <path d="M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" opacity="0.8" />
          </g>
        </svg>
      </div>
    </div>

    <!-- FRENTE -->
    <div
      v-else
      class="w-full h-full flex flex-col justify-between carta-papel border-2 rounded-lg px-2 py-1.5"
      :class="estado === 'ganadora' ? 'border-ganancia shadow-farol-lg ring-2 ring-ganancia' : 'border-[#b08a3e]/60 shadow-farol'"
    >
      <!-- Marco interior español -->
      <div class="w-full h-full flex flex-col justify-between border border-[#b08a3e]/40 rounded-md p-1">
        <!-- Esquina superior izquierda -->
        <div class="flex flex-col items-center self-start leading-none">
          <span class="font-display text-lg" :class="calido ? 'text-brasa' : 'text-noche'">{{ carta.numero }}</span>
          <svg viewBox="0 0 24 24" class="w-3.5 h-3.5" :class="calido ? 'text-brasa' : 'text-noche/80'">
            <use :href="`#palo-${carta.palo}`" />
          </svg>
        </div>

        <!-- Centro: palo grande -->
        <svg viewBox="0 0 24 24" class="w-9 h-9 self-center" :class="calido ? 'text-ascua' : 'text-noche'">
          <use :href="`#palo-${carta.palo}`" />
        </svg>

        <!-- Esquina inferior derecha (espejada) -->
        <div class="flex flex-col items-center self-end rotate-180 leading-none">
          <span class="font-display text-lg" :class="calido ? 'text-brasa' : 'text-noche'">{{ carta.numero }}</span>
          <svg viewBox="0 0 24 24" class="w-3.5 h-3.5" :class="calido ? 'text-brasa' : 'text-noche/80'">
            <use :href="`#palo-${carta.palo}`" />
          </svg>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Papel crema con vetas/manchas sutiles (sin imágenes) */
.carta-papel {
  background-color: #f2e9cf;
  background-image:
    radial-gradient(ellipse at 30% 20%, rgba(160, 120, 60, 0.10), transparent 55%),
    radial-gradient(ellipse at 75% 80%, rgba(120, 80, 40, 0.10), transparent 50%),
    linear-gradient(135deg, #f6efdc, #e6d8b8);
}

/* Filigrana de rombos del reverso */
.reverso-patron {
  background-image:
    repeating-linear-gradient(45deg, rgba(255, 178, 77, 0.18) 0 4px, transparent 4px 9px),
    repeating-linear-gradient(-45deg, rgba(255, 178, 77, 0.18) 0 4px, transparent 4px 9px);
}
</style>
