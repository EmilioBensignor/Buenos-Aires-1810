# Logros tipo Steam — Plaza 1810

Fecha: 2026-06-09
Estado: diseño aprobado, pendiente de implementación

## Objetivo

Agregar un sistema de logros (achievements) tipo Steam: 20 logros desbloqueables,
completables al 100%, con toast al desbloquear y una galería para trackear el progreso.
Personales por dispositivo (localStorage), sin backend en esta etapa.

## Decisiones de alcance

- **Persistencia: solo localStorage** (`plaza1810_logros_v1`), separado del save de
  partida (`plaza1810_state_v2`). Patrón actual del juego. Supabase queda para el
  Leaderboard (pendiente 3 del proyecto), que sí necesita identidad + server. El store
  local se diseña para que más adelante se le pueda colgar un sync opcional sin re-trabajo.
- **Los logros persisten entre partidas**: `reiniciar()` (partida nueva) NO los borra.
  Una vez desbloqueado, queda (como Steam). Solo se pierden si el usuario limpia el
  localStorage del navegador.
- **Contadores acumulados persisten** entre partidas (manos ganadas/perdidas/jugadas de
  por-vida, pico de plata). La **racha actual es transitoria**: se corta al perder y al
  empezar partida nueva.

## Arquitectura

Dos piezas nuevas + cableado mínimo en piezas existentes.

### 1. Bus de eventos en `useGameState` (cableado quirúrgico)

`useGameState` gana un emisor de eventos con contexto. Los minijuegos y el flujo de NPCs
emiten eventos; `useLogros` los escucha. `useGameState` solo emite, no conoce las reglas
de logros (separación limpia, evita engordar un composable que ya maneja plata/deuda/niveles).

```js
// nuevo en useGameState
function registrarEvento(tipo, datos = {}) { /* notifica a los listeners */ }
function onEvento(fn) { /* suscribe, devuelve unsub */ }
```

Tipos de evento y dónde se emiten:

| Evento | Datos | Dónde se emite |
|---|---|---|
| `jugo`  | `{ juego }` | cada minijuego, al confirmar la apuesta (`apostar` ok) |
| `gano`  | `{ juego, apuesta, ganancia }` | cada minijuego, en su rama de victoria (antes/junto a `cobrar(g)`) |
| `perdio`| `{ juego }` | cada minijuego, en su rama de derrota (junto a `cobrar(0)`) |
| `sapoX3`| `{}` | SapoGame, cuando `res.pago === pagoMax` (la boca, x3) |
| `dadosExacto7` | `{}` | DiceGame, cuando `prediccion==='exacto'` y `res.gano` |
| `bingoDoble` | `{}` | BingoGame, cuando `resultado.ganasteLinea && resultado.ganasteBingo` |
| `cubiletesNivel` | `{ nivel }` | CupsGame, en victoria, con `state.nivel.cubiletes` (antes de subirNivel) |
| `hablo` | `{ npcId }` | flujo de diálogo de NPC, al abrir el diálogo |
| `saldo` | `{}` | GaritoScene, al saldar la deuda (`saldarDeuda` ok) |

`juego` ∈ `'naipes' | 'dados' | 'cubiletes' | 'sapo' | 'bingo'`.

Estado observado directamente por `useLogros` (sin evento, vía watcher sobre `state`):
- `state.plata` → pico de plata (logro Bolsa gorda).
- `state.resultado === 'derrota'` → game over (logro Sin un mango).

> Nota racha: la racha se deriva en `useLogros` a partir de la secuencia `gano`/`perdio`
> (no necesita evento propio).

### 2. Composable `useLogros.js`

Singleton reactivo (igual que `useGameState`). Contiene:

- **Catálogo** (los 20 logros, ver abajo): `id`, `nombre`, `desc`, `icono` (emoji/glyph),
  `secreto` (bool — si se muestra oculto hasta desbloquear; reservado, por defecto false).
- **Store persistido** en `plaza1810_logros_v1`:
  ```js
  {
    desbloqueados: { [id]: true },        // logros ya obtenidos
    contadores: {
      ganadas: 0, perdidas: 0, jugadas: 0, // acumulados de por-vida
      picoPlata: 0
    },
    sets: {
      jugados: [],   // juegos probados (para Timbero)
      ganados: [],   // juegos ganados al menos una vez (capstone)
      npcs: []       // npcIds con los que se habló (para Conocido en la plaza)
    }
  }
  ```
- **Racha actual** (transitoria, NO persistida): `rachaActual` en memoria.
- **Reglas**: una función por evento que actualiza contadores/sets, evalúa condiciones y
  llama `desbloquear(id)`. `desbloquear` es idempotente (si ya está, no hace nada ni
  re-emite toast).
- **Cola de toasts**: array de ids pendientes de mostrar. Si se desbloquean varios en el
  mismo instante (casos de borde: saldar tocando fondo con nivel alto), se muestran en
  secuencia.
