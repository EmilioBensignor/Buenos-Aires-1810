# Stats personales al finalizar — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mostrar al jugador un resumen de stats personales (esta partida + de por vida) al terminar, en victoria y derrota, cerrando los pendientes Leaderboard/Cheaterboard por diseño (sin backend).

**Architecture:** Un composable singleton nuevo `useStatsPartida` se suscribe al bus de eventos existente y trackea las stats de la corrida actual. Se agregan 2 contadores de partidas al store de logros. La `ResultScene` lee ambas fuentes + `state.nivel` y renderiza un panel de dos bloques.

**Tech Stack:** Nuxt 4 / Vue 3 (Composition API, `<script setup>`), Tailwind CSS 3, GSAP (ya presente). Sin tests automatizados en el proyecto: la verificación es `node --check` por archivo + `npx nuxt build` + validación visual.

**Spec:** `docs/superpowers/specs/2026-06-09-stats-finales-design.md`

---

## Estructura de archivos

- **Crear** `app/composables/useStatsPartida.js` — singleton reactivo, stats de la corrida actual.
- **Modificar** `app/composables/logros-reglas.mjs` — 2 contadores de partida (`partidasGanadas`, `partidasJugadas`).
- **Modificar** `app/composables/useLogros.js` — exponer `contadores` en el return.
- **Modificar** `app/components/GameRoot.vue` — montar `useStatsPartida()` temprano.
- **Modificar** `app/components/scenes/ResultScene.vue` — panel de stats (victoria y derrota).

Nota de verificación: el proyecto NO tiene runner de tests. `logros-reglas.mjs` es ESM
puro y se puede chequear con `node --check`. Para Vue/composables, `node --check` valida
sintaxis; la verificación funcional es visual + `npx nuxt build`.

---

### Task 1: Contadores de partida en la lógica pura de logros

**Files:**
- Modify: `app/composables/logros-reglas.mjs`

- [ ] **Step 1: Agregar los contadores al store inicial**

En `storeInicial()`, modificar la línea de `contadores` para incluir los 2 nuevos:

```js
  return {
    desbloqueados: {},
    contadores: { ganadas: 0, perdidas: 0, jugadas: 0, picoPlata: 0, partidasGanadas: 0, partidasJugadas: 0 },
    sets: { jugados: [], ganados: [], npcs: [] },
    // transitorios (no se persisten): se reinician en partida nueva
    rachaActual: 0,
    tocoFondo: false
  }
```

- [ ] **Step 2: Incrementar partidasGanadas en el saldado real**

En `procesarEvento`, dentro del `case 'saldo'`, agregar el incremento (al inicio del bloque):

```js
    case 'saldo': {
      store.contadores.partidasGanadas++
      desbloquear(store, 'libre_deuda', nuevos)
      if (store.tocoFondo) desbloquear(store, 'de_rodillas', nuevos)
      if (evento.nivelSapo >= 5 && evento.nivelCubiletes >= 5) desbloquear(store, 'maestro_garito', nuevos)
      break
    }
```

- [ ] **Step 3: Incrementar partidasJugadas al reiniciar la partida**

En `reiniciarPartida(store)`, contar la partida que se cierra. Modificar la función:

```js
// Corta la racha y el flag de fondo (partida nueva). Conserva desbloqueados/contadores/sets.
// Cuenta la partida que se cierra como jugada (la de por vida).
export function reiniciarPartida(store) {
  store.contadores.partidasJugadas++
  store.rachaActual = 0
  store.tocoFondo = false
}
```

- [ ] **Step 4: Verificar sintaxis**

Run: `cd "$(git rev-parse --show-toplevel)" && node --check app/composables/logros-reglas.mjs`
Expected: sin salida (exit 0 = sintaxis OK).

- [ ] **Step 5: Verificación funcional rápida con node (smoke test inline)**

