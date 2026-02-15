// MapBuilder - Builds the 3D map from parsed grid data

import { COLORS } from '../constants/index.js';
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.module.js';

export class MapBuilder {
  constructor(game) {
    this.game = game;
  }

  buildFromMap(grid, nonWalkableSet) {
    // Clear existing map
    while (this.game.mapGroup.children.length > 0) {
      this.game.mapGroup.remove(this.game.mapGroup.children[0]);
    }
    this.game.walkableTiles.clear();

    const mapHeight = grid.length;
    const mapWidth = grid[0].length;

    console.log('Building map with non-walkable tiles:', Array.from(nonWalkableSet));
    console.log('Map dimensions:', mapWidth, 'x', mapHeight);

    // Store grid for reference
    this.game.currentMapGrid = grid;
    this.game.currentMapWidth = mapWidth;
    this.game.currentMapHeight = mapHeight;

    const tileProperties = this.game.tileProperties;

    for (let y = 0; y < mapHeight; y++) {
      for (let x = 0; x < mapWidth; x++) {
        const char = grid[y][x];
        const idx = tileProperties.charToIndex(char);
        if (idx < 0) continue; // skip unknown chars
        const isWalkable = !nonWalkableSet.has(char);

        if (this.game.tileSheetLoaded) {
          this.createTileFromIndex(x, y, idx, isWalkable);
        } else {
          // Fallback: create colored tile
          const props = tileProperties.getProperties(idx);
          this.createSimpleTile(x, y, props.color, isWalkable);
        }

        if (isWalkable) {
          this.game.walkableTiles.add(`${x},${y}`);
        }
      }
    }

    console.log('Total walkable tiles:', this.game.walkableTiles.size);

    // Rebuild walkable tiles to ensure consistency
    this.game.rebuildWalkableTiles();

    // Add ambient effects
    this.game.populateTorches();
    this.game.addGroundGlows();

    // Center camera
    const centerX = mapWidth / 2 * this.game.tileSize;
    const centerZ = mapHeight / 2 * this.game.tileSize;
    this.game.camera.position.set(centerX, 18, centerZ + 12);
    this.game.camera.lookAt(centerX, 0, centerZ);
  }

  createTileFromIndex(x, y, index, isWalkable) {
    const group = new THREE.Group();
    const tileSize = this.game.tileSize;
    const tileTex = this.game.tileSheet.getTexture(index);

    if (tileTex) {
      const texGeo = new THREE.PlaneGeometry(tileSize, tileSize);
      const texMat = new THREE.MeshStandardMaterial({
        map: tileTex,
        transparent: true,
        side: THREE.DoubleSide,
        roughness: 0.8,
        metalness: 0.1
      });
      const texPlane = new THREE.Mesh(texGeo, texMat);
      texPlane.rotation.x = -Math.PI / 2;
      texPlane.position.set(x * tileSize, 0.001, y * tileSize);
      texPlane.receiveShadow = true;
      group.add(texPlane);
    }

    // Add 3D block for non-walkable tiles
    if (!isWalkable) {
      const blockHeight = tileSize * 0.4;
      const blockGeo = new THREE.BoxGeometry(tileSize * 0.9, blockHeight, tileSize * 0.9);
      const blockMat = new THREE.MeshStandardMaterial({
        map: this.game.tileSheet.getTexture(index),
        transparent: true,
        side: THREE.DoubleSide,
        roughness: 0.8,
        metalness: 0.1
      });
      const block = new THREE.Mesh(blockGeo, blockMat);
      block.position.set(x * tileSize, blockHeight / 2, y * tileSize);
      block.castShadow = true;
      block.receiveShadow = true;
      group.add(block);

      const topGeo = new THREE.BoxGeometry(tileSize * 0.95, 0.02, tileSize * 0.95);
      const topMat = new THREE.MeshBasicMaterial({ color: COLORS.EDGE, transparent: true, opacity: 0.2 });
      const top = new THREE.Mesh(topGeo, topMat);
      top.position.set(x * tileSize, blockHeight + 0.01, y * tileSize);
      group.add(top);
    }

    group.userData = { gridX: x, gridY: y, walkable: isWalkable, type: 'tile', tileIndex: index };
    this.game.mapGroup.add(group);
    return group;
  }

  createSimpleTile(x, y, color, walkable) {
    const group = new THREE.Group();
    const tileSize = this.game.tileSize;
    const height = 0.08;

    const baseGeo = new THREE.BoxGeometry(tileSize * 0.92, height, tileSize * 0.92);
    const baseMat = new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0.1 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.set(x * tileSize, -height / 2, y * tileSize);
    base.receiveShadow = true;
    group.add(base);

    const edgeGeo = new THREE.BoxGeometry(tileSize * 0.95, 0.02, tileSize * 0.95);
    const edgeMat = new THREE.MeshStandardMaterial({ color: COLORS.EDGE, transparent: true, opacity: COLORS.EDGE_OPACITY });
    const edge = new THREE.Mesh(edgeGeo, edgeMat);
    edge.position.set(x * tileSize, height / 2 + 0.01, y * tileSize);
    group.add(edge);

    group.userData = { gridX: x, gridY: y, walkable, type: 'tile' };
    this.game.mapGroup.add(group);
    return group;
  }
}