- **Init**: en el primer uso, `onEvento(manejar)` se suscribe al bus y se montan los
  watchers de `state`.

API expuesta:
```js
useLogros() => {
  catalogo,            // array de definiciones (para la galería)
  desbloqueados,       // reactive map id→true
  progreso,            // computed { hechos, total }  ej {hechos:7, total:20}
  toastActual,         // computed: el logro que el toast debe mostrar ahora (o null)
  descartarToast,      // () => avanza la cola
  reiniciarRacha       // () => corta la racha (lo llama reiniciar() de partida)
}
```

> `reiniciar()` en `useGameState` debe llamar `reiniciarRacha()` (la racha se corta en
> partida nueva). Los logros y contadores NO se tocan.

### 3. UI

**Toast** (`ToastLogro.vue`, montado en `GameRoot` junto a `AvisoSaldar`):
- Mismo patrón visual que `AvisoSaldar.vue` (toast arriba-centro, `bg-noche/95`, borde
  dorado, `<Transition>`), pero con **cola**: lee `toastActual`; al cerrarse (timeout
  ~4.5s) llama `descartarToast` para mostrar el siguiente.
- Contenido: ícono + "¡Logro desbloqueado!" + nombre del logro.
- Borde/acento `farol`/`dorado` (no `ganancia`, para diferenciarlo del aviso de saldar).

**Galería** (`GaleriaLogros.vue`, modal estilo `ControlesAyuda`):
- Modal `bg-noche-2` + borde dorado + `shadow-farol-lg`, abierto por botón en TopBar.
- Header: título "Logros" + contador `X/20`.
- Grid de 20 cards: ícono + nombre + descripción.
  - Desbloqueado: ícono a color, texto claro.
  - Bloqueado: ícono/​card atenuada (gris/opacidad), descripción visible (no son secretos
    en el MVP, dan pista de cómo sacarlos).
- Cierra con ✕, ESC o clic afuera (mismo patrón que ControlesAyuda).

**Botón en TopBar**: 🏆 junto al "?" existente. Emite `logros`; `GameRoot` togglea
`GaleriaLogros` igual que hace con `ControlesAyuda`.

## Catálogo de 20 logros

Cada logro cuelga de un **eje detector único**; los disparadores casi nunca coinciden en
el mismo instante. Donde coinciden (raro), la cola del toast los muestra en secuencia.

### Progresión / primera vez (fáciles — 5)
| # | id | Nombre | Condición | Disparador |
|---|---|---|---|---|
| 1 | `primera_mano` | Primera mano | Ganás tu primera mano (cualquier juego) | primer `gano` |
| 2 | `primer_tropiezo` | Primer tropiezo | Perdés tu primera mano | primer `perdio` |
| 3 | `timbero` | Timbero de ley | Probaste los 5 minijuegos (ganando o no) | `sets.jugados` llega a 5 |
| 4 | `conocido` | Conocido en la plaza | Hablaste con los 11 NPCs | `sets.npcs` llega a 11 |
| 5 | `libre_deuda` | Libre de deuda | Saldaste la deuda | `saldo` |

### Acumulado / grind (medios — 5)
| # | id | Nombre | Condición | Disparador |
|---|---|---|---|---|
| 6 | `manos_calientes` | Manos calientes | 25 manos ganadas (acumulado) | `contadores.ganadas >= 25` |
| 7 | `curtido` | Curtido en las malas | 25 manos perdidas (acumulado) | `contadores.perdidas >= 25` |
| 8 | `bolsa_gorda` | Bolsa gorda | Tocás $50+ en la bolsa (5000¢) | watch `state.plata >= 5000` |
| 9 | `patron` | Patrón de la plaza | 100 manos jugadas (acumulado) | `contadores.jugadas >= 100` |
| 10 | `sin_mango` | Sin un mango | Quedaste en $0 (game over) | watch `state.resultado === 'derrota'` |

### Skill / por juego (medios-difíciles — 5)
| # | id | Nombre | Condición | Disparador |
|---|---|---|---|---|
| 11 | `boca_sapo` | Boca del sapo | Clavás el x3 del sapo | `sapoX3` |
| 12 | `linea_bingo` | Línea y bingo, doña | Línea + Bingo en la misma mano | `bingoDoble` |
| 13 | `siete_clavado` | Siete clavado | Dados: acertás el Exacto-7 (x4) | `dadosExacto7` |
| 14 | `segui_bolita` | Seguí la bolita | Cubiletes: ganás en nivel ≥3 | `cubiletesNivel` con `nivel >= 3` |
| 15 | `las_sabe_todas` | El que las sabe todas | Ganaste ≥1 vez en los 5 juegos | `sets.ganados` llega a 5 (capstone) |

