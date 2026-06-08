// Dados: tirás 2 dados (1-6). Predicción mayor/menor/exacto a 7.

function d6() {
  return 1 + Math.floor(Math.random() * 6)
}

export function tirarDados() {
  const d1 = d6()
  const d2 = d6()
  return { d1, d2, suma: d1 + d2 }
}

// Devuelve { gano, multiplicador } (multiplicador 0 si perdió).
export function resolverDados(suma, prediccion, config) {
  let gano = false
  let multiplicador = 0

  if (prediccion === 'mayor' && suma > 7) {
    gano = true
    multiplicador = config.DADOS.pagoMayorMenor
  } else if (prediccion === 'menor' && suma < 7) {
    gano = true
    multiplicador = config.DADOS.pagoMayorMenor
  } else if (prediccion === 'exacto' && suma === 7) {
    gano = true
    multiplicador = config.DADOS.pagoExacto7
  }

  return { gano, multiplicador }
}
