// Stats de la partida en curso. Singleton reactivo (como useLogros). Se suscribe al bus
// de eventos y al state para contar manos y el pico de plata de ESTA corrida. NO persiste:
// muere al recargar y se resetea al empezar partida nueva.
import { reactive, watch } from 'vue'
import { useGameState } from './useGameState'

const statsPartida = reactive({
  manosJugadas: 0,
  manosGanadas: 0,
  picoPlata: 0
})

function reset() {
  statsPartida.manosJugadas = 0
  statsPartida.manosGanadas = 0
  statsPartida.picoPlata = 0
}

let iniciado = false
function iniciar() {
  if (iniciado || typeof window === 'undefined') return
  iniciado = true
  const { onEvento, onReiniciarPartida, state } = useGameState()

  // Manos de esta partida. Naipes-empate no emite jugo/gano, así que no cuenta.
  onEvento((evento) => {
    if (evento.tipo === 'jugo') statsPartida.manosJugadas++
    else if (evento.tipo === 'gano') statsPartida.manosGanadas++
  })

  // Pico de plata de la corrida.
  watch(
    () => state.plata,
    (plata) => { if (plata > statsPartida.picoPlata) statsPartida.picoPlata = plata },
    { immediate: true }
  )

  // Partida nueva: reset.
  onReiniciarPartida(reset)
}

export const useStatsPartida = () => {
  iniciar()
  return { statsPartida }
}
