<script setup>
import { onMounted, ref } from 'vue'
import { useSceneManager, ESCENAS } from '~/composables/useSceneManager'
import { useGameConfig, formatMoneda, deudaEnCentavos } from '~/composables/useGameConfig'
import { useAudio } from '~/composables/useAudio'

const { ir } = useSceneManager()
const { arrancarMusica } = useAudio()
const config = useGameConfig()

const tituloRef = ref(null)
const contRef = ref(null)

const deudaTxt = formatMoneda(deudaEnCentavos())
const plataTxt = formatMoneda(config.PLATA_INICIAL)

// Leer localStorage directo para evitar race conditions con el state reactivo.
function loadState() {
  try {
    const raw = localStorage.getItem('plaza1810_state_v2')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

onMounted(async () => {
  const saved = loadState()
  if (
    saved &&
    (saved.plata !== config.PLATA_INICIAL ||
      (saved.edificioVisitado && Object.keys(saved.edificioVisitado).length > 0))
  ) {
    ir(ESCENAS.PLAZA)
    return
  }

  const gsap = (await import('gsap')).default
  gsap.from(tituloRef.value, { y: -30, opacity: 0, duration: 1, ease: 'power3.out' })
  gsap.from(contRef.value, { y: 24, opacity: 0, duration: 1, delay: 0.35, ease: 'power3.out' })
})

function empezar() {
  arrancarMusica() // primer gesto del usuario: desbloquea el audio del browser
  ir(ESCENAS.PLAZA)
}
</script>

<template>
  <div
    class="w-full h-full flex flex-col justify-center items-center relative overflow-hidden"
    style="background: radial-gradient(120% 90% at 50% 22%, #2c2016 0%, #16110c 52%, #0b0a08 100%);"
  >
    <!-- Faroles cálidos descentrados + viñeta para dar profundidad -->
    <div class="w-[640px] h-[640px] absolute -top-32 left-1/2 -translate-x-1/2 bg-brasa/12 rounded-full blur-[120px] pointer-events-none" />
    <div class="w-[360px] h-[360px] absolute bottom-[-6rem] left-[12%] bg-farol/8 rounded-full blur-[110px] pointer-events-none" />
    <div class="absolute inset-0 shadow-[inset_0_0_220px_70px_rgba(8,7,6,0.9)] pointer-events-none" />

    <div ref="tituloRef" class="flex flex-col items-center relative z-10">
      <h1 class="font-display text-8xl text-dorado tracking-wide drop-shadow-[0_2px_40px_rgba(255,178,77,0.35)]">
        Buenos Aires 1810
      </h1>
      <div class="w-48 h-px bg-gradient-to-r from-transparent via-farol/70 to-transparent mt-5" />
    </div>

    <div ref="contRef" class="flex flex-col items-center relative z-10 text-center mt-10">
      <!-- Stats: deuda vs bolsa, prominentes -->
      <div class="flex items-stretch gap-10">
        <div class="flex flex-col items-center gap-1.5">
          <span class="font-cuerpo text-perdida/80 text-lg tracking-[0.3em] uppercase">Le debés a la mafia</span>
          <span class="font-display text-5xl text-perdida leading-none drop-shadow-[0_0_16px_rgba(180,30,30,0.5)]">{{ deudaTxt }}</span>
        </div>
        <div class="w-px self-stretch bg-gradient-to-b from-transparent via-dorado/20 to-transparent" />
        <div class="flex flex-col items-center gap-1.5">
          <span class="font-cuerpo text-farol/80 text-lg tracking-[0.3em] uppercase">Tenés en la bolsa</span>
          <span class="font-display text-5xl text-dorado leading-none drop-shadow-[0_0_16px_rgba(255,178,77,0.4)]">{{ plataTxt }}</span>
        </div>
      </div>

      <!-- Narrativa -->
      <p class="font-cuerpo text-light/90 text-2xl leading-relaxed mt-10">
        Recorré la plaza, jugate en las timbas y juntá lo suficiente
        para saldar la deuda en el garito.
      </p>

      <!-- Tagline: grande, destacado -->
      <p class="font-display text-dorado/70 text-2xl italic mt-4 tracking-wide">
        El azar te hunde. La maña te salva.
      </p>

      <!-- Ornamento decorativo -->
      <div class="flex items-center gap-3 mt-8">
        <svg width="60" height="10" viewBox="0 0 60 10" class="text-dorado/30">
          <path d="M0 5 Q15 0 30 5 Q45 10 60 5" fill="none" stroke="currentColor" stroke-width="1.5"/>
        </svg>
        <svg width="12" height="12" viewBox="0 0 12 12" class="text-farol/40">
          <circle cx="6" cy="6" r="5" fill="none" stroke="currentColor" stroke-width="1"/>
          <circle cx="6" cy="6" r="2" fill="currentColor"/>
        </svg>
        <svg width="60" height="10" viewBox="0 0 60 10" class="text-dorado/30">
          <path d="M0 5 Q15 0 30 5 Q45 10 60 5" fill="none" stroke="currentColor" stroke-width="1.5"/>
        </svg>
      </div>

      <button
        data-clic
        class="bg-brasa/90 hover:bg-farol border border-dorado/60 rounded-xl text-noche font-display text-xl uppercase tracking-[0.15em] shadow-[0_8px_30px_-8px_rgba(232,115,31,0.6)] hover:shadow-[0_10px_44px_-6px_rgba(255,178,77,0.7)] hover:-translate-y-0.5 transition-all duration-300 ease-out px-11 py-3.5 mt-8"
        @click="empezar"
      >
        Entrar a la plaza
      </button>
    </div>
  </div>
</template>
