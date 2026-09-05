// Efectos visuales efimeros (Fase 5 - juice). Cada efecto es un elemento con
// animacion CSS que se elimina solo al terminar. Sin estado persistente.
export class Effects {
  constructor(layer) {
    this.layer = layer;
  }

  // Estallido de particulas en (xPct, yPct). kind: good | bad | expire | pop
  burst(xPct, yPct, kind = "good", count = 9) {
    for (let i = 0; i < count; i++) {
      const p = document.createElement("div");
      p.className = `fx fx--${kind}`;
      const angle = Math.random() * Math.PI * 2;
      const dist = 20 + Math.random() * 42;
      p.style.left = `${xPct}%`;
      p.style.top = `${yPct}%`;
      p.style.setProperty("--dx", `${Math.cos(angle) * dist}px`);
      p.style.setProperty("--dy", `${Math.sin(angle) * dist}px`);
      p.addEventListener("animationend", () => p.remove());
      this.layer.appendChild(p);
    }
  }

  // Numero flotante que sube y se desvanece.
  floater(xPct, yPct, text, kind = "good") {
    const el = document.createElement("div");
    el.className = `fx-float fx-float--${kind}`;
    el.textContent = text;
    el.style.left = `${xPct}%`;
    el.style.top = `${yPct}%`;
    el.addEventListener("animationend", () => el.remove());
    this.layer.appendChild(el);
  }

  // Rayo del personaje hacia (x2,y2) al completar una frase. Coordenadas en %.
  beam(x1p, y1p, x2p, y2p) {
    const rect = this.layer.getBoundingClientRect();
    if (!rect.width) return;
    const x1 = (x1p / 100) * rect.width;
    const y1 = (y1p / 100) * rect.height;
    const x2 = (x2p / 100) * rect.width;
    const y2 = (y2p / 100) * rect.height;
    const len = Math.hypot(x2 - x1, y2 - y1);
    const ang = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;

    const el = document.createElement("div");
    el.className = "fx-beam";
    el.style.left = `${x1}px`;
    el.style.top = `${y1}px`;
    el.style.width = `${len}px`;
    el.style.setProperty("--ang", `${ang}deg`);
    el.addEventListener("animationend", () => el.remove());
    this.layer.appendChild(el);
  }

  // Cartel central breve (hitos de combo).
  banner(text) {
    const el = document.createElement("div");
    el.className = "fx-banner";
    el.textContent = text;
    el.addEventListener("animationend", () => el.remove());
    this.layer.appendChild(el);
  }

  clear() {
    this.layer.replaceChildren();
  }
}
