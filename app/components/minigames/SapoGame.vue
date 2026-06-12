<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useGameConfig, formatMoneda, velocidadSapoNivel } from '~/composables/useGameConfig'
import { useGameState } from '~/composables/useGameState'
import { useSceneManager } from '~/composables/useSceneManager'
import { useGameLoop } from '~/composables/useGameLoop'
import { useAudio } from '~/composables/useAudio'
import { resolverSapo, zonasSapo } from '~/game/minigames/sapo'

const config = useGameConfig()
const { state, apostar, cobrar, subirNivel, reiniciarNivel, registrarEvento } = useGameState()
const { volver } = useSceneManager()
const { sfx } = useAudio()
const loop = useGameLoop()

const apuesta = ref(null)
const fase = ref('apostar')
const resultado = ref(null)

const fuerza = ref(0.5) // posición del cursor en la barra (0..1)
let direccion = 1

const fichaVolando = ref(false)
const fichaPos = ref({ cx: 90, cy: 122, r: 7, opacidad: 1 }) // coords SVG (viewBox 180x130)
const flash = ref(false)

// Zonas según el nivel de dificultad persistente (sube al ganar, baja al perder).
const zonas = computed(() => zonasSapo(state.nivel.sapo))
const pagoMax = Math.max(...config.SAPO.zonas.map((z) => z.pago))

// Color de cada franja según el pago (verde más intenso = más paga; negro = pierde).
function colorZona(z) {
  if (z.pago <= 0) return 'rgba(10,7,5,0.92)'
  const t = z.pago / pagoMax // 0..1
  const alpha = 0.18 + t * 0.5
  return `rgba(74,158,74,${alpha})`
}

function elegirApuesta(monto) {
  apuesta.value = monto
}

function comenzar() {
  if (!apuesta.value) return
  if (!apostar(apuesta.value)) return
  registrarEvento('jugo', { juego: 'sapo' })

  resultado.value = null
  fase.value = 'jugando'
  fuerza.value = 0
  direccion = 1
  fichaVolando.value = false

  const velocidad = velocidadSapoNivel(state.nivel.sapo)
  loop.start((delta) => {
    fuerza.value += direccion * velocidad * delta
    if (fuerza.value >= 1) {
      fuerza.value = 1
      direccion = -1
    } else if (fuerza.value <= 0) {
      fuerza.value = 0
      direccion = 1
    }
  })
}

async function tirar() {
  if (fase.value !== 'jugando') return
  loop.stop()

  const res = resolverSapo(fuerza.value, state.nivel.sapo)
  await animarFicha(res)

  if (res.gano) {
    const ganancia = Math.round(apuesta.value * res.pago)
    cobrar(ganancia)
    registrarEvento('gano', { juego: 'sapo', apuesta: apuesta.value, ganancia, x3: res.pago >= pagoMax })
    if (res.pago >= pagoMax) registrarEvento('sapoX3', {}) // embocó la franja del x3
    subirNivel('sapo') // ganaste → más difícil la próxima
    sfx('plata')
    resultado.value = { gano: true, ganancia, pago: res.pago }
    flash.value = true
    setTimeout(() => (flash.value = false), 350)
  } else {
    cobrar(0) // jugada terminada sin ganar → evalúa derrota
    registrarEvento('perdio', { juego: 'sapo' })
    reiniciarNivel('sapo') // erraste → vuelve a fácil
    resultado.value = { gano: false, ganancia: 0, pago: 0 }
  }
  fase.value = 'resultado'
}

