# Diseño — Narrativa, bienvenida, ayuda, avisos y cinemáticas

Fecha: 2026-06-08
Proyecto: Buenos Aires 1810 — Plaza 1810

## Objetivo

Cerrar la capa narrativa y de feedback del juego sin tocar los minijuegos:
bienvenida + tutorial, botón de ayuda, aviso "ya podés saldar", cinemáticas de
victoria/derrota corridas en la plaza, y efecto typewriter en los diálogos de NPC.

Fuera de scope (se ven al final, por separado): pulido visual de las 4 pantallas
estáticas (Bienvenida, Instrucciones, Ganar, Perder), audio/sonido (lo hace el
usuario aparte), logros, leaderboard.

---

## Sección 1 — Estado de cinemáticas (arquitectura)

Estado transitorio nuevo en `useSceneManager`:

```
scene.cinematicaPendiente = null | 'derrota' | 'victoria'
```

- **No se persiste** en localStorage (vive con la FSM). Si el jugador recarga a
  mitad de la cinemática, cae en la pantalla final sin animación (caso borde
  aceptado).
- Separa "ya gané/perdí" de "ya mostré el final". El `state.resultado` se setea
  recién al TERMINAR la cinemática.

Nuevo método: `irAPlazaConCinematica(tipo)` → setea `cinematicaPendiente = tipo` y
transiciona a `ESCENAS.PLAZA`.

### Cuatro disparadores, dos caminos

1. **Derrota real** (perdés en minijuego → fundido → al pisar la plaza):
   `PlazaScene.vue` onMounted detecta `state.plata <= 0 && state.resultado === null`
   → en vez de marcar `resultado='derrota'` y saltar a RESULTADO, setea
   `cinematicaPendiente='derrota'` y corre la cinemática.
2. **Victoria real** (`saldarDeuda()` en el Garito): descuenta la deuda pero **no**
   setea `resultado`; `GaritoScene.vue` llama `irAPlazaConCinematica('victoria')`.
3. **Botón DEV PERDER**: `GaritoScene.vue` → descuenta plata a 0 (sin marcar
   resultado) + `irAPlazaConCinematica('derrota')`.
4. **Botón DEV GANAR**: `GaritoScene.vue` → `irAPlazaConCinematica('victoria')`.

### Cambios en `useGameState`

- `saldarDeuda()`: descuenta la deuda de la plata pero **deja de setear**
  `resultado='victoria'`. Devuelve true/false como hoy.
- `forzarVictoria()` / `forzarDerrota()`: dejan de setear `resultado` directo. Se
  convierten en helpers que solo ajustan plata (forzarDerrota pone plata=0,
  forzarVictoria deja la plata como esté) — el disparo de cinemática lo hace el
  componente. Alternativa: borrarlos y que `GaritoScene` haga el ajuste + el
  llamado a `irAPlazaConCinematica`. **Decisión:** borrar `forzarVictoria/forzarDerrota`
  de useGameState; el ajuste de plata para el modo DEV vive en GaritoScene.
- Nuevo método `marcarResultado(tipo)`: setea `state.resultado = tipo`. Lo llama la
  cinemática al terminar (vía un callback que la plaza expone). Mantiene la regla:
  el resultado es la única fuente que dispara RESULTADO.

### Evitar import circular

`useGameState` **no** importa `useSceneManager`. Todo disparo de cinemática se hace
desde componentes que ya tienen ambos composables (`GaritoScene.vue`,
`PlazaScene.vue`).

### Watcher de victoria existente

Hoy `useSceneManager` tiene un watch sobre `gameState.resultado` que salta a
RESULTADO en victoria. Se mantiene: como `resultado` ahora se setea recién al
terminar la cinemática, el watch dispara la pantalla en el momento correcto. La
derrota sigue saltando a RESULTADO desde el onMounted de la plaza (que ahora corre
DESPUÉS de la cinemática).

---

## Sección 2 — Cinemáticas en el PlazaRenderer

`game/plaza/PlazaScene.js` (clase `PlazaRenderer`).

### Bloqueo de input

Flag `this.modoCinematico = false` (constructor). En `update()`, si está activo:
ignora el vector de teclado y el target de clic; solo avanza `this.tiempo`, las
partículas y las animaciones GSAP en curso. El movimiento del player/NPCs durante
la cinemática lo manejan tweens GSAP sobre `this.pos` y posiciones de NPCs
temporales.

### API de cinemática

```js
renderer.iniciarCinematica(tipo, onFin)  // tipo: 'derrota' | 'victoria'
```

- Setea `modoCinematico = true`.
- Construye un timeline GSAP (import dinámico, como el resto del proyecto).
- Al terminar el timeline llama `onFin()` (la plaza usa esto para marcar el
  resultado y dejar que la FSM salte a RESULTADO).

