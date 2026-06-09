<script setup>
import { ref, reactive, onMounted, onUnmounted, nextTick } from 'vue'
import { useGameConfig, formatMoneda } from '~/composables/useGameConfig'
import { useGameState } from '~/composables/useGameState'
import { useSceneManager } from '~/composables/useSceneManager'
import { useAudio } from '~/composables/useAudio'
import { generarMano, cobroMano } from '~/game/minigames/bingo'

const config = useGameConfig()
const { state, apostar, cobrar, registrarEvento } = useGameState()
const { volver } = useSceneManager()
const { sfx } = useAudio()

const apuesta = ref(null)
const fase = ref('apostar') // apostar · cantar · resultado
const resultado = ref(null)

let mano = null
const jugadores = ref([]) // [{ esVos, nombre, carton, marcado(Set), hizoLinea, hizoBingo }]
const bolillaActual = ref(null) // número en el pico
const esperandoClic = ref(false) // bolilla tuya esperando que la marques
const idxBombo = ref(0)
const anuncio = ref(null) // { tipo:'linea'|'bingo', ganador, esVos }
const cantadas = ref([]) // números ya salidos (para historial visual)
const bolillaSvg = ref(null)

let cancelado = false
let gsap = null

onMounted(async () => {
  gsap = (await import('gsap')).default
})
onUnmounted(() => {
  cancelado = true
})

// Animación de la bolilla al salir: gira y se asienta (estilo dados).
async function animarBolilla() {
  await nextTick()
  if (!gsap || !bolillaSvg.value) return
  gsap.fromTo(
    bolillaSvg.value,
    { rotation: -220, scale: 0.5, opacity: 0, transformOrigin: '50% 50%' },
    { rotation: 0, scale: 1, opacity: 1, duration: 0.55, ease: 'back.out(1.7)' }
  )
}

function elegirApuesta(monto) {
  apuesta.value = monto
}

async function empezar() {
  if (!apuesta.value) return
  if (!apostar(apuesta.value)) return
  registrarEvento('jugo', { juego: 'bingo' })

  cancelado = false
  resultado.value = null
  anuncio.value = null
  cantadas.value = []
  idxBombo.value = 0
  bolillaActual.value = null
  esperandoClic.value = false

  mano = generarMano(config)
  jugadores.value = mano.jugadores.map((j) => ({
    esVos: j.esVos,
    nombre: j.nombre,
    carton: j.carton,
    marcado: reactive(new Set()),
    hizoLinea: false,
    hizoBingo: false
  }))

  fase.value = 'cantar'
  await nextTick()
  cantarSiguiente()
}

const vos = () => jugadores.value[0]

function tengoEnCarton(jug, n) {
  return jug.carton.numeros.includes(n)
}

// Marca un número en las viejas que lo tengan, con un delay humano random por
// cada una (no instantáneo/robótico). Vos marcás a mano con clic. El delay hace
// que en los empates no veas a la vieja "ya ganada" antes de poder reaccionar.
function marcarViejas(n) {
  for (let i = 1; i < jugadores.value.length; i++) {
    const jug = jugadores.value[i]
    if (!tengoEnCarton(jug, n)) continue
    const demora = config.BINGO.viejaMarcaMin + Math.random() * (config.BINGO.viejaMarcaMax - config.BINGO.viejaMarcaMin)
    setTimeout(() => {
      if (cancelado) return
      jug.marcado.add(n)
    }, demora)
  }
}

