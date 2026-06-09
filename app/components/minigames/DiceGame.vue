<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { useGameConfig, formatMoneda } from '~/composables/useGameConfig'
import { useGameState } from '~/composables/useGameState'
import { useSceneManager } from '~/composables/useSceneManager'
import { useAudio } from '~/composables/useAudio'
import { tirarDados, resolverDados } from '~/game/minigames/dice'

const config = useGameConfig()
const { state, apostar, cobrar, registrarEvento } = useGameState()
const { volver } = useSceneManager()
const { sfx } = useAudio()

const apuesta = ref(null)
const prediccion = ref(null)
const fase = ref('apostar')
const tirando = ref(false)
const dados = ref({ d1: 1, d2: 1 })
const resultado = ref(null)
const veredictoVisible = ref(false) // la suma aparece primero, el veredicto después

const dado1Ref = ref(null)
const dado2Ref = ref(null)
let gsap = null

onMounted(async () => {
  gsap = (await import('gsap')).default
})

function elegirApuesta(monto) {
  apuesta.value = monto
}

function elegirPrediccion(p) {
  if (fase.value !== 'apostar') return
  prediccion.value = p
}

async function tirar() {
  if (!apuesta.value || !prediccion.value || tirando.value) return
  if (!apostar(apuesta.value)) return
  registrarEvento('jugo', { juego: 'dados' })

  tirando.value = true
  fase.value = 'tirar'
  resultado.value = null
  veredictoVisible.value = false

  const final = tirarDados()

  // Esperamos a que monten los divs de los dados antes de animarlos.
  await nextTick()

  const dur = config.ANIM.tiradaDados
  sfx('tirarDados') // suena justo cuando arranca la animación (sin desfase)
  if (gsap && dado1Ref.value && dado2Ref.value) {
    // Próximo instante (en seg, tiempo local del tween) en que cambian las
    // caras. El intervalo crece con el progreso: al inicio cambian muy seguido,
    // hacia el final cada vez menos, acompañando la desaceleración.
    let proximoCambio = 0
    gsap.to([dado1Ref.value, dado2Ref.value], {
      rotation: 1440, // 4 vueltas en ~3.3s con power3.out: arranca enérgico y desacelera
      transformOrigin: 'center',
      duration: dur,
      ease: 'power3.out',
      onUpdate: function () {
        const t = this.time()
        if (t >= proximoCambio) {
          const p = this.progress()
          // Intervalo entre cambios: ~50ms al arranque → ~400ms al final (~3.3s totales).
          // La curva (p^3) mantiene los dados girando rápido un buen rato y recién
          // sobre el final separa los cambios para que el resultado se asiente.
          proximoCambio = t + 0.05 + p * p * p * 0.35
          dados.value = { d1: 1 + Math.floor(Math.random() * 6), d2: 1 + Math.floor(Math.random() * 6) }
        }
      },
      onComplete: () => {
        dados.value = { d1: final.d1, d2: final.d2 }
        gsap.set([dado1Ref.value, dado2Ref.value], { rotation: 0 })
        finalizarTirada(final)
      }
    })
  } else {
    dados.value = { d1: final.d1, d2: final.d2 }
    finalizarTirada(final)
  }
}

function finalizarTirada(final) {
  const res = resolverDados(final.suma, prediccion.value, config)
  if (res.gano) {
    const ganancia = Math.round(apuesta.value * res.multiplicador)
    cobrar(ganancia)
    registrarEvento('gano', { juego: 'dados', apuesta: apuesta.value, ganancia })
    if (prediccion.value === 'exacto') registrarEvento('dadosExacto7', {})
    resultado.value = { gano: true, ganancia, suma: final.suma }
  } else {
    cobrar(0) // jugada terminada sin ganar → evalúa derrota
    registrarEvento('perdio', { juego: 'dados' })
    resultado.value = { gano: false, ganancia: 0, suma: final.suma }
  }
  // Primero se muestra la suma; tras un respiro aparece el veredicto (Ganaste/Perdiste).
  fase.value = 'resultado'
  tirando.value = false
  setTimeout(() => {
    veredictoVisible.value = true
    if (resultado.value.gano) sfx('plata')
  }, 650)
}

function jugarDeNuevo() {
  fase.value = 'apostar'
  prediccion.value = null
  resultado.value = null
  veredictoVisible.value = false
  if (apuesta.value > state.plata) apuesta.value = null
}

// Qué celdas (1..9 de la grilla 3x3) se encienden para cada número de dado
const PIPS = {
  1: [5],
  2: [1, 9],
  3: [1, 5, 9],
  4: [1, 3, 7, 9],
  5: [1, 3, 5, 7, 9],
  6: [1, 3, 4, 6, 7, 9]
}
// Centro (cx, cy) de cada celda 1..9 dentro del viewBox 100x100
const CELDA_POS = {
  1: [28, 28], 2: [50, 28], 3: [72, 28],
  4: [28, 50], 5: [50, 50], 6: [72, 50],
  7: [28, 72], 8: [50, 72], 9: [72, 72]
}
// Coordenadas de los pips encendidos para cada número de cara
function pipsDeCara(numero) {
  return PIPS[numero].map((celda) => CELDA_POS[celda])
}
const CARAS = [1, 2, 3, 4, 5, 6]
</script>

