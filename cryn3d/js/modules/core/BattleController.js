import { AudioManager } from './AudioManager.js';

export class BattleController {
  constructor(game, audio) {
    this.game = game;
    this.audio = audio || new AudioManager();
  }

  onBattleStart(enemy) {
    // clear previous battle logs
    if (this.game.battleSystem) {
      this.game.battleSystem.battleLog = [];
      this.game.battleSystem.updateLogUI();
    }
    try { console.clear(); } catch (e) {}
    this.game.ui.showBattlePanel(true);
    this.game.battleSystem.updateUI();
    // Update battle panel title to show active actor (Cryn or Beorne)
    try {
      const titleEl = document.querySelector('#battle-panel h3');
      if (titleEl) titleEl.textContent = this.game.battleSystem.actorName || 'Battle!';
    } catch (e) {}
    // audio handled by game.startBattle (keeps responsibility there)
  }

  onBattleEnd(result) {
    // called after animateBattleEnd resolves in Game3D
    this.game.ui.showBattlePanel(false);
    if (!result.victory) {
      this.game.showMessage('You were defeated! Refresh to try again.');
    } else {
      const enemy = result && result.enemies && result.enemies.length
        ? result.enemies[0]
        : this.game.battleSystem.enemy;
      if (enemy) {
        enemy.alive = false;
        if (enemy.mesh) enemy.mesh.visible = false;
        this.game.showMessage(`${enemy.name} defeated!`);
      }
    }
    this.game.ui.updatePlayerStats();
  }
}
