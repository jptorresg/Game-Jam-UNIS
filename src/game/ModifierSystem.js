import { MODIFIERS, getModifier } from "../data/modifiers.js";

// Elige el modificador de un reporte al generarlo. La variedad crece con el nivel:
// al principio casi todo es NORMAL y MAYUSCULAS; mas adelante entran AL REVES y VOCALES.
export class ModifierSystem {
  getRandomModifier(level = 1) {
    const pool = ["none", "none", "uppercase"];
    if (level >= 2) pool.push("reverse");
    if (level >= 3) pool.push("vowelShift");
    if (level >= 4) pool.push("reverse", "vowelShift"); // mas peso a los dificiles
    if (level <= 1) pool.push("none", "none"); // niveles bajos: mas NORMAL

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
