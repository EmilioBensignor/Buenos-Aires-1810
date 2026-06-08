<script setup>
import { ref, onMounted, onBeforeUnmount, onUnmounted, watch } from 'vue'
import { useAudio } from '~/composables/useAudio'

const props = defineProps({
  nombre: { type: String, required: true },
  texto: { type: String, required: true }
})
defineEmits(['cerrar'])

const { sfx, pararSfx } = useAudio()

const MS_POR_CHAR = 25
const mostrado = ref('')
let timer = null
let i = 0

function escribir(texto) {
  clearInterval(timer)
  mostrado.value = ''
  i = 0
  timer = setInterval(() => {
    i++
    mostrado.value = texto.slice(0, i)
    if (i >= texto.length) clearInterval(timer)
  }, MS_POR_CHAR)
}

// Suena al abrir (tope 4s por config). Se corta al cerrar/alejarse (desmonta el cuadro).
onMounted(() => {
  sfx('dialogoNpc')
  escribir(props.texto)
})

// Si cambia el texto (otra línea sin desmontar), reinicia el efecto.
watch(() => props.texto, (t) => escribir(t))

onBeforeUnmount(() => pararSfx('dialogoNpc'))
onUnmounted(() => clearInterval(timer))
</script>

<template>
  <div class="w-full absolute bottom-0 left-0 z-30 flex justify-center p-8">
    <div
      class="w-[760px] flex flex-col gap-3 relative bg-noche/95 border-2 border-farol/50 rounded-2xl shadow-farol-lg p-6 cursor-pointer"
      @click="$emit('cerrar')"
    >
      <div class="flex items-center gap-3">
        <span class="w-3 h-3 bg-farol rounded-full shadow-farol" />
        <span class="font-display text-xl text-dorado tracking-wide">{{ nombre }}</span>
      </div>
      <p class="font-cuerpo text-lg text-light/90 leading-relaxed" style="color: #f0e6d2;">
        "{{ mostrado }}"
      </p>
      <span class="absolute bottom-3 right-5 font-cuerpo text-sm text-dorado/40 italic">
        clic para cerrar
      </span>
    </div>
  </div>
</template>
