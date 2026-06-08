<script setup>
import { onMounted, ref, computed } from 'vue'
import { useGameState } from '~/composables/useGameState'
import { useSceneManager, ESCENAS } from '~/composables/useSceneManager'
import { useAudio } from '~/composables/useAudio'

const { state, reiniciar } = useGameState()
const { ir, scene } = useSceneManager()
const { sfx } = useAudio()

const esVictoria = computed(() => state.resultado === 'victoria')
const panelRef = ref(null)

onMounted(async () => {
  // Sonido del final: victoria o game over.
  sfx(esVictoria.value ? 'victoria' : 'gameOver')

  const gsap = (await import('gsap')).default
  gsap.from(panelRef.value, {
    scale: 0.8,
    opacity: 0,
    duration: 0.8,
    ease: esVictoria.value ? 'back.out(1.7)' : 'power2.out'
  })
})

function jugarDeNuevo() {
  reiniciar()
  scene.ultimoEdificio = null
  ir(ESCENAS.BIENVENIDA)
}
</script>

<template>
  <div
    class="w-full h-full flex justify-center items-center relative"
    :style="
      esVictoria
        ? 'background: radial-gradient(circle at 50% 40%, #4a3a1a 0%, #14110d 60%, #0d0b0f 100%);'
        : 'background: radial-gradient(circle at 50% 40%, #2a1010 0%, #0d0b0f 70%);'
    "
  >
    <div
      v-if="esVictoria"
      class="w-[600px] h-[600px] absolute bg-farol/15 rounded-full blur-3xl animate-pulse"
    />

    <div ref="panelRef" class="flex flex-col items-center relative z-10 text-center gap-6 px-8">
      <template v-if="esVictoria">
        <span class="font-cuerpo text-dorado/70 text-[24px] tracking-[0.3em] uppercase">Deuda saldada</span>
        <h1 class="font-display text-7xl text-dorado drop-shadow-[0_0_40px_rgba(255,178,77,0.6)]">
          ¡Sos libre!
        </h1>
        <p class="max-w-[52rem] font-cuerpo text-light/80 text-2xl leading-relaxed" style="color: #e8dcc4;">
          Llegaste al garito con la guita justa y cancelaste hasta el último peso.
          La mafia te suelta. Salís a la madrugada porteña con la conciencia limpia
          y los bolsillos vacíos, pero libre.
        </p>
      </template>

      <template v-else>
        <span class="font-cuerpo text-perdida/70 text-[24px] tracking-[0.3em] uppercase">Te encontró la mafia</span>
        <h1 class="font-display text-7xl text-perdida drop-shadow-[0_0_30px_rgba(214,90,74,0.5)]">
          Game Over
        </h1>
        <p class="max-w-[46rem] font-cuerpo text-light/70 text-2xl leading-relaxed" style="color: #d4c4b0;">
          Te quedaste sin un mango en la bolsa. La mafia no espera: te encontraron
          en un callejón de la plaza antes del amanecer. Acá se termina tu suerte, criollo.
        </p>
      </template>

      <button
        data-clic
        class="border-2 rounded-2xl font-display text-xl uppercase tracking-wide transition-all duration-300 hover:scale-105 px-10 py-4 mt-4"
        :class="
          esVictoria
            ? 'bg-gradient-to-b from-farol to-brasa border-dorado/50 text-noche shadow-farol-lg'
            : 'bg-noche border-perdida/50 text-perdida hover:border-perdida hover:shadow-[0_0_30px_rgba(214,90,74,0.4)]'
        "
        @click="jugarDeNuevo"
      >
        Jugar de nuevo
      </button>
    </div>
  </div>
</template>