<template>
  <MinigameLayout titulo="El Cabildo" fondo="/assets/cabildo.png">
    <!-- Sprite SVG: las 6 caras del dado (marfil tallado), definidas una vez -->
    <svg width="0" height="0" class="absolute" aria-hidden="true">
      <defs>
        <radialGradient id="dado-marfil" cx="35%" cy="30%" r="80%">
          <stop offset="0%" stop-color="#fdf6e3" />
          <stop offset="55%" stop-color="#ecd9b0" />
          <stop offset="100%" stop-color="#cdb38a" />
        </radialGradient>
        <linearGradient id="dado-borde" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fff8ec" />
          <stop offset="100%" stop-color="#a8835a" />
        </linearGradient>
        <radialGradient id="pip" cx="38%" cy="32%" r="75%">
          <stop offset="0%" stop-color="#4a3520" />
          <stop offset="100%" stop-color="#120a04" />
        </radialGradient>
      </defs>
      <symbol v-for="n in CARAS" :id="`cara-${n}`" :key="n" viewBox="0 0 100 100">
        <rect x="4" y="4" width="92" height="92" rx="20" fill="url(#dado-borde)" />
        <rect x="7" y="7" width="86" height="86" rx="17" fill="url(#dado-marfil)" stroke="#b89a6e" stroke-width="1" />
        <!-- Brillo del farol arriba a la izquierda -->
        <ellipse cx="34" cy="28" rx="22" ry="14" fill="#fffdf6" opacity="0.35" />
        <g v-for="(p, i) in pipsDeCara(n)" :key="i">
          <circle :cx="p[0]" :cy="p[1] + 1.5" r="8" fill="#000" opacity="0.25" />
          <circle :cx="p[0]" :cy="p[1]" r="8" fill="url(#pip)" />
          <circle :cx="p[0] - 2.5" :cy="p[1] - 2.5" r="2.2" fill="#fff" opacity="0.18" />
        </g>
      </symbol>
    </svg>

    <div class="flex flex-col items-center gap-8">

      <!-- ===== FASE APOSTAR: predicción + apuesta ===== -->
      <div v-if="fase === 'apostar'" class="w-full max-w-xl flex flex-col items-center gap-8">
        <div class="flex flex-col items-center gap-3">
          <span class="font-display text-dorado text-2xl uppercase tracking-widest">A qué le jugás</span>
          <div class="flex gap-3">
            <button
              v-for="opt in [
                { id: 'menor', label: 'Menor a 7', pago: config.DADOS.pagoMayorMenor },
                { id: 'exacto', label: 'Exacto 7', pago: config.DADOS.pagoExacto7 },
                { id: 'mayor', label: 'Mayor a 7', pago: config.DADOS.pagoMayorMenor }
              ]"
              :key="opt.id"
              class="min-w-[150px] flex flex-col items-center gap-1.5 bg-noche border-2 rounded-xl px-6 py-4 transition-all duration-200"
              :class="
                prediccion === opt.id
                  ? 'border-farol text-dorado shadow-farol scale-105'
                  : 'border-madera-claro/40 text-light hover:border-farol/60 hover:text-dorado'
              "
              @click="elegirPrediccion(opt.id)"
            >
              <span class="font-display text-xl">{{ opt.label }}</span>
              <span class="font-display text-farol text-2xl">x{{ opt.pago }}</span>
            </button>
          </div>
        </div>

        <div class="mt-6">
          <BetSelector :seleccionada="apuesta" @elegir="elegirApuesta" />
        </div>
        <button
          :disabled="!apuesta || !prediccion"
          class="bg-gradient-to-b from-farol to-brasa border-2 border-dorado/50 rounded-2xl text-noche font-display text-xl uppercase tracking-wide shadow-farol hover:scale-105 transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed px-10 py-3"
          @click="tirar"
        >
          Tirar los dados
        </button>
      </div>

      <!-- ===== FASES TIRAR + RESULTADO ===== -->
      <div v-if="fase === 'tirar' || fase === 'resultado'" class="flex flex-col items-center gap-8">
        <!-- Número grande arriba (alto reservado para no mover los dados). El número
             ocupa lugar fijo; el veredicto tiene su propio alto reservado debajo para
             que aparecer no empuje al número (sin shift). -->
        <div class="h-28 flex flex-col items-center justify-start gap-1">
          <template v-if="fase === 'resultado'">
            <span class="font-display text-7xl leading-none" :class="!veredictoVisible ? 'text-dorado' : resultado.gano ? 'text-ganancia' : 'text-perdida'">{{ resultado.suma }}</span>
            <span class="h-8 font-display text-2xl uppercase tracking-wide" :class="resultado.gano ? 'text-ganancia' : 'text-perdida'">
              {{ veredictoVisible ? (resultado.gano ? `¡Ganaste! +${formatMoneda(resultado.ganancia)}` : 'Perdiste') : '' }}
            </span>
          </template>
        </div>

        <!-- Los dos dados, en fila -->
        <div class="flex justify-center items-center gap-10">
          <svg ref="dado1Ref" class="w-32 h-32 drop-shadow-[0_10px_16px_rgba(0,0,0,0.55)]" viewBox="0 0 100 100">
            <use :href="`#cara-${dados.d1}`" />
          </svg>
          <svg ref="dado2Ref" class="w-32 h-32 drop-shadow-[0_10px_16px_rgba(0,0,0,0.55)]" viewBox="0 0 100 100">
            <use :href="`#cara-${dados.d2}`" />
          </svg>
        </div>

        <!-- Botones jugar otra / salir (alto reservado para no mover los dados) -->
        <div class="h-[52px] flex items-center gap-3">
          <template v-if="fase === 'resultado' && veredictoVisible">
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
          </template>
        </div>
      </div>
    </div>
  </MinigameLayout>
</template>
