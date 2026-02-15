// Atmosphere - Rain and smoke particle effects

import { COLORS } from '../constants/index.js';
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.module.js';

export class AtmosphereEffects {
  constructor(game) {
    this.game = game;
    this.rain = null;
    this.smoke = null;
  }

  createRain() {
    const rainCount = COLORS.RAIN_COUNT;
    const positions = new Float32Array(rainCount * 3);
    for (let i = 0; i < rainCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 60;
      positions[i + 1] = Math.random() * 40;
      positions[i + 2] = (Math.random() - 0.5) * 60;
    }

    const rainGeometry = new THREE.BufferGeometry();
    rainGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const rainMaterial = new THREE.PointsMaterial({
      color: COLORS.RAIN_COLOR,
      size: COLORS.RAIN_SIZE,
      transparent: true,
      opacity: COLORS.RAIN_OPACITY
    });

    this.rain = new THREE.Points(rainGeometry, rainMaterial);
    this.game.scene.add(this.rain);
  }

  createSmoke() {
    const smokeCount = COLORS.SMOKE_COUNT;
    const positions = new Float32Array(smokeCount * 3);
    for (let i = 0; i < smokeCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 30;
      positions[i + 1] = Math.random() * 2;
      positions[i + 2] = (Math.random() - 0.5) * 30;
    }

    const smokeGeometry = new THREE.BufferGeometry();
    smokeGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const smokeMaterial = new THREE.PointsMaterial({
      color: COLORS.SMOKE_COLOR,
      size: COLORS.SMOKE_SIZE,
      transparent: true,
      opacity: COLORS.SMOKE_OPACITY
    });

    this.smoke = new THREE.Points(smokeGeometry, smokeMaterial);
    this.game.scene.add(this.smoke);
  }

  update(delta) {
    if (this.rain) {
      this.rain.rotation.y += delta * 0.15;
      const positions = this.rain.geometry.attributes.position.array;
      for (let i = 1; i < positions.length; i += 3) {
        positions[i] -= delta * COLORS.RAIN_SPEED;
        if (positions[i] < -2) positions[i] = 35;
      }
      this.rain.geometry.attributes.position.needsUpdate = true;
    }

    if (this.smoke) {
      this.smoke.rotation.y += delta * 0.08;
      const positions = this.smoke.geometry.attributes.position.array;
      for (let i = 1; i < positions.length; i += 3) {
        positions[i] += delta * COLORS.SMOKE_SPEED;
        if (positions[i] > 4) positions[i] = 0.1;
      }
      this.smoke.geometry.attributes.position.needsUpdate = true;
    }
  }
}
