// Audio del juego. Abstrae el acceso al sonido: el resto del juego solo llama
// audio.play("correct") / audio.startLoop(id, "fly") / etc.
//
// Usa Web Audio API: decodifica cada archivo una vez y crea un BufferSource por
// reproduccion, asi los efectos cortos se pueden solapar sin cortarse.
// Cada categoria tiene varias variantes y se elige una al azar para dar variedad.

const SOUND_DEFS = {
  keypress: { dir: "keypress", count: 4, volume: 0.22 },
  correct: { dir: "correct", count: 4, volume: 0.5 },
  fireball: { dir: "fireball", count: 2, volume: 0.45 },
  error: { dir: "error", count: 3, volume: 0.4 },
  expired: { dir: "expired", count: 3, volume: 0.5 },
  combo: { dir: "combo", count: 2, volume: 0.55 },
  distractionClear: { dir: "distraction-clear", count: 2, volume: 0.5 },
  gameover: { dir: "gameover", count: 2, volume: 0.6 },
  // Bucles para distracciones activas.
  fly: { dir: "fly", count: 3, volume: 0.16, loop: true },
  popup: { dir: "popup", count: 3, volume: 0.22, loop: true },
};

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.buffers = {};
    this.enabled = true;
    this._loops = new Map();
    this._loading = null;
  }

  // Debe llamarse tras un gesto del usuario (politica de autoplay del navegador).
  init() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") this.ctx.resume();
      return this._loading;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return Promise.resolve();
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(this.ctx.destination);
    this._loading = this._loadAll();
    return this._loading;
  }

  async _loadAll() {
    const jobs = [];
    for (const [name, def] of Object.entries(SOUND_DEFS)) {
      this.buffers[name] = [];
      for (let i = 1; i <= def.count; i++) {
        const url = `/sounds/${def.dir}/${i}.mp3`;
        jobs.push(
          fetch(url)
            .then((r) => r.arrayBuffer())
            .then((data) => this.ctx.decodeAudioData(data))
            .then((buf) => {
              this.buffers[name][i - 1] = buf;
            })
            .catch(() => {}),
        );
      }
    }
    await Promise.all(jobs);
  }

  _pick(name) {
    const list = this.buffers[name];
    if (!list || !list.length) return null;
    const usable = list.filter(Boolean);
    if (!usable.length) return null;
    return usable[Math.floor(Math.random() * usable.length)];
  }

  play(name) {
    if (!this.enabled || !this.ctx) return;
    const buf = this._pick(name);
    if (!buf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const gain = this.ctx.createGain();
    gain.gain.value = SOUND_DEFS[name]?.volume ?? 0.5;
    src.connect(gain).connect(this.master);
    src.start();
  }

  // Bucle asociado a una clave (p.ej. el id de una distraccion).
  startLoop(key, name) {
    if (!this.enabled || !this.ctx || this._loops.has(key)) return;
    const buf = this._pick(name);
    if (!buf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const gain = this.ctx.createGain();
    gain.gain.value = SOUND_DEFS[name]?.volume ?? 0.2;
    src.connect(gain).connect(this.master);
    src.start();
    this._loops.set(key, src);
  }

  stopLoop(key) {
    const src = this._loops.get(key);
    if (!src) return;
    try {
      src.stop();
    } catch {
      /* ya detenido */
    }
    this._loops.delete(key);
  }

  stopAllLoops() {
    for (const key of [...this._loops.keys()]) this.stopLoop(key);
  }

  setEnabled(on) {
    this.enabled = on;
    if (!on) this.stopAllLoops();
  }
}
