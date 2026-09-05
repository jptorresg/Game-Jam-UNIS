import { GameStatus } from "../game/Game.js";

// Refleja el estado del juego en el DOM. Actualiza solo lo que cambia:
// mantiene un mapa id -> elemento de reporte y refresca textos en sitio.
export class GameUI {
  constructor(game, root) {
    this.game = game;
    this.root = root;
    this._reportEls = new Map();
    this._build();

    this.game.addEventListener("change", (e) => this.render(e.detail));
    this.game.addEventListener("inputError", () => this._shakeActive());

    // Enter para empezar / reiniciar desde menu o game over.
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
        <div class="hud__stat"><span class="hud__label">COMBO</span><span data-hud="combo">0</span></div>
        <div class="hud__stat"><span class="hud__label">NIVEL</span><span data-hud="level">1</span></div>
        <div class="hud__stat hud__stat--prod">
          <span class="hud__label">PRODUCTIVIDAD</span>
          <span data-hud="productivity">100</span>%
          <div class="prod-bar"><div class="prod-bar__fill" data-hud="prodbar"></div></div>
        </div>
      </div>

      <div class="reports" data-region="reports"></div>

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
      reports: this.root.querySelector('[data-region="reports"]'),
      overlay: this.root.querySelector('[data-region="overlay"]'),
      overlayPanel: this.root.querySelector('[data-region="overlay-panel"]'),
    };
  }

  render(state) {
    setText(this.els.score, state.score);
    setText(this.els.combo, `x${1 + Math.min(3, Math.floor(state.combo / 5))}`);
    setText(this.els.level, state.level);
    setText(this.els.productivity, Math.ceil(state.productivity));
    this.els.prodbar.style.width = `${Math.max(0, state.productivity)}%`;
    this.els.prodbar.classList.toggle("prod-bar__fill--low", state.productivity <= 30);

    this._renderReports(state);
    this._renderOverlay(state);
  }

  _renderReports(state) {
    const liveIds = new Set(state.reports.map((r) => r.id));

    // Quitar los que ya no existen.
    for (const [id, el] of this._reportEls) {
      if (!liveIds.has(id)) {
        el.remove();
        this._reportEls.delete(id);
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
        `${report.remainingTime.toFixed(2)}s`;

      const ratio = report.remainingTime / report.timeLimit;
      el.querySelector(".report__timerbar-fill").style.width = `${ratio * 100}%`;
      el.classList.toggle("report--urgent", ratio < 0.3);
    }
  }

  _createReportEl(report) {
    const el = document.createElement("div");
    el.className = "report";
    el.dataset.reportId = report.id;
    el.innerHTML = `
      <div class="report__head">${report.id.toUpperCase()}</div>
      <div class="report__word">
        <span class="report__typed"></span><span class="report__rest"></span>
      </div>
      <div class="report__timer">0.00s</div>
      <div class="report__timerbar"><div class="report__timerbar-fill"></div></div>
    `;
    el.addEventListener("pointerdown", () => this.game.setActiveReport(report.id));
    return el;
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
        <p>Escribe la palabra de cada reporte antes de que se acabe el tiempo.</p>
        <p class="overlay__hint">Click en un reporte para enfocarlo &middot; Esc para pausar</p>
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
        <p class="overlay__score">${state.score} puntos</p>
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
    void el.offsetWidth; // reinicia la animacion
    el.classList.add("report--shake");
  }
}

function setText(el, value) {
  const text = String(value);
  if (el.textContent !== text) el.textContent = text;
}
