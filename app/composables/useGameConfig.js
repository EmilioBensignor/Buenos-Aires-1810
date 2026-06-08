// Panel de balance y economía.
// Moneda: pesos. Internamente todo se maneja en CENTAVOS enteros (evita bugs de
// decimales). 1 peso = 100 centavos. La UI muestra "$X" / "$X,YY".

export const useGameConfig = () => CONFIG

const CONFIG = Object.freeze({
  CENTAVOS_POR_PESO: 100,

  PLATA_INICIAL: 500, // $5
  DEUDA: 20000, // $200 (deuda con la mafia)

  APUESTAS: [50, 100, 200, 300, 500], // 50¢, $1, $2, $3, $5

  // Azar puro (EV < 1): la casa gana. Habilidad (EV > 1 jugando bien): camino a saldar.
  DADOS: {
    pagoMayorMenor: 2,
    pagoExacto7: 4
  },

  NAIPES: {
    pago: 2.0,
    rondas: 3
  },

  CUBILETES: {
    pago: 2,
    barajadas: 8,
    velocidadInicial: 0.55, // seg por swap al empezar
    velocidadFinal: 0.22, // seg por swap al final (acelera)
    // Dificultad por nivel (sube al ganar): +barajadas y más veloz.
    barajadasPorNivel: 2,
    velocidadFinalPorNivel: 0.012 // resta seg/swap por nivel (más rápido)
  },

  // Bingo de la Parroquia: carrera contra 3 viejas. Cartón 5x5 (centro libre),
  // bombo de `totalBombo` números. Dos premios: línea (chico) y bingo (mayor).
  // 4 jugadores parejos → ~25% de pegar cada premio. EV ~1.00 (neutro: el juego
  // de la iglesia es más amable que naipes/dados, que tienen casa ~9%).
  BINGO: {
    totalBombo: 50, // debe ser múltiplo de 5 (una columna B-I-N-G-O por cada 10)
    pagoLinea: 1.5,
    pagoBingo: 2.5, // 4 jugadores parejos + desempate justo → EV = (1.5+2.5)/4 = 1.00 (neutro)
    viejas: ['La Nonna', 'Doña Yoli', 'La Pocha'],
    // Ritmo del canto (ms entre bolillas que NO son tuyas; las tuyas esperan tu clic)
    msEntreCantos: 1600,
    msRevelarPremio: 1100,
    // Delay humano de las viejas al marcar (ms): no instantáneo → en empates no las
    // ves "ya ganadas" antes de poder reaccionar. Rango random por cada marca.
    viejaMarcaMin: 350,
    viejaMarcaMax: 700
  },

  // El Sapo: una barra de fuerza oscila; clavás en una franja. Las zonas se
  // recorren de izquierda a derecha. `ancho` es relativo (se normaliza), `pago`
  // es el multiplicador (0 = perdés). El x3 es angosto → difícil de clavar.
  SAPO: {
    velocidad: 1.7, // qué tan rápido oscila el cursor (nivel 0)
    // Dificultad por nivel (sube al ganar): zonas ganadoras más chicas y línea más rápida.
    factorAnchoPorNivel: 0.88, // cada nivel multiplica los anchos ganadores por esto
    velocidadPorNivel: 0.18, // suma a la velocidad de la línea por nivel
    zonas: [
      { pago: 0, ancho: 18 }, // negro
      { pago: 1.5, ancho: 14 },
      { pago: 2, ancho: 9 },
      { pago: 3, ancho: 4 }, // boca del sapo (angosta, difícil)
      { pago: 2, ancho: 9 },
      { pago: 1.5, ancho: 14 },
      { pago: 0, ancho: 18 } // negro
    ]
  },

  JUGADOR: {
    velocidad: 220, // px/seg
    radioColision: 18
  },

  ANIM: {
    transicionEscena: 0.5,
    contadorPlata: 0.6,
    tiradaDados: 3.4, // alineado al SFX de dados (~3.3s de traqueteo)
    giroCarta: 0.5
  }
})

// ===== Dificultad por nivel (sube al ganar, se reinicia al perder) =====

// Zonas del sapo ajustadas al nivel: las ganadoras se achican, los negros crecen
// para que la barra siga sumando el mismo total (no cambia de tamaño visual).
export const zonasSapoNivel = (nivel) => {
  const s = CONFIG.SAPO
  const factor = Math.pow(s.factorAnchoPorNivel, nivel)
  const totalOriginal = s.zonas.reduce((a, z) => a + z.ancho, 0)
  const ganadores = s.zonas.map((z) => (z.pago > 0 ? z.ancho * factor : 0))
  const totalGanador = ganadores.reduce((a, w) => a + w, 0)
  const negros = s.zonas.filter((z) => z.pago <= 0).length
  const anchoNegro = (totalOriginal - totalGanador) / negros
  return s.zonas.map((z, i) => ({
    ...z,
    ancho: z.pago > 0 ? ganadores[i] : anchoNegro
  }))
}

export const velocidadSapoNivel = (nivel) =>
  CONFIG.SAPO.velocidad + nivel * CONFIG.SAPO.velocidadPorNivel

// Cubiletes: más barajadas y más rápido por nivel.
export const barajadasCubiletesNivel = (nivel) =>
  CONFIG.CUBILETES.barajadas + nivel * CONFIG.CUBILETES.barajadasPorNivel

export const velocidadFinalCubiletesNivel = (nivel) =>
  Math.max(0.08, CONFIG.CUBILETES.velocidadFinal - nivel * CONFIG.CUBILETES.velocidadFinalPorNivel)

// Formatea centavos a texto "$X" / "$X,YY" (estilo argentino, coma decimal).
export const formatMoneda = (centavos) => {
  const c = Math.max(0, Math.round(centavos))
  const pesos = Math.floor(c / CONFIG.CENTAVOS_POR_PESO)
  const resto = c % CONFIG.CENTAVOS_POR_PESO
  if (resto === 0) return `$${pesos}`
  return `$${pesos},${String(resto).padStart(2, '0')}`
}

// Deuda total en centavos (para comparar contra la plata del jugador).
export const deudaEnCentavos = () => CONFIG.DEUDA
