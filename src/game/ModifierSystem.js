import { MODIFIERS, getModifier } from "../data/modifiers.js";

// Elige el modificador de un reporte al generarlo. La variedad crece con el nivel,
// pero si se pasa una lista `allowed` (la fase de la jornada) solo se eligen esos.
export class ModifierSystem {
  getRandomModifier(level = 1, allowed = null) {
    let pool = ["none", "none", "uppercase"];
    if (level >= 2) pool.push("reverse");
    if (level >= 3) pool.push("vowelShift");
    if (level >= 4) pool.push("reverse", "vowelShift");
    if (level <= 1) pool.push("none", "none");

    if (allowed) {
      pool = pool.filter((id) => allowed.includes(id));
      if (pool.length === 0) pool = allowed.slice();
    }

    const id = pool[Math.floor(Math.random() * pool.length)];
    return getModifier(id);
  }

  getById(id) {
    return getModifier(id);
  }

  get all() {
    return MODIFIERS;
  }
}
