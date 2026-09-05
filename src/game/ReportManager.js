import { GAME_CONFIG } from "../config.js";
import { randomWord } from "../data/words.js";

// Responsable de: crear reportes, asignar palabras, calcular la respuesta esperada,
// controlar los timers y completar / expirar reportes.
// No renderiza HTML ni toca la puntuacion: emite eventos para que Game reaccione.
export class ReportManager extends EventTarget {
  constructor(state) {
    super();
    this.state = state;
    this._spawnTimer = 0;
    this._nextId = 1;
    this.spawnInterval = GAME_CONFIG.initialSpawnInterval;
  }

  // Reinicia el manager para una partida nueva.
  reset(state) {
    this.state = state;
    this._spawnTimer = 0;
    this._nextId = 1;
    this.spawnInterval = GAME_CONFIG.initialSpawnInterval;
    this.state.reports.length = 0;
    this.spawnReport(); // arrancar con un reporte visible
  }

  update(deltaTime) {
    // Descontar tiempo a cada reporte pendiente.
    for (const report of this.state.reports) {
      if (report.status !== "pending") continue;
      report.remainingTime -= deltaTime;
      if (report.remainingTime <= 0) {
        report.remainingTime = 0;
        this._expireReport(report);
      }
    }

    // Spawning por intervalo.
    this._spawnTimer += deltaTime;
    if (
      this._spawnTimer >= this.spawnInterval &&
      this._pendingCount() < GAME_CONFIG.maxActiveReports
    ) {
      this._spawnTimer = 0;
      this.spawnReport();
    }
  }

  spawnReport() {
    if (this._pendingCount() >= GAME_CONFIG.maxActiveReports) return null;

    const word = randomWord();
    const report = {
      id: `report-${String(this._nextId++).padStart(3, "0")}`,
      word,
      modifier: null, // los modificadores llegan en la Fase 2
      expectedInput: word,
      timeLimit: GAME_CONFIG.initialReportTime,
      remainingTime: GAME_CONFIG.initialReportTime,
      status: "pending",
      points: GAME_CONFIG.baseReportPoints,
    };
    this.state.reports.push(report);
    this.dispatchEvent(new CustomEvent("reportSpawned", { detail: { report } }));
    return report;
  }

  getReport(id) {
    return this.state.reports.find((r) => r.id === id) || null;
  }

  // Llamado por Game cuando el input coincide con expectedInput.
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
    this.dispatchEvent(
      new CustomEvent("reportExpired", { detail: { report } }),
    );
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
