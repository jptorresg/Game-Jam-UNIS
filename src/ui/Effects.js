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
