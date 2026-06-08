# Narrativa, bienvenida, ayuda, avisos y cinemáticas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cerrar la capa narrativa y de feedback del juego: bienvenida + tutorial, botón de ayuda, aviso "ya podés saldar", cinemáticas de victoria/derrota en la plaza, typewriter en diálogos de NPC y caminar-al-NPC al clickear.

**Architecture:** Las cinemáticas corren en la plaza reusando `PlazaRenderer` en un "modo cinemático" (input bloqueado, animaciones GSAP sobre player/NPCs/partículas). Un flag transitorio `cinematicaPendiente` en `useSceneManager` separa "ya gané/perdí" de "ya mostré el final": la animación corre primero y recién al terminar se setea `state.resultado`, que dispara la pantalla RESULTADO. La bienvenida y la ayuda comparten un componente `ControlesAyuda.vue`.

**Tech Stack:** Nuxt 4, Vue 3 (`ssr: false`), Tailwind CSS 3, GSAP (import dinámico), Canvas 2D. Sin suite de tests: la verificación de cada tarea es `npx nuxt build` + validación visual del usuario en su dev server.

**Verificación estándar:** después de cada tarea correr:
```bash
cd "/Users/lio/Desktop/UP/Tercer Cuatrimestre/Contenidos y Creatividad III/M3/Buenos-Aires-1810" && npx nuxt build
```
Esperado: build termina sin errores (`✓ ... built in ...`). Las cinemáticas se prueban visualmente con los botones DEV GANAR/PERDER del Garito.

---

## File Structure

| Archivo | Responsabilidad | Acción |
|---|---|---|
| `app/composables/useSceneManager.js` | flag `cinematicaPendiente` + `irAPlazaConCinematica` | Modificar |
| `app/composables/useGameState.js` | `saldarDeuda` sin marcar resultado; `marcarResultado`; sacar `forzar*` | Modificar |
| `app/game/render/particles.js` | tipos `sangre` + `brillo` que cae (opts de velocidad) | Modificar |
| `app/game/plaza/PlazaScene.js` | `modoCinematico` + `iniciarCinematica` + caminar-al-NPC | Modificar |
| `app/components/scenes/PlazaScene.vue` | detectar cinemática pendiente y correrla; integrar caminar-al-NPC | Modificar |
| `app/components/scenes/GaritoScene.vue` | botones DEV → cinemática; saldar → cinemática | Modificar |
| `app/components/ui/NpcDialog.vue` | efecto typewriter + corte al cerrar | Modificar |
| `app/components/ui/ControlesAyuda.vue` | controles reutilizables (inline + overlay) | Crear |
| `app/components/ui/AvisoSaldar.vue` | toast "ya podés saldar" | Crear |
| `app/components/scenes/WelcomeScene.vue` | intro + ControlesAyuda inline | Modificar |
| `app/components/ui/TopBar.vue` | sacar texto control, botón "?" ayuda | Modificar |
| `app/components/GameRoot.vue` | montar overlay ayuda + AvisoSaldar global | Modificar |

---

## Task 1: Estado de cinemática en useSceneManager

**Files:**
- Modify: `app/composables/useSceneManager.js`

- [ ] **Step 1: Agregar `cinematicaPendiente` al reactive `scene`**

En `app/composables/useSceneManager.js`, dentro del `reactive({...})` (después de `modoEdicion: false`), agregar el campo:

```js
const scene = reactive({
  actual: ESCENAS.BIENVENIDA,
  transicionando: false,
  ultimoEdificio: null, // para reaparecer en la plaza afuera de su puerta
  ultimoInterior: null, // para volver del minijuego al interior
  modoEdicion: false, // editor de mapeo activo: el juego se alinea a la izquierda
  cinematicaPendiente: null // 'derrota' | 'victoria' | null: la plaza la corre antes de RESULTADO (transitorio, no se persiste)
})
```

- [ ] **Step 2: Agregar el método `irAPlazaConCinematica`**

Después de la función `volverAPlaza` (línea ~120), agregar:

```js
// Teleporta a la plaza marcando una cinemática para que la corra al montar.
// Usado por los botones DEV del garito y por saldar la deuda de verdad.
async function irAPlazaConCinematica(tipo) {
  scene.cinematicaPendiente = tipo
  scene.ultimoInterior = null
  scene.ultimoEdificio = null
  await transicionarA(ESCENAS.PLAZA)
}
```

- [ ] **Step 3: Exportar el nuevo método**

En el `export const useSceneManager = () => ({...})`, agregar `irAPlazaConCinematica` a la lista de exports (después de `volverAPlaza`):

```js
export const useSceneManager = () => ({
  scene,
  ESCENAS,
  INTERIOR_DE,
  escenaActual,
  enTransicion,
  puedeVolver,
  esInterior,
  modoEdicion,
  ir,
  entrarA,
  irAJuego,
  volver,
  volverAPlaza,
  irAPlazaConCinematica
})
```

- [ ] **Step 4: Verificar build**

Run: `cd "/Users/lio/Desktop/UP/Tercer Cuatrimestre/Contenidos y Creatividad III/M3/Buenos-Aires-1810" && npx nuxt build`
Expected: build OK.

- [ ] **Step 5: Commit**

```bash
git add app/composables/useSceneManager.js
git commit -m "feat: estado cinematicaPendiente + irAPlazaConCinematica en sceneManager"
```

---

## Task 2: useGameState — saldar sin marcar resultado, marcarResultado, sacar forzar*

**Files:**
- Modify: `app/composables/useGameState.js`

**Contexto:** la derrota diferida real sigue funcionando vía `chequearDerrota()` (se llama en `cobrar`/`perder` y en el onMounted de la plaza). NO se toca `chequearDerrota`. Lo que cambia: `saldarDeuda` deja de setear `resultado` (lo hará la cinemática al terminar), y se borran `forzarVictoria`/`forzarDerrota` (el modo DEV se maneja desde GaritoScene). Se agrega `marcarResultado` para que la cinemática selle el final.

- [ ] **Step 1: `saldarDeuda` descuenta pero no marca resultado**

Reemplazar la función `saldarDeuda` (líneas ~91-96) por:

```js
// Descuenta la deuda. NO marca victoria acá: la cinemática de victoria la marca al
// terminar (vía marcarResultado). El disparo de la cinemática lo hace GaritoScene.
function saldarDeuda() {
  if (!puedeleSaldar.value) return false
  state.plata -= state.deuda
  return true
}
```