// La ficha vive DENTRO del SVG del sapo (coords del viewBox 180x130), así cae
// SIEMPRE en un punto exacto: la boca o uno de los agujeros, nunca "cerca".
function animarFicha(res) {
  return new Promise((resolve) => {
    const lado = res.centro < 0.5 ? -1 : 1 // de qué lado quedó (izq/der)
    let destino // { cx, cy, r } en coords SVG
    if (res.pago >= pagoMax) {
      destino = { cx: 90, cy: 66, r: 4 } // boca del sapo
    } else if (res.pago >= 1.5) {
      destino = { cx: 90 + lado * 24, cy: 104, r: 5 } // agujero interno (cx 66/114)
    } else if (res.gano) {
      destino = { cx: 90 + lado * 54, cy: 104, r: 5 } // agujero externo (cx 36/144)
    } else {
      destino = { cx: 90 + lado * 72, cy: 110, r: 6 } // cae en la madera, fuera de los agujeros
    }

    const origen = { cx: 90, cy: 122, r: 7 } // sale desde abajo-centro
    fichaPos.value = { ...origen, opacidad: 1 }
    fichaVolando.value = true

    const inicio = performance.now()
    const dur = 600
    const animar = (ahora) => {
      const t = Math.min((ahora - inicio) / dur, 1)
      const ease = 1 - Math.pow(1 - t, 2)
      const arco = Math.sin(t * Math.PI) * 55 // sube en parábola y baja al destino
      fichaPos.value = {
        cx: origen.cx + (destino.cx - origen.cx) * ease,
        cy: origen.cy + (destino.cy - origen.cy) * ease - arco,
        r: origen.r + (destino.r - origen.r) * ease,
        opacidad: 1
      }
      if (t < 1) {
        requestAnimationFrame(animar)
      } else {
        setTimeout(resolve, 200)
      }
    }
    requestAnimationFrame(animar)
  })
}

function jugarDeNuevo() {
  fase.value = 'apostar'
  resultado.value = null
  fichaVolando.value = false
  if (apuesta.value > state.plata) apuesta.value = null
}

// ESPACIO también tira
function onKey(e) {
  if (e.code === 'Space') {
    e.preventDefault()
    tirar()
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKey)
})
onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  loop.stop()
})
</script>

