<script setup>
// Orquestador: barra superior global + frame de juego pegado abajo.
import { computed, ref, watch } from 'vue'
import { useSceneManager, ESCENAS } from '~/composables/useSceneManager'

const { escenaActual, enTransicion, esInterior } = useSceneManager()

// La barra superior se ve en todas las escenas salvo las pantallas completas.
const mostrarBarra = computed(
  () => escenaActual.value !== ESCENAS.BIENVENIDA && escenaActual.value !== ESCENAS.RESULTADO
)

const ayudaAbierta = ref(false)

// La primera vez que se pisa la plaza, mostrar el tutorial de controles (una sola
// vez por dispositivo). Después queda siempre reabrible con el botón "?".
const LS_TUTORIAL = 'plaza1810_tutorial_visto'
watch(escenaActual, (escena) => {
  if (escena !== ESCENAS.PLAZA) return
  if (typeof window === 'undefined') return
  if (localStorage.getItem(LS_TUTORIAL)) return
  ayudaAbierta.value = true
  localStorage.setItem(LS_TUTORIAL, '1')
})
</script>

<template>
  <div class="w-[1440px] flex flex-col">
    <TopBar v-if="mostrarBarra" @ayuda="ayudaAbierta = true" />

    <!-- Frame de juego, pegado abajo -->
    <div class="w-full h-[800px] relative bg-noche overflow-hidden">
      <WelcomeScene v-if="escenaActual === ESCENAS.BIENVENIDA" />
      <PlazaScene v-else-if="escenaActual === ESCENAS.PLAZA" />
      <InteriorScene v-else-if="esInterior" :key="escenaActual" />
      <BingoGame v-else-if="escenaActual === ESCENAS.BINGO" />
      <DiceGame v-else-if="escenaActual === ESCENAS.DADOS" />
      <CardsGame v-else-if="escenaActual === ESCENAS.NAIPES" />
      <CupsGame v-else-if="escenaActual === ESCENAS.CUBILETES" />
      <SapoGame v-else-if="escenaActual === ESCENAS.SORTIJA" />
      <GaritoScene v-else-if="escenaActual === ESCENAS.GARITO" />
      <ResultScene v-else-if="escenaActual === ESCENAS.RESULTADO" />

      <!-- Aviso "ya podés saldar" (global, sobre el frame de juego) -->
      <AvisoSaldar />

      <!-- Overlay de ayuda (controles) -->
      <ControlesAyuda v-if="ayudaAbierta" modal @cerrar="ayudaAbierta = false" />

      <!-- Fundido negro entre escenas -->
      <div
        class="absolute inset-0 z-50 bg-noche pointer-events-none transition-opacity duration-200 ease-out"
        :class="enTransicion ? 'opacity-100' : 'opacity-0'"
      />
    </div>
  </div>
</template>
