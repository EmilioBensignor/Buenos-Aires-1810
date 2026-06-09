# Stats personales al finalizar — diseño

**Fecha:** 2026-06-09
**Estado:** aprobado, listo para plan
**Cierra:** los 2 pendientes del proyecto (Leaderboard, Cheaterboard)

## Resumen

En vez de un leaderboard global con backend, se muestra al jugador un **resumen de
stats personales** al terminar la partida (victoria y derrota), en la `ResultScene`.
Dos bloques: **esta partida** y **de por vida**. Todo 100% cliente, sin Supabase.

## Decisión de alcance: Leaderboard + Cheaterboard descartados por diseño

Un leaderboard global requeriría Supabase, identidad de jugador (auth o nombre tipeado)
y sync. El Cheaterboard (anti-trampa) solo tenía sentido para **defender un ranking
público compartido**: firmar/validar el save o mover la verdad al server.

Sin leaderboard global, **no hay nada que proteger**: que un jugador edite su propio
localStorage solo afecta su partida local. Por lo tanto **ambos pendientes se cierran
como descartados por diseño**, no como implementados. El juego sigue siendo 100%
cliente, coherente con el resto del proyecto.

Lo que entra en su lugar es más simple y más alineado con el juego: aprovechar la data
que el bus de eventos de logros ya produce para darle al jugador un cierre con stats.

## Qué data existe hoy vs. qué falta

**Ya existe** (`store.contadores` en `useLogros`, acumulado **de por vida**):
- `ganadas`, `perdidas`, `jugadas` (manos), `picoPlata` (de por vida).
- `sets`: `jugados[]`, `ganados[]`, `npcs[]`.
- `desbloqueados` → `progreso { hechos, total }`.

**Falta**:
- Stats **de la corrida actual** (manos/pico de ESTA partida). El state de partida se
  resetea sin guardar nada; los contadores de logros nunca distinguen partida actual.
- Contadores de **partidas** ganadas/jugadas de por vida (hoy solo hay contadores de
  *manos*, no de *partidas*).

**Gratis al render** (no requiere tracking nuevo):
- Niveles finales: `state.nivel.sapo` / `state.nivel.cubiletes` ya viven en el state.

## Componentes

### 1. `app/composables/useStatsPartida.js` (NUEVO)

Singleton reactivo, mismo patrón que `useLogros`. Desacopla la lógica de stats de
partida de `useGameState` (no lo ensucia con presentación).

- Mantiene `statsPartida` reactivo: `{ manosJugadas, manosGanadas, picoPlata }`.
- Se suscribe al bus con `onEvento`:
  - evento `jugo` → `manosJugadas++`
  - evento `gano` → `manosGanadas++`
  - (naipes-empate NO emite `gano`/`perdio`/`jugo`, así que no cuenta — correcto.)
- `picoPlata`: watch sobre `state.plata`, guarda el máximo de la corrida.
- `onReiniciarPartida(() => reset)` → vuelve todo a cero al empezar partida nueva.
- **NO persiste** en localStorage (es la partida en curso; muere al recargar, está bien).
- Niveles finales NO se trackean acá: la `ResultScene` los lee de `state.nivel`.
- Expone `statsPartida` (reactivo).

`iniciar()` lazy igual que `useLogros` (se suscribe al bus la primera vez que se usa).
Para que el tracking arranque desde el inicio de la partida, montarlo temprano —
ver "Punto de montaje" abajo.

### 2. Contadores de partida en logros (`logros-reglas.mjs` + `useLogros.js`)

Agregar al `storeInicial().contadores`: `partidasGanadas: 0`, `partidasJugadas: 0`.