<template>
  <MinigameLayout titulo="El Sapo" fondo="/assets/feria.png">
    <div class="flex flex-col items-center gap-8">

      <!-- ===== FASE APOSTAR: reglas + apuesta ===== -->
      <div v-if="fase === 'apostar'" class="w-full max-w-xl flex flex-col items-center gap-16">
        <div class="w-full flex flex-col gap-5 bg-noche/95 border border-dorado/40 rounded-2xl shadow-farol-lg p-7">
          <ol class="flex flex-col gap-4">
            <li class="flex items-center gap-4">
              <span class="flex justify-center items-center w-9 h-9 shrink-0 bg-farol/20 border border-farol/50 rounded-full font-display text-dorado text-lg">1</span>
              <span class="font-cuerpo text-light text-xl">Clic o ESPACIO para tirar la ficha</span>
            </li>
            <li class="flex items-center gap-4">
              <span class="flex justify-center items-center w-9 h-9 shrink-0 bg-farol/20 border border-farol/50 rounded-full font-display text-dorado text-lg">2</span>
              <span class="font-cuerpo text-light text-xl">Cuanto más chico el hueco, más paga</span>
            </li>
          </ol>

          <div class="flex justify-center items-center gap-2.5 border-t border-dorado/20 pt-4">
            <span class="font-display text-ganancia text-2xl">Paga hasta x{{ pagoMax }}</span>
          </div>
        </div>

        <div class="w-full flex flex-col items-center gap-6">
          <BetSelector :seleccionada="apuesta" @elegir="elegirApuesta" />
          <button
            :disabled="!apuesta"
            class="bg-gradient-to-b from-farol to-brasa border-2 border-dorado/50 rounded-2xl text-noche font-display text-2xl uppercase tracking-wide shadow-farol hover:scale-105 transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed px-12 py-3.5"
            @click="comenzar"
          >
            Tirar
          </button>
        </div>
      </div>

      <!-- ===== JUGANDO + RESULTADO: sapo, ficha y barra de fuerza ===== -->
      <template v-if="fase !== 'apostar'">
        <!-- Escena del sapo -->
        <div class="w-[440px] h-[250px] relative flex justify-center items-end">
          <!-- Flash al embocar -->
          <div
            class="absolute inset-0 bg-ganancia/30 rounded-full blur-2xl transition-opacity duration-300"
            :class="flash ? 'opacity-100' : 'opacity-0'"
          />

          <!-- Sapo sobre la tabla -->
          <svg width="360" height="250" viewBox="0 0 180 130" class="relative z-0">
            <defs>
              <linearGradient id="sapo-tabla" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#7a4e26"/>
                <stop offset="100%" stop-color="#3a2410"/>
              </linearGradient>
              <radialGradient id="sapo-cuerpo" cx="42%" cy="28%" r="78%">
                <stop offset="0%" stop-color="#6fae57"/>
                <stop offset="48%" stop-color="#3f7a35"/>
                <stop offset="100%" stop-color="#1d3a18"/>
              </radialGradient>
              <radialGradient id="sapo-panza" cx="50%" cy="40%" r="70%">
                <stop offset="0%" stop-color="#cdd98a"/>
                <stop offset="100%" stop-color="#7d8a4a"/>
              </radialGradient>
              <radialGradient id="sapo-hueco" cx="50%" cy="35%" r="70%">
                <stop offset="0%" stop-color="#3a1410"/>
                <stop offset="100%" stop-color="#0a0603"/>
              </radialGradient>
              <radialGradient id="sapo-moneda" cx="38%" cy="32%" r="70%">
                <stop offset="0%" stop-color="#ffe9a8"/>
                <stop offset="50%" stop-color="#d4a23a"/>
                <stop offset="100%" stop-color="#7a5414"/>
              </radialGradient>
            </defs>

            <!-- Tabla (ancha, los agujeros respiran adentro) -->
            <rect x="2" y="84" width="176" height="40" rx="7" fill="url(#sapo-tabla)" stroke="#241408" stroke-width="2"/>
            <!-- Agujeros externos (pago bajo): cx 36 / 144 -->
            <ellipse cx="36" cy="104" rx="10" ry="5" fill="url(#sapo-hueco)"/>
            <ellipse cx="144" cy="104" rx="10" ry="5" fill="url(#sapo-hueco)"/>
            <!-- Agujeros internos (pago medio): cx 66 / 114 -->
            <ellipse cx="66" cy="104" rx="9" ry="5" fill="url(#sapo-hueco)"/>
            <ellipse cx="114" cy="104" rx="9" ry="5" fill="url(#sapo-hueco)"/>

            <!-- Sombra del sapo -->
            <ellipse cx="90" cy="86" rx="50" ry="9" fill="#000" opacity="0.3"/>

            <!-- Patas traseras -->
            <ellipse cx="50" cy="80" rx="16" ry="9" fill="#2f5e28" stroke="#16300f" stroke-width="1.2"/>
            <ellipse cx="130" cy="80" rx="16" ry="9" fill="#2f5e28" stroke="#16300f" stroke-width="1.2"/>
            <!-- Manos delanteras -->
            <ellipse cx="64" cy="84" rx="7" ry="4" fill="#4f8a3f" stroke="#16300f" stroke-width="1"/>
            <ellipse cx="116" cy="84" rx="7" ry="4" fill="#4f8a3f" stroke="#16300f" stroke-width="1"/>

            <!-- Cuerpo -->
            <path d="M 48 70 Q 40 36, 90 32 Q 140 36, 132 70 Q 132 82, 90 84 Q 48 82, 48 70 Z"
              fill="url(#sapo-cuerpo)" stroke="#16300f" stroke-width="2"/>
            <!-- Panza -->
            <ellipse cx="90" cy="70" rx="34" ry="14" fill="url(#sapo-panza)" opacity="0.85"/>
            <!-- Manchas -->
            <circle cx="62" cy="50" r="4" fill="#2a5520" opacity="0.6"/>
            <circle cx="118" cy="50" r="4" fill="#2a5520" opacity="0.6"/>
            <circle cx="78" cy="44" r="3" fill="#2a5520" opacity="0.5"/>
            <circle cx="104" cy="46" r="3.5" fill="#2a5520" opacity="0.5"/>

            <!-- Ojos saltones -->
            <circle cx="72" cy="34" r="11" fill="url(#sapo-cuerpo)" stroke="#16300f" stroke-width="1.5"/>
            <circle cx="108" cy="34" r="11" fill="url(#sapo-cuerpo)" stroke="#16300f" stroke-width="1.5"/>
            <circle cx="72" cy="33" r="6.5" fill="#f4e6a0"/>
            <circle cx="108" cy="33" r="6.5" fill="#f4e6a0"/>
            <circle cx="73" cy="34" r="3.2" fill="#0a0603"/>
            <circle cx="109" cy="34" r="3.2" fill="#0a0603"/>
            <circle cx="70" cy="31" r="1.4" fill="#fff" opacity="0.8"/>
            <circle cx="106" cy="31" r="1.4" fill="#fff" opacity="0.8"/>

            <!-- Boca abierta (el objetivo) -->
            <ellipse cx="90" cy="66" rx="16" ry="11" fill="url(#sapo-hueco)" stroke="#9ed18a" stroke-width="2"/>
            <ellipse cx="90" cy="62" rx="11" ry="4" fill="#7a2018" opacity="0.7"/>

            <!-- Ficha (moneda) que vuela, en las mismas coords del sapo -->
            <g v-if="fichaVolando" :opacity="fichaPos.opacidad">
              <circle :cx="fichaPos.cx" :cy="fichaPos.cy" :r="fichaPos.r" fill="url(#sapo-moneda)" stroke="#5a3e10" stroke-width="1"/>
              <circle :cx="fichaPos.cx" :cy="fichaPos.cy" :r="fichaPos.r * 0.6" fill="none" stroke="#7a5414" stroke-width="0.5" opacity="0.6"/>
            </g>
          </svg>

        </div>

        <!-- Bloque inferior de ALTO FIJO: barra mientras jugás, resultado después -->
        <div class="w-[440px] h-[180px] flex flex-col justify-start items-center">
          <!-- Barra de fuerza -->
          <div
            v-if="fase === 'jugando'"
            class="w-full flex flex-col gap-3 cursor-pointer"
            @click="tirar"
          >
            <p class="text-center font-display text-2xl text-dorado">¡Tirá con la fuerza justa!</p>
            <div class="w-full h-14 relative bg-noche/80 border-2 border-madera-claro/40 rounded-xl overflow-hidden">
              <!-- Franjas -->
              <div
                v-for="(z, i) in zonas"
                :key="i"
                class="h-full absolute"
                :style="`left:${z.ini * 100}%; width:${(z.fin - z.ini) * 100}%; background:${colorZona(z)};`"
              />
              <!-- Separadores -->
              <div
                v-for="(z, i) in zonas"
                :key="'s' + i"
                class="w-px h-full absolute bg-noche/60"
                :style="`left:${z.ini * 100}%;`"
              />
              <!-- Cursor de fuerza -->
              <div
                class="w-2 h-full absolute bg-dorado shadow-farol-lg"
                :style="`left:${fuerza * 100}%; transform: translateX(-50%);`"
              />
            </div>
          </div>

          <!-- Resultado -->
          <div v-else-if="fase === 'resultado'" class="flex flex-col items-center gap-5 pt-2">
            <div class="font-display text-4xl" :class="resultado.gano ? 'text-ganancia' : 'text-perdida'">
              {{ resultado.gano ? `¡Ganaste! x${resultado.pago} · +${formatMoneda(resultado.ganancia)}` : 'Erraste' }}
            </div>
            <div class="flex items-center gap-3">
              <button
                class="bg-noche border-2 border-light/20 rounded-xl text-light/70 font-display text-xl hover:border-farol/50 hover:text-dorado transition-all duration-200 px-10 py-3.5"
                @click="volver"
              >
                Salir
              </button>
              <button
                data-clic
                class="bg-noche border-2 border-farol/50 rounded-xl text-dorado font-display text-xl hover:bg-farol/10 hover:scale-105 transition-all duration-200 px-10 py-3.5"
                @click="jugarDeNuevo"
              >
                Jugar otra
              </button>
            </div>
          </div>
        </div>
      </template>
    </div>
  </MinigameLayout>
</template>
