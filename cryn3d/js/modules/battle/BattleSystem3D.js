// BattleSystem3D - Extended battle system with full logic

import { EventEmitter } from './EventEmitter.js';
import { Player3D } from '../player/Player3D.js';
import { UI } from '../constants/index.js';

export class BattleSystem3D extends EventEmitter {
  constructor(player) {
    super();
    this.player = player;
    this.enemy = null;
    this.turn = 'player';
    this.inBattle = false;
    this.battleLog = [];
  }

  startBattle(enemy) {
    this.enemy = enemy;
    this.enemy.hp = enemy.maxHp;
    this.enemy.mp = enemy.maxMp || 0;
    this.inBattle = true;
    this.turn = 'player';
    this.battleLog = [];
    this.emit('battleStart', this.enemy);
    this.log(`A wild ${this.enemy.name} appears!`);
  }

  endBattle(victory) {
    this.inBattle = false;
    this.emit('battleEnd', { victory, enemy: this.enemy });
  }

  gainRewards() {
    const xp = this.enemy.xpReward || 20;
    const gold = this.enemy.goldReward || Math.floor(Math.random() * 11) + 5;
    this.player.gainXp(xp);
    this.player.gold += gold;
    this.log(`Victory! Gained <b>${xp} XP</b> and <b>${gold} gold</b>.`);
    this.emit('reward', { xp, gold });
  }

  playerAttack() {
    if (!this.inBattle || this.turn !== 'player') return;

    const damage = Math.max(1, this.player.attack - Math.floor(this.enemy.defense / 2) + Math.floor(Math.random() * 4));
    this.enemy.hp -= damage;
    this.turn = 'enemy';
    this.log(`You attack for <span class="damage">${damage}</span> damage!`);
    this.emit('attack', { damage, target: 'enemy' });

    if (this.enemy.hp <= 0) {
      this.enemy.hp = 0;
      this.gainRewards();
      this.endBattle(true);
      return;
    }

    setTimeout(() => this.enemyTurn(), 800);
  }

  playerMagic() {
    if (!this.inBattle || this.turn !== 'player') return;

    const mpCost = UI.MP_COST;
    if (this.player.mp < mpCost) {
      this.log('Not enough MP!');
      return;
    }

    this.player.mp -= mpCost;
    const damage = Math.floor(this.player.attack * 1.5) + Math.floor(Math.random() * 4) + 2;
    this.enemy.hp -= damage;
    this.turn = 'enemy';
    this.log(`<span class="magic">Fireball</span> hits for <span class="damage">${damage}</span> damage!`);
    this.emit('magic', { damage, target: 'enemy' });

    if (this.enemy.hp <= 0) {
      this.enemy.hp = 0;
      this.gainRewards();
      this.endBattle(true);
      return;
    }

    setTimeout(() => this.enemyTurn(), 800);
  }

  useItem() {
    if (!this.inBattle || this.turn !== 'player') return;

    if (this.player.inventory.potions <= 0) {
      this.log('No potions left!');
      return;
    }

    this.player.inventory.potions--;
    const hpRestore = Math.floor(this.player.maxHp * 0.3);
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + hpRestore);
    this.turn = 'enemy';
    this.log(`Used potion. Restored <span class="heal">${hpRestore} HP</span>. (${this.player.inventory.potions} left)`);
    this.emit('item', { type: 'potion', amount: hpRestore });

    setTimeout(() => this.enemyTurn(), 800);
  }

  flee() {
    if (!this.inBattle || this.turn !== 'player') return;

    if (Math.random() < 0.5) {
      this.log('Fled successfully!');
      this.endBattle(false);
    } else {
      this.log('Could not flee!');
      this.turn = 'enemy';
      setTimeout(() => this.enemyTurn(), 800);
    }
  }

  enemyTurn() {
    if (!this.inBattle) return;

    const damage = Math.max(1, this.enemy.attack - this.player.defense + Math.floor(Math.random() * 3) - 1);
    this.player.hp -= damage;
    this.log(`${this.enemy.name} attacks for <span class="damage">${damage}</span> damage!`);
    this.emit('attack', { damage, target: 'player' });

    if (this.player.hp <= 0) {
      this.player.hp = 0;
      this.player.alive = false;
      this.endBattle(false);
      return;
    }

    this.turn = 'player';
  }

  log(message) {
    this.battleLog.push({ message, time: Date.now() });
    this.updateLogUI();
  }

  updateLogUI() {
    const logEl = document.getElementById('battle-log');
    if (!logEl) return;
    logEl.innerHTML = this.battleLog.map(entry => entry.message).join('<br>');
    logEl.scrollTop = logEl.scrollHeight;
  }

  updateUI() {
    if (!this.enemy) return;

    document.getElementById('enemy-name').textContent = this.enemy.name;
    document.getElementById('enemy-hp').textContent = `${this.enemy.hp}/${this.enemy.maxHp}`;
    const hpBar = document.getElementById('enemy-hp-bar');
    hpBar.max = this.enemy.maxHp;
    hpBar.value = this.enemy.hp;
    document.getElementById('mp-cost').textContent = UI.MP_COST;
  }
}
