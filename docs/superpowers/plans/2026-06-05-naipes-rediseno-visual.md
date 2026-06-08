# Rediseño visual de cartas de la pulpería — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rediseñar el aspecto de las cartas de la pulpería para que parezcan una baraja española de época, coherente con la estética farol/dorado del juego. Cambio puramente visual.

**Architecture:** Todo CSS/SVG, sin assets. Los símbolos de palos y las figuras (Sota/Caballo/Rey) viven como `<symbol>` SVG compartidos en `CardsGame.vue`; `NaipeCard.vue` los referencia con `<use>` y arma el frente/reverso. Props y animaciones existentes intactas.

**Tech Stack:** Nuxt 4 / Vue 3, Tailwind CSS 3, SVG inline.

**Nota sobre verificación:** este cambio es 100% visual y no admite tests unitarios sensatos (un test de píxeles sería sobreingeniería, contra "simplicidad primero" del CLAUDE.md). La verificación de cada tarea es: (a) `npx nuxt build` pasa, (b) validación visual del usuario en su dev server. No se escriben tests automatizados.

**Archivos tocados:**
- Modify: `app/components/minigames/CardsGame.vue` (bloque `<symbol>` SVG, líneas ~187-205): rediseñar 4 palos + agregar 3 figuras.
- Modify: `app/components/minigames/NaipeCard.vue`: frente (numéricas + figuras), marco, papel, reverso, esquinas.

**Regla de orden de clases Tailwind:** respetar el orden obligatorio del proyecto (sizing → layout → position → backgrounds → borders → typography → effects → interactivity → overflow → spacing). Estados (`hover:`, etc.) pegados a su propiedad base.

---

### Task 1: Rediseñar los 4 símbolos de palos

**Files:**
- Modify: `app/components/minigames/CardsGame.vue:187-205`

Reemplazar el bloque `<svg width="0" height="0">...</svg>` actual (solo los 4 `<symbol>` de palos por ahora; las figuras se agregan en Task 2) por versiones más detalladas. Todas monocromo con `currentColor` para heredar el color cálido/frío, `viewBox="0 0 24 24"`, legibles a 14px y nítidas a 36px.

- [ ] **Step 1: Reemplazar los 4 `<symbol>` de palos**

En `CardsGame.vue`, reemplazar el contenido entre `<svg width="0" height="0" class="absolute" aria-hidden="true">` y su `</svg>` por estos 4 símbolos (las figuras se suman en Task 2 dentro del mismo `<svg>`):

```html
    <!-- Sprite SVG: palos + figuras (definido una vez, lo usan todas las NaipeCard) -->
    <svg width="0" height="0" class="absolute" aria-hidden="true">
      <!-- ORO: moneda con anillo de relieve y sol estilizado -->
      <symbol id="palo-oro" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="1.4" />
        <circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.7" />
        <circle cx="12" cy="12" r="2.4" fill="currentColor" />
        <g stroke="currentColor" stroke-width="1.1" stroke-linecap="round">
          <path d="M12 4.5v2.2M12 17.3v2.2M4.5 12h2.2M17.3 12h2.2" />
          <path d="M6.7 6.7l1.5 1.5M15.8 15.8l1.5 1.5M17.3 6.7l-1.5 1.5M8.2 15.8l-1.5 1.5" opacity="0.7" />
        </g>
      </symbol>
      <!-- COPA: cáliz barroco con boca, nudo, pie y base -->
      <symbol id="palo-copa" viewBox="0 0 24 24">
        <path d="M5.5 4h13c0 4.5-2 7-4.3 7.8l0 4.2c1.8.2 3 .7 3 1.5H6.8c0-.8 1.2-1.3 3-1.5l0-4.2C7.5 11 5.5 8.5 5.5 4z" fill="currentColor" />
        <rect x="6" y="19.2" width="12" height="1.8" rx="0.9" fill="currentColor" />
        <circle cx="12" cy="11.4" r="1.1" fill="none" stroke="currentColor" stroke-width="0.8" opacity="0.5" />
      </symbol>
      <!-- ESPADA: hoja recta con empuñadura y guarda cruzada -->
      <symbol id="palo-espada" viewBox="0 0 24 24">
        <path d="M12 2.2l1.4 12.3h-2.8L12 2.2z" fill="currentColor" />
        <rect x="7.5" y="14.6" width="9" height="2" rx="0.8" fill="currentColor" />
        <rect x="11" y="16.8" width="2" height="3.4" fill="currentColor" />
        <circle cx="12" cy="21" r="1.6" fill="none" stroke="currentColor" stroke-width="1.4" />
      </symbol>
      <!-- BASTO: garrote nudoso -->
      <symbol id="palo-basto" viewBox="0 0 24 24">
        <path d="M10.6 21l1-13.5h0.8l1 13.5z" fill="currentColor" />
        <path d="M12 2.3c2.1 0 3.4 1.4 3.4 3.1 0 1.4-1 2.3-1 2.3s1.2.3 1.2 1.6c0 1.3-1.3 2.1-2.7 2.1M12 2.3c-2.1 0-3.4 1.4-3.4 3.1 0 1.4 1 2.3 1 2.3s-1.2.3-1.2 1.6c0 1.3 1.3 2.1 2.7 2.1" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        <circle cx="9.2" cy="13.5" r="0.9" fill="currentColor" opacity="0.8" />
        <circle cx="14.8" cy="15.5" r="0.8" fill="currentColor" opacity="0.8" />
      </symbol>
```

