<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { useGameConfig, formatMoneda } from '~/composables/useGameConfig'
import { useGameState } from '~/composables/useGameState'
import { useSceneManager } from '~/composables/useSceneManager'
import { useAudio } from '~/composables/useAudio'
import { nuevaPartidaNaipes, jugarRonda, resultadoSerie, RONDAS_PARA_GANAR } from '~/game/minigames/cards'

const config = useGameConfig()
const { state, apostar, cobrar, registrarEvento } = useGameState()
const { volver, volverAPlaza } = useSceneManager()
const { sfx } = useAudio()

const apuesta = ref(null)
const fase = ref('apostar') // apostar | jugando | resultado
const partida = ref(null)

// Mano del jugador con posiciones FIJAS en pantalla (las jugadas quedan vacías).
const mano = ref([]) // [{ carta, jugada }]
const enMesa = ref({ jugador: null, croupier: null })
const reveladas = ref(false)
const ganadorRonda = ref(null) // 'jugador' | 'croupier' | 'empate'
const scoreJug = ref(0)
const scoreCro = ref(0)
const resultadoFinal = ref(null)
const procesando = ref(false) // bloquea input durante animaciones
const rondaResuelta = ref(false) // ronda revelada, esperando que aprete "Siguiente"
const rescateVisible = ref(false) // botón de rescate: solo si el auto-avance de la última ronda falla
const numRonda = ref(0)

const cartaJugRef = ref(null) // wrapper interno (giro rotationY)
const cartaCroRef = ref(null)
const viajeJugRef = ref(null) // wrapper externo (viaje y/opacity)
const viajeCroRef = ref(null)
let gsap = null

onMounted(async () => {
  gsap = (await import('gsap')).default
})

function elegirApuesta(monto) {
  apuesta.value = monto
}

function comenzar() {
  if (!apuesta.value) return
  if (!apostar(apuesta.value)) return
  registrarEvento('jugo', { juego: 'naipes' })
  partida.value = nuevaPartidaNaipes()
  mano.value = partida.value.manoJugador.map((carta) => ({ carta, jugada: false }))
  enMesa.value = { jugador: null, croupier: null }
  reveladas.value = false
  rondaResuelta.value = false
  ganadorRonda.value = null
  scoreJug.value = 0
  scoreCro.value = 0
  numRonda.value = 1
  resultadoFinal.value = null
  fase.value = 'jugando'
}

// Click en una carta de la mano: viaja al centro, el pulpero saca la suya,
// se dan vuelta las dos a la vez. NO avanza solo: queda el botón "Siguiente".
async function jugarCarta(slot) {
  if (fase.value !== 'jugando' || procesando.value || rondaResuelta.value || slot.jugada) return
  procesando.value = true

  const idx = partida.value.manoJugador.indexOf(slot.carta)
  const r = jugarRonda(partida.value, idx < 0 ? 0 : idx)

  slot.jugada = true
  reveladas.value = false
  ganadorRonda.value = null

  // 1. Tu carta viaja al centro (desde abajo).
  enMesa.value = { jugador: r.jugador, croupier: null }
  await nextTick()
  await conTimeout(animarViaje(viajeJugRef.value, 90))

  // 2. El pulpero saca la suya y viaja al centro (desde arriba).
  enMesa.value = { jugador: r.jugador, croupier: r.croupier }
  await nextTick()
  await conTimeout(animarViaje(viajeCroRef.value, -90))
  await esperar(200)

  // 3. Las dos se dan vuelta AL MISMO TIEMPO. La cara cambia de reverso a frente
  //    en el punto medio del giro (cuando la carta está de canto, invisible).
  await conTimeout(animarRevelado(() => { reveladas.value = true }))
  ganadorRonda.value = r.resultado

  // Última ronda: tras ver las cartas, avanza SOLO al resultado (sin botón intermedio).
  // Red de seguridad invisible: si por algo el auto-avance no llega a finalizar() en
  // ~2.5s, recién ahí aparece un botón "Ver resultado" para destrabar a mano.
  if (partida.value.terminada) {
    procesando.value = false
    const rescate = setTimeout(() => { if (!yaFinalizada) rescateVisible.value = true }, 2500)
    await esperar(900)
    clearTimeout(rescate)
    finalizar()
    return
  }

  // Score se actualiza DESPUÉS del flip, no antes (el jugador ve el resultado antes de que suba el marcador).
  // roundResuelta = true activa el botón "Siguiente" que llama a siguiente() donde se actualiza el score.
  rondaResuelta.value = true
  procesando.value = false
}