Run:
```bash
cd "$(git rev-parse --show-toplevel)" && node --input-type=module -e "
import { storeInicial, procesarEvento, reiniciarPartida } from './app/composables/logros-reglas.mjs';
const s = storeInicial();
procesarEvento(s, { tipo: 'saldo', nivelSapo: 1, nivelCubiletes: 1 });
console.log('partidasGanadas =', s.contadores.partidasGanadas, '(esperado 1)');
reiniciarPartida(s);
console.log('partidasJugadas =', s.contadores.partidasJugadas, '(esperado 1)');
"
```
Expected:
```
partidasGanadas = 1 (esperado 1)
partidasJugadas = 1 (esperado 1)
```

- [ ] **Step 6: Commit**

```bash
git add app/composables/logros-reglas.mjs
git commit -m "feat: contadores de partidas ganadas/jugadas en logros"
```

---

### Task 2: Composable useStatsPartida (stats de la corrida actual)

**Files:**
- Create: `app/composables/useStatsPartida.js`

- [ ] **Step 1: Crear el composable**

Crear `app/composables/useStatsPartida.js` con el contenido completo:

```js
// Stats de la partida en curso. Singleton reactivo (como useLogros). Se suscribe al bus
// de eventos y al state para contar manos y el pico de plata de ESTA corrida. NO persiste:
// muere al recargar y se resetea al empezar partida nueva.
import { reactive, watch } from 'vue'
import { useGameState } from './useGameState'

const statsPartida = reactive({
  manosJugadas: 0,
  manosGanadas: 0,
  picoPlata: 0
})

function reset() {
  statsPartida.manosJugadas = 0
  statsPartida.manosGanadas = 0
  statsPartida.picoPlata = 0
}

let iniciado = false
function iniciar() {
  if (iniciado || typeof window === 'undefined') return
  iniciado = true
  const { onEvento, onReiniciarPartida, state } = useGameState()

  // Manos de esta partida. Naipes-empate no emite jugo/gano, así que no cuenta.
  onEvento((evento) => {
    if (evento.tipo === 'jugo') statsPartida.manosJugadas++
    else if (evento.tipo === 'gano') statsPartida.manosGanadas++
  })

  // Pico de plata de la corrida.
  watch(
    () => state.plata,
    (plata) => { if (plata > statsPartida.picoPlata) statsPartida.picoPlata = plata },
    { immediate: true }
  )

  // Partida nueva: reset.
  onReiniciarPartida(reset)
}

export const useStatsPartida = () => {
  iniciar()
  return { statsPartida }
}
```

- [ ] **Step 2: Verificar sintaxis**

Run: `cd "$(git rev-parse --show-toplevel)" && node --check app/composables/useStatsPartida.js`
Expected: sin salida (exit 0).

Nota: `node --check` valida sintaxis. El import de `vue` no se resuelve fuera de Nuxt,
pero `--check` no ejecuta imports, así que pasa. La verificación funcional es visual.

- [ ] **Step 3: Commit**

```bash
git add app/composables/useStatsPartida.js
git commit -m "feat: composable useStatsPartida (stats de la corrida)"
```

---

### Task 3: Exponer contadores desde useLogros

**Files:**
- Modify: `app/composables/useLogros.js:92-101`

- [ ] **Step 1: Agregar contadores al return**

En `useLogros.js`, modificar el objeto que retorna `useLogros()` para incluir `contadores`:

```js
export const useLogros = () => {
  iniciar()
  return {
    catalogo: CATALOGO,
    desbloqueados: store.desbloqueados,
    contadores: store.contadores,
    progreso,
    toastActual,
    descartarToast
  }
}
```

- [ ] **Step 2: Verificar sintaxis**

Run: `cd "$(git rev-parse --show-toplevel)" && node --check app/composables/useLogros.js`
Expected: sin salida (exit 0).

- [ ] **Step 3: Commit**

```bash
git add app/composables/useLogros.js
git commit -m "feat: exponer contadores de logros para la pantalla de stats"
```

---

### Task 4: Montar useStatsPartida temprano en GameRoot

**Files:**
- Modify: `app/components/GameRoot.vue:1-7`

- [ ] **Step 1: Importar e inicializar el composable**