### Racha / secreto / meta (difíciles — 5)
| # | id | Nombre | Condición | Disparador |
|---|---|---|---|---|
| 16 | `en_racha` | En racha | 5 manos ganadas seguidas | `rachaActual >= 5` |
| 17 | `de_rodillas` | De rodillas y de pie | Tocaste ≤$1 y saldaste la deuda esa partida | flag fondo (watch plata ≤100¢) + `saldo` |
| 18 | `audaz` | Apostador audaz | Ganás apostando el máximo ($5 = 500¢) | `gano` con `apuesta === 500` |
| 19 | `maestro_garito` | Maestro del garito | Saldaste con sapo Y cubiletes en nivel ≥5 | `saldo` con `state.nivel.sapo>=5 && state.nivel.cubiletes>=5` |
| 20 | `completista` | Completista | Desbloqueaste los otros 19 | al desbloquear cualquiera: si los 19 están → este |

Notas de detección:
- **#17 De rodillas**: `useLogros` mantiene un flag de partida `tocoFondo` (se prende
  cuando `state.plata <= 100`). Se evalúa al recibir `saldo`. El flag se resetea en
  `reiniciarRacha`/partida nueva.
- **#18 Audaz**: la apuesta viaja en el evento `gano` (`{ apuesta }`). 500 = tope de
  `config.APUESTAS`.
- **#20 Completista**: tras cada `desbloquear`, si `Object.keys(desbloqueados).length === 19`
  y `completista` no está → desbloquear. Se cuenta sobre los OTROS 19 (no se cuenta a sí
  mismo). Dispara su propio toast después del que lo completó (vía cola).

## Flujo de datos

```
minijuego / garito / NPC
   │ registrarEvento(tipo, datos)
   ▼
useGameState (bus)  ──onEvento──▶  useLogros.manejar(evento)
                                      │ actualiza contadores/sets/racha
state.plata/resultado ──watch──▶      │ evalúa condiciones
                                      ▼ desbloquear(id) [idempotente]
                                   encola toast + persiste store
                                      │
                    ┌─────────────────┴─────────────────┐
                    ▼                                     ▼
              ToastLogro.vue (cola)              GaleriaLogros.vue (modal)
```

## Manejo de errores / bordes

- **Idempotencia**: `desbloquear` no re-dispara si el logro ya está. Reentradas seguras.
- **localStorage ausente/corrupto**: `try/catch` igual que `useGameState.loadState`;
  si falla, store por defecto (todo en 0, nada desbloqueado).
- **Pops simultáneos**: la cola serializa. Nunca se encima ni se pierde un toast.
- **SSR**: `ssr: false` en el proyecto; igual los accesos a `window`/`localStorage` van
  guardados por `typeof window === 'undefined'` (patrón existente).
- **Migración de save viejo**: store nuevo e independiente; si no existe, se crea. No
  toca `plaza1810_state_v2`.

## Archivos afectados

Nuevos:
- `app/composables/useLogros.js` — catálogo + store + reglas + cola.
- `app/components/ui/ToastLogro.vue` — toast con cola.
- `app/components/ui/GaleriaLogros.vue` — modal galería.

Modificados (cableado mínimo):
- `app/composables/useGameState.js` — `registrarEvento`/`onEvento`; `reiniciar()` llama
  `reiniciarRacha()`.
- `app/components/minigames/{DiceGame,CardsGame,CupsGame,SapoGame,BingoGame}.vue` —
  emitir `jugo`/`gano`/`perdio` + el específico de cada uno (`sapoX3`, `dadosExacto7`,
  `bingoDoble`, `cubiletesNivel`). 1-3 líneas por archivo.
- Flujo de diálogo de NPC: `PlazaScene.vue` e `InteriorScene.vue` abren `NpcDialog` vía
  `renderer.onHablar` / `hablarConCerca` / `interactuar`. Emitir `hablo {npcId}` ahí. Verificar
  en el plan que el dato del renderer incluya el `id` del NPC (hoy llega `{nombre,texto}`); si
  no, agregarlo en el renderer.
- `app/components/scenes/GaritoScene.vue` — emitir `saldo` al saldar.
- `app/components/ui/TopBar.vue` — botón 🏆 que emite `logros`.
- `app/components/GameRoot.vue` — montar `ToastLogro`; togglear `GaleriaLogros` con el
  evento `logros` de TopBar (igual que `ayuda`/`ControlesAyuda`).

## Verificación

- `npx nuxt build` pasa (check estándar del proyecto). Para JS suelto, `node --check`.
- Validación visual del usuario en su dev server: desbloquear logros jugando, ver el toast
  (incluida la cola con 2 juntos), abrir la galería desde TopBar y ver el contador X/20.
- Logros persisten tras empezar partida nueva; racha se corta al perder/reiniciar.

## Fuera de alcance (anotado para después)

- Sync a Supabase (cuando se arme identidad + backend para el Leaderboard, pendiente 3).
- Logros secretos/ocultos (el campo `secreto` queda reservado, default false).
- Sonido propio del toast de logro (se puede sumar al catálogo de `useAudio` luego).
