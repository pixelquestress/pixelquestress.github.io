// Lighting - Torches and ground glows

import { COLORS, UI } from '../constants/index.js';
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.module.js';

export class LightsManager {
  constructor(game) {
    this.game = game;
    this.torches = [];
    this.groundGlows = [];
  }

  populateTorches() {
    this.clearTorches();
    const torchChars = UI.TORCH_CHARS;
    const torchColor = COLORS.TORCH_COLOR;

    if (!this.game.currentMapGrid) return;

    for (let y = 0; y < this.game.currentMapHeight; y++) {
      for (let x = 0; x < this.game.currentMapWidth; x++) {
        const char = this.game.currentMapGrid[y][x];
        if (torchChars.includes(char) && Math.random() < 0.1) {
          const torch = this.createTorch(x, y, torchColor);
          this.torches.push(torch);
        }
      }
    }
  }

  createTorch(gridX, gridY, color) {
    const torch = new THREE.Group();
    const tileSize = this.game.tileSize;

    // Stick
    const stickGeo = new THREE.CylinderGeometry(0.1, 0.1, 1.5, 8);
    const stickMat = new THREE.MeshLambertMaterial({ color: 0x553311 });
    const stick = new THREE.Mesh(stickGeo, stickMat);
    stick.position.y = 0.75;
    torch.add(stick);

    // Flame
    const flameGeo = new THREE.SphereGeometry(0.15, 16, 16);
    const flameMat = new THREE.MeshBasicMaterial({ color: COLORS.TORCH_COLOR, transparent: true, opacity: 0.9 });
    const flameMesh = new THREE.Mesh(flameGeo, flameMat);
    flameMesh.position.y = 1.5;
    torch.add(flameMesh);
    torch.flameMesh = flameMesh;

    // Light
    const flameLight = new THREE.PointLight(color, 3.5, 30);
    flameLight.position.set(0, 1.5, 0);
    torch.add(flameLight);
    torch.flame = flameLight;

    torch.position.set(
      gridX * tileSize + tileSize / 2,
      0,
      gridY * tileSize + tileSize / 2
    );
    this.game.scene.add(torch);
    return torch;
  }

  clearTorches() {
    this.torches.forEach(t => this.game.scene.remove(t));
    this.torches = [];
  }

  updateTorches() {
    for (const torch of this.torches) {
      const f = torch.flame;
      f.intensity = 1 + Math.random() * 0.3;
      f.position.x += (Math.random() - 0.5) * 0.02;
      f.position.z += (Math.random() - 0.5) * 0.02;
      const s = 1 + Math.random() * 0.2;
      torch.flameMesh.scale.set(s, s, s);
      const hueShift = COLORS.TORCH_COLOR + Math.floor(Math.random() * 0x002200);
      torch.flameMesh.material.color.setHex(hueShift);
    }
  }

  addGroundGlows() {
    this.clearGroundGlows();
    const glowColor = COLORS.GLOW_COLOR;
    const glowRadius = 0.1;
    const glowIntensity = COLORS.GLOW_INTENSITY;
    const glowDistance = COLORS.GLOW_DISTANCE;
    const glowChance = COLORS.GLOW_CHANCE;

    this.game.walkableTiles.forEach(key => {
      if (Math.random() < glowChance) {
        const [xStr, yStr] = key.split(',');
        const x = parseInt(xStr, 10);
        const y = parseInt(yStr, 10);
        const glowGroup = new THREE.Group();
        const sphereGeo = new THREE.SphereGeometry(glowRadius, 8, 8);
        const sphereMat = new THREE.MeshBasicMaterial({ color: glowColor, transparent: true, opacity: 1.0 });
        const sphere = new THREE.Mesh(sphereGeo, sphereMat);
        sphere.position.y = 0.05;
        glowGroup.add(sphere);
        const light = new THREE.PointLight(glowColor, glowIntensity, glowDistance);
        light.position.set(0, 0.1, 0);
        glowGroup.add(light);
        glowGroup.position.set(
          x * this.game.tileSize + this.game.tileSize / 2,
          0,
          y * this.game.tileSize + this.game.tileSize / 2
        );
        this.game.scene.add(glowGroup);
        this.groundGlows.push(glowGroup);
      }
    });
  }

  clearGroundGlows() {
    this.groundGlows.forEach(g => this.game.scene.remove(g));
    this.groundGlows = [];
  }
}
