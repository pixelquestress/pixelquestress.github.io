// NPCs - lightweight city guard NPCs recreated from original RPGMap.cpp

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.module.js';
import { CONFIG } from '../constants/index.js';

/*
Sprite sheet row order:
0 = left
1 = up
2 = down
3 = right
4 = unused
5 = unused
*/
export class NPCs {
  constructor(game) {
    this.game = game;
    this.npcs = [];
    this.frameW = CONFIG.FRAME_WIDTH || 40;
    this.frameH = CONFIG.FRAME_HEIGHT || 40;
  }

  createNPCs() {
    // Positions copied from original RPGMap.cpp TownFolk entries
    const list = [
      { x: 8,  y: 6,  bmp: 'cityguard2' , area: [5,1,30,20], msgs: [
          "City Guard:\nGood to see you again, Cryn."
        ] },
      { x: 20, y: 1,  bmp: 'cityguard2' , area: [5,1,30,20], msgs: [
          "City Guard:\nLooks like it's going to be another rainy day."
        ] },
      { x: 31, y: 16, bmp: 'cityguard'  , area: [5,1,30,20], msgs: [
          "City Guard:\nGood day Cryn, let me know when you want to explore the forest again."
        ] },
      { x: 31, y: 3,  bmp: 'cityguard'  , area: [5,1,30,20], msgs: [
          "City Guard:\nBe well, Cryn."
        ] },
      { x: 41, y: 3,  bmp: 'cityguard'  , area: [41,3,41,3], msgs: [
          "City Guard:\nOh hello, Cryn! Did you know this game was updated in 2024?",
          "Cryn:\nWow, has it been that long?",
          "Beorne:\nOh for goodness sake! Who really cares?",
          "City Guard:\nSimply amazing."
        ] },
      { x: 30, y: 4,  bmp: 'beorne'  , area: [30,4,30,4], msgs: [
        'Fine. Let\'s just go.'
      ] },
    ];

    list.forEach(n => this._createNPC(n));
  }

