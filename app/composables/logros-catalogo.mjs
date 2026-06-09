// Catálogo de los 20 logros. Data pura (sin Vue) para poder testear/importar desde node.
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
  { id: 'completista', nombre: 'Completista', desc: 'Desbloqueá todos los demás logros.', icono: '💯' }
]
