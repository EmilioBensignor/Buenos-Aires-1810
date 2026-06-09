// Audio global del juego. Singleton reactivo (client-only), mismo patrón que
// useGameState. Howler se importa DINÁMICO (nunca en SSR, como GSAP).
// Música: un solo ambient.mp3 en loop, suena igual en TODAS las escenas (el FSM
// no la toca). SFX: efectos puntuales por nombre (se agregan después; si el
// archivo no existe, no rompe). Mute persiste en localStorage.

import { ref } from 'vue'

const LS_KEY = 'plaza1810_audio_v1'

// Volumen base de la música (por debajo de los SFX para que no tape el juego).
// El volumen efectivo es VOL_MUSICA_BASE * volMusica (slider 0..1).
const VOL_MUSICA_BASE = 0.1

// Pasos: loop mientras el player camina. `rate` acelera la reproducción sin
// tocar el archivo → subir si los pasos suenan lentos para la caminata.
const PASOS = { archivo: 'pasos.mp3', vol: 0.1, rate: 2.5 }

// Catálogo de SFX: nombre lógico → { archivo en public/assets/audio/sfx/, vol }.
// `vol` es 0..1 por sonido (ajustá acá cuando algo suene fuerte/bajo). Pegá cada
// archivo con ESE nombre y suena solo; si falta, sfx() es no-op silencioso.
const SFX = {
  // --- Minijuegos ---
  tirarDados: { archivo: 'tirar-dados.mp3', vol: 0.4 }, // DiceGame (animación ~3.4s)
  repartirNaipe: { archivo: 'repartir-naipes.mp3', vol: 0.6 }, // CardsGame: por CADA carta
  moverCubiletes: { archivo: 'mover-cubiletes.mp3', vol: 0.7 }, // CupsGame: barajado
  plata: { archivo: 'plata.mp3', vol: 0.2 }, // ganaste cualquier minijuego (~1.25s)
  dialogoNpc: { archivo: 'dialogo-npc.mp3', vol: 0.2 }, // diálogo NPC (~2.9s); se corta al cerrar/alejarse

  // --- Finales (únicos de ganar/perder; no hay sonido por mano individual) ---
  victoria: { archivo: 'ganar.mp3', vol: 0.4 }, // saldaste la deuda
  gameOver: { archivo: 'perder.mp3', vol: 0.2 }, // te quedaste en $0
  disparo: { archivo: 'disparo.mp3', vol: 0.4 }, // el mafioso te dispara (cinemática de derrota)
  festejo: { archivo: 'festejo.mp3', vol: 0.7 }, // los personajes festejan (cinemática de victoria)

  // --- UI ---
  click: { archivo: 'clic.mp3', vol: 0.4 }, // cualquier <button> (global, suena seguido → bajo)
  error: { archivo: 'error.mp3', vol: 0.6 }, // intentar saldar la deuda sin tener la plata
  logro: { archivo: 'logro.mp3', vol: 0.5 } // logro desbloqueado (toast tipo Steam)
}

// Lee la config de audio de localStorage. Retrocompat: el formato viejo era el
// string plano 'mute'|'on'; si lo encuentra, lo interpreta como { mute }.
function cargarConfig() {
  const def = { mute: false, volMusica: 1, volSfx: 1 }
  if (typeof window === 'undefined') return def
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return def
    if (raw === 'mute') return { ...def, mute: true }
    if (raw === 'on') return def
    const o = JSON.parse(raw)
    return {
      mute: !!o.mute,
      volMusica: typeof o.volMusica === 'number' ? o.volMusica : 1,
      volSfx: typeof o.volSfx === 'number' ? o.volSfx : 1
    }
  } catch {
    return def
  }
}

function guardarConfig() {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({
      mute: muteado.value,
      volMusica: volMusica.value,
      volSfx: volSfx.value
    }))
  } catch {}
}

const cfg = cargarConfig()
const muteado = ref(cfg.mute)
const volMusica = ref(cfg.volMusica) // 0..1, slider de música
const volSfx = ref(cfg.volSfx) // 0..1, slider de efectos

let Howl = null // clase de Howler (cargada dinámico)
let iniciado = false // initAudio ya corrió
let musica = null // Howl del ambient
let pasos = null // Howl de pasos (loop mientras camina)
const sonidos = {} // cache de Howl por nombre de SFX

