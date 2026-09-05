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
    this.reportManager.addEventListener("reportExpired", (e) =>
      this._onReportExpired(e.detail.report),
    );
    this.distractionManager.addEventListener("distractionCleared", (e) =>
      this._onDistractionCleared(e.detail.distraction),
    );
    this.distractionManager.addEventListener("distractionMissed", (e) =>
      this._onDistractionMissed(e.detail.distraction),
    );
  }

  start() {
    this.stop();
    this.state = createInitialState();
    this.state.status = GameStatus.PLAYING;
    this.reportManager.reset(this.state);
    this.distractionManager.reset(this.state);
    this._releaseTarget();

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

  // Enfocar un reporte con click (opcional). Estilo ZType: normalmente no hace
  // falta, la primera tecla ya elige objetivo. No permite cambiar de objetivo
  // a media palabra.
  setActiveReport(id) {
    if (this.state.currentInput !== "") return;
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
      if (
        this.state.activeReportId &&
        !this.reportManager.getReport(this.state.activeReportId)
      ) {
        this._releaseTarget(); // el objetivo desaparecio (expiro)
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

    let report = this.reportManager.getReport(this.state.activeReportId);

    if (event.key === "Backspace") {
      if (report) {
        this.state.currentInput = this.state.currentInput.slice(0, -1);
        this._emitChange();
      }
      return;
    }

    // Ignorar teclas que no producen un caracter (Shift, flechas, Tab...).
    if (event.key.length !== 1) return;

    // Sin objetivo: la primera tecla engancha el reporte que empiece por ella
    // (el mas urgente si hay varios). Estilo ZType.
    if (!report) {
      report = this._lockOnByKey(event.key);
      if (!report) return; // ninguna palabra en pantalla empieza asi
      this.state.activeReportId = report.id;
      this.state.currentInput = "";
    }

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

  // Reporte pendiente mas urgente cuya respuesta esperada empiece con `key`.
  _lockOnByKey(key) {
    let best = null;
    for (const report of this.state.reports) {
      if (report.status !== "pending") continue;
      if (report.expectedInput[0] !== key) continue;
      if (!best || report.remainingTime < best.remainingTime) best = report;
    }
    return best;
  }

  _onReportCompleted({ report, remainingRatio }) {
    const speedBonus = Math.round(GAME_CONFIG.speedBonusMax * remainingRatio);
    const prevMultiplier = comboMultiplier(this.state.combo);
    const gained = (report.points + speedBonus) * prevMultiplier;
    this.state.score += gained;
    this.state.combo += 1;

    const multiplier = comboMultiplier(this.state.combo);
    if (multiplier > prevMultiplier) {
      this.dispatchEvent(
        new CustomEvent("comboUp", { detail: { multiplier } }),
      );
    }

    this._releaseTarget();
    this.dispatchEvent(
      new CustomEvent("reportDone", { detail: { report, gained } }),
    );
  }

  _onReportExpired(report) {
    this.state.combo = 0;
    this._applyProductivityHit(GAME_CONFIG.penalties.reportExpired);
    if (this.state.activeReportId === report.id) this._releaseTarget();
    this.dispatchEvent(new CustomEvent("reportLost", { detail: { report } }));
  }

  _onInputError() {
    if (GAME_CONFIG.comboResetOnError) this.state.combo = 0;
    this._applyProductivityHit(GAME_CONFIG.penalties.inputError);
    this.dispatchEvent(new CustomEvent("inputError"));
  }

  _onDistractionCleared(distraction) {
    this.state.score += GAME_CONFIG.distractionClearPoints;
    this.dispatchEvent(
      new CustomEvent("distractionGone", {
        detail: { distraction, cleared: true },
      }),
    );
  }

  _onDistractionMissed(distraction) {
    this._applyProductivityHit(GAME_CONFIG.penalties.distractionMissed);
    this.dispatchEvent(
      new CustomEvent("distractionGone", {
        detail: { distraction, cleared: false },
      }),
    );
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

  // Suelta el objetivo actual. La siguiente palabra se elige con la primera tecla.
  _releaseTarget() {
    this.state.activeReportId = null;
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
