import { GAME_CONFIG } from "../config.js";
import { randomWord } from "../data/words.js";
import { randomEdgePoint, centerTarget } from "./spawn.js";

// Familias de arte para las carpetas (imagenes del equipo).
export const REPORT_ART = ["reporte", "documento", "ticket"];

// Responsable de: crear reportes, asignar palabras y modificadores, calcular la
// respuesta esperada, controlar el avance hacia el centro y completar / expirar.
// No renderiza HTML ni toca la puntuacion: emite eventos para que Game reaccione.
//
// El "tiempo" de un reporte es lo que tarda en llegar al centro. `remainingTime`
// va de `timeLimit` a 0; la UI interpola la posicion entre el borde y el centro.
export class ReportManager extends EventTarget {
  constructor(state, modifierSystem) {
    super();
    this.state = state;
    this.modifierSystem = modifierSystem;
    this._spawnTimer = 0;
    this._nextId = 1;
    this._recentWords = [];

    // Estos valores los ajusta Game desde DifficultySystem / la fase de la jornada.
    this.spawnInterval = GAME_CONFIG.initialSpawnInterval;
    this.reportTime = GAME_CONFIG.initialReportTime;
    this.maxActiveReports = GAME_CONFIG.initialMaxActiveReports;
    this.allowedModifiers = null; // null = todos; la fase pasa su lista
  }

  // Deja el manager listo pero sin generar ningun reporte todavia.
  clearOnly(state) {
    this.state = state;
    this._spawnTimer = 0;
    this._nextId = 1;
    this._recentWords = [];
    this.spawnInterval = GAME_CONFIG.initialSpawnInterval;
    this.reportTime = GAME_CONFIG.initialReportTime;
    this.maxActiveReports = GAME_CONFIG.initialMaxActiveReports;
    this.state.reports.length = 0;
  }

  reset(state) {
    this.clearOnly(state);
    this.spawnReport();
  }

  update(deltaTime) {
    for (const report of this.state.reports) {
      if (report.status !== "pending") continue;
      report.remainingTime -= deltaTime;
      if (report.remainingTime <= 0) {
        report.remainingTime = 0;
        this._expireReport(report);
      }
    }

    this._spawnTimer += deltaTime;
    if (
      this._spawnTimer >= this.spawnInterval &&
      this._pendingCount() < this.maxActiveReports
    ) {
      this._spawnTimer = 0;
      this.spawnReport();
    }
  }

  spawnReport() {
    if (this._pendingCount() >= this.maxActiveReports) return null;

    // Estilo ZType: cada reporte activo debe empezar con una letra distinta para
    // que la primera tecla no sea ambigua. Ademas evitamos repetir palabras
    // recientes.
    const usedFirst = new Set(
      this.state.reports
        .filter((r) => r.status === "pending")
        .map((r) => r.expectedInput[0].toLowerCase()),
    );

    let word;
    let modifier;
    let expectedInput;
    for (let attempt = 0; attempt < 16; attempt++) {
      word = randomWord();
      modifier = this.modifierSystem.getRandomModifier(
        this.state.level,
        this.allowedModifiers,
      );
      expectedInput = modifier.transform(word);
      const first = expectedInput[0].toLowerCase();
      const firstFree = !usedFirst.has(first);
      const notRecent = !this._recentWords.includes(word);
      if (firstFree && notRecent) break;
      // En los ultimos intentos basta con que la primera letra este libre.
      if (attempt >= 10 && firstFree) break;
    }

    this._recentWords.push(word);
    if (this._recentWords.length > 7) this._recentWords.shift();

    const origin = randomEdgePoint();
    const target = centerTarget();
    const report = {
      id: `report-${String(this._nextId++).padStart(3, "0")}`,
      word,
      modifier: modifier.id,
      expectedInput,
      timeLimit: this.reportTime,
      remainingTime: this.reportTime,
      status: "pending",
      points: GAME_CONFIG.baseReportPoints,
      artFamily: REPORT_ART[Math.floor(Math.random() * REPORT_ART.length)],
      spawnX: origin.x,
      spawnY: origin.y,
      targetX: target.x,
      targetY: target.y,
    };
    this.state.reports.push(report);
    this.dispatchEvent(new CustomEvent("reportSpawned", { detail: { report } }));
    return report;
  }

  getReport(id) {
    return this.state.reports.find((r) => r.id === id) || null;
  }

  completeReport(id) {
    const report = this.getReport(id);
    if (!report || report.status !== "pending") return;

    report.status = "completed";
    const remainingRatio = report.remainingTime / report.timeLimit;
    this._removeReport(id);
    this.dispatchEvent(
      new CustomEvent("reportCompleted", { detail: { report, remainingRatio } }),
    );
  }

  clear() {
    this.state.reports.length = 0;
  }

  _expireReport(report) {
    report.status = "expired";
    this._removeReport(report.id);
    this.dispatchEvent(new CustomEvent("reportExpired", { detail: { report } }));
  }

  _removeReport(id) {
    const index = this.state.reports.findIndex((r) => r.id === id);
    if (index !== -1) this.state.reports.splice(index, 1);
  }

  _pendingCount() {
    let count = 0;
    for (const report of this.state.reports) {
      if (report.status === "pending") count++;
    }
    return count;
  }
}
