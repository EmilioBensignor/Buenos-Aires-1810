// Catálogo de logros (31). Data pura (sin Vue) para poder testear/importar desde node.
// Cada logro: { id, nombre, desc, icono }. (campo `secreto` reservado, no usado en el MVP)
export const CATALOGO = [
  // Progresión / primera vez (fáciles)
  { id: 'primera_mano', nombre: 'Primera mano', desc: 'Ganá tu primera mano en cualquier juego.', icono: '🃏' },
  { id: 'primer_tropiezo', nombre: 'Primer tropiezo', desc: 'Perdé tu primera mano.', icono: '💸' },
  { id: 'timbero', nombre: 'Timbero de ley', desc: 'Probá los 5 minijuegos de la plaza.', icono: '🎲' },
  { id: 'conocido', nombre: 'Conocido en la plaza', desc: 'Hablá con los 10 vecinos de la plaza.', icono: '🗣️' },
  { id: 'libre_deuda', nombre: 'Libre de deuda', desc: 'Saldá la deuda con la mafia.', icono: '🕊️' },
  // Acumulado / grind (medios)
  { id: 'manos_calientes', nombre: 'Manos calientes', desc: 'Ganá 25 manos en total.', icono: '🔥' },
  { id: 'curtido', nombre: 'Curtido en las malas', desc: 'Perdé 25 manos en total.', icono: '🥃' },
  { id: 'bolsa_gorda', nombre: 'Bolsa gorda', desc: 'Llegá a tener $50 en la bolsa.', icono: '💰' },
  { id: 'patron', nombre: 'Patrón de la plaza', desc: 'Jugá 100 manos en total.', icono: '🎩' },
  { id: 'sin_mango', nombre: 'Sin un mango', desc: 'Quedate sin plata y caé en manos de la mafia.', icono: '☠️' },
  // Skill / por juego (medios-difíciles)
  { id: 'boca_sapo', nombre: 'Boca del sapo', desc: 'Embocá el sapo en la franja del x3.', icono: '🐸' },
  { id: 'linea_bingo', nombre: 'Línea y bingo, doña', desc: 'Cantá línea y bingo en la misma mano.', icono: '🎯' },
  { id: 'siete_clavado', nombre: 'Siete clavado', desc: 'Acertá el Exacto 7 en los dados (x4).', icono: '🎰' },
  { id: 'segui_bolita', nombre: 'Seguí la bolita', desc: 'Ganá en los cubiletes con la mesa difícil (nivel 3+).', icono: '🥤' },
  { id: 'las_sabe_todas', nombre: 'El que las sabe todas', desc: 'Ganá al menos una vez en los 5 minijuegos.', icono: '🏆' },
  // Racha / secreto / meta (difíciles)
  { id: 'en_racha', nombre: 'En racha', desc: 'Ganá 5 manos seguidas.', icono: '⚡' },
  { id: 'de_rodillas', nombre: 'De rodillas y de pie', desc: 'Tocá fondo ($1 o menos) y saldá la deuda igual.', icono: '🙌' },
  { id: 'audaz', nombre: 'Apostador audaz', desc: 'Ganá una mano apostando el máximo ($5).', icono: '🎏' },
  { id: 'maestro_garito', nombre: 'Maestro del garito', desc: 'Saldá la deuda con el sapo y los cubiletes en nivel 5+.', icono: '👑' },
  // ---- Tanda 2 (avanzados) ----
  // Skill seriado
  { id: 'sapo_serial', nombre: 'El sapo no falla', desc: 'Embocá el x3 del sapo 5 veces seguidas.', icono: '🐸' },
  { id: 'dados_serial', nombre: 'Cargados', desc: 'Acertá el Exacto 7 de los dados 10 veces.', icono: '🎲' },
  // Medallas de manos jugadas
  { id: 'tahur_bronce', nombre: 'Tahúr de bronce', desc: 'Jugá 150 manos en total.', icono: '🥉' },
  { id: 'tahur_plata', nombre: 'Tahúr de plata', desc: 'Jugá 300 manos en total.', icono: '🥈' },
  { id: 'tahur_oro', nombre: 'Tahúr de oro', desc: 'Jugá 500 manos en total.', icono: '🥇' },
  // Grind / racha
  { id: 'racha_larga', nombre: 'Mano de fuego', desc: 'Ganá 10 manos seguidas.', icono: '🔥' },
  { id: 'forrado', nombre: 'Forrado', desc: 'Llegá a tener $500 en la bolsa.', icono: '💵' },
  { id: 'gran_maestro', nombre: 'Gran maestro del garito', desc: 'Saldá la deuda con el sapo y los cubiletes en nivel 8+.', icono: '👑' },
  // Hazañas
  { id: 'naipes_perfecto', nombre: 'Mano limpia', desc: 'Ganá una serie de naipes 3 a 0, sin perder ronda.', icono: '🃏' },
  { id: 'all_in_heroico', nombre: 'Todo o nada', desc: 'Ganá apostando todo lo que te queda, con $3 o menos.', icono: '🎏' },
  { id: 'fundido_grande', nombre: 'Lo perdió todo', desc: 'Caé en manos de la mafia habiendo tenido $50 o más esa partida.', icono: '☠️' },
  { id: 'completista', nombre: 'Completista', desc: 'Desbloqueá todos los demás logros.', icono: '💯' }
]
