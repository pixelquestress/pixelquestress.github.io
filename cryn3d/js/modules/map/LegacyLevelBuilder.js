// LegacyLevelBuilder - Procedural level generation (buildLevel1)

import { COLORS } from '../constants/index.js';

export class LegacyLevelBuilder {
  constructor(game) {
    this.game = game;
    this.GRASS = 1;
    this.PATH = 18;
    this.FOREST_OBSTACLE_TILES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 23, 24, 25, 26, 27, 28, 29];
  }

  buildLevel1() {
    // Clear existing
    while (this.game.mapGroup.children.length > 0) {
      this.game.mapGroup.remove(this.game.mapGroup.children[0]);
    }
    this.game.walkableTiles.clear();

    // Create grass base
    for (let x = 0; x < this.game.mapSize; x++) {
      for (let y = 0; y < this.game.mapSize; y++) {
        this.game.createTile(x, y, this.GRASS);
      }
    }

    // Add winding path
    const pathCoords = [
      [5, 0], [5, 1], [5, 2], [5, 3], [5, 4],
      [6, 4], [7, 4], [8, 4], [9, 4], [10, 4],
      [10, 5], [10, 6], [10, 7], [10, 8], [10, 9],
      [11, 9], [12, 9], [13, 9], [14, 9], [15, 9],
      [15, 10], [15, 11], [15, 12],
      [10, 12], [10, 13], [10, 14],
      [7, 13], [7, 14], [7, 15], [7, 16],
      [5, 16], [5, 17],
      [8, 9], [9, 9], [9, 10]
    ];
    pathCoords.forEach(([x, y]) => this.game.createTile(x, y, this.PATH));

    // Add trees (dense forest)
    const treePositions = [];
    for (let x = 0; x < this.game.mapSize; x++) {
      for (let y = 0; y < this.game.mapSize; y++) {
        if (x < 3 || x > 16 || y < 3 || y > 16) {
          if (Math.random() < 0.7) treePositions.push([x, y]);
        } else {
          if (Math.random() < 0.3) treePositions.push([x, y]);
        }
      }
    }
    // Remove trees from path
    treePositions.forEach(p => {
      const key = `${p[0]},${p[1]}`;
      if (!pathCoords.some(([px, py]) => px === p[0] && py === p[1])) {
        const obsIdx = this.FOREST_OBSTACLE_TILES[Math.floor(Math.random() * this.FOREST_OBSTACLE_TILES.length)];
        this.game.createTile(p[0], p[1], obsIdx);
      }
    });

    // Add random flowers
    for (let i = 0; i < 15; i++) {
      const x = Math.floor(Math.random() * this.game.mapSize);
      const y = Math.floor(Math.random() * this.game.mapSize);
      const hasTile = this.game.mapGroup.children.find(child => {
        const d = child.userData;
        return d && d.gridX === x && d.gridY === y && d.type === 'tile' && d.tileIndex === this.GRASS;
      });
      if (hasTile) {
        this.game.createDecorativeTile(x, y, 'flower');
      }
    }

    // Add chest
    this.game.createDecorativeTile(10, 16, 'chest');

    // Recompute walkable tiles
    this.game.rebuildWalkableTiles();

    // Center camera
    const centerX = this.game.mapSize / 2 * this.game.tileSize;
    const centerZ = this.game.mapSize / 2 * this.game.tileSize;
    this.game.camera.position.set(centerX, 18, centerZ + 12);
    this.game.camera.lookAt(centerX, 0, centerZ);
  }
}
