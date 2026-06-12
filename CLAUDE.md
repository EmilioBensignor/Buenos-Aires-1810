# Buenos Aires 1810 — Plaza 1810

Juego web: timba criolla en la Plaza de Mayo de 1810. El jugador le debe plata a
la mafia, recorre la plaza (hub caminable sobre una imagen), entra a edificios
que son interiores caminables, se acerca a una mesa para jugar minijuegos de
apuestas, junta guita, y va al garito a saldar la deuda. Si se queda sin plata,
lo encuentra la mafia (game over).

## Stack
- **Framework**: Nuxt 4 (Vue 3), `ssr: false` (juego 100% cliente)
- **CSS**: Tailwind CSS 3 (`@nuxtjs/tailwindcss`)
- **Animación**: GSAP (import dinámico, nunca en SSR)
- **Render de plaza e interiores**: Canvas 2D sobre imágenes de fondo
- **Base de datos**: Supabase (server: `supabase-benteveo`) — no integrada aún

## Idioma
- UI: español rioplatense (voseo, jerga de época)
- Código: inglés (archivos/funciones); dominio en español (escenas, edificios)
- Comentarios: español, mínimos

## Verificación
- `npx nuxt build` debe pasar tras cada cambio. Es el check estándar del proyecto.
- El usuario valida visualmente en su propio dev server (localhost:3000). No levantar
  un dev server propio salvo que se pida; si se levanta, usar otro puerto y matarlo.
- **GSAP pre-optimizada (08/06/2026)**: `nuxt.config.js` declara `vite.optimizeDeps.include:
  ['gsap']`. GSAP se importa dinámico en varios minijuegos; sin pre-declararla, Vite re-optimiza
  deps a mitad del arranque y el primer `entry.js` cae con `504 (Outdated Optimize Dep)`. Si el
  504 reaparece (típico tras `pnpm install` o cambiar de branch), borrar `node_modules/.vite`
  y `.nuxt` y reiniciar.

## Arquitectura

```
app/
├── app.vue · pages/index.vue   # raíz; index alinea el juego (centrado, o izquierda en modo edición)
├── components/
│   ├── GameRoot.vue            # orquestador: TopBar + frame de juego, monta la escena actual
│   ├── scenes/
│   │   ├── WelcomeScene.vue    # bienvenida (intro + entrar; salta a plaza si hay partida guardada)
│   │   ├── PlazaScene.vue      # wrapper del hub: canvas + cartelitos DOM + NPCs + 4 editores (⇧E/⇧M/⇧W/⇧N)
│   │   ├── InteriorScene.vue   # wrapper genérico de interiores: canvas + NPCs + editor (Shift+E)
│   │   ├── BingoScene.vue      # placeholder del bingo ("próximamente" + volver)
│   │   ├── GaritoScene.vue     # saldar deuda (panel estilo minijuego + barra de progreso) + panel DEV (botones GANAR/PERDER)
│   │   └── ResultScene.vue     # victoria / derrota + jugar de nuevo
│   ├── minigames/              # DiceGame, CardsGame, CupsGame, SapoGame (overlays sobre el interior)
│   └── ui/
│       ├── TopBar.vue          # barra superior: bolsa + deuda + indicaciones + botón volver
│       ├── BetSelector.vue     # botones de apuesta
│       ├── MinigameLayout.vue  # marco común de minijuegos (fondo, título, ESC vuelve)
│       └── NpcDialog.vue       # caja de diálogo de NPC (nombre + texto, clic/tecla cierra)
├── composables/
│   ├── useGameConfig.js        # PANEL DE BALANCE: economía (centavos), pagos, animaciones + formatMoneda
│   ├── useGameState.js         # estado global reactivo (singleton) + localStorage + regla de derrota + niveles de dificultad
│   ├── useSceneManager.js      # FSM de escenas + interiores + fundido + flag modoEdicion
│   ├── useGameLoop.js          # wrapper de requestAnimationFrame
│   └── useInput.js             # teclado (WASD/flechas) → vector de dirección
├── game/
│   ├── plaza/
│   │   ├── PlazaScene.js       # PlazaRenderer: hub sobre plaza.png; caminar, colisión, caminos, NPCs, 4 editores
│   │   ├── buildings.js        # EDIFICIOS, ZONA_CAMINABLE, CAMINOS + helpers de navegación
│   │   └── pathfinding.js      # NO usado (sistema iso viejo; ver "dead code")
│   ├── interiors/
│   │   ├── interiors.js        # INTERIORES (caminable, mesa, salida, spawn, obstaculos, escalaJugador)
│   │   └── InteriorScene.js    # InteriorRenderer: interior caminable + NPCs + editor (Shift+E, teclas 1-7/N)
│   ├── npc/
│   │   └── npcs.js             # NPCS_PLAZA + NPCS_INTERIOR (pos norm, paleta/oficio, diálogos) + helpers de colisión/cercanía
│   ├── render/
│   │   ├── drawPlayer.js       # sprite del jugador (pixel-art por código, 4 dirs, escala)
│   │   ├── particles.js        # chispas/brasas (usado por la plaza)
│   │   ├── drawNpc.js          # sprite de NPC (pixel-art por código, paleta + oficio); usado por plaza e interiores
│   │   └── isoMath.js          # NO usado (matemática iso vieja; ver "dead code")
│   └── minigames/              # lógica pura: dice.js, cards.js, cups.js, sapo.js (ring.js = dead code)
└── assets/css/main.css         # @tailwind + variables CSS + reset
```

## Flujo de escenas (FSM en `useSceneManager`)

```
BIENVENIDA → PLAZA → INT_X (interior caminable) → MINIJUEGO → INT_X → PLAZA → ... → RESULTADO
```

- `entrarA(escena, idEdificio)`: entra a un edificio desde la plaza.
- `irAJuego(escena)`: desde la mesa de un interior al minijuego (recuerda el interior).
- `volver()`: del minijuego vuelve al interior si vino de uno, si no a la plaza.
- `volverAPlaza()`: siempre a la plaza.
- `modoEdicion`: true cuando hay un editor abierto → `index.vue` alinea el juego a la izquierda.
- Cada edificio → un interior `INT_*`; la mesa del interior dispara el minijuego real.

| Edificio | Interior | Minijuego | Estado |
|---|---|---|---|
| Pulpería | INT_PULPERIA | NAIPES (cards) | ✅ mapeado |
| Cabildo | INT_CABILDO | DADOS (dice) | ✅ mapeado |
| Mercado | INT_MERCADO | CUBILETES (cups) | ✅ mapeado |
| Feria | INT_FERIA | SAPO (sapo) | ✅ mapeado (escena sigue llamándose `SORTIJA` en el FSM) |
| Iglesia | INT_IGLESIA | BINGO (placeholder) | ✅ mapeado, juego sin armar |
| Garito | INT_GARITO | GARITO (saldar deuda) | ✅ mapeado |

