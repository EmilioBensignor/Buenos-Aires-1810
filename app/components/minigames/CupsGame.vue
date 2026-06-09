<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { useGameConfig, formatMoneda } from '~/composables/useGameConfig'
import { useGameState } from '~/composables/useGameState'
import { useSceneManager } from '~/composables/useSceneManager'
import { useAudio } from '~/composables/useAudio'
import { generarBarajada, duracionSwap, resolverCubiletes } from '~/game/minigames/cups'

const config = useGameConfig()
const { state, apostar, cobrar, subirNivel, reiniciarNivel, registrarEvento } = useGameState()
const { volver } = useSceneManager()
const { sfx } = useAudio()

const apuesta = ref(null)
const fase = ref('apostar')
const resultado = ref(null)

const cupRefs = [ref(null), ref(null), ref(null)]
const vasoRefs = [ref(null), ref(null), ref(null)] // solo el SVG del cubilete (sin bolita)
// orden[posVisual] = idCubilete. Empezamos en identidad.
const orden = ref([0, 1, 2])
const bolitaEn = ref(0) // en qué CUBILETE (id) está la bolita
const mostrandoBolita = ref(false)
const barajando = ref(false)
const resultadoMostrado = ref(false) // bolita visibile en fase resultado

let gsap = null
let barajadaData = null

const POS_X = [-175, 0, 175]

onMounted(async () => {
  gsap = (await import('gsap')).default
})

function elegirApuesta(monto) {
  apuesta.value = monto
}

async function comenzar() {
  if (!apuesta.value) return
  if (!apostar(apuesta.value)) return
  registrarEvento('jugo', { juego: 'cubiletes' })

  resultado.value = null
  orden.value = [0, 1, 2]
  resultadoMostrado.value = false

  barajadaData = generarBarajada(config, state.nivel.cubiletes)
  bolitaEn.value = barajadaData.posInicial

  // Esperamos a que monten los divs antes de posicionar
  fase.value = 'mostrar'
  await nextTick()
  resetPosiciones()
  mostrandoBolita.value = true
  levantarVaso(bolitaEn.value)
  await esperar(1300)
  bajarVaso(bolitaEn.value)
  await esperar(350)
  mostrandoBolita.value = false
  await esperar(200)

  fase.value = 'barajar'
  barajando.value = true
  sfx('moverCubiletes')
  await ejecutarBarajada()
  barajando.value = false

  fase.value = 'elegir'
}

function resetPosiciones() {
  if (!gsap) return
  for (let i = 0; i < 3; i++) {
    if (cupRefs[i].value) gsap.set(cupRefs[i].value, { x: POS_X[i], y: 0 })
    if (vasoRefs[i].value) gsap.set(vasoRefs[i].value, { y: 0, rotation: 0 })
  }
}

// Levanta solo el vaso (SVG) del cubilete `id`, dejando la bolita apoyada en el paño
function levantarVaso(id) {
  if (!gsap || !vasoRefs[id].value) return
  gsap.to(vasoRefs[id].value, { y: -150, rotation: -6, duration: 0.35, ease: 'back.out(1.6)' })
}

function bajarVaso(id) {
  if (!gsap || !vasoRefs[id].value) return
  gsap.to(vasoRefs[id].value, { y: 0, rotation: 0, duration: 0.3, ease: 'power1.in' })
}

async function ejecutarBarajada() {
  const swaps = barajadaData.swaps
  for (let i = 0; i < swaps.length; i++) {
    const [a, b] = swaps[i]
    const dur = duracionSwap(i, swaps.length, config, state.nivel.cubiletes)
    await animarSwap(a, b, dur)
  }
}

// a, b = posiciones visuales (0..2). Intercambia los cubiletes que estén ahí.
function animarSwap(a, b, dur) {
  return new Promise((resolve) => {
    const cubA = orden.value[a]
    const cubB = orden.value[b]
    if (!gsap || cupRefs[cubA].value == null) {
      ;[orden.value[a], orden.value[b]] = [orden.value[b], orden.value[a]]
      resolve()
      return
    }
    const elA = cupRefs[cubA].value
    const elB = cupRefs[cubB].value
    // Arco: uno sube, otro baja, para que se "crucen"
    const tl = gsap.timeline({ onComplete: () => {
      ;[orden.value[a], orden.value[b]] = [orden.value[b], orden.value[a]]
      resolve()
    }})
    tl.to(elA, { x: POS_X[b], y: -90, duration: dur, ease: 'power1.inOut' }, 0)
    tl.to(elB, { x: POS_X[a], y: 90, duration: dur, ease: 'power1.inOut' }, 0)
    tl.to([elA, elB], { y: 0, duration: dur * 0.3, ease: 'power1.in' }, dur * 0.7)
  })
}

