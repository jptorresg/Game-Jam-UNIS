import { GAME_CONFIG } from "../config.js";
import { DISTRACTION_TYPES, randomDistractionType } from "../data/distractions.js";
import { randomEdgePoint, centerTarget, directionTo } from "./spawn.js";

// Logica de distracciones. Coordenadas normalizadas (0..1): aparecen en un borde
// y avanzan hacia el centro (donde esta el personaje). Si llegan al centro o se
// agota su lifetime cuentan como ignoradas. No toca puntuacion ni productividad:
// emite eventos para que Game aplique la consecuencia.
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
      d.x += d.vx * deltaTime;
      d.y += d.vy * deltaTime;

      // Las fijas (popup) solo se pierden por lifetime; las que viajan, tambien
      // al alcanzar al personaje.
      const moving = d.vx !== 0 || d.vy !== 0;
      const reached =
        moving && Math.hypot(d.targetX - d.x, d.targetY - d.y) < 0.04;
      if (reached || d.remaining <= 0) {
        this._miss(d);
      }
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
    const center = GAME_CONFIG.center;
    const target = centerTarget(0.1);

    // El popup no viaja: aparece cerca del centro y bloquea.
    const origin =
      def.speed === 0
        ? { x: center.x + (Math.random() - 0.5) * 0.32, y: center.y - 0.3 }
        : randomEdgePoint();

    const dir = directionTo(origin, target);
    const normalizedSpeed = def.speed / 520; // px/s -> fraccion del area por segundo

    const distraction = {
      id: `distraction-${String(this._nextId++).padStart(3, "0")}`,
      type,
      glyph: def.glyph,
      label: def.label,
      tone: def.tone,
      x: origin.x,
      y: origin.y,
      targetX: def.speed === 0 ? origin.x : target.x,
      targetY: def.speed === 0 ? origin.y - 0.001 : target.y,
      vx: dir.x * normalizedSpeed,
      vy: dir.y * normalizedSpeed,
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
    if (index === -1) return; // ya fue quitada este frame
    this.state.distractions.splice(index, 1);
    this.dispatchEvent(
      new CustomEvent("distractionMissed", { detail: { distraction } }),
    );
  }
}