## Plaza (`game/plaza/buildings.js`)

Anclada a `plaza.png`. Coords NORMALIZADAS (0-1) sobre la imagen:
- `EDIFICIOS[]`: cada uno con `zona` (polígono clickeable), `puerta` (a dónde camina
  para entrar), `cartel` (posición del cartelito DOM), `escena`, `nombre`, `pista`.
- `ZONA_CAMINABLE`: polígono del adoquinado; el jugador no sale de ahí ni entra a edificios.
- `CAMINOS`: objeto `"origen>destino" → [nodos]`. El jugador navega por estos caminos
  entre edificios (Dijkstra-libre, son rutas explícitas). "inicio" = spawn de plaza.
- **Anti-trabado**: al salir de un edificio, una "gracia" evita re-entrar por su puerta
  hasta alejarse. El spawn al volver cae pegado a la puerta (`puntoCaminableCercaDe`).

## Interiores (`game/interiors/interiors.js`)

Cada interior (coords normalizadas sobre su fondo):
- `caminable` (polígono) · `mesa` {poly, escena, etiqueta} · `salida` {poly} ·
  `spawn` {x,y} · `obstaculos` [polígonos no caminables] · `escalaJugador` (tamaño del sprite).
- Entrás → aparecés en `spawn`, caminás (sin atravesar obstáculos), te acercás a la
  `mesa` (clic, colisión o tecla E) → dispara el minijuego. La `salida` vuelve a la plaza.
- La salida cuenta como zona de paso (caminable). "Gracia" evita re-disparar al reaparecer.

## NPCs (`game/npc/npcs.js`)

Personajes no jugables, pixel-art por código (`game/render/drawNpc.js`, mismo cuerpo base
que el jugador, varía por `pal` = paleta + `oficio` = tocado/detalle). Coords NORMALIZADAS.

- **Catálogo**: `NPCS_PLAZA[]` (plaza) y `NPCS_INTERIOR{}` (clave = id de interior). Cada NPC:
  `{ id, nombre, pos:{x,y}, pal:{...,oficio}, dialogos:[] }`.
- **10 NPCs cerrados** (posición calibrada + textos finales, alineados con la mecánica de cada juego):
  - Plaza (4): San Martín, Belgrano, Moreno, El Caído (ciudadano fundido en la calle).
  - Interiores (6, 1 c/u): Pulpero, Comerciante, Guardia, Feriante, La Pocha (campeona del bingo), Mafioso.
- **Oficios** (en `drawNpc.js`, switch `dibujarOficio`): `bicornio` `galera` `galeraOscura`
  `anteojos` `morrion` `delantal` `panuelo` `andrajo`. Cada uno = otro tocado/detalle.
- **Interacción** (reusa el patrón de la mesa): el NPC **frena** al jugador (colisión por
  radio, `npcEnPunto`). Al estar cerca (`npcCercaDe`, radio mayor) aparece el prompt
  "**E** Hablar". Tecla **E** o **clic** sobre el NPC → abre `NpcDialog.vue`. Cada vez que
  hablás, **rota a la siguiente línea** (`indiceDialogo` por id, vuelve al principio). En
  interiores, hablar tiene prioridad sobre disparar la mesa (`interactuar()` chequea NPC primero).
- **Colisión/cercanía**: helpers en `npcs.js` (`RADIO_CHOQUE_NPC`, `RADIO_CERCA_NPC`,
  `npcEnPunto`, `npcCercaDe`). Se aplican en `aplicarMovimientoConColision` (plaza) /
  `aplicarMovimiento` (interior) y en el `update` para setear `npcCerca`.
- **Render**: jugador + NPCs se dibujan ordenados por `y` (depth sort: los de más abajo
  tapan a los de arriba). En interiores respetan `escalaJugador`. Idle bob por `tiempo`.
- **Posicionar (editor visual)**: en la plaza **⇧N** abre el editor de NPCs (arrastrás cada
  uno, botón "Copiar NPCs" → JSON con `{id, pos}`). En interiores, dentro del editor (Shift+E)
  elegís el elemento **7 (npc)** y arrastrás; botón "Copiar NPCs" (incluye `interior` + array).
  Pegar las `pos` exportadas en `npcs.js`.

## EDITORES VISUALES — YA SACADOS (08/06/2026, para el MVP)

Los HUDs de edición (zonas/caminos/NPCs en la plaza con Shift+E/M/W/N; elementos 1-7 en
interiores) se ELIMINARON antes de publicar. Toda la calibración ya está fija en los
archivos de datos (`buildings.js`, `interiors.js`, `npcs.js`). El gameplay quedó intacto:
`E` = hablar con NPC / interactuar con mesa; clic = caminar/entrar/hablar.

Si en el futuro hay que recalibrar algo espacial, recuperar los editores del historial o
rehacerlos con el patrón canvas + "Copiar JSON" (ver "Patrón clave del proyecto").

Quedó fuera de archivo:
- `index.vue` / `useSceneManager`: `modoEdicion` eliminado (el juego siempre va centrado).
- `PlazaScene.vue` / `InteriorScene.vue`: solo handlers de juego (`@click`, `@mousemove` hover).
- `game/plaza/PlazaScene.js` (1140→605 líneas) y `game/interiors/InteriorScene.js` (514→190):
  sin métodos `toggleEditor*`/`exportar*`/`dibujarEditor*`/arrastre. `draw()` solo dibuja personajes.
- El **panel DEV del Garito** (botones GANAR/PERDER) SE MANTIENE — requisito del profe.

<details><summary>Cómo se sacaron (referencia histórica)</summary>

Los editores son self-contained; sacarlos no afecta el gameplay. Pasos:

1. **`PlazaScene.vue`**: borrar las ramas `⇧e`/`⇧m`/`⇧w`/`⇧n` de `onKey` (CONSERVAR la rama
   `e` sola = hablar con NPC), las refs `editor`/`editorCaminable`/`editorCaminos`/`editorNpcs`,
   `syncEditor`, los handlers de drag de edición en `onDown/onMove/onUp/onDblClick/onContext`
   (dejar el caso de juego: `clickEn`/`moverMouse`/`clickNpc`), y todo el bloque
   `<div v-if="enEditor">` del panel derecho. Quitar import de `EDIFICIOS` si queda sin uso.
   NO tocar lo de NPCs en juego (prompt "E Hablar", `NpcDialog`, `chequearDerrota`).
2. **`InteriorScene.vue`**: borrar la rama `Shift+E`/teclas `1-7`/`N`/`+/-` de `onKey`
   (dejar solo `E` = interactuar), los handlers de edición y `copiarNpcs`/`copiarCartel`, y el
   bloque `<div v-if="editor">`. NO tocar el prompt de NPC ni `NpcDialog`.
