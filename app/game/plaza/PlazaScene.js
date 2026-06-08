// Render del hub (canvas, sin Vue). Fondo = plaza.png; los edificios son zonas
// POLIGONALES normalizadas (0-1) que siguen la forma isométrica de cada edificio.
// El jugador camina libre pero no atraviesa edificios ni muros (resbala).
// Click o caminar hasta la puerta = entrar.
//
// Editores:
//   E = zonas de edificio (vértices, mover, puerta)
//   M = muros no caminables (clic agrega vértice, Enter cierra polígono)

import { drawPlayer, dirDesdeVector } from '~/game/render/drawPlayer'
import { drawNpc } from '~/game/render/drawNpc'
import { SistemaParticulas } from '~/game/render/particles'
import { NPCS_PLAZA, NPCS_INTERIOR, npcEnPunto, npcCercaDe, RADIO_CERCA_NPC, RADIO_CHOQUE_NPC } from '~/game/npc/npcs'
import { useAudio } from '~/composables/useAudio'
import {
  EDIFICIOS, ZONA_CAMINABLE, CAMINOS, POS_INICIAL_JUGADOR,
  edificioEnPunto, edificioEnPuerta, puntoEnPoligono, esBloqueado,
  claveCamino, caminoEntre, puntoMasCercanoEnRed
} from './buildings'

const ANCHO = 1440
const ALTO = 800

const VEL = 0.32
const UMBRAL_LLEGADA = 0.012
const HANDLE = 11
const RADIO_PUERTA = 0.045 // distancia a la puerta para entrar
// Al reaparecer en la puerta, hay que alejarse esta poca distancia para que la
// gracia se libere y se pueda volver a entrar (chico = entrás de nuevo enseguida).
const SALIDA_GRACIA = 0.06
// Radio para detectar un clic sobre el cuerpo de un NPC (mayor que el de choque).
const RADIO_CUERPO_CLIC = 0.03

export class PlazaRenderer {
  constructor(canvas, config) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.config = config

    this.pos = { ...POS_INICIAL_JUGADOR }
    this.dir = 'abajo'
    this.target = null
    this.cola = [] // waypoints pendientes hacia el destino (el último puede ser una puerta)
    this.ultimoEdif = 'inicio' // edificio del que salió (origen para los caminos)
    this.graciaPuerta = null // id del edificio del que se acaba de salir (no re-entrar)
    this.frameCaminata = 0
    this.tiempoFrame = 0
    this.caminando = false
    this.tiempoEstancado = 0 // tiempo navegando sin avanzar (anti-traba)
    this.posPrevia = { ...this.pos }

    this.fondoImg = null
    this.cargarFondo('/assets/plaza.png')

    this.particulas = new SistemaParticulas()
    this.tiempo = 0

    this.edificioHover = null

    this.editor = false // editor de zonas de edificio
    this.agarre = null

    this.editorCaminable = false // editor de la zona caminable
    this.agarreCaminable = null // índice del vértice arrastrado

    this.editorCaminos = false // editor de caminos (W)
    this.camOrigen = 'inicio' // par activo del editor de caminos
    this.camDestino = null
    this.agarreNodo = -1 // índice del nodo arrastrado en el camino activo

    this.editorNpcs = false // editor de NPCs (N): arrastrar próceres/ciudadano
    this.agarreNpc = null // NPC arrastrado en el editor

    this.npcs = NPCS_PLAZA
    this.npcCerca = null // NPC dentro del radio de cercanía (para el prompt "E")
    this.indiceDialogo = {} // id NPC → línea actual (rota al hablar)

    this.onEntrar = null

