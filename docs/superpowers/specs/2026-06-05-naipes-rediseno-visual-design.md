# Rediseño visual de las cartas de la pulpería

Fecha: 2026-06-05

## Objetivo

Hacer que las cartas de la pulpería se vean bonitas: una baraja española de
época, coherente con la ambientación "Buenos Aires 1810" (paleta noche / farol /
dorado / madera). Cambio **puramente visual** — la mecánica del minijuego no se
toca.

## Alcance

- **Único archivo de comportamiento visual**: `app/components/minigames/NaipeCard.vue`.
- **Símbolos de palos**: hoy viven como `<symbol>` SVG inline en
  `app/components/minigames/CardsGame.vue` (líneas ~187-205). Se rediseñan ahí
  mismo (siguen siendo el sprite compartido que `NaipeCard` referencia con `<use>`).
- **Figuras 10/11/12 (Sota/Caballo/Rey)**: nuevos `<symbol>` SVG, definidos junto
  a los palos en `CardsGame.vue`.

## Qué NO cambia (restricciones)

- Mecánica de `app/game/minigames/cards.js`: intacta.
- Props de `NaipeCard`: `carta` `{ palo, numero }`, `tapada`, `estado`
  (`'ganadora'|'perdedora'|null`), `seleccionable`, `seleccionada`. Mismos nombres,
  mismos tipos.
- Animaciones de `CardsGame.vue` (viaje al centro, flip reverso→frente): intactas.
  El flip depende de que el frente y el reverso ocupen el mismo box y de que el
  cambio de cara sea por `v-if="tapada"`. Se mantiene esa estructura.
- Tamaño base de la carta: **88×132 px** (`w-[88px] h-[132px]`). Todo el diseño
  debe verse bien y legible a ese tamaño.
- Paleta y tokens de Tailwind del proyecto (`dorado`, `farol`, `brasa`, `ascua`,
  `noche`, `ganancia`, `perdida`, `font-display`). No se agregan colores nuevos al
  config; los matices de papel/madera van como valores arbitrarios `[#...]` como ya
  se hace hoy.

## Diseño visual

### Frente — estructura general

Marco doble estilo baraja española sobre papel envejecido:

1. **Papel**: fondo crema (mantener gradiente `from-[#f6efdc] to-[#e6d8b8]` o
   afinar) + textura sutil de vetas/manchas con gradientes CSS (sin imágenes), para
   sensación de carta vieja. Bordes apenas tostados.
2. **Marco doble**: borde exterior (color dorado tenue) + un marco interior fino con
   las esquinas "cortadas" (las pintas típicas de la española). Se logra con
   border + pseudo-elementos / box-shadow inset. No usar imágenes.
3. **Contenido** (según el número de la carta, ver abajo).

### Frente — cartas numéricas (1 a 9)

- **Esquina superior izquierda**: número en `font-display` + palo chico debajo.
- **Esquina inferior derecha**: lo mismo, rotado 180° (espejado), como hoy.
- **Centro**: UN símbolo de palo grande (no conteo real — a 88px de ancho el
  conteo se ve apretado e ilegible; un palo grande es más limpio y la española real
  igual reserva las figuras para 10-12).
- Color del símbolo: palo cálido (oro/copa) → tonos brasa/ascua; palo frío
  (espada/basto) → tonos noche/oscuro. Mantener el `computed calido` existente.

### Frente — figuras (10 = Sota, 11 = Caballo, 12 = Rey)

- En vez de mostrar "10/11/12" pelado: mostrar la **inicial española** en las
  esquinas — `S` (Sota), `C` (Caballo), `R` (Rey) — con el palo chico debajo, igual
  layout que las numéricas.
- **Centro**: ilustración SVG simple (silueta/línea, no realismo fotográfico) que
  evoca la figura de baraja española:
  - **Sota (10)**: paje de pie (figura humana simple con sombrero/melena).
  - **Caballo (11)**: jinete sobre caballo (silueta).
  - **Rey (12)**: figura con corona (busto o sentado).
- El palo correspondiente aparece chico al lado de la figura (como en la española,
  donde la figura "sostiene" su palo). Mantener el código de color cálido/frío.
- Las 3 figuras son genéricas por figura (no una por palo): se dibuja la misma
  silueta de Sota para las 4 sotas, etc. Esto evita 12 ilustraciones distintas y
  mantiene el alcance acotado.

### Palos rediseñados (4 `<symbol>` en CardsGame.vue)

Reemplazar los actuales (geométricos/simples) por versiones más detalladas pero
planas (monocromo, usan `currentColor` para heredar el color cálido/frío):

- **Oro**: moneda redonda con anillo de relieve y un sol/rostro estilizado al
  centro (no un círculo plano).
- **Copa**: cáliz barroco con boca, nudo, pie y base.
- **Espada**: hoja recta con empuñadura y guarda cruzada (no un triángulo).
- **Basto**: garrote/maza nudoso (tronco con nudos), no un palito recto.

Todos en `viewBox="0 0 24 24"`, trazo/relleno con `currentColor`, legibles
reducidos a ~14px (esquina) y nítidos a ~36px (centro).

### Reverso

Mejorar el reverso actual (rombos planos):

- Fondo madera oscura (mantener `from-[#5b2f1a] to-[#3a1c10]`).
- Filigrana dorada más rica: patrón de rombos/entramado más fino y un **emblema
  central** (p. ej. sol estilizado, escudo o flor) en `border-dorado`, en vez del
  rombito rotado actual.
- Marco dorado doble, coherente con el frente.

### Estados (se conservan, adaptados al marco nuevo)

- `estado === 'ganadora'`: glow (`shadow-farol-lg`) + `ring-2 ring-ganancia` +
  `scale-105 -translate-y-1` (como hoy).
- `estado === 'perdedora'`: `opacity-50` (como hoy).
- `seleccionable`: cursor pointer + hover de borde/sombra dorada.
- `seleccionada`: `-translate-y-3` (como hoy).

## Orden de clases Tailwind

Respetar el orden obligatorio del proyecto (sizing → layout → position →
backgrounds → borders → typography → effects → ... → spacing). Estados pegados a su
propiedad base.

## Verificación

- `npx nuxt build` pasa sin errores.
- Validación visual del usuario en su dev server (localhost:3000):
  - Las 4 pintas se reconocen a tamaño chico (esquina) y grande (centro).
  - 10/11/12 muestran figura + inicial S/C/R, no el número crudo.
  - El flip reverso→frente sigue funcionando sin parpadeo ni desfase de caja.
  - Estados ganadora/perdedora/seleccionable/seleccionada se ven bien.
  - Coherencia con la estética farol/dorado del resto del juego.

## Fuera de alcance

- Conteo real de pintas en las numéricas.
- Una ilustración distinta por palo en las figuras (se usa una silueta por figura).
- Imágenes/assets externos (todo es CSS/SVG).
- Cualquier cambio de mecánica, economía o flujo de escenas.