(Cerrar el `</svg>` queda pendiente hasta agregar las figuras en Task 2. Si se ejecuta Task 1 sola y se quiere buildear, cerrar el `</svg>` provisionalmente acá y reabrir en Task 2.)

- [ ] **Step 2: Cerrar el `<svg>` provisionalmente para poder buildear**

Agregar `</svg>` después del símbolo `palo-basto` (se reabrirá en Task 2).

- [ ] **Step 3: Verificar build**

Run: `npx nuxt build`
Expected: build OK sin errores.

- [ ] **Step 4: Validación visual del usuario**

El usuario abre la pulpería en su dev server y confirma que los 4 palos se reconocen en esquina (chico) y centro (grande), en cálido (oro/copa) y frío (espada/basto).

---

### Task 2: Agregar símbolos de figuras (Sota / Caballo / Rey)

**Files:**
- Modify: `app/components/minigames/CardsGame.vue` (mismo `<svg>` sprite de Task 1)

Tres siluetas planas, monocromo `currentColor`, una por figura (no por palo). `viewBox="0 0 24 24"`.

- [ ] **Step 1: Quitar el `</svg>` provisional y agregar las 3 figuras antes del cierre**

Dentro del mismo `<svg>` sprite, después de `palo-basto`, agregar:

```html
      <!-- SOTA: paje de pie -->
      <symbol id="figura-sota" viewBox="0 0 24 24">
        <circle cx="12" cy="6" r="3" fill="currentColor" />
        <path d="M7 9c1-0.6 3-1 5-1s4 .4 5 1l-1 2 2 1-1.5 1.2.5 7.6H7.5l.5-7.6L6.5 12l2-1L7 9z" fill="currentColor" />
        <path d="M9 8.5c.8-1.2 4.2-1.2 5 0" fill="none" stroke="currentColor" stroke-width="0.8" opacity="0.5" />
      </symbol>
      <!-- CABALLO: jinete sobre caballo -->
      <symbol id="figura-caballo" viewBox="0 0 24 24">
        <path d="M4 18c0-4 2.5-7 6-7l3-1 2-2 1 1-1 2c2 .5 3.5 2.5 3.5 5v3h-2.5l-.5-3-2 1 .5 2h-2l-.5-2H8l-.5 2H5l.5-2.5C5 18.4 4.4 18 4 18z" fill="currentColor" />
        <circle cx="13" cy="4.5" r="2" fill="currentColor" />
        <path d="M11.5 6.5l3 2-1 2-2.5-1.5z" fill="currentColor" />
      </symbol>
      <!-- REY: busto con corona -->
      <symbol id="figura-rey" viewBox="0 0 24 24">
        <path d="M7 6l1.5 2L12 5l3.5 3L17 6l-.5 4h-9L7 6z" fill="currentColor" />
        <circle cx="12" cy="13" r="3" fill="currentColor" />
        <path d="M6.5 21c0-3 2.5-5 5.5-5s5.5 2 5.5 5z" fill="currentColor" />
        <circle cx="7" cy="6" r="1" fill="currentColor" />
        <circle cx="12" cy="4.6" r="1" fill="currentColor" />
        <circle cx="17" cy="6" r="1" fill="currentColor" />
      </symbol>
    </svg>
```

- [ ] **Step 2: Verificar build**

Run: `npx nuxt build`
Expected: build OK. (Las figuras aún no se usan en NaipeCard — se conectan en Task 4. Acá solo se verifica que el SVG es válido.)

---

### Task 3: Rediseñar el frente de cartas numéricas (1-9) + marco + papel

**Files:**
- Modify: `app/components/minigames/NaipeCard.vue`

