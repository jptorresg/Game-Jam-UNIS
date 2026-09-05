import { GameStatus } from "../game/Game.js";
import { GAME_CONFIG, comboMultiplier } from "../config.js";
import { getModifier } from "../data/modifiers.js";
import { Effects } from "./Effects.js";

const CENTER = GAME_CONFIG.center;

// Sprites del personaje. En reposo alterna standing/bored; mientras se escribe
// una palabra se elige la direccion (8 rumbos) hacia el reporte activo.
const CHAR_POSES = [
  "standing",
  "bored",
  "north",
  "northeast",
  "east",
  "southeast",
  "south",
  "southwest",
  "west",
  "northwest",
];

// atan2(dy, dx) / (PI/4) redondeado -> rumbo (coordenadas de pantalla, y hacia abajo).
const DIR_BY_INDEX = {
  "0": "east",
  "1": "southeast",
  "2": "south",
  "3": "southwest",
  "4": "west",
  "-4": "west",
  "-3": "northwest",
  "-2": "north",
  "-1": "northeast",
};

// Refleja el estado del juego en el DOM. Mantiene mapas id -> elemento para
// reportes y distracciones y solo actualiza posiciones / textos que cambian.
// Reportes y distracciones se posicionan de forma absoluta y avanzan hacia el
// centro (donde esta el personaje).
export class GameUI {
  constructor(game, root) {
    this.game = game;
    this.root = root;
    this._reportEls = new Map();
    this._distractionEls = new Map();
    this._build();

    this._prevStatus = null;

    this.game.addEventListener("change", (e) => this.render(e.detail));
    this.game.addEventListener("inputError", () => this._onInputError());
    this.game.addEventListener("hit", () => this._shakeScreen());
    this.game.addEventListener("reportDone", (e) => this._onReportDone(e.detail));
    this.game.addEventListener("reportLost", (e) => this._onReportLost(e.detail));
    this.game.addEventListener("comboUp", (e) =>
      this.effects.banner(`COMBO x${e.detail.multiplier}`),
    );
    this.game.addEventListener("distractionGone", (e) =>
      this._onDistractionGone(e.detail),
    );
    this.game.addEventListener("screenEffect", (e) => this._screenEffect(e.detail));
    this.game.addEventListener("phaseChange", (e) =>
      this.effects.banner(e.detail.banner),
    );
    this.game.addEventListener("tutorialStep", () => this.effects.banner("¡BIEN!"));

    document.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      const status = this.game.state.status;
      if (status === GameStatus.MENU || status === GameStatus.GAME_OVER) {
        this.game.start();
      } else if (status === GameStatus.BREAK) {
        this.game.nextShift();
      }
    });

    this.render(this.game.state);
  }

  _build() {
    this.root.innerHTML = `
      <div class="hud">
        <div class="hud__stat"><span class="hud__label">PUNTOS</span><span data-hud="score">0</span></div>
        <div class="hud__stat"><span class="hud__label">COMBO</span><span data-hud="combo">x1</span></div>
        <div class="hud__stat"><span class="hud__label">TURNO</span><span data-hud="shift">1</span></div>
        <div class="hud__stat hud__stat--prod">
          <span class="hud__label">PRODUCTIVIDAD</span>
          <span><span data-hud="productivity">100</span>%</span>
          <div class="prod-bar"><div class="prod-bar__fill" data-hud="prodbar"></div></div>
        </div>
      </div>

      <div class="office" data-region="office">
        <div class="clock" data-region="clock" hidden>
          <div class="clock__time" data-clock="time">9:00 AM</div>
          <div class="clock__phase" data-clock="phase">MANANA</div>
        </div>

        <div class="tutorial-bar" data-region="tutorialbar" hidden>
          <div class="tutorial-bar__title" data-tut="title"></div>
          <div class="tutorial-bar__desc" data-tut="desc"></div>
          <div class="tutorial-bar__count" data-tut="count"></div>
        </div>

        <div class="stage" data-region="stage">
          <div class="character" data-region="character" aria-hidden="true">
            <img class="character__img" data-region="charimg" alt="" />
            <div class="character__shadow"></div>
          </div>
          <div class="reports" data-region="reports"></div>
          <div class="distractions" data-region="distractions"></div>
          <div class="fx-layer" data-region="fx"></div>
        </div>

        <div class="screenblack" data-region="screenblack" hidden></div>
      </div>

      <div class="overlay" data-region="overlay" hidden>
        <div class="overlay__panel" data-region="overlay-panel"></div>
      </div>
    `;

    this.els = {
      score: this.root.querySelector('[data-hud="score"]'),
      combo: this.root.querySelector('[data-hud="combo"]'),
      shift: this.root.querySelector('[data-hud="shift"]'),
      productivity: this.root.querySelector('[data-hud="productivity"]'),
      prodbar: this.root.querySelector('[data-hud="prodbar"]'),
      office: this.root.querySelector('[data-region="office"]'),
      stage: this.root.querySelector('[data-region="stage"]'),
      character: this.root.querySelector('[data-region="character"]'),
      reports: this.root.querySelector('[data-region="reports"]'),
      distractions: this.root.querySelector('[data-region="distractions"]'),
      overlay: this.root.querySelector('[data-region="overlay"]'),
      overlayPanel: this.root.querySelector('[data-region="overlay-panel"]'),
      fx: this.root.querySelector('[data-region="fx"]'),
      screenblack: this.root.querySelector('[data-region="screenblack"]'),
      clock: this.root.querySelector('[data-region="clock"]'),
      clockTime: this.root.querySelector('[data-clock="time"]'),
      clockPhase: this.root.querySelector('[data-clock="phase"]'),
      tutorialBar: this.root.querySelector('[data-region="tutorialbar"]'),
      tutTitle: this.root.querySelector('[data-tut="title"]'),
      tutDesc: this.root.querySelector('[data-tut="desc"]'),
      tutCount: this.root.querySelector('[data-tut="count"]'),
      charImg: this.root.querySelector('[data-region="charimg"]'),
    };
    this.effects = new Effects(this.els.fx);
    this._blurTimer = null;
    this._blackTimer = null;

    // Precargar los sprites del personaje y arrancar la rotacion de reposo.
    this._charSprites = {};
    for (const name of CHAR_POSES) {
      const src = `/images/character/${name}.png`;
      this._charSprites[name] = src;
      const img = new Image();
      img.src = src;
    }
    this._idlePose = "standing";
    this.els.charImg.src = this._charSprites.standing;
    this._idleTimer = setInterval(() => {
      this._idlePose = this._idlePose === "standing" ? "bored" : "standing";
      if (this.game.state.activeReportId == null) {
        this._setCharacterPose(this.game.state);
      }
    }, 2600);
  }

  render(state) {
    // Limpia los efectos al entrar a un turno o al tutorial.
    const activePlay =
      state.status === GameStatus.PLAYING || state.status === GameStatus.TUTORIAL;
    const wasActivePlay =
      this._prevStatus === GameStatus.PLAYING ||
      this._prevStatus === GameStatus.TUTORIAL;
    if (activePlay && !wasActivePlay) {
      this.effects.clear();
      this._clearScreenEffects();
    }
    this._prevStatus = state.status;

    setText(this.els.score, state.score);
    setText(this.els.combo, `x${comboMultiplier(state.combo)}`);
    setText(this.els.shift, state.shift);
    setText(this.els.productivity, Math.ceil(state.productivity));
    this.els.prodbar.style.width = `${Math.max(0, state.productivity)}%`;
    this.els.prodbar.classList.toggle("prod-bar__fill--low", state.productivity <= 30);
    this.els.combo.parentElement.classList.toggle("hud__stat--hot", state.combo >= 5);

    this._renderClock(state);
    this._renderTutorialBar(state);

    // Estilo ZType: sin objetivo se resalta la primera letra de cada palabra;
    // con objetivo se atenuan las demas.
    const targeting = state.activeReportId != null;
    this.els.reports.classList.toggle("reports--targeting", targeting);
    this.els.reports.classList.toggle("reports--idle", !targeting);

    this._renderReports(state);
    this._renderDistractions(state);
    this._setCharacterPose(state);
    this._renderOverlay(state);
  }

  // Elige el sprite del personaje: rumbo al reporte activo, o reposo si no hay.
  _setCharacterPose(state) {
    let pose;
    const active = state.activeReportId
      ? this.game.reportManager.getReport(state.activeReportId)
      : null;
    if (active) {
      pose = this._directionToReport(active);
    } else {
      pose = this._idlePose;
    }
    const src = this._charSprites[pose] || this._charSprites.standing;
    if (this.els.charImg.getAttribute("src") !== src) {
      this.els.charImg.setAttribute("src", src);
    }
  }

  _directionToReport(report) {
    const progress = clamp01(1 - report.remainingTime / report.timeLimit);
    const posProgress = Math.min(progress, 0.94);
    const rx = lerp(report.spawnX, report.targetX ?? CENTER.x, posProgress);
    const ry = lerp(report.spawnY, report.targetY ?? CENTER.y, posProgress);
    const dx = rx - CENTER.x;
    const dy = ry - CENTER.y;
    if (Math.hypot(dx, dy) < 0.02) return "north";
    const index = Math.round(Math.atan2(dy, dx) / (Math.PI / 4));
    return DIR_BY_INDEX[index] || "north";
  }

  _renderReports(state) {
    const liveIds = new Set(state.reports.map((r) => r.id));
    for (const [id, el] of this._reportEls) {
      if (!liveIds.has(id)) this._dismissEl(el, this._reportEls, id);
    }

    for (const report of state.reports) {
      let el = this._reportEls.get(report.id);
      if (!el) {
        el = this._createReportEl(report);
        this._reportEls.set(report.id, el);
        this.els.reports.appendChild(el);
      }

      const isActive = report.id === state.activeReportId;
      el.classList.toggle("report--active", isActive);

      // Avance del borde hacia el personaje. La posicion se detiene un poco antes
      // del objetivo para no tapar al personaje; el reloj sigue hasta 0.
      const progress = clamp01(1 - report.remainingTime / report.timeLimit);
      const posProgress = Math.min(progress, 0.94);
      const tx = report.targetX ?? CENTER.x;
      const ty = report.targetY ?? CENTER.y;
      const x = lerp(report.spawnX, tx, posProgress);
      const y = lerp(report.spawnY, ty, posProgress);
      const scale = (0.82 + progress * 0.26) * (isActive ? 1.08 : 1);
      el.style.left = `${x * 100}%`;
      el.style.top = `${y * 100}%`;
      el.style.setProperty("--scale", scale.toFixed(3));
      el.classList.toggle("report--urgent", progress > 0.72);

      const typed = isActive ? state.currentInput : "";
      el.querySelector(".report__typed").textContent = typed;
      el.querySelector(".report__rest").textContent =
        report.expectedInput.slice(typed.length);
      el.querySelector(".report__timerbar-fill").style.width =
        `${(1 - progress) * 100}%`;
    }
  }

  _createReportEl(report) {
    const modifier = getModifier(report.modifier);
    const el = document.createElement("div");
    el.className = `report report--${modifier.color} report--enter`;
    el.dataset.reportId = report.id;
    el.style.setProperty("--scale", "0.82");

    const banner =
      modifier.id === "none"
        ? `<div class="report__tag">${report.id.toUpperCase()}</div>`
        : `<div class="report__banner">${modifier.label}</div>`;

    el.innerHTML = `
      ${banner}
      <div class="report__body">
        <div class="report__word">${report.word}</div>
        <div class="report__input">
          <span class="report__typed"></span><span class="report__rest"></span>
        </div>
      </div>
      <div class="report__timerbar"><div class="report__timerbar-fill"></div></div>
    `;
    el.addEventListener("pointerdown", () => this.game.setActiveReport(report.id));
    setTimeout(() => el.classList.remove("report--enter"), 20);
    return el;
  }

  _renderDistractions(state) {
    const liveIds = new Set(state.distractions.map((d) => d.id));
    for (const [id, el] of this._distractionEls) {
      if (!liveIds.has(id)) this._dismissEl(el, this._distractionEls, id);
    }

    for (const distraction of state.distractions) {
      let el = this._distractionEls.get(distraction.id);
      if (!el) {
        el = this._createDistractionEl(distraction);
        this._distractionEls.set(distraction.id, el);
        this.els.distractions.appendChild(el);
      }
      el.style.left = `${distraction.x * 100}%`;
      el.style.top = `${distraction.y * 100}%`;
    }
  }

  _createDistractionEl(distraction) {
    const el = document.createElement("div");
    el.className =
      `distraction distraction--${distraction.type} ` +
      `distraction--${distraction.tone} distraction--enter`;
    el.dataset.distractionId = distraction.id;

    if (distraction.type === "popup") {
      el.innerHTML = `
        <div class="popup__bar">${distraction.label}<span class="popup__x">x</span></div>
        <div class="popup__body">
          <span class="distraction__glyph">${distraction.glyph}</span>
          Actualizacion requerida
          <button class="popup__ok">OK</button>
        </div>`;
    } else {
      const label = distraction.label
        ? `<span class="distraction__label">${distraction.label}</span>`
        : "";
      el.innerHTML = `<span class="distraction__glyph">${distraction.glyph}</span>${label}`;
    }

    const clear = (e) => {
      e.stopPropagation();
      this.game.clearDistraction(distraction.id);
    };
    el.addEventListener("pointerdown", clear);
    setTimeout(() => el.classList.remove("distraction--enter"), 20);
    return el;
  }

  // Anima la salida y luego quita el elemento del DOM y del mapa.
  _dismissEl(el, map, id) {
    map.delete(id);
    el.classList.add("is-leaving");
    el.style.pointerEvents = "none";
    setTimeout(() => el.remove(), 220);
  }

  // --- Efectos (Fase 5) ---

  // Posicion en % del reporte segun su avance, aunque ya no este en el estado.
  _reportPos(report) {
    const progress = clamp01(1 - report.remainingTime / report.timeLimit);
    const posProgress = Math.min(progress, 0.94);
    const tx = report.targetX ?? CENTER.x;
    const ty = report.targetY ?? CENTER.y;
    return {
      x: lerp(report.spawnX, tx, posProgress) * 100,
      y: lerp(report.spawnY, ty, posProgress) * 100,
    };
  }

  _onReportDone({ report, gained }) {
    const p = this._reportPos(report);
    this.effects.burst(p.x, p.y, "good");
    this.effects.floater(p.x, p.y, `+${gained}`, "good");
  }

  _onReportLost({ report }) {
    const p = this._reportPos(report);
    this.effects.burst(p.x, p.y, "expire", 7);
  }

  _onInputError() {
    this._shakeActive();
    const report = this.game.reportManager.getReport(this.game.state.activeReportId);
    const p = report ? this._reportPos(report) : { x: CENTER.x * 100, y: CENTER.y * 100 };
    this.effects.burst(p.x, p.y, "bad", 6);
  }

  _onDistractionGone({ distraction, cleared }) {
    if (!cleared) return; // las que se van solas no dejan efecto
    this.effects.burst(distraction.x * 100, distraction.y * 100, "pop", 7);
  }

  // Efecto de pantalla cuando una distraccion toca al personaje.
  _screenEffect({ effect, ms }) {
    if (effect === "black") {
      this.els.screenblack.hidden = false;
      clearTimeout(this._blackTimer);
      this._blackTimer = setTimeout(() => {
        this.els.screenblack.hidden = true;
      }, ms);
    } else {
      this.els.office.classList.add("office--blur");
      clearTimeout(this._blurTimer);
      this._blurTimer = setTimeout(() => {
        this.els.office.classList.remove("office--blur");
      }, ms);
    }
  }

  _clearScreenEffects() {
    clearTimeout(this._blurTimer);
    clearTimeout(this._blackTimer);
    this.els.office.classList.remove("office--blur");
    this.els.screenblack.hidden = true;
  }

  _renderClock(state) {
    const show =
      state.status === GameStatus.PLAYING ||
      state.status === GameStatus.PAUSED ||
      state.status === GameStatus.BREAK;
    this.els.clock.hidden = !show;
    if (!show) return;

    setText(this.els.clockTime, state.clock);
    const phase = GAME_CONFIG.schedule.phases.find((p) => p.id === state.phase);
    setText(this.els.clockPhase, phase ? phase.label : "");
    this.els.clock.classList.toggle("clock--rush", state.phase === "rush");
  }

  _renderTutorialBar(state) {
    const on = state.status === GameStatus.TUTORIAL;
    this.els.tutorialBar.hidden = !on;
    if (!on) return;

    const step = GAME_CONFIG.tutorial.steps[state.tutorialStep];
    if (!step) return;
    this.els.tutorialBar.className = `tutorial-bar tutorial-bar--${step.color}`;
    setText(this.els.tutTitle, step.title);
    setText(this.els.tutDesc, step.desc);
    setText(
      this.els.tutCount,
      `${state.tutorialProgress} / ${GAME_CONFIG.tutorial.requiredPerStep}`,
    );
  }

  _renderOverlay(state) {
    const { status } = state;
    if (status === GameStatus.PLAYING || status === GameStatus.TUTORIAL) {
      this.els.overlay.hidden = true;
      return;
    }

    this.els.overlay.hidden = false;
    if (status === GameStatus.MENU) {
      this.els.overlayPanel.innerHTML = `
        <h1>OFFICE PANIC</h1>
        <p>Trabajas turnos de 9 a 5. Cada color de carpeta es un reto distinto.
        Escribe su palabra antes de que te alcance y quita las distracciones con click.</p>
        <p class="overlay__hint">Empieza escribiendo &middot; el turno 1 arranca con un tutorial &middot; Esc pausa</p>
        <button data-action="start">FICHAR</button>
        <p class="overlay__hint">o pulsa Enter</p>
      `;
    } else if (status === GameStatus.PAUSED) {
      this.els.overlayPanel.innerHTML = `
        <h1>PAUSA</h1>
        <button data-action="resume">CONTINUAR</button>
        <p class="overlay__hint">o pulsa Esc</p>
      `;
    } else if (status === GameStatus.BREAK) {
      this.els.overlayPanel.innerHTML = `
        <h1>FIN DEL TURNO ${state.shift}</h1>
        <p>Buen trabajo. Te tomas un descanso.</p>
        <p class="overlay__score">${state.score} puntos</p>
        <p class="overlay__hint">Productividad restaurada al 100%</p>
        <button data-action="next">SIGUIENTE TURNO</button>
        <p class="overlay__hint">o pulsa Enter</p>
      `;
    } else if (status === GameStatus.GAME_OVER) {
      this.els.overlayPanel.innerHTML = `
        <h1>DESPEDIDO</h1>
        <p>Tu productividad llego a cero en el turno ${state.shift}.</p>
        <p class="overlay__score">${state.score} puntos</p>
        <button data-action="restart">REINTENTAR</button>
        <p class="overlay__hint">o pulsa Enter</p>
      `;
    }

    const button = this.els.overlayPanel.querySelector("button");
    if (button) {
      button.addEventListener("click", () => {
        const action = button.dataset.action;
        if (action === "resume") this.game.togglePause();
        else if (action === "next") this.game.nextShift();
        else this.game.start();
      });
    }
  }

  _shakeActive() {
    const el = this._reportEls.get(this.game.state.activeReportId);
    if (!el) return;
    el.classList.remove("report--shake");
    void el.offsetWidth;
    el.classList.add("report--shake");
  }

  _shakeScreen() {
    this.els.stage.classList.remove("stage--shake");
    void this.els.stage.offsetWidth;
    this.els.stage.classList.add("stage--shake");
  }
}

function setText(el, value) {
  const text = String(value);
  if (el.textContent !== text) el.textContent = text;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