- [ ] **Step 2: Agregar `marcarResultado`**

Justo después de `chequearDerrota` (línea ~103), agregar:

```js
// Sella el final (lo llama la cinemática al terminar). El watcher del FSM / el
// onMounted de la plaza reaccionan a state.resultado para ir a la pantalla RESULTADO.
function marcarResultado(tipo) {
  state.resultado = tipo
}
```

- [ ] **Step 3: Borrar `forzarVictoria` y `forzarDerrota`**

Eliminar las dos funciones (líneas ~105-113):

```js
function forzarVictoria() {
  state.plata = state.deuda
  state.resultado = 'victoria'
}

function forzarDerrota() {
  state.plata = 0
  state.resultado = 'derrota'
}
```

- [ ] **Step 4: Actualizar el export**

Reemplazar el `export const useGameState = () => ({...})` por:

```js
export const useGameState = () => ({
  state,
  puedeleSaldar,
  sinPlata,
  apostar,
  cobrar,
  perder,
  subirNivel,
  reiniciarNivel,
  saldarDeuda,
  marcarResultado,
  chequearDerrota,
  reiniciar
})
```

- [ ] **Step 5: Verificar build**

Run: `cd "/Users/lio/Desktop/UP/Tercer Cuatrimestre/Contenidos y Creatividad III/M3/Buenos-Aires-1810" && npx nuxt build`
Expected: build FALLA con error de que `forzarVictoria`/`forzarDerrota` no existen en `GaritoScene.vue` (las importa). Esto es esperado — se arregla en la Task 7. Si querés un build verde acá, hacé la Task 7 antes del commit. Alternativa: continuar y commitear igual (el árbol queda temporalmente inconsistente hasta Task 7).

**Decisión:** hacer la Task 7 inmediatamente después de esta y commitear juntas. Saltar al commit recién cuando la Task 7 esté lista.

- [ ] **Step 6: (diferido) Commit junto con Task 7**

```bash
git add app/composables/useGameState.js app/components/scenes/GaritoScene.vue
git commit -m "feat: saldar/forzar via cinematica; marcarResultado en gameState"
```

---

## Task 3: Partículas — tipo sangre y brillo que cae

**Files:**
- Modify: `app/game/render/particles.js`

**Contexto:** hoy `emitir` siempre dispara partículas hacia arriba (vy negativo) con gravedad leve. Se agrega un 3er parámetro `opts` opcional para sobreescribir velocidad/gravedad/vida, y soporte de color para el tipo `sangre`. Cambios aditivos: los usos actuales (`emitir(x,y,n)` y `emitir(x,y,n,'brillo')`) siguen igual.

- [ ] **Step 1: `emitir` acepta opts**

Reemplazar el método `emitir` por:

```js
  // Tipo 'brasa' (cálida), 'brillo' (dorado), 'sangre' (rojo oscuro).
  // opts (opcional): { vy, vyVar, vx, gravedad, vidaMin, vidaVar, tam, spread }
  // para sobreescribir el comportamiento por defecto (subir). Las monedas de la
  // victoria caen (vy positivo) y la sangre salpica y cae.
  emitir(x, y, cantidad = 1, tipo = 'brasa', opts = {}) {
    const spread = opts.spread ?? 16
    for (let i = 0; i < cantidad; i++) {
      this.particulas.push({
        x: x + (Math.random() - 0.5) * spread,
        y,
        vx: (opts.vx ?? 0) + (Math.random() - 0.5) * 20,
        vy: (opts.vy ?? -30) - Math.random() * (opts.vyVar ?? 50),
        gravedad: opts.gravedad ?? 18,
        vida: 0,
        vidaMax: (opts.vidaMin ?? 0.8) + Math.random() * (opts.vidaVar ?? 0.9),
        tam: opts.tam ?? (1 + Math.random() * 2.5),
        tipo
      })
    }
  }
```

- [ ] **Step 2: `update` usa la gravedad por partícula**

En `update`, reemplazar la línea `p.vy += 18 * delta // gravedad leve` por:

```js
      p.vy += (p.gravedad ?? 18) * delta // gravedad por partícula
```

- [ ] **Step 3: `draw` colorea la sangre**

En `draw`, reemplazar el bloque `if (p.tipo === 'brillo') {...} else {...}` por:

```js
      let color
      if (p.tipo === 'brillo') {
        color = `rgba(255, 210, 122, ${alpha})`
      } else if (p.tipo === 'sangre') {
        color = `rgba(${Math.floor(150 - t * 40)}, 20, 20, ${alpha})`
      } else {
        const g = Math.floor(178 - t * 120)
        const b = Math.floor(77 - t * 60)
        color = `rgba(255, ${g}, ${Math.max(0, b)}, ${alpha})`
      }
```

- [ ] **Step 4: Verificar build**

Run: `cd "/Users/lio/Desktop/UP/Tercer Cuatrimestre/Contenidos y Creatividad III/M3/Buenos-Aires-1810" && npx nuxt build`
Expected: build OK.

- [ ] **Step 5: Commit**

```bash
git add app/game/render/particles.js
git commit -m "feat: particulas tipo sangre y brillo que cae (opts de velocidad)"
```

---

## Task 4: PlazaRenderer — modo cinemático + iniciarCinematica

**Files:**
- Modify: `app/game/plaza/PlazaScene.js`

**Contexto:** se agrega un modo que bloquea el input y corre una animación dirigida con GSAP. El renderer NO importa GSAP directo (lo hace el componente y se lo pasa), para mantener el patrón del proyecto (GSAP siempre import dinámico desde componentes). La animación manipula `this.pos`, una lista de NPCs temporales (`this.cineNpcs`), un offset de festejo, la rotación del player caído y un fogonazo.

- [ ] **Step 1: Imports y flags en el constructor**

En el `import` del mafioso, agregar `NPCS_INTERIOR` a la línea de import de npcs (línea 13):

```js
import { NPCS_PLAZA, NPCS_INTERIOR, npcEnPunto, npcCercaDe } from '~/game/npc/npcs'
```

En el constructor, después de `this.onEntrar = null` (línea 75), agregar:

```js
    // --- Cinemática (victoria/derrota) ---
    this.modoCinematico = false
    this.cineNpcs = [] // NPCs temporales que aparecen solo en la cinemática
    this.cinePlayerRot = 0 // rotación del player (caída en derrota), radianes
    this.cinePlayerAlpha = 1 // opacidad del player (no usado aún, reservado)
    this.fogonazo = null // { x, y, alpha } destello del disparo en coords px
    this.onHablar = null // callback: el player llegó caminando a un NPC → abrir diálogo
    this.npcDestino = null // NPC al que el player camina (clic en NPC lejano)
```

- [ ] **Step 2: Bloquear input en `update` durante la cinemática**

Al principio de `update(delta, vectorTeclado)`, reemplazar la primera línea:

```js
  update(delta, vectorTeclado) {
    if (this.enEditor) { this.tiempo += delta; return }
```

por:

```js
  update(delta, vectorTeclado) {
    if (this.enEditor) { this.tiempo += delta; return }

    // Durante la cinemática el input está bloqueado: solo avanzan tiempo y partículas
    // (los tweens GSAP mueven al player/NPCs desde afuera).
    if (this.modoCinematico) {
      this.tiempo += delta
      this.particulas.update(delta)
      if (this.fogonazo) this.fogonazo.vida = (this.fogonazo.vida || 0) + delta
      return
    }
```

- [ ] **Step 3: `dibujarPersonajes` incluye NPCs de cinemática, fogonazo y player caído**

Reemplazar el método `dibujarPersonajes` completo por:

```js
  // Jugador + NPCs ordenados por Y (los de más abajo tapan a los de más arriba).
  dibujarPersonajes(ctx) {
    const npcsTodos = this.modoCinematico ? this.cineNpcs : this.npcs
    const lista = [
      { y: this.pos.y, dibujar: () => this.dibujarPlayerCine(ctx) },
      ...npcsTodos.map((n) => ({
        y: n.pos.y + (n.cineOffsetY || 0),
        dibujar: () => drawNpc(
          ctx,
          n.pos.x * ANCHO,
          (n.pos.y + (n.cineOffsetY || 0)) * ALTO,
          n.pal,
          this.tiempo * 2 + n.pos.x * 10
        )
      }))
    ]
    lista.sort((a, b) => a.y - b.y)
    for (const item of lista) item.dibujar()

    // Fogonazo del disparo (destello breve sobre todo).
    if (this.fogonazo && (this.fogonazo.vida || 0) < 0.12) {
      ctx.save()
      ctx.globalAlpha = Math.max(0, 1 - (this.fogonazo.vida || 0) / 0.12)
      ctx.fillStyle = '#fff6d8'
      ctx.beginPath()
      ctx.arc(this.fogonazo.x, this.fogonazo.y, 26, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
  }

  // Dibuja el player aplicando la rotación de caída (derrota). Rota alrededor de un
  // punto a media altura del cuerpo para que se vea "tumbado", no clavado en los pies.
  dibujarPlayerCine(ctx) {
    const px = this.pos.x * ANCHO
    const py = this.pos.y * ALTO
    if (this.cinePlayerRot === 0) {
      drawPlayer(ctx, px, py, this.dir, this.frameCaminata)
      return
    }
    ctx.save()
    ctx.translate(px, py - 28) // pivote a media altura del sprite
    ctx.rotate(this.cinePlayerRot)
    ctx.translate(-px, -(py - 28))
    drawPlayer(ctx, px, py, this.dir, this.frameCaminata)
    ctx.restore()
  }
```

- [ ] **Step 4: `iniciarCinematica` (recibe gsap del componente)**

Después de `reaparecerEn` (línea ~563), agregar los métodos de cinemática:

```js
  // Corre la cinemática de victoria o derrota. gsap = módulo GSAP (import dinámico
  // desde el componente). onFin se llama al terminar (la plaza sella el resultado).
  iniciarCinematica(tipo, gsap, onFin) {
    this.modoCinematico = true
    this.target = null
    this.cola = []
    this.caminando = false
    this.particulas.limpiar()
    if (tipo === 'derrota') this.cinematicaDerrota(gsap, onFin)
    else this.cinematicaVictoria(gsap, onFin)
  }

  // Punto de spawn de la plaza en coords normalizadas.
  get spawnPlaza() {
    return { ...POS_INICIAL_JUGADOR }
  }

  cinematicaDerrota(gsap, onFin) {
    const spawn = this.spawnPlaza
    this.dir = 'abajo'
    // Mafioso temporal: clon del de NPCS_INTERIOR.garito, arranca en la puerta del garito.
    const garito = EDIFICIOS.find((e) => e.id === 'garito')
    const puerta = garito ? garito.puerta : { x: 0.5, y: 0.9 }
    const mafiosoBase = NPCS_INTERIOR.garito[0]
    const mafioso = {
      id: 'mafioso',
      nombre: mafiosoBase.nombre,
      pal: mafiosoBase.pal,
      pos: { x: puerta.x, y: puerta.y }
    }
    this.cineNpcs = [mafioso]

    const tl = gsap.timeline({ onComplete: () => onFin && onFin() })
    // 1. El player camina al spawn.
    tl.to(this.pos, { x: spawn.x, y: spawn.y, duration: 0.8, ease: 'power1.inOut' })
    // 2. El mafioso sale del garito y se planta a un pasito del player.
    tl.to(mafioso.pos, {
      x: spawn.x + 0.07,
      y: spawn.y + 0.02,
      duration: 1.2,
      ease: 'power1.inOut'
    }, '>0.2')
    // 3. Fogonazo (disparo).
    tl.call(() => {
      this.fogonazo = { x: (spawn.x + 0.05) * ANCHO, y: (spawn.y - 0.04) * ALTO, vida: 0 }
    }, null, '>0.3')
    // 4. El player cae rotando + sangre.
    tl.to(this, { cinePlayerRot: Math.PI / 2, duration: 0.45, ease: 'power2.in' }, '>0.05')
    tl.call(() => {
      this.particulas.emitir((spawn.x) * ANCHO, (spawn.y - 0.03) * ALTO, 26, 'sangre', {
        vy: -60, vyVar: 40, gravedad: 240, vidaMin: 0.5, vidaVar: 0.5, spread: 10
      })
    }, null, '<')
    // 5. Pausa para que se lea, después fade lo maneja la plaza vía onFin.
    tl.to({}, { duration: 0.9 })
  }

  cinematicaVictoria(gsap, onFin) {
    const spawn = this.spawnPlaza
    this.dir = 'abajo'
    // Todos los NPCs menos el mafioso, en arco alrededor del player.
    const base = [...NPCS_PLAZA]
    for (const [id, arr] of Object.entries(NPCS_INTERIOR)) {
      if (id === 'garito') continue
      base.push(...arr)
    }
    const n = base.length
    this.cineNpcs = base.map((src, i) => {
      const ang = Math.PI + (Math.PI * (i + 0.5)) / n // semicírculo por encima/lados
      return {
        id: src.id,
        nombre: src.nombre,
        pal: src.pal,
        pos: { x: spawn.x + Math.cos(ang) * 0.14, y: spawn.y + 0.04 + Math.sin(ang) * 0.10 },
        cineOffsetY: 0
      }
    })

    const tl = gsap.timeline({ onComplete: () => onFin && onFin() })
    // 1. El player camina al spawn.
    tl.to(this.pos, { x: spawn.x, y: spawn.y, duration: 0.8, ease: 'power1.inOut' })
    // 2. Saltitos escalonados de los NPCs (festejo).
    this.cineNpcs.forEach((npc, i) => {
      tl.to(npc, {
        cineOffsetY: -0.03,
        duration: 0.35,
        ease: 'power1.out',
        yoyo: true,
        repeat: 3
      }, i === 0 ? '>0.1' : '<0.08')
    })
    // 3. Lluvia de monedas (varios chorros desde arriba).
    tl.call(() => {
      for (let k = 0; k < 5; k++) {
        this.particulas.emitir(
          (0.3 + Math.random() * 0.4) * ANCHO, -10, 18, 'brillo',
          { vy: 60, vyVar: 40, gravedad: 60, vidaMin: 1.4, vidaVar: 0.8, tam: 2 + Math.random() * 2, spread: 200 }
        )
      }
    }, null, '<0.3')
    // 4. Pausa para que se vea el festejo.
    tl.to({}, { duration: 1.4 })
  }
```