Reescribir el bloque FRENTE para: papel envejecido con textura, marco doble español, palo grande al centro, esquinas con número + palo (como hoy pero afinado). Las figuras 10/11/12 se manejan en Task 4 (acá las numéricas y la estructura común).

- [ ] **Step 1: Agregar computed para distinguir figura de numérica**

En el `<script setup>` de `NaipeCard.vue`, después del computed `calido`, agregar:

```js
// 10/11/12 son figuras (Sota/Caballo/Rey); 1-9 son numéricas.
const esFigura = computed(() => props.carta && props.carta.numero >= 10)
const indice = computed(() => {
  if (!props.carta) return ''
  const n = props.carta.numero
  return n === 10 ? 'S' : n === 11 ? 'C' : n === 12 ? 'R' : String(n)
})
const figuraId = computed(() => {
  const n = props.carta?.numero
  return n === 10 ? 'figura-sota' : n === 11 ? 'figura-caballo' : n === 12 ? 'figura-rey' : null
})
```

- [ ] **Step 2: Reescribir el bloque FRENTE (estructura común + numéricas)**

Reemplazar el `<div v-else ...>` del FRENTE (líneas ~45-72) por esta versión. El centro usa `v-if="!esFigura"` para el palo grande (las figuras se agregan en Task 4 con el `v-else`):

```html
    <!-- FRENTE -->
    <div
      v-else
      class="w-full h-full flex flex-col justify-between carta-papel border-2 rounded-lg px-2 py-1.5"
      :class="estado === 'ganadora' ? 'border-ganancia shadow-farol-lg ring-2 ring-ganancia' : 'border-[#b08a3e]/60 shadow-farol'"
    >
      <!-- Marco interior español -->
      <div class="w-full h-full flex flex-col justify-between border border-[#b08a3e]/40 rounded-md p-1">
        <!-- Esquina superior izquierda -->
        <div class="flex flex-col items-center self-start leading-none">
          <span class="font-display text-lg" :class="calido ? 'text-brasa' : 'text-noche'">{{ indice }}</span>
          <svg viewBox="0 0 24 24" class="w-3.5 h-3.5" :class="calido ? 'text-brasa' : 'text-noche/80'">
            <use :href="`#palo-${carta.palo}`" />
          </svg>
        </div>

        <!-- Centro: palo grande (numéricas). Figuras en Task 4. -->
        <svg v-if="!esFigura" viewBox="0 0 24 24" class="w-9 h-9 self-center" :class="calido ? 'text-ascua' : 'text-noche'">
          <use :href="`#palo-${carta.palo}`" />
        </svg>

        <!-- Esquina inferior derecha (espejada) -->
        <div class="flex flex-col items-center self-end rotate-180 leading-none">
          <span class="font-display text-lg" :class="calido ? 'text-brasa' : 'text-noche'">{{ indice }}</span>
          <svg viewBox="0 0 24 24" class="w-3.5 h-3.5" :class="calido ? 'text-brasa' : 'text-noche/80'">
            <use :href="`#palo-${carta.palo}`" />
          </svg>
        </div>
      </div>
    </div>
