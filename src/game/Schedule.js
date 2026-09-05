import { GAME_CONFIG } from "../config.js";

// Reloj de la jornada. Cuenta los segundos del turno y los traduce a hora del
// juego (9:00 AM -> 5:00 PM) y a fase (manana / tarde / hora pico).
export class Schedule {
  constructor() {
    this.shiftSeconds = 0;
  }

  resetShift() {
    this.shiftSeconds = 0;
  }

  update(deltaTime) {
    this.shiftSeconds += deltaTime;
  }

  // Hora del juego en decimal (9.0 .. 17.0), sin pasar del fin de turno.
  get hour() {
    const { startHour, endHour, secondsPerHour } = GAME_CONFIG.schedule;
    const h = startHour + this.shiftSeconds / secondsPerHour;
    return Math.min(h, endHour);
  }

  get shiftOver() {
    const { endHour, secondsPerHour, startHour } = GAME_CONFIG.schedule;
    return this.shiftSeconds >= (endHour - startHour) * secondsPerHour;
  }

  get phase() {
    const h = this.hour;
    let current = GAME_CONFIG.schedule.phases[0];
    for (const p of GAME_CONFIG.schedule.phases) {
      if (h >= p.from) current = p;
    }
    return current;
  }

  // "9:00 AM" / "1:30 PM"
  get label() {
    const h = Math.floor(this.hour);
    const m = Math.floor((this.hour - h) * 60);
    const ampm = h >= 12 ? "PM" : "AM";
    let hh = h % 12;
    if (hh === 0) hh = 12;
    return `${hh}:${String(m).padStart(2, "0")} ${ampm}`;
  }
}
