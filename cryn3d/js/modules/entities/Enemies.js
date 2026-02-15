// Enemies - Enemy definitions and mesh creation

import { ENEMY_TYPES } from '../constants/index.js';
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.module.js';

export class Enemies {
  constructor(game) {
    this.game = game;
    this.enemyData = [];
    this.enemies = [];
  }

  createEnemies() {
    this.enemyData = [
      {
        x: 10, y: 6,
        name: 'Forest Slime',
        level: 1, hp: 15, maxHp: 15, attack: 3, defense: 1,
        xpReward: 25, goldReward: 8,
        color: 0x2ecc71,
        type: ENEMY_TYPES.SLIME
      },
      {
        x: 15, y: 11,
        name: 'Wild Boar',
        level: 2, hp: 25, maxHp: 25, attack: 5, defense: 2,
        xpReward: 40, goldReward: 15,
        color: 0xc0392b,
        type: ENEMY_TYPES.BOAR
      },
      {
        x: 7, y: 14,
        name: 'Forest Slime',
        level: 1, hp: 15, maxHp: 15, attack: 3, defense: 1,
        xpReward: 25, goldReward: 8,
        color: 0x2ecc71,
        type: ENEMY_TYPES.SLIME
      },
      {
        x: 0, y: 18,
        name: 'Ancient Guardian',
        level: 5, hp: 60, maxHp: 60, attack: 12, defense: 6,
        xpReward: 150, goldReward: 100,
        color: 0x8e44ad,
        type: ENEMY_TYPES.GUARDIAN
      }
    ];

    this.enemies = [];
    this.enemyData.forEach(data => {
      const enemy = this.createEnemyMesh(data);
      this.enemies.push(enemy);
      this.game.enemyGroup.add(enemy.mesh);
    });
    return this.enemies;
  }

  createEnemyMesh(data) {
    const group = new THREE.Group();
    const { type, color } = data;

    if (type === ENEMY_TYPES.SLIME) {
      this.createSlimeMesh(group, color);
    } else if (type === ENEMY_TYPES.BOAR) {
      this.createBoarMesh(group, color);
    } else if (type === ENEMY_TYPES.GUARDIAN) {
      this.createGuardianMesh(group, color);
    }

    group.position.set(data.x * this.game.tileSize, 0, data.y * this.game.tileSize);
    group.userData = { enemyData: data };
    return {
      mesh: group,
      x: data.x,
      y: data.y,
      ...data,
      alive: true
    };
  }

  createSlimeMesh(group, color) {
    // Slime: gelatinous cube with slight wobble
    const bodyGeo = new THREE.BoxGeometry(0.5, 0.35, 0.5);
    const bodyMat = new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.85, roughness: 0.6, metalness: 0.1 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.175;
    body.castShadow = true;
    group.add(body);

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.06, 6, 6);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.12, 0.25, 0.2);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.12, 0.25, 0.2);
    group.add(leftEye);
    group.add(rightEye);

    const pupilGeo = new THREE.SphereGeometry(0.03, 6, 6);
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const leftPupil = new THREE.Mesh(pupilGeo, pupilMat);
    leftPupil.position.set(-0.12, 0.25, 0.26);
    const rightPupil = new THREE.Mesh(pupilGeo, pupilMat);
    rightPupil.position.set(0.12, 0.25, 0.26);
    group.add(leftPupil);
    group.add(rightPupil);
  }

  createBoarMesh(group, color) {
    // Boar: elongated body, small tusks
    const bodyGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.8, 8);
    const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0.1 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.set(0, 0.4, -0.15);
    body.rotation.z = Math.PI / 2;
    body.castShadow = true;
    group.add(body);

    // Snout
    const snoutGeo = new THREE.SphereGeometry(0.15, 8, 6);
    const snout = new THREE.Mesh(snoutGeo, bodyMat);
    snout.position.set(0.35, 0.35, -0.15);
    snout.scale.set(1.2, 0.8, 0.9);
    group.add(snout);

    // Head
    const headGeo = new THREE.SphereGeometry(0.2, 8, 6);
    const head = new THREE.Mesh(headGeo, bodyMat);
    head.position.set(0.4, 0.25, -0.15);
    head.castShadow = true;
    group.add(head);

    // Tusks
    const tuskGeo = new THREE.ConeGeometry(0.03, 0.15, 4);
    const tuskMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0.4 });
    const leftTusk = new THREE.Mesh(tuskGeo, tuskMat);
    leftTusk.position.set(0.5, 0.15, -0.25);
    leftTusk.rotation.z = -0.5;
    const rightTusk = new THREE.Mesh(tuskGeo, tuskMat);
    rightTusk.position.set(0.5, 0.15, -0.05);
    rightTusk.rotation.z = 0.5;
    group.add(leftTusk);
    group.add(rightTusk);
  }

  createGuardianMesh(group, color) {
    // Guardian: larger, armored look
    const bodyGeo = new THREE.CylinderGeometry(0.35, 0.4, 1.2, 8);
    const bodyMat = new THREE.MeshStandardMaterial({ color, emissive: 0x220033, emissiveIntensity: 0.2, roughness: 0.5, metalness: 0.4 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.6;
    body.castShadow = true;
    group.add(body);

    // Helmet
    const helmetGeo = new THREE.SphereGeometry(0.3, 8, 6);
    const helmetMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.6, metalness: 0.7 });
    const helmet = new THREE.Mesh(helmetGeo, helmetMat);
    helmet.position.y = 1.1;
    helmet.castShadow = true;
    group.add(helmet);

    // Eyes (glowing)
    const eyeGeo = new THREE.SphereGeometry(0.05, 6, 6);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.15, 1.0, 0.2);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.15, 1.0, 0.2);
    group.add(leftEye);
    group.add(rightEye);
  }
}
