// IsoCryn 3D - Enhanced with Full Battle System

// Set to true to use actual Cryn sprite textures from assets/sprites/
const USE_SPRITES = true;

// Simple EventEmitter for battle events
class EventEmitter {
  constructor() {
    this.events = {};
  }
  on(event, callback) {
    if (!this.events[event]) this.events[event] = [];
    this.events[event].push(callback);
  }
  off(event, callback) {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter(cb => cb !== callback);
  }
  emit(event, data) {
    if (!this.events[event]) return;
    this.events[event].forEach(callback => callback(data));
  }
}

class Player3D {
  constructor() {
    this.level = 1;
    this.hp = 20;
    this.maxHp = 20;
    this.mp = 10;
    this.maxMp = 10;
    this.xp = 0;
    this.maxXp = 100;
    this.attack = 5;
    this.defense = 3;
    this.gold = 0;
    this.inventory = { potions: 2 };
    this.alive = true;
  }

  gainXp(amount) {
    this.xp += amount;
    while (this.xp >= this.maxXp && this.alive) {
      this.xp -= this.maxXp;
      this.levelUp();
    }
  }

  levelUp() {
    this.level++;
    this.maxHp += 10;
    this.hp = this.maxHp;
    this.maxMp += 5;
    this.mp = this.maxMp;
    this.maxXp = Math.floor(this.maxXp * 1.5);
    this.attack += 2;
    this.defense += 1;
    this.inventory.potions += 1;
    return `Level up! You are now level ${this.level}!`;
  }
}

// Extended Battle System with full logic
class BattleSystem3D extends EventEmitter {
  constructor(player) {
    super();
    this.player = player;
    this.enemy = null;
    this.turn = 'player';
    this.inBattle = false;
    this.battleLog = [];
  }

  startBattle(enemy) {
    this.enemy = enemy; // Use original reference
    this.enemy.hp = enemy.maxHp;
    this.enemy.mp = enemy.maxMp || 0;
    this.inBattle = true;
    this.turn = 'player';
    this.battleLog = [];
    this.emit('battleStart', this.enemy);
    this.log(`A wild ${this.enemy.name} appears!`);
  }

  endBattle(victory) {
    this.inBattle = false;
    this.emit('battleEnd', { victory, enemy: this.enemy });
  }

  gainRewards() {
    const xp = this.enemy.xpReward || 20;
    const gold = this.enemy.goldReward || Math.floor(Math.random() * 11) + 5;
    this.player.gainXp(xp);
    this.player.gold += gold;
    this.log(`Victory! Gained <b>${xp} XP</b> and <b>${gold} gold</b>.`);
    this.emit('reward', { xp, gold });
  }

  playerAttack() {
    if (!this.inBattle || this.turn !== 'player') return;

    const damage = Math.max(1, this.player.attack - Math.floor(this.enemy.defense / 2) + Math.floor(Math.random() * 4));
    this.enemy.hp -= damage;
    this.turn = 'enemy';
    this.log(`You attack for <span class="damage">${damage}</span> damage!`);
    this.emit('attack', { damage, target: 'enemy' });

    if (this.enemy.hp <= 0) {
      this.enemy.hp = 0;
      this.gainRewards();
      this.endBattle(true);
      return;
    }

    setTimeout(() => this.enemyTurn(), 800);
  }

  playerMagic() {
    if (!this.inBattle || this.turn !== 'player') return;

    const mpCost = 3;
    if (this.player.mp < mpCost) {
      this.log('Not enough MP!');
      return;
    }

    this.player.mp -= mpCost;
    const damage = Math.floor(this.player.attack * 1.5) + Math.floor(Math.random() * 4) + 2;
    this.enemy.hp -= damage;
    this.turn = 'enemy';
    this.log(`<span class="magic">Fireball</span> hits for <span class="damage">${damage}</span> damage!`);
    this.emit('magic', { damage, target: 'enemy' });

    if (this.enemy.hp <= 0) {
      this.enemy.hp = 0;
      this.gainRewards();
      this.endBattle(true);
      return;
    }

    setTimeout(() => this.enemyTurn(), 800);
  }

  useItem() {
    if (!this.inBattle || this.turn !== 'player') return;

    if (this.player.inventory.potions <= 0) {
      this.log('No potions left!');
      return;
    }

    this.player.inventory.potions--;
    const hpRestore = Math.floor(this.player.maxHp * 0.3);
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + hpRestore);
    this.turn = 'enemy';
    this.log(`Used potion. Restored <span class="heal">${hpRestore} HP</span>. (${this.player.inventory.potions} left)`);
    this.emit('item', { type: 'potion', amount: hpRestore });

    setTimeout(() => this.enemyTurn(), 800);
  }

  flee() {
    if (!this.inBattle || this.turn !== 'player') return;

    if (Math.random() < 0.5) {
      this.log('Fled successfully!');
      this.endBattle(false);
    } else {
      this.log('Could not flee!');
      this.turn = 'enemy';
      setTimeout(() => this.enemyTurn(), 800);
    }
  }

  enemyTurn() {
    if (!this.inBattle) return;

    const damage = Math.max(1, this.enemy.attack - this.player.defense + Math.floor(Math.random() * 3) - 1);
    this.player.hp -= damage;
    this.log(`${this.enemy.name} attacks for <span class="damage">${damage}</span> damage!`);
    this.emit('attack', { damage, target: 'player' });

    if (this.player.hp <= 0) {
      this.player.hp = 0;
      this.player.alive = false;
      this.endBattle(false);
      return;
    }

    this.turn = 'player';
  }

  log(message) {
    this.battleLog.push({ message, time: Date.now() });
    this.updateLogUI();
  }

  updateLogUI() {
    const logEl = document.getElementById('battle-log');
    if (!logEl) return;
    logEl.innerHTML = this.battleLog.map(entry => entry.message).join('<br>');
    logEl.scrollTop = logEl.scrollHeight;
  }

  updateUI() {
    if (!this.enemy) return;

    document.getElementById('enemy-name').textContent = this.enemy.name;
    document.getElementById('enemy-hp').textContent = `${this.enemy.hp}/${this.enemy.maxHp}`;
    const hpBar = document.getElementById('enemy-hp-bar');
    hpBar.max = this.enemy.maxHp;
    hpBar.value = this.enemy.hp;
    document.getElementById('mp-cost').textContent = 3;
  }
}

