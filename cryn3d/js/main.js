// Main entry point - Initialize the game

import { Game3D } from './modules/core/Game3D.js';

window.addEventListener('DOMContentLoaded', async () => {
  const game = new Game3D();
  await game.init();
  window.game = game;
});
