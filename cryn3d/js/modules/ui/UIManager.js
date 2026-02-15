// UIManager - Handles all UI updates

import { UI } from '../constants/index.js';

export class UIManager {
  constructor(game) {
    this.game = game;
  }

  showMessage(text, duration = 3000) {
    const log = document.getElementById('message-log');
    const msg = document.createElement('div');
    msg.className = 'message';
    msg.innerHTML = text;
    log.appendChild(msg);
    setTimeout(() => {
      if (msg.parentNode) msg.parentNode.removeChild(msg);
    }, duration);
  }

  updatePlayerStats() {
    const player = this.game.player;
    document.getElementById('level').textContent = player.level;
    document.getElementById('hp').textContent = `${player.hp}/${player.maxHp}`;
    const hpBar = document.getElementById('hp-bar');
    hpBar.max = player.maxHp;
    hpBar.value = player.hp;
    document.getElementById('mp').textContent = `${player.mp}/${player.maxMp}`;
    const mpBar = document.getElementById('mp-bar');
    mpBar.max = player.maxMp;
    mpBar.value = player.mp;
    document.getElementById('xp').textContent = `${player.xp}/${player.maxXp}`;
    const xpBar = document.getElementById('xp-bar');
    xpBar.max = player.maxXp;
    xpBar.value = player.xp;
    document.getElementById('attack').textContent = player.attack;
    document.getElementById('defense').textContent = player.defense;
  }

  updateBattleEnemyHP() {
    if (!this.game.battleSystem.enemy) return;
    const enemy = this.game.battleSystem.enemy;
    document.getElementById('enemy-name').textContent = enemy.name;
    document.getElementById('enemy-hp').textContent = `${enemy.hp}/${enemy.maxHp}`;
    const hpBar = document.getElementById('enemy-hp-bar');
    hpBar.max = enemy.maxHp;
    hpBar.value = enemy.hp;
  }

  showBattlePanel(show) {
    const panel = document.getElementById('battle-panel');
    if (show) {
      panel.classList.add('visible');
    } else {
      panel.classList.remove('visible');
    }
  }

  bindStartButton(callback) {
    document.getElementById('btn-start').addEventListener('click', callback);
  }

  bindBattleButtons(attackFn, magicFn, itemFn, fleeFn) {
    document.getElementById('btn-attack').addEventListener('click', attackFn);
    document.getElementById('btn-magic').addEventListener('click', magicFn);
    document.getElementById('btn-item').addEventListener('click', itemFn);
    document.getElementById('btn-flee').addEventListener('click', fleeFn);
  }

  hideStartScreen() {
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('stats-panel').classList.add('stats-visible');
  }
}