- [ ] **Step 5: Verificar build**

Run: `cd "/Users/lio/Desktop/UP/Tercer Cuatrimestre/Contenidos y Creatividad III/M3/Buenos-Aires-1810" && npx nuxt build`
Expected: build OK.

- [ ] **Step 6: Commit**

```bash
git add app/game/plaza/PlazaScene.js
git commit -m "feat: modo cinematico + cinematicas victoria/derrota en PlazaRenderer"
```

---

## Task 5: PlazaRenderer — caminar al NPC al clickear

**Files:**
- Modify: `app/game/plaza/PlazaScene.js`

**Contexto:** hoy `clickNpc` abre el diálogo solo si el NPC está cerca. Nuevo: clic sobre un NPC (cerca o lejos) hace caminar al player hasta él y abre el diálogo al llegar. Se reusa la maquinaria de `target`/`cola`: un waypoint puede llevar un `npc`, y `llegarATarget` lo reporta vía `onHablar`.

- [ ] **Step 1: Detección de clic sobre NPC a cualquier distancia**

Reemplazar el método `clickNpc` (líneas ~175-182) por:

```js
  // Clic sobre un NPC: si está cerca, habla ya; si está lejos, camina hasta él y
  // habla al llegar. Devuelve el diálogo si habla en el acto, o null si va a caminar.
  clickNpc(sx, sy) {
    if (this.enEditor || this.modoCinematico) return null
    const p = this.aNorm(sx, sy)
    // ¿Clic sobre el cuerpo de un NPC? (radio de cuerpo, no de cercanía)
    let elegido = null
    let mejorD = RADIO_CUERPO_CLIC
    for (const n of this.npcs) {
      const d = dist(p.x, p.y, n.pos.x, n.pos.y)
      if (d < mejorD) { mejorD = d; elegido = n }
    }
    if (!elegido) return null
    // Si ya estoy cerca, hablo al toque.
    if (dist(this.pos.x, this.pos.y, elegido.pos.x, elegido.pos.y) < RADIO_CERCA_NPC) {
      return this.hablar(elegido)
    }
    // Si no, camino hasta un punto a distancia de charla del NPC.
    this.caminarHaciaNpc(elegido)
    return null
  }

  // Encola un destino a "distancia de charla" del NPC y marca el NPC pendiente.
  caminarHaciaNpc(npc) {
    const dx = this.pos.x - npc.pos.x
    const dy = this.pos.y - npc.pos.y
    const d = Math.hypot(dx, dy) || 1
    const r = RADIO_CERCA_NPC * 0.7 // un poco dentro del radio de cercanía
    const destino = {
      x: npc.pos.x + (dx / d) * r,
      y: npc.pos.y + (dy / d) * r,
      npc
    }
    this.cola = []
    this.target = destino
  }
```

- [ ] **Step 2: Constante de radio de clic sobre el cuerpo**

Junto a las constantes del tope del archivo (después de `const SALIDA_GRACIA = 0.06`, línea ~29), agregar:

```js
// Radio para detectar un clic sobre el cuerpo de un NPC (mayor que el de choque).
const RADIO_CUERPO_CLIC = 0.03
```

Y asegurar que `RADIO_CERCA_NPC` esté importado: en el import de npcs (línea 13) agregarlo:

```js
import { NPCS_PLAZA, NPCS_INTERIOR, npcEnPunto, npcCercaDe, RADIO_CERCA_NPC } from '~/game/npc/npcs'
```

- [ ] **Step 3: `llegarATarget` reporta el NPC pendiente**

Reemplazar `llegarATarget` (líneas ~538-548) por:

```js
  llegarATarget() {
    const t = this.target
    // Avanzar al siguiente waypoint de la cola si hay.
    if (this.cola.length) {
      this.target = this.cola.shift()
      return
    }
    this.target = null
    if (!t) return
    if (t.edificio && t.edificio.escena && this.onEntrar) { this.onEntrar(t.edificio); return }
    // Llegó caminando a un NPC: abrir su diálogo.
    if (t.npc && this.onHablar) {
      const d = this.hablar(t.npc)
      if (d) this.onHablar(d)
    }
  }
```

- [ ] **Step 4: Verificar build**

Run: `cd "/Users/lio/Desktop/UP/Tercer Cuatrimestre/Contenidos y Creatividad III/M3/Buenos-Aires-1810" && npx nuxt build`
Expected: build OK.

- [ ] **Step 5: Commit**

```bash
git add app/game/plaza/PlazaScene.js
git commit -m "feat: clic en NPC camina hasta el y habla al llegar"
```

---

