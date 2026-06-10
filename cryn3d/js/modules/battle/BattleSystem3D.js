// BattleSystem3D - Extended battle system with full logic

import { EventEmitter } from './EventEmitter.js';
import { Player3D } from '../player/Player3D.js';
import { UI } from '../constants/index.js';

export class BattleSystem3D extends EventEmitter {
  constructor(player) {
    super();
    this.player = player;
    this.enemy = null;
    this.enemies = [];
    this.selectedIndex = 0;
    this.turn = 'player';
    this.inBattle = false;
    this.battleLog = [];
    this.options = {};
    this.originalEnemies = [];
  }

  startBattle(enemy, options = {}) {
    this.options = options || {};
    this.actorName = this.options.actorName || 'Cryn';
    // Initialize battle state. Accept either a single enemy descriptor or an array of enemies
    if (Array.isArray(enemy)) {
      this.enemies = enemy.map(e => Object.assign({}, e));
      this.enemies.forEach(e => {
        e.maxHp = e.maxHp || 20;
        e.hp = e.maxHp;
        e.maxMp = e.maxMp || 0;
        e.mp = e.maxMp;
        e.alive = true;
      });
      this.enemy = this.enemies[0];
      this.emit('battleStart', this.enemies);
      this.log('A group of enemies appears!');
    } else {
      this.enemy = Object.assign({}, enemy || {});
      this.enemy.maxHp = this.enemy.maxHp || this.enemy.hp || 20;
      this.enemy.hp = this.enemy.maxHp;
      this.enemy.maxMp = this.enemy.maxMp || this.enemy.mp || 0;
      this.enemy.mp = this.enemy.maxMp;
      this.enemy.alive = true;
      this.enemies = [this.enemy];
      this.emit('battleStart', this.enemy);
      this.log(`A wild ${this.enemy.name || 'enemy'} appears!`);
    }
    this.originalEnemies = this.enemies.map(e => Object.assign({}, e));

    // Set battle flags
    this.inBattle = true;
    this.turn = 'player';
    this.selectedIndex = 0;
    this.enemy = this.enemies.length ? this.enemies[0] : null;
  }

  selectEnemy(index) {
    if (!this.enemies || this.enemies.length === 0) return;
    const i = Math.max(0, Math.min(index, this.enemies.length - 1));
    this.selectedIndex = i;
    this.enemy = this.enemies[i];
    this.emit('targetChanged', { index: i, enemy: this.enemy });
    this.updateUI();
  }

  endBattle(victory) {
    this.inBattle = false;
    this.emit('battleEnd', {
      victory,
      enemy: this.enemy,
      enemies: this.originalEnemies,
      boss: !!this.options.boss,
      scripted: this.options.scripted || null,
      fled: !victory && this.options.fled === true,
    });
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
    const target = this.enemy || (this.enemies && this.enemies[this.selectedIndex]);
    if (!target) return;
    // Basic damage formula with small randomness and chance for critical
    const base = this.player.attack - Math.floor((target.defense || 0) / 2);
    let damage = Math.max(1, base + Math.floor(Math.random() * 4));
    if (Math.random() < 0.08) { damage = Math.floor(damage * 1.75); this.log('<span class="magic">Critical hit!</span>'); }
    if (this.player.bonusAttack && Math.random() < 0.25) {
      const bonus = Math.floor(Math.random() * 4) + this.player.level;
      damage += bonus;
      this.log(`<span class="magic">Bonus attack!</span> +${bonus} damage.`);
    }
    target.hp -= damage;
    this.turn = 'enemy';
    this.log(`${this.actorName} attacks ${target.name || 'the enemy'} for <span class="damage">${damage}</span> damage!`);
    this.emit('attack', { damage, targetIndex: this.selectedIndex });

    // Update UI so HP bars reflect damage
    this.updateUI();

    if (target.hp <= 0) {
      target.hp = 0;
      target.alive = false;
      this.log(`${target.name || 'Enemy'} was defeated!`);
      // give rewards for this enemy
      const xp = target.xpReward || 10;
      const gold = target.goldReward || Math.floor(Math.random() * 6) + 2;
      this.player.gainXp(xp);
      this.player.gold += gold;
      this.emit('reward', { xp, gold, index: this.selectedIndex });

      // remove defeated enemy from list and adjust selection
      const defeatedIndex = this.selectedIndex;
      // notify visuals first so the renderer can animate death
      this.emit('enemyDefeated', { index: defeatedIndex });
      // remove from logic list
      this.enemies.splice(defeatedIndex, 1);
      if (this.enemies.length === 0) {
        // delay final end to allow visuals to play
        setTimeout(() => this.endBattle(true), 750);
        return;
      }
      // clamp selection and set current enemy
      this.selectedIndex = Math.min(defeatedIndex, this.enemies.length - 1);
      this.enemy = this.enemies[this.selectedIndex];
      this.emit('targetChanged', { index: this.selectedIndex, enemy: this.enemy });
      this.updateUI();
      // continue to enemy turn
    }

    setTimeout(() => this.enemyTurn(), 800);
  }