3. **`game/plaza/PlazaScene.js`**: borrar `toggleEditor*` (incl. `toggleEditorNpcs`),
   `empezarArrastre`/`arrastrar`/`terminarArrastre`, `agregarVertice`/`borrarVertice`, los
   métodos `caminable*`, `caminos*`, `npcs*` (del editor: `npcsEmpezar`/`npcsArrastrar`/
   `npcsTerminar`/`exportarNpcs`), `setPar`/`caminoActivo`/`exportar*`, `dibujarEditor*`, y los
   flags `editor*`/`agarre*`/`cam*`/`nodoSel`/`agarreNpc`. En `draw()` dejar solo
   `dibujarPersonajes` (jugador + NPCs). CONSERVAR navegación + NPCs en juego
   (`navegarAEdificio`, `CAMINOS`, `reaparecerEn`, colisión, `hablar`/`hablarConCerca`/`clickNpc`, `npcCerca`).
4. **`game/interiors/InteriorScene.js`**: borrar `toggleEditor`, `setElemento`,
   `ajustarEscala`, `polyActivo`, `nuevoObstaculo`, `empezarArrastre`/`arrastrar`/
   `terminarArrastre`, `agregar`/`borrar`, `exportar`/`exportarNpcs`/`exportarCartel`,
   `dibujarEditor`/`dibujarPoly`/`dibujarNpcsEditor`, y los flags `editor`/`elementoActivo`/`agarre`.
   En `draw()` dejar solo `dibujarPersonajes`. CONSERVAR NPCs en juego
   (`hablar`/`clickNpc`, `interactuar`, `npcCerca`, colisión).
5. **`useSceneManager.js`**: borrar `scene.modoEdicion`, el computed `modoEdicion` y su export.
6. **`index.vue`**: quitar el `:class` condicional de `modoEdicion`, dejar `justify-center`.
7. **`GaritoScene.vue`**: el panel DEV (botones GANAR/PERDER) — NO se sacó (requisito del
   profe). Ahora llaman `devGanar`/`devPerder` → `irAPlazaConCinematica` (ya no `forzar*`).

</details>

## Economía (`useGameConfig.js`)
- Moneda: pesos. Internamente todo en **centavos enteros** (sin floats). 1 peso = 100¢.
- Arranca con $5 (500¢), debe $200 (20000¢). Apuestas: 50¢, $1, $2, $3, $5.
- `formatMoneda` muestra `$X` / `$X,YY` (coma decimal, estilo argentino).
- Azar puro (dados/naipes) EV < 1; habilidad (cubiletes/sapo) EV > 1 jugando bien.
- **Balance pensado para grind**: tope de apuesta $5 vs deuda $200 → ningún golpe único
  resuelve el juego (máx $5×x4=$20, 10% de la deuda). Saldar = ~20-30 manos ganadas.

### Pagos y probabilidades (5 minijuegos cerrados)
| Juego | Pago | Prob. ganar | Tipo |
|---|---|---|---|
| Naipes (Pulpería) | x2 | ~46% | azar puro |
| Dados (Cabildo) | Mayor/Menor x2 · Exacto 7 x4 | 41.7% / 41.7% / 16.7% | azar puro |
| Cubiletes (Mercado) | x2 | 33% al azar (más si seguís la bolita) | habilidad |
| Sapo (Feria) | x1.5 / x2 / x3 según franja (peor caso ganador x1.5) | depende del skill | habilidad |
| Bingo (Iglesia) | Línea x1.5 · Bingo x2.5 (acumulables) | ~25% c/premio (4 jugadores parejos) → EV ~1.00 (neutro) | azar puro |
- El cartel de pago en cada minijuego usa el formato **"Paga x{n}"** / **"Paga hasta x{n}"** (sin "Ganar/Acertar").

### El Sapo (Feria) — mecánica y dificultad progresiva
- Reemplazó a la sortija (mismo input de timing, otra temática). La barra de fuerza
  oscila; clavás (clic/ESPACIO) en una franja. Zonas configurables en `SAPO.zonas`
  (array `{pago, ancho}`, ancho relativo): `✕ negro · x1.5 · x2 · x3 · x2 · x1.5 · ✕ negro`.
  El x3 (boca) es la franja más angosta. **No hay franjas que paguen menos de lo apostado**:
  todo resultado ganador es ≥ x1.5, así "¡Ganaste!" siempre es verdad (antes había x0.5 que
  pagaba la mitad y igual decía "ganaste" — confuso, se sacó). Errar a las puntas (✕) = perdés todo.
  La ficha cae SIEMPRE en un punto fijo
  (boca / agujero de la tabla / madera), nunca "cerca" — animada como `<circle>` dentro
  del mismo SVG del sapo (coords del viewBox, sin conversión px frágil).
- Lógica pura en `game/minigames/sapo.js`: `zonasSapo(nivel)` y `resolverSapo(fuerza, nivel)`.

### El Bingo (Iglesia) — carrera contra 3 abuelas
- **Mecánica**: vos + 3 NPCs (La Nonna · Doña Yoli · **La Pocha**), cada uno con un cartón
  5x5 (centro libre, 24 números de un bombo de 50). Se cantan bolillas en orden. Dos premios
  **acumulables**: LÍNEA (primer jugador en completar fila/columna/diagonal, paga x1.5) y
  BINGO (primer cartón lleno, paga x2.5). Podés cobrar ambos en la misma mano.
- **Cartones por columna** (estilo bingo clásico): cada columna sortea de su propio rango —
  B 1-10 · I 11-20 · N 21-30 · G 31-40 · O 41-50. Coherente con la cabecera B-I-N-G-O. El
  orden vertical dentro de cada columna es aleatorio (como el bingo real). `totalBombo` DEBE
  ser múltiplo de 5 (una columna por cada `total/5` números).
- **Interacción**: las viejas se marcan solas con un **delay humano random** (350-700ms,
  `viejaMarcaMin`/`viejaMarcaMax`) para que no se sienta que "te ganan de mano" en empates;
  vos marcás a mano. Cuando sale TU número, la bolilla **espera tu clic** en la celda (no
  avanza hasta que marcás). Tu velocidad NO decide quién gana — el ganador de cada premio está
  predeterminado por el orden del bombo (azar puro). Marcar es ritual de tensión, no skill.
- **Freno al hacerse bingo**: en el turno del bingo ganador (`turnoBingoGanador`), el canteo
  termina y se marca SOLO el cartón del ganador. Los perdedores (incluido el tuyo si no ganaste
  el bingo) quedan **a medias**, sin la(s) casilla(s) final(es). Evita que se vean 4 cartones
  llenos y hace visible que el ganador llegó primero (antes el marcado seguía y todos se
  llenaban → parecía arbitrario "completamos igual pero ganó ella").