// Botón: avanza a la siguiente ronda o, si terminó, al resultado.
function siguiente() {
  // Score se sincroniza después del flip (ganador de ronda ya está en partida).
  scoreJug.value = partida.value.rondasJugador
  scoreCro.value = partida.value.rondasCroupier

  if (partida.value.terminada) {
    finalizar()
    return
  }
  enMesa.value = { jugador: null, croupier: null }
  reveladas.value = false
  rondaResuelta.value = false
  ganadorRonda.value = null
  numRonda.value++
}

// Desliza la carta hacia su lugar en el centro (dy = desde dónde entra).
// Limpia el transform al terminar para no dejar residuo que descoloque la carta.
function animarViaje(el, dy) {
  sfx('repartirNaipe') // una por cada carta que sale a la mesa (tuya + pulpero)
  if (!gsap || !el) return Promise.resolve()
  return new Promise((resolve) => {
    gsap.fromTo(
      el,
      { y: dy, opacity: 0, scale: 0.85 },
      {
        y: 0,
        opacity: 1,
        scale: 1,
        duration: 0.35,
        ease: 'power2.out',
        onComplete: () => { gsap.set(el, { clearProps: 'transform,opacity' }); resolve() }
      }
    )
  })
}

// Flip en dos tramos: gira hasta ponerse de canto (90°), ahí cambia la cara
// (reverso→frente) con la carta invisible, y completa el giro. Sin parpadeo.
function animarRevelado(cambiarCara) {
  const els = [cartaJugRef.value, cartaCroRef.value]
  if (!gsap || !els[0] || !els[1]) {
    cambiarCara && cambiarCara()
    return Promise.resolve()
  }
  const mitad = config.ANIM.giroCarta / 2
  return new Promise((resolve) => {
    const tl = gsap.timeline({
      onComplete: () => { gsap.set(els, { clearProps: 'transform' }); resolve() }
    })
    // Tramo 1: 0° → 90° (reverso, hasta quedar de canto).
    tl.fromTo(els, { rotationY: 0 }, { rotationY: 90, duration: mitad, ease: 'power2.in' })
    // En el canto, cambiar la cara (ya no se ve) y arrancar el segundo tramo desde -90°.
    tl.add(() => { cambiarCara && cambiarCara(); gsap.set(els, { rotationY: -90 }) })
    // Tramo 2: -90° → 0° (frente, aparece).
    tl.to(els, { rotationY: 0, duration: mitad, ease: 'power2.out' })
  })
}

let yaFinalizada = false // evita doble cobro si finalizar() se llama dos veces

function finalizar() {
  if (yaFinalizada) return
  yaFinalizada = true
  const res = resultadoSerie(partida.value) // 'gano' | 'perdio' | 'empate'
  if (res === 'gano') {
    const ganancia = Math.round(apuesta.value * config.NAIPES.pago)
    cobrar(ganancia)
    registrarEvento('gano', { juego: 'naipes', apuesta: apuesta.value, ganancia })
    sfx('plata')
    resultadoFinal.value = { estado: 'gano', ganancia }
  } else if (res === 'empate') {
    cobrar(apuesta.value) // empate → devuelve la apuesta (ni ganás ni perdés); no cuenta como gano ni perdio
    resultadoFinal.value = { estado: 'empate', ganancia: 0 }
  } else {
    cobrar(0) // jugada terminada sin ganar → evalúa derrota
    registrarEvento('perdio', { juego: 'naipes' })
    resultadoFinal.value = { estado: 'perdio', ganancia: 0 }
  }
  fase.value = 'resultado'
  procesando.value = false
}

function jugarDeNuevo() {
  fase.value = 'apostar'
  partida.value = null
  mano.value = []
  enMesa.value = { jugador: null, croupier: null }
  resultadoFinal.value = null
  ganadorRonda.value = null
  reveladas.value = false
  rondaResuelta.value = false
  rescateVisible.value = false
  scoreJug.value = 0
  scoreCro.value = 0
  if (apuesta.value > state.plata) apuesta.value = null
}

