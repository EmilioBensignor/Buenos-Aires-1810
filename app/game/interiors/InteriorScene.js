// Render de un interior caminable (canvas, sin Vue). El jugador camina, se acerca
// a la MESA (polígono) para jugar, y a la SALIDA (polígono) para volver a la plaza.
//
// Editor (Shift+E): se ven los 4 elementos siempre. Teclas 1/2/3/4 eligen cuál
// estás editando (1 caminable · 2 mesa · 3 salida · 4 spawn). Doble-clic agrega
// un punto al elemento activo (para spawn lo posiciona). Arrastrar mueve un punto,
// clic derecho borra el punto bajo el cursor. +/- ajusta la escala del jugador.

import { drawPlayer, dirDesdeVector } from '~/game/render/drawPlayer'
import { drawNpc } from '~/game/render/drawNpc'
import { NPCS_INTERIOR, npcEnPunto, npcCercaDe } from '~/game/npc/npcs'
import { esCaminable, puntoEnPoligono, centroide } from './interiors'

const ANCHO = 1440
const ALTO = 800

const VEL = 0.32
const UMBRAL_LLEGADA = 0.012
const HANDLE = 11

// Elementos editables y su orden de teclas.
const ELEMENTOS = ['caminable', 'mesa', 'salida', 'spawn', 'obstaculo', 'cartel', 'npc']
const COLOR = {
  caminable: { fill: 'rgba(123,201,111,0.16)', stroke: '#7bc96f', v: '#7bc96f' },
  mesa: { fill: 'rgba(255,178,77,0.22)', stroke: '#ffb24d', v: '#ffb24d' },
  salida: { fill: 'rgba(214,90,74,0.22)', stroke: '#d65a4a', v: '#d65a4a' },
  spawn: { v: '#4da3ff' },
  obstaculo: { fill: 'rgba(180,140,255,0.22)', stroke: '#b48cff', v: '#b48cff' },
  cartel: { v: '#ffd27a' },
  npc: { v: '#4da3ff' }
}

export class InteriorRenderer {
  constructor(canvas, interior) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.interior = interior

    this.pos = interior.spawn ? { ...interior.spawn } : { x: 0.5, y: 0.6 }
    // Mira hacia abajo al entrar (cara de frente), no hacia la puerta.
    this.dir = 'abajo'
    this.target = null
    this.frameCaminata = 0
    this.tiempoFrame = 0
    this.caminando = false
    // Período de gracia: no dispara mesa/salida hasta que el jugador salga de esas
    // zonas (evita re-disparar el juego o salir apenas se reaparece).
    this.gracia = true

    this.fondoImg = null
    this.cargarFondo(interior.fondo)

    this.cercaMesa = false

    this.npcs = NPCS_INTERIOR[interior.id] || []
    this.npcCerca = null // NPC dentro del radio de cercanía (para el prompt "E")
    this.indiceDialogo = {} // id NPC → línea actual (rota al hablar)
    this.tiempo = 0 // acumulador para el idle de los NPCs

    this.editor = false
    this.elementoActivo = 'caminable' // qué se edita (1/2/3/4)
    this.agarre = null // { poly, idx } | { spawn: true } | { npc }

