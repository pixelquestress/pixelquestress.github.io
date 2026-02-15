// Game3D - Main game class orchestrating all systems

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.module.js';
import { CONFIG, COLORS, DIRECTIONS } from '../constants/index.js';
import { TileSheet } from '../tiles/TileSheet.js';
import { TileProperties } from '../tiles/TileProperties.js';
import { MapBuilder } from '../map/MapBuilder.js';
import { LegacyLevelBuilder } from '../map/LegacyLevelBuilder.js';
import { MapLoader } from '../map/MapLoader.js';
import { SpritePlayer } from '../entities/SpritePlayer.js';
import { Enemies } from '../entities/Enemies.js';
import { Decorations } from '../entities/Decorations.js';
import { AtmosphereEffects } from '../atmosphere/Effects.js';
import { LightsManager } from '../lighting/Lights.js';
import { CollisionSystem } from '../interaction/Collision.js';
import { EncounterSystem } from '../interaction/Encounter.js';
import { UIManager } from '../ui/UIManager.js';
import { Player3D } from '../player/Player3D.js';
import { BattleSystem3D } from '../battle/BattleSystem3D.js';

export class Game3D {
  constructor() {
    // Three.js core
    this.scene = null;
    this.camera = null;
    this.renderer = null;

    // Groups
    this.mapGroup = new THREE.Group();
    this.enemyGroup = new THREE.Group();
    this.playerGroup = new THREE.Group();

    // Player
    this.player = null;
    this.playerPos = null;
    this.playerVelocity = new THREE.Vector3();
    this.moveSpeed = CONFIG.TILE_SIZE * CONFIG.MOVE_SPEED_MULTIPLIER;
    this.keys = {};
    this.lastGridX = -1;
    this.lastGridY = -1;

    // Map state
    this.mapSize = CONFIG.MAP_SIZE;
    this.tileSize = CONFIG.TILE_SIZE;
    this.currentMapGrid = null;
    this.currentMapWidth = 0;
    this.currentMapHeight = 0;
    this.walkableTiles = new Set();

    // Tile system
    this.tileSheet = new TileSheet(this);
    this.tileProperties = new TileProperties();
    this.tileSheetLoaded = false;

    // Entities
    this.enemies = [];
    this.decorations = new Decorations(this);

    // Systems
    this.battleSystem = null;
    this.atmosphere = new AtmosphereEffects(this);
    this.lights = new LightsManager(this);
    this.collision = new CollisionSystem(this);
    this.encounter = new EncounterSystem(this);
    this.ui = new UIManager(this);

    // Sprite system
    this.spritePlayer = new SpritePlayer(this);
    this.useSprites = CONFIG.USE_SPRITES;
    this.playerFacing = DIRECTIONS.DOWN;
    this.player3D = null;

    // Animation
    this.clock = new THREE.Clock();

    // Map building
    this.mapBuilder = new MapBuilder(this);
    this.mapLoader = new MapLoader(this);
    this.legacyBuilder = new LegacyLevelBuilder(this);
  }

  async init() {
    this.setupScene();
    this.setupCamera();
    this.setupRenderer();
    this.setupLights();
    this.setupGroups();

    // Atmospheric effects
    this.atmosphere.createRain();
    this.atmosphere.createSmoke();

    // Preload sprites
    this.spritePlayer.preloadSprites();

    // Load tile sheet and then map
    this.tileSheet.loadTileSheet(async () => {
      this.tileSheetLoaded = true;

      // Load the jungle map
      await this.mapLoader.loadMapFromUrl('maps/jungle.txt');

      // Create player at spawn (Row 11, Column 40 => x=40, y=11)
      this.createPlayer(40, 11);

      // Create enemies
      this.enemies = new Enemies(this).createEnemies();

      // Setup battle system
      this.player = new Player3D();
      this.battleSystem = new BattleSystem3D(this.player);
      this.battleSystem.on('battleStart', (enemy) => this.onBattleStart(enemy));
      this.battleSystem.on('battleEnd', (result) => this.onBattleEnd(result));
      this.battleSystem.on('reward', (reward) => this.onReward(reward));

      // Setup input
      this.setupInput();

      // Setup UI
      this.setupUI();

      // Window resize
      window.addEventListener('resize', () => this.onResize());

      // Hide loading
      document.getElementById('loading').style.display = 'none';

      // Start animation loop
      this.animate();

      console.log('Tile sheet loaded, level built, ready to render forest tiles');
    });
  }

  setupScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(COLORS.SCENE_BG);
    this.scene.fog = new THREE.Fog(COLORS.FOG, 15, 45);
  }

  setupCamera() {
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
    this.camera.position.set(0, 18, 18);
    this.camera.lookAt(0, 0, 0);
  }

  setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('game-container').appendChild(this.renderer.domElement);
  }

  setupLights() {
    const ambient = new THREE.AmbientLight(COLORS.AMBIENT, COLORS.AMBIENT_INTENSITY);
    this.scene.add(ambient);

    const directionalLight = new THREE.DirectionalLight(COLORS.DIRECTIONAL, COLORS.DIRECTIONAL_INTENSITY);
    directionalLight.position.set(1, 100, 1);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 10;
    this.scene.add(directionalLight);
  }

  setupGroups() {
    this.scene.add(this.mapGroup);
    this.scene.add(this.enemyGroup);
    this.scene.add(this.playerGroup);
  }

  setupInput() {
    document.addEventListener('keydown', (e) => {
      e.preventDefault();
      this.keys[e.key.toLowerCase()] = true;
      if (this.battleSystem.inBattle) {
        const key = e.key;
        if (key === '1' || key === '2' || key === '3' || key === '4') {
          this.handleBattleKey(key);
        }
      }
    });

    document.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
    });
  }

  setupUI() {
    this.ui.bindStartButton(() => this.startGame());
    this.ui.bindBattleButtons(
      () => this.battleSystem.playerAttack(),
      () => this.battleSystem.playerMagic(),
      () => this.battleSystem.useItem(),
      () => this.battleSystem.flee()
    );
  }

  createPlayer(startX, startY) {
    const group = new THREE.Group();

    if (this.useSprites) {
      const texture = this.spritePlayer.getSpriteTexture(this.playerFacing);
      this.spritePlayer.spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
      this.spritePlayer.playerSprite = new THREE.Sprite(this.spritePlayer.spriteMaterial);
      const scale = 1.2;
      this.spritePlayer.playerSprite.scale.set(scale, scale, 1);
      this.spritePlayer.playerSprite.position.y = 1.0;
      group.add(this.spritePlayer.playerSprite);
      this.spritePlayer.setSpriteMaterial(this.spritePlayer.spriteMaterial);
      this.spritePlayer.setPlayerSprite(this.spritePlayer.playerSprite);
    } else {
      this.create3DPlayerMesh(group);
    }

    this.playerGroup.add(group);
    this.player3D = group;

    // Add player light
    const playerLight = new THREE.PointLight(0xffffff, 5, 150);
    playerLight.castShadow = true;
    this.player3D.add(playerLight);

    // Set position
    this.playerPos = new THREE.Vector3(startX * this.tileSize, 0, startY * this.tileSize);
    this.playerGroup.position.copy(this.playerPos);
    this.lastGridX = Math.round(this.playerPos.x / this.tileSize);
    this.lastGridY = Math.round(this.playerPos.z / this.tileSize);
  }

  create3DPlayerMesh(group) {
    // Body (tunic)
    const bodyGeo = new THREE.CylinderGeometry(0.25, 0.35, 0.9, 7);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2a5a8a, roughness: 0.8, metalness: 0.1 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.45;
    body.castShadow = true;
    group.add(body);

    // Head
    const headGeo = new THREE.SphereGeometry(0.2, 8, 6);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xffd5c0, roughness: 0.6, metalness: 0.0 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.05;
    head.castShadow = true;
    group.add(head);

    // Hair
    const hairGeo = new THREE.SphereGeometry(0.22, 8, 6);
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.9, metalness: 0.0 });
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.y = 1.15;
    hair.scale.set(1, 0.8, 1);
    group.add(hair);

    // Sword
    const swordHandleGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.3, 6);
    const swordMat = new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.9, metalness: 0.0 });
    const handle = new THREE.Mesh(swordHandleGeo, swordMat);
    handle.position.set(0.2, 0.6, -0.25);
    handle.rotation.z = 0.3;
    group.add(handle);

    const bladeGeo = new THREE.BoxGeometry(0.04, 0.6, 0.02);
    const bladeMat = new THREE.MeshStandardMaterial({ color: 0xccddee, metalness: 0.8, roughness: 0.2 });
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.position.set(0.25, 0.9, -0.25);
    blade.rotation.z = 0.3;
    group.add(blade);
  }

  startGame() {
    this.ui.hideStartScreen();
    this.showMessage('Use WASD or arrows to move. Find and battle enemies!');
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  showMessage(text, duration = 3000) {
    this.ui.showMessage(text, duration);
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    const delta = this.clock.getDelta();
    this.update(delta);
    this.render();
  }

  update(delta) {
    if (this.battleSystem.inBattle) return;

    this.spritePlayer.updateAnimation(delta);

    // Handle movement
    this.handleMovement(delta);

    // Update camera
    this.updateCamera();

    // Update enemies
    this.updateEnemies();

    // Update effects
    this.atmosphere.update(delta);
    this.lights.updateTorches();
  }

  handleMovement(delta) {
    let dx = 0, dy = 0;
    if (this.keys['arrowup'] || this.keys['w']) dy = -1;
    if (this.keys['arrowdown'] || this.keys['s']) dy = 1;
    if (this.keys['arrowleft'] || this.keys['a']) dx = -1;
    if (this.keys['arrowright'] || this.keys['d']) dx = 1;

    if (dx !== 0 || dy !== 0) {
      const length = Math.sqrt(dx * dx + dy * dy);
      dx /= length;
      dy /= length;
      this.playerVelocity.set(dx * this.moveSpeed, 0, dy * this.moveSpeed);
    } else {
      this.playerVelocity.set(0, 0, 0);
    }

    if (this.playerVelocity.length() > 0) {
      const moveAmount = this.playerVelocity.clone().multiplyScalar(delta);
      const newPos = this.playerPos.clone().add(moveAmount);
      if (this.collision.canMoveTo(newPos)) {
        this.playerPos.copy(newPos);
        this.playerGroup.position.copy(this.playerPos);
        this.updatePlayerFacing(dx, dy);
      } else {
        this.playerVelocity.set(0, 0, 0);
      }
    }

    // Check grid position for encounters
    const gridX = Math.round(this.playerPos.x / this.tileSize);
    const gridY = Math.round(this.playerPos.z / this.tileSize);

    if (this.encounter.checkGridChanged(gridX, gridY)) {
      if (!this.encounter.checkEnemyEncounter(gridX, gridY)) {
        this.encounter.checkChest(gridX, gridY);
      }
    }
  }

  updatePlayerFacing(dx, dy) {
    if (Math.abs(dx) > Math.abs(dy)) {
      this.playerFacing = dx > 0 ? 'right' : 'left';
    } else {
      this.playerFacing = dy > 0 ? 'down' : 'up';
    }
    this.spritePlayer.setFacing(this.playerFacing);
  }

  updateCamera() {
    const baseOffset = new THREE.Vector3(0, 18, 12);
    const velocityOffset = new THREE.Vector3(
      -this.playerVelocity.x * 0.05,
      0,
      -this.playerVelocity.z * 0.05
    );
    const desiredCameraPos = this.playerPos.clone().add(baseOffset).add(velocityOffset);
    this.camera.position.lerp(desiredCameraPos, 0.1);
    this.camera.lookAt(this.playerPos);
  }

  updateEnemies() {
    const time = Date.now() * 0.003;
    this.enemies.forEach((enemy, i) => {
      if (enemy.alive) {
        enemy.mesh.position.y = 0.1 + Math.sin(time + i) * 0.05;
        enemy.mesh.rotation.y = Math.sin(time * 0.5 + i) * 0.1;
      }
    });
  }

  buildFromMap(grid, nonWalkableSet) {
    this.mapBuilder.buildFromMap(grid, nonWalkableSet);
  }

  createTile(x, y, typeOrIndex, walkable = null) {
    // This method is needed for legacyLevelBuilder compatibility
    if (typeof typeOrIndex === 'number') {
      return this.createTileFromIndex(x, y, typeOrIndex, walkable);
    } else if (typeof typeOrIndex === 'string') {
      return this.decorations.createDecorativeTile(x, y, typeOrIndex);
    }
    return this.createTileFromIndex(x, y, 1, walkable);
  }

  createTileFromIndex(x, y, index, isWalkable) {
    return this.mapBuilder.createTileFromIndex(x, y, index, isWalkable);
  }

  createDecorativeTile(x, y, type) {
    return this.decorations.createDecorativeTile(x, y, type);
  }

  rebuildWalkableTiles() {
    this.walkableTiles.clear();
    const seen = new Set();
    for (let i = this.mapGroup.children.length - 1; i >= 0; i--) {
      const child = this.mapGroup.children[i];
      const data = child.userData;
      if (!data) continue;
      const key = `${data.gridX},${data.gridY}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (data.walkable) {
        this.walkableTiles.add(key);
      }
    }
  }

  populateTorches() {
    this.lights.populateTorches();
  }

  addGroundGlows() {
    this.lights.addGroundGlows();
  }

  getMapCharAt(x, y) {
    if (!this.currentMapGrid || y < 0 || y >= this.currentMapGrid.length || x < 0 || x >= this.currentMapGrid[y].length) {
      return '?';
    }
    return this.currentMapGrid[y][x];
  }

  findSpawnPosition() {
    const mapWidth = this.currentMapWidth || this.mapSize;
    const mapHeight = this.currentMapHeight || this.mapSize;

    for (let y = 0; y < mapHeight; y++) {
      for (let x = 0; x < mapWidth; x++) {
        const key = `${x},${y}`;
        if (this.walkableTiles.has(key)) {
          return { x, y };
        }
      }
    }

    console.error('No walkable tiles found in the map! Spawning at default position.');
    return { x: 0, y: 0 };
  }

  // Battle integration
  startBattle(enemy) {
    this.battleSystem.startBattle(enemy);
    this.battleSystem.updateUI();
    this.updateBattleEnemyHP();
    this.ui.showBattlePanel(true);
  }

  updateBattleEnemyHP() {
    this.ui.updateBattleEnemyHP();
  }

  onBattleStart(enemy) {
    this.ui.showBattlePanel(true);
    this.battleSystem.updateUI();
  }

  onBattleEnd(result) {
    this.ui.showBattlePanel(false);
    if (!result.victory) {
      this.showMessage('You were defeated! Refresh to try again.');
    } else {
      const enemy = this.battleSystem.enemy;
      if (enemy) {
        enemy.alive = false;
        enemy.mesh.visible = false;
        this.showMessage(`${enemy.name} defeated!`);
      }
    }
    this.ui.updatePlayerStats();
  }

  onReward(reward) {
    this.ui.updatePlayerStats();
  }

  handleBattleKey(key) {
    switch (key) {
      case '1': this.battleSystem.playerAttack(); break;
      case '2': this.battleSystem.playerMagic(); break;
      case '3': this.battleSystem.useItem(); break;
      case '4': this.battleSystem.flee(); break;
    }
  }

  // Build level 1 (legacy procedural)
  buildLevel1() {
    this.legacyBuilder.buildLevel1();
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
