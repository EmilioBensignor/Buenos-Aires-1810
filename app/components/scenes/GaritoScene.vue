<script setup>
import { ref, computed } from 'vue'
import { useGameState } from '~/composables/useGameState'
import { useSceneManager } from '~/composables/useSceneManager'
import { useAudio } from '~/composables/useAudio'
import { formatMoneda, deudaEnCentavos } from '~/composables/useGameConfig'

const { state, puedeleSaldar, saldarDeuda } = useGameState()
const { volverAPlaza, irAPlazaConCinematica } = useSceneManager()
const { sfx } = useAudio()

const echado = ref(false)
const shake = ref(false)
const deudaTxt = formatMoneda(deudaEnCentavos())

const faltante = computed(() => Math.max(0, state.deuda - state.plata))
// Progreso 0..1 hacia saldar la deuda.
const progreso = computed(() => Math.min(1, state.plata / state.deuda))

function intentarSaldar() {
  if (puedeleSaldar.value) {
    saldarDeuda() // descuenta la deuda; la victoria la sella la cinemática
    irAPlazaConCinematica('victoria')
  } else {
    sfx('error') // intentó saldar sin tener la plata
    echado.value = true
    shake.value = true
    setTimeout(() => (shake.value = false), 450)
  }
}

// Panel DEV: teleporta a la plaza y corre la cinemática correspondiente.
function devGanar() {
  irAPlazaConCinematica('victoria')
}
function devPerder() {
  state.plata = 0 // que la bolsa refleje la derrota
  irAPlazaConCinematica('derrota')
}

</script>

<template>
  <div
    class="w-full h-full flex flex-col justify-center items-center relative overflow-hidden"
    style="background-image:url(/assets/garito.png); background-size:cover; background-position:center; background-color:#1a1012;"
  >
    <div class="absolute inset-0 bg-noche/60" />

    <!-- Volver a la plaza -->
    <button
      class="absolute top-4 left-4 z-20 bg-noche/80 border border-light/20 rounded-lg text-light/70 font-display text-sm px-4 py-2 hover:border-farol/50 hover:text-dorado transition-all duration-200"
      @click="volverAPlaza"
    >
      ← Plaza
    </button>

    <div class="flex flex-col items-center relative z-10 text-center gap-6 px-8">
      <div class="flex flex-col items-center">
        <h2 class="font-display text-5xl text-perdida drop-shadow-[0_0_25px_rgba(214,90,74,0.4)]">
          El Garito de la Mafia
        </h2>
        <div class="w-32 h-px mt-3 bg-gradient-to-r from-transparent via-perdida to-transparent" />
      </div>

      <!-- Panel principal: alineado al estilo de los minijuegos -->
      <div
        class="w-full max-w-md flex flex-col gap-6 bg-noche/95 border border-dorado/40 rounded-2xl shadow-farol-lg p-7"
        :class="{ 'animate-shake': shake }"
      >
        <!-- Bolsa vs deuda -->
        <div class="flex justify-between items-end gap-4">
          <div class="flex flex-col items-start gap-1">
            <span class="font-cuerpo text-light/70 text-lg uppercase tracking-widest">En la bolsa</span>
            <span class="font-display text-dorado text-4xl">{{ formatMoneda(state.plata) }}</span>
          </div>
          <div class="flex flex-col items-end gap-1">
            <span class="font-cuerpo text-light/70 text-lg uppercase tracking-widest">La deuda</span>
            <span class="font-display text-perdida text-4xl">{{ deudaTxt }}</span>
          </div>
        </div>

        <!-- Progreso de la deuda -->
        <div class="flex flex-col gap-2">
          <div class="w-full h-4 relative bg-noche border border-madera-claro/30 rounded-full overflow-hidden">
            <div
              class="h-full bg-gradient-to-r from-brasa to-ganancia transition-all duration-500 rounded-full"
              :style="`width:${progreso * 100}%;`"
            />
          </div>
          <p class="font-cuerpo text-light/80 text-xl">
            <template v-if="puedeleSaldar">¡Tenés con qué saldar la cuenta!</template>
            <template v-else>Te falta <span class="text-dorado font-display">{{ formatMoneda(faltante) }}</span> para saldar</template>
          </p>
        </div>

        <!-- Botón saldar -->
        <button
          class="w-full border-2 rounded-2xl font-display text-2xl uppercase tracking-wide transition-all duration-300 py-4"
          :class="
            puedeleSaldar
              ? 'bg-gradient-to-b from-farol to-brasa border-dorado/50 text-noche shadow-farol-lg hover:scale-105'
              : 'bg-noche border-madera-claro/40 text-light/60 hover:border-perdida/60'
          "
          @click="intentarSaldar"
        >
          {{ puedeleSaldar ? 'Saldar la deuda' : 'Intentar saldar' }}
        </button>

        <!-- Reto de la mafia si te echaron -->
        <p v-if="echado && !puedeleSaldar" class="font-cuerpo text-perdida italic text-2xl">
          "Volvé cuando tengas la guita, criollo"
        </p>
      </div>

      <!-- Panel DEV: requisito del profe para ver los finales sin jugar -->
      <div class="flex flex-col items-center gap-3 mt-4 pt-6 border-t border-dorado/20">
        <div class="flex gap-4">
          <button
            class="bg-ganancia/10 border-2 border-ganancia/50 rounded-xl text-ganancia font-display text-lg hover:bg-ganancia/20 hover:scale-105 transition-all duration-200 px-8 py-3"
            @click="devGanar"
          >
GANAR
          </button>
          <button
            class="bg-perdida/10 border-2 border-perdida/50 rounded-xl text-perdida font-display text-lg hover:bg-perdida/20 hover:scale-105 transition-all duration-200 px-8 py-3"
            @click="devPerder"
          >
PERDER
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Sacudida cuando intentás saldar sin plata (la mafia te echa). */
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-8px); }
  40% { transform: translateX(8px); }
  60% { transform: translateX(-5px); }
  80% { transform: translateX(5px); }
}
.animate-shake {
  animation: shake 0.4s ease-in-out;
}
</style>
