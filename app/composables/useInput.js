// Entrada del jugador (teclado + mouse). WASD/flechas → vector de dirección.
// Teclas G/P → atajos dev. SSR-safe: registra en onMounted, limpia en onUnmounted.

import { reactive, onMounted, onUnmounted } from 'vue'

export const useInput = (opciones = {}) => {
  const { onGanar, onPerder, onTecla } = opciones

  const teclas = reactive({
    arriba: false,
    abajo: false,
    izquierda: false,
    derecha: false
  })

  function setTecla(e, valor) {
    switch (e.key.toLowerCase()) {
      case 'w':
      case 'arrowup':
        teclas.arriba = valor
        break
      case 's':
      case 'arrowdown':
        teclas.abajo = valor
        break
      case 'a':
      case 'arrowleft':
        teclas.izquierda = valor
        break
      case 'd':
      case 'arrowright':
        teclas.derecha = valor
        break
    }
  }

  function onKeyDown(e) {
    setTecla(e, true)
    const k = e.key.toLowerCase()
    if (k === 'g' && onGanar) onGanar()
    if (k === 'p' && onPerder) onPerder()
    if (onTecla) onTecla(e)
  }

  function onKeyUp(e) {
    setTecla(e, false)
  }

  function getVectorDireccion() {
    let x = 0
    let y = 0
    if (teclas.izquierda) x -= 1
    if (teclas.derecha) x += 1
    if (teclas.arriba) y -= 1
    if (teclas.abajo) y += 1
    // Normalizar para que la diagonal no sea más rápida
    if (x !== 0 && y !== 0) {
      const inv = 1 / Math.sqrt(2)
      x *= inv
      y *= inv
    }
    return { x, y }
  }

  function hayMovimientoTeclado() {
    return teclas.arriba || teclas.abajo || teclas.izquierda || teclas.derecha
  }

  onMounted(() => {
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('keyup', onKeyUp)
  })

  return { teclas, getVectorDireccion, hayMovimientoTeclado }
}
