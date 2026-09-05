import { GAME_CONFIG, comboMultiplier } from "../config.js";
import { ReportManager } from "./ReportManager.js";
import { ModifierSystem } from "./ModifierSystem.js";
import { DifficultySystem } from "./DifficultySystem.js";
import { DistractionManager } from "./DistractionManager.js";

export const GameStatus = {
  MENU: "MENU",
  PLAYING: "PLAYING",
  PAUSED: "PAUSED",
  GAME_OVER: "GAME_OVER",
};

// Controlador principal. Centraliza el estado y coordina los sistemas.
// Emite "change" tras cada actualizacion para que la UI se refresque, e
// "inputError" / "hit" para feedback puntual (shake, sonido en fases futuras).
export class Game extends EventTarget {
  constructor() {
    super();
    this.state = createInitialState();

    this.modifierSystem = new ModifierSystem();
    this.difficulty = new DifficultySystem();
    this.reportManager = new ReportManager(this.state, this.modifierSystem);
    this.distractionManager = new DistractionManager(this.state);

    this._rafId = null;
    this._lastFrame = 0;
    this._loop = this._loop.bind(this);
    this._onKeyDown = this._onKeyDown.bind(this);

    this.reportManager.addEventListener("reportCompleted", (e) =>
      this._onReportCompleted(e.detail),
    );
    this.reportManager.addEventListener("reportExpired", () =>
      this._onReportExpired(),
    );
    this.distractionManager.addEventListener("distractionCleared", () =>
      this._onDistractionCleared(),
    );
    this.distractionManager.addEventListener("distractionMissed", () =>
      this._onDistractionMissed(),
    );
  }

  start() {
    this.stop();
    this.state = createInitialState();
    this.state.status = GameStatus.PLAYING;
    this.reportManager.reset(this.state);
    this.distractionManager.reset(this.state);
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

  clearDistraction(id) {
    if (this.state.status !== GameStatus.PLAYING) return;
    this.distractionManager.clear(id);
    this._emitChange();
  }

  _loop(now) {
    const deltaTime = Math.min((now - this._lastFrame) / 1000, 0.1);
    this._lastFrame = now;

    if (this.state.status === GameStatus.PLAYING) {
      this.state.elapsedTime += deltaTime;
      this._applyDifficulty();
      this.reportManager.update(deltaTime);
      this.distractionManager.update(deltaTime);
      if (!this.reportManager.getReport(this.state.activeReportId)) {
        this._selectNextReport();
      }
      this._emitChange();
    }

    this._rafId = requestAnimationFrame(this._loop);
  }

  _applyDifficulty() {
    const level = this.difficulty.levelFor(this.state.elapsedTime);
    this.state.level = level;

    const params = this.difficulty.paramsFor(level);
    this.reportManager.spawnInterval = params.spawnInterval;
    this.reportManager.reportTime = params.reportTime;
    this.reportManager.maxActiveReports = params.maxActiveReports;
    this.distractionManager.spawnInterval = params.distractionInterval;
    this.distractionManager.enabled = params.distractionsEnabled;
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
    const multiplier = comboMultiplier(this.state.combo);
    this.state.score += (report.points + speedBonus) * multiplier;
    this.state.combo += 1;
    this._selectNextReport();
    this.dispatchEvent(new CustomEvent("reportDone", { detail: { report } }));
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

  _onDistractionCleared() {
    this.state.score += GAME_CONFIG.distractionClearPoints;
  }

  _onDistractionMissed() {
    this._applyProductivityHit(GAME_CONFIG.penalties.distractionMissed);
  }

  _applyProductivityHit(amount) {
    this.state.productivity = Math.max(0, this.state.productivity - amount);
    this.dispatchEvent(new CustomEvent("hit"));
    if (this.state.productivity <= 0) this._gameOver();
  }

  _gameOver() {
    this.state.status = GameStatus.GAME_OVER;
    this.reportManager.clear();
    this.distractionManager.clearAll();
    window.removeEventListener("keydown", this._onKeyDown);
    this._emitChange();
  }

  // El reporte activo por defecto es el mas urgente (el que antes llega al centro).
  _selectNextReport() {
    let next = null;
    for (const report of this.state.reports) {
      if (report.status !== "pending") continue;
      if (!next || report.remainingTime < next.remainingTime) next = report;
    }
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
    distractions: [],
    activeReportId: null,
    currentInput: "",
    elapsedTime: 0,
  };
}