// Main Game3D with integrated battle system
class Game3D {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.player = null;
    this.player3D = null;
    this.mapSize = 20;
    this.tileSize = 2;
    this.playerPos = new THREE.Vector3(0, 0, 0);
    this.playerVelocity = new THREE.Vector3(0, 0, 0);
    this.moveSpeed = this.tileSize * 3; // units per second (adjustable)
    this.keys = {};
    this.lastGridX = -1;
    this.lastGridY = -1;
    this.enemies = [];
    this.battleSystem = null;
    this.mapGroup = new THREE.Group();
    this.enemyGroup = new THREE.Group();
    this.playerGroup = new THREE.Group();
    this.lightsGroup = new THREE.Group();
    this.clock = new THREE.Clock();
    this.walkableTiles = new Set();
    this.chests = [];
    this.torches = [];
    this.groundGlows = [];
    // Sprite rendering & animation
    this.spriteTextures = {};
    this.useSprites = USE_SPRITES;
    this.playerFacing = 'down';
    this.playerAnimState = 'idle';
    this.playerAnimFrame = 0;
    this.playerAnimTimer = 0;
    this.playerAnimInterval = 150; // ms
    this.spritesPreloaded = false;
    // Tile sheet system
    this.tileSheetCols = 10;
    this.tileSheetRows = 4;
    this.tileTextures = []; // Will hold 40 textures from BMP
    this.tileSheetLoaded = false;
  }

  async init() {
    // Scene with Cryn-inspired atmosphere
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0d1117); // Dark blue-grey
    this.scene.fog = new THREE.Fog(0x0d1117, 15, 45);

    // Camera (isometric)
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
    this.camera.position.set(0, 18, 18);
    this.camera.lookAt(0, 0, 0);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('game-container').appendChild(this.renderer.domElement);

    // Lighting setup (based on example)
    const ambient = new THREE.AmbientLight(0xbabaca, 0.70);
    this.scene.add(ambient);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.1);
    directionalLight.position.set(1, 100, 1);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 10;
    //this.scene.add(directionalLight);

    // Fog removed for better visibility
    //this.scene.fog = new THREE.FogExp2(0x000000, 0.03);

    // Groups
    this.scene.add(this.mapGroup);
    this.scene.add(this.enemyGroup);
    this.scene.add(this.playerGroup);
    this.scene.add(this.lightsGroup);

    // Atmospheric effects
    this.createRain();
    this.createSmoke();
    // Preload sprite textures
    this.preloadSprites();
    // Load tile sheet and then map
    this.loadTileSheet(async () => {
      // Load the jungle map (or any map) after textures are ready
      await this.loadMapFromUrl('maps/jungle.txt');

      // Create player at specified spawn (Row 11, Column 40 => x=40, y=11)
      this.createPlayer(40, 11);

      // Create enemies
      this.createEnemies();

      // Player state
      this.player = new Player3D();
      this.battleSystem = new BattleSystem3D(this.player);
      this.battleSystem.on('battleStart', (enemy) => this.onBattleStart(enemy));
      this.battleSystem.on('battleEnd', (result) => this.onBattleEnd(result));
      this.battleSystem.on('reward', (reward) => this.onReward(reward));

      // Input
      document.addEventListener('keydown', (e) => {
        e.preventDefault();
        this.keys[e.key.toLowerCase()] = true;
        if (this.battleSystem.inBattle) {
          if (e.key === '1' || e.key === '2' || e.key === '3' || e.key === '4') {
            this.handleBattleKey(e.key);
          }
        }
      });
      document.addEventListener('keyup', (e) => {
        this.keys[e.key.toLowerCase()] = false;
      });

      // UI buttons
      document.getElementById('btn-start').addEventListener('click', () => this.startGame());
      document.getElementById('btn-attack').addEventListener('click', () => this.battleSystem.playerAttack());
      document.getElementById('btn-magic').addEventListener('click', () => this.battleSystem.playerMagic());
      document.getElementById('btn-item').addEventListener('click', () => this.battleSystem.useItem());
      document.getElementById('btn-flee').addEventListener('click', () => this.battleSystem.flee());

      // Window resize
      window.addEventListener('resize', () => this.onResize());

      // Hide loading
      document.getElementById('loading').style.display = 'none';

      // Start animation loop
      this.animate();

      console.log('Tile sheet loaded, level built, ready to render forest tiles');
    });
  }

  createRain() {
    const rainGeometry = new THREE.BufferGeometry();
    const rainCount = 1500;
    const positions = new Float32Array(rainCount * 3);
    for (let i = 0; i < rainCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 60;
      positions[i + 1] = Math.random() * 40;
      positions[i + 2] = (Math.random() - 0.5) * 60;
    }
    rainGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const rainMaterial = new THREE.PointsMaterial({
      color: 0x88aaff,
      size: 0.15,
      transparent: true,
      opacity: 0.5
    });
    this.rain = new THREE.Points(rainGeometry, rainMaterial);
    this.scene.add(this.rain);
  }

  createSmoke() {
    const smokeGeometry = new THREE.BufferGeometry();
    const smokeCount = 200;
    const positions = new Float32Array(smokeCount * 3);
    for (let i = 0; i < smokeCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 30;
      positions[i + 1] = Math.random() * 2;
      positions[i + 2] = (Math.random() - 0.5) * 30;
    }
    smokeGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const smokeMaterial = new THREE.PointsMaterial({
      color: 0x666688,
      size: 0.8,
      transparent: true,
      opacity: 0.25
    });
    this.smoke = new THREE.Points(smokeGeometry, smokeMaterial);
    this.scene.add(this.smoke);
  }

  createTile(x, y, tileIndex) {
    const group = new THREE.Group();
    const props = this.getForestTileProperties(tileIndex);
    const walkable = props.walkable;
    const baseColor = props.color;
    const height = 0.08;

    // Base tile with slight bevel
    const baseGeo = new THREE.BoxGeometry(this.tileSize * 0.92, height, this.tileSize * 0.92);
    const baseMat = new THREE.MeshLambertMaterial({ color: baseColor });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.set(x * this.tileSize, -height/2, y * this.tileSize);
    base.receiveShadow = true;
    group.add(base);

    // Edge highlight
    const edgeGeo = new THREE.BoxGeometry(this.tileSize * 0.95, 0.02, this.tileSize * 0.95);
    const edgeMat = new THREE.MeshLambertMaterial({ color: 0x000000, transparent: true, opacity: 0.15 });
    const edge = new THREE.Mesh(edgeGeo, edgeMat);
    edge.position.set(x * this.tileSize, height/2 + 0.01, y * this.tileSize);
    group.add(edge);

    // If tile sheet loaded, apply the actual texture overlay
    if (this.tileSheetLoaded && this.tileTextures[tileIndex]) {
      const tileTex = this.tileTextures[tileIndex];
      const texGeo = new THREE.PlaneGeometry(this.tileSize * 0.9, this.tileSize * 0.9);
      const texMat = new THREE.MeshBasicMaterial({
        map: tileTex,
        transparent: true,
        side: THREE.DoubleSide
      });
      const texPlane = new THREE.Mesh(texGeo, texMat);
      texPlane.position.set(x * this.tileSize, 0.01, y * this.tileSize);
      group.add(texPlane);
    }

    group.userData = { gridX: x, gridY: y, walkable, type: 'tile', tileIndex };
    this.mapGroup.add(group);
    return group;
  }

  // Legacy decorative tile creation (chest, flowers)
  createDecorativeTile(x, y, type) {
    const group = new THREE.Group();
    const tileColors = {
      chest: 0xffd700,
      flower: 0xcc6666
    };
    const height = type === 'chest' ? 0.25 : 0.08;

    const baseGeo = new THREE.BoxGeometry(this.tileSize * 0.92, height, this.tileSize * 0.92);
    const baseMat = new THREE.MeshLambertMaterial({ color: tileColors[type] });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.set(x * this.tileSize, -height/2, y * this.tileSize);
    base.receiveShadow = true;
    group.add(base);

    const edgeGeo = new THREE.BoxGeometry(this.tileSize * 0.95, 0.02, this.tileSize * 0.95);
    const edgeMat = new THREE.MeshLambertMaterial({ color: 0x000000, transparent: true, opacity: 0.15 });
    const edge = new THREE.Mesh(edgeGeo, edgeMat);
    edge.position.set(x * this.tileSize, height/2 + 0.01, y * this.tileSize);
    group.add(edge);

    if (type === 'chest') {
      const boxGeo = new THREE.BoxGeometry(0.65, 0.35, 0.45);
      const boxMat = new THREE.MeshLambertMaterial({
        color: tileColors.chest,
        emissive: 0xaa6600,
        emissiveIntensity: 0.15
      });
      const chest = new THREE.Mesh(boxGeo, boxMat);
      chest.position.set(x * this.tileSize, 0.175, y * this.tileSize);
      chest.castShadow = true;
      group.add(chest);
      const glowGeo = new THREE.BoxGeometry(0.7, 0.05, 0.5);
      const glowMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.3 });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      glow.position.set(x * this.tileSize, -0.2, y * this.tileSize);
      group.add(glow);
    }

    if (type === 'flower') {
      const flowerGeo = new THREE.SphereGeometry(0.1, 6, 6);
      const flowerMat = new THREE.MeshLambertMaterial({ color: 0xff6b8a });
      const flower = new THREE.Mesh(flowerGeo, flowerMat);
      flower.position.set(x * this.tileSize, 0.15, y * this.tileSize);
      group.add(flower);
    }

    group.userData = { gridX: x, gridY: y, walkable: true, type };
    this.mapGroup.add(group);
    return group;
  }

  // Overloaded createTile for backward compatibility
  createTile(x, y, typeOrIndex, walkable = null) {
    if (typeof typeOrIndex === 'number') {
      // Tile sheet index
      return this.createTileFromIndex(x, y, typeOrIndex, walkable);
    } else if (typeof typeOrIndex === 'string') {
      const type = typeOrIndex;
      if (type === 'grass' || type === 'path' || type === 'tree') {
        // Map legacy types to tile indices for transition (temporary)
        const indexMap = { 'grass': 1, 'path': 18, 'tree': 0 };
        return this.createTileFromIndex(x, y, indexMap[type] ?? 1, walkable);
      } else {
        return this.createDecorativeTile(x, y, type);
      }
    }
    // Default
    return this.createTileFromIndex(x, y, 1, walkable);
  }

  createTileFromIndex(x, y, index, walkableOverride = null) {
    const group = new THREE.Group();
    const props = this.getForestTileProperties(index);
    // Use the walkableOverride if provided (from map), otherwise use tile sheet property
    const walkable = walkableOverride !== null ? walkableOverride : props.walkable;

    if (this.tileSheetLoaded && this.tileTextures[index]) {
      const tileTex = this.tileTextures[index];
      // Use full tileSize for seamless map (no gaps)
      const texGeo = new THREE.PlaneGeometry(this.tileSize, this.tileSize);
      const texMat = new THREE.MeshLambertMaterial({
        map: tileTex,
        transparent: true,
        side: THREE.DoubleSide
      });
      const texPlane = new THREE.Mesh(texGeo, texMat);
      texPlane.rotation.x = -Math.PI / 2;
      texPlane.position.set(x * this.tileSize, 0.001, y * this.tileSize);
      texPlane.receiveShadow = true;
      group.add(texPlane);
    }

    // For non-walkable tiles, add a 3D block with texture to make them pop out as obstacles
    if (!walkable) {
      // Create an extruded block that rises above the ground
      const blockHeight = this.tileSize * 0.4; // 40% of tile width for good visual proportion
      const blockGeo = new THREE.BoxGeometry(this.tileSize * 0.9, blockHeight, this.tileSize * 0.9);

      // Apply the tile texture to all sides of the block
      const blockMat = new THREE.MeshLambertMaterial({
        map: this.tileTextures[index],
        transparent: true,
        side: THREE.DoubleSide
      });

      const block = new THREE.Mesh(blockGeo, blockMat);
      block.position.set(
        x * this.tileSize,
        blockHeight / 2, // raised from ground
        y * this.tileSize
      );
      block.castShadow = true;
      block.receiveShadow = true;
      group.add(block);

      // Add a subtle edge highlight on top of the block
      const topGeo = new THREE.BoxGeometry(this.tileSize * 0.95, 0.02, this.tileSize * 0.95);
      const topMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2 });
      const top = new THREE.Mesh(topGeo, topMat);
      top.position.set(x * this.tileSize, blockHeight + 0.01, y * this.tileSize);
      group.add(top);
    }

    group.userData = { gridX: x, gridY: y, walkable, type: 'tile', tileIndex: index };
    this.mapGroup.add(group);
    return group;
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
      // Use precomputed walkable flag from tile properties
      if (data.walkable) {
        this.walkableTiles.add(key);
      }
    }
  }

  // Load sprite texture from sheet (hero.bmp) with frame extraction
  // Load sprite texture from sheet (hero.bmp) with frame extraction
  // Preload all sprite textures from the sheet at startup
  preloadSprites() {
    if (this.spritesPreloaded) return;
    const frameW = 40, frameH = 40;
    const directions = ['left','up','down','right','up2','down2'];
    const img = new Image();
    img.onload = () => {
      for (let row = 0; row < 6; row++) {
        for (let col = 1; col <= 4; col++) { // columns 1-4 (skip blank col 0)
          const dir = directions[row];
          const frame = col - 1; // 0,1,2,3
          const name = `${dir}_`;
          const canvas = document.createElement('canvas');
          canvas.width = frameW; canvas.height = frameH;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, col*frameW, row*frameH, frameW, frameH, 0, 0, frameW, frameH);
          // Color-key: near-black ? transparent
          const imgData = ctx.getImageData(0,0,frameW,frameH);
          const data = imgData.data;
          for (let i=0; i<data.length; i+=4) {
            if (data[i] < 30 && data[i+1] < 30 && data[i+2] < 30) data[i+3] = 0;
          }
          ctx.putImageData(imgData, 0, 0);
          const texture = new THREE.CanvasTexture(canvas);
          texture.magFilter = THREE.NearestFilter;
          texture.minFilter = THREE.NearestFilter;
          this.spriteTextures[name] = texture;
        }
      }
      this.spritesPreloaded = true;
      // Update player sprite if already created
      if (this.playerSprite && this.spriteMaterial) {
    const frameName = `${this.playerFacing}_`;
        const tex = this.spriteTextures[frameName];
        if (tex) {
          this.spriteMaterial.map = tex;
          this.spriteMaterial.needsUpdate = true;
        }
      }
    };
    img.onerror = () => {
      console.error('Failed to load hero sprite sheet');
      this.spritesPreloaded = true;
    };
    img.src = 'assets/sprites/hero.png';
  }

  getSpriteTexture(name) {
    if (this.spriteTextures[name]) {
      return this.spriteTextures[name];
    }
    // Placeholder if requested before preload finishes
    const canvas = document.createElement('canvas');
    canvas.width = 40; canvas.height = 40;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#333'; ctx.fillRect(0,0,40,40);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(1,1,38,38);
    ctx.fillStyle = '#fff'; ctx.font = '10px Arial';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('LOAD', 20, 20);
    const placeholder = new THREE.CanvasTexture(canvas);
    placeholder.magFilter = THREE.NearestFilter;
    placeholder.minFilter = THREE.NearestFilter;
    return placeholder;
  }

  // Tile sheet system: 10 columns x 4 rows (40 tiles total)
  // Walkable specification (row, col): (0,1), (1,8), (1,9), (2,0), (2,1), (3,1)
  getForestWalkableTiles() {
    return new Set(['0,1', '1,8', '1,9', '2,0', '2,1', '3,1']);
  }

  tileIndexToRowCol(index) {
    const row = Math.floor(index / this.tileSheetCols);
    const col = index % this.tileSheetCols;
    return { row, col };
  }

  isForestTileIndexWalkable(index) {
    const { row, col } = this.tileIndexToRowCol(index);
    return this.getForestWalkableTiles().has(`${row},${col}`);
  }

  getForestTileProperties(index) {
    const { row, col } = this.tileIndexToRowCol(index);
    // Determine walkability based on the 10x4 tile sheet specification
    const walkable = this.isForestTileIndexWalkable(index);

    // Fallback colors (used when tile texture not yet loaded)
    let color;
    if (index === 1) {
      color = 0x3d5a4c; // Grass (row 0, col 1)
    } else if (index === 18) {
      color = 0x8a9a7a; // Gravel ground (row 1, col 8)
    } else if (index === 0) {
      color = 0x2a5a2a; // Blank tile (row 0, col 0) - deep green obstacle
    } else if (walkable) {
      // Other walkable tiles (gravel at other positions, footprint grass)
      color = 0x5a5a5a; // Use darker gravel color for non-grass walkable
    } else {
      // Non-walkable obstacles: rocks, bushes
      color = 0x2a5a2a; // Deep green
    }

    return { walkable, color, row, col, index };
  }

  // Load tile sheet from BMP and extract 40 tile textures
  loadTileSheet(callback) {
    if (this.tileSheetLoaded) {
      if (callback) callback();
      return;
    }
    const img = new Image();
    img.onload = () => {
      console.log(`Tile sheet loaded: ${img.width}x${img.height} pixels`);
      // Compute actual tile dimensions from sheet size
      const tileW = img.width / this.tileSheetCols;
      const tileH = img.height / this.tileSheetRows;
      console.log(`Computed tile size: ${tileW}x${tileH} (cols=${this.tileSheetCols}, rows=${this.tileSheetRows})`);
      // Draw the full sheet to a temporary canvas
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, img.width, img.height);
      // Extract each tile
      this.tileTextures = [];
      for (let row = 0; row < this.tileSheetRows; row++) {
        for (let col = 0; col < this.tileSheetCols; col++) {
          const tileCanvas = document.createElement('canvas');
          tileCanvas.width = tileW; tileCanvas.height = tileH;
          const tctx = tileCanvas.getContext('2d');
          tctx.drawImage(canvas, col*tileW, row*tileH, tileW, tileH, 0, 0, tileW, tileH);
          // Color-key: near-black to transparent (if needed)
          const imgData = tctx.getImageData(0,0,tileW,tileH);
          const data = imgData.data;
          for (let i=0; i<data.length; i+=4) {
            if (data[i] < 30 && data[i+1] < 30 && data[i+2] < 30) data[i+3] = 0;
          }
          tctx.putImageData(imgData, 0, 0);
          const texture = new THREE.CanvasTexture(tileCanvas);
          texture.magFilter = THREE.NearestFilter;
          texture.minFilter = THREE.NearestFilter;
          this.tileTextures.push(texture);
        }
      }
      this.tileSheetLoaded = true;
      console.log(`Loaded ${this.tileTextures.length} tile textures from sheet`);
      if (callback) callback();
    };
    img.onerror = () => {
      console.error('Failed to load tile sheet forestcamptiles.bmp');
      this.tileSheetLoaded = true; // Still mark as loaded to avoid retry loops
      if (callback) callback();
    };
    img.src = 'assets/forestcamptiles.bmp';
  }

  // Map format support (like jungle.txt)
  charToIndex(c) {
    if (c >= 'a' && c <= 'z') {
      const index = c.charCodeAt(0) - 'a'.charCodeAt(0);
      console.log(`Mapping char '${c}' to index ${index}`);
      return index;
    }
    if (c >= '0' && c <= '9') {
      const index = 26 + (c.charCodeAt(0) - '0'.charCodeAt(0));
      console.log(`Mapping char '${c}' to index ${index}`);
      return index;
    }
    console.warn(`Unknown character in map: '${c}'`);
    return -1;
  }

  parseMapFormat(text) {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l);
    const nonWalkable = new Set();
    let mode = 'none';
    const grid = [];
    for (const line of lines) {
      if (line === '[MAP NON-WALKABLE]') {
        mode = 'nonwalkable';
        continue;
      } else if (line === '[NEXT SYMBOL]') {
        continue;
      } else if (line === '[MAP]') {
        mode = 'map';
        continue;
      }
      if (mode === 'nonwalkable') {
        if (line.length >= 1) nonWalkable.add(line[0]);
      } else if (mode === 'map') {
        if (line.length > 0) grid.push(line.split('').filter(c => c));
      }
    }
    return { nonWalkable, grid };
  }

  async loadMapFromUrl(url) {
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`Failed to load map: ${resp.status}`);
      const text = await resp.text();
      const { nonWalkable, grid } = this.parseMapFormat(text);
      this.buildFromMap(grid, nonWalkable);
    } catch (e) {
      console.error('Map load error:', e);
    }
  }

  buildFromMap(grid, nonWalkableSet) {
    // Clear existing
    while (this.mapGroup.children.length > 0) {
      this.mapGroup.remove(this.mapGroup.children[0]);
    }
    this.walkableTiles.clear();

    const mapHeight = grid.length;
    const mapWidth = grid[0].length;

    console.log('Building map with non-walkable tiles:', Array.from(nonWalkableSet));
    console.log('Map dimensions:', mapWidth, 'x', mapHeight);

    // Store the grid for later reference
    this.currentMapGrid = grid;
    this.currentMapWidth = mapWidth;
    this.currentMapHeight = mapHeight;

    for (let y = 0; y < mapHeight; y++) {
      for (let x = 0; x < mapWidth; x++) {
        const char = grid[y][x];
        const idx = this.charToIndex(char);
        if (idx < 0) continue; // skip unknown chars
        const isWalkable = !nonWalkableSet.has(char);
        const group = this.createTile(x, y, idx, isWalkable);

        if (group.userData.walkable) {
          this.walkableTiles.add(`${x},${y}`);
        }
      }
    }

    console.log('Total walkable tiles:', this.walkableTiles.size);

    this.rebuildWalkableTiles();

    // Add ambient lighting effects
    this.populateTorches();
    this.addGroundGlows();

    // Camera position - center on map
    const centerX = mapWidth / 2 * this.tileSize;
    const centerZ = mapHeight / 2 * this.tileSize;
    this.camera.position.set(centerX, 18, centerZ + 12);
    this.camera.lookAt(centerX, 0, centerZ);
  }

  getMapCharAt(x, y) {
    if (!this.currentMapGrid || y < 0 || y >= this.currentMapGrid.length || x < 0 || x >= this.currentMapGrid[y].length) {
      return '?';
    }
    return this.currentMapGrid[y][x];
  }

  createAmbientLights() {
    // Clear existing lights
    while (this.lightsGroup.children.length > 0) {
      this.lightsGroup.remove(this.lightsGroup.children[0]);
    }

    const torchChars = ['z', '0', '1', '2', '9'];
    const torchColor = 0xffaa44; // warm orange
    const torchIntensity = 2.0; // brighter
    const torchDistance = 15; // longer reach
    const torchHeight = 0.5;

    const glowChance = 0.02; // 2% chance for a green glow on grass tiles
    const glowColor = 0x44ff88; // bright green
    const glowIntensity = 1.0; // brighter
    const glowDistance = 10; // longer reach
    const glowHeight = 0.1;

    for (let y = 0; y < this.currentMapHeight; y++) {
      for (let x = 0; x < this.currentMapWidth; x++) {
        const char = this.currentMapGrid[y][x];
        const key = `${x},${y}`;
        const isWalkable = this.walkableTiles.has(key);

        // Torches on specified tiles (castle walls, flag pole)
        if (torchChars.includes(char) && Math.random() < 0.1) {
          const light = new THREE.PointLight(torchColor, torchIntensity, torchDistance);
          light.position.set(
            x * this.tileSize + this.tileSize/2,
            torchHeight,
            y * this.tileSize + this.tileSize/2
          );
          this.lightsGroup.add(light);

          // Visual representation of torch flame (small sphere)
          const sphereGeo = new THREE.SphereGeometry(0.08, 8, 8);
          const sphereMat = new THREE.MeshBasicMaterial({ color: torchColor });
          const sphere = new THREE.Mesh(sphereGeo, sphereMat);
          sphere.position.set(light.position.x, torchHeight + 0.1, light.position.z);
          this.lightsGroup.add(sphere);
        }

        // Random green glows on walkable tiles
        if (isWalkable && Math.random() < glowChance) {
          const light = new THREE.PointLight(glowColor, glowIntensity, glowDistance);
          light.position.set(
            x * this.tileSize + this.tileSize/2,
            glowHeight,
            y * this.tileSize + this.tileSize/2
          );
          this.lightsGroup.add(light);

          const dotGeo = new THREE.SphereGeometry(0.05, 6, 6);
          const dotMat = new THREE.MeshBasicMaterial({ color: glowColor, transparent: true, opacity: 0.7 });
          const dot = new THREE.Mesh(dotGeo, dotMat);
          dot.position.set(light.position.x, glowHeight + 0.05, light.position.z);
          this.lightsGroup.add(dot);
        }
      }
    }
  }

  populateTorches() {
    this.torches.forEach(t => this.scene.remove(t));
    this.torches = [];
    const torchChars = ['z','0','1','2','9'];
    const torchColor = 0xffaa55;
    for (let y = 0; y < this.currentMapHeight; y++) {
      for (let x = 0; x < this.currentMapWidth; x++) {
        const char = this.currentMapGrid[y][x];
        if (torchChars.includes(char) && Math.random() < 0.1) {
          const torch = this.createTorch(x, y, torchColor);
          this.torches.push(torch);
        }
      }
    }
  }

  createTorch(gridX, gridY, color) {
    const torch = new THREE.Group();
    const stickGeo = new THREE.CylinderGeometry(0.1, 0.1, 1.5, 8);
    const stickMat = new THREE.MeshLambertMaterial({ color: 0x553311 });
    const stick = new THREE.Mesh(stickGeo, stickMat);
    stick.position.y = 0.75;
    torch.add(stick);
    const flameGeo = new THREE.SphereGeometry(0.15, 16, 16);
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xffaa55, transparent: true, opacity: 0.9 });
    const flameMesh = new THREE.Mesh(flameGeo, flameMat);
    flameMesh.position.y = 1.5;
    torch.add(flameMesh);
    torch.flameMesh = flameMesh;
    const flameLight = new THREE.PointLight(color, 3.5, 30);
    flameLight.position.set(0, 1.5, 0);
    torch.add(flameLight);
    torch.flame = flameLight;
    torch.position.set(
      gridX * this.tileSize + this.tileSize / 2,
      0,
      gridY * this.tileSize + this.tileSize / 2
    );
    this.scene.add(torch);
    return torch;
  }

  updateTorches() {
    for (const torch of this.torches) {
      const f = torch.flame;
      f.intensity = 1 + Math.random() * 0.3;
      f.position.x += (Math.random() - 0.5) * 0.02;
      f.position.z += (Math.random() - 0.5) * 0.02;
      const s = 1 + Math.random() * 0.2;
      torch.flameMesh.scale.set(s, s, s);
      const hueShift = 0xffaa55 + Math.floor(Math.random() * 0x002200);
      torch.flameMesh.material.color.setHex(hueShift);
    }
  }

  addGroundGlows() {
    this.groundGlows.forEach(g => this.scene.remove(g));
    this.groundGlows = [];
    const glowColor = 0x44ff88;
    const glowRadius = 0.1;
    const glowIntensity = 0.8;
    const glowDistance = 8;
    const glowChance = 0.2;

    this.walkableTiles.forEach(key => {
      const [xStr, yStr] = key.split(',');
      const x = parseInt(xStr, 10);
      const y = parseInt(yStr, 10);
      if (Math.random() < glowChance) {
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
          x * this.tileSize + this.tileSize / 2,
          0,
          y * this.tileSize + this.tileSize / 2
        );
        this.scene.add(glowGroup);
        this.groundGlows.push(glowGroup);
      }
    });
  }

  buildLevel1() {
    // Clear existing
    while (this.mapGroup.children.length > 0) {
      this.mapGroup.remove(this.mapGroup.children[0]);
    }
    this.walkableTiles.clear();

    // Tile indices
    const GRASS = 1;
    const PATH = 18;
    // Non-walkable obstacle tile indices from the sprite sheet (excluding blank tile 0)
    const FOREST_OBSTACLE_TILES = [2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,23,24,25,26,27,28,29];

    // Create grass base
    for (let x = 0; x < this.mapSize; x++) {
      for (let y = 0; y < this.mapSize; y++) {
        this.createTile(x, y, GRASS);
      }
    }

    // Add path (winding)
    const pathCoords = [
      [5,0],[5,1],[5,2],[5,3],[5,4],
      [6,4],[7,4],[8,4],[9,4],[10,4],
      [10,5],[10,6],[10,7],[10,8],[10,9],
      [11,9],[12,9],[13,9],[14,9],[15,9],
      [15,10],[15,11],[15,12],
      [10,12],[10,13],[10,14],
      [7,13],[7,14],[7,15],[7,16],
      [5,16],[5,17],
      [8,9],[9,9],[9,10] // extra path connections
    ];
    pathCoords.forEach(([x,y]) => this.createTile(x, y, PATH));

    // Trees (dense forest feel) – use random obstacle tiles from the sheet
    const treePositions = [];
    for (let x = 0; x < this.mapSize; x++) {
      for (let y = 0; y < this.mapSize; y++) {
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
        const obsIdx = FOREST_OBSTACLE_TILES[Math.floor(Math.random() * FOREST_OBSTACLE_TILES.length)];
        this.createTile(p[0], p[1], obsIdx);
      }
    });

    // Add some flowers on grass for decoration
    for (let i = 0; i < 15; i++) {
      const x = Math.floor(Math.random() * this.mapSize);
      const y = Math.floor(Math.random() * this.mapSize);
      // Only place on grass (not on path or obstacle)
      const hasTile = this.mapGroup.children.find(child => {
        const d = child.userData;
        return d && d.gridX === x && d.gridY === y && d.type === 'tile' && d.tileIndex === GRASS;
      });
      if (hasTile) {
        this.createDecorativeTile(x, y, 'flower');
      }
    }

    // Chest (using decorative tile on top of path)
    this.createDecorativeTile(10, 16, 'chest');
    this.chests.push({ x: 10, y: 16, opened: false });

    // Recompute walkable tiles based on final tile set
    this.rebuildWalkableTiles();

    // Camera position - centered on map, isometric angle
    const centerX = this.mapSize/2 * this.tileSize;
    const centerZ = this.mapSize/2 * this.tileSize;
    this.camera.position.set(centerX, 18, centerZ + 12);
    this.camera.lookAt(centerX, 0, centerZ);
  }

  findSpawnPosition() {
    // Find the first walkable tile near the top of the map, scanning from top-left to right
    const mapWidth = this.currentMapWidth || this.mapSize;
    const mapHeight = this.currentMapHeight || this.mapSize;

    console.log('✅ Finding spawn position...');
    console.log('✅ Walkable tiles available:', Array.from(this.walkableTiles));

    // Try to find a walkable tile
    for (let y = 0; y < mapHeight; y++) {
      for (let x = 0; x < mapWidth; x++) {
        const key = `${x},${y}`;
        const isWalkable = this.walkableTiles.has(key);
        const tileChar = this.getMapCharAt(x, y);
        console.log(`📍 Checking position (${x},${y}): walkable=${isWalkable}, char='${tileChar}'`);

        if (isWalkable) {
          console.log(`✅ ✅ ✅ Found walkable spawn at (${x},${y}) with char '${tileChar}'`);
          return { x, y };
        }
      }
    }

    // If no walkable tile found, log an error and return a safe position
    console.error('No walkable tiles found in the map! Spawning at default position.');
    return { x: 0, y: 0 };
  }

  createPlayer(startX = null, startY = null) {
    const group = new THREE.Group();

    if (this.useSprites) {
      // Load initial frame (down_1)
      const texture = this.getSpriteTexture('down_1');
      this.spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
      this.playerSprite = new THREE.Sprite(this.spriteMaterial);
      const scale = 1.2;
      this.playerSprite.scale.set(scale, scale, 1); // square frames (40x40)
      this.playerSprite.position.y = 1.0;
      group.add(this.playerSprite);
    } else {
      // Body (tunic)
      const bodyGeo = new THREE.CylinderGeometry(0.25, 0.35, 0.9, 7);
      const bodyMat = new THREE.MeshLambertMaterial({ color: 0x2a5a8a });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 0.45; body.castShadow = true; group.add(body);
      // Head
      const headGeo = new THREE.SphereGeometry(0.2, 8, 6);
      const headMat = new THREE.MeshLambertMaterial({ color: 0xffd5c0 });
      const head = new THREE.Mesh(headGeo, headMat);
      head.position.y = 1.05; head.castShadow = true; group.add(head);
      // Hair
      const hairGeo = new THREE.SphereGeometry(0.22, 8, 6);
      const hairMat = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });
      const hair = new THREE.Mesh(hairGeo, hairMat);
      hair.position.y = 1.15; hair.scale.set(1, 0.8, 1); group.add(hair);
      // Sword
      const swordHandleGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.3, 6);
      const swordMat = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
      const handle = new THREE.Mesh(swordHandleGeo, swordMat);
      handle.position.set(0.2, 0.6, -0.25); handle.rotation.z = 0.3; group.add(handle);
      const bladeGeo = new THREE.BoxGeometry(0.04, 0.6, 0.02);
      const bladeMat = new THREE.MeshStandardMaterial({ color: 0xccddee, metalness: 0.8, roughness: 0.2 });
      const blade = new THREE.Mesh(bladeGeo, bladeMat);
      blade.position.set(0.25, 0.9, -0.25); blade.rotation.z = 0.3; group.add(blade);
    }

    this.playerGroup.add(group);
    this.player3D = group;
    // Add player light
    const playerLight = new THREE.PointLight(0xffffff, 5, 150);
    playerLight.castShadow = true;
    this.player3D.add(playerLight);

    // Determine spawn grid
    let spawnGrid;
    if (startX !== null && startY !== null) {
      spawnGrid = { x: startX, y: startY };
    } else {
      spawnGrid = this.findSpawnPosition();
    }
    // Convert grid to world position
    this.playerPos = new THREE.Vector3(spawnGrid.x * this.tileSize, 0, spawnGrid.y * this.tileSize);
    this.playerGroup.position.copy(this.playerPos);
    // Initialize lastGrid tracking
    this.lastGridX = Math.round(this.playerPos.x / this.tileSize);
    this.lastGridY = Math.round(this.playerPos.z / this.tileSize);
  }

  createEnemies() {
    this.enemies = [];
    const enemyData = [
      {
        x: 10, y: 6,
        name: 'Forest Slime',
        level: 1, hp: 15, maxHp: 15, attack: 3, defense: 1,
        xpReward: 25, goldReward: 8,
        color: 0x2ecc71,
        type: 'slime'
      },
      {
        x: 15, y: 11,
        name: 'Wild Boar',
        level: 2, hp: 25, maxHp: 25, attack: 5, defense: 2,
        xpReward: 40, goldReward: 15,
        color: 0xc0392b,
        type: 'boar'
      },
      {
        x: 7, y: 14,
        name: 'Forest Slime',
        level: 1, hp: 15, maxHp: 15, attack: 3, defense: 1,
        xpReward: 25, goldReward: 8,
        color: 0x2ecc71,
        type: 'slime'
      },
      {
        x: 0, y: 18,
        name: 'Ancient Guardian',
        level: 5, hp: 60, maxHp: 60, attack: 12, defense: 6,
        xpReward: 150, goldReward: 100,
        color: 0x8e44ad,
        type: 'guardian'
      }
    ];

    enemyData.forEach(data => {
      const enemy = this.createEnemyMesh(data);
      this.enemies.push(enemy);
      this.enemyGroup.add(enemy.mesh);
    });
  }

  createEnemyMesh(data) {
    const group = new THREE.Group();

    if (data.type === 'slime') {
      // Slime: gelatinous cube with slight wobble
      const bodyGeo = new THREE.BoxGeometry(0.5, 0.35, 0.5);
      const bodyMat = new THREE.MeshLambertMaterial({ color: data.color, transparent: true, opacity: 0.85 });
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
    } else if (data.type === 'boar') {
      // Boar: elongated body, small tusks (using cylinder for r128 compatibility)
      const bodyGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.8, 8);
      const bodyMat = new THREE.MeshLambertMaterial({ color: data.color });
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
      const tuskMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
      const leftTusk = new THREE.Mesh(tuskGeo, tuskMat);
      leftTusk.position.set(0.5, 0.15, -0.25);
      leftTusk.rotation.z = -0.5;
      const rightTusk = new THREE.Mesh(tuskGeo, tuskMat);
      rightTusk.position.set(0.5, 0.15, -0.05);
      rightTusk.rotation.z = 0.5;
      group.add(leftTusk);
      group.add(rightTusk);
    } else if (data.type === 'guardian') {
      // Guardian: larger, armored look
      const bodyGeo = new THREE.CylinderGeometry(0.35, 0.4, 1.2, 8);
      const bodyMat = new THREE.MeshLambertMaterial({ color: data.color, emissive: 0x220033, emissiveIntensity: 0.2 });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 0.6;
      body.castShadow = true;
      group.add(body);

      // Helmet
      const helmetGeo = new THREE.SphereGeometry(0.3, 8, 6);
      const helmetMat = new THREE.MeshLambertMaterial({ color: 0x555555 });
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

    group.position.set(data.x * this.tileSize, 0, data.y * this.tileSize);
    group.userData = { enemyData: data };
    return {
      mesh: group,
      x: data.x,
      y: data.y,
      ...data,
      alive: true
    };
  }

  startGame() {
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('stats-panel').classList.add('stats-visible');
    this.showMessage('Use WASD or arrows to move. Find and battle enemies!');
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  showMessage(text, duration = 3000) {
    const log = document.getElementById('message-log');
    const msg = document.createElement('div');
    msg.className = 'message';
    msg.innerHTML = text;
    log.appendChild(msg);
    setTimeout(() => { if (msg.parentNode) msg.parentNode.removeChild(msg); }, duration);
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    const delta = this.clock.getDelta();
    this.update(delta);
    this.render();
  }

  update(delta) {
    if (this.battleSystem.inBattle) return;
    this.updatePlayerSprite(delta);

    // Smooth continuous movement
    let dx = 0, dy = 0;
    if (this.keys['arrowup'] || this.keys['w']) dy = -1;
    if (this.keys['arrowdown'] || this.keys['s']) dy = 1;
    if (this.keys['arrowleft'] || this.keys['a']) dx = -1;
    if (this.keys['arrowright'] || this.keys['d']) dx = 1;

    // Normalize diagonal movement
    if (dx !== 0 || dy !== 0) {
      const length = Math.sqrt(dx * dx + dy * dy);
      dx /= length;
      dy /= length;
      this.playerVelocity.set(dx * this.moveSpeed, 0, dy * this.moveSpeed);
    } else {
      this.playerVelocity.set(0, 0, 0);
    }

    // Apply movement with collision
    if (this.playerVelocity.length() > 0) {
      const moveAmount = this.playerVelocity.clone().multiplyScalar(delta);
      const newPos = this.playerPos.clone().add(moveAmount);
      const testX = Math.round(newPos.x / this.tileSize);
      const testY = Math.round(newPos.z / this.tileSize);
      if (this.isWalkable(testX, testY)) {
        this.playerPos.copy(newPos);
        this.playerGroup.position.copy(this.playerPos);
      } else {
        this.playerVelocity.set(0, 0, 0);
      }
    }

    // Update logical grid position for interactions
    const gridX = Math.round(this.playerPos.x / this.tileSize);
    const gridY = Math.round(this.playerPos.z / this.tileSize);
    if (gridX !== this.lastGridX || gridY !== this.lastGridY) {
      this.lastGridX = gridX;
      this.lastGridY = gridY;
      this.checkEnemyEncounter();
      this.checkChest();
    }

    // Smooth camera follow with slight swivel
    const baseOffset = new THREE.Vector3(0, 18, 12);
    // Offset camera slightly opposite to movement direction for dynamic feel
    const velocityOffset = new THREE.Vector3(
      -this.playerVelocity.x * 0.05,
      0,
      -this.playerVelocity.z * 0.05
    );
    const desiredCameraPos = this.playerPos.clone().add(baseOffset).add(velocityOffset);
    this.camera.position.lerp(desiredCameraPos, 0.1);
    this.camera.lookAt(this.playerPos);

    // Enemy idle animations
    const time = Date.now() * 0.003;
    this.enemies.forEach((enemy, i) => {
      if (enemy.alive) {
        // Floating/bobbing
        enemy.mesh.position.y = 0.1 + Math.sin(time + i) * 0.05;
        enemy.mesh.rotation.y = Math.sin(time * 0.5 + i) * 0.1;
      }
    });

    // Rain animation
    if (this.rain) {
      this.rain.rotation.y += delta * 0.15;
      const positions = this.rain.geometry.attributes.position.array;
      for (let i = 1; i < positions.length; i += 3) {
        positions[i] -= delta * 12;
        if (positions[i] < -2) positions[i] = 35;
      }
      this.rain.geometry.attributes.position.needsUpdate = true;
    }

    // Smoke animation
    if (this.smoke) {
      this.smoke.rotation.y += delta * 0.08;
      const positions = this.smoke.geometry.attributes.position.array;
      for (let i = 1; i < positions.length; i += 3) {
        positions[i] += delta * 0.8;
        if (positions[i] > 4) positions[i] = 0.1;
      }
      this.smoke.geometry.attributes.position.needsUpdate = true;
    }

    // Torch flicker effect
    for (const torch of this.torches) {
      const f = torch.flame;
      f.intensity = 1 + Math.random() * 0.3;
      f.position.x += (Math.random() - 0.5) * 0.02;
      f.position.z += (Math.random() - 0.5) * 0.02;
      const s = 1 + Math.random() * 0.2;
      torch.flameMesh.scale.set(s, s, s);
      const hueShift = 0xffaa55 + Math.floor(Math.random() * 0x002200);
      torch.flameMesh.material.color.setHex(hueShift);
    }

  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  isWalkable(x, y) {
    const key = `${x},${y}`;
    const isw = this.walkableTiles.has(key);

    // Use actual map dimensions if available, otherwise fall back to mapSize
    const maxX = this.currentMapWidth || this.mapSize;
    const maxY = this.currentMapHeight || this.mapSize;

    if (x < 0 || x >= maxX || y < 0 || y >= maxY) {
      console.log(`  → Out of bounds (max ${maxX}x${maxY})`);
      return false;
    }
    return isw;
  }

  checkEnemyEncounter() {
    const gridX = Math.round(this.playerPos.x / this.tileSize);
    const gridY = Math.round(this.playerPos.z / this.tileSize);
    const enemy = this.enemies.find(e => e.x === gridX && e.y === gridY && e.alive);
    if (enemy) {
      this.startBattle(enemy);
    }
  }

  checkChest() {
    const gridX = Math.round(this.playerPos.x / this.tileSize);
    const gridY = Math.round(this.playerPos.z / this.tileSize);
    const chest = this.chests.find(c => c.x === gridX && c.y === gridY && !c.opened);
    if (chest) {
      chest.opened = true;
      this.player.inventory.potions += 1;
      this.showMessage('Found a treasure chest! +1 Potion');
      // Remove chest mesh from scene
      const chestMesh = this.mapGroup.children.find(child => {
        const d = child.userData;
        return d && d.gridX === chest.x && d.gridY === chest.y && d.type === 'chest';
      });
      if (chestMesh) {
        this.mapGroup.remove(chestMesh);
      }
    }
  }

  startBattle(enemy) {
    this.battleSystem.startBattle(enemy);
    this.battleSystem.updateUI();
    this.updateBattleEnemyHP();
    document.getElementById('battle-panel').classList.add('visible');
  }

  updateBattleEnemyHP() {
    if (!this.battleSystem.enemy) return;
    const enemy = this.battleSystem.enemy;
    document.getElementById('enemy-name').textContent = enemy.name;
    document.getElementById('enemy-hp').textContent = `${enemy.hp}/${enemy.maxHp}`;
    const hpBar = document.getElementById('enemy-hp-bar');
    hpBar.max = enemy.maxHp;
    hpBar.value = enemy.hp;
  }

  onBattleEnd(result) {
    document.getElementById('battle-panel').classList.remove('visible');
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
  }

  onReward(reward) {
    // Already logged in battle log
  }

  handleBattleKey(key) {
    switch(key) {
      case '1': this.battleSystem.playerAttack(); break;
      case '2': this.battleSystem.playerMagic(); break;
      case '3': this.battleSystem.useItem(); break;
      case '4': this.battleSystem.flee(); break;
    }
  }

  updatePlayerSprite(delta) {
    if (!this.useSprites || !this.playerSprite) return;

    // Determine facing based on movement velocity
    const vx = this.playerVelocity.x;
    const vz = this.playerVelocity.z;
    const speed = Math.sqrt(vx * vx + vz * vz);
    if (speed > 0) {
      if (Math.abs(vx) > Math.abs(vz)) {
        this.playerFacing = vx > 0 ? 'right' : 'left';
      } else {
        this.playerFacing = vz > 0 ? 'down' : 'up';
      }
      this.playerAnimState = 'walk';
    } else {
      this.playerAnimState = 'idle';
    }

    // Update animation timer
    this.playerAnimTimer += delta * 1000;
    if (this.playerAnimTimer >= this.playerAnimInterval) {
      this.playerAnimTimer = 0;
      this.playerAnimFrame = (this.playerAnimFrame + 1) % 3; // 3 frames
    }

    // Load appropriate frame texture
    const frameName = `${this.playerFacing}_`;
    const texture = this.getSpriteTexture(frameName);
    if (texture && this.spriteMaterial) {
      this.spriteMaterial.map = texture;
      this.spriteMaterial.needsUpdate = true;
    }
  }

  onBattleStart(enemy) {
    document.getElementById('battle-panel').classList.add('visible');
    this.battleSystem.updateUI();
  }

  onBattleEnd(result) {
    document.getElementById('battle-panel').classList.remove('visible');
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
    this.updatePlayerStats();
  }

  onReward(reward) {
    this.updatePlayerStats();
  }

  updatePlayerStats() {
    document.getElementById('level').textContent = this.player.level;
    document.getElementById('hp').textContent = `${this.player.hp}/${this.player.maxHp}`;
    document.getElementById('hp-bar').max = this.player.maxHp;
    document.getElementById('hp-bar').value = this.player.hp;
    document.getElementById('mp').textContent = `${this.player.mp}/${this.player.maxMp}`;
    document.getElementById('mp-bar').max = this.player.maxMp;
    document.getElementById('mp-bar').value = this.player.mp;
    document.getElementById('xp').textContent = `${this.player.xp}/${this.player.maxXp}`;
    document.getElementById('xp-bar').max = this.player.maxXp;
    document.getElementById('xp-bar').value = this.player.xp;
    document.getElementById('attack').textContent = this.player.attack;
    document.getElementById('defense').textContent = this.player.defense;
  }
}

// Initialize
window.addEventListener('DOMContentLoaded', async () => {
  const game = new Game3D();
  await game.init();
  window.game = game;
});