function elegir(posVisual) {
  if (fase.value !== 'elegir') return
  const cubElegido = orden.value[posVisual]
  const res = resolverCubiletes(cubElegido, bolitaEn.value, config)
  resultadoMostrado.value = true // muestra la bolita debajo del/los cubilete(s)
  levantarVaso(cubElegido)
  // Si erró, también revelamos dónde estaba la bolita
  if (!res.gano) levantarVaso(bolitaEn.value)
  if (res.gano) {
    const ganancia = Math.round(apuesta.value * res.multiplicador)
    cobrar(ganancia)
    // Evento con el nivel CON EL QUE se ganó (antes de subir).
    registrarEvento('gano', { juego: 'cubiletes', apuesta: apuesta.value, ganancia })
    registrarEvento('cubiletesNivel', { nivel: state.nivel.cubiletes })
    subirNivel('cubiletes') // ganaste → más difícil la próxima
    sfx('plata')
    resultado.value = { gano: true, ganancia }
  } else {
    cobrar(0) // jugada terminada sin ganar → evalúa derrota
    registrarEvento('perdio', { juego: 'cubiletes' })
    reiniciarNivel('cubiletes') // erraste → vuelve a fácil
    resultado.value = { gano: false, ganancia: 0 }
  }
  setTimeout(() => (fase.value = 'resultado'), 900)
}

function jugarDeNuevo() {
  fase.value = 'apostar'
  resultado.value = null
  orden.value = [0, 1, 2]
  resultadoMostrado.value = false
  resetPosiciones()
  if (apuesta.value > state.plata) apuesta.value = null
}

function esperar(ms) {
  return new Promise((r) => setTimeout(r, ms))
}
</script>

