// Chispas y brasas que suben. Pool simple, se actualiza con delta del game loop.

export class SistemaParticulas {
  constructor() {
    this.particulas = []
  }

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

  update(delta) {
    for (let i = this.particulas.length - 1; i >= 0; i--) {
      const p = this.particulas[i]
      p.vida += delta
      if (p.vida >= p.vidaMax) {
        this.particulas.splice(i, 1)
        continue
      }
      p.x += p.vx * delta
      p.y += p.vy * delta
      p.vy += (p.gravedad ?? 18) * delta // gravedad por partícula
    }
  }

  draw(ctx) {
    for (const p of this.particulas) {
      const t = p.vida / p.vidaMax
      const alpha = 1 - t
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
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.tam, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  limpiar() {
    this.particulas.length = 0
  }
}
