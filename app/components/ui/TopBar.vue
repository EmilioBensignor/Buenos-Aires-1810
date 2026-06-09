<script setup>
// Barra superior global (fuera del frame de juego): bolsa + deuda siempre;
// indicaciones de control solo en la plaza; botón volver en minijuegos/garito.
import { ref, watch, onMounted } from 'vue'
import { useGameState } from '~/composables/useGameState'
import { useGameConfig, formatMoneda, deudaEnCentavos } from '~/composables/useGameConfig'
import { useSceneManager, ESCENAS } from '~/composables/useSceneManager'
import { useAudio } from '~/composables/useAudio'

const { state } = useGameState()
const config = useGameConfig()
const { escenaActual, puedeVolver, esInterior, volver, volverAPlaza } = useSceneManager()
const { muteado, toggleMute } = useAudio()

const emit = defineEmits(['ayuda', 'logros'])

const plataMostrada = ref(state.plata)
const flash = ref(null) // 'gana' | 'pierde' | null
const bolsaRef = ref(null)

const deudaTxt = formatMoneda(deudaEnCentavos())

let gsap = null
onMounted(async () => {
  gsap = (await import('gsap')).default
})

watch(
  () => state.plata,
  (nuevo, viejo) => {
    if (nuevo === viejo) return
    flash.value = nuevo > viejo ? 'gana' : 'pierde'
    setTimeout(() => (flash.value = null), 600)

    if (nuevo < viejo && gsap && bolsaRef.value) {
      gsap.fromTo(bolsaRef.value, { x: -6 }, { x: 0, duration: 0.4, ease: 'elastic.out(1, 0.3)' })
    }

    if (gsap) {
      const obj = { v: viejo }
      gsap.to(obj, {
        v: nuevo,
        duration: config.ANIM.contadorPlata,
        ease: 'power2.out',
        onUpdate: () => {
          plataMostrada.value = Math.round(obj.v)
        }
      })
    } else {
      plataMostrada.value = nuevo
    }
  }
)
</script>

<template>
  <header class="w-full flex justify-between items-center gap-6 bg-noche-2 border-b border-farol/15 px-8 py-3">
    <!-- Bolsa -->
    <div
      ref="bolsaRef"
      class="flex items-baseline gap-3 transition-colors duration-300"
    >
      <span class="font-cuerpo text-dorado/80 text-base uppercase">Tu bolsa</span>
      <span
        class="font-display text-2xl leading-none transition-colors duration-300"
        :class="flash === 'gana' ? 'text-ganancia' : flash === 'pierde' ? 'text-perdida' : 'text-dorado'"
      >
        {{ formatMoneda(plataMostrada) }}
      </span>
    </div>

    <!-- Centro: espaciador -->
    <div class="flex-1" />

    <!-- Deuda + mute -->
    <div class="flex items-center gap-5">
      <div class="flex items-baseline gap-3">
        <span class="font-cuerpo text-perdida/80 text-base uppercase">Deuda mafia</span>
        <span class="font-display text-2xl leading-none text-perdida">{{ deudaTxt }}</span>
      </div>
      <button
        class="size-9 flex justify-center items-center bg-noche border border-farol/20 hover:border-farol/50 rounded-lg text-dorado/80 hover:text-dorado transition-colors duration-200"
        title="Cómo se juega"
        aria-label="Cómo se juega"
        @click="emit('ayuda')"
      >
        <span class="font-display text-lg leading-none">?</span>
      </button>
      <button
        class="size-9 flex justify-center items-center bg-noche border border-farol/20 hover:border-farol/50 rounded-lg text-dorado/80 hover:text-dorado transition-colors duration-200"
        title="Logros"
        aria-label="Ver logros"
        @click="emit('logros')"
      >
        <span class="text-lg leading-none">🏆</span>
      </button>
      <button
        class="size-9 flex justify-center items-center bg-noche border border-farol/20 hover:border-farol/50 rounded-lg text-dorado/80 hover:text-dorado transition-colors duration-200"
        :title="muteado ? 'Activar sonido' : 'Silenciar'"
        :aria-label="muteado ? 'Activar sonido' : 'Silenciar'"
        @click="toggleMute"
      >
        <svg v-if="!muteado" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" stroke="none" />
          <path d="M15.5 8.5a5 5 0 0 1 0 7" />
          <path d="M18.5 5.5a9 9 0 0 1 0 13" />
        </svg>
        <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" stroke="none" />
          <line x1="22" y1="9" x2="16" y2="15" />
          <line x1="16" y1="9" x2="22" y2="15" />
        </svg>
      </button>
    </div>
  </header>
</template>