En el `<script setup>` de `GameRoot.vue`, agregar el import y la llamada (basta llamarlo
una vez para que el singleton se suscriba al bus desde el arranque del juego). Modificar
el bloque de imports/setup inicial:

```js
<script setup>
// Orquestador: barra superior global + frame de juego pegado abajo.
import { computed, ref, watch } from 'vue'
import { useSceneManager, ESCENAS } from '~/composables/useSceneManager'
import { useStatsPartida } from '~/composables/useStatsPartida'

const { escenaActual, enTransicion, esInterior } = useSceneManager()

// Inicializa el tracking de stats de la partida desde el arranque (se suscribe al bus).
useStatsPartida()
```

(El resto del `<script setup>` queda igual.)

- [ ] **Step 2: Verificar sintaxis**

Run: `cd "$(git rev-parse --show-toplevel)" && node --check app/components/GameRoot.vue 2>&1 || echo "nota: node no parsea .vue; validar con nuxt build"`
Expected: node no parsea SFC `.vue` (es esperado). La validación real es `nuxt build` en la Task 5.

- [ ] **Step 3: Commit**

```bash
git add app/components/GameRoot.vue
git commit -m "feat: montar useStatsPartida al arranque del juego"
```

---

### Task 5: Panel de stats en ResultScene

**Files:**
- Modify: `app/components/scenes/ResultScene.vue`

- [ ] **Step 1: Importar las fuentes de datos en el script**

En el `<script setup>` de `ResultScene.vue`, agregar imports y desestructurar los datos.
Modificar el bloque superior del script (líneas 1-12):

```js
<script setup>
import { onMounted, ref, computed } from 'vue'
import { useGameState } from '~/composables/useGameState'
import { useSceneManager, ESCENAS } from '~/composables/useSceneManager'
import { useAudio } from '~/composables/useAudio'
import { useStatsPartida } from '~/composables/useStatsPartida'
import { useLogros } from '~/composables/useLogros'
import { formatMoneda } from '~/composables/useGameConfig'

const { state, reiniciar } = useGameState()
const { ir, scene } = useSceneManager()
const { sfx } = useAudio()
const { statsPartida } = useStatsPartida()
const { contadores, progreso } = useLogros()

const esVictoria = computed(() => state.resultado === 'victoria')
const panelRef = ref(null)
```

(El resto del script —`onMounted`, `jugarDeNuevo`— queda igual.)

- [ ] **Step 2: Insertar el panel de stats en el template**

En el template, insertar el panel **entre** el bloque `<template v-else>...</template>` del
copy narrativo (que cierra en la línea ~70) y el `<button>` de "Jugar de nuevo". El panel
va dentro del `<div ref="panelRef">`, después de los dos `<template>` de copy:

```html
      <!-- Panel de stats: esta partida + de por vida (victoria y derrota) -->
      <div
        class="w-[440px] flex flex-col gap-5 border-2 rounded-2xl bg-noche/40 px-8 py-6 mt-2"
        :class="esVictoria ? 'border-dorado/30' : 'border-perdida/30'"
      >
        <div class="flex flex-col gap-2">
          <span
            class="font-cuerpo text-[13px] tracking-[0.25em] uppercase"
            :class="esVictoria ? 'text-dorado/60' : 'text-perdida/60'"
          >Esta partida</span>
          <div class="flex justify-between font-cuerpo text-light/85 text-lg">
            <span>Manos jugadas</span><span class="tabular-nums">{{ statsPartida.manosJugadas }}</span>
          </div>
          <div class="flex justify-between font-cuerpo text-light/85 text-lg">
            <span>Manos ganadas</span><span class="tabular-nums">{{ statsPartida.manosGanadas }}</span>
          </div>
          <div class="flex justify-between font-cuerpo text-light/85 text-lg">
            <span>Pico de plata</span><span class="tabular-nums text-dorado">{{ formatMoneda(statsPartida.picoPlata) }}</span>
          </div>
          <div class="flex justify-between font-cuerpo text-light/85 text-lg">
            <span>Nivel sapo · cubiletes</span>
            <span class="tabular-nums">{{ state.nivel.sapo }} · {{ state.nivel.cubiletes }}</span>
          </div>
        </div>

        <div class="border-t border-light/10 flex flex-col gap-2 pt-4">
          <span class="font-cuerpo text-light/40 text-[13px] tracking-[0.25em] uppercase">De por vida</span>
          <div class="flex justify-between font-cuerpo text-light/85 text-lg">
            <span>Partidas ganadas</span><span class="tabular-nums">{{ contadores.partidasGanadas }}</span>
          </div>
          <div class="flex justify-between font-cuerpo text-light/85 text-lg">
            <span>Manos totales</span><span class="tabular-nums">{{ contadores.jugadas }}</span>
          </div>
          <div class="flex justify-between font-cuerpo text-light/85 text-lg">
            <span>Manos ganadas</span><span class="tabular-nums">{{ contadores.ganadas }}</span>
          </div>
          <div class="flex justify-between font-cuerpo text-light/85 text-lg">
            <span>Logros</span><span class="tabular-nums">{{ progreso.hechos }}/{{ progreso.total }}</span>
          </div>
        </div>
      </div>
```