  playerMagic() {
    if (!this.inBattle || this.turn !== 'player') return;
    const target = this.enemy || (this.enemies && this.enemies[this.selectedIndex]);
    if (!target) return;
    const spellName = this.player.level >= 10 ? 'Magic Explosion' : 'Magic Missile';
    const mpCost = this.player.level >= 10 ? 10 : 2;
    if (this.player.mp < mpCost) {
      this.log('Not enough MP!');
      return;
    }

    this.player.mp -= mpCost;
    const spellLevel = Math.max(1, Math.min(this.player.level, this.player.level >= 10 ? 11 : 4));
    let damage = 0;
    for (let i = 0; i < spellLevel; i++) {
      damage += Math.floor(Math.random() * 6) + 7;
    }
    target.hp -= damage;
    this.turn = 'enemy';
    this.log(`${this.actorName} casts <span class="magic">${spellName}</span> on ${target.name || 'the enemy'} for <span class="damage">${damage}</span> damage!`);
    this.emit('magic', { damage, targetIndex: this.selectedIndex, spell: spellName });

    // Update UI
    this.updateUI();

    if (target.hp <= 0) {
      target.hp = 0;
      target.alive = false;
      this.log(`${target.name || 'Enemy'} was defeated!`);
      const xp = target.xpReward || 10;
      const gold = target.goldReward || Math.floor(Math.random() * 6) + 2;
      this.player.gainXp(xp);
      this.player.gold += gold;
      this.emit('reward', { xp, gold, index: this.selectedIndex });
      const defeatedIndex = this.selectedIndex;
      this.emit('enemyDefeated', { index: defeatedIndex });
      this.enemies.splice(defeatedIndex, 1);
      if (this.enemies.length === 0) {
        setTimeout(() => this.endBattle(true), 750);
        return;
      }
      this.selectedIndex = Math.min(defeatedIndex, this.enemies.length - 1);
      this.enemy = this.enemies[this.selectedIndex];
      this.emit('targetChanged', { index: this.selectedIndex, enemy: this.enemy });
      this.updateUI();
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
    this.log(`${this.actorName} used a potion. Restored <span class="heal">${hpRestore} HP</span>. (${this.player.inventory.potions} left)`);
    this.emit('item', { type: 'potion', amount: hpRestore });

    // Update UI
    this.updateUI();

    setTimeout(() => this.enemyTurn(), 800);
  }

  flee() {
    if (!this.inBattle || this.turn !== 'player') return;

    if (this.options.boss) {
      this.log("You can't get away this time!");
      this.turn = 'enemy';
      setTimeout(() => this.enemyTurn(), 800);
      return;
    }

    if (Math.random() < 0.5) {
      this.log('Fled successfully!');
      this.options.fled = true;
      this.endBattle(false);
    } else {
      this.log('Could not flee!');
      this.turn = 'enemy';
      setTimeout(() => this.enemyTurn(), 800);
    }
  }

  enemyTurn() {
    if (!this.inBattle) return;
    // All alive enemies attack this round, sequentially
    const alive = this.enemies.map((e, idx) => ({ e, idx })).filter(x => x.e && x.e.alive !== false);
    if (!alive || alive.length === 0) {
      this.endBattle(true);
      return;
    }

    this.turn = 'enemy';
    let i = 0;
    const processNext = () => {
      if (i >= alive.length) {
        // all done
        if (this.player.hp <= 0) {
          this.player.hp = 0;
          this.player.alive = false;
          this.endBattle(false);
          return;
        }
        this.turn = 'player';
        this.updateUI();
        return;
      }
      const actorEntry = alive[i++];
      const actor = actorEntry.e;
      const spell = this.chooseMonsterSpell(actor);
      if (spell) {
        this.castMonsterSpell(actor, actorEntry.idx, spell);
        if (this.player.hp <= 0) {
          this.player.hp = 0;
          this.player.alive = false;
          this.endBattle(false);
          return;
        }
        setTimeout(processNext, 350);
        return;
      }

      const base = (actor.attack || 2) - (this.player.defense || 0);
      let damage = Math.max(1, base + Math.floor(Math.random() * 4) - 1);
      if (Math.random() < 0.05) { damage = Math.floor(damage * 1.5); this.log(`${actor.name} lands a <span class="magic">crushing blow</span>!`); }
      this.player.hp -= damage;
      this.log(`${actor.name || 'An enemy'} attacks for <span class="damage">${damage}</span> damage!`);
      this.emit('attack', { damage, target: 'player', attackerIndex: actorEntry.idx });
      this.updateUI();
      if (this.player.hp <= 0) {
        this.player.hp = 0;
        this.player.alive = false;
        this.endBattle(false);
        return;
      }
      // small delay between attackers for visuals
      setTimeout(processNext, 350);
    };

    processNext();
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

    // Safely update DOM elements only if present (avoid runtime errors)
    const nameEl = document.getElementById('enemy-name');
    if (nameEl) {
      // if we were given an array of enemies, show a summary
      if (Array.isArray(this.enemy)) nameEl.textContent = `${this.enemy.length} enemies`;
      else nameEl.textContent = this.enemy.name || 'Enemy';
    }

    const hpEl = document.getElementById('enemy-hp');
    if (hpEl) hpEl.textContent = `${this.enemy.hp || this.enemy.maxHp}/${this.enemy.maxHp}`;

    const hpBar = document.getElementById('enemy-hp-bar');
    if (hpBar) {
      hpBar.max = this.enemy.maxHp || 1;
      hpBar.value = this.enemy.hp || 0;
    }

    const mpCostEl = document.getElementById('mp-cost');
    if (mpCostEl) mpCostEl.textContent = UI.MP_COST;
    const magicButton = document.getElementById('btn-magic');
    if (magicButton) magicButton.textContent = `Magic (${this.player.level >= 10 ? 10 : 2})`;
  }

  chooseMonsterSpell(actor) {
    if (!actor || !actor.spellCaster || !actor.mp) return null;
    const roll = Math.floor(Math.random() * (10 + actor.spellCaster));
    if (roll >= actor.spellCaster) return null;
    if ((actor.name === 'Lineer' || actor.name === 'King Tree Ent') && actor.mp >= 2) return 'Darkness';
    if (actor.mp >= 2) return actor.level >= 10 ? 'Magic Explosion' : 'Magic Missile';
    return null;
  }

  castMonsterSpell(actor, actorIndex, spell) {
    let mpCost = 2;
    let damage = 0;
    if (spell === 'Darkness') {
      actor.mp -= mpCost;
      this.log(`${actor.name} casts <span class="magic">Darkness</span>. Your vision blurs.`);
      damage = Math.max(1, actor.level);
    } else {
      mpCost = spell === 'Magic Explosion' ? 10 : 2;
      actor.mp -= mpCost;
      const spellLevel = spell === 'Magic Explosion' ? Math.min(actor.level, 11) : Math.min(actor.level, 4);
      for (let i = 0; i < spellLevel; i++) {
        damage += Math.floor(Math.random() * 6) + 7;
      }
      this.log(`${actor.name} casts <span class="magic">${spell}</span> for <span class="damage">${damage}</span> damage!`);
    }
    this.player.hp -= damage;
    this.emit('magic', { damage, target: 'player', attackerIndex: actorIndex, spell });
    this.updateUI();
  }
}
