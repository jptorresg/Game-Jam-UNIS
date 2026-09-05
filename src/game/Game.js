import { GAME_CONFIG, comboMultiplier } from "../config.js";
import { randomWord } from "../data/words.js";
import { ReportManager } from "./ReportManager.js";
import { ModifierSystem } from "./ModifierSystem.js";
import { DifficultySystem } from "./DifficultySystem.js";
import { DistractionManager } from "./DistractionManager.js";
import { Schedule } from "./Schedule.js";

export const GameStatus = {
  MENU: "MENU",
  TUTORIAL: "TUTORIAL",
  PLAYING: "PLAYING",
  PAUSED: "PAUSED",
  BREAK: "BREAK",
  GAME_OVER: "GAME_OVER",
};

// Posiciones fijas de las carpetas del tutorial (no se mueven).
const TUTORIAL_SLOTS = [
  { x: 0.3, y: 0.3 },
  { x: 0.7, y: 0.3 },
];

// Controlador principal. Centraliza el estado y coordina los sistemas.
// La partida son turnos de 9:00 a 5:00 (reloj en Schedule). El turno 1 arranca
// con un tutorial guiado de los 4 colores de carpeta.
export class Game extends EventTarget {
  constructor() {
    super();
    this.state = createInitialState();

    this.modifierSystem = new ModifierSystem();
    this.difficulty = new DifficultySystem();
    this.schedule = new Schedule();
    this.reportManager = new ReportManager(this.state, this.modifierSystem);
    this.distractionManager = new DistractionManager(this.state);

    this._rafId = null;
    this._lastFrame = 0;
    this._tutorialDone = false;
    this._lastPhase = null;
    this._tutId = 1;
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
    this.distractionManager.addEventListener("distractionExpired", (e) =>
      this._onDistractionExpired(e.detail.distraction),
    );
    this.distractionManager.addEventListener("distractionHit", (e) =>
      this._onDistractionHit(e.detail),
    );
  }

  // Nueva partida desde el menu: turno 1 con tutorial (si no se ha visto).
  start() {
    this.stop();
    this.state = createInitialState();
    if (this._tutorialDone) {
      this._beginShift(1);
    } else {
      this._beginTutorial();
    }
  }

  // Reintento tras game over: salta el tutorial y va directo al turno 1.
  restart() {
    this._tutorialDone = true;
    this.start();
  }