- [ ] **Step 3: Verificar build**

Run: `cd "$(git rev-parse --show-toplevel)" && npx nuxt build`
Expected: build OK, sin errores (warnings de Nuxt habituales aceptables).

- [ ] **Step 4: Commit**

```bash
git add app/components/scenes/ResultScene.vue
git commit -m "feat: panel de stats personales en la pantalla de resultado"
```

---

### Task 6: Verificación visual y cierre de documentación

**Files:**
- Modify: `CLAUDE.md` (marcar pendientes cerrados, documentar la feature)

- [ ] **Step 1: Verificación visual (usuario)**

El usuario valida en su dev server:
- **Victoria**: entrar al Garito → botón DEV GANAR → cinemática → pantalla de resultado.
  Verificar el panel: stats de esta partida (manos, pico, niveles) + de por vida coherentes.
- **Derrota**: Garito → DEV PERDER → pisar la plaza → game over → pantalla de resultado.
  Verificar que el panel aparece también acá, con acento rojo.
- Jugar algunas manos antes de cada final para que las stats no sean todas 0.

- [ ] **Step 2: Actualizar CLAUDE.md**

Marcar en la sección de pendientes que **Leaderboard y Cheaterboard quedaron descartados
por diseño** (no son pendientes), y documentar `useStatsPartida` + el panel de stats de la
`ResultScene`. Anotar que el MVP queda sin pendientes abiertos.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: cierre de pendientes (Leaderboard/Cheaterboard descartados) + stats finales"
```

---

## Self-Review

**Cobertura del spec:**
- Leaderboard/Cheaterboard descartados → documentado en Task 6 (CLAUDE.md). ✓
- `useStatsPartida` (manos jugadas/ganadas, pico) → Task 2. ✓
- Contadores partidas ganadas/jugadas → Task 1. ✓
- Exponer contadores en useLogros → Task 3. ✓
- Montaje temprano del tracking → Task 4 (GameRoot). ✓
- Panel en ResultScene, victoria y derrota, 2 bloques → Task 5. ✓
- Niveles leídos de `state.nivel` → Task 5 (no se trackean). ✓
- Verificación `nuxt build` + visual → Tasks 5 y 6. ✓

**Consistencia de tipos/nombres:**
- `statsPartida` con `manosJugadas`/`manosGanadas`/`picoPlata`: definido en Task 2, usado
  igual en Task 5. ✓
- `contadores.partidasGanadas`/`jugadas`/`ganadas`: definido en Task 1, expuesto en Task 3,
  usado en Task 5. ✓
- `progreso.hechos`/`progreso.total`: ya existe en useLogros, usado en Task 5. ✓
- `formatMoneda`: import nombrado desde `useGameConfig` (export existente, verificado). ✓
- Eventos del bus `jugo`/`gano`: nombres reales del proyecto (verificado en logros-reglas). ✓

**Placeholders:** ninguno — todo el código está completo en cada paso.
