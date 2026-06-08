// Catálogo de NPCs (personajes no jugables). Coords NORMALIZADAS (0-1) sobre la
// imagen de fondo, igual que edificios/interiores. Cada NPC:
//   id, nombre, pos {x,y}, pal (paleta+oficio para drawNpc), dialogos []
// Los diálogos rotan: cada vez que le hablás avanza una línea (vuelve al principio).
// Posiciones calibradas con el editor de NPCs (tecla N en plaza, elemento "npc" en
// interiores). Las pos acá son tentativas hasta calibrar con el HUD.

// Radio de colisión (el NPC frena al jugador) y de cercanía (muestra prompt "E").
// Normalizados sobre el ancho de la imagen. El de cercanía es mayor que el de choque.
export const RADIO_CHOQUE_NPC = 0.022
export const RADIO_CERCA_NPC = 0.055

function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by)
}

// ¿El punto (x,y) pisa el cuerpo de algún NPC de la lista? (para frenar al jugador)
export function npcEnPunto(x, y, npcs) {
  for (const n of npcs) {
    if (dist(x, y, n.pos.x, n.pos.y) < RADIO_CHOQUE_NPC) return n
  }
  return null
}

// NPC más cercano al punto dentro del radio de cercanía, o null (para el prompt).
export function npcCercaDe(x, y, npcs) {
  let mejor = null, mejorD = RADIO_CERCA_NPC
  for (const n of npcs) {
    const d = dist(x, y, n.pos.x, n.pos.y)
    if (d < mejorD) { mejorD = d; mejor = n }
  }
  return mejor
}

// --- PLAZA: 3 próceres + el ciudadano caído ---
export const NPCS_PLAZA = [
  {
    id: 'san-martin',
    nombre: 'José de San Martín',
    pos: { x: 0.508, y: 0.377 },
    pal: {
      piel: '#c98a5e', pantalon: '#2a2a35', casaca: '#1f3a5f', casacaSombra: '#16294a',
      pechera: '#d8d2c0', detalle: '#0e1a30', oficio: 'bicornio'
    },
    dialogos: [
      'La disciplina vence al azar, muchacho. En la timba y en la guerra.',
      'No malgastes pólvora ni reales en tiros que no podés ganar.',
      'El que se apura, pierde. Medí cada apuesta como una campaña.'
    ]
  },
  {
    id: 'belgrano',
    nombre: 'Manuel Belgrano',
    pos: { x: 0.429, y: 0.948 },
    pal: {
      piel: '#c98a5e', pantalon: '#3a3228', casaca: '#5a8aa0', casacaSombra: '#3f6678',
      pechera: '#e8e2d0', detalle: '#2b2118', oficio: 'galera'
    },
    dialogos: [
      'Con maña se gana más que con suerte. Probá los cubiletes, fijate bien la bolita.',
      'La patria necesita gente despierta, no jugadores ciegos.',
      'Cuidá tus reales como yo cuido la bandera, con honor.'
    ]
  },
  {
    id: 'moreno',
    nombre: 'Mariano Moreno',
    pos: { x: 0.643, y: 0.617 },
    pal: {
      piel: '#c0815a', pantalon: '#2b2118', casaca: '#2b2b2b', casacaSombra: '#1a1a1a',
      pechera: '#d8d2c0', detalle: '#1c1611', oficio: 'anteojos'
    },
    dialogos: [
      'Los dados son tiranía del azar. El sapo premia al que tiene pulso firme.',
      'Pensá antes de apostar. La razón ilumina más que el farol.',
      'El que no calcula, paga. Y acá se paga caro, te lo aviso.'
    ]
  },
  {
    id: 'caido',
    nombre: 'El Caído',
    pos: { x: 0.035, y: 0.524 },
    pal: {
      piel: '#b07a52', pantalon: '#33291f', casaca: '#5a4a38', casacaSombra: '#3f3326',
      pechera: '#7a6a52', detalle: '#2b2118', oficio: 'andrajo'
    },
    dialogos: [
      'Yo también tenía con qué saldar, criollo... me quedé una mano de más. Mirame ahora.',
      'No le debas a la mafia lo que no podés pagar. Esos cobran con sangre.',
      'Si juntás la guita, no seas zonzo: andá al garito y cancelá de una.'
    ]
  }
]

