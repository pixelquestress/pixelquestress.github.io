// Encounter system - Enemy encounters and chest interactions

export class EncounterSystem {
  constructor(game) {
    this.game = game;
    this.lastGridX = -1;
    this.lastGridY = -1;
    this._chanceCounter = 0; // for random encounter chance similar to original
  }

  checkEnemyEncounter(gridX, gridY) {
    if (this.game.level && !this.game.level.isDangerousForestTile(gridX, gridY)) {
      this._chanceCounter = 0;
      return false;
    }

    // Random encounter check: emulate CBattleEngine::EngageCombat
    // Called after grid change; guarantees at least a few safe steps.
    const r = Math.floor(Math.random() * 90) + 1; // 1 - 90
    if (r + this._chanceCounter > 100) {
      this._chanceCounter = 0;
      // Pick monsters for current area (for now our initial map is forest/jungle)
      const enemies = this.pickRandomMonsters();
      if (enemies && enemies.length > 0) {
        // Use the game's startBattle so the cinematic transition and input lock run
        if (this.game && typeof this.game.startBattle === 'function') {
          this.game.startBattle(enemies, { area: 'FOREST', battleBackground: 'cryn/graphics/forest.bmp' });
        } else {
          this.game.battleSystem.startBattle(enemies);
        }
        return true;
      }
      return false;
    } else {
      this._chanceCounter++;
      return false;
    }
  }

  checkChest(gridX, gridY) {
    const chest = this.game.decorations.getChest(gridX, gridY);
    if (chest) {
      this.game.decorations.openChest(chest);
      return true;
    }
    return false;
  }

  checkGridChanged(gridX, gridY) {
    if (gridX !== this.lastGridX || gridY !== this.lastGridY) {
      this.lastGridX = gridX;
      this.lastGridY = gridY;
      return true;
    }
    return false;
  }

  resetTracking() {
    this.lastGridX = -1;
    this.lastGridY = -1;
  }

  pickRandomMonsters() {
    // Simple port of PickRandomMonsters for FOREST area (jungle)
    // Determine how many monsters arrive
    let r = Math.floor(Math.random() * 180) + 1; // 1 - 180
    let count = 1;
    if (r < 2) count = 4;
    else if (r < 5) count = 3;
    else if (r < 20) count = 2;
    else count = 1;

    const choices = [
      { name: 'Spider', bmp: 'cryn/graphics/spider.bmp', armor: 0, attack: 2 },
      { name: 'Gremlin', bmp: 'cryn/graphics/gremlin.bmp', armor: 0, castRate: 5, attack: 3 },
      { name: 'Tree Ent', bmp: 'cryn/graphics/foresttreeent.bmp', armor: 9, attack: 4 },
      { name: 'Trug', bmp: 'cryn/graphics/foresttrug.bmp', armor: 10, attack: 3 },
      { name: 'Leorn', bmp: 'cryn/graphics/forestleorn.bmp', armor: 45, attack: 4 },
      { name: 'Krinar', bmp: 'cryn/graphics/forestkrinar.bmp', armor: 0, castRate: 5, attack: 3 },
      { name: 'Grey Wolf', bmp: 'cryn/graphics/forestwolf.bmp', armor: 9, attack: 4 }
    ];

    const picked = [];
    for (let i=0;i<count;i++) {
      const idx = Math.floor(Math.random() * choices.length);
      const c = choices[idx];
      const level = Math.floor(Math.random() * 2) + 1;
      // build an enemy descriptor used by battle system
      picked.push({
        name: c.name,
        level,
        maxHp: this.roll(level, level, level * 2 + level - 1),
        hp: 0,
        maxMp: this.roll(level, 4, 8),
        mp: 0,
        attack: c.attack,
        defense: Math.max(0, Math.round((c.armor || level) / 12)),
        spellCaster: c.castRate || 0,
        xpReward: 20 + level * 10,
        goldReward: this.roll(level, 0, 14),
        bmp: c.bmp
      });
    }

    return picked;
  }

  roll(times, min, max) {
    let total = 0;
    for (let i = 0; i < times; i++) {
      total += Math.floor(Math.random() * (max - min + 1)) + min;
    }
    return total;
  }
}