- `partidasGanadas++` en el evento `saldo` (saldado real de la deuda = victoria).
- `partidasJugadas++`: se incrementa una vez por partida. Criterio: en
  `reiniciarPartida(store)` — cuando empieza una corrida nueva se cuenta la anterior
  como jugada. **Decisión:** contar al **reiniciar** (cierre de la partida previa) evita
  contar de más si el jugador nunca juega. Caso borde de la primera partida: no se
  cuenta hasta que reinicia; aceptable (el dato "de por vida" arranca en 0 partidas
  jugadas hasta el primer reinicio). Si se prefiere contar al primer evento `jugo` de la
  partida, queda anotado como alternativa, pero el reinicio es más simple y suficiente.
- Persisten con el resto de `contadores` (ya se persiste ese objeto entero en `useLogros`).
- `useLogros` expone los contadores nuevos vía el objeto que ya retorna (hoy retorna
  `catalogo`, `desbloqueados`, `progreso`, `toastActual`, `descartarToast`); se agrega
  `contadores` (o los campos puntuales) al return para que `ResultScene` los lea.

### 3. `app/components/scenes/ResultScene.vue` (MODIFICADO)

Insertar, **entre el copy narrativo y el botón "Jugar de nuevo"**, un panel de stats.
Aparece en **victoria y derrota** (cambia acento de color y encabezado).

**Bloque "Esta partida"** (de `useStatsPartida` + `state.nivel`):
- Manos jugadas, manos ganadas.
- Pico de plata (con `formatMoneda`).
- Nivel sapo · cubiletes.

**Bloque "De por vida"** (de `useLogros`):
- Partidas ganadas (`contadores.partidasGanadas`).
- Manos totales (`contadores.jugadas`), manos ganadas (`contadores.ganadas`).
- Logros (`progreso.hechos` / `progreso.total`).

Estilo: seguir la paleta y tipografía existentes (`font-display`/`font-cuerpo`,
`text-dorado`/`text-perdida`, `text-ganancia`). Respetar el orden de clases Tailwind
del proyecto. El panel no debe romper la animación GSAP de entrada del `panelRef`
(que envuelve todo el contenido).

## Punto de montaje (para que el tracking arranque a tiempo)

`useStatsPartida` debe estar suscripto al bus **antes** de que el jugador empiece a
jugar, si no se pierden las primeras manos. `useLogros` ya se monta en `GameRoot`
(para los toasts). Montar `useStatsPartida()` en el mismo lugar (`GameRoot`, en el
setup) garantiza que el singleton se inicialice al arrancar el juego. La `ResultScene`
también lo usa, pero para entonces ya estaría inicializado.

## Flujo de datos

```
bus de eventos (useGameState, ya existe)
  ├─→ useLogros (ya existe)          → contadores de por vida + logros + (NUEVO) partidas
  └─→ useStatsPartida (NUEVO)        → stats de la corrida actual
              ↓
        ResultScene lee ambos + state.nivel → render del panel (victoria y derrota)
```

## Qué NO se hace (YAGNI)

- Sin Supabase, sin auth, sin nombre de jugador, sin sync a server.
- Sin firma/validación/anti-trampa del save (sin leaderboard global no hay qué proteger).
- Sin pantalla de stats fuera del resultado (la galería de logros 🏆 ya cubre "ver
  progreso" en cualquier momento desde la TopBar).
- Sin métricas de tiempo (cronómetro frágil: pestaña en background, AFK).

## Testing / verificación

- La lógica de conteo de `useStatsPartida` es chica y se apoya en el bus existente;
  alcanza con verificación visual + el check estándar del proyecto.
- Si se quiere, la parte pura de los contadores de partida en `logros-reglas.mjs` se
  testea con node (ya hay precedente de testear ese archivo con node).
- **Check estándar:** `npx nuxt build` debe pasar tras los cambios.
- Validación visual: el usuario revisa en su dev server (victoria y derrota; usar los
  botones DEV GANAR/PERDER del Garito para llegar rápido a cada final).

## Impacto en CLAUDE.md / memoria

- Marcar Leaderboard y Cheaterboard como **descartados por diseño** (ya no son pendientes).
- Documentar `useStatsPartida` y el panel de stats de la `ResultScene`.
- Con esto el MVP queda sin pendientes abiertos.