```

- [ ] **Step 3: Agregar el estilo de papel envejecido**

En el `<style scoped>` de `NaipeCard.vue`, agregar (junto al `.reverso-patron` existente):

```css
/* Papel crema con vetas/manchas sutiles (sin imágenes) */
.carta-papel {
  background-color: #f2e9cf;
  background-image:
    radial-gradient(ellipse at 30% 20%, rgba(160, 120, 60, 0.10), transparent 55%),
    radial-gradient(ellipse at 75% 80%, rgba(120, 80, 40, 0.10), transparent 50%),
    linear-gradient(135deg, #f6efdc, #e6d8b8);
}
```

- [ ] **Step 4: Verificar build**

Run: `npx nuxt build`
Expected: build OK.

- [ ] **Step 5: Validación visual del usuario**

El usuario confirma: numéricas con palo grande centrado, papel con textura sutil, marco doble, esquinas legibles. Las 10/11/12 por ahora muestran S/C/R en esquina y centro vacío (se completa en Task 4) — confirmar que no rompe layout.

---

### Task 4: Conectar las figuras (10/11/12) al centro del frente

**Files:**
- Modify: `app/components/minigames/NaipeCard.vue`

- [ ] **Step 1: Agregar el centro de figuras junto al palo grande**

En el bloque FRENTE (Task 3 Step 2), justo después del `<svg v-if="!esFigura" ...>` del centro, agregar el `v-else` con la figura + palo chico al lado:

```html
        <!-- Centro: figura ilustrada (Sota/Caballo/Rey) con su palo al lado -->
        <div v-else class="flex justify-center items-center gap-0.5 self-center">
          <svg viewBox="0 0 24 24" class="w-10 h-10" :class="calido ? 'text-ascua' : 'text-noche'">
            <use :href="`#${figuraId}`" />
          </svg>
          <svg viewBox="0 0 24 24" class="w-4 h-4 self-end" :class="calido ? 'text-brasa' : 'text-noche/80'">
            <use :href="`#palo-${carta.palo}`" />
          </svg>
        </div>
```

- [ ] **Step 2: Verificar build**

Run: `npx nuxt build`
Expected: build OK.

- [ ] **Step 3: Validación visual del usuario**

El usuario confirma que las 4 sotas, 4 caballos y 4 reyes muestran su silueta + inicial S/C/R + palo, en cálido y frío.

---

### Task 5: Rediseñar el reverso

**Files:**
- Modify: `app/components/minigames/NaipeCard.vue`

- [ ] **Step 1: Reescribir el bloque REVERSO**

Reemplazar el `<div v-if="tapada || !carta" ...>` del REVERSO (líneas ~28-42) por esta versión con marco doble + emblema central (sol estilizado, coherente con la estética farol):

```html
    <!-- REVERSO -->
    <div
      v-if="tapada || !carta"
      class="w-full h-full bg-gradient-to-br from-[#5b2f1a] to-[#3a1c10] border-2 border-dorado/70 rounded-lg overflow-hidden p-1"
      :class="[
        estado === 'ganadora' ? 'shadow-farol-lg ring-2 ring-ganancia' : 'shadow-lg',
        seleccionable ? 'hover:border-dorado hover:shadow-farol' : ''
      ]"
    >
      <div class="w-full h-full flex justify-center items-center reverso-patron border border-dorado/40 rounded">
        <!-- Emblema central: sol estilizado -->
        <svg viewBox="0 0 24 24" class="w-11 h-11 text-dorado/85">
          <circle cx="12" cy="12" r="4" fill="currentColor" />
          <g stroke="currentColor" stroke-width="1.3" stroke-linecap="round">
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
            <path d="M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" opacity="0.8" />
          </g>
        </svg>
      </div>
    </div>
```

- [ ] **Step 2: Afinar el patrón del reverso (filigrana más fina)**

En `<style scoped>`, reemplazar la regla `.reverso-patron` actual por una más fina:

```css
/* Filigrana de rombos del reverso */
.reverso-patron {
  background-image:
    repeating-linear-gradient(45deg, rgba(255, 178, 77, 0.18) 0 4px, transparent 4px 9px),
    repeating-linear-gradient(-45deg, rgba(255, 178, 77, 0.18) 0 4px, transparent 4px 9px);
}
```

- [ ] **Step 3: Verificar build**

Run: `npx nuxt build`
Expected: build OK.

- [ ] **Step 4: Validación visual del usuario**

El usuario confirma reverso con emblema + filigrana, y que el **flip reverso→frente** sigue sin parpadeo ni desfase de caja (el cambio de cara es por `v-if="tapada"`, que no se tocó).

---

### Task 6: Revisión final integral

**Files:** ninguno (solo verificación).

- [ ] **Step 1: Build final**

Run: `npx nuxt build`
Expected: build OK.

- [ ] **Step 2: Checklist visual completo (usuario)**

Jugar una partida completa de naipes y confirmar:
- [ ] Las 4 pintas se reconocen en esquina y centro.
- [ ] 10/11/12 = figura + inicial S/C/R (nunca el número crudo).
- [ ] Estados: ganadora (glow + ring verde + sube), perdedora (atenuada), seleccionable (hover), seleccionada (sube) se ven bien.
- [ ] Flip y viaje de cartas sin glitches.
- [ ] Coherencia estética con el resto del juego (farol/dorado/madera).

---

## Self-review (cobertura del spec)

- Papel envejecido + textura → Task 3 (Step 3).
- Marco doble español → Task 3 (Step 2, borde exterior + interior).
- Palo grande al centro (numéricas) → Task 3 (Step 2).
- Palos rediseñados (oro/copa/espada/basto) → Task 1.
- Figuras 10/11/12 ilustradas + inicial S/C/R → Task 2 (símbolos) + Task 3 (índice en esquinas) + Task 4 (centro).
- Color cálido/frío conservado → todas las tareas usan el computed `calido` existente.
- Reverso mejorado + emblema → Task 5.
- Estados conservados → Task 3/5 mantienen las clases; Task 6 los verifica.
- Props/animaciones intactas → no se tocan; el flip depende de `v-if="tapada"`, conservado.
- Sin assets, todo CSS/SVG → confirmado en todas las tareas.