function esperar(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function cantarSiguiente() {
  if (cancelado) return

  // ¿Se resolvió un premio en este turno? (idxBombo es el turno que acaba de salir)
  // Lo chequeamos DESPUÉS de marcar, abajo.

  if (idxBombo.value >= mano.bombo.length) {
    return finalizar()
  }

  const n = mano.bombo[idxBombo.value]
  bolillaActual.value = n
  cantadas.value.push(n)
  animarBolilla()

  // En el turno del BINGO ganador, el canteo se termina: marcamos SOLO al ganador
  // (los perdedores quedan a medias, no se llenan). Así no se ven 4 cartones llenos
  // y se nota que el ganador llegó primero.
  const turnoFinal = idxBombo.value === mano.turnoBingoGanador
  if (turnoFinal) {
    const ganador = jugadores.value[mano.ganadorBingo]
    if (mano.ganadorBingo === 0 && tengoEnCarton(vos(), n) && !vos().marcado.has(n)) {
      // Ganás vos y la bolilla final es tuya sin marcar: esperá tu clic para cerrar.
      esperandoClic.value = true
    } else {
      // Gana una vieja, o tu última celda ya está marcada: cerramos solos.
      if (tengoEnCarton(ganador, n)) ganador.marcado.add(n)
      await esperar(config.BINGO.msEntreCantos)
      await avanzarTurno()
    }
    return
  }

  // Las viejas marcan al toque (delay humano).
  marcarViejas(n)

  if (tengoEnCarton(vos(), n)) {
    // Bolilla tuya: esperá que la marques (no avanza hasta el clic).
    esperandoClic.value = true
  } else {
    // No es tuya: pausa y seguimos.
    await esperar(config.BINGO.msEntreCantos)
    await avanzarTurno()
  }
}

// El jugador clickeó su celda con el número en el pico.
async function marcarMia(n) {
  if (!esperandoClic.value) return
  if (n !== bolillaActual.value) return // solo la del pico
  vos().marcado.add(n)
  esperandoClic.value = false
  await esperar(180) // respiro corto tras marcar
  await avanzarTurno()
}

// Tras resolver el turno actual: chequear premios, avanzar índice, seguir.
async function avanzarTurno() {
  if (cancelado) return

  // ¿Este turno disparó la línea o el bingo ganadores?
  if (idxBombo.value === mano.turnoLineaGanadora && !anuncio.value?.lineaMostrada) {
    await anunciarPremio('linea')
  }
  if (idxBombo.value === mano.turnoBingoGanador) {
    await anunciarPremio('bingo')
    return finalizar()
  }

  idxBombo.value++
  bolillaActual.value = null
  await nextTick()
  cantarSiguiente()
}

async function anunciarPremio(tipo) {
  const ganadorIdx = tipo === 'linea' ? mano.ganadorLinea : mano.ganadorBingo
  const jug = jugadores.value[ganadorIdx]
  if (tipo === 'linea') jug.hizoLinea = true
  else jug.hizoBingo = true

  anuncio.value = {
    tipo,
    ganador: jug.nombre,
    esVos: jug.esVos,
    lineaMostrada: tipo === 'linea' || anuncio.value?.lineaMostrada
  }
  await esperar(config.BINGO.msRevelarPremio)
  if (cancelado) return
  // El anuncio de línea se limpia para no tapar el tablero; el de bingo queda.
  if (tipo === 'linea') anuncio.value = { ...anuncio.value, tipo: null }
}

function finalizar() {
  if (cancelado) return
  const { multiplicador } = cobroMano(mano, config)
  const gano = multiplicador > 0
  const ganancia = Math.round(apuesta.value * multiplicador)
  cobrar(ganancia) // 0 si no ganó nada → evalúa derrota
  if (gano) sfx('plata')

  resultado.value = {
    gano,
    ganancia,
    ganasteLinea: mano.ganadorLinea === 0,
    ganasteBingo: mano.ganadorBingo === 0
  }
  if (gano) {
    registrarEvento('gano', { juego: 'bingo', apuesta: apuesta.value, ganancia })
    if (resultado.value.ganasteLinea && resultado.value.ganasteBingo) registrarEvento('bingoDoble', {})
  } else {
    registrarEvento('perdio', { juego: 'bingo' })
  }
  fase.value = 'resultado'
}

function jugarDeNuevo() {
  fase.value = 'apostar'
  resultado.value = null
  anuncio.value = null
  if (apuesta.value > state.plata) apuesta.value = null
}

// Letra B-I-N-G-O según la columna (estilo bingo clásico 75 bolillas).
const LETRAS = ['B', 'I', 'N', 'G', 'O']
</script>

<template>
  <MinigameLayout titulo="La Iglesia" fondo="/assets/iglesia.png">
    <!-- ===== FASE APOSTAR ===== -->
    <div v-if="fase === 'apostar'" class="w-full max-w-xl flex flex-col items-center gap-12">
      <div class="w-full flex flex-col gap-5 bg-noche/95 border border-dorado/40 rounded-2xl shadow-farol-lg p-7">
        <div class="flex justify-center items-center gap-3 mb-1">
          <span class="h-px w-8 bg-gradient-to-r from-transparent to-farol/60" />
          <h3 class="font-display text-dorado text-2xl uppercase tracking-[0.2em]">El Bingo</h3>
          <span class="h-px w-8 bg-gradient-to-l from-transparent to-farol/60" />
        </div>

        <ol class="flex flex-col gap-4">
          <li class="flex items-center gap-4">
            <span class="flex justify-center items-center w-8 h-8 shrink-0 bg-farol/20 border border-farol/50 rounded-full font-display text-dorado text-base">1</span>
            <span class="font-cuerpo text-light text-lg">Competís contra las campeonas de la iglesia</span>
          </li>
          <li class="flex items-center gap-4">
            <span class="flex justify-center items-center w-8 h-8 shrink-0 bg-farol/20 border border-farol/50 rounded-full font-display text-dorado text-base">2</span>
            <span class="font-cuerpo text-light text-lg">Cuando salga tu número, tocalo en tu cartón</span>
          </li>
          <li class="flex items-center gap-4">
            <span class="flex justify-center items-center w-8 h-8 shrink-0 bg-farol/20 border border-farol/50 rounded-full font-display text-dorado text-base">3</span>
            <span class="font-cuerpo text-light text-lg">Si tenés línea o bingo, ¡cantalo!</span>
          </li>
        </ol>

        <div class="flex justify-center items-center gap-6 border-t border-dorado/20 pt-4">
          <span class="font-display text-ganancia text-xl">Línea paga x{{ config.BINGO.pagoLinea }}</span>
          <span class="font-display text-dorado/40 text-xl">·</span>
          <span class="font-display text-ganancia text-xl">Bingo paga x{{ config.BINGO.pagoBingo }}</span>
        </div>
      </div>

      <div class="w-full flex flex-col items-center gap-6">
        <BetSelector :seleccionada="apuesta" @elegir="elegirApuesta" />
        <button
          :disabled="!apuesta"
          class="bg-gradient-to-b from-farol to-brasa border-2 border-dorado/50 rounded-2xl text-noche font-display text-xl uppercase tracking-wide shadow-farol hover:scale-105 transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed px-10 py-3"
          @click="empezar()"
        >
          Empezar
        </button>
      </div>
    </div>

    <!-- ===== FASE CANTAR + RESULTADO ===== -->
    <div v-if="fase === 'cantar' || fase === 'resultado'" class="w-full flex flex-col items-center gap-3">

      <!-- Anuncio / resultado: alto reservado para no mover el tablero -->
      <div class="h-14 flex flex-col items-center justify-center gap-0.5">
        <template v-if="fase === 'resultado'">
          <span class="font-display text-4xl leading-none uppercase tracking-wide" :class="resultado.gano ? 'text-ganancia' : 'text-perdida'">
            {{ resultado.gano ? `¡Ganaste! +${formatMoneda(resultado.ganancia)}` : 'Perdiste' }}
          </span>
          <span v-if="resultado.gano" class="font-display text-dorado text-base uppercase tracking-[0.25em]">
            {{ resultado.ganasteLinea && resultado.ganasteBingo ? 'Línea + Bingo' : resultado.ganasteBingo ? 'Bingo' : 'Línea' }}
          </span>
        </template>
        <template v-else-if="anuncio && anuncio.tipo">
          <span class="font-display text-4xl leading-none uppercase tracking-wide" :class="anuncio.esVos ? 'text-ganancia' : 'text-perdida'">
            {{ anuncio.tipo === 'bingo' ? '¡Bingo!' : '¡Línea!' }}
          </span>
          <span class="font-cuerpo text-light/70 text-base">
            {{ anuncio.esVos ? 'La cantaste vos' : `La cantó ${anuncio.ganador}` }}
          </span>
        </template>
        <template v-else-if="esperandoClic">
          <span class="font-display text-dorado text-2xl uppercase tracking-wide animate-pulse">¡Es tuyo! Tocalo en tu cartón</span>
        </template>
        <template v-else>
          <span class="font-cuerpo text-light/50 text-lg italic">Cantando bolillas...</span>
        </template>
      </div>

      <!-- Mesa de la parroquia: tu cartón a la izquierda; a la derecha el
           bolillero arriba y los 3 cartones de las campeonas abajo. -->
      <div class="w-[940px] grid grid-cols-[380px_1fr] items-start gap-7 bg-gradient-to-b from-madera/40 to-noche/70 border border-madera-claro/25 rounded-3xl shadow-farol-lg p-6">

        <!-- Izquierda: tu cartón -->
        <div class="flex flex-col items-center gap-3">
          <span class="font-display text-dorado text-lg uppercase tracking-[0.3em]">Tu cartón</span>
          <div class="w-full relative bg-gradient-to-b from-adobe to-adobe-osc border-4 border-madera rounded-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_12px_28px_rgba(0,0,0,0.5)] p-3">
            <!-- Badge de tu premio: pill flotante en la esquina, como las campeonas -->
            <span v-if="vos().hizoBingo" class="absolute top-0 right-0 z-10 bg-ganancia border border-ganancia/70 rounded-bl-xl rounded-tr-2xl shadow-farol font-display text-noche text-xs tracking-wide uppercase px-3 py-1">Bingo</span>
            <span v-else-if="vos().hizoLinea" class="absolute top-0 right-0 z-10 bg-ganancia border border-ganancia/70 rounded-bl-xl rounded-tr-2xl shadow-farol font-display text-noche text-xs tracking-wide uppercase px-3 py-1">Línea</span>
            <!-- Cabecera B-I-N-G-O -->
            <div class="grid grid-cols-5 gap-2 mb-2">
              <div v-for="l in LETRAS" :key="l" class="aspect-[5/3] flex justify-center items-center bg-gradient-to-b from-brasa to-tejado border border-dorado/40 rounded-md font-display text-noche text-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">{{ l }}</div>
            </div>
            <div class="grid grid-cols-5 gap-2">
              <template v-for="(fila, r) in vos().carton.grid" :key="r">
                <button
                  v-for="(num, c) in fila"
                  :key="c"
                  :disabled="num === null || !esperandoClic || num !== bolillaActual || vos().marcado.has(num)"
                  class="aspect-square flex justify-center items-center border-2 rounded-lg font-display tabular-nums text-2xl transition-all duration-150"
                  :class="[
                    num === null
                      ? 'bg-gradient-to-b from-dorado/40 to-dorado/20 border-dorado/50 text-dorado'
                      : vos().marcado.has(num)
                        ? 'bg-gradient-to-b from-ganancia to-ganancia/70 border-ganancia text-noche shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]'
                        : esperandoClic && num === bolillaActual
                          ? 'bg-farol border-dorado text-noche scale-[1.08] shadow-farol animate-pulse cursor-pointer'
                          : 'bg-noche/70 border-madera-claro/30 text-light hover:border-madera-claro/50'
                  ]"
                  @click="num != null && marcarMia(num)"
                >
                  <span v-if="num === null" class="text-xl">★</span>
                  <span v-else>{{ num }}</span>
                </button>
              </template>
            </div>
          </div>
        </div>

        <!-- Derecha: bolillero arriba + campeonas abajo -->
        <div class="flex flex-col gap-5">

          <!-- Bolillero + bolilla cantada + cantadas, en fila -->
          <div class="flex items-center gap-5">
            <div class="relative w-44 h-44 shrink-0 flex justify-center items-center">
              <div class="bola-bombo w-40 h-40">
                <svg v-if="bolillaActual != null" :key="bolillaActual" ref="bolillaSvg" class="w-full h-full drop-shadow-[0_10px_18px_rgba(0,0,0,0.7)]" viewBox="0 0 100 100">
                  <defs>
                    <radialGradient id="bolilla-bola" cx="36%" cy="30%" r="75%">
                      <stop offset="0%" stop-color="#fffdf6" />
                      <stop offset="45%" stop-color="#f0dca8" />
                      <stop offset="100%" stop-color="#b88d52" />
                    </radialGradient>
                  </defs>
                  <circle cx="50" cy="50" r="44" fill="url(#bolilla-bola)" stroke="#7a5a30" stroke-width="1.5" />
                  <ellipse cx="38" cy="32" rx="16" ry="11" fill="#fffef8" opacity="0.4" />
                  <circle cx="50" cy="52" r="27" fill="#fff8ea" stroke="#b88d52" stroke-width="1" />
                  <text x="50" y="53" text-anchor="middle" dominant-baseline="central" class="font-display tabular-nums" font-size="30" fill="#3a2410" font-weight="700">{{ bolillaActual }}</text>
                </svg>
                <span v-else class="flex justify-center items-center w-full h-full font-cuerpo text-light/30 text-sm italic">esperá...</span>
              </div>
            </div>

            <div class="flex-1 flex flex-col gap-2.5">
              <span class="font-display text-dorado/70 text-sm tracking-[0.3em] uppercase">Salieron</span>
              <div class="flex flex-wrap gap-2">
                <span
                  v-for="n in cantadas.slice(-15)"
                  :key="n"
                  class="flex justify-center items-center w-9 h-9 bg-noche/80 border border-madera-claro/30 rounded-full font-display tabular-nums text-light/70 text-base"
                >{{ n }}</span>
              </div>
            </div>
          </div>

          <!-- Las campeonas: 3 cartones chicos en fila -->
          <div class="flex flex-col gap-2">
            <span class="font-display text-dorado/80 text-sm uppercase tracking-[0.3em]">Las campeonas</span>
            <div class="grid grid-cols-3 gap-3">
              <div
                v-for="jug in jugadores.slice(1)"
                :key="jug.nombre"
                class="flex flex-col gap-1.5 relative bg-noche/70 border rounded-xl px-3 py-2.5 transition-colors duration-300"
                :class="jug.hizoBingo ? 'border-perdida shadow-[0_0_16px_rgba(220,80,70,0.3)]' : jug.hizoLinea ? 'border-farol/70 shadow-[0_0_12px_rgba(255,178,77,0.2)]' : 'border-madera-claro/20'"
              >
                <!-- Badge de premio: pill flotante, no compite con el nombre -->
                <span v-if="jug.hizoBingo" class="absolute top-0 right-0 z-10 bg-perdida border border-perdida/60 rounded-bl-lg rounded-tr-xl shadow-farol font-display text-noche text-[10px] tracking-wide uppercase px-2 py-0.5">Bingo</span>
                <span v-else-if="jug.hizoLinea" class="absolute top-0 right-0 z-10 bg-farol border border-dorado/60 rounded-bl-lg rounded-tr-xl shadow-farol font-display text-noche text-[10px] tracking-wide uppercase px-2 py-0.5">Línea</span>
                <span class="font-display text-light text-sm tracking-wide truncate pr-1">{{ jug.nombre }}</span>
                <div class="grid grid-cols-5 gap-1">
                  <template v-for="(fila, r) in jug.carton.grid" :key="r">
                    <div
                      v-for="(num, c) in fila"
                      :key="c"
                      class="aspect-square rounded-[3px] transition-colors duration-200"
                      :class="
                        num === null
                          ? 'bg-dorado/40'
                          : jug.marcado.has(num)
                            ? 'bg-ganancia/70'
                            : 'bg-madera-claro/15'
                      "
                    />
                  </template>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Botones jugar otra / salir: alto reservado -->
      <div class="h-[52px] flex items-center gap-3">
        <template v-if="fase === 'resultado'">
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
  </MinigameLayout>
</template>

<style scoped>
.bola-bombo {
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>
