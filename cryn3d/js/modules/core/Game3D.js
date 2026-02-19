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
import * as Effects from './Effects3D.js';
import * as TextureUtils from './TextureUtils.js';
import { AudioManager } from './AudioManager.js';
import { animateCameraTo as ccAnimateCameraTo } from './CameraController.js';
import { BattleController } from './BattleController.js';

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
    // Battle transition state
    this._battleCameraState = null;
    this._battleSceneGroup = null;
    this._originalBackground = null;
    this._battleEnemyClone = null;
    this.inBattleMode = false;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this._battleEnemyBaseScales = [];
    // Audio + controllers
    this.audio = new AudioManager();
    this.battleController = new BattleController(this, this.audio);
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

      // Do not pre-place enemies on the map; encounters are random
      this.enemies = [];

      // Setup battle system
      this.player = new Player3D();
      this.battleSystem = new BattleSystem3D(this.player);
      this.battleSystem.on('battleStart', (enemy) => this.onBattleStart(enemy));
      this.battleSystem.on('battleEnd', (result) => this.onBattleEnd(result));
      this.battleSystem.on('reward', (reward) => this.onReward(reward));
      // Visual effects for attacks/magic
      this.battleSystem.on('attack', (data) => this.onBattleAttack(data));
      this.battleSystem.on('magic', (data) => this.onBattleMagic(data));
      // Update visuals when target changes or enemies are defeated
      this.battleSystem.on('targetChanged', () => this.updateBattleSelectionVisuals());
      this.battleSystem.on('enemyDefeated', (d) => {
        const idx = d && typeof d.index === 'number' ? d.index : null;
        console.log('enemyDefeated event received, idx=', idx);
        if (idx === null) return;
        if (!this._battleEnemyClones || !this._battleEnemyClones[idx]) return;
        const node = this._battleEnemyClones[idx];
        // mark as dying to prevent further interaction
        node.userData.dying = true;
        // ensure material supports opacity
        if (node.material) {
          node.material.transparent = true;
          node.material.opacity = typeof node.material.opacity === 'number' ? node.material.opacity : 1;
        }

        // compute a matching color from the enemy texture (if available)
        let preferredColor = null;
        try {
          const tex = node.material && node.material.map ? node.material.map : null;
          const avg = TextureUtils.getAverageColorFromTexture(tex);
          if (avg) preferredColor = `rgba(${avg.r},${avg.g},${avg.b},1)`;
        } catch (e) {
          preferredColor = null;
        }

        // spawn blood burst immediately (so it appears with or before the fade)
        const worldPos = new THREE.Vector3();
        node.getWorldPosition(worldPos);
        Effects.spawnBloodBurst(this.scene, worldPos, 700, 14, preferredColor);

        // Play a death/fade effect in parallel, then remove the clone and reindex remaining clones
        Effects.animateEnemyDeath(this.scene, node, 700).then(() => {
          // remove from scene/group
          this._battleSceneGroup && this._battleSceneGroup.remove(node);
          // remove from arrays
          this._battleEnemyClones.splice(idx, 1);
          this._battleEnemyBaseScales.splice(idx, 1);
          // re-index remaining clones
          for (let i = 0; i < this._battleEnemyClones.length; i++) {
            this._battleEnemyClones[i].userData.enemyIndex = i;
          }
          // update visuals
          this.updateBattleSelectionVisuals();
        }).catch(() => {
          // fallback immediate removal
          this._battleSceneGroup && this._battleSceneGroup.remove(node);
        });
      });

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

        // Background music via AudioManager
        try {
          this.audio.playBackground('cryn/music/forestmu.ogg', { loop: true, volume: 0.6 });
        } catch (e) {
          console.warn('Background music init failed', e);
        }

      // no automatic test battle here anymore

      console.log('Tile sheet loaded, level built, ready to render forest tiles');
    });
  }

  getBattleBackgroundForEnemy(typeOrEnemy) {
    // Simple mapping based on enemy bmp or type; default to forest
    return 'cryn/graphics/forest.bmp';
  }

  onBattleAttack(data) {
    // data may be {damage, targetIndex} for player attacks or {damage, target:'player'} for enemy attacks
    const fromWorld = new THREE.Vector3();
    const toWorld = new THREE.Vector3();
    if (typeof data.targetIndex === 'number' && this._battleEnemyClones && this._battleEnemyClones[data.targetIndex]) {
      // player's attack -> target enemy
      const enemyNode = this._battleEnemyClones[data.targetIndex];
      this._battlePlayerClone.getWorldPosition(fromWorld);
      enemyNode.getWorldPosition(toWorld);
      // diagonal slash across the enemy from top-right to bottom-left
      Effects.createJaggedSlashAt(this.scene, toWorld, 1.8, 'rgba(220,40,40,1)', 450, 12, 14, 1.0, this.audio.playSfx.bind(this.audio));
      Effects.showFloatingDamage(this.scene, toWorld, data.damage, 'white');
    } else if (data && data.target === 'player') {
      // enemy attacked player
      if (this._battlePlayerClone) this._battlePlayerClone.getWorldPosition(toWorld);
      // pick a random alive enemy world position as source if available
      const aliveNodes = (this._battleEnemyClones || []).filter(n => !n.userData.dying);
      if (aliveNodes.length > 0) aliveNodes[Math.floor(Math.random() * aliveNodes.length)].getWorldPosition(fromWorld);
      else fromWorld.copy(toWorld).add(new THREE.Vector3(-1,0,0));
      // show slash across the player (top-right -> bottom-left)
      // nudge the slash upward/left so it aligns with the player's head
      toWorld.add(new THREE.Vector3(-0.25, 0.55, -0.08));
      // shorten the slash end so it doesn't overshoot the player's lower-left
      Effects.createJaggedSlashAt(this.scene, toWorld, 1.6, 'rgba(220,40,40,1)', 450, 10, 12, 0.82, this.audio.playSfx.bind(this.audio));
      Effects.showFloatingDamage(this.scene, toWorld, data.damage, 'red');
    } else {
      // fallback: play a simple effect between player and center
      this._battlePlayerClone && this._battlePlayerClone.getWorldPosition(fromWorld);
      const center = this._battleSceneGroup ? this._battleSceneGroup.position.clone() : this.playerPos.clone();
      toWorld.copy(center);
      Effects.createJaggedSlashAt(this.scene, toWorld, 1.2, 'rgba(220,40,40,1)', 380, 8, 10, 1.0, this.audio.playSfx.bind(this.audio));
    }
  }

  onBattleMagic(data) {
    // similar to attack but with magic visuals
    const fromWorld = new THREE.Vector3();
    const toWorld = new THREE.Vector3();
    if (typeof data.targetIndex === 'number' && this._battleEnemyClones && this._battleEnemyClones[data.targetIndex]) {
      const enemyNode = this._battleEnemyClones[data.targetIndex];
      this._battlePlayerClone.getWorldPosition(fromWorld);
      enemyNode.getWorldPosition(toWorld);
      Effects.playBattleEffect(this.scene, 'magicmissile', fromWorld, toWorld, 600, this.audio.playSfx.bind(this.audio));
      Effects.showFloatingDamage(this.scene, toWorld, data.damage, 'white');
    } else if (data && data.target === 'player') {
      if (this._battlePlayerClone) this._battlePlayerClone.getWorldPosition(toWorld);
      const aliveNodes = (this._battleEnemyClones || []).filter(n => !n.userData.dying);
      if (aliveNodes.length > 0) aliveNodes[Math.floor(Math.random() * aliveNodes.length)].getWorldPosition(fromWorld);
      else fromWorld.copy(toWorld).add(new THREE.Vector3(-1,0,0));
      Effects.playBattleEffect(this.scene, 'magicmissile', fromWorld, toWorld, 600, this.audio.playSfx.bind(this.audio));
      Effects.showFloatingDamage(this.scene, toWorld, data.damage, 'red');
    } else {
      this._battlePlayerClone && this._battlePlayerClone.getWorldPosition(fromWorld);
      const center = this._battleSceneGroup ? this._battleSceneGroup.position.clone() : this.playerPos.clone();
      toWorld.copy(center);
      Effects.playBattleEffect(this.scene, 'magicmissile', fromWorld, toWorld, 600, this.audio.playSfx.bind(this.audio));
    }
  }

  async playBattleEffect(effectName, fromPos, toPos, duration = 600) {
    return Effects.playBattleEffect(this.scene, effectName, fromPos, toPos, duration, this.audio.playSfx.bind(this.audio));
  }

  // Create a quick slash effect as a camera-facing sprite moving from->to
  createSlashEffect(fromPos, toPos, color = 'white', duration = 450) {
    return Effects.createSlashEffect(this.scene, fromPos, toPos, color, duration);
  }

  // Create a diagonal slash centered on a world position.
  // rotationDeg:  -45 will be top-right -> bottom-left in screen space
  createDiagonalSlashAt(worldPos, size = 2.2, rotationDeg = -45, color = 'rgba(220,40,40,1)', duration = 450) {
    return Effects.createDiagonalSlashAt(this.scene, worldPos, size, rotationDeg, color, duration);
  }

  // Create a jagged slash that grows from the upper-right to bottom-left across a target.
  createJaggedSlashAt(worldPos, size = 2.2, color = 'rgba(220,40,40,1)', duration = 450, segments = 10, jitter = 12, lengthFactor = 1.0) {
    return Effects.createJaggedSlashAt(this.scene, worldPos, size, color, duration, segments, jitter, lengthFactor, this.audio.playSfx.bind(this.audio));
  }

  // Show floating damage number above a world position using a Sprite with text
  showFloatingDamage(worldPos, amount, color = 'white', duration = 900) {
    return Effects.showFloatingDamage(this.scene, worldPos, amount, color, duration);
  }

  // Load an image and convert near-black pixels to transparent, returning a THREE.Texture
  loadTextureMakeTransparent(path, threshold = 24) {
    return TextureUtils.loadTextureMakeTransparent(path, threshold);
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
      // If we're in cinematic battle mode, only allow battle keys
      if (this.inBattleMode || (this.battleSystem && this.battleSystem.inBattle)) {
        const key = e.key;
        if (key === '1' || key === '2' || key === '3' || key === '4') {
          this.handleBattleKey(key);
        }
        return;
      }

      this.keys[e.key.toLowerCase()] = true;
    });

    document.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
    });

    // Pointer selection for battle targets
    document.addEventListener('pointerdown', (e) => {
      if (!(this.inBattleMode || (this.battleSystem && this.battleSystem.inBattle))) return;
      if (!this._battleEnemyClones || this._battleEnemyClones.length === 0) return;
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObjects(this._battleEnemyClones, true);
      if (intersects && intersects.length > 0) {
        // find the top-most clone object with enemyIndex
        let obj = intersects[0].object;
        while (obj && typeof obj.userData.enemyIndex !== 'number') obj = obj.parent;
        if (obj && typeof obj.userData.enemyIndex === 'number') {
          const idx = obj.userData.enemyIndex;
          this.battleSystem.selectEnemy(idx);
          this.updateBattleSelectionVisuals();
        }
      }
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

  updateBattleSelectionVisuals() {
    if (!this._battleEnemyClones || !this._battleEnemyBaseScales) return;
    const sel = this.battleSystem && typeof this.battleSystem.selectedIndex === 'number' ? this.battleSystem.selectedIndex : 0;
    for (let i = 0; i < this._battleEnemyClones.length; i++) {
      const node = this._battleEnemyClones[i];
      const base = this._battleEnemyBaseScales[i] || new THREE.Vector3(1,1,1);
      if (node.isSprite || node.isMesh) {
        node.scale.copy(base);
        if (i === sel) node.scale.multiplyScalar(1.15);
      }
    }
  }

  // Animate an enemy clone's death (fade + scale) and resolve when removed
  animateEnemyDeath(node, duration = 600) {
    return Effects.animateEnemyDeath(this.scene, node, duration);
  }

  // Try to compute an average color from a THREE.Texture (returns {r,g,b} or null)
  getAverageColorFromTexture(tex) {
    return TextureUtils.getAverageColorFromTexture(tex);
  }

  // Darken an rgba/hex color string by factor (0..1)
  darkenColor(colorStr, factor = 0.7) {
    return TextureUtils.darkenColor(colorStr, factor);
  }

  // Spawn a blood particle burst at world position
  spawnBloodBurst(worldPos, duration = 700, particleCount = 12, color = null) {
    return Effects.spawnBloodBurst(this.scene, worldPos, duration, particleCount, color);
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
    // Mark game as in battle mode to block movement
    this.inBattleMode = true;
    // clear movement keys and velocity
    this.keys = {};
    this.playerVelocity.set(0,0,0);
    if (this.playerGroup) this.playerGroup.visible = false;

    // Use AudioManager to stop background and start battle music
    try {
      this.audio.stopBackground();
      this.audio.playBattle('cryn/music/battlemu.ogg', { loop: true, volume: 0.9 });
    } catch (e) {
      console.warn('Battle music init failed', e);
    }

    // Animate into a cinematic battle view
    this.animateBattleStart().catch(err => console.error(err));
  }

  updateBattleEnemyHP() {
    this.ui.updateBattleEnemyHP();
  }

  onBattleStart(enemy) {
    // delegate to BattleController
    try { this.battleController.onBattleStart(enemy); } catch (e) {}
  }

  onBattleEnd(result) {
    // Animate camera back to normal then update UI (delegate UI/audio to BattleController)
    this.animateBattleEnd(result).then(() => {
      try { this.audio.stopBattle(); this.audio.playBackground('cryn/music/forestmu.ogg', { loop: true, volume: 0.6 }); } catch (e) {}
      try { this.battleController.onBattleEnd(result); } catch (e) {}
    }).catch(err => { console.error(err); });
  }

  // Smoothly tween the camera position and lookAt point with ease-in-out
  animateCameraTo(targetPos, targetLookAt, duration = 1200) {
    const targetFov = arguments.length >= 4 ? arguments[3] : undefined;
    return ccAnimateCameraTo(this.camera, targetPos, targetLookAt, duration, targetFov);
  }

  // Transition into the battle scene: clone enemy, change background, move camera
  async animateBattleStart(enemy) {
    // Use battleSystem.enemies (array) or battleSystem.enemy (single)
    const enemies = this.battleSystem.enemies && this.battleSystem.enemies.length ? this.battleSystem.enemies : (this.battleSystem.enemy ? [this.battleSystem.enemy] : []);
    if (!enemies || enemies.length === 0) return;

    // Save camera/background state (include FOV and current lookAt)
    const startLookDir = new THREE.Vector3();
    this.camera.getWorldDirection(startLookDir);
    const startLookAt = this.camera.position.clone().add(startLookDir.multiplyScalar(10));
    this._battleCameraState = {
      pos: this.camera.position.clone(),
      lookAt: startLookAt,
      background: this.scene.background,
      fov: this.camera.fov
    };

    // Keep the map visible; we will dim with a semi-transparent backdrop but not hide map/enemy groups

    // Create a dedicated battle staging group centered near the player
    this._battleSceneGroup = new THREE.Group();
    this._battleSceneGroup.position.copy(this.playerPos);

    // (No backdrop plane: keep the map visible under the battle staging)

    // Create enemy sprites/billboards on the left, stacked vertically.
    // Load textures and convert black background to transparency first.
    this._battleEnemyClones = [];
    const texPromises = enemies.map(e => {
      if (e && e.bmp) return this.loadTextureMakeTransparent(e.bmp).catch(() => null);
      return Promise.resolve(null);
    });

    const texResults = await Promise.all(texPromises);
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      const tex = texResults[i];
      let node;
      if (tex) {
        const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
        // alphaTest removes faint edges from non-alpha formats
        mat.alphaTest = 0.05;
        mat.depthWrite = false;
        mat.depthTest = false; // ensure battle sprites render above tiles
        const sprite = new THREE.Sprite(mat);
        sprite.renderOrder = 900;
        // scale down sprites slightly so they don't dominate the view
        const baseScale = this.tileSize * (1.0 + (enemies.length - i) * 0.12);
        const scale = baseScale * 0.65;
        sprite.scale.set(scale, scale, 1);
        sprite.position.set(-3, 0.9 + i * 1.0, -2 - i * 0.8);
        node = sprite;
      } else {
        // fallback: simple box
        const geo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
        const mat = new THREE.MeshStandardMaterial({ color: 0x884422 });
        // make sure fallback mesh also appears above tiles
        mat.depthTest = false;
        const mesh = new THREE.Mesh(geo, mat);
        mesh.renderOrder = 900;
        mesh.position.set(-3, 0.4 + i * 0.6, -2 - i * 0.8);
        node = mesh;
      }
      node.userData = { enemy: e, enemyIndex: i };
      this._battleSceneGroup.add(node);
      this._battleEnemyClones.push(node);
      // store base scale for selection visuals
      if (node.scale) this._battleEnemyBaseScales.push(node.scale.clone());
    }

    // Create a player battle representation (clone or simple billboard) on the right
    let playerClone = null;
    if (this.player3D) {
      playerClone = this.player3D.clone(true);
      playerClone.traverse((c) => { if (c.isLight) c.visible = false; });
      // start clone at the player's current position (relative to the battle group)
      playerClone.position.set(0, 0, 0);
      playerClone.scale.set(1.0, 1.0, 1.0);
    } else {
      // load hero sprite and make black transparent if necessary
      let pTex = null;
      try {
        pTex = await this.loadTextureMakeTransparent('cryn/graphics/crynhero.bmp').catch(() => null);
      } catch (e) { pTex = null; }
      if (pTex) {
        const pMat = new THREE.SpriteMaterial({ map: pTex, transparent: true });
        pMat.alphaTest = 0.05;
        pMat.depthWrite = false;
        const sprite = new THREE.Sprite(pMat);
        sprite.scale.set(this.tileSize * 0.8, this.tileSize * 0.8, 1);
        // start sprite at the player's world origin (group origin); animate into battle offset
        sprite.position.set(0, 0.9, 0);
        playerClone = sprite;
      } else {
        const fallback = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), new THREE.MeshStandardMaterial({ color: 0x446688 }));
        fallback.position.set(0, 0.4, 0);
        playerClone = fallback;
      }
    }

    this._battleSceneGroup.add(playerClone);
    this._battlePlayerClone = playerClone;
    this.scene.add(this._battleSceneGroup);

    // initialize selection to the first enemy and update visuals
    this.battleSystem.selectEnemy(0);
    this.updateBattleSelectionVisuals();

    // Do not change the scene background; keep the existing map background visible.

    // Compute camera target: zoom in and move slightly sideways so player is on the right
    // Use a milder closeup and slightly longer duration for a smoother effect
    // Camera offsets: position camera so player appears toward bottom-right of view
    const camOffset = new THREE.Vector3(0, 7, 8);
    const sideOffset = new THREE.Vector3(1.6, 0, -0.6);
    const center = this._battleSceneGroup.position.clone().add(new THREE.Vector3(0, 1.0, 0));
    const targetPos = center.clone().add(camOffset).add(sideOffset);
    // Shift the lookAt slightly toward the enemies (left/forward) so player sits bottom-right
    const targetLookAt = center.clone().add(new THREE.Vector3(-0.6, 0.6, -0.8));

    // Animate the player clone from the player's world origin to the battle offset
    const playerTargetLocal = new THREE.Vector3(3, 0.9, 2);
    const playerStartLocal = this._battlePlayerClone.position.clone();
    const animDuration = 1200;
    const startTime = performance.now();
    const animatePlayerTick = () => {
      const now = performance.now();
      let t = (now - startTime) / animDuration;
      if (t >= 1) t = 1;
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      this._battlePlayerClone.position.lerpVectors(playerStartLocal, playerTargetLocal, eased);
      if (t < 1) requestAnimationFrame(animatePlayerTick);
    };
    requestAnimationFrame(animatePlayerTick);

    // Animate camera position and FOV to a moderate close view (less extreme than before)
    await this.animateCameraTo(targetPos, targetLookAt, animDuration, 52);
  }

  // Transition back to exploration view
  async animateBattleEnd(result) {
    // Restore background
    if (this._originalBackground) this.scene.background = this._originalBackground;

    // Animate camera back (restore original FOV as well). Also animate the player clone
    // back to local origin so when we re-enable the real player it doesn't jump.
    const animDuration = 1200;
    if (this._battleCameraState) {
      const s = this._battleCameraState;
      const cameraPromise = this.animateCameraTo(s.pos, s.lookAt, animDuration, typeof s.fov === 'number' ? s.fov : this.camera.fov);

      let playerPromise = Promise.resolve();
      if (this._battlePlayerClone) {
        const startLocal = this._battlePlayerClone.position.clone();
        const targetLocal = new THREE.Vector3(0, 0, 0);
        playerPromise = new Promise((resolve) => {
          const t0 = performance.now();
          const tick = () => {
            const now = performance.now();
            let t = (now - t0) / animDuration;
            if (t >= 1) t = 1;
            const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
            this._battlePlayerClone.position.lerpVectors(startLocal, targetLocal, eased);
            if (t < 1) requestAnimationFrame(tick);
            else resolve();
          };
          requestAnimationFrame(tick);
        });
      }

      // Wait for both camera and player clone animations to finish
      await Promise.all([cameraPromise, playerPromise]);
    }

    // Remove battle clone and restore map
    if (this._battleSceneGroup) {
      this.scene.remove(this._battleSceneGroup);
      this._battleEnemyClone = null;
      this._battlePlayerClone = null;
      this._battleEnemyClones = null;
      this._battleSceneGroup = null;
    }

    // Un-hide map layers and enemyGroup and restore player
    this.mapGroup.visible = true;
    this.enemyGroup.visible = true;
    this.decorations.group && (this.decorations.group.visible = true);
    this.inBattleMode = false;
    this.keys = {};
    if (this.playerGroup) this.playerGroup.visible = true;

    // Un-hide the original enemy mesh if it still exists
    const enemy = this.battleSystem.enemy;
    if (enemy && enemy.mesh) {
      enemy.mesh.visible = enemy.alive;
    }

    // Clear saved state
    this._battleCameraState = null;
    this._originalBackground = null;
    if (this._battleBackdrop) {
      this._battleBackdrop = null;
    }
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
