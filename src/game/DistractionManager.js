import { GAME_CONFIG } from "../config.js";
import { DISTRACTION_TYPES, randomDistractionType } from "../data/distractions.js";

// Logica de distracciones. Trabaja en coordenadas normalizadas (0..1) para que la
// UI las mapee al tamano real del area de juego. No toca la puntuacion ni la
// productividad: emite eventos para que Game aplique la consecuencia.
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
    for (const d of this.state.distractions) {
      d.remaining -= deltaTime;
      if (d.speed) {
        d.x += d.vx * deltaTime;
        d.y += d.vy * deltaTime;
        if (d.x < 0.02 || d.x > 0.92) {
          d.vx *= -1;
          d.x = clamp(d.x, 0.02, 0.92);
        }
        if (d.y < 0.02 || d.y > 0.9) {
          d.vy *= -1;
          d.y = clamp(d.y, 0.02, 0.9);
        }
      }
      if (d.remaining <= 0) this._miss(d);
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
    const normalizedSpeed = def.speed / 600; // px/s -> fraccion del area por segundo
    const angle = Math.random() * Math.PI * 2;
    const distraction = {
      id: `distraction-${String(this._nextId++).padStart(3, "0")}`,
      type,
      glyph: def.glyph,
      x: 0.1 + Math.random() * 0.8,
      y: 0.1 + Math.random() * 0.75,
      vx: Math.cos(angle) * normalizedSpeed,
      vy: Math.sin(angle) * normalizedSpeed,
      speed: def.speed,
      lifetime: def.lifetime,
      remaining: def.lifetime,
    };
    this.state.distractions.push(distraction);
    this.dispatchEvent(
      new CustomEvent("distractionSpawned", { detail: { distraction } }),
    );
  }

  _miss(distraction) {
    const index = this.state.distractions.indexOf(distraction);
    if (index !== -1) this.state.distractions.splice(index, 1);
    this.dispatchEvent(
      new CustomEvent("distractionMissed", { detail: { distraction } }),
    );
  }
}

function clamp(value, lo, hi) {
  return value < lo ? lo : value > hi ? hi : value;
}
