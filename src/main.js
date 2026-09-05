import "./style.css";
import { Game } from "./game/Game.js";
import { GameUI } from "./ui/GameUI.js";

const root = document.querySelector("#app");
const game = new Game();
new GameUI(game, root);