## Task 6: PlazaScene.vue — correr cinemática pendiente + integrar caminar-al-NPC

**Files:**
- Modify: `app/components/scenes/PlazaScene.vue`

- [ ] **Step 1: Importar `marcarResultado` y `irAPlazaConCinematica`/`scene`**

En el `<script setup>`, actualizar las dos líneas de composables:

```js
const { entrarA, scene, ir, ESCENAS } = useSceneManager()
const { state, chequearDerrota, marcarResultado } = useGameState()
```

Y agregar un ref para el fade de fin de cinemática y otro para saber si estamos en cinemática (debajo de `const dialogo = ref(null)`):

```js
const enCinematica = ref(false) // bloquea carteles/prompt durante la cinemática
const fadeCine = ref(false) // overlay negro al cerrar la cinemática
```

- [ ] **Step 2: Reescribir el `onMounted` para contemplar la cinemática**

Reemplazar el `onMounted` completo (líneas ~43-75) por:

```js
onMounted(async () => {
  const pendiente = scene.cinematicaPendiente

  // Sin cinemática pendiente: lógica normal de game over diferido.
  if (!pendiente) {
    chequearDerrota()
    // Si la derrota ya está marcada (acá o en un minijuego), corremos la cinemática
    // de derrota en vez de saltar directo a RESULTADO.
    if (state.resultado === 'derrota') {
      scene.cinematicaPendiente = 'derrota'
    }
  }

  renderer = new PlazaRenderer(canvasRef.value, config)

  if (scene.ultimoEdificio) {
    renderer.reaparecerEn(scene.ultimoEdificio)
  }

  renderer.onEntrar = (edif) => {
    entrarA(edif.escena, edif.id)
  }

  // El player llegó caminando a un NPC → abrir su diálogo.
  renderer.onHablar = (d) => {
    dialogo.value = d
  }

  carteles.value = renderer.carteles()

  loop.start((delta) => {
    renderer.update(delta, input.getVectorDireccion())
    renderer.draw()
    npcCerca.value = !!renderer.npcCerca
    if (editor.value) carteles.value = renderer.carteles()
  })

  window.addEventListener('keydown', onKey)

  // Disparar la cinemática si quedó pendiente (sea por DEV, por saldar, o por derrota).
  const tipoCine = scene.cinematicaPendiente
  if (tipoCine) {
    scene.cinematicaPendiente = null
    enCinematica.value = true
    const gsap = (await import('gsap')).default
    renderer.iniciarCinematica(tipoCine, gsap, () => terminarCinematica(tipoCine))
  }
})

// Al terminar la cinemática: fade a negro y sellar el resultado → salta a RESULTADO.
function terminarCinematica(tipo) {
  fadeCine.value = true
  setTimeout(() => {
    marcarResultado(tipo)
    // Victoria: el watcher del FSM salta a RESULTADO. Derrota: forzamos el salto.
    if (tipo === 'derrota') ir(ESCENAS.RESULTADO)
  }, 500)
}
```

**Nota:** `onMounted` ahora es `async`. La instancia del renderer y el `loop.start` siguen corriendo aunque la cinemática haga `await import('gsap')` después.

- [ ] **Step 3: Bloquear interacción de juego durante la cinemática**

En `onKey`, al principio (después de `if (!renderer) return`), agregar:

```js
function onKey(e) {
  if (!renderer) return
  if (enCinematica.value) return
  const k = e.key.toLowerCase()
```

En `onClick`, al principio:

```js
function onClick(e) {
  if (enEditor.value || enCinematica.value) return
```

- [ ] **Step 4: Overlay de fade de cinemática en el template**

Dentro del `<div class="w-full h-full relative">`, justo antes del cierre `</div>` final del template (después del panel de edición, antes de `</template>`), agregar:

```vue
    <!-- Fade negro al cerrar la cinemática (antes de saltar a RESULTADO) -->
    <div
      class="absolute inset-0 z-40 bg-noche pointer-events-none transition-opacity duration-500"
      :class="fadeCine ? 'opacity-100' : 'opacity-0'"
    />
```

- [ ] **Step 5: Ocultar carteles y prompt durante la cinemática**

En el `<template v-if="!enEditor">` de los carteles, cambiar a:

```vue
    <template v-if="!enEditor && !enCinematica">
```

Y en el prompt de NPC (`v-if="npcCerca && !dialogo && !enEditor"`), cambiar a:

```vue
        v-if="npcCerca && !dialogo && !enEditor && !enCinematica"
```

- [ ] **Step 6: Verificar build**

Run: `cd "/Users/lio/Desktop/UP/Tercer Cuatrimestre/Contenidos y Creatividad III/M3/Buenos-Aires-1810" && npx nuxt build`
Expected: build OK.

- [ ] **Step 7: Commit**

```bash
git add app/components/scenes/PlazaScene.vue
git commit -m "feat: la plaza corre la cinematica pendiente y abre dialogo al llegar al NPC"
```

---

## Task 7: GaritoScene.vue — botones DEV y saldar disparan cinemática

**Files:**
- Modify: `app/components/scenes/GaritoScene.vue`

**Contexto:** esta tarea cierra el build que la Task 2 dejó rojo (sacó `forzarVictoria`/`forzarDerrota` que este componente importaba). Ahora el garito dispara las cinemáticas vía `irAPlazaConCinematica`.

- [ ] **Step 1: Actualizar imports de composables**

Reemplazar las líneas 7-8:

```js
const { state, puedeleSaldar, saldarDeuda } = useGameState()
const { volverAPlaza, irAPlazaConCinematica } = useSceneManager()
```

- [ ] **Step 2: `intentarSaldar` dispara cinemática de victoria**

Reemplazar la función `intentarSaldar`:

```js
function intentarSaldar() {
  if (puedeleSaldar.value) {
    saldarDeuda() // descuenta la deuda; la victoria la sella la cinemática
    irAPlazaConCinematica('victoria')
  } else {
    echado.value = true
    shake.value = true
    setTimeout(() => (shake.value = false), 450)
  }
}
```

- [ ] **Step 3: Agregar handlers DEV `ganar`/`perder`**

Después de `intentarSaldar`, agregar:

```js
// Panel DEV: teleporta a la plaza y corre la cinemática correspondiente.
function devGanar() {
  irAPlazaConCinematica('victoria')
}
function devPerder() {
  state.plata = 0 // que la bolsa refleje la derrota
  irAPlazaConCinematica('derrota')
}
```