// --- INTERIORES: un NPC de oficio por edificio (texto PROVISORIO, a reemplazar) ---
// La clave es el id del interior (pulperia, cabildo, mercado, feria, iglesia, garito).
export const NPCS_INTERIOR = {
  pulperia: [
    {
      id: 'pulpero',
      nombre: 'El Pulpero',
      pos: { x: 0.847, y: 0.862 },
      pal: {
        piel: '#c98a5e', pantalon: '#3a3228', casaca: '#7a5a3a', casacaSombra: '#5a4029',
        pechera: '#d8c8a0', detalle: '#2b2118', oficio: 'delantal'
      },
      dialogos: [
        'Sentate, criollo. Una mano de naipes y un trago, ¿qué más querés?',
        'Acá la carta más alta se lleva todo. Probá tu suerte.',
        'El que no arriesga no toma. Apostá nomás.'
      ]
    }
  ],
  mercado: [
    {
      id: 'comerciante',
      nombre: 'El Comerciante',
      pos: { x: 0.662, y: 0.469 },
      pal: {
        piel: '#cf9263', pantalon: '#2b2b35', casaca: '#3a6a5a', casacaSombra: '#28473d',
        pechera: '#d8d2c0', detalle: '#1c2b22', oficio: 'galera'
      },
      dialogos: [
        'Tres cubiletes, una bolita. ¿Tenés ojo para los negocios?',
        'Seguí la bolita y la guita es tuya. Si la perdés de vista, pagás.',
        'El mercado no perdona al distraído, amigo.'
      ]
    }
  ],
  cabildo: [
    {
      id: 'guardia',
      nombre: 'El Guardia',
      pos: { x: 0.226, y: 0.604 },
      pal: {
        piel: '#c98a5e', pantalon: '#2a2a35', casaca: '#3a4a6a', casacaSombra: '#28344a',
        pechera: '#c8c0a8', detalle: '#1a2030', oficio: 'morrion'
      },
      dialogos: [
        'Tranquilo, che. Acá se tira a mayor, menor o exacto. Nada raro.',
        'Yo cuido el orden... y de paso meto una fichita, no le digas a nadie.',
        'Si sale el siete justo, pagás cuádruple. Pero no es fácil, eh.'
      ]
    }
  ],
  feria: [
    {
      id: 'feriante',
      nombre: 'La Feriante',
      pos: { x: 0.165, y: 0.836 },
      pal: {
        piel: '#cf9263', pantalon: '#5a2a4a', casaca: '#a04a5a', casacaSombra: '#7a3543',
        pechera: '#e8d2c0', detalle: '#3a1c28', oficio: 'panuelo'
      },
      dialogos: [
        '¡Vení al sapo! Embocá en la boca y te llevás el triple.',
        'La fuerza justa, ni mucho ni poco. Es cuestión de pulso.',
        'El que la clava en la boca es un grande. ¿Te animás?'
      ]
    }
  ],
  iglesia: [
    {
      id: 'campeona',
      nombre: 'La Pocha',
      pos: { x: 0.26, y: 0.549 },
      pal: {
        piel: '#d8a878', pantalon: '#3a2b3a', casaca: '#6a4a6a', casacaSombra: '#4d3550',
        pechera: '#e8e2d0', detalle: '#2b1c2b', oficio: 'panuelo'
      },
      dialogos: [
        'Sesenta años cantando bingo, m\'hijo. Vos todavía no sabés ni agarrar el cartón.',
        'Tranquilo que la bolilla te espera. Lo que no te espera es la suerte, y a mí me sobra.',
        'Línea y bingo en la misma mano. ¿Sabés cuántas veces lo hice? Ni me acuerdo, perdí la cuenta.'
      ]
    }
  ],
  garito: [
    {
      id: 'mafioso',
      nombre: 'El Mafioso',
      pos: { x: 0.392, y: 0.944 },
      pal: {
        piel: '#b07a52', pantalon: '#1a1a1a', casaca: '#2b2b2b', casacaSombra: '#161616',
        pechera: '#8a1a1a', detalle: '#0d0d0d', oficio: 'galeraOscura'
      },
      dialogos: [
        'Llegaste, criollo. ¿Traés la guita o venís a perder tiempo?',
        'La deuda no se achica sola. Y nosotros no olvidamos.',
        'Saldá cuando puedas... pero no tardes mucho, ¿eh?'
      ]
    }
  ]
}
