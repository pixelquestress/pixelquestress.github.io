// Encounter system - Enemy encounters and chest interactions

export class EncounterSystem {
  constructor(game) {
    this.game = game;
    this.lastGridX = -1;
    this.lastGridY = -1;
  }

  checkEnemyEncounter(gridX, gridY) {
    const enemy = this.game.enemies.find(e => e.x === gridX && e.y === gridY && e.alive);
    if (enemy) {
      this.game.startBattle(enemy);
      return true;
    }
    return false;
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
}