- **Fix cierre del bingo ganado por vos (08/06/2026)**: en `cantarSiguiente`, el turno final
  marcaba TU última celda automáticamente Y a la vez pedía tu clic (`esperandoClic`). Como ya
  quedaba marcada (verde + `:disabled`), el clic era imposible → `finalizar()` nunca corría y
  el cartón quedaba lleno y trabado. Ahora: si ganás vos y la bolilla final es tuya sin marcar,
  NO la marca el código (espera tu clic); si gana una vieja o tu celda ya estaba marcada, cierra
  solo. Ambos caminos llegan a `finalizar()`.
- **Lógica pura** en `game/minigames/bingo.js`: `generarMano(config)` arma los 4 cartones +
  bombo y **resuelve de antemano** `ganadorLinea`/`ganadorBingo` y sus turnos (índice en el
  bombo). **En empate, sorteo aleatorio 50/50 entre los empatados** (`sorteoEmpate`) — NO
  prioriza al jugador. Antes priorizaba a vos ("amable"), pero con cartones por columna los
  empates son frecuentes y eso disparaba el EV a 1.31; el sorteo neutro lo deja en 1.00.
  `cobroMano(mano, config)` suma los pagos de los premios que ganaste. `probabilidadGanar`
  quedó sin usar (era del diseño viejo).
- **Balance** (`BINGO` en useGameConfig): `totalBombo:50` (múltiplo de 5), `pagoLinea:1.5`,
  `pagoBingo:2.5`, `viejas:['La Nonna','Doña Yoli','La Pocha']`, `msEntreCantos:1600`,
  `msRevelarPremio:1100`, `viejaMarcaMin:350`, `viejaMarcaMax:700`. 4 jugadores parejos +
  desempate justo → ~25% de pegar cada premio, **EV ~1.00 (neutro)**, verificado por Monte
  Carlo en node (300k manos). Es el juego MÁS amable de la plaza: a la larga ni ganás ni
  perdés, mientras naipes/dados (azar puro) tienen casa ~9%. Decisión de diseño aprobada
  (se rechazó subir las chances del jugador para no romper el grind de la deuda).
- **Componente** `components/minigames/BingoGame.vue`: patrón cerrado `apostar → cantar →
  resultado`. Layout en 2 columnas dentro de un panel "mesa de parroquia" (w-940px): tu cartón
  grande a la izquierda; a la derecha el bolillero (bola SVG grande SIN marco/aro) arriba con la
  tira "Salieron" (últimas 15, `slice(-15)`), y los 3 cartones chicos de las campeonas abajo
  (`grid-cols-3`). Números con `tabular-nums`. La bolilla se anima con **GSAP** (import dinámico
  en `onMounted`): cada bolilla entra girando (`rotation:-220 → 0`, `scale:0.5 → 1`,
  `back.out(1.7)`, 0.55s) — estilo dados, no aparece de golpe. `animarBolilla()` se llama al
  setear cada `bolillaActual`.
- **Badges de premio**: las campeonas que ganan muestran un pill flotante en la esquina sup.
  der. de su card (`absolute top-0 right-0`, fondo sólido `farol`/`perdida` con texto `noche`,
  NO compite con el nombre). **Tu cartón** muestra el suyo igual pero **verde** (`bg-ganancia`)
  = ganaste vos. El resultado de arriba muestra el detalle: "¡Ganaste! +$X · Línea/Bingo/Línea
  + Bingo" (`resultado.ganasteLinea`/`ganasteBingo`). Al perder: "Perdiste".
- **Título/copy**: la escena se titula "La Iglesia" (MinigameLayout). El paso 3 de reglas dice
  "Si tenés línea o bingo, ¡cantalo!" → es **texto temático**, NO mecánica real: el cantado es
  automático (se decidió no meter botón cantar con riesgo, para no romper el azar puro).
- **Estado**: CERRADO. Fondo `iglesia.png` ya en `public/assets/` (el MinigameLayout le pone
  overlay `bg-noche/60` encima para legibilidad). Nada pendiente.

### Dificultad progresiva (sapo + cubiletes) — `state.nivel`
- `state.nivel = { sapo, cubiletes }` en `useGameState`, **persistido en localStorage**.
- **Sube al ganar** (`subirNivel`), **se reinicia a 0 al perder** (`reiniciarNivel`).
  Persiste al ir a la plaza y volver; tope `NIVEL_MAX = 10`; `reiniciar()` (partida nueva) lo resetea.
- Helpers de balance en `useGameConfig`: `zonasSapoNivel`/`velocidadSapoNivel` (sapo:
  zonas ganadoras se achican por `factorAnchoPorNivel`, línea acelera), `barajadasCubiletesNivel`/
  `velocidadFinalCubiletesNivel` (cubiletes: +barajadas, más rápido). Curva fácil→difícil sin tocar lógica.

### Regla de derrota (IMPORTANTE — fix all-in)
- `apostar()` **NO** chequea derrota (un all-in te deja en $0 ANTES de jugar). La derrota
  se evalúa al **terminar la jugada**, en `cobrar()`. Por eso **todo minijuego, al perder,
  llama `cobrar(0)`** (no solo al ganar). Mantener este patrón en juegos nuevos.
- **Game over DIFERIDO (07/06/2026)**: la derrota NO salta a RESULTADO al instante. Perdés en
  un minijuego → quedás en $0 → volvés al interior, caminás (todo en $0) → recién al **pisar la
  plaza** salta el game over. Cómo:
  - `useSceneManager` watch sobre `resultado`: salta a RESULTADO solo en **victoria** (la derrota
    se ignora, no cambia escena).
  - `PlazaScene.vue` onMounted: llama `chequearDerrota()` (marca derrota si plata ≤ 0 y era null)
    y si `state.resultado === 'derrota'` (marcada acá o antes en un minijuego) → `ir(RESULTADO)`.
  - Regla efectiva: **si llegás a cero, perdés** — pero te quedás fundido donde estés hasta
    volver a la plaza; y un all-in ganador no te mata antes de repartir.
  - A FUTURO (anotado): mejora narrativa → el mafioso esperándote en la plaza antes del game over.
- `apostar()` **NO** chequea derrota (un all-in te deja en $0 ANTES de jugar). La derrota
  se evalúa al **terminar la jugada**, en `cobrar()`. Por eso **todo minijuego, al perder,
  llama `cobrar(0)`** (no solo al ganar). Mantener este patrón en juegos nuevos.

### Empates (devolución de apuesta)
- **Naipes (07/06/2026)**: empate de serie (mismas rondas ganadas, ej 2-2 o todo empates) →
  **devuelve la apuesta** (ni ganás ni perdés). `resultadoSerie(partida)` en `cards.js` devuelve
  `'gano'|'perdio'|'empate'`; en empate `CardsGame` hace `cobrar(apuesta)`. Mensaje "Empate ·
  recuperás tu apuesta" en dorado. (`ganoSerie` quedó por compat, sin uso.)