  // Desde la pantalla de descanso: siguiente turno (mantiene el score).
  nextShift() {
    if (this.state.status !== GameStatus.BREAK) return;
    this._beginShift(this.state.shift + 1);
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
  // falta, la primera tecla ya elige objetivo. No cambia de objetivo a media palabra.
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

  // ---------- Ciclo de vida ----------

  _run() {
    window.addEventListener("keydown", this._onKeyDown);
    this._lastFrame = performance.now();
    if (this._rafId === null) this._rafId = requestAnimationFrame(this._loop);
  }

  _beginTutorial() {
    this.state.status = GameStatus.TUTORIAL;
    this.state.tutorialStep = 0;
    this.state.tutorialProgress = 0;
    this._tutId = 1;
    this.reportManager.clearOnly(this.state);
    this._run();
    this._emitChange();
  }

  _advanceTutorial() {
    this.state.tutorialStep += 1;
    this.state.tutorialProgress = 0;
    this.state.reports.length = 0;
    this._releaseTarget();

    if (this.state.tutorialStep >= GAME_CONFIG.tutorial.steps.length) {
      this._tutorialDone = true;
      this._beginShift(1);
    } else {
      this.dispatchEvent(
        new CustomEvent("tutorialStep", {
          detail: { step: this.state.tutorialStep },
        }),
      );
    }
  }

  _beginShift(n) {
    this.state.status = GameStatus.PLAYING;
    this.state.shift = n;
    this.state.combo = 0;
    this.state.productivity = GAME_CONFIG.initialProductivity; // 100% cada turno
    this.state.reports.length = 0;
    this.state.distractions.length = 0;

    this.schedule.resetShift();
    this.state.clock = this.schedule.label;
    this.state.phase = this.schedule.phase.id;
    this._lastPhase = this.schedule.phase.id;

    this.reportManager.clearOnly(this.state);
    this.reportManager.allowedModifiers = this.schedule.phase.modifiers;
    this.distractionManager.reset(this.state);
    this._releaseTarget();

    this.reportManager.spawnReport(); // arrancar con una carpeta visible
    this._run();
    this._emitChange();
  }

  _endShift() {
    this.state.status = GameStatus.BREAK;
    this.reportManager.clearOnly(this.state);
    this.distractionManager.clearAll();
    this._releaseTarget();
    window.removeEventListener("keydown", this._onKeyDown);
    this.dispatchEvent(
      new CustomEvent("phaseChange", { detail: { banner: "FIN DEL TURNO" } }),
    );
    this._emitChange();
  }

  _gameOver() {
    this.state.status = GameStatus.GAME_OVER;
    this.reportManager.clear();
    this.distractionManager.clearAll();
    window.removeEventListener("keydown", this._onKeyDown);
    this._emitChange();
  }

  // ---------- Bucle ----------

  _loop(now) {
    const deltaTime = Math.min((now - this._lastFrame) / 1000, 0.1);
    this._lastFrame = now;

    if (this.state.status === GameStatus.PLAYING) {
      this._updateShift(deltaTime);
    } else if (this.state.status === GameStatus.TUTORIAL) {
      this._updateTutorial();
      this._emitChange();
    }

    this._rafId = requestAnimationFrame(this._loop);
  }

  _updateShift(deltaTime) {
    this.state.elapsedTime += deltaTime;
    this.schedule.update(deltaTime);
    this.state.clock = this.schedule.label;

    const phase = this.schedule.phase;
    if (phase.id !== this._lastPhase) {
      this._lastPhase = phase.id;
      const banner = GAME_CONFIG.schedule.banners[phase.id];
      if (banner) {
        this.dispatchEvent(new CustomEvent("phaseChange", { detail: { banner } }));
      }
    }
    this.state.phase = phase.id;

    if (this.schedule.shiftOver) {
      this._endShift();
      return;
    }

    this._applyDifficulty();
    this.reportManager.update(deltaTime);
    this.distractionManager.update(deltaTime);
    if (
      this.state.activeReportId &&
      !this.reportManager.getReport(this.state.activeReportId)
    ) {
      this._releaseTarget();
    }
    this._emitChange();
  }

  // Durante el tutorial solo hay 2 carpetas fijas del color que se esta ensenando.
  _updateTutorial() {
    const step = GAME_CONFIG.tutorial.steps[this.state.tutorialStep];
    if (!step) return;

    const pending = this.state.reports.filter((r) => r.status === "pending");
    const remaining =
      GAME_CONFIG.tutorial.requiredPerStep - this.state.tutorialProgress;
    const wantOnScreen = Math.min(TUTORIAL_SLOTS.length, remaining);
    if (pending.length >= wantOnScreen) return;

    const usedSlots = new Set(pending.map((r) => r._slot));
    for (let i = 0; i < TUTORIAL_SLOTS.length && pending.length < wantOnScreen; i++) {
      if (usedSlots.has(i)) continue;
      pending.push(this._spawnTutorialReport(step.modifier, i, pending));
    }
  }

  _spawnTutorialReport(modifierId, slot, existing) {
    const modifier = this.modifierSystem.getById(modifierId);
    const pos = TUTORIAL_SLOTS[slot];
    let word = randomWord();
    let expected = modifier.transform(word);
    for (let a = 0; a < 20; a++) {
      const clash = existing.some(
        (r) => r.expectedInput[0].toLowerCase() === expected[0].toLowerCase(),
      );
      if (!clash) break;
      word = randomWord();
      expected = modifier.transform(word);
    }
    const report = {
      id: `tut-${this._tutId++}`,
      word,
      modifier: modifierId,
      expectedInput: expected,
      timeLimit: 1,
      remainingTime: 1,
      status: "pending",
      points: 0,
      spawnX: pos.x,
      spawnY: pos.y,
      targetX: pos.x,
      targetY: pos.y,
      tutorial: true,
      _slot: slot,
    };
    this.state.reports.push(report);
    return report;
  }

  _applyDifficulty() {
    const phase = this.schedule.phase;
    const hoursIn = this.schedule.hour - GAME_CONFIG.schedule.startHour;
    const level = (this.state.shift - 1) * 4 + hoursIn;
    this.state.level = Math.floor(level);

    const params = this.difficulty.paramsFor(level);
    this.reportManager.spawnInterval = params.spawnInterval;
    this.reportManager.reportTime = params.reportTime;
    this.reportManager.maxActiveReports = params.maxActiveReports;
    this.reportManager.allowedModifiers = phase.modifiers;

    this.distractionManager.spawnInterval = params.distractionInterval;
    this.distractionManager.enabled = phase.distractions;
  }

  // ---------- Input ----------

  _onKeyDown(event) {
    const status = this.state.status;
    if (status !== GameStatus.PLAYING && status !== GameStatus.TUTORIAL) return;

    if (event.key === "Escape") {
      if (status === GameStatus.PLAYING) this.togglePause();
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
      if (!report) return;
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
    } else if (!report.tutorial) {
      this._onInputError();
    } else {
      this.dispatchEvent(new CustomEvent("inputError")); // solo feedback, sin castigo
    }
    this._emitChange();
  }

  _lockOnByKey(key) {
    let best = null;
    for (const report of this.state.reports) {
      if (report.status !== "pending") continue;
      if (report.expectedInput[0] !== key) continue;
      if (!best || report.remainingTime < best.remainingTime) best = report;
    }
    return best;
  }

  // ---------- Eventos de sistemas ----------

  _onReportCompleted({ report, remainingRatio }) {
    if (report.tutorial) {
      this.state.tutorialProgress += 1;
      this._releaseTarget();
      this.dispatchEvent(
        new CustomEvent("reportDone", { detail: { report, gained: 0 } }),
      );
      if (
        this.state.tutorialProgress >= GAME_CONFIG.tutorial.requiredPerStep
      ) {
        this._advanceTutorial();
      }
      return;
    }

    const speedBonus = Math.round(GAME_CONFIG.speedBonusMax * remainingRatio);
    const prevMultiplier = comboMultiplier(this.state.combo);
    const gained = (report.points + speedBonus) * prevMultiplier;
    this.state.score += gained;
    this.state.combo += 1;

    const multiplier = comboMultiplier(this.state.combo);
    if (multiplier > prevMultiplier) {
      this.dispatchEvent(new CustomEvent("comboUp", { detail: { multiplier } }));
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

  _onDistractionExpired(distraction) {
    this.dispatchEvent(
      new CustomEvent("distractionGone", {
        detail: { distraction, cleared: false },
      }),
    );
  }

  _onDistractionHit({ effect, ms }) {
    this.dispatchEvent(new CustomEvent("screenEffect", { detail: { effect, ms } }));
  }

  _applyProductivityHit(amount) {
    this.state.productivity = Math.max(0, this.state.productivity - amount);
    this.dispatchEvent(new CustomEvent("hit"));
    if (this.state.productivity <= 0) this._gameOver();
  }

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
    level: 0,
    reports: [],
    distractions: [],
    activeReportId: null,
    currentInput: "",
    elapsedTime: 0,

    shift: 1,
    phase: "morning",
    clock: "9:00 AM",
    tutorialStep: 0,
    tutorialProgress: 0,
  };
}