- [ ] **Step 4: Conectar los botones DEV**

En el template, cambiar `@click="forzarVictoria"` por `@click="devGanar"` y `@click="forzarDerrota"` por `@click="devPerder"`.

- [ ] **Step 5: Verificar build**

Run: `cd "/Users/lio/Desktop/UP/Tercer Cuatrimestre/Contenidos y Creatividad III/M3/Buenos-Aires-1810" && npx nuxt build`
Expected: build OK (ahora sí, con la Task 2 ya aplicada).

- [ ] **Step 6: Commit (junto con Task 2)**

```bash
git add app/composables/useGameState.js app/components/scenes/GaritoScene.vue
git commit -m "feat: garito dispara cinematicas (saldar + DEV) via irAPlazaConCinematica"
```

- [ ] **Step 7: Validación visual**

En el dev server del usuario: entrar al Garito, tocar **PERDER** → debe teleportar a la plaza, el mafioso sale del garito, dispara, el player cae con sangre, fade, pantalla de derrota. Tocar **GANAR** → teleporta, NPCs festejan, caen monedas, fade, pantalla de victoria.

---

## Task 8: NpcDialog.vue — efecto typewriter

**Files:**
- Modify: `app/components/ui/NpcDialog.vue`

**Contexto:** el texto se escribe char por char. Mientras escribe, el clic NO hace nada que corte (E ya no llega acá porque la caja se cierra desde PlazaScene/Interior con cualquier tecla — ver nota). Cerrar (clic en la caja o alejarse) corta el timer y emite `cerrar`.

**Nota de comportamiento:** hoy `PlazaScene.onKey` cierra el diálogo con CUALQUIER tecla (`if (dialogo.value) { dialogo.value = null; return }`). Eso se mantiene: alejarse/teclear cierra. El typewriter solo afecta CÓMO aparece el texto dentro de la caja; el clic sobre la caja sigue cerrando (emite `cerrar`). El requisito "mientras escribe E no hace nada" se cumple porque E cierra la caja entera (comportamiento actual), no "completa el texto".

- [ ] **Step 1: Reescribir el script con el typewriter**

Reemplazar el `<script setup>` completo por:

```js
<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useAudio } from '~/composables/useAudio'

const props = defineProps({
  nombre: { type: String, required: true },
  texto: { type: String, required: true }
})
defineEmits(['cerrar'])

const { sfx } = useAudio()

const MS_POR_CHAR = 25
const mostrado = ref('') // porción ya escrita
let timer = null
let i = 0

function escribir(texto) {
  clearInterval(timer)
  mostrado.value = ''
  i = 0
  timer = setInterval(() => {
    i++
    mostrado.value = texto.slice(0, i)
    if (i >= texto.length) clearInterval(timer)
  }, MS_POR_CHAR)
}

onMounted(() => {
  sfx('dialogoNpc')
  escribir(props.texto)
})

// Si cambia el texto (otra línea sin desmontar), reinicia el efecto.
watch(() => props.texto, (t) => escribir(t))

onUnmounted(() => clearInterval(timer))
</script>
```

- [ ] **Step 2: Usar `mostrado` en el template**

En el template, cambiar la línea del párrafo:

```vue
      <p class="font-cuerpo text-lg text-light/90 leading-relaxed" style="color: #f0e6d2;">
        "{{ texto }}"
      </p>
```

por:

```vue
      <p class="font-cuerpo text-lg text-light/90 leading-relaxed" style="color: #f0e6d2;">
        "{{ mostrado }}"
      </p>
```

- [ ] **Step 3: Verificar build**

Run: `cd "/Users/lio/Desktop/UP/Tercer Cuatrimestre/Contenidos y Creatividad III/M3/Buenos-Aires-1810" && npx nuxt build`
Expected: build OK.

- [ ] **Step 4: Commit**

```bash
git add app/components/ui/NpcDialog.vue
git commit -m "feat: efecto typewriter en los dialogos de NPC"
```

- [ ] **Step 5: Validación visual**

Hablar con un NPC (E o clic) → el texto se escribe letra por letra. Alejarse o clic cierra la caja.

---

## Task 9: ControlesAyuda.vue — componente reutilizable

**Files:**
- Create: `app/components/ui/ControlesAyuda.vue`

**Contexto:** una sola fuente de verdad para los controles. Prop `modal`: si es true se muestra como overlay (fondo oscuro, ESC/clic fuera cierra, emite `cerrar`); si es false se muestra inline (sin overlay, para la bienvenida).

- [ ] **Step 1: Crear el componente**

Crear `app/components/ui/ControlesAyuda.vue`:

