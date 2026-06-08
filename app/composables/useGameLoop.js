// Game loop sobre requestAnimationFrame. Pasa delta en segundos al callback.
// Se auto-limpia en onUnmounted.

import { onUnmounted } from 'vue'

export const useGameLoop = () => {
  let rafId = null
  let ultimoTiempo = 0
  let callback = null
  let corriendo = false

  function frame(tiempo) {
    if (!corriendo) return
    // clamp para evitar saltos si la pestaña estuvo en background
    const delta = Math.min((tiempo - ultimoTiempo) / 1000, 0.05)
    ultimoTiempo = tiempo
    if (callback) callback(delta)
    rafId = requestAnimationFrame(frame)
  }

  function start(cb) {
    if (corriendo) return
    callback = cb
    corriendo = true
    ultimoTiempo = performance.now()
    rafId = requestAnimationFrame(frame)
  }

  function stop() {
    corriendo = false
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
  }

  onUnmounted(stop)

  return { start, stop }
}