<template>
  <MinigameLayout titulo="El Mercado" fondo="/assets/casadejuego.png">
    <div class="flex flex-col items-center gap-4">
      <p class="h-10 font-display text-3xl" :class="fase === 'resultado' ? (resultado.gano ? 'text-ganancia' : 'text-perdida') : 'text-dorado'">
        <template v-if="fase === 'mostrar'">¡Mirá bien dónde está la bolita!</template>
        <template v-else-if="fase === 'barajar'">Seguila con la vista...</template>
        <template v-else-if="fase === 'elegir'">Elegí un cubilete</template>
        <template v-else-if="fase === 'resultado'">{{ resultado.gano ? `¡Ganaste! +${formatMoneda(resultado.ganancia)}` : 'Perdiste' }}</template>
      </p>

      <div v-if="fase !== 'apostar'" class="w-[860px] h-[360px] relative flex justify-center items-end">
        <div
          v-for="id in 3"
          :key="id - 1"
          :ref="cupRefs[id - 1]"
          class="w-[175px] absolute bottom-8 left-1/2 -ml-[87.5px] z-10 cursor-pointer flex flex-col items-center"
          @click="fase === 'elegir' ? elegir(orden.indexOf(id - 1)) : null"
        >
          <!-- Bolita roja (apoyada en la base, a la altura de los cubiletes; solo el vaso se levanta) -->
          <div
            v-if="(mostrandoBolita && bolitaEn === id - 1) || (resultadoMostrado && bolitaEn === id - 1)"
            class="absolute bottom-2 left-1/2 -translate-x-1/2 z-0"
          >
            <svg width="64" height="64" viewBox="0 0 34 34">
              <defs>
                <radialGradient id="bolita" cx="38%" cy="32%" r="70%">
                  <stop offset="0%" stop-color="#ff8a6e"/>
                  <stop offset="35%" stop-color="#e23a2e"/>
                  <stop offset="100%" stop-color="#7a1410"/>
                </radialGradient>
              </defs>
              <!-- Sombra en el paño -->
              <ellipse cx="17" cy="31" rx="11" ry="3" fill="#000" opacity="0.35"/>
              <circle cx="17" cy="15" r="13" fill="url(#bolita)"/>
              <!-- Reflejo del farol -->
              <ellipse cx="13" cy="10" rx="4" ry="3" fill="#fff" opacity="0.5"/>
            </svg>
          </div>

          <!-- Cubilete SVG: madera criolla -->
          <svg :ref="vasoRefs[id - 1]" width="175" height="180" viewBox="0 0 76 78" class="relative z-10 origin-bottom drop-shadow-[0_8px_12px_rgba(0,0,0,0.55)]">
            <defs>
              <linearGradient id="madera" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#3a2410"/>
                <stop offset="22%" stop-color="#6b4422"/>
                <stop offset="48%" stop-color="#9c6b3a"/>
                <stop offset="50%" stop-color="#a7763f"/>
                <stop offset="72%" stop-color="#6b4422"/>
                <stop offset="100%" stop-color="#2e1c0c"/>
              </linearGradient>
              <linearGradient id="aro" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#8a5a30"/>
                <stop offset="100%" stop-color="#4a2e16"/>
              </linearGradient>
              <radialGradient id="aro-int" cx="50%" cy="40%" r="60%">
                <stop offset="0%" stop-color="#1a0f06"/>
                <stop offset="100%" stop-color="#0a0603"/>
              </radialGradient>
            </defs>

            <!-- Sombra proyectada sobre el paño (lo ancla a la mesa) -->
            <ellipse cx="38" cy="70" rx="30" ry="6" fill="#000" opacity="0.38"/>

            <!-- Boca oscura (abajo, apoyada en el paño) -->
            <ellipse cx="38" cy="66" rx="26" ry="8" fill="url(#aro-int)"/>

            <!-- Cuerpo del cubilete (boca abajo: angosto arriba, ancho abajo) -->
            <path
              d="M 22 14 Q 18 42, 12 66 Q 38 75, 64 66 Q 58 42, 54 14 Q 38 9, 22 14 Z"
              fill="url(#madera)"
              stroke="#241408"
              stroke-width="1"
            />

            <!-- Vetas de la madera -->
            <line x1="38" y1="14" x2="38" y2="66" stroke="#2e1c0c" stroke-width="0.6" opacity="0.4"/>
            <line x1="28" y1="18" x2="22" y2="62" stroke="#2e1c0c" stroke-width="0.5" opacity="0.3"/>
            <line x1="48" y1="18" x2="54" y2="62" stroke="#2e1c0c" stroke-width="0.5" opacity="0.3"/>
            <line x1="32" y1="16" x2="28" y2="60" stroke="#5a3a1e" stroke-width="0.5" opacity="0.3"/>

            <!-- Brillo del farol (lado izquierdo) -->
            <path
              d="M 25 16 Q 20 42, 15 62 L 19 63 Q 24 42, 28 17 Z"
              fill="#d99a5a"
              opacity="0.25"
            />

            <!-- Zuncho / aro reforzado cerca de la boca -->
            <path d="M 14 58 Q 38 65, 62 58 Q 62 61, 61 62 Q 38 69, 15 62 Q 14 61, 14 58 Z" fill="#4a2e16" opacity="0.55"/>

            <!-- Tapa superior (base cerrada del cubilete, vista apenas elíptica) -->
            <ellipse cx="38" cy="14" rx="16" ry="5.5" fill="url(#aro)" stroke="#241408" stroke-width="0.8"/>
            <ellipse cx="38" cy="13" rx="13" ry="4" fill="#8a5a30" opacity="0.5"/>
          </svg>
        </div>
      </div>

      <!-- ===== FASE APOSTAR: reglas + apuesta ===== -->
    <div v-if="fase === 'apostar'" class="w-full max-w-xl flex flex-col items-center gap-16">
      <!-- Panel de reglas -->
      <div class="w-full flex flex-col gap-5 bg-noche/95 border border-dorado/40 rounded-2xl shadow-farol-lg p-7">
        <div class="flex justify-center items-center gap-3 mb-1">
          <span class="h-px w-8 bg-gradient-to-r from-transparent to-farol/60" />
          <h3 class="font-display text-dorado text-2xl uppercase tracking-[0.2em]">Los tres cubiletes</h3>
          <span class="h-px w-8 bg-gradient-to-l from-transparent to-farol/60" />
        </div>

        <ol class="flex flex-col gap-4">
          <li class="flex items-center gap-4">
            <span class="flex justify-center items-center w-8 h-8 shrink-0 bg-farol/20 border border-farol/50 rounded-full font-display text-dorado text-base">1</span>
            <span class="font-cuerpo text-light text-lg">Seguí la bolita con la mirada</span>
          </li>
          <li class="flex items-center gap-4">
            <span class="flex justify-center items-center w-8 h-8 shrink-0 bg-farol/20 border border-farol/50 rounded-full font-display text-dorado text-base">2</span>
            <span class="font-cuerpo text-light text-lg">Elegí el cubilete correcto</span>
          </li>
          <li class="flex items-center gap-4">
            <span class="flex justify-center items-center w-8 h-8 shrink-0 bg-farol/20 border border-farol/50 rounded-full font-display text-dorado text-base">3</span>
            <span class="font-cuerpo text-light text-lg">Cuanto más acertés, más rápido se moverán</span>
          </li>
        </ol>

        <div class="flex justify-center items-center gap-2.5 border-t border-dorado/20 pt-4">
          <span class="font-display text-ganancia text-xl">Paga x{{ config.CUBILETES.pago }}</span>
        </div>
      </div>

      <div class="w-full flex flex-col items-center gap-6">
        <BetSelector :seleccionada="apuesta" @elegir="elegirApuesta" />
        <button
          :disabled="!apuesta"
          class="bg-gradient-to-b from-farol to-brasa border-2 border-dorado/50 rounded-2xl text-noche font-display text-xl uppercase tracking-wide shadow-farol hover:scale-105 transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed px-10 py-3"
          @click="comenzar"
        >
          Empezar
        </button>
      </div>
    </div>

      <div v-if="fase !== 'apostar'" class="h-[52px] flex items-center gap-3">
        <template v-if="fase === 'resultado'">
          <button
            class="bg-noche border-2 border-light/20 rounded-xl text-light/70 font-display text-lg hover:border-farol/50 hover:text-dorado transition-all duration-200 px-8 py-3"
            @click="volver"
          >
            Salir
          </button>
          <button
            data-clic
            class="bg-noche border-2 border-farol/50 rounded-xl text-dorado font-display text-lg hover:bg-farol/10 hover:scale-105 transition-all duration-200 px-8 py-3"
            @click="jugarDeNuevo"
          >
            Jugar otra
          </button>
        </template>
      </div>
    </div>
  </MinigameLayout>
</template>