    this.onSalir = null
    this.onJugar = null
  }

  // Posición del cartel de la mesa (norm 0-1) para que el DOM lo dibuje sobre el canvas.
  cartelMesa() {
    const m = this.interior.mesa
    if (!m || !m.juego) return null
    const c = m.cartel || centroide(m.poly)
    return { x: c.x, y: c.y, texto: m.juego }
  }

  cargarFondo(src) {
    const img = new Image()
    img.onload = () => { this.fondoImg = img }
    img.onerror = () => { this.fondoImg = null }
    img.src = src
  }

  toggleEditor() {
    this.editor = !this.editor
    this.agarre = null
  }

  setElemento(nombre) {
    if (ELEMENTOS.includes(nombre)) this.elementoActivo = nombre
  }

  ajustarEscala(delta) {
    this.interior.escalaJugador = clamp((this.interior.escalaJugador || 1) + delta, 0.3, 5)
  }

  aNorm(sx, sy) {
    return { x: sx / ANCHO, y: sy / ALTO }
  }

  // Polígono del elemento activo (o null si es spawn). Crea el obstáculo si no existe.
  polyActivo() {
    if (this.elementoActivo === 'caminable') return this.interior.caminable
    if (this.elementoActivo === 'mesa') return this.interior.mesa.poly
    if (this.elementoActivo === 'salida') return this.interior.salida.poly
    if (this.elementoActivo === 'obstaculo') {
      if (!this.interior.obstaculos) this.interior.obstaculos = []
      if (!this.interior.obstaculos.length) this.interior.obstaculos.push([])
      // El obstáculo activo es el último (el que se está armando).
      return this.interior.obstaculos[this.interior.obstaculos.length - 1]
    }
    return null
  }

  // Tecla N (modo obstáculo): empieza un obstáculo nuevo y vacío.
  nuevoObstaculo() {
    if (!this.editor || this.elementoActivo !== 'obstaculo') return
    if (!this.interior.obstaculos) this.interior.obstaculos = []
    // Solo si el último ya tiene forma (evita crear vacíos encadenados).
    const ult = this.interior.obstaculos[this.interior.obstaculos.length - 1]
    if (!ult || ult.length >= 3) this.interior.obstaculos.push([])
  }

  // --- INPUT de juego ---

  clickEn(sx, sy) {
    if (this.editor) return
    const p = this.aNorm(sx, sy)
    if (puntoEnPoligono(p.x, p.y, this.interior.mesa.poly)) {
      this.target = { ...centroide(this.interior.mesa.poly), accion: 'mesa' }
      return
    }
    if (puntoEnPoligono(p.x, p.y, this.interior.salida.poly)) {
      this.target = { ...centroide(this.interior.salida.poly), accion: 'salida' }
      return
    }
    if (esCaminable(this.interior, p.x, p.y)) this.target = p
  }

  // Clic en el cartel de la mesa: camina hasta la mesa y al llegar dispara el juego.
  irAMesa() {
    if (this.editor) return
    this.target = { ...centroide(this.interior.mesa.poly), accion: 'mesa' }
  }

  // Tecla E: hablar con NPC cercano tiene prioridad; si no, mesa/salida.
  // Devuelve { nombre, texto } si habló con un NPC, o null.
  interactuar() {
    if (this.editor) return null
    if (this.npcCerca) return this.hablar(this.npcCerca)
    if (puntoEnPoligono(this.pos.x, this.pos.y, this.interior.mesa.poly) && this.onJugar) {
      this.onJugar(this.interior.mesa.escena)
    } else if (puntoEnPoligono(this.pos.x, this.pos.y, this.interior.salida.poly) && this.onSalir) {
      this.onSalir()
    }
    return null
  }

  // Clic sobre un NPC cercano = hablarle.
  clickNpc(sx, sy) {
    if (this.editor) return null
    const p = this.aNorm(sx, sy)
    const n = npcCercaDe(p.x, p.y, this.npcs)
    if (n) return this.hablar(n)
    return null
  }

  hablar(n) {
    const i = this.indiceDialogo[n.id] || 0
    const texto = n.dialogos[i % n.dialogos.length]
    this.indiceDialogo[n.id] = i + 1
    return { nombre: n.nombre, texto }
  }

  // --- UPDATE ---
  update(delta, vectorTeclado) {
    if (this.editor) return

    this.tiempo += delta

    let movX = 0
    let movY = 0
    const paso = VEL * delta

    if (vectorTeclado && (vectorTeclado.x !== 0 || vectorTeclado.y !== 0)) {
      this.target = null
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

    this.caminando = movX !== 0 || movY !== 0
    if (this.caminando) {
      this.aplicarMovimiento(movX, movY)
      this.tiempoFrame += delta
      if (this.tiempoFrame > 0.18) {
        this.frameCaminata = (this.frameCaminata + 1) % 2
        this.tiempoFrame = 0
      }
      // Caminar sobre la mesa = jugar; sobre la salida = volver. El "gracia" evita
      // re-disparar apenas reapareceés (hay que salir de la zona y volver a entrar).
      if (!this.gracia) {
        if (puntoEnPoligono(this.pos.x, this.pos.y, this.interior.mesa.poly) && this.onJugar) {
          this.onJugar(this.interior.mesa.escena)
          return
        }
        if (puntoEnPoligono(this.pos.x, this.pos.y, this.interior.salida.poly) && this.onSalir) {
          this.onSalir()
          return
        }
      }
    } else {
      this.frameCaminata = 0
    }

    // Levantar la gracia una vez que el jugador salió de mesa y salida.
    if (this.gracia &&
        !puntoEnPoligono(this.pos.x, this.pos.y, this.interior.mesa.poly) &&
        !puntoEnPoligono(this.pos.x, this.pos.y, this.interior.salida.poly)) {
      this.gracia = false
    }

    this.cercaMesa = puntoEnPoligono(this.pos.x, this.pos.y, this.interior.mesa.poly)
    this.npcCerca = npcCercaDe(this.pos.x, this.pos.y, this.npcs)
  }

  aplicarMovimiento(movX, movY) {
    const nx = clamp(this.pos.x + movX, 0, 1)
    if (movX !== 0 && esCaminable(this.interior, nx, this.pos.y) && !npcEnPunto(nx, this.pos.y, this.npcs)) {
      this.pos.x = nx
    }
    const ny = clamp(this.pos.y + movY, 0, 1)
    if (movY !== 0 && esCaminable(this.interior, this.pos.x, ny) && !npcEnPunto(this.pos.x, ny, this.npcs)) {
      this.pos.y = ny
    }
  }

  llegarATarget() {
    const t = this.target
    this.target = null
    if (!t) return
    if (t.accion === 'mesa' && this.onJugar) this.onJugar(this.interior.mesa.escena)
    else if (t.accion === 'salida' && this.onSalir) this.onSalir()
  }

  // --- EDITOR ---

  // Mousedown: agarra el punto/spawn bajo el cursor (de cualquier elemento) para arrastrar.
  empezarArrastre(sx, sy) {
    if (!this.editor) return false
    const p = this.aNorm(sx, sy)
    const umbral = HANDLE / ANCHO + 0.006

    if (this.interior.spawn && dist(p.x, p.y, this.interior.spawn.x, this.interior.spawn.y) < umbral) {
      this.agarre = { spawn: true }
      return true
    }
    const cartel = this.interior.mesa?.cartel
    if (cartel && dist(p.x, p.y, cartel.x, cartel.y) < umbral) {
      this.agarre = { cartel: true }
      return true
    }
    const umbralNpc = HANDLE / ANCHO + 0.015
    for (const n of this.npcs) {
      if (dist(p.x, p.y, n.pos.x, n.pos.y) < umbralNpc) {
        this.agarre = { npc: n }
        return true
      }
    }
    for (const poly of this.todosLosPolis()) {
      for (let i = 0; i < poly.length; i++) {
        if (dist(p.x, p.y, poly[i].x, poly[i].y) < umbral) {
          this.agarre = { poly, idx: i }
          return true
        }
      }
    }
    return false
  }

  arrastrar(sx, sy) {
    if (!this.agarre) return
    const p = this.aNorm(sx, sy)
    if (this.agarre.spawn) {
      this.interior.spawn.x = clamp(p.x, 0, 1)
      this.interior.spawn.y = clamp(p.y, 0, 1)
    } else if (this.agarre.cartel) {
      this.interior.mesa.cartel.x = clamp(p.x, 0, 1)
      this.interior.mesa.cartel.y = clamp(p.y, 0, 1)
    } else if (this.agarre.npc) {
      this.agarre.npc.pos.x = clamp(p.x, 0, 1)
      this.agarre.npc.pos.y = clamp(p.y, 0, 1)
    } else {
      this.agarre.poly[this.agarre.idx].x = clamp(p.x, 0, 1)
      this.agarre.poly[this.agarre.idx].y = clamp(p.y, 0, 1)
    }
  }

  terminarArrastre() {
    this.agarre = null
  }

  // Doble-clic: agrega punto al ELEMENTO ACTIVO. Spawn → lo posiciona.
  agregar(sx, sy) {
    if (!this.editor) return
    const p = this.aNorm(sx, sy)
    if (this.elementoActivo === 'spawn') {
      this.interior.spawn = { x: p.x, y: p.y }
      return
    }
    if (this.elementoActivo === 'cartel') {
      this.interior.mesa.cartel = { x: p.x, y: p.y }
      return
    }
    const poly = this.polyActivo()
    // Si tiene <3 puntos, va al final (todavía armando la forma).
    if (poly.length < 3) { poly.push({ x: p.x, y: p.y }); return }
    // Si ya es un polígono y el clic cae adentro, inserta en el borde más cercano.
    if (puntoEnPoligono(p.x, p.y, poly)) {
      let mejorI = 0, mejorD = Infinity
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const d = distASegmento(p, poly[j], poly[i])
        if (d < mejorD) { mejorD = d; mejorI = i }
      }
      poly.splice(mejorI, 0, { x: p.x, y: p.y })
    } else {
      poly.push({ x: p.x, y: p.y })
    }
  }

  // Clic derecho: borra el punto bajo el cursor (de cualquier polígono) o el spawn.
  borrar(sx, sy) {
    if (!this.editor) return
    const p = this.aNorm(sx, sy)
    const umbral = HANDLE / ANCHO + 0.006
    if (this.interior.spawn && dist(p.x, p.y, this.interior.spawn.x, this.interior.spawn.y) < umbral) {
      this.interior.spawn = null
      return
    }
    for (const poly of this.todosLosPolis()) {
      for (let i = 0; i < poly.length; i++) {
        if (dist(p.x, p.y, poly[i].x, poly[i].y) < umbral) { poly.splice(i, 1); return }
      }
    }
  }

  todosLosPolis() {
    return [
      this.interior.caminable, this.interior.mesa.poly, this.interior.salida.poly,
      ...(this.interior.obstaculos || [])
    ]
  }

  // Posiciones de los NPCs de este interior (para pegar en npcs.js).
  exportarNpcs() {
    const r = (n) => Math.round(n * 1000) / 1000
    return {
      interior: this.interior.id,
      npcs: this.npcs.map((n) => ({ id: n.id, pos: { x: r(n.pos.x), y: r(n.pos.y) } }))
    }
  }

  // Solo la posición del cartel de la mesa (para calibrar rápido sin el JSON entero).
  exportarCartel() {
    const r = (n) => Math.round(n * 1000) / 1000
    const c = this.interior.mesa?.cartel
    return {
      id: this.interior.id,
      cartel: c ? { x: r(c.x), y: r(c.y) } : null
    }
  }

  exportar() {
    const r = (n) => Math.round(n * 1000) / 1000
    const i = this.interior
    const poly = (pp) => pp.map((v) => ({ x: r(v.x), y: r(v.y) }))
    return {
      escalaJugador: Math.round((i.escalaJugador || 1) * 100) / 100,
      caminable: poly(i.caminable),
      mesa: {
        poly: poly(i.mesa.poly),
        ...(i.mesa.cartel ? { cartel: { x: r(i.mesa.cartel.x), y: r(i.mesa.cartel.y) } } : {})
      },
      salida: { poly: poly(i.salida.poly) },
      spawn: i.spawn ? { x: r(i.spawn.x), y: r(i.spawn.y) } : null,
      obstaculos: (i.obstaculos || []).filter((o) => o.length >= 3).map(poly)
    }
  }

  // --- DRAW ---
  draw() {
    const ctx = this.ctx
    ctx.clearRect(0, 0, ANCHO, ALTO)

    if (this.fondoImg) ctx.drawImage(this.fondoImg, 0, 0, ANCHO, ALTO)
    else { ctx.fillStyle = '#1a140f'; ctx.fillRect(0, 0, ANCHO, ALTO) }

    if (this.editor) {
      this.dibujarEditor(ctx)
      // En editor, los NPCs se ven con su punto de agarre.
      this.dibujarNpcsEditor(ctx)
      return
    }
    this.dibujarPersonajes(ctx)
  }

  // Jugador + NPCs ordenados por Y, escalados como el interior.
  dibujarPersonajes(ctx) {
    const esc = this.interior.escalaJugador || 1
    const lista = [
      { y: this.pos.y, dibujar: () => drawPlayer(ctx, this.pos.x * ANCHO, this.pos.y * ALTO, this.dir, this.frameCaminata, esc) },
      ...this.npcs.map((n) => ({
        y: n.pos.y,
        dibujar: () => drawNpc(ctx, n.pos.x * ANCHO, n.pos.y * ALTO, n.pal, this.tiempo ? this.tiempo * 2 : 0, esc)
      }))
    ]
    lista.sort((a, b) => a.y - b.y)
    for (const item of lista) item.dibujar()
  }

  dibujarNpcsEditor(ctx) {
    const esc = this.interior.escalaJugador || 1
    for (const n of this.npcs) {
      const activo = this.elementoActivo === 'npc'
      ctx.globalAlpha = activo ? 1 : 0.5
      drawNpc(ctx, n.pos.x * ANCHO, n.pos.y * ALTO, n.pal, 0, esc)
      ctx.globalAlpha = 1
      punto(ctx, n.pos.x, n.pos.y, COLOR.npc.v)
      ctx.font = 'bold 13px monospace'
      ctx.fillStyle = '#fff'
      ctx.textAlign = 'center'
      ctx.fillText(n.nombre, n.pos.x * ANCHO, n.pos.y * ALTO - 14 * esc - 18)
    }
  }

  dibujarEditor(ctx) {
    const i = this.interior
    // El elemento activo se dibuja más opaco; los demás atenuados.
    this.dibujarPoly(ctx, i.caminable, 'caminable')
    this.dibujarPoly(ctx, i.mesa.poly, 'mesa')
    this.dibujarPoly(ctx, i.salida.poly, 'salida')
    for (const o of i.obstaculos || []) this.dibujarPoly(ctx, o, 'obstaculo')
    if (i.spawn) {
      const op = this.elementoActivo === 'spawn' ? 1 : 0.4
      ctx.globalAlpha = op
      punto(ctx, i.spawn.x, i.spawn.y, COLOR.spawn.v)
      ctx.globalAlpha = 1
    }
    if (i.mesa?.cartel) {
      const op = this.elementoActivo === 'cartel' ? 1 : 0.4
      ctx.globalAlpha = op
      punto(ctx, i.mesa.cartel.x, i.mesa.cartel.y, COLOR.cartel.v)
      ctx.globalAlpha = 1
    }
  }

  dibujarPoly(ctx, poly, nombre) {
    if (!poly.length) return
    const c = COLOR[nombre]
    const activo = this.elementoActivo === nombre
    ctx.globalAlpha = activo ? 1 : 0.45

    ctx.beginPath()
    ctx.moveTo(poly[0].x * ANCHO, poly[0].y * ALTO)
    for (let k = 1; k < poly.length; k++) ctx.lineTo(poly[k].x * ANCHO, poly[k].y * ALTO)
    if (poly.length >= 3) ctx.closePath()
    if (poly.length >= 3) { ctx.fillStyle = c.fill; ctx.fill() }
    ctx.strokeStyle = c.stroke
    ctx.lineWidth = activo ? 3 : 2
    ctx.stroke()

    ctx.fillStyle = c.v
    for (const v of poly) {
      ctx.beginPath()
      ctx.arc(v.x * ANCHO, v.y * ALTO, HANDLE, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)) }
function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by) }

function distASegmento(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y
  const lenSq = dx * dx + dy * dy
  let t = lenSq ? ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq : 0
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}

function punto(ctx, x, y, color) {
  ctx.beginPath()
  ctx.arc(x * ANCHO, y * ALTO, HANDLE, 0, Math.PI * 2)
  ctx.fillStyle = color
  ctx.fill()
  ctx.strokeStyle = '#0d0b0f'
  ctx.lineWidth = 2
  ctx.stroke()
}

export { ANCHO, ALTO, ELEMENTOS }