  colorKeyTransparent(canvas) {
    const ctx = canvas.getContext('2d');
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] < 30 && data[i+1] < 30 && data[i+2] < 30) data[i+3] = 0;
    }
    ctx.putImageData(imgData, 0, 0);
  }

  _createNPC(spec) {
    const group = new THREE.Group();
    const spriteMat = new THREE.SpriteMaterial({ transparent: true });
    // Render sprites after tiles to avoid z-fighting/flicker.
    // This disables depth testing for sprites so they render on top of world geometry.
    spriteMat.depthTest = false;
    spriteMat.depthWrite = false;
    // small alphaTest to cut away near-transparent pixels
    spriteMat.alphaTest = 0.01;
    const sprite = new THREE.Sprite(spriteMat);
    // match player sprite scale if available, otherwise use tile-based fallback
    const base = (this.game && this.game.spritePlayer && this.game.spritePlayer.playerSprite)
      ? this.game.spritePlayer.playerSprite.scale.x
      : this.game.tileSize * 0.9;
    sprite.scale.set(base, base, 1);
    sprite.position.y = 0.6;
    // ensure consistent render ordering (draw after map tiles)
    sprite.renderOrder = 200;
    group.add(sprite);

    group.position.set(spec.x * this.game.tileSize, 0, spec.y * this.game.tileSize);
    group.userData = { npc: true, bmp: spec.bmp };
    // Add NPCs to the world map group so they don't move with the player
    this.game.mapGroup.add(group);

    const npc = {
      group,
      sprite,
      bmp: spec.bmp,
      x: spec.x,
      y: spec.y,
      tileX: spec.x,
      tileY: spec.y,
      pos: new THREE.Vector3(spec.x * this.game.tileSize, 0, spec.y * this.game.tileSize),
      speed: 3.0, // units per second (world units)
      area: { minX: spec.area[0], minY: spec.area[1], maxX: spec.area[2], maxY: spec.area[3] },
      targetTile: null,
      waitTimer: 0,
      frames: [],
      animIdx: 0,
      animTimer: 0
    };
    npc.speaking = false;
    npc.msgs = spec.msgs || [];
    npc.following = false;   // default: wander mode
    npc.lastPlayerTileX = null;
    npc.lastPlayerTileY = null;
    npc.followGoal = null; // the chosen adjacent tile to stick to

    // load image and slice frames
    const img = new Image();
    img.onload = () => {
      const cols = Math.max(1, Math.floor(img.width / this.frameW));
      const rows = 6; // fixed: 6 rows for directional sprites

      npc.frames = [[],[],[],[],[],[]]; // 6 directional rows

      for (let r = 0; r < 6; r++) {
        for (let c = 1; c < cols; c++) {        // skip column 0
          const canvas = document.createElement('canvas');
          canvas.width = this.frameW;
          canvas.height = this.frameH;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, c * this.frameW, r * this.frameH, this.frameW, this.frameH, 0, 0, this.frameW, this.frameH);
          this.colorKeyTransparent(canvas);
          const tex = new THREE.CanvasTexture(canvas);
          tex.magFilter = THREE.NearestFilter;
          tex.minFilter = THREE.NearestFilter;
          npc.frames[r].push(tex);
        }
      }

      if (npc.frames[2] && npc.frames[2].length > 0) {
        npc.sprite.material.map = npc.frames[2][0];
        npc.sprite.material.needsUpdate = true;
      }
    };

    // prefer png in assets, fallback to original tiles bmp
    img.src = `assets/sprites/${spec.bmp}.png`;
    img.onerror = () => {
      img.src = `cryn/tiles/${spec.bmp}.bmp`;
    };

    // choose initial target tile (ensure valid)
    npc.targetTile = this._chooseNearbyTile(npc.tileX, npc.tileY, npc.area);
    this.npcs.push(npc);
  }

  getAdjacentNpc(gridX, gridY) {
    for (const n of this.npcs) {
      const nx = Math.round(n.pos.x / this.game.tileSize);
      const ny = Math.round(n.pos.z / this.game.tileSize);
      const dx = Math.abs(nx - gridX);
      const dy = Math.abs(ny - gridY);
      if ((dx === 1 && dy === 0) || (dx === 0 && dy === 1)) return n;
    }
    return null;
  }

  _chooseNearbyTile(tx, ty, area) {
    // pick random adjacent tile inside area (or stay)
    const choices = [];
    const dirs = [[1,0],[-1,0],[0,1],[0,-1],[0,0]];
    for (const d of dirs) {
      const nx = tx + d[0];
      const ny = ty + d[1];
      if (nx >= area.minX && nx <= area.maxX && ny >= area.minY && ny <= area.maxY) {
        // check walkable and not on player or another NPC
        const walkable = this.game.collision ? this.game.collision.isWalkable(nx, ny) : true;
        const playerGridX = this.game && this.game.playerPos ? Math.round(this.game.playerPos.x / this.game.tileSize) : null;
        const playerGridY = this.game && this.game.playerPos ? Math.round(this.game.playerPos.z / this.game.tileSize) : null;
        const occupied = this.npcs.some(n => n.tileX === nx && n.tileY === ny);
        const isPlayerTile = (playerGridX === nx && playerGridY === ny);
        if (walkable && !occupied && !isPlayerTile) choices.push({x:nx,y:ny});
      }
    }
    if (choices.length === 0) return { x: tx, y: ty };
    return choices[Math.floor(Math.random() * choices.length)];
  }

  update(delta) {
    if (!this.npcs || this.npcs.length === 0) return;
    const dt = delta;

    this.npcs.forEach(npc => {
      if (npc.speaking) return;

      const moving =
        npc.targetTile &&
        (npc.tileX !== npc.targetTile.x ||
        npc.tileY !== npc.targetTile.y ||
        npc.pos.distanceTo(
          new THREE.Vector3(
            npc.targetTile.x * this.game.tileSize,
            0,
            npc.targetTile.y * this.game.tileSize
          )
        ) > 0.05);

      // walking = actually allowed to move this frame
      const walking = moving && npc.waitTimer <= 0;

      const targetWorld = new THREE.Vector3(
        npc.targetTile.x * this.game.tileSize,
        0,
        npc.targetTile.y * this.game.tileSize
      );

      const toTarget = targetWorld.clone().sub(npc.pos);
      const dist = toTarget.length();

      if (dist >= 0.05) {
        toTarget.normalize();
      }

      // use tile deltas and remap to actual visual rows
      if (walking) {
        const dx = npc.targetTile.x - npc.tileX;
        const dy = npc.targetTile.y - npc.tileY;

        if (Math.abs(dx) > Math.abs(dy)) {
          // horizontal
          npc.dirRow = (dx < 0) ? 0 : 3;   // LEFT=row 0, RIGHT=row 3
        } else {
          // vertical
          npc.dirRow = (dy < 0) ? 1 : 2;   // UP=row 1, DOWN=row 2
        }
      }

      // --- ANIMATION AFTER DIRECTION ---
      const row = npc.dirRow;
      const rowFrames = npc.frames[row];

      if (walking && rowFrames && rowFrames.length > 1) {
        npc.animTimer += dt * 1000;
        if (npc.animTimer >= CONFIG.ANIM_INTERVAL) {
          npc.animTimer = 0;
          npc.animIdx = (npc.animIdx + 1) % rowFrames.length;
          npc.sprite.material.map = rowFrames[npc.animIdx];
          npc.sprite.material.needsUpdate = true;
        }
      } else {
        npc.animIdx = 0;
        if (rowFrames && rowFrames.length > 0) {
          npc.sprite.material.map = rowFrames[0];
          npc.sprite.material.needsUpdate = true;
        }
      }

      // --- MOVEMENT ---
      if (npc.waitTimer > 0) {
        npc.waitTimer -= dt * 1000;
        return;
      }

      if (dist < 0.05) {
        npc.pos.copy(targetWorld);
        npc.tileX = npc.targetTile.x;
        npc.tileY = npc.targetTile.y;

        if (npc.following) {
          const px = Math.round(this.game.playerPos.x / this.game.tileSize);
          const py = Math.round(this.game.playerPos.z / this.game.tileSize);

          const playerMovedTile =
            npc.lastPlayerTileX !== px || npc.lastPlayerTileY !== py;

          // If follower reached its goal tile, stop until player moves
          if (!playerMovedTile &&
              npc.followGoal &&
              npc.tileX === npc.followGoal.x &&
              npc.tileY === npc.followGoal.y) {

            npc.targetTile = { x: npc.tileX, y: npc.tileY };
            npc.waitTimer = 0;
            return;
          }

          // If the player moved, choose a NEW adjacent tile
          if (playerMovedTile || !npc.followGoal) {
            npc.lastPlayerTileX = px;
            npc.lastPlayerTileY = py;

            const adj = [
              { x: px - 1, y: py },
              { x: px + 1, y: py },
              { x: px,     y: py - 1 },
              { x: px,     y: py + 1 },
            ];

            const validAdj = adj.filter(t =>
              this.game.collision.isWalkable(t.x, t.y) &&
              !this.npcs.some(n => n.tileX === t.x && n.tileY === t.y)
            );

            if (validAdj.length > 0) {
              validAdj.sort((a, b) => {
                const da = Math.abs(a.x - npc.tileX) + Math.abs(a.y - npc.tileY);
                const db = Math.abs(b.x - npc.tileX) + Math.abs(b.y - npc.tileY);
                return da - db;
              });
              npc.followGoal = validAdj[0];
            } else {
              npc.followGoal = { x: npc.tileX, y: npc.tileY };
            }
          }

          // Take ONE step toward the locked goal
          npc.targetTile = this._chooseStepToward(npc, npc.followGoal.x, npc.followGoal.y);
          npc.waitTimer = 0;
        } else {
          npc.waitTimer = 300 + Math.random() * 1200;
          npc.targetTile = this._chooseNearbyTile(npc.tileX, npc.tileY, npc.area);
        }

        return;
      }

      const moveDist = npc.speed * dt;
      const move = toTarget.multiplyScalar(moveDist);
      npc.pos.add(move);
      npc.group.position.copy(npc.pos);
    });
  }

  setNpcFollow(npc, follow = true) {
    npc.following = follow;
  }

  _chooseStepToward(npc, goalX, goalY) {
    const dirs = [
      { dx:  1, dy:  0 },
      { dx: -1, dy:  0 },
      { dx:  0, dy:  1 },
      { dx:  0, dy: -1 },
    ];

    const candidates = dirs
      .map(d => ({ x: npc.tileX + d.dx, y: npc.tileY + d.dy }))
      .filter(t =>
        this.game.collision.isWalkable(t.x, t.y) &&
        !this.npcs.some(n => n.tileX === t.x && n.tileY === t.y)
      );

    if (candidates.length === 0) {
      return { x: npc.tileX, y: npc.tileY };
    }

    candidates.sort((a, b) => {
      const da = Math.abs(a.x - goalX) + Math.abs(a.y - goalY);
      const db = Math.abs(b.x - goalX) + Math.abs(b.y - goalY);
      return da - db;
    });

    return candidates[0];
  }
}