function esperar(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

// Resuelve la promesa de animación pase lo que pase: si GSAP no dispara su callback
// (no cargó, hipo de timeline, desmontaje a mitad), un timeout la destraba. Evita que
// el flujo de la mano quede colgado en "¡Ganaste la ronda!" sin avanzar al resultado.
function conTimeout(promesa, ms = 2000) {
  return Promise.race([promesa, esperar(ms)])
}
</script>

<template>
  <MinigameLayout titulo="La Pulpería" fondo="/assets/pulperia.png">
    <!-- Sprite SVG: palos + figuras (definido una vez, lo usan todas las NaipeCard) -->
    <svg width="0" height="0" class="absolute" aria-hidden="true">
      <!-- ORO: moneda con anillo de relieve y sol estilizado -->
      <symbol id="palo-oro" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="1.4" />
        <circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.7" />
        <circle cx="12" cy="12" r="2.4" fill="currentColor" />
        <g stroke="currentColor" stroke-width="1.1" stroke-linecap="round">
          <path d="M12 4.5v2.2M12 17.3v2.2M4.5 12h2.2M17.3 12h2.2" />
          <path d="M6.7 6.7l1.5 1.5M15.8 15.8l1.5 1.5M17.3 6.7l-1.5 1.5M8.2 15.8l-1.5 1.5" opacity="0.7" />
        </g>
      </symbol>
      <!-- COPA: cáliz barroco con boca, nudo, pie y base -->
      <symbol id="palo-copa" viewBox="0 0 24 24">
        <path d="M5.5 4h13c0 4.5-2 7-4.3 7.8l0 4.2c1.8.2 3 .7 3 1.5H6.8c0-.8 1.2-1.3 3-1.5l0-4.2C7.5 11 5.5 8.5 5.5 4z" fill="currentColor" />
        <rect x="6" y="19.2" width="12" height="1.8" rx="0.9" fill="currentColor" />
        <circle cx="12" cy="11.4" r="1.1" fill="none" stroke="currentColor" stroke-width="0.8" opacity="0.5" />
      </symbol>
      <!-- ESPADA: hoja recta con empuñadura y guarda cruzada -->
      <symbol id="palo-espada" viewBox="0 0 24 24">
        <path d="M12 2.2l1.4 12.3h-2.8L12 2.2z" fill="currentColor" />
        <rect x="7.5" y="14.6" width="9" height="2" rx="0.8" fill="currentColor" />
        <rect x="11" y="16.8" width="2" height="3.4" fill="currentColor" />
        <circle cx="12" cy="21" r="1.6" fill="none" stroke="currentColor" stroke-width="1.4" />
      </symbol>
      <!-- BASTO: garrote nudoso -->
      <symbol id="palo-basto" viewBox="0 0 24 24">
        <path d="M10.6 21l1-13.5h0.8l1 13.5z" fill="currentColor" />
        <path d="M12 2.3c2.1 0 3.4 1.4 3.4 3.1 0 1.4-1 2.3-1 2.3s1.2.3 1.2 1.6c0 1.3-1.3 2.1-2.7 2.1M12 2.3c-2.1 0-3.4 1.4-3.4 3.1 0 1.4 1 2.3 1 2.3s-1.2.3-1.2 1.6c0 1.3 1.3 2.1 2.7 2.1" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        <circle cx="9.2" cy="13.5" r="0.9" fill="currentColor" opacity="0.8" />
        <circle cx="14.8" cy="15.5" r="0.8" fill="currentColor" opacity="0.8" />
      </symbol>
    </svg>

    <!-- ===== FASE APOSTAR: reglas + apuesta ===== -->
    <div v-if="fase === 'apostar'" class="w-full max-w-xl flex flex-col items-center gap-6">
      <!-- Panel de reglas -->
      <div class="w-full flex flex-col gap-5 bg-noche/95 border border-dorado/40 rounded-2xl shadow-farol-lg p-7">
        <div class="flex justify-center items-center gap-3 mb-1">
          <span class="h-px w-8 bg-gradient-to-r from-transparent to-farol/60" />
          <h3 class="font-display text-dorado text-2xl uppercase tracking-[0.2em]">Guerra de naipes</h3>
          <span class="h-px w-8 bg-gradient-to-l from-transparent to-farol/60" />
        </div>
        <ol class="flex flex-col gap-4">
          <li class="flex items-center gap-4">
            <span class="flex justify-center items-center w-8 h-8 shrink-0 bg-farol/20 border border-farol/50 rounded-full font-display text-dorado text-base">1</span>
            <span class="font-cuerpo text-light text-lg">Elegí una carta de tu mazo</span>
          </li>
          <li class="flex items-center gap-4">
            <span class="flex justify-center items-center w-8 h-8 shrink-0 bg-farol/20 border border-farol/50 rounded-full font-display text-dorado text-base">2</span>
            <span class="font-cuerpo text-light text-lg">El pulpero elige la suya</span>
          </li>
          <li class="flex items-center gap-4">
            <span class="flex justify-center items-center w-8 h-8 shrink-0 bg-farol/20 border border-farol/50 rounded-full font-display text-dorado text-base">3</span>
            <span class="font-cuerpo text-light text-lg">La más alta gana la ronda</span>
          </li>
          <li class="flex items-center gap-4">
            <span class="flex justify-center items-center w-8 h-8 shrink-0 bg-farol/20 border border-farol/50 rounded-full font-display text-dorado text-base">4</span>
            <span class="font-cuerpo text-light text-lg">Gana el mejor de 3 rondas</span>
          </li>
        </ol>

        <div class="flex justify-center items-center gap-2.5 border-t border-dorado/20 pt-4">
          <span class="font-display text-ganancia text-xl">Paga x{{ config.NAIPES.pago }}</span>
        </div>
      </div>

      <BetSelector :seleccionada="apuesta" @elegir="elegirApuesta" />
      <button
        :disabled="!apuesta"
        class="bg-gradient-to-b from-farol to-brasa border-2 border-dorado/50 rounded-2xl text-noche font-display text-xl uppercase tracking-wide shadow-farol hover:scale-105 transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100 px-10 py-3"
        @click="comenzar"
      >
        Repartir
      </button>
    </div>

    <!-- ===== FASE JUGANDO ===== -->
    <div v-else-if="fase === 'jugando'" class="flex flex-col items-center gap-5">
      <!-- Marcador: texto suelto, sin caja -->
      <div class="flex items-center gap-5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
        <span class="font-cuerpo text-dorado/80 text-base uppercase tracking-widest">Vos</span>
        <span class="font-display text-4xl text-dorado leading-none">{{ scoreJug }}</span>
        <span class="font-display text-2xl text-light/40 leading-none">—</span>
        <span class="font-display text-4xl text-light/75 leading-none">{{ scoreCro }}</span>
        <span class="font-cuerpo text-light/60 text-base uppercase tracking-widest">Pulpero</span>
      </div>

      <!-- Mesa: tu carta a la izquierda, el pulpero a la derecha (vacía hasta jugar) -->
      <div class="flex justify-center items-center gap-12 h-[150px]">
        <div ref="viajeJugRef">
          <div ref="cartaJugRef" style="perspective:600px;">
            <NaipeCard
              v-if="enMesa.jugador"
              :carta="enMesa.jugador"
              :tapada="!reveladas"
              :estado="reveladas ? (ganadorRonda === 'jugador' ? 'ganadora' : ganadorRonda === 'croupier' ? 'perdedora' : null) : null"
            />
          </div>
        </div>

        <div ref="viajeCroRef">
          <div ref="cartaCroRef" style="perspective:600px;">
            <NaipeCard
              v-if="enMesa.croupier"
              :carta="enMesa.croupier"
              :tapada="!reveladas"
              :estado="reveladas ? (ganadorRonda === 'croupier' ? 'ganadora' : ganadorRonda === 'jugador' ? 'perdedora' : null) : null"
            />
          </div>
        </div>
      </div>

      <!-- Mensaje de ronda -->
      <p class="h-8 font-display text-3xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]" :class="ganadorRonda === 'jugador' ? 'text-ganancia' : ganadorRonda === 'croupier' ? 'text-perdida' : 'text-dorado'">
        <template v-if="reveladas && ganadorRonda === 'jugador'">¡Ganaste la ronda!</template>
        <template v-else-if="reveladas && ganadorRonda === 'croupier'">El pulpero gana la ronda</template>
        <template v-else-if="reveladas && ganadorRonda === 'empate'">Empate</template>
        <template v-else-if="fase === 'jugando' && !procesando && !rondaResuelta">Elegí una carta de tu mano</template>
      </p>

      <!-- Botón de avance: espacio reservado siempre para no empujar la mano -->
      <div class="h-[52px] flex items-center">
        <button
          v-if="rondaResuelta"
          class="bg-gradient-to-b from-farol to-brasa border-2 border-dorado/50 rounded-2xl text-noche font-display text-lg uppercase tracking-wide shadow-farol hover:scale-105 transition-all duration-200 px-9 py-3"
          @click="siguiente"
        >
          Siguiente ronda
        </button>
        <!-- Rescate: solo si el auto-avance de la última ronda no llegó (evita trabarse) -->
        <button
          v-else-if="rescateVisible"
          class="bg-gradient-to-b from-farol to-brasa border-2 border-dorado/50 rounded-2xl text-noche font-display text-lg uppercase tracking-wide shadow-farol hover:scale-105 transition-all duration-200 px-9 py-3"
          @click="finalizar"
        >
          Ver resultado
        </button>
      </div>

      <!-- Mano del jugador (todas visibles, cara arriba). Se atenúa mientras hay ronda resuelta. -->
      <div
        class="flex justify-center gap-3 transition-opacity duration-300"
        :class="rondaResuelta ? 'opacity-40' : ''"
      >
        <div
          v-for="(slot, i) in mano"
          :key="i"
          class="transition-all duration-300"
          :class="slot.jugada ? 'opacity-20 pointer-events-none' : (!rondaResuelta && !procesando ? 'hover:-translate-y-2' : '')"
        >
          <NaipeCard
            :tapada="false"
            :seleccionable="!slot.jugada && !procesando && !rondaResuelta"
            :carta="slot.carta"
            @click="jugarCarta(slot)"
          />
        </div>
      </div>
    </div>

    <!-- ===== FASE RESULTADO (pantalla limpia) ===== -->
    <div v-else-if="fase === 'resultado'" class="flex flex-col items-center gap-12">
      <div class="flex flex-col items-center gap-6 animate-resultado">
        <div class="font-display text-6xl" :class="resultadoFinal.estado === 'gano' ? 'text-ganancia' : resultadoFinal.estado === 'empate' ? 'text-dorado' : 'text-perdida'">
          {{ resultadoFinal.estado === 'gano' ? `¡Ganaste! +${formatMoneda(resultadoFinal.ganancia)}` : resultadoFinal.estado === 'empate' ? 'Empate · recuperás tu apuesta' : 'Perdiste' }}
        </div>
        <!-- Marcador final de rondas -->
        <div class="flex items-center gap-4 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
          <span class="font-cuerpo text-dorado/80 text-2xl uppercase tracking-widest">Vos</span>
          <span class="font-display text-7xl text-dorado leading-none">{{ partida.rondasJugador }}</span>
          <span class="font-display text-4xl text-light/40 leading-none">—</span>
          <span class="font-display text-7xl text-light/75 leading-none">{{ partida.rondasCroupier }}</span>
          <span class="font-cuerpo text-light/60 text-2xl uppercase tracking-widest">Pulpero</span>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <button
          class="bg-noche border-2 border-light/20 rounded-xl text-light/70 font-display text-lg uppercase tracking-wide hover:border-farol/50 hover:text-dorado transition-all duration-200 px-8 py-3"
          @click="volver"
        >
          Salir
        </button>
        <button
          data-clic
          class="bg-gradient-to-b from-farol to-brasa border-2 border-dorado/50 rounded-xl text-noche font-display text-lg uppercase tracking-wide shadow-farol hover:scale-105 transition-all duration-200 px-8 py-3"
          @click="jugarDeNuevo"
        >
          Jugar otra
        </button>
      </div>
    </div>

    </MinigameLayout>
</template>

<style scoped>
@keyframes resultado-pop {
  0% { opacity: 0; transform: scale(0.7); }
  60% { transform: scale(1.12); }
  100% { opacity: 1; transform: scale(1); }
}
.animate-resultado {
  animation: resultado-pop 0.45s ease-out;
}
</style>