    // --- Cinemática (victoria/derrota) ---
    this.modoCinematico = false
    this.cineNpcs = [] // NPCs temporales que aparecen solo en la cinemática
    this.cinePlayerRot = 0 // rotación del player (caída en derrota), radianes
    this.cinePlayerAlpha = 1 // opacidad del player (reservado)
    this.fogonazo = null // { x, y, vida } destello del disparo en coords px
    this.onHablar = null // callback: el player llegó caminando a un NPC → abrir diálogo
    this.npcDestino = null // NPC al que el player camina (clic en NPC lejano)
  }

  cargarFondo(src) {
    const img = new Image()
    img.onload = () => { this.fondoImg = img }
    img.onerror = () => { this.fondoImg = null }
    img.src = src
  }

  toggleEditor() {
    this.editor = !this.editor
    this.editorCaminable = false
    this.editorCaminos = false
    this.editorNpcs = false
    this.agarre = null
  }

  toggleEditorCaminable() {
    this.editorCaminable = !this.editorCaminable
    this.editor = false
    this.editorCaminos = false
    this.editorNpcs = false
    this.agarreCaminable = null
  }

  toggleEditorCaminos() {
    this.editorCaminos = !this.editorCaminos
    this.editor = false
    this.editorCaminable = false
    this.editorNpcs = false
    this.agarreNodo = -1
  }

  toggleEditorNpcs() {
    this.editorNpcs = !this.editorNpcs
    this.editor = false
    this.editorCaminable = false
    this.editorCaminos = false
    this.agarreNpc = null
  }

  // Selecciona el par origen→destino que se está editando.
  setPar(origen, destino) {
    this.camOrigen = origen
    this.camDestino = destino
    this.agarreNodo = -1
  }

  // El array de nodos del camino activo (lo crea si no existe).
  caminoActivo() {
    if (!this.camDestino) return null
    const k = claveCamino(this.camOrigen, this.camDestino)
    if (!CAMINOS[k]) CAMINOS[k] = []
    return CAMINOS[k]
  }

  get enEditor() {
    return this.editor || this.editorCaminable || this.editorCaminos || this.editorNpcs
  }

  // --- INPUT de juego ---

  clickEn(sx, sy) {
    if (this.enEditor) return
    const p = this.aNorm(sx, sy)
    const edif = edificioEnPunto(p.x, p.y)
    if (edif && edif.escena) {
      this.navegarAEdificio(edif)
      return
    }
    // Clic en piso libre: ir directo (sin camino), si es caminable.
    if (!esBloqueado(p.x, p.y)) {
      this.cola = []
      this.target = p
    }
  }

  // Navega hacia un edificio siguiendo el camino origen→destino si existe.
  // Si el jugador está lejos de la red de caminos (caminó libre con WASD), primero
  // se "sube" al punto más cercano de la red para no cruzar edificios en recta.
  navegarAEdificio(edif) {
    this.cola = []
    // Subirse a la red si estoy lejos de ella.
    const enRed = puntoMasCercanoEnRed(this.pos)
    if (enRed && dist(this.pos.x, this.pos.y, enRed.x, enRed.y) > 0.03) {
      this.cola.push({ x: enRed.x, y: enRed.y })
    }
    const ruta = caminoEntre(this.ultimoEdif, edif.id)
    for (const n of ruta) this.cola.push({ x: n.x, y: n.y })
    this.cola.push({ ...edif.puerta, edificio: edif })
    this.target = this.cola.shift()
  }

  moverMouse(sx, sy) {
    if (this.enEditor) return
    const p = this.aNorm(sx, sy)
    this.edificioHover = edificioEnPunto(p.x, p.y)
  }

  // Clic sobre un NPC: si está cerca, habla ya; si está lejos, camina hasta él y
  // habla al llegar. Devuelve el diálogo si habla en el acto, o null si va a caminar.
  clickNpc(sx, sy) {
    if (this.enEditor || this.modoCinematico) return null
    const p = this.aNorm(sx, sy)
    // ¿Clic sobre el cuerpo de un NPC? (radio de cuerpo, no de cercanía)
    let elegido = null
    let mejorD = RADIO_CUERPO_CLIC
    for (const n of this.npcs) {
      const d = Math.hypot(p.x - n.pos.x, p.y - n.pos.y)
      if (d < mejorD) { mejorD = d; elegido = n }
    }
    if (!elegido) return null
    // Si ya estoy cerca, hablo al toque.
    if (Math.hypot(this.pos.x - elegido.pos.x, this.pos.y - elegido.pos.y) < RADIO_CERCA_NPC) {
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

  // Devuelve { nombre, texto } del NPC cercano y avanza su línea, o null.
  hablarConCerca() {
    if (this.enEditor || !this.npcCerca) return null
    return this.hablar(this.npcCerca)
  }

  hablar(n) {
    const i = this.indiceDialogo[n.id] || 0
    const texto = n.dialogos[i % n.dialogos.length]
    this.indiceDialogo[n.id] = i + 1
    return { nombre: n.nombre, texto }
  }

  aNorm(sx, sy) {
    return { x: sx / ANCHO, y: sy / ALTO }
  }

  // Carteles a mostrar (edificios con cartel). disponible=false → sin minijuego aún.
  carteles() {
    return EDIFICIOS.filter((e) => e.cartel).map((e) => ({
      id: e.id, nombre: e.nombre, x: e.cartel.x, y: e.cartel.y, disponible: !!e.escena
    }))
  }

  // Clic en un cartel: navegar hacia la puerta de ese edificio y entrar.
  irYEntrar(id) {
    if (this.enEditor) return
    const e = EDIFICIOS.find((x) => x.id === id)
    if (e && e.escena) this.navegarAEdificio(e)
  }

  // --- EDITOR DE ZONAS (E) ---

  empezarArrastre(sx, sy) {
    if (!this.editor) return false
    const p = this.aNorm(sx, sy)
    const umbral = HANDLE / ANCHO + 0.005

    for (const e of EDIFICIOS) {
      if (e.cartel && dist(p.x, p.y, e.cartel.x, e.cartel.y) < umbral) {
        this.agarre = { edif: e, tipo: 'cartel', offX: p.x - e.cartel.x, offY: p.y - e.cartel.y }
        return true
      }
    }
    for (const e of EDIFICIOS) {
      if (dist(p.x, p.y, e.puerta.x, e.puerta.y) < umbral) {
        this.agarre = { edif: e, tipo: 'puerta', offX: p.x - e.puerta.x, offY: p.y - e.puerta.y }
        return true
      }
    }
    for (const e of EDIFICIOS) {
      for (let i = 0; i < e.zona.length; i++) {
        if (dist(p.x, p.y, e.zona[i].x, e.zona[i].y) < umbral) {
          this.agarre = { edif: e, tipo: 'vertice', idx: i }
          return true
        }
      }
    }
    for (const e of EDIFICIOS) {
      if (puntoEnPoligono(p.x, p.y, e.zona)) {
        this.agarre = { edif: e, tipo: 'mover', ultX: p.x, ultY: p.y }
        return true
      }
    }
    return false
  }

  arrastrar(sx, sy) {
    if (!this.agarre) return
    const p = this.aNorm(sx, sy)
    const { edif, tipo } = this.agarre

    if (tipo === 'cartel') {
      edif.cartel.x = clamp(p.x - this.agarre.offX, 0, 1)
      edif.cartel.y = clamp(p.y - this.agarre.offY, 0, 1)
    } else if (tipo === 'puerta') {
      edif.puerta.x = clamp(p.x - this.agarre.offX, 0, 1)
      edif.puerta.y = clamp(p.y - this.agarre.offY, 0, 1)
    } else if (tipo === 'vertice') {
      edif.zona[this.agarre.idx].x = clamp(p.x, 0, 1)
      edif.zona[this.agarre.idx].y = clamp(p.y, 0, 1)
    } else if (tipo === 'mover') {
      const dx = p.x - this.agarre.ultX
      const dy = p.y - this.agarre.ultY
      for (const v of edif.zona) { v.x = clamp(v.x + dx, 0, 1); v.y = clamp(v.y + dy, 0, 1) }
      edif.puerta.x = clamp(edif.puerta.x + dx, 0, 1)
      edif.puerta.y = clamp(edif.puerta.y + dy, 0, 1)
      if (edif.cartel) {
        edif.cartel.x = clamp(edif.cartel.x + dx, 0, 1)
        edif.cartel.y = clamp(edif.cartel.y + dy, 0, 1)
      }
      this.agarre.ultX = p.x
      this.agarre.ultY = p.y
    }
  }

  terminarArrastre() {
    this.agarre = null
  }

  agregarVertice(sx, sy) {
    if (!this.editor) return
    const p = this.aNorm(sx, sy)
    for (const e of EDIFICIOS) {
      if (!puntoEnPoligono(p.x, p.y, e.zona)) continue
      let mejorI = 0
      let mejorD = Infinity
      for (let i = 0, j = e.zona.length - 1; i < e.zona.length; j = i++) {
        const d = distASegmento(p, e.zona[j], e.zona[i])
        if (d < mejorD) { mejorD = d; mejorI = i }
      }
      e.zona.splice(mejorI, 0, { x: p.x, y: p.y })
      return
    }
  }

  borrarVertice(sx, sy) {
    if (!this.editor) return
    const p = this.aNorm(sx, sy)
    const umbral = HANDLE / ANCHO + 0.005
    for (const e of EDIFICIOS) {
      if (e.zona.length <= 3) continue
      for (let i = 0; i < e.zona.length; i++) {
        if (dist(p.x, p.y, e.zona[i].x, e.zona[i].y) < umbral) {
          e.zona.splice(i, 1)
          return
        }
      }
    }
  }

  exportarZonas() {
    const r = (n) => Math.round(n * 1000) / 1000
    return EDIFICIOS.map((e) => ({
      id: e.id,
      zona: e.zona.map((v) => ({ x: r(v.x), y: r(v.y) })),
      puerta: { x: r(e.puerta.x), y: r(e.puerta.y) },
      ...(e.cartel ? { cartel: { x: r(e.cartel.x), y: r(e.cartel.y) } } : {})
    }))
  }

  // --- EDITOR DE ZONA CAMINABLE (M) ---
  // Edita el polígono ZONA_CAMINABLE: arrastrar vértices, doble-clic agrega
  // un punto en el borde, clic derecho borra un punto.

  caminableEmpezarArrastre(sx, sy) {
    if (!this.editorCaminable) return false
    const p = this.aNorm(sx, sy)
    const umbral = HANDLE / ANCHO + 0.006
    for (let i = 0; i < ZONA_CAMINABLE.length; i++) {
      if (dist(p.x, p.y, ZONA_CAMINABLE[i].x, ZONA_CAMINABLE[i].y) < umbral) {
        this.agarreCaminable = i
        return true
      }
    }
    return false
  }

  caminableArrastrar(sx, sy) {
    if (this.agarreCaminable == null) return
    const p = this.aNorm(sx, sy)
    ZONA_CAMINABLE[this.agarreCaminable].x = clamp(p.x, 0, 1)
    ZONA_CAMINABLE[this.agarreCaminable].y = clamp(p.y, 0, 1)
  }

  caminableTerminarArrastre() {
    this.agarreCaminable = null
  }

  // Doble-clic: agrega un vértice en el borde más cercano.
  caminableAgregar(sx, sy) {
    if (!this.editorCaminable) return
    const p = this.aNorm(sx, sy)
    let mejorI = 0
    let mejorD = Infinity
    for (let i = 0, j = ZONA_CAMINABLE.length - 1; i < ZONA_CAMINABLE.length; j = i++) {
      const d = distASegmento(p, ZONA_CAMINABLE[j], ZONA_CAMINABLE[i])
      if (d < mejorD) { mejorD = d; mejorI = i }
    }
    ZONA_CAMINABLE.splice(mejorI, 0, { x: p.x, y: p.y })
  }

  // Clic derecho: borra el vértice bajo el cursor (mín 3).
  caminableBorrar(sx, sy) {
    if (!this.editorCaminable || ZONA_CAMINABLE.length <= 3) return
    const p = this.aNorm(sx, sy)
    const umbral = HANDLE / ANCHO + 0.006
    for (let i = 0; i < ZONA_CAMINABLE.length; i++) {
      if (dist(p.x, p.y, ZONA_CAMINABLE[i].x, ZONA_CAMINABLE[i].y) < umbral) {
        ZONA_CAMINABLE.splice(i, 1)
        return
      }
    }
  }

  exportarCaminable() {
    const r = (n) => Math.round(n * 1000) / 1000
    return ZONA_CAMINABLE.map((v) => ({ x: r(v.x), y: r(v.y) }))
  }

  // --- EDITOR DE CAMINOS (W) ---
  // Elegís un par origen→destino (setPar) y vas marcando nodos del camino con clic.
  // Arrastrar mueve un nodo. Clic derecho lo borra.

  // Índice del nodo del camino activo bajo el punto, o -1.
  nodoEn(p) {
    const camino = this.caminoActivo()
    if (!camino) return -1
    const umbral = HANDLE / ANCHO + 0.008
    for (let i = 0; i < camino.length; i++) {
      if (dist(p.x, p.y, camino[i].x, camino[i].y) < umbral) return i
    }
    return -1
  }

  caminosEmpezar(sx, sy) {
    if (!this.editorCaminos || !this.camDestino) return false
    const p = this.aNorm(sx, sy)
    const i = this.nodoEn(p)
    if (i >= 0) { this.agarreNodo = i; return true } // agarra para arrastrar
    // Clic en vacío: agrega un nodo al final del camino.
    this.caminoActivo().push({ x: p.x, y: p.y })
    this.agarreNodo = this.caminoActivo().length - 1
    return true
  }

  caminosArrastrar(sx, sy) {
    if (this.agarreNodo < 0) return
    const camino = this.caminoActivo()
    if (!camino) return
    const p = this.aNorm(sx, sy)
    camino[this.agarreNodo].x = clamp(p.x, 0, 1)
    camino[this.agarreNodo].y = clamp(p.y, 0, 1)
  }

  caminosTerminar() {
    this.agarreNodo = -1
  }

  caminosBorrar(sx, sy) {
    if (!this.editorCaminos || !this.camDestino) return
    const p = this.aNorm(sx, sy)
    const i = this.nodoEn(p)
    if (i >= 0) this.caminoActivo().splice(i, 1)
  }

  // Exporta todos los caminos definidos (objeto clave → nodos).
  exportarCaminos() {
    const r = (n) => Math.round(n * 1000) / 1000
    const out = {}
    for (const [k, nodos] of Object.entries(CAMINOS)) {
      if (nodos.length) out[k] = nodos.map((n) => ({ x: r(n.x), y: r(n.y) }))
    }
    return out
  }

  // --- UPDATE ---
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

    let movX = 0
    let movY = 0
    const paso = VEL * delta

    if (vectorTeclado && (vectorTeclado.x !== 0 || vectorTeclado.y !== 0)) {
      this.target = null
      this.cola = []
      movX = vectorTeclado.x * paso
      movY = vectorTeclado.y * paso
      this.dir = dirDesdeVector(vectorTeclado.x, vectorTeclado.y)
    } else if (this.target) {
      const dx = this.target.x - this.pos.x
      const dy = this.target.y - this.pos.y
      const d = Math.hypot(dx, dy)
      if (d < UMBRAL_LLEGADA) {
        this.llegarATarget()
      } else {
        movX = (dx / d) * paso
        movY = (dy / d) * paso
        this.dir = dirDesdeVector(dx, dy)
      }
    }

    // Entrar por puerta antes de aplicar colisión (la puerta es un hueco en el muro).
    if (movX !== 0 || movY !== 0) {
      const e = edificioEnPuerta(this.pos.x, this.pos.y, RADIO_PUERTA)
      // Gracia: no re-entrar al edificio del que se acaba de salir hasta alejarse.
      if (e && e.id === this.graciaPuerta) {
        // sigue caminando sin entrar
      } else if (e && e.escena && this.onEntrar) {
        this.onEntrar(e)
        return
      }
    }

    // Levantar la gracia ni bien el jugador se aleja un poco de la puerta de la que
    // salió (distancia chica = puede volver a entrar enseguida, sin caminar de más).
    if (this.graciaPuerta) {
      const eg = EDIFICIOS.find((x) => x.id === this.graciaPuerta)
      if (!eg || dist(this.pos.x, this.pos.y, eg.puerta.x, eg.puerta.y) > SALIDA_GRACIA) {
        this.graciaPuerta = null
      }
    }

    this.aplicarMovimientoConColision(movX, movY)

    // Anti-traba: si está navegando (target) pero no avanza (chocando una pared),
    // acumula tiempo estancado y abandona la ruta para no quedarse empujando.
    if (this.target && (movX !== 0 || movY !== 0)) {
      const avance = dist(this.pos.x, this.pos.y, this.posPrevia.x, this.posPrevia.y)
      if (avance < paso * 0.25) {
        this.tiempoEstancado += delta
        if (this.tiempoEstancado > 0.4) {
          this.target = null
          this.cola = []
          this.tiempoEstancado = 0
        }
      } else {
        this.tiempoEstancado = 0
      }
    } else {
      this.tiempoEstancado = 0
    }
    this.posPrevia = { ...this.pos }

    this.caminando = movX !== 0 || movY !== 0
    if (this.caminando) {
      this.tiempoFrame += delta
      if (this.tiempoFrame > 0.18) {
        this.frameCaminata = (this.frameCaminata + 1) % 2
        this.tiempoFrame = 0
      }
    } else {
      this.frameCaminata = 0
    }

    this.npcCerca = npcCercaDe(this.pos.x, this.pos.y, this.npcsEfectivos())

    this.actualizarCorrerNpcs(delta)

    this.tiempo += delta
    this.particulas.update(delta)
  }

  // NPC con su posición efectiva (base + desplazamiento por "correrse"). No muta el
  // catálogo: el offset vive en despX/despY del propio objeto NPC.
  npcsEfectivos() {
    return this.npcs.map((n) => ({
      ...n,
      pos: { x: n.pos.x + (n.despX || 0), y: n.pos.y + (n.despY || 0) }
    }))
  }

  // Cuando el player navega (target activo) hacia un destino y un NPC le tapa el
  // paso, el NPC se corre al costado (perpendicular al avance del player). Cuando el
  // player ya no lo pisa, vuelve suave a su lugar. Caminando libre con WASD NO se
  // corre (ahí el NPC te frena para que puedas hablarle).
  actualizarCorrerNpcs(delta) {
    const navegando = !!this.target
    const RADIO_CORRER = RADIO_CHOQUE_NPC + 0.02 // un poco antes de chocar
    const DESP_MAX = 0.05 // cuánto se hace a un lado
    for (const n of this.npcs) {
      let objX = 0, objY = 0
      if (navegando) {
        const d = dist(this.pos.x, this.pos.y, n.pos.x, n.pos.y)
        if (d < RADIO_CORRER) {
          // Perpendicular a la dirección player→NPC, hacia el lado más libre.
          const dx = n.pos.x - this.pos.x
          const dy = n.pos.y - this.pos.y
          const len = Math.hypot(dx, dy) || 1
          // Vector perpendicular (gira 90°): (-dy, dx) normalizado.
          objX = (-dy / len) * DESP_MAX
          objY = (dx / len) * DESP_MAX
        }
      }
      // Interpolar el offset actual hacia el objetivo (entra rápido, vuelve suave).
      const vel = (objX !== 0 || objY !== 0) ? 8 : 4
      n.despX = (n.despX || 0) + (objX - (n.despX || 0)) * Math.min(1, vel * delta)
      n.despY = (n.despY || 0) + (objY - (n.despY || 0)) * Math.min(1, vel * delta)
    }
  }

  // Mueve en X e Y por separado: si un eje choca (muro o NPC), resbala por el otro.
  // Usa las posiciones efectivas de los NPCs (ya corridos) para la colisión.
  aplicarMovimientoConColision(movX, movY) {
    const npcs = this.npcsEfectivos()
    const nx = clamp(this.pos.x + movX, 0.02, 0.98)
    if (movX !== 0 && !esBloqueado(nx, this.pos.y) && !npcEnPunto(nx, this.pos.y, npcs)) {
      this.pos.x = nx
    }
    const ny = clamp(this.pos.y + movY, 0.05, 0.97)
    if (movY !== 0 && !esBloqueado(this.pos.x, ny) && !npcEnPunto(this.pos.x, ny, npcs)) {
      this.pos.y = ny
    }
  }

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

  reaparecerEn(idEdificio) {
    const e = EDIFICIOS.find((x) => x.id === idEdificio)
    if (e) {
      // Aparece un pasito AFUERA de la puerta (hacia el centro de la plaza), no pegado:
      // así queda en el adoquinado, la gracia se libera enseguida y re-entra natural.
      this.pos = puntoAfueraDePuerta(e.puerta)
      this.ultimoEdif = idEdificio // origen para el próximo camino
      this.graciaPuerta = idEdificio // no re-entrar a este edificio hasta alejarse
    } else {
      this.pos = { ...POS_INICIAL_JUGADOR }
      this.ultimoEdif = 'inicio'
    }
    this.target = null
  }

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

    // El mafioso recorre el camino real garito→inicio (no en línea recta) y se
    // planta al lado del player. Tramos: puerta del garito → nodos del camino → spawn.
    const nodos = caminoEntre('garito', 'inicio')
    const plantado = { x: spawn.x + 0.08, y: spawn.y + 0.02 }
    const ruta = [...nodos, plantado]

    // Velocidad constante: la duración de cada tramo es proporcional a su largo
    // (si no, los tramos largos se ven acelerados). VEL_MAFIOSO en unidades norm/s.
    const VEL_MAFIOSO = 0.18
    let prev = { x: puerta.x, y: puerta.y }

    const tl = gsap.timeline({ onComplete: () => onFin && onFin() })
    // 1. El player camina al spawn.
    tl.to(this.pos, { x: spawn.x, y: spawn.y, duration: 0.8, ease: 'power1.inOut' })
    // 2. El mafioso sale del garito y avanza por la ruta, a velocidad pareja.
    ruta.forEach((n, i) => {
      const dist = Math.hypot(n.x - prev.x, n.y - prev.y)
      const dur = Math.max(0.25, dist / VEL_MAFIOSO)
      prev = n
      tl.to(mafioso.pos, {
        x: n.x,
        y: n.y,
        duration: dur,
        ease: i === ruta.length - 1 ? 'power2.out' : 'none'
      }, i === 0 ? '>0.2' : '>')
    })
    // 3. Beat de tensión: el mafioso encara y apunta.
    tl.to({}, { duration: 0.7 })
    // 4a. El sonido arranca ANTES del flash: compensa la latencia de play de Howler
    // para que el "bang" del disparo coincida con el destello visual.
    tl.call(() => useAudio().sfx('disparo'))
    // 4b. Flash en la mano del mafioso + retroceso del player (tras el sonido).
    tl.call(() => {
      this.fogonazo = { x: (plantado.x - 0.03) * ANCHO, y: (plantado.y - 0.05) * ALTO, vida: 0 }
    }, null, '>0.7')
    // El player se sacude por el impacto (knockback corto hacia atrás) y cae.
    tl.to(this.pos, { x: spawn.x - 0.015, duration: 0.08, ease: 'power3.out' }, '<')
    tl.call(() => {
      this.particulas.emitir((spawn.x) * ANCHO, (spawn.y - 0.05) * ALTO, 30, 'sangre', {
        vy: -70, vyVar: 50, gravedad: 260, vidaMin: 0.5, vidaVar: 0.6, spread: 12
      })
    }, null, '>0.06')
    // 5. El player cae rotando (más lento, se desploma).
    tl.to(this, { cinePlayerRot: Math.PI / 2, duration: 0.6, ease: 'power2.in' }, '<')
    // 6. Pausa para que se lea (después el fade lo maneja la plaza vía onFin).
    tl.to({}, { duration: 1.0 })
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
      const ang = Math.PI + (Math.PI * (i + 0.5)) / n // semicírculo
      return {
        id: src.id,
        nombre: src.nombre,
        pal: src.pal,
        pos: { x: spawn.x + Math.cos(ang) * 0.14, y: spawn.y + 0.04 + Math.sin(ang) * 0.10 },
        cineOffsetY: 0
      }
    })

    // El festejo dura ~6.04s; la cinemática termina (onFin → fade → pantalla) recién
    // cuando el audio se apaga, para no cortarlo. Anclamos un label al sonido y la
    // pausa final dura lo que el clip menos el colchón ya transcurrido.
    const DUR_FESTEJO = 6.04

    const tl = gsap.timeline({ onComplete: () => onFin && onFin() })
    // 1. El player camina al spawn.
    tl.to(this.pos, { x: spawn.x, y: spawn.y, duration: 0.8, ease: 'power1.inOut' })
    // Festejo: suena justo cuando arrancan los saltitos.
    tl.addLabel('festejo')
    tl.call(() => useAudio().sfx('festejo'), null, 'festejo')
    // 2. Saltitos escalonados de los NPCs (festejo), repetidos mientras dura el clip.
    this.cineNpcs.forEach((npc, i) => {
      tl.to(npc, {
        cineOffsetY: -0.03,
        duration: 0.4,
        ease: 'power1.out',
        yoyo: true,
        repeat: 6
      }, i === 0 ? 'festejo+=0.1' : '<0.08')
    })
    // 3. Lluvia de monedas: varios chorros escalonados a lo largo del festejo.
    for (let oleada = 0; oleada < 4; oleada++) {
      tl.call(() => {
        for (let k = 0; k < 5; k++) {
          this.particulas.emitir(
            (0.3 + Math.random() * 0.4) * ANCHO, -10, 18, 'brillo',
            { vy: 60, vyVar: 40, gravedad: 60, vidaMin: 1.4, vidaVar: 0.8, tam: 2 + Math.random() * 2, spread: 200 }
          )
        }
      }, null, `festejo+=${0.3 + oleada * 1.4}`)
    }
    // 4. El onComplete (→ fade → pantalla) cae cuando termina el clip de festejo.
    tl.to({}, { duration: 0.01 }, `festejo+=${DUR_FESTEJO}`)
  }

  // --- DRAW ---
  draw() {
    const ctx = this.ctx
    ctx.clearRect(0, 0, ANCHO, ALTO)

    if (this.fondoImg) ctx.drawImage(this.fondoImg, 0, 0, ANCHO, ALTO)
    else this.dibujarFondoRespaldo(ctx)

    if (this.editor) {
      this.dibujarEditorZonas(ctx)
    } else if (this.editorCaminable) {
      this.dibujarEditorCaminable(ctx)
    } else if (this.editorCaminos) {
      this.dibujarEditorCaminos(ctx)
    } else if (this.editorNpcs) {
      this.dibujarEditorNpcs(ctx)
    } else {
      this.dibujarPersonajes(ctx)
      this.particulas.draw(ctx)
    }
  }

  // Jugador + NPCs ordenados por Y (los de más abajo tapan a los de más arriba).
  dibujarPersonajes(ctx) {
    const npcsTodos = this.modoCinematico ? this.cineNpcs : this.npcs
    const lista = [
      { y: this.pos.y, dibujar: () => this.dibujarPlayerCine(ctx) },
      ...npcsTodos.map((n) => {
        // Posición efectiva: base + desplazamiento por "correrse" (despX/despY) y
        // el bob de festejo de la cinemática (cineOffsetY).
        const nx = n.pos.x + (n.despX || 0)
        const ny = n.pos.y + (n.despY || 0) + (n.cineOffsetY || 0)
        return {
          y: ny,
          dibujar: () => drawNpc(ctx, nx * ANCHO, ny * ALTO, n.pal, this.tiempo * 2 + n.pos.x * 10)
        }
      })
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

  // --- EDITOR DE NPCS (N) ---
  // Cada NPC es un punto arrastrable sobre su sprite. Botón "Copiar NPCs JSON".

  npcsEmpezar(sx, sy) {
    if (!this.editorNpcs) return false
    const p = this.aNorm(sx, sy)
    const umbral = HANDLE / ANCHO + 0.015
    for (const n of this.npcs) {
      if (dist(p.x, p.y, n.pos.x, n.pos.y) < umbral) {
        this.agarreNpc = n
        return true
      }
    }
    return false
  }

  npcsArrastrar(sx, sy) {
    if (!this.agarreNpc) return
    const p = this.aNorm(sx, sy)
    this.agarreNpc.pos.x = clamp(p.x, 0, 1)
    this.agarreNpc.pos.y = clamp(p.y, 0, 1)
  }

  npcsTerminar() {
    this.agarreNpc = null
  }

  exportarNpcs() {
    const r = (n) => Math.round(n * 1000) / 1000
    return this.npcs.map((n) => ({ id: n.id, pos: { x: r(n.pos.x), y: r(n.pos.y) } }))
  }

  dibujarEditorNpcs(ctx) {
    // Edificios atenuados de referencia
    for (const e of EDIFICIOS) {
      this.dibujarPoligono(ctx, e.zona, 'rgba(255, 178, 77, 0.05)', 'rgba(255, 178, 77, 0.25)')
    }
    for (const n of this.npcs) {
      drawNpc(ctx, n.pos.x * ANCHO, n.pos.y * ALTO, n.pal, 0)
      // Punto de agarre + nombre
      ctx.beginPath()
      ctx.arc(n.pos.x * ANCHO, n.pos.y * ALTO, HANDLE, 0, Math.PI * 2)
      ctx.fillStyle = '#4da3ff'
      ctx.fill()
      ctx.strokeStyle = '#0d0b0f'
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.font = 'bold 13px monospace'
      ctx.fillStyle = '#fff'
      ctx.textAlign = 'center'
      ctx.fillText(n.nombre, n.pos.x * ANCHO, n.pos.y * ALTO - 64)
    }
  }

  // Punto de referencia de un "lugar": la puerta del edificio, o el spawn si es 'inicio'.
  puntoLugar(id) {
    if (id === 'inicio') return { ...POS_INICIAL_JUGADOR }
    const e = EDIFICIOS.find((x) => x.id === id)
    return e ? { ...e.puerta } : null
  }

  dibujarEditorCaminos(ctx) {
    // Edificios atenuados de referencia
    for (const e of EDIFICIOS) {
      this.dibujarPoligono(ctx, e.zona, 'rgba(255, 178, 77, 0.05)', 'rgba(255, 178, 77, 0.25)')
    }

    const origen = this.puntoLugar(this.camOrigen)
    const destino = this.camDestino ? this.puntoLugar(this.camDestino) : null
    const camino = this.caminoActivo() || []

    // Línea origen → nodos → destino
    if (origen && destino) {
      const pts = [origen, ...camino, destino]
      ctx.strokeStyle = 'rgba(77, 163, 255, 0.85)'
      ctx.lineWidth = 3
      ctx.setLineDash([10, 8])
      ctx.beginPath()
      ctx.moveTo(pts[0].x * ANCHO, pts[0].y * ALTO)
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x * ANCHO, pts[i].y * ALTO)
      ctx.stroke()
      ctx.setLineDash([])
    }

    // Origen (verde) y destino (rojo)
    if (origen) this.marcaLugar(ctx, origen, '#7bc96f', 'origen')
    if (destino) this.marcaLugar(ctx, destino, '#d65a4a', 'destino')

    // Nodos del camino activo (azules, numerados)
    ctx.textAlign = 'center'
    for (let i = 0; i < camino.length; i++) {
      const n = camino[i]
      ctx.beginPath()
      ctx.arc(n.x * ANCHO, n.y * ALTO, HANDLE, 0, Math.PI * 2)
      ctx.fillStyle = '#4da3ff'
      ctx.fill()
      ctx.strokeStyle = '#0d0b0f'
      ctx.lineWidth = 2
      ctx.stroke()
    }
  }

  marcaLugar(ctx, p, color, label) {
    ctx.beginPath()
    ctx.arc(p.x * ANCHO, p.y * ALTO, HANDLE + 3, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()
    ctx.strokeStyle = '#0d0b0f'
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.font = 'bold 13px monospace'
    ctx.fillStyle = '#fff'
    ctx.textAlign = 'center'
    ctx.fillText(label, p.x * ANCHO, p.y * ALTO - 20)
  }

  dibujarFondoRespaldo(ctx) {
    const g = ctx.createRadialGradient(ANCHO / 2, ALTO / 2, 100, ANCHO / 2, ALTO / 2, 800)
    g.addColorStop(0, '#1a140f')
    g.addColorStop(1, '#0d0b0f')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, ANCHO, ALTO)
  }

  centroide(poly) {
    let cx = 0, cy = 0
    for (const v of poly) { cx += v.x; cy += v.y }
    return { x: (cx / poly.length) * ANCHO, y: (cy / poly.length) * ALTO }
  }

  dibujarEtiquetaHover(ctx, e) {
    const c = this.centroide(e.zona)
    let minY = 1
    for (const v of e.zona) minY = Math.min(minY, v.y)
    const ty = minY * ALTO - 14
    ctx.font = 'bold 22px Cinzel, serif'
    ctx.textAlign = 'center'
    const ancho = ctx.measureText(e.nombre).width + 32
    ctx.fillStyle = 'rgba(13, 11, 15, 0.88)'
    ctx.strokeStyle = 'rgba(255, 178, 77, 0.6)'
    ctx.lineWidth = 1.5
    redondeado(ctx, c.x - ancho / 2, ty - 26, ancho, 36, 9)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = '#ffd27a'
    ctx.fillText(e.nombre, c.x, ty)
  }

  dibujarPoligono(ctx, poly, fill, stroke) {
    ctx.beginPath()
    ctx.moveTo(poly[0].x * ANCHO, poly[0].y * ALTO)
    for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x * ANCHO, poly[i].y * ALTO)
    ctx.closePath()
    ctx.fillStyle = fill
    ctx.fill()
    ctx.strokeStyle = stroke
    ctx.lineWidth = 2
    ctx.stroke()
  }

  dibujarVertices(ctx, poly, color) {
    ctx.fillStyle = color
    for (const v of poly) {
      ctx.beginPath()
      ctx.arc(v.x * ANCHO, v.y * ALTO, HANDLE, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  dibujarEditorZonas(ctx) {
    for (const e of EDIFICIOS) {
      this.dibujarPoligono(ctx, e.zona, 'rgba(255, 178, 77, 0.12)', 'rgba(255, 178, 77, 0.95)')
      this.dibujarVertices(ctx, e.zona, '#ffd27a')

      const dx = e.puerta.x * ANCHO
      const dy = e.puerta.y * ALTO
      ctx.beginPath()
      ctx.arc(dx, dy, HANDLE, 0, Math.PI * 2)
      ctx.fillStyle = '#7bc96f'
      ctx.fill()
      ctx.strokeStyle = '#0d0b0f'
      ctx.lineWidth = 2
      ctx.stroke()

      // Cartel (punto azul)
      if (e.cartel) {
        ctx.beginPath()
        ctx.arc(e.cartel.x * ANCHO, e.cartel.y * ALTO, HANDLE, 0, Math.PI * 2)
        ctx.fillStyle = '#4da3ff'
        ctx.fill()
        ctx.strokeStyle = '#0d0b0f'
        ctx.lineWidth = 2
        ctx.stroke()
      }

      const c = this.centroide(e.zona)
      ctx.font = 'bold 15px monospace'
      ctx.fillStyle = '#fff'
      ctx.textAlign = 'center'
      ctx.fillText(e.id, c.x, c.y)
    }
  }

  dibujarEditorCaminable(ctx) {
    // Edificios atenuados como referencia
    for (const e of EDIFICIOS) {
      this.dibujarPoligono(ctx, e.zona, 'rgba(255, 178, 77, 0.06)', 'rgba(255, 178, 77, 0.3)')
    }
    // Zona caminable: relleno verde + borde + vértices
    this.dibujarPoligono(ctx, ZONA_CAMINABLE, 'rgba(123, 201, 111, 0.18)', 'rgba(123, 201, 111, 0.95)')
    this.dibujarVertices(ctx, ZONA_CAMINABLE, '#7bc96f')
  }
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v))
}

