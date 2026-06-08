<script setup>
// ClientOnly garantiza que canvas/GSAP nunca toquen el DOM en SSR.
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useSceneManager } from '~/composables/useSceneManager'
const { modoEdicion } = useSceneManager()

// El juego tiene tamaño natural fijo (canvas 1440x800 + TopBar ~60px). En pantallas
// más chicas se escala con transform para que entre completo (sin recortar el header).
const ANCHO_NATURAL = 1440
const ALTO_NATURAL = 860 // 800 del frame + ~60 del TopBar

const escala = ref(1)

function calcularEscala() {
  if (typeof window === 'undefined') return
  const s = Math.min(window.innerWidth / ANCHO_NATURAL, window.innerHeight / ALTO_NATURAL)
  escala.value = Math.min(s, 1) // nunca agrandar más allá del tamaño natural
}

onMounted(() => {
  calcularEscala()
  window.addEventListener('resize', calcularEscala)
})
onUnmounted(() => window.removeEventListener('resize', calcularEscala))

// En modo edición no se escala (se calibra en pantalla grande con el panel al costado).
const estiloEscala = computed(() =>
  modoEdicion.value ? {} : { transform: `scale(${escala.value})`, transformOrigin: 'center' }
)
</script>

<template>
  <div
    class="w-full h-screen flex items-center relative bg-noche overflow-hidden"
    :class="modoEdicion ? 'justify-start' : 'justify-center'"
  >
    <ClientOnly>
      <div :style="estiloEscala">
        <GameRoot />
      </div>
      <template #fallback>
        <div class="w-[1440px] h-[800px] flex justify-center items-center bg-noche">
          <p class="font-display text-dorado text-2xl tracking-widest">Plaza 1810</p>
        </div>
      </template>
    </ClientOnly>
  </div>
</template>