- **Otros juegos NO tienen empate**: Dados cubren todo el rango (menor ≤6 · exacto 7 · mayor ≥8,
  sin hueco), Cubiletes y Sapo son binarios (acertás/no), Bingo resuelve empate de premio con
  sorteo 50/50 justo. Solo naipes devolvía mal (perdías) → arreglado.

### Garito (`GaritoScene.vue`)
- Panel estilo minijuego (bg-noche/95 + borde dorado + shadow-farol-lg): bolsa (dorado)
  vs deuda (perdida), **barra de progreso** hacia saldar (`state.plata / state.deuda`),
  texto "Te falta $X". Botón "Saldar"/"Intentar saldar" según `puedeleSaldar`.
- Al intentar sin plata: **shake** del panel (keyframe local en `<style scoped>`) + reto
  de la mafia ("Volvé cuando tengas la guita, criollo").
- Botón **"← Plaza"** arriba izq (`volverAPlaza`). NO usa MinigameLayout (es escena propia).
- Panel DEV (GANAR/PERDER) requisito del profe, solo botones (sin teclas).

## Cinemáticas, narrativa, ayuda y avisos — CERRADO (08/06/2026)

Sesión completa, validada por el usuario. Spec + plan en `docs/superpowers/`
(`specs/2026-06-08-narrativa-cinematicas-design.md`, `plans/2026-06-08-narrativa-cinematicas.md`).

### Cinemáticas de victoria / derrota (NO son video — GSAP sobre el canvas de la plaza)
- **Estado**: `scene.cinematicaPendiente` ('victoria'|'derrota'|null, transitorio, NO se
  persiste) en `useSceneManager` + `irAPlazaConCinematica(tipo)` (setea el flag y va a la PLAZA).
- **Disparadores** (4, todos vía componentes para evitar import circular en useGameState):
  derrota real (PlazaScene.onMounted detecta resultado='derrota' → marca pendiente),
  victoria real (GaritoScene "Saldar" → `saldarDeuda()` + `irAPlazaConCinematica('victoria')`),
  botones DEV GANAR/PERDER del garito (→ `irAPlazaConCinematica`). `forzarVictoria/forzarDerrota`
  se BORRARON de useGameState; `saldarDeuda` ya NO marca resultado; se agregó `marcarResultado(tipo)`.
- **La plaza las corre** (`PlazaScene.vue` onMounted async): si hay pendiente, `enCinematica=true`,
  importa GSAP dinámico, llama `renderer.iniciarCinematica(tipo, gsap, onFin)`. Al terminar:
  `terminarCinematica` hace fade (`fadeCine`) + `marcarResultado(tipo)` + **`ir(RESULTADO)` SIEMPRE
  explícito** (NO depende del watcher de victoria del FSM: si resultado ya valía 'victoria' de una
  partida previa, el watcher no dispara = era un bug, ya arreglado).
- **Renderer** (`game/plaza/PlazaScene.js`): `modoCinematico` bloquea input en `update`. Métodos
  `iniciarCinematica` / `cinematicaDerrota` / `cinematicaVictoria`. `iniciarCinematica` recibe gsap
  por parámetro (el renderer NUNCA importa GSAP — patrón del proyecto).
  - **Derrota**: mafioso (clon de `NPCS_INTERIOR.garito[0]`) sale de la puerta del garito y recorre
    el camino REAL `caminoEntre('garito','inicio')` a **velocidad pareja** (duración de cada tramo
    ∝ su distancia, `VEL_MAFIOSO=0.18`; antes era 0.55s fijo y los tramos largos se veían acelerados).
    Beat de tensión 0.7s, disparo, knockback + sangre, player cae rotando (`cinePlayerRot`,
    `dibujarPlayerCine` rota con pivote a media altura). **El SFX 'disparo' arranca 0.7s ANTES del
    flash** (`tl.call(sfx)` y el `fogonazo` con `'>0.7'`) para compensar la latencia de play de
    Howler — valor afinado a mano por el usuario; el timing del clip se midió con `ffmpeg
    silencedetect` (el bang del mp3 está en ~0.025–0.27s).
  - **Victoria**: TODOS los NPCs (NPCS_PLAZA + NPCS_INTERIOR menos garito) en semicírculo alrededor
    del player, saltitos escalonados (`cineOffsetY`) + lluvia de monedas (partícula 'brillo' que cae).
    La cinemática DURA lo que el clip `festejo.mp3` (~6.04s, anclado con label GSAP `'festejo'` +
    `DUR_FESTEJO`) para no cortarlo. Los NPCs aparecen de golpe (pendiente menor: que entren caminando/fade).
  - **Secuencia de audio**: 'disparo'/'festejo' suenan en la cinemática; 'ganar'/'perder' (`sfx` en
    ResultScene.onMounted) suenan DESPUÉS, al aparecer la pantalla (secuenciales, no encimados —
    por eso la cinemática espera a que el clip termine antes del fade).
- **particles.js**: `emitir(x,y,n,tipo,opts)` con opts `{vy,vyVar,vx,gravedad,vidaMin,vidaVar,tam,spread}`;
  gravedad por partícula; tipos 'sangre' (rojo, cae fuerte) y 'brillo' que puede caer (monedas).
  Cambios aditivos — los usos viejos (brasas) siguen igual.

### Bienvenida, ayuda y avisos
- **WelcomeScene**: título "Buenos Aires 1810" (sin eyebrow arriba), textos agrandados, SIN sección
  "cómo se juega" inline (se movió al modal). El `<title>` y favicon (`public/favicon.ico`, en head
  con `?v=2` cache-bust) son "Buenos Aires 1810".
- **ControlesAyuda.vue** (componente único, prop `modal`): modal de ayuda. Se abre **1ª vez al pisar
  la plaza** (flag `plaza1810_tutorial_visto` en localStorage, watch sobre escenaActual en GameRoot)
  + botón **"?"** en TopBar (emite 'ayuda', reemplazó el texto de controles del centro de la barra).
  Controles: **WASD en 2 filas de keycaps** (letras arriba, flechas ↑←↓→ abajo), Clic, E. Incluye
  **switch de mute global** (mismo `muteado`/`toggleMute` que el botón de la barra) + **2 sliders de
  volumen** (Música/Efectos, `setVolMusica`/`setVolSfx`), deshabilitados al mutear.
- **AvisoSaldar.vue**: toast verde "¡Ya tenés con qué saldar!" cuando la plata CRUZA la deuda hacia
  arriba (re-disparable, flag `estabaPorEncima`, ~4.5s). Montado en GameRoot. Usa `puedeleSaldar`.
- **NpcDialog typewriter**: el texto se escribe char x char (~25ms, `MS_POR_CHAR`). Alejarse del NPC
  o cerrar corta el timer. Clic en NPC LEJANO → el player camina hasta él (`clickNpc`/`caminarHaciaNpc`,
  callback `onHablar`) y abre el diálogo al llegar (E cuando ya estás cerca abre directo).