// Punto caminable más cercano a `p` (búsqueda radial en anillos crecientes).
// Aparece pegado al edificio en vez de empujarse al centro de la plaza.
function puntoCaminableCercaDe(p) {
  if (!esBloqueado(p.x, p.y)) return { x: p.x, y: p.y }
  for (let r = 0.03; r <= 0.25; r += 0.02) {
    for (let a = 0; a < 16; a++) {
      const ang = (a / 16) * Math.PI * 2
      const x = clamp(p.x + Math.cos(ang) * r, 0.02, 0.98)
      const y = clamp(p.y + Math.sin(ang) * r, 0.05, 0.97)
      if (!esBloqueado(x, y)) return { x, y }
    }
  }
  return { ...POS_INICIAL_JUGADOR }
}

// Punto un poco AFUERA de la puerta, hacia el centro de la plaza, para no reaparecer
// pegado (y poder re-entrar enseguida). Distancia > RADIO_PUERTA para salir del radio
// de entrada. Si queda bloqueado, cae al caminable más cercano a ese punto.
function puntoAfueraDePuerta(puerta) {
  const dx = POS_INICIAL_JUGADOR.x - puerta.x
  const dy = POS_INICIAL_JUGADOR.y - puerta.y
  const d = Math.hypot(dx, dy) || 1
  const sep = 0.07
  const destino = {
    x: clamp(puerta.x + (dx / d) * sep, 0.02, 0.98),
    y: clamp(puerta.y + (dy / d) * sep, 0.05, 0.97)
  }
  return puntoCaminableCercaDe(destino)
}

function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by)
}

function distASegmento(p, a, b) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lenSq = dx * dx + dy * dy
  let t = lenSq ? ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq : 0
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}

function redondeado(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

export { ANCHO, ALTO }
