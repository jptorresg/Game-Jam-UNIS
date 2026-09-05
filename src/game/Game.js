import { GAME_CONFIG } from "../config.js";
import { ReportManager } from "./ReportManager.js";

export const GameStatus = {
  MENU: "MENU",
  PLAYING: "PLAYING",
  PAUSED: "PAUSED",
  GAME_OVER: "GAME_OVER",
};

// Controlador principal. Centraliza el estado y coordina los sistemas.
// Emite "change" tras cada actualizacion para que la UI se refresque,
// e "inputError" para feedback puntual (shake / sonido en fases futuras).
export class Game extends EventTarget {
  constructor() {
    super();
    this.state = createInitialState();
    this.reportManager = new ReportManager(this.state);

    this._rafId = null;
    this._lastFrame = 0;
    this._loop = this._loop.bind(this);
    this._onKeyDown = this._onKeyDown.bind(this);

    this.reportManager.addEventListener("reportCompleted", (e) =>
      this._onReportCompleted(e.detail),
    );
    this.reportManager.addEventListener("reportExpired", (e) =>
      this._onReportExpired(e.detail),
    );
  }

  start() {
    this.stop();
    this.state = createInitialState();
    this.state.status = GameStatus.PLAYING;
    this.reportManager.reset(this.state);
    this._selectNextReport();

    window.addEventListener("keydown", this._onKeyDown);
    this._lastFrame = performance.now();
    this._rafId = requestAnimationFrame(this._loop);
    this._emitChange();
  }

  restart() {
    this.start();
  }

  stop() {
    if (this._rafId !== null) cancelAnimationFrame(this._rafId);
    this._rafId = null;
    window.removeEventListener("keydown", this._onKeyDown);
  }

  togglePause() {
    if (this.state.status === GameStatus.PLAYING) {
      this.state.status = GameStatus.PAUSED;
    } else if (this.state.status === GameStatus.PAUSED) {
      this.state.status = GameStatus.PLAYING;
      this._lastFrame = performance.now(); // evita un salto de deltaTime al reanudar
    }
    this._emitChange();
  }

  // Seleccion del reporte activo (via click desde la UI en el MVP).
  setActiveReport(id) {
    if (this.reportManager.getReport(id)) {
      this.state.activeReportId = id;
      this.state.currentInput = "";
      this._emitChange();
    }
  }

  _loop(now) {
    const deltaTime = Math.min((now - this._lastFrame) / 1000, 0.1);
    this._lastFrame = now;

    if (this.state.status === GameStatus.PLAYING) {
      this.state.elapsedTime += deltaTime;
      this.reportManager.update(deltaTime);
      if (!this.reportManager.getReport(this.state.activeReportId)) {
        this._selectNextReport();
      }
      this._emitChange();
    }

    this._rafId = requestAnimationFrame(this._loop);
  }

  _onKeyDown(event) {
    if (this.state.status !== GameStatus.PLAYING) return;

    if (event.key === "Escape") {
      this.togglePause();
      return;
    }

    const report = this.reportManager.getReport(this.state.activeReportId);
    if (!report) return;

    if (event.key === "Backspace") {
      this.state.currentInput = this.state.currentInput.slice(0, -1);
      this._emitChange();
      return;
    }

    // Ignorar teclas que no producen un caracter (Shift, flechas, Tab...).
    if (event.key.length !== 1) return;

    const nextInput = this.state.currentInput + event.key;
    if (report.expectedInput.startsWith(nextInput)) {
      this.state.currentInput = nextInput;
      if (nextInput === report.expectedInput) {
        this.reportManager.completeReport(report.id);
        this.state.currentInput = "";
      }
    } else {
      this._onInputError();
    }
    this._emitChange();
  }

  _onReportCompleted({ report, remainingRatio }) {
    const speedBonus = Math.round(GAME_CONFIG.speedBonusMax * remainingRatio);
    this.state.score += report.points + speedBonus;
    this.state.combo += 1;
    this._selectNextReport();
  }

  _onReportExpired() {
    this.state.combo = 0;
    this._applyProductivityHit(GAME_CONFIG.penalties.reportExpired);
    this._selectNextReport();
  }

  _onInputError() {
    if (GAME_CONFIG.comboResetOnError) this.state.combo = 0;
    this._applyProductivityHit(GAME_CONFIG.penalties.inputError);
    this.dispatchEvent(new CustomEvent("inputError"));
  }

  _applyProductivityHit(amount) {
    this.state.productivity = Math.max(0, this.state.productivity - amount);
    if (this.state.productivity <= 0) this._gameOver();
  }

  _gameOver() {
    this.state.status = GameStatus.GAME_OVER;
    this.reportManager.clear();
    window.removeEventListener("keydown", this._onKeyDown);
    this._emitChange();
  }

  _selectNextReport() {
    const next = this.state.reports.find((r) => r.status === "pending");
    this.state.activeReportId = next ? next.id : null;
    this.state.currentInput = "";
  }

  _emitChange() {
    this.dispatchEvent(new CustomEvent("change", { detail: this.state }));
  }
}

function createInitialState() {
  return {
    status: GameStatus.MENU,
    score: 0,
    combo: 0,
    productivity: GAME_CONFIG.initialProductivity,
    level: 1,
    reports: [],
    activeReportId: null,
    currentInput: "",
    elapsedTime: 0,
  };
}
