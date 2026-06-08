<script setup>
// Raíz: siempre montada. Acá vive el arranque de audio (primer gesto del usuario,
// por la autoplay-policy) y el SFX de clic global en cualquier <button>.
import { onMounted, onBeforeUnmount } from 'vue'
import { useAudio } from '~/composables/useAudio'

const { arrancarMusica, sfx } = useAudio()

// Primer gesto en cualquier lado → desbloquea e inicia la música. Una sola vez.
function primerGesto() {
  arrancarMusica()
}

// Clic = SOLO en botones marcados con `data-clic` (opt-in). El resto no suena.
function clickGlobal(e) {
  if (e.target.closest('[data-clic]')) sfx('click')
}

onMounted(() => {
  window.addEventListener('pointerdown', primerGesto, { once: true })
  window.addEventListener('keydown', primerGesto, { once: true })
  window.addEventListener('click', clickGlobal)
})

onBeforeUnmount(() => {
  window.removeEventListener('pointerdown', primerGesto)
  window.removeEventListener('keydown', primerGesto)
  window.removeEventListener('click', clickGlobal)
})
</script>

<template>
  <NuxtPage />
</template>
