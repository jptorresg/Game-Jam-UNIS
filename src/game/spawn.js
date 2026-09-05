import { GAME_CONFIG } from "../config.js";

// Punto de aparicion cerca de un borde del area de juego (coordenadas 0..1).
// Las cosas entran desde arriba, izquierda o derecha y avanzan hacia el centro;
// nunca desde abajo, que es donde esta el jugador. Se dejan ligeramente dentro
// del area para que se vean apenas aparecen.
const EDGES = ["top", "left", "right"];

export function randomEdgePoint() {
  const edge = EDGES[Math.floor(Math.random() * EDGES.length)];
  if (edge === "top") return { x: 0.1 + Math.random() * 0.8, y: 0.04 };
  if (edge === "left") return { x: 0.04, y: 0.08 + Math.random() * 0.5 };
  return { x: 0.96, y: 0.08 + Math.random() * 0.5 }; // right
}

// Punto objetivo alrededor del personaje, para que varias cosas no se apilen
// exactamente en el mismo pixel del centro.
export function centerTarget(radius = 0.15) {
  const angle = Math.random() * Math.PI * 2;
  return {
    x: GAME_CONFIG.center.x + Math.cos(angle) * radius,
    y: GAME_CONFIG.center.y + Math.sin(angle) * radius * 0.7,
  };
}

// Vector unitario de `from` hacia `to`.
export function directionTo(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: dx / len, y: dy / len };
}