```vue
<script setup>
import { onMounted, onUnmounted } from 'vue'

const props = defineProps({
  modal: { type: Boolean, default: false }
})
const emit = defineEmits(['cerrar'])

const controles = [
  { tecla: 'WASD', alt: '↑←↓→', accion: 'Caminar por la plaza y los interiores' },
  { tecla: 'Clic', alt: '', accion: 'Caminar a un punto · entrar a un edificio · hablar con un NPC' },
  { tecla: 'E', alt: '', accion: 'Hablar con el NPC cercano · sentarte a la mesa de un juego' }
]

function onEsc(e) {
  if (props.modal && e.key === 'Escape') emit('cerrar')
}
onMounted(() => {
  if (props.modal) window.addEventListener('keydown', onEsc)
})
onUnmounted(() => window.removeEventListener('keydown', onEsc))
</script>

<template>
  <!-- Overlay modal -->
  <div
    v-if="modal"
    class="absolute inset-0 z-50 flex justify-center items-center bg-noche/80 backdrop-blur-sm"
    @click.self="emit('cerrar')"
  >
    <div class="w-[560px] flex flex-col gap-6 bg-noche-2 border-2 border-farol/40 rounded-2xl shadow-farol-lg p-8">
      <div class="flex justify-between items-center">
        <h3 class="font-display text-2xl text-dorado tracking-wide">Cómo se juega</h3>
        <button
          class="size-8 flex justify-center items-center bg-noche border border-light/20 hover:border-farol/50 rounded-lg text-light/70 hover:text-dorado transition-colors"
          @click="emit('cerrar')"
        >
          ✕
        </button>
      </div>
      <div class="flex flex-col gap-3">
        <div v-for="c in controles" :key="c.tecla" class="flex items-center gap-4">
          <span class="min-w-[72px] flex justify-center items-center bg-farol/15 border border-farol/50 rounded-lg font-display text-dorado px-3 py-1.5">
            {{ c.tecla }}
          </span>
          <span class="font-cuerpo text-light/85 text-base leading-snug">{{ c.accion }}</span>
        </div>
      </div>
      <p class="font-cuerpo text-light/40 text-sm text-center italic">ESC o clic afuera para cerrar</p>
    </div>
  </div>

  <!-- Inline (bienvenida) -->
  <div v-else class="w-full flex flex-col gap-3">
    <div v-for="c in controles" :key="c.tecla" class="flex items-center gap-4">
      <span class="min-w-[72px] flex justify-center items-center bg-farol/15 border border-farol/50 rounded-lg font-display text-dorado px-3 py-1.5">
        {{ c.tecla }}
      </span>
      <span class="font-cuerpo text-light/85 text-base leading-snug text-left">{{ c.accion }}</span>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Verificar build**

Run: `cd "/Users/lio/Desktop/UP/Tercer Cuatrimestre/Contenidos y Creatividad III/M3/Buenos-Aires-1810" && npx nuxt build`
Expected: build OK (componente nuevo, aún sin usar — Nuxt auto-importa, no rompe).

- [ ] **Step 3: Commit**

```bash
git add app/components/ui/ControlesAyuda.vue
git commit -m "feat: componente ControlesAyuda reutilizable (inline + modal)"
```

---

## Task 10: TopBar.vue — sacar texto control + botón ayuda

**Files:**
- Modify: `app/components/ui/TopBar.vue`

- [ ] **Step 1: Sacar el texto de controles del centro**

Reemplazar el bloque del centro (líneas ~70-78):

```vue
    <!-- Centro: indicaciones (solo en la plaza) -->
    <div class="flex-1 flex justify-center items-center">
      <p
        v-if="escenaActual === ESCENAS.PLAZA"
        class="font-cuerpo text-light/35 text-xs tracking-wide"
      >
        WASD o clic para caminar · clic en un edificio para entrar
      </p>
    </div>
```

por un espaciador simple:

```vue
    <!-- Centro: espaciador -->
    <div class="flex-1" />
```

- [ ] **Step 2: Agregar el botón "?" al grupo derecho**

En el grupo de la derecha (`<div class="flex items-center gap-5">`), justo ANTES del botón de mute, agregar el botón de ayuda. Reemplazar la apertura del botón de mute y agregar el de ayuda antes:

```vue
      <button
        class="size-9 flex justify-center items-center bg-noche border border-farol/20 hover:border-farol/50 rounded-lg text-dorado/80 hover:text-dorado transition-colors duration-200"
        title="Cómo se juega"
        aria-label="Cómo se juega"
        @click="emit('ayuda')"
      >
        <span class="font-display text-lg leading-none">?</span>
      </button>
```

- [ ] **Step 3: Declarar el emit `ayuda`**

En el `<script setup>`, después de los imports/composables, agregar:

```js
const emit = defineEmits(['ayuda'])
```

- [ ] **Step 4: Verificar build**

Run: `cd "/Users/lio/Desktop/UP/Tercer Cuatrimestre/Contenidos y Creatividad III/M3/Buenos-Aires-1810" && npx nuxt build`
Expected: build OK.

- [ ] **Step 5: Commit**

```bash
git add app/components/ui/TopBar.vue
git commit -m "feat: TopBar sin texto de control, con boton de ayuda"
```

---

## Task 11: GameRoot.vue — montar overlay de ayuda + aviso saldar

**Files:**
- Modify: `app/components/GameRoot.vue`

**Contexto:** el overlay de ayuda se controla acá (estado `ayudaAbierta`), disparado por el emit de la TopBar. El `AvisoSaldar` (Task 12) se monta global para verse en cualquier escena con barra.

- [ ] **Step 1: Estado de ayuda + handler**

Reemplazar el `<script setup>` por:

```js
<script setup>
// Orquestador: barra superior global + frame de juego pegado abajo.
import { computed, ref } from 'vue'
import { useSceneManager, ESCENAS } from '~/composables/useSceneManager'

const { escenaActual, enTransicion, esInterior } = useSceneManager()

// La barra superior se ve en todas las escenas salvo las pantallas completas.
const mostrarBarra = computed(
  () => escenaActual.value !== ESCENAS.BIENVENIDA && escenaActual.value !== ESCENAS.RESULTADO
)

const ayudaAbierta = ref(false)
</script>
```

- [ ] **Step 2: Conectar TopBar, montar ayuda y aviso en el template**

Reemplazar el `<template>` por:

```vue
<template>
  <div class="w-[1440px] flex flex-col">
    <TopBar v-if="mostrarBarra" @ayuda="ayudaAbierta = true" />

    <!-- Frame de juego, pegado abajo -->
    <div class="w-full h-[800px] relative bg-noche overflow-hidden">
      <WelcomeScene v-if="escenaActual === ESCENAS.BIENVENIDA" />
      <PlazaScene v-else-if="escenaActual === ESCENAS.PLAZA" />
      <InteriorScene v-else-if="esInterior" :key="escenaActual" />
      <BingoGame v-else-if="escenaActual === ESCENAS.BINGO" />
      <DiceGame v-else-if="escenaActual === ESCENAS.DADOS" />
      <CardsGame v-else-if="escenaActual === ESCENAS.NAIPES" />
      <CupsGame v-else-if="escenaActual === ESCENAS.CUBILETES" />
      <SapoGame v-else-if="escenaActual === ESCENAS.SORTIJA" />
      <GaritoScene v-else-if="escenaActual === ESCENAS.GARITO" />
      <ResultScene v-else-if="escenaActual === ESCENAS.RESULTADO" />

      <!-- Aviso "ya podés saldar" (global, sobre el frame de juego) -->
      <AvisoSaldar />

      <!-- Overlay de ayuda (controles) -->
      <ControlesAyuda v-if="ayudaAbierta" modal @cerrar="ayudaAbierta = false" />

      <!-- Fundido negro entre escenas -->
      <div
        class="absolute inset-0 z-50 bg-noche pointer-events-none transition-opacity duration-200 ease-out"
        :class="enTransicion ? 'opacity-100' : 'opacity-0'"
      />
    </div>
  </div>
