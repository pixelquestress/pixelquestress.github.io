// Decorations - Chests, flowers, and other decorative tiles

import { COLORS } from '../constants/index.js';
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.module.js';

export class Decorations {
  constructor(game) {
    this.game = game;
    this.chests = [];
  }

  createDecorativeTile(x, y, type) {
    // Track chests in internal list
    if (type === 'chest') {
      this.addChest(x, y);
    }

    const group = new THREE.Group();
    const tileColors = {
      chest: COLORS.CHEST,
      flower: COLORS.FLOWER
    };
    const height = type === 'chest' ? 0.25 : 0.08;
    const tileSize = this.game.tileSize;

    // Base tile with edge
    this.createBaseTile(group, x, y, tileColors[type], height, tileSize);

    if (type === 'chest') {
      this.createChest(group, x, y, tileSize);
    }

    if (type === 'flower') {
      this.createFlower(group, x, y);
    }

    group.userData = { gridX: x, gridY: y, walkable: true, type };
    this.game.mapGroup.add(group);
    return group;
  }

  createBaseTile(group, x, y, color, height, tileSize) {
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
  }

  createChest(group, x, y, tileSize) {
    const boxGeo = new THREE.BoxGeometry(0.65, 0.35, 0.45);
    const boxMat = new THREE.MeshStandardMaterial({
      color: COLORS.CHEST,
      emissive: COLORS.CHEST_EMISSIVE,
      emissiveIntensity: 0.15,
      roughness: 0.6,
      metalness: 0.2
    });
    const chest = new THREE.Mesh(boxGeo, boxMat);
    chest.position.set(x * tileSize, 0.175, y * tileSize);
    chest.castShadow = true;
    group.add(chest);

    const glowGeo = new THREE.BoxGeometry(0.7, 0.05, 0.5);
    const glowMat = new THREE.MeshBasicMaterial({ color: COLORS.CHEST_GLOW, transparent: true, opacity: 0.3 });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.set(x * tileSize, -0.2, y * tileSize);
    group.add(glow);
  }

  createFlower(group, x, y) {
    const flowerGeo = new THREE.SphereGeometry(0.1, 6, 6);
    const flowerMat = new THREE.MeshStandardMaterial({ color: COLORS.FLOWER, roughness: 0.7, metalness: 0.1 });
    const flower = new THREE.Mesh(flowerGeo, flowerMat);
    flower.position.set(x * this.game.tileSize, 0.15, y * this.game.tileSize);
    group.add(flower);
  }

  addChest(x, y) {
    this.chests.push({ x, y, opened: false });
  }

  getChest(gridX, gridY) {
    return this.chests.find(c => c.x === gridX && c.y === gridY && !c.opened);
  }

  openChest(chest) {
    chest.opened = true;
    this.game.player.inventory.potions += 1;
    this.game.showMessage('Found a treasure chest! +1 Potion');
    // Remove chest mesh
    const chestMesh = this.game.mapGroup.children.find(child => {
      const d = child.userData;
      return d && d.gridX === chest.x && d.gridY === chest.y && d.type === 'chest';
    });
    if (chestMesh) {
      this.game.mapGroup.remove(chestMesh);
    }
  }
}
