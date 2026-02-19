// Collision detection for walkable tiles

export class CollisionSystem {
  constructor(game) {
    this.game = game;
  }

  isWalkable(x, y) {
    const key = `${x},${y}`;
    const isw = this.game.walkableTiles.has(key);

    // Use actual map dimensions if available, otherwise fall back to mapSize
    const maxX = this.game.currentMapWidth || this.game.mapSize;
    const maxY = this.game.currentMapHeight || this.game.mapSize;

    if (x < 0 || x >= maxX || y < 0 || y >= maxY) {
      console.log(`  → Out of bounds (max ${maxX}x${maxY})`);
      return false;
    }
    return isw;
  }

  canMoveTo(newPos) {
    const testX = Math.round(newPos.x / this.game.tileSize);
    const testY = Math.round(newPos.z / this.game.tileSize);
    return this.isWalkable(testX, testY);
  }
}