</template>
```

**Nota:** `AvisoSaldar` se crea en la Task 12. Si esta tarea se ejecuta antes, el build falla por componente inexistente. **Ejecutar la Task 12 antes de buildear/commitear esta**, o comentar la línea `<AvisoSaldar />` hasta tenerla.

- [ ] **Step 3: (tras Task 12) Verificar build**

Run: `cd "/Users/lio/Desktop/UP/Tercer Cuatrimestre/Contenidos y Creatividad III/M3/Buenos-Aires-1810" && npx nuxt build`
Expected: build OK.

- [ ] **Step 4: Commit (junto con Task 12)**

```bash
git add app/components/GameRoot.vue app/components/ui/AvisoSaldar.vue
git commit -m "feat: overlay de ayuda + aviso saldar montados en GameRoot"
```

---

## Task 12: AvisoSaldar.vue — toast al cruzar la deuda

**Files:**
- Create: `app/components/ui/AvisoSaldar.vue`

**Contexto:** toast temporal cuando la plata cruza la deuda hacia arriba. Re-disparable: flag `estabaPorEncima`. No se persiste. Se va solo a los ~4.5s. Se anima con GSAP (entrada/salida).

- [ ] **Step 1: Crear el componente**

Crear `app/components/ui/AvisoSaldar.vue`:

```vue
<script setup>
import { ref, watch, onUnmounted } from 'vue'
import { useGameState } from '~/composables/useGameState'

const { state, puedeleSaldar } = useGameState()

const visible = ref(false)
let estabaPorEncima = puedeleSaldar.value // arranca según el estado actual (no avisa de entrada)
let timer = null

watch(
  () => puedeleSaldar.value,
  (ahora) => {
    // Cruce de abajo→arriba: mostrar el aviso.
    if (ahora && !estabaPorEncima) {
      mostrar()
    }
    estabaPorEncima = ahora
  }
)

function mostrar() {
  visible.value = true
  clearTimeout(timer)
  timer = setTimeout(() => (visible.value = false), 4500)
}

onUnmounted(() => clearTimeout(timer))
</script>

<template>
  <Transition name="aviso">
    <div
      v-if="visible"
      class="absolute top-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-noche/95 border-2 border-ganancia/60 rounded-xl shadow-farol-lg px-6 py-3.5"
    >
      <span class="size-2.5 bg-ganancia rounded-full shadow-[0_0_10px_rgba(123,201,111,0.8)]" />
      <p class="font-display text-ganancia text-lg tracking-wide">
        ¡Ya tenés con qué saldar! Andá al garito a cancelar la deuda.
      </p>
    </div>
  </Transition>
</template>

<style scoped>
.aviso-enter-active,
.aviso-leave-active {
  transition: all 0.4s ease;
}
.aviso-enter-from,
.aviso-leave-to {
  opacity: 0;
  transform: translate(-50%, -12px);
}
</style>
```

- [ ] **Step 2: Verificar build (con Task 11 ya aplicada)**

Run: `cd "/Users/lio/Desktop/UP/Tercer Cuatrimestre/Contenidos y Creatividad III/M3/Buenos-Aires-1810" && npx nuxt build`
Expected: build OK.

- [ ] **Step 3: Commit (junto con Task 11)**

Ver Task 11 Step 4.

- [ ] **Step 4: Validación visual**

Con los botones DEV o jugando, llegar a tener ≥ $200 en la bolsa → debe aparecer el toast verde arriba y desaparecer solo a los ~4.5s. Si bajás apostando y volvés a cruzar, reaparece.

---

## Task 13: WelcomeScene.vue — intro + ControlesAyuda inline

**Files:**
- Modify: `app/components/scenes/WelcomeScene.vue`

**Contexto:** se suma un bloque con la narrativa breve (ya existe una línea) + los controles inline, antes del botón "Entrar a la plaza". Pulido visual fino queda para el final; acá solo se integra el contenido funcional sin romper el layout.

- [ ] **Step 1: Insertar ControlesAyuda inline antes del botón**

En el template, entre el bloque del tagline/ornamento y el `<button>` "Entrar a la plaza", agregar (después del `</div>` del ornamento decorativo, antes del `<button>`):

```vue
      <!-- Cómo se juega -->
      <div class="w-full max-w-md flex flex-col gap-3 mt-8">
        <span class="font-cuerpo text-farol/60 text-xs tracking-[0.3em] uppercase text-center">Cómo se juega</span>
        <ControlesAyuda />
      </div>
```

- [ ] **Step 2: Verificar build**

Run: `cd "/Users/lio/Desktop/UP/Tercer Cuatrimestre/Contenidos y Creatividad III/M3/Buenos-Aires-1810" && npx nuxt build`
Expected: build OK.

- [ ] **Step 3: Commit**

```bash
git add app/components/scenes/WelcomeScene.vue
git commit -m "feat: bienvenida muestra los controles inline (ControlesAyuda)"
```

- [ ] **Step 4: Validación visual**

Borrar el save (localStorage `plaza1810_state_v2`) o partida nueva → la bienvenida muestra la sección "Cómo se juega" con los 3 controles. El botón "Entrar a la plaza" sigue funcionando.

---

## Self-Review notes

- **Cobertura del spec:** Sección 1 → Task 1,2,7. Sección 2 (cinemáticas) → Task 3,4,6. Sección 3 (bienvenida/ayuda) → Task 9,10,11,13. Sección 4 (aviso) → Task 11,12. Sección 5 (typewriter + caminar-al-NPC) → Task 5,8. Sección 6 (ResultScene sin tocar) → nada, correcto.
- **Orden con builds rojos intermedios:** Task 2 deja el build rojo hasta Task 7 (documentado). Task 11 depende de Task 12 (documentado). Ejecutar en orden: 1, 3, 4, 5, 6, 8, 9, 10, 12, 11, 13, y el par 2+7 juntas en cualquier punto (recomendado: 2 inmediatamente seguida de 7). **Orden seguro sugerido: 1 → 3 → 4 → 5 → 6 → 8 → 9 → 10 → 12 → 11 → 13 → 2 → 7.**
- **Consistencia de nombres:** `irAPlazaConCinematica`, `marcarResultado`, `cinematicaPendiente`, `iniciarCinematica(tipo, gsap, onFin)`, `onHablar`, `modoCinematico` usados igual en todas las tareas.
- **GSAP:** siempre import dinámico desde componentes (`PlazaScene.vue` Task 6). El renderer recibe `gsap` como parámetro, nunca lo importa.
