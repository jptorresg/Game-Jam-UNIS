import { GAME_CONFIG } from "../config.js";
import { DISTRACTION_TYPES, randomDistractionType } from "../data/distractions.js";
import { randomEdgePoint } from "./spawn.js";

// Logica de distracciones. Coordenadas normalizadas (0..1). Aparecen en un borde
// y luego se mueven despacio rebotando por la oficina. Si tocan al personaje
// disparan un efecto de pantalla (evento "distractionHit"); no restan
// productividad. Se van con click o cuando se agota su lifetime.
const BOUNDS = { minX: 0.04, maxX: 0.95, minY: 0.04, maxY: 0.9 };
const HIT_RADIUS = 0.1;
const HIT_COOLDOWN = 2; // segundos entre efectos de una misma distraccion

export class DistractionManager extends EventTarget {
  constructor(state) {
    super();
    this.state = state;
    this._timer = 0;
    this._nextId = 1;
    this.spawnInterval = GAME_CONFIG.initialDistractionInterval;
    this.enabled = false;
  }

  reset(state) {
    this.state = state;
    this._timer = 0;
    this._nextId = 1;
    this.spawnInterval = GAME_CONFIG.initialDistractionInterval;
    this.enabled = false;
    this.state.distractions.length = 0;
  }

  update(deltaTime) {
    const center = GAME_CONFIG.center;

    for (const d of this.state.distractions) {
      d.remaining -= deltaTime;
      if (d.cooldown > 0) d.cooldown -= deltaTime;

      d.x += d.vx * deltaTime;
      d.y += d.vy * deltaTime;

      // Rebote en los bordes del area de juego.
      if (d.x < BOUNDS.minX) {
        d.x = BOUNDS.minX;
        d.vx = Math.abs(d.vx);
      } else if (d.x > BOUNDS.maxX) {
        d.x = BOUNDS.maxX;
        d.vx = -Math.abs(d.vx);
      }
      if (d.y < BOUNDS.minY) {
        d.y = BOUNDS.minY;
        d.vy = Math.abs(d.vy);
      } else if (d.y > BOUNDS.maxY) {
        d.y = BOUNDS.maxY;
        d.vy = -Math.abs(d.vy);
      }

      // Choque con el personaje: efecto de pantalla + rebote, con enfriamiento.
      const dist = Math.hypot(center.x - d.x, center.y - d.y);
      if (dist < HIT_RADIUS && d.cooldown <= 0) {
        d.cooldown = HIT_COOLDOWN;
        const nx = (d.x - center.x) / (dist || 1);
        const ny = (d.y - center.y) / (dist || 1);
        const speed = Math.hypot(d.vx, d.vy) || 0.05;
        d.vx = nx * speed;
        d.vy = ny * speed;
        d.x = center.x + nx * (HIT_RADIUS + 0.02);
        d.y = center.y + ny * (HIT_RADIUS + 0.02);
        this.dispatchEvent(
          new CustomEvent("distractionHit", {
            detail: { distraction: d, effect: d.effect, ms: d.effectMs },
          }),
        );
      }

      if (d.remaining <= 0) this._expire(d);
    }

    if (!this.enabled) return;
    this._timer += deltaTime;
    if (
      this._timer >= this.spawnInterval &&
      this.state.distractions.length < GAME_CONFIG.maxActiveDistractions
    ) {
      this._timer = 0;
      this._spawn();
    }
  }

  clear(id) {
    const index = this.state.distractions.findIndex((d) => d.id === id);
    if (index === -1) return;
    const [distraction] = this.state.distractions.splice(index, 1);
    this.dispatchEvent(
      new CustomEvent("distractionCleared", { detail: { distraction } }),
    );
  }

  clearAll() {
    this.state.distractions.length = 0;
  }

  _spawn() {
    const type = randomDistractionType(this.state.level);
    const def = DISTRACTION_TYPES[type];
    const origin = randomEdgePoint();
    const angle = Math.random() * Math.PI * 2;
    const speed = def.speed / 520; // px/s -> fraccion del area por segundo

    const distraction = {
      id: `distraction-${String(this._nextId++).padStart(3, "0")}`,
      type,
      glyph: def.glyph,
      label: def.label,
      tone: def.tone,
      effect: def.effect,
      effectMs: def.effectMs,
      x: origin.x,
      y: origin.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      lifetime: def.lifetime,
      remaining: def.lifetime,
      cooldown: 1, // no golpea justo al aparecer
    };
    this.state.distractions.push(distraction);
    this.dispatchEvent(
      new CustomEvent("distractionSpawned", { detail: { distraction } }),
    );
  }

  _expire(distraction) {
    const index = this.state.distractions.indexOf(distraction);
    if (index === -1) return;
    this.state.distractions.splice(index, 1);
    this.dispatchEvent(
      new CustomEvent("distractionExpired", { detail: { distraction } }),
    );
  }
}