### Cinemática DERROTA

1. Tween: `this.pos` → spawn de plaza (`POS_INICIAL_JUGADOR`), ~0.8s. Player mira
   abajo.
2. Inyectar mafioso temporal en la lista de dibujo, posicionado en la **puerta del
   Garito** (sale de la mafia). Sprite: `pal` del mafioso (`oficio:'galeraOscura'`,
   clonado de `NPCS_INTERIOR.garito[0]`).
3. Tween: mafioso camina desde la puerta del Garito hacia el player (se planta a
   corta distancia), ~1.2s.
4. Fogonazo: destello breve (rect/círculo blanco-amarillo a alpha alto, ~120ms) en
   la boca del arma del mafioso. Implementado como estado dibujado por el renderer
   durante la ventana del tween.
5. Player "cae": GSAP rota el sprite 90° + baja un toque (transform desde afuera,
   `drawPlayer` se llama dentro de un `ctx.save/rotate/restore`). Emisión de
   partículas tipo `sangre` en el punto de impacto.
6. Fade a negro (usa el overlay de transición existente de GameRoot o uno propio de
   la plaza) → `onFin()`.

### Cinemática VICTORIA

1. Tween: `this.pos` → spawn de plaza, ~0.8s.
2. Inyectar TODOS los NPCs menos el mafioso: `NPCS_PLAZA` + todos los de
   `NPCS_INTERIOR` excepto `garito`. Posiciones temporales en círculo/arco
   alrededor del player (calculadas, no del editor — son transitorias).
3. Festejo: cada NPC hace "saltitos" (bob exagerado vía GSAP sobre un offset Y
   temporal por NPC, escalonado).
4. Monedas: emisión continua de partículas tipo `brillo` cayendo desde arriba
   (gravedad positiva — hoy las partículas suben; se agrega variante que cae, o se
   emiten arriba con vy>0).
5. Fade → `onFin()`.

### Render durante cinemática

`dibujarPersonajes` ya ordena por Y. Durante la cinemática, la lista incluye los
NPCs temporales + el player con su transform especial. Se agrega soporte para:
- offset Y de festejo por NPC,
- rotación/caída del player,
- fogonazo.

### Partículas

`game/render/particles.js`: agregar tipo `'sangre'` (rojo oscuro, cae con gravedad,
vida corta) y asegurar que `'brillo'` pueda caer (variante con `vy` positivo para
las monedas). Cambios mínimos y aditivos, no rompen los usos actuales (brasas).

### drawPlayer

No se modifica internamente: la caída se logra con transform externo
(`ctx.translate/rotate`). Si la rotación se ve mal por el anclaje, se agrega un
parámetro opcional `escala`/pivote, pero se intenta primero sin tocar el sprite.

---

## Sección 3 — Bienvenida + ayuda

### Componente único `ControlesAyuda.vue`

Contenido de controles (una sola fuente de verdad):
- WASD / flechas → caminar
- Clic → caminar / entrar a edificio
- E → hablar con NPC / interactuar con mesa

Dos modos de uso:
- **Inline** (en `WelcomeScene.vue`): como sección del tutorial.
- **Overlay** (prop `modal`): caja sobre el juego, ESC o clic fuera cierra.

### WelcomeScene.vue

- Intro narrativa con el tono criollo actual (deuda con la mafia, timba en la plaza,
  1810). Reusa el registro de los NPCs/carteles existentes.
- Incluye `ControlesAyuda` inline.
- Botón "Entrar a la plaza" → `ir(ESCENAS.PLAZA)` (igual que hoy).
- Mantiene el salto automático a PLAZA si hay partida guardada.
- **Sin toggle de sonido** (lo agrega el usuario con el audio).
- Pulido visual fino: al final (fuera de esta tanda).

### TopBar.vue

- Sacar el texto "WASD o clic para caminar · clic en un edificio para entrar" del
  centro.
- Botón "?" (Ayuda) en el grupo derecho, **al lado del botón de mute** que ya existe
  → abre `ControlesAyuda` en modo overlay.
- El overlay se monta a nivel de GameRoot o como teleport para quedar sobre todo el
  frame de juego.

### Nota sobre audio (ya existe)

`useAudio.js` ya está implementado por el usuario: música ambient, SFX por nombre
(incluye `victoria`, `gameOver`, `dialogoNpc`, `click`), `toggleMute`/`muteado`
persistido, y el botón de mute ya vive en la TopBar. **No se toca.** Esta tanda NO
agrega toggle de sonido a la bienvenida. Las cinemáticas PUEDEN disparar
`sfx('victoria')`/`sfx('gameOver')` en el momento de la animación (hoy suenan en
ResultScene) — se decide al final, junto con el pulido de pantallas.