// Carga Howler + crea el Howl de música. Idempotente. Llamar al primer gesto
// del usuario (la autoplay-policy del browser bloquea audio sin interacción).
async function initAudio() {
  if (iniciado || typeof window === 'undefined') return
  iniciado = true

  const mod = await import('howler')
  Howl = mod.Howl

  musica = new Howl({
    src: ['/assets/audio/musica/ambient.mp3'],
    loop: true,
    volume: VOL_MUSICA_BASE * volMusica.value,
    html5: true, // streaming: no carga 2hs enteras en memoria antes de sonar
    mute: muteado.value
  })

  // Precargar TODOS los SFX ahora (Howler los decodifica en background) para que
  // el primer disparo de cada uno no tenga delay de carga. Sin html5 → buffer en
  // memoria, latencia mínima al reproducir.
  for (const [nombre, def] of Object.entries(SFX)) {
    sonidos[nombre] = new Howl({
      src: [`/assets/audio/sfx/${def.archivo}`],
      volume: def.vol * volSfx.value,
      mute: muteado.value
    })
  }

  // Pasos: loop, acelerado por `rate` para entrar en el ritmo de la caminata.
  pasos = new Howl({
    src: [`/assets/audio/sfx/${PASOS.archivo}`],
    loop: true,
    rate: PASOS.rate,
    volume: PASOS.vol * volSfx.value,
    mute: muteado.value
  })
}

// Arranca la música de fondo (si no está sonando ya). Inicia el audio si hace falta.
async function arrancarMusica() {
  await initAudio()
  if (musica && !musica.playing()) musica.play()
}

function pararMusica() {
  if (musica) musica.stop()
}

const topes = {} // timers de maxMs por nombre (para cortar y limpiar)

// Dispara un SFX puntual por nombre. No-op si está muteado o el nombre/archivo
// no existe. Si el audio aún no inició (el primer clic ES el gesto que lo
// inicia), espera a que termine initAudio y recién ahí reproduce — así el primer
// clic también suena. Cachea el Howl por nombre; `maxMs` lo corta a ese tope.
function sfx(nombre) {
  if (muteado.value) return
  const def = SFX[nombre]
  if (!def) return

  if (iniciado && Howl) {
    reproducir(nombre, def)
  } else {
    initAudio().then(() => {
      if (!muteado.value) reproducir(nombre, def)
    })
  }
}

function reproducir(nombre, def) {
  let s = sonidos[nombre]
  if (!s) {
    s = new Howl({ src: [`/assets/audio/sfx/${def.archivo}`], volume: def.vol * volSfx.value })
    sonidos[nombre] = s
  }
  s.volume(def.vol * volSfx.value) // respeta el slider actual
  s.stop() // reinicia si ya estaba sonando
  s.play()

  if (def.maxMs) {
    clearTimeout(topes[nombre])
    topes[nombre] = setTimeout(() => s.stop(), def.maxMs)
  }
}

// Detiene un SFX puntual (p. ej. al cerrar el diálogo de NPC antes del tope).
function pararSfx(nombre) {
  clearTimeout(topes[nombre])
  const s = sonidos[nombre]
  if (s) s.stop()
}

// Pasos: arranca el loop si el player se mueve (idempotente: no reinicia si ya suena).
function arrancarPasos() {
  if (muteado.value || !pasos) return
  if (!pasos.playing()) {
    pasos.volume(PASOS.vol * volSfx.value) // respeta el slider actual
    pasos.play()
  }
}

// Pasos: corta el loop cuando el player frena.
function pararPasos() {
  if (pasos && pasos.playing()) pasos.pause()
}

// Corta/restablece todo el audio. Persiste. Si vuelve a sonar y la música no
// estaba reproduciéndose, la arranca.
// `muteado.value` es la ÚNICA fuente de verdad: forzamos a Howler a coincidir. La
// música usa html5:true y a veces no "agarra" el .mute() (queda desincronizada del
// estado Vue → el botón parece trabado). Por eso, además del mute, re-aplicamos el
// volumen explícito de la música como respaldo.
function toggleMute() {
  const m = !muteado.value
  muteado.value = m
  guardarConfig()

  if (pasos) pasos.mute(m)
  Object.values(sonidos).forEach((s) => s.mute(m))

  if (musica) {
    musica.mute(m)
    // Respaldo para el html5 desincronizado: el volumen real refleja el estado.
    musica.volume(m ? 0 : VOL_MUSICA_BASE * volMusica.value)
    if (!m && !musica.playing()) musica.play()
  }
}

// Ajusta el volumen de la música (0..1) en vivo y persiste.
function setVolMusica(v) {
  volMusica.value = Math.min(1, Math.max(0, v))
  if (musica) musica.volume(VOL_MUSICA_BASE * volMusica.value)
  guardarConfig()
}

// Ajusta el volumen de los efectos (0..1) en vivo y persiste. Reescala los SFX
// ya cacheados (el próximo play de cada uno también respeta el slider).
function setVolSfx(v) {
  volSfx.value = Math.min(1, Math.max(0, v))
  for (const [nombre, s] of Object.entries(sonidos)) {
    const def = SFX[nombre]
    if (def) s.volume(def.vol * volSfx.value)
  }
  if (pasos) pasos.volume(PASOS.vol * volSfx.value)
  guardarConfig()
}

export const useAudio = () => ({
  muteado,
  volMusica,
  volSfx,
  initAudio,
  arrancarMusica,
  pararMusica,
  sfx,
  pararSfx,
  arrancarPasos,
  pararPasos,
  toggleMute,
  setVolMusica,
  setVolSfx
})
