// Render de un interior caminable (canvas, sin Vue). El jugador camina, se acerca
// a la MESA (polígono) para jugar, y a la SALIDA (polígono) para volver a la plaza.

import { drawPlayer, dirDesdeVector } from '~/game/render/drawPlayer'
import { drawNpc } from '~/game/render/drawNpc'
import { NPCS_INTERIOR, npcEnPunto, npcCercaDe } from '~/game/npc/npcs'
import { esCaminable, puntoEnPoligono, centroide } from './interiors'

const ANCHO = 1440
const ALTO = 800

const VEL = 0.32
const UMBRAL_LLEGADA = 0.012

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

  aNorm(sx, sy) {
    return { x: sx / ANCHO, y: sy / ALTO }
  }

  // --- INPUT de juego ---

  clickEn(sx, sy) {
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
    this.target = { ...centroide(this.interior.mesa.poly), accion: 'mesa' }
  }

  // Tecla E: hablar con NPC cercano tiene prioridad; si no, mesa/salida.
  // Devuelve { nombre, texto } si habló con un NPC, o null.
  interactuar() {
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

  // --- DRAW ---
  draw() {
    const ctx = this.ctx
    ctx.clearRect(0, 0, ANCHO, ALTO)

    if (this.fondoImg) ctx.drawImage(this.fondoImg, 0, 0, ANCHO, ALTO)
    else { ctx.fillStyle = '#1a140f'; ctx.fillRect(0, 0, ANCHO, ALTO) }

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
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)) }

export { ANCHO, ALTO }
