import { GameStatus } from "../game/Game.js";
import { comboMultiplier } from "../config.js";
import { getModifier } from "../data/modifiers.js";

// Refleja el estado del juego en el DOM. Actualiza solo lo que cambia:
// mantiene mapas id -> elemento para reportes y distracciones y refresca
// textos / posiciones en sitio, sin re-renderizar todo cada frame.
export class GameUI {
  constructor(game, root) {
    this.game = game;
    this.root = root;
    this._reportEls = new Map();
    this._distractionEls = new Map();
    this._build();

    this.game.addEventListener("change", (e) => this.render(e.detail));
    this.game.addEventListener("inputError", () => this._shakeActive());
    this.game.addEventListener("hit", () => this._shakeScreen());

    document.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      const status = this.game.state.status;
      if (status === GameStatus.MENU || status === GameStatus.GAME_OVER) {
        this.game.start();
      }
    });

    this.render(this.game.state);
  }

  _build() {
    this.root.innerHTML = `
      <div class="hud">
        <div class="hud__stat"><span class="hud__label">PUNTOS</span><span data-hud="score">0</span></div>
        <div class="hud__stat"><span class="hud__label">COMBO</span><span data-hud="combo">x1</span></div>
        <div class="hud__stat"><span class="hud__label">NIVEL</span><span data-hud="level">1</span></div>
        <div class="hud__stat hud__stat--prod">
          <span class="hud__label">PRODUCTIVIDAD</span>
          <span><span data-hud="productivity">100</span>%</span>
          <div class="prod-bar"><div class="prod-bar__fill" data-hud="prodbar"></div></div>
        </div>
      </div>

      <div class="office" data-region="office">
        <div class="office__scene" aria-hidden="true">
          <div class="office__window"><div class="office__sky"></div></div>
          <div class="office__plant"></div>
          <div class="office__deskline"></div>
        </div>
        <div class="reports" data-region="reports"></div>
        <div class="distractions" data-region="distractions"></div>
      </div>

      <div class="overlay" data-region="overlay" hidden>
        <div class="overlay__panel" data-region="overlay-panel"></div>
      </div>
    `;

    this.els = {
      score: this.root.querySelector('[data-hud="score"]'),
      combo: this.root.querySelector('[data-hud="combo"]'),
      level: this.root.querySelector('[data-hud="level"]'),
      productivity: this.root.querySelector('[data-hud="productivity"]'),
      prodbar: this.root.querySelector('[data-hud="prodbar"]'),
      office: this.root.querySelector('[data-region="office"]'),
      reports: this.root.querySelector('[data-region="reports"]'),
      distractions: this.root.querySelector('[data-region="distractions"]'),
      overlay: this.root.querySelector('[data-region="overlay"]'),
      overlayPanel: this.root.querySelector('[data-region="overlay-panel"]'),
    };
  }

  render(state) {
    setText(this.els.score, state.score);
    setText(this.els.combo, `x${comboMultiplier(state.combo)}`);
    setText(this.els.level, state.level);
    setText(this.els.productivity, Math.ceil(state.productivity));
    this.els.prodbar.style.width = `${Math.max(0, state.productivity)}%`;
    this.els.prodbar.classList.toggle("prod-bar__fill--low", state.productivity <= 30);
    this.els.combo.parentElement.classList.toggle("hud__stat--hot", state.combo >= 5);

    this._renderReports(state);
    this._renderDistractions(state);
    this._renderOverlay(state);
  }

  _renderReports(state) {
    const liveIds = new Set(state.reports.map((r) => r.id));

    for (const [id, el] of this._reportEls) {
      if (!liveIds.has(id)) {
        this._dismissEl(el, this._reportEls, id);
      }
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

      const typed = isActive ? state.currentInput : "";
      const rest = report.expectedInput.slice(typed.length);
      el.querySelector(".report__typed").textContent = typed;
      el.querySelector(".report__rest").textContent = rest;
      el.querySelector(".report__timer").textContent =
        `${report.remainingTime.toFixed(1)}s`;

      const ratio = report.remainingTime / report.timeLimit;
      el.querySelector(".report__timerbar-fill").style.width = `${Math.max(0, ratio) * 100}%`;
      el.classList.toggle("report--urgent", ratio < 0.3);
    }
  }

  _createReportEl(report) {
    const modifier = getModifier(report.modifier);
    const el = document.createElement("div");
    el.className = "report report--enter";
    el.dataset.reportId = report.id;
    el.innerHTML = `
      <div class="report__head">
        <span>${report.id.toUpperCase()}</span>
        <span class="report__modifier modifier--${modifier.color}">${modifier.label}</span>
      </div>
      <div class="report__word">${report.word}</div>
      <div class="report__input">
        <span class="report__typed"></span><span class="report__rest"></span>
      </div>
      <div class="report__timer">0.0s</div>
      <div class="report__timerbar"><div class="report__timerbar-fill"></div></div>
    `;
    el.addEventListener("pointerdown", () => this.game.setActiveReport(report.id));
    setTimeout(() => el.classList.remove("report--enter"), 20);
    return el;
  }

  _renderDistractions(state) {
    const liveIds = new Set(state.distractions.map((d) => d.id));

    for (const [id, el] of this._distractionEls) {
      if (!liveIds.has(id)) {
        this._dismissEl(el, this._distractionEls, id);
      }
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
    el.className = `distraction distraction--${distraction.type} distraction--enter`;
    el.dataset.distractionId = distraction.id;

    if (distraction.type === "popup") {
      el.innerHTML = `
        <div class="popup__bar">SYSTEM MESSAGE <span class="popup__x">x</span></div>
        <div class="popup__body">${distraction.glyph} Actualizacion requerida
          <button class="popup__ok">OK</button>
        </div>`;
    } else if (distraction.type === "notification") {
      el.innerHTML = `<span class="distraction__glyph">${distraction.glyph}</span> Nueva notificacion`;
    } else {
      el.innerHTML = `<span class="distraction__glyph">${distraction.glyph}</span>`;
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

  _renderOverlay(state) {
    const { status } = state;
    if (status === GameStatus.PLAYING) {
      this.els.overlay.hidden = true;
      return;
    }

    this.els.overlay.hidden = false;
    if (status === GameStatus.MENU) {
      this.els.overlayPanel.innerHTML = `
        <h1>OFFICE PANIC</h1>
        <p>Procesa los reportes escribiendo su palabra antes de que expiren.
        Ojo con los modificadores y las distracciones.</p>
        <p class="overlay__hint">Escribe directo &middot; Click en un reporte para enfocarlo &middot; Esc para pausar</p>
        <button data-action="start">INICIAR</button>
        <p class="overlay__hint">o pulsa Enter</p>
      `;
    } else if (status === GameStatus.PAUSED) {
      this.els.overlayPanel.innerHTML = `
        <h1>PAUSA</h1>
        <button data-action="resume">CONTINUAR</button>
        <p class="overlay__hint">o pulsa Esc</p>
      `;
    } else if (status === GameStatus.GAME_OVER) {
      this.els.overlayPanel.innerHTML = `
        <h1>DESPEDIDO</h1>
        <p>Tu productividad llego a cero.</p>
        <p class="overlay__score">${state.score} puntos &middot; nivel ${state.level}</p>
        <button data-action="restart">REINTENTAR</button>
        <p class="overlay__hint">o pulsa Enter</p>
      `;
    }

    const button = this.els.overlayPanel.querySelector("button");
    if (button) {
      button.addEventListener("click", () => {
        if (button.dataset.action === "resume") this.game.togglePause();
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
    this.els.office.classList.remove("office--shake");
    void this.els.office.offsetWidth;
    this.els.office.classList.add("office--shake");
  }
}

function setText(el, value) {
  const text = String(value);
  if (el.textContent !== text) el.textContent = text;
}