- **NPC se corre del camino**: al navegar a un edificio, un NPC sobre la ruta se hace a un lado
  (`despX`/`despY` interpolado, perpendicular al avance, vuelve solo al alejarte). Caminando libre con
  WASD el NPC sigue FRENÁNDOTE (para poder hablarle). `npcsEfectivos()` = base+offset, usado en
  colisión (`aplicarMovimientoConColision`) y dibujo (`dibujarPersonajes`).

### Audio (`useAudio.js`) — lo trabaja el usuario, NO tocar sin avisar
Howler import dinámico. Música ambient loop (`VOL_MUSICA_BASE=0.2`). Catálogo `SFX` por nombre
(tirarDados, repartirNaipe, moverCubiletes, tirarSapo, cantarBolilla, marcarCarton, dialogoNpc,
**disparo, festejo**, victoria='ganar.mp3', gameOver='perder.mp3', click). Config persiste en
localStorage `plaza1810_audio_v1` como JSON `{mute,volMusica,volSfx}` (retrocompat del string viejo
'mute'|'on'). `setVolMusica/setVolSfx` aplican en vivo; `sfx()` no-op silencioso si falta el archivo.
**Para alinear SFX a animaciones**: medir el clip con `ffmpeg -i x.mp3 -af silencedetect=noise=-40dB:d=0.05 -f null -`
(los tramos entre silencios = sonido real) y compensar la latencia de Howler disparando el `sfx()` ANTES
del frame visual.

### OJO — error 504 "Outdated Optimize Dep"
Tocar `nuxt.config.js` con el dev server corriendo lo dispara (Vite re-optimiza deps a mitad del
arranque). Fix: `rm -rf node_modules/.vite .nuxt` + reiniciar el dev server. **AVISAR al usuario antes
de tocar `nuxt.config.js`.** Para verificar JS sin tocar la caché del dev server, usar `node --check
<archivo>` en vez de `npx nuxt build`.

## Próximos pasos (orden sugerido)

**Cerrados:** Naipes (Pulpería), Dados (Cabildo), Cubiletes (Mercado), Sapo (Feria) —
mecánica, diseño y balance aprobados. Comparten el patrón de fases `apostar → juego →
resultado` con `BetSelector`, panel/selector + botón "Tirar/Repartir/Empezar", y resultado
con "Jugar otra".

**Bingo (Iglesia): CERRADO** — mecánica, balance y pulido visual aprobados (ver sección
"El Bingo" arriba). Cartones por columna, desempate justo (EV 1.00), bolilla animada con
GSAP, ritmo y delay de viejas afinados, badges de premio (tu cartón + campeonas), copy
"La Iglesia"/"Perdiste", fondo `iglesia.png` ya puesto en `public/assets/`. Nada pendiente.

### Patrones cerrados a reusar
- **Anti-shift (alto reservado)**: todo bloque que aparece/desaparece según la fase
  (mensaje de resultado, botón "Jugar otra") va dentro de un contenedor de **alto fijo**
  (`h-[52px]`, `h-28`, etc.) presente siempre, con el contenido en `v-if` adentro. Así
  el tablero no salta cuando aparece el resultado. Si el bloque no debe existir en
  `apostar`, envolver el contenedor en `v-if="fase !== 'apostar'"`. Ya aplicado en
  DiceGame y CupsGame. **OJO con bloques que aparecen escalonados**: si un sub-elemento
  (ej. el veredicto de dados) entra DESPUÉS del otro con `v-if`, dale su PROPIO alto
  reservado (ej. `<span class="h-8">` siempre presente, texto vacío hasta que toca) — si
  no, al aparecer empuja al de arriba. En dados el contenedor usa `justify-start` (no
  `center`) para anclar el número arriba.
- **Botones de cierre de minijuego (08/06/2026)**: en la fase resultado, **Salir** (izquierda,
  sobrio: `bg-noche border-light/20`, hover dorado, llama `volver()`) + **Jugar otra** (derecha,
  dorado). Mismo orden en los 5 minijuegos. "Salir" hace lo mismo que el botón de arriba-izq del
  `MinigameLayout` (vuelve al interior); el de arriba se mantiene. `volver` viene de
  `useSceneManager` (CardsGame ya lo importaba; en los otros se sumó el import).
- **Resultado**: número/veredicto grande **arriba** del tablero (no abajo), en
  `text-ganancia`/`text-perdida`. Mensaje formato "¡Ganaste! +$X" / "Perdiste". En **dados**
  es **secuencial (08/06/2026)**: primero aparece la suma sola (dorada), y tras ~650ms
  (`setTimeout` → `veredictoVisible`) el veredicto + los botones. La suma se tiñe verde/rojo
  junto con el veredicto.
- **Animación natural (referencia DiceGame)**: dados en SVG (no divs con puntos planos)
  — caras como `<symbol>`s `#cara-1..6`, marfil tallado con degradés + pips con relieve.
  Tirada con `await nextTick()` ANTES de animar (los refs no existen hasta montar el
  bloque de la fase). Curva: `power3.out`, `tiradaDados` 1.6s, y los cambios de cara se
  **espacian con el progreso** (`this.time()`/`this.progress()` del tween: ~45ms al inicio
  → ~320ms al final) para que el resultado se "asiente" en vez de cortar de golpe.

**NPCs: CERRADO** — 10 personajes pixel-art por código (4 plaza + 1 por interior, 6 interiores),
posiciones calibradas con el editor visual y textos finales (rotan línea al hablar, alineados con la
mecánica de cada juego). Interacción acercarse → "E Hablar" → `NpcDialog`, el NPC frena al
jugador. Editor: ⇧N en plaza, elemento 7 en interiores. Ver sección "NPCs" arriba. Nada pendiente.

**MVP COMPLETO (09/06/2026).** Editores visuales SACADOS (ver "Dead code"). Sin pendientes
abiertos: los 2 que quedaban (Leaderboard, Cheaterboard) se descartaron por diseño y en su
lugar se hizo la pantalla de stats finales (ver abajo).

### Pendientes — CERRADOS por diseño (09/06/2026)
- **Leaderboard + Cheaterboard: DESCARTADOS.** Un leaderboard global pedía Supabase, identidad
  de jugador y sync; el Cheaterboard solo tenía sentido para defender ese ranking público. Sin
  ranking compartido no hay nada que proteger (editar tu propio localStorage solo afecta tu
  partida local). El juego sigue 100% cliente. En su lugar entró la pantalla de stats finales.
- Spec + plan: `docs/superpowers/specs/2026-06-09-stats-finales-design.md`,
  `plans/2026-06-09-stats-finales.md`.