---

## Sección 4 — Aviso "ya podés saldar"

- Toast temporal cuando la plata **cruza** la deuda hacia arriba (de `<deuda` a
  `>=deuda`).
- Texto tipo: "Ya tenés con qué saldar — andá al garito". Se va solo ~4s.
- **Re-disparable**: flag `estabaPorEncima` (no persistido). Salta en cada
  transición de abajo→arriba. Si bajás apostando y volvés a cruzar, reaparece.
- Implementación: watcher sobre `state.plata >= state.deuda`. Componente toast
  (nuevo, simple) montado en GameRoot para que se vea en cualquier escena con
  TopBar. Se apoya en `puedeleSaldar` existente.

---

## Sección 5 — Typewriter en NpcDialog + caminar al NPC

### Typewriter (`components/ui/NpcDialog.vue`)

- Al abrir, el texto se revela char por char (~25ms/char, configurable).
- Mientras escribe: **E no hace nada** (no completa, no rota).
- **Alejarse del NPC o cerrar** → corta el tipeo y cierra la caja.
- La rotación de línea (`indiceDialogo` por id) sigue como hoy: la próxima línea se
  ve la próxima vez que hablás, no a mitad del tipeo.
- Timer limpiado en `onUnmounted` y al cerrar, para no dejar intervalos colgados.
- Aplica **solo a NpcDialog** (bienvenida/result quedan estáticos por ahora).

### Caminar al NPC antes de abrir (clic)

Hoy clic sobre un NPC abre el diálogo solo si ya estás cerca (`RADIO_CERCA_NPC`);
si está lejos no pasa nada. Nuevo comportamiento del **clic**:

- Clic sobre un NPC (cerca o lejos) → el player **camina hasta él** (a una posición a
  distancia `RADIO_CERCA_NPC` del NPC, para no chocarlo) → al llegar, abre el diálogo.
- Se implementa con un "target con NPC pendiente" análogo al target con edificio:
  `this.cola`/`this.target` con un campo `npc`. `llegarATarget` detecta el NPC y lo
  reporta vía un callback `onHablar` (o el componente lo lee del renderer).
- La **tecla E** sigue como hoy: abre directo (ya estás cerca por definición).
- Durante `modoCinematico`, el clic se ignora (input bloqueado).

Nota: el SFX `dialogoNpc` que hoy suena en `NpcDialog.onMounted` debe sonar cuando
**se abre** la caja (al llegar), no al clickear. Como la caja se monta al llegar, el
`onMounted` actual ya queda en el momento correcto.

---

## Sección 6 — ResultScene

Sin cambios en esta tanda. La cinemática hace fade y entra a la `ResultScene`
actual tal cual. El pulido de las pantallas Ganar/Perder se ve al final.

---

## Puntos de integración (resumen)

| Feature | Archivos a tocar |
|---|---|
| Estado cinemática | `useSceneManager.js` (flag + `irAPlazaConCinematica`), `useGameState.js` (saldarDeuda, marcarResultado, sacar forzar*) |
| Cinemática derrota/victoria | `game/plaza/PlazaScene.js` (modoCinematico + `iniciarCinematica`), `particles.js` (sangre + brillo cae), `PlazaScene.vue` (onMounted: detectar pendiente y correr) |
| Botones DEV | `GaritoScene.vue` (GANAR/PERDER → ajustar plata + `irAPlazaConCinematica`) |
| Bienvenida + ayuda | `ControlesAyuda.vue` (nuevo), `WelcomeScene.vue`, `TopBar.vue`, `GameRoot.vue` (overlay) |
| Aviso saldar | toast nuevo + `GameRoot.vue` (watcher sobre plata/deuda) |
| Typewriter | `NpcDialog.vue` |

## Riesgos

- **Game over diferido + cinemática:** el onMounted de la plaza debe correr la
  cinemática ANTES de saltar a RESULTADO. Se resuelve con `cinematicaPendiente`.
- **Import circular:** evitado disparando cinemáticas desde componentes, no desde
  useGameState.
- **Partículas que caen:** hoy suben; la variante que cae es aditiva, verificar que
  no rompa las brasas de la plaza.
- **Rotación del player:** si el anclaje del sprite hace que la caída se vea
  desplazada, ajustar pivote del transform (sin tocar drawPlayer si se puede).

## Verificación

`npx nuxt build` debe pasar tras cada cambio. El usuario valida visualmente en su
dev server. Las cinemáticas se testean con los botones DEV GANAR/PERDER del Garito.
