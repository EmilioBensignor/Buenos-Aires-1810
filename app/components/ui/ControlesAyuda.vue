<script setup>
import { onMounted, onUnmounted } from 'vue'
import { useAudio } from '~/composables/useAudio'

const props = defineProps({
  modal: { type: Boolean, default: false }
})
const emit = defineEmits(['cerrar'])

const { muteado, toggleMute, volMusica, volSfx, setVolMusica, setVolSfx } = useAudio()

// tipo 'mover' = se dibuja con keycaps WASD + flechas; el resto usa la pill simple.
const controles = [
  { tipo: 'mover', accion: 'Caminar por la plaza y los interiores' },
  { tipo: 'tecla', tecla: 'Clic', accion: 'Caminar a un punto · entrar a un edificio · hablar con un NPC' },
  { tipo: 'tecla', tecla: 'E', accion: 'Hablar con el NPC cercano · sentarte a la mesa de un juego' }
]

function onEsc(e) {
  if (props.modal && e.key === 'Escape') emit('cerrar')
}
onMounted(() => {
  if (props.modal) window.addEventListener('keydown', onEsc)
})
onUnmounted(() => window.removeEventListener('keydown', onEsc))
</script>

<template>
  <!-- Overlay modal -->
  <div
    v-if="modal"
    class="absolute inset-0 z-50 flex justify-center items-center bg-noche/80 backdrop-blur-sm"
    @click.self="emit('cerrar')"
  >
    <div class="w-[560px] flex flex-col gap-6 bg-noche-2 border-2 border-farol/40 rounded-2xl shadow-farol-lg p-8">
      <div class="flex justify-between items-center">
        <h3 class="font-display text-3xl text-dorado tracking-wide">Cómo se juega</h3>
        <button
          class="size-9 flex justify-center items-center bg-noche border border-light/20 hover:border-farol/50 rounded-lg text-light/70 hover:text-dorado transition-colors"
          @click="emit('cerrar')"
        >
          ✕
        </button>
      </div>
      <div class="flex flex-col gap-4">
        <div v-for="(c, i) in controles" :key="i" class="flex items-center gap-4">
          <!-- Movimiento: fila de letras WASD, fila de flechas debajo -->
          <div v-if="c.tipo === 'mover'" class="min-w-[150px] flex flex-col gap-1.5">
            <div class="flex gap-1.5">
              <span
                v-for="l in ['W', 'A', 'S', 'D']"
                :key="l"
                class="w-9 h-9 flex justify-center items-center bg-farol/15 border border-farol/50 rounded-lg font-display text-dorado text-base leading-none"
              >{{ l }}</span>
            </div>
            <div class="flex gap-1.5">
              <span
                v-for="f in ['↑', '←', '↓', '→']"
                :key="f"
                class="w-9 h-9 flex justify-center items-center bg-farol/15 border border-farol/50 rounded-lg font-cuerpo text-farol/70 text-base leading-none"
              >{{ f }}</span>
            </div>
          </div>
          <!-- Tecla simple (Clic, E) -->
          <span
            v-else
            class="min-w-[150px] h-9 flex justify-center items-center bg-farol/15 border border-farol/50 rounded-lg font-display text-dorado text-lg px-3"
          >
            {{ c.tecla }}
          </span>
          <span class="font-cuerpo text-lg text-light/85 leading-snug">{{ c.accion }}</span>
        </div>
      </div>
      <!-- Sonido: switch de mute + sliders de volumen -->
      <div class="flex flex-col gap-4 bg-noche/60 border border-farol/20 rounded-lg px-4 py-4">
        <div class="flex justify-between items-center gap-4">
          <span class="font-cuerpo text-lg text-light/85">Sonido</span>
          <button
            class="w-14 h-7 flex items-center relative rounded-full transition-colors duration-200"
            :class="muteado ? 'bg-noche border border-light/25' : 'bg-farol/80'"
            role="switch"
            :aria-checked="!muteado"
            aria-label="Activar o silenciar el sonido"
            @click="toggleMute"
          >
            <span
              class="size-5 absolute bg-light rounded-full shadow transition-all duration-200"
              :class="muteado ? 'left-1' : 'left-8'"
            />
          </button>
        </div>

        <div class="flex flex-col gap-3" :class="muteado ? 'opacity-40 pointer-events-none' : ''">
          <label class="flex items-center gap-3">
            <span class="w-24 font-cuerpo text-base text-light/70">Música</span>
            <input
              type="range" min="0" max="100" step="1"
              :value="Math.round(volMusica * 100)"
              :disabled="muteado"
              class="flex-1 accent-farol cursor-pointer"
              aria-label="Volumen de la música"
              @input="setVolMusica($event.target.value / 100)"
            >
          </label>
          <label class="flex items-center gap-3">
            <span class="w-24 font-cuerpo text-base text-light/70">Efectos</span>
            <input
              type="range" min="0" max="100" step="1"
              :value="Math.round(volSfx * 100)"
              :disabled="muteado"
              class="flex-1 accent-farol cursor-pointer"
              aria-label="Volumen de los efectos"
              @input="setVolSfx($event.target.value / 100)"
            >
          </label>
        </div>
      </div>

      <p class="font-cuerpo text-base text-light/40 text-center italic">ESC o clic afuera para cerrar</p>
    </div>
  </div>

  <!-- Inline (bienvenida) -->
  <div v-else class="w-full flex flex-col gap-3">
    <div v-for="c in controles" :key="c.tecla" class="flex items-center gap-4">
      <span class="min-w-[72px] flex justify-center items-center bg-farol/15 border border-farol/50 rounded-lg font-display text-dorado px-3 py-1.5">
        {{ c.tecla }}
      </span>
      <span class="font-cuerpo text-base text-light/85 leading-snug text-left">{{ c.accion }}</span>
    </div>
  </div>
</template>
