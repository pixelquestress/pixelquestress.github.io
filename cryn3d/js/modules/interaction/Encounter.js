// Encounter system - Enemy encounters and chest interactions

export class EncounterSystem {
  constructor(game) {
    this.game = game;
    this.lastGridX = -1;
    this.lastGridY = -1;
    this._chanceCounter = 0; // for random encounter chance similar to original
  }

  checkEnemyEncounter(gridX, gridY) {
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
          this.game.startBattle(enemies);
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
      { name: 'Spider', bmp: 'cryn/graphics/spider.bmp', levelRange: [1,2] },
      { name: 'Gremlin', bmp: 'cryn/graphics/gremlin.bmp', levelRange: [1,2] },
      { name: 'Tree Ent', bmp: 'cryn/graphics/foresttreeent.bmp', levelRange: [1,2] },
      { name: 'Trug', bmp: 'cryn/graphics/foresttrug.bmp', levelRange: [1,2] },
      { name: 'Leorn', bmp: 'cryn/graphics/forestleorn.bmp', levelRange: [1,2] },
      { name: 'Krinar', bmp: 'cryn/graphics/forestkrinar.bmp', levelRange: [1,2] },
      { name: 'Grey Wolf', bmp: 'cryn/graphics/forestwolf.bmp', levelRange: [1,2] }
    ];

    const picked = [];
    for (let i=0;i<count;i++) {
      const idx = Math.floor(Math.random() * choices.length);
      const c = choices[idx];
      const level = Math.floor(Math.random() * (c.levelRange[1] - c.levelRange[0] + 1)) + c.levelRange[0];
      // build an enemy descriptor used by battle system
      picked.push({
        name: c.name,
        level: level,
        maxHp: Math.max(8, 8 + level * 6),
        hp: 0, // will be set by battle system
        attack: Math.max(2, level + 1),
        defense: Math.max(0, Math.floor(level/1.5)),
        xpReward: 20 + level * 10,
        goldReward: 5 + level * 5,
        bmp: c.bmp
      });
    }

    return picked;
  }
}