Todo está CERRADO: estructura, 5 minijuegos, NPCs, audio, logros, cinemáticas victoria/derrota,
bienvenida, ayuda, avisos, regla de derrota diferida, stats finales. Decisiones: sprites quedan
pixel-art por código (no se cambian); narrativa, easter eggs y pulido visual fino
descartados/suficientes para el MVP. Lo que sigue es solo arreglar bugs nuevos.

## Stats finales — CERRADO (09/06/2026)

Al terminar la partida (victoria Y derrota), la `ResultScene` muestra un panel de stats
personales en 2 bloques: **esta partida** (manos jugadas/ganadas, pico de plata, nivel
sapo·cubiletes) y **de por vida** (partidas ganadas, manos totales/ganadas, logros X/total).
100% cliente, sin backend. Reemplaza a Leaderboard/Cheaterboard.

- **`app/composables/useStatsPartida.js`** (NUEVO): singleton reactivo, mismo patrón que
  `useLogros`. Se suscribe al bus (`onEvento`): `jugo`→`manosJugadas++`, `gano`→`manosGanadas++`.
  Pico de plata vía watch sobre `state.plata`. `onReiniciarPartida`→reset. NO persiste (es la
  corrida en curso). Se monta temprano en `GameRoot` (`useStatsPartida()` en el setup) para que
  cuente desde el arranque. Niveles NO se trackean acá: la `ResultScene` los lee de `state.nivel`.
- **`logros-reglas.mjs`**: 2 contadores de por vida nuevos en `storeInicial().contadores`:
  `partidasGanadas` (++ en evento `saldo`) y `partidasJugadas` (++ en `reiniciarPartida`, cuenta
  la corrida que se cierra). Persisten con el resto de `contadores`.
- **`useLogros.js`**: expone `contadores: store.contadores` en el return (para la ResultScene).
- **`ResultScene.vue`**: panel entre el copy narrativo y el botón "Jugar de nuevo"; acento dorado
  en victoria, rojo en derrota. No rompe la animación GSAP de entrada del `panelRef`.
- **Reiniciar stats de un dispositivo**: borrar de localStorage `plaza1810_state_v2` (partida) y
  `plaza1810_logros_v1` (logros + contadores de por vida) + `location.reload()`. `useStatsPartida`
  no persiste, arranca en 0 solo.

## Logros tipo Steam — CERRADO (09/06/2026, ampliado 12/06/2026)

31 logros desbloqueables (20 originales + 11 de la tanda 2), completables al 100%, validados por el
usuario. Personales por dispositivo (localStorage), sin backend. Spec + plan en `docs/superpowers/`
(`specs/2026-06-09-logros-design.md`, `plans/2026-06-09-logros.md`).
La UI y el completista cuentan dinámicamente sobre `CATALOGO.length`: agregar logros no pide tocar
componentes (`ResultScene`/`GaleriaLogros` ya muestran X/total).

### Arquitectura (bus de eventos + composable + UI)
- **Bus de eventos** en `useGameState`: `registrarEvento(tipo, datos)` (solo emite) + `onEvento(fn)`
  (suscribe, devuelve unsub) + `onReiniciarPartida(fn)` (corta la racha en partida nueva, lo llama
  `reiniciar()`). `useGameState` NO conoce a sus consumidores (desacoplado).
- **`app/composables/logros-catalogo.mjs`**: los 31 logros como data pura (`.mjs` para testear desde
  node). Cada uno `{ id, nombre, desc, icono }`. Campo `secreto` reservado (no usado).
- **`app/composables/logros-reglas.mjs`**: lógica PURA (sin Vue/localStorage/tiempo). `storeInicial()`,
  `procesarEvento(store, evento)` y `procesarState(store, snapshot)` → `{ store, nuevos: [ids] }`;
  `reiniciarPartida(store)` corta racha+tocoFondo+picoPlataPartida+ultimoAllIn. `sincronizarCompletista(store)`
  re-evalúa el completista al cargar (lo des-marca si el catálogo creció y faltan logros — ÚNICA cosa que
  borra: `delete desbloqueados.completista`, nunca toca el resto). `desbloquear` idempotente. Constantes:
  `TOTAL_NPCS=10`, `APUESTA_MAX=500`, `PLATA_BOLSA_GORDA=5000`, `PLATA_FONDO=100`, `PLATA_FORRADO=50000`
  ($500), `PLATA_PICO_FUNDIDO=5000` ($50), `ALL_IN_TECHO=300` ($3) (centavos). Testeada por node.
- **`app/composables/useLogros.js`**: singleton reactivo. Envuelve las reglas con reactividad +
  persistencia (`plaza1810_logros_v1`: solo `desbloqueados`/`contadores`/`sets`; racha+tocoFondo NO
  se persisten) + suscripción al bus + watcher de `state.plata/resultado` + cola de toasts. Expone
  `catalogo`, `desbloqueados`, `progreso {hechos,total}`, `toastActual`, `descartarToast`.
- **UI**: `ToastLogro.vue` (toast estilo `AvisoSaldar`, acento dorado, con COLA — `mostrar()` dispara
  `sfx('logro')`) + `GaleriaLogros.vue` (modal estilo `ControlesAyuda`, grid 2-col, contador X/total
  dinámico, bloqueados en gris). Botón 🏆 en `TopBar` (emite `logros`) → `GameRoot` togglea la galería
  (igual que ayuda/`ControlesAyuda`). Ambos montados en `GameRoot`.

### Eventos emitidos (cableado quirúrgico, 1-3 líneas por archivo)
- **5 minijuegos**: `jugo {juego}` al apostar; `gano {juego,apuesta,ganancia}` / `perdio {juego}` al
  resolver; + específicos: `dadosExacto7` (DiceGame, `prediccion==='exacto'`), `sapoX3` (SapoGame,
  `res.pago>=pagoMax`), `bingoDoble` (BingoGame, `ganasteLinea&&ganasteBingo`), `cubiletesNivel {nivel}`
  (CupsGame, nivel ANTES de subir). Naipes empate NO emite gano/perdio.
  - **Campos extra del `gano` (tanda 2)**: `x3` (sapo, true si embocó la boca) y `perfecto` (naipes,
    true si ganó 3-0 sin perder ronda). La regla los lee para `sapo_serial`/`naipes_perfecto`.
- **All-in heroico**: `apostoAllIn` emitido desde `apostar()` en useGameState cuando apostás TODA tu
  plata teniendo ≤$3. Marca un flag transitorio (`ultimoAllIn`); el próximo `gano` lo consume →
  `all_in_heroico`. Un `perdio` o partida nueva limpian el flag.
- **NPCs**: `hablo {npcId}` desde un helper `abrirDialogo(d)` único en `PlazaScene.vue` e
  `InteriorScene.vue` (los renderers `hablar()` ahora devuelven `id`).
- **Garito**: `saldo {nivelSapo,nivelCubiletes}` SOLO en el saldado real (no en DEV GANAR/PERDER).

