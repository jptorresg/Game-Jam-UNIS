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
  sfxGameover: { dir: "gameover", count: 2, volume: 0.6 },
  boss: { dir: "boss", count: 1, volume: 0.8 }, // voz del jefe al interrumpir
  // Voz / sonido de cada distraccion al aparecer (una sola vez).
  coworker: { dir: "coworker", count: 1, volume: 0.7 }, // "interrupcion del companero"
  coffee: { dir: "coffee", count: 2, volume: 0.6 }, // "cafecito?"
  meeting: { dir: "meeting", count: 1, volume: 0.55 }, // aviso de reunion virtual
  phone: { dir: "phone", count: 2, volume: 0.4 }, // tono de celular
  notification: { dir: "notification", count: 2, volume: 0.45 }, // push notification
  // Bucles para distracciones activas.
  fly: { dir: "fly", count: 3, volume: 0.16, loop: true },
  popup: { dir: "popup", count: 3, volume: 0.22, loop: true },
};

// Musica de fondo (streaming, no se decodifica en buffer).
const MUSIC_DEFS = {
  menu: { volume: 0.3, loop: true },
  gameplay: { volume: 0.24, loop: true },
  rush: { volume: 0.32, loop: true },
  gameover: { volume: 0.45, loop: false },
};

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.buffers = {};
    this.enabled = true;
    this.musicEnabled = true;
    this._loops = new Map();
    this._loading = null;
    this._musicEl = null;
    this._musicPrefetch = new Map(); // name -> Audio (precargado)
    this.currentMusic = null;
    this._fadeTimer = null;
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
    this._prefetchMusic();
    return this._loading;
  }

  // Precarga todas las pistas para que el cambio (sobre todo a hora pico) sea
  // instantaneo y no se pierda el arranque.
  _prefetchMusic() {
    for (const name of Object.keys(MUSIC_DEFS)) {
      if (this._musicPrefetch.has(name)) continue;
      const el = new Audio();
      el.preload = "auto";
      el.src = `/music/${name}.mp3`;
      el.load();
      this._musicPrefetch.set(name, el);
    }
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

  // ---------- Musica de fondo ----------
  // Un elemento <audio> por pista (todas precargadas en init). Cambiar de pista
  // = pausar la anterior y reproducir la nueva, que ya esta en cache -> arranca
  // al instante, sin perder el principio.

  _musicFor(name) {
    let el = this._musicPrefetch.get(name);
    if (!el) {
      el = new Audio();
      el.preload = "auto";
      el.src = `/music/${name}.mp3`;
      this._musicPrefetch.set(name, el);
    }
    return el;
  }

  playMusic(name) {
    if (!this.musicEnabled) return;
    const def = MUSIC_DEFS[name];
    if (!def) return;

    if (this.currentMusic === name) {
      const same = this._musicFor(name);
      if (same.paused) same.play().catch(() => {});
      return;
    }

    const prev = this.currentMusic
      ? this._musicPrefetch.get(this.currentMusic)
      : null;
    this.currentMusic = name;

    if (prev && !prev.paused) this._fade(prev, 0, 180, true);

    const el = this._musicFor(name);
    el.loop = !!def.loop;
    try {
      el.currentTime = 0;
    } catch {
      /* aun sin metadata */
    }
    el.volume = 0;
    el
      .play()
      .then(() => this._fade(el, def.volume, 320))
      .catch(() => {
        this.currentMusic = null;
      });
  }

  pauseMusic() {
    const el = this.currentMusic && this._musicPrefetch.get(this.currentMusic);
    if (el) el.pause();
  }

  stopMusic() {
    const el = this.currentMusic && this._musicPrefetch.get(this.currentMusic);
    if (el) el.pause();
    this.currentMusic = null;
  }

  setMusicEnabled(on) {
    this.musicEnabled = on;
    const el = this.currentMusic && this._musicPrefetch.get(this.currentMusic);
    if (!el) return;
    if (!on) el.pause();
    else el.play().catch(() => {});
  }

  _fade(el, target, ms, thenPause = false) {
    if (!el) return;
    if (el._fadeTimer) clearInterval(el._fadeTimer);
    const steps = 12;
    const start = el.volume;
    let i = 0;
    el._fadeTimer = setInterval(() => {
      i++;
      el.volume = Math.max(0, Math.min(1, start + (target - start) * (i / steps)));
      if (i >= steps) {
        clearInterval(el._fadeTimer);
        el._fadeTimer = null;
        if (thenPause) el.pause();
      }
    }, ms / steps);
  }
}
