import "./style.css";
import { Game } from "./game/Game.js";
import { GameUI } from "./ui/GameUI.js";
import { AudioManager } from "./audio/AudioManager.js";

const root = document.querySelector("#app");
const game = new Game();
const audio = new AudioManager();
new GameUI(game, root, audio);

// El audio se inicializa con el primer gesto del usuario (politica de autoplay).
function unlockAudio() {
  audio.init();
  window.removeEventListener("pointerdown", unlockAudio);
  window.removeEventListener("keydown", unlockAudio);
}
window.addEventListener("pointerdown", unlockAudio);
window.addEventListener("keydown", unlockAudio);

if (import.meta.env.DEV) {
  window.__game = game;
  window.__audio = audio;
}