### Catálogo (31, agrupados por tipo en la galería, fácil→difícil)
**Originales (20):** Progresión: primera_mano · primer_tropiezo · timbero (5 juegos) · conocido (10 NPCs)
· libre_deuda. Grind: manos_calientes (25 gana) · curtido (25 pierde) · bolsa_gorda ($50) · patron (100
jugadas) · sin_mango (game over). Skill: boca_sapo · linea_bingo · siete_clavado · segui_bolita (cubiletes
nivel≥3) · las_sabe_todas (ganar en los 5). Meta: en_racha (5 seguidas) · de_rodillas (tocar $1 + saldar) ·
audaz (ganar apostando $5) · maestro_garito (saldar con sapo+cubiletes nivel≥5) · completista (los otros,
automático).
**Tanda 2 (11, ampliación 12/06/2026):** sapo_serial (x3 sapo 5 SEGUIDAS — racha, corta al perder o ganar
sin x3) · dados_serial (Exacto 7 ×10 acumulado) · tahur_bronce/plata/oro (150/300/500 jugadas) · racha_larga
(10 ganadas seguidas) · forrado ($500 en bolsa) · gran_maestro (saldar con sapo+cubiletes nivel≥8) ·
naipes_perfecto (naipes 3-0) · all_in_heroico (ganar all-in con ≤$3) · fundido_grande (game over con pico
≥$50 esa partida). Contadores nuevos en el store: `dadosExacto7`, `sapoX3Racha` (por vida) + transitorios
`picoPlataPartida`, `ultimoAllIn`.

### Completista re-bloqueable (12/06/2026)
El completista cuenta sobre `CATALOGO.length - 1` (todos los otros) y es **re-bloqueable**: si el catálogo
crece y un save viejo lo tenía pero le faltan los nuevos, `sincronizarCompletista` (corre al cargar, en
`useLogros.iniciar`) hace `delete desbloqueados.completista`. **Solo toca esa clave** — el resto de
desbloqueados/contadores/sets queda intacto (verificado por node con el caso real: 20→19 logros, contadores
y sets sin cambios). El re-bloqueo se ve recién al recargar (el store reactivo se carga una vez al arrancar).

### Notas
- **Persisten entre partidas** (reiniciar() NO los borra). Contadores acumulados de por-vida; racha
  transitoria (se corta al perder y en partida nueva). Decisión: localStorage ahora, sync a Supabase
  después (cuando se arme identidad+backend para el Leaderboard).
- **`segui_bolita`** requiere ~4 victorias seguidas en cubiletes (el nivel sube al ganar, se resetea
  al perder; el evento lleva el nivel CON EL QUE se ganó). Es duro pero intencional.
- **Editar el localStorage a mano NO se refleja sin recargar** (el store reactivo se cargó una vez).
  Para forzar/testear logros: editar el LS y `location.reload()`, o tocar el `state` reactivo en vivo
  (durante el testing se expuso `window.__state` temporal, ya sacado). Conecta con el pendiente
  Cheaterboard.

## Dead code — YA BORRADO (07/06/2026)
Se eliminaron los huérfanos: `game/plaza/pathfinding.js`, `game/render/isoMath.js` (iso viejo),
`game/minigames/ring.js` + `components/minigames/RingGame.vue` + el bloque `config.SORTIJA`
(sortija vieja, reemplazada por el Sapo), y `components/scenes/BingoScene.vue` (placeholder;
GameRoot monta el `BingoGame` real). OJO: `ESCENAS.SORTIJA` SÍ existe y es la escena del Sapo
(el FSM nunca se renombró) — no confundir con la sortija borrada. `drawNpc.js` y `NpcDialog.vue`
NO son dead code: los usa el sistema de NPCs.

## Git — Reglas de escritura
No ejecutar comandos de escritura sin confirmación: `git push/commit/add/reset/rebase/
checkout/branch/merge/pull/fetch/clone/tag/stash/clean/remote/config`, ni `gh` visible.
Permitidos sin preguntar: `status`, `log`, `diff`, `show`, `blame`, `gh pr view`, `gh run list`.

## Comportamiento general
- Pensar antes de codear: declarar asunciones, preguntar ante ambigüedad, no elegir en silencio.
- Simplicidad primero: mínimo código que resuelve el problema, nada especulativo.
- Cambios quirúrgicos: tocar solo lo necesario, matchear el estilo existente.

## Patrón clave del proyecto: editores visuales
Para calibrar cualquier cosa espacial (posiciones, zonas, caminos), se usa SIEMPRE un
editor visual en canvas: el usuario arrastra puntos/polígonos sobre la imagen y un
botón "Copiar JSON" exporta los valores, que se pegan fijos en el archivo de datos.
El usuario calibra mucho mejor arrastrando que dictando coordenadas. Reusar este patrón.

## Supabase MCP
- Server: `supabase-benteveo` · Proyecto: `Benteveo` (Sika)
- Leer: directo. Escribir (migrations, edge functions, alter): confirmar antes.

## Orden de clases Tailwind CSS

Orden obligatorio (no reordenar según Prettier):
1. **Sizing** — `w/min-w/max-w/h/min-h/max-h/size/aspect`
2. **Layout** — display → flex dir/wrap → flex/grid sizing → justify → items/self/place/content → gap → order
3. **Position** — `static/relative/absolute/fixed/sticky`, `top/right/bottom/left/inset/z`
4. **Backgrounds** — posición/size/repeat → color → gradientes
5. **Borders** — width → style → color → divide → radius (al final)
6. **Typography** — align → family → size → color → weight → leading/tracking → transform → decoration → whitespace
7. **Effects/Filters/Transforms/Transitions** — shadow/opacity → filters → transforms → transitions
8. **Interactivity** — `cursor/pointer-events/select/resize/scroll/snap/appearance/outline/ring/caret/accent`
9. **Overflow & Visibility** — `overflow/overscroll/visible/invisible/collapse`
10. **SVG** · 11. **Accessibility** (`sr-only`)
12. **Spacing** — primero padding (`p-*`), después margin (`m-*`, `space-*`)

### Breakpoints y estados
- Dentro de cada propiedad: base → `sm:` → `md:` → `lg:` → `xl:` → `xxl:` (1440px)
- Estados pegados a su propiedad base: ✅ `bg-primary hover:bg-secondary`

### Paleta (en `tailwind.config.js`)
- Fondos: `noche` `noche-2` `tierra` · Texto claro: `light`
- Fuego/farol: `farol` `dorado` `brasa` `ascua` · Materiales: `madera` `madera-claro` `adobe` `adobe-osc` `tejado`
- Estados: `ganancia` (verde) `perdida` (rojo)
- Tipografía: `font-display` (Cinzel) títulos, `font-cuerpo` (Crimson Pro) texto
- Sombras: `shadow-farol`, `shadow-farol-lg`
