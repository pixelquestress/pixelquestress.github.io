// SpritePlayer - Handles sprite texture loading and animation

import { CONFIG } from '../constants/index.js';
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.module.js';

export class SpritePlayer {
  constructor(game) {
    this.game = game;
    this.spriteTextures = {};
    this.spritesPreloaded = false;
    this.playerFacing = 'down';
    this.playerAnimFrame = 0;
    this.playerAnimTimer = 0;
    this.spriteMaterial = null;
    this.playerSprite = null;
  }

  preloadSprites() {
    if (this.spritesPreloaded) return;

    const frameW = CONFIG.FRAME_WIDTH;
    const frameH = CONFIG.FRAME_HEIGHT;
    const directions = CONFIG.SPRITE_DIRECTIONS;
    const img = new Image();

    img.onload = () => {
      for (let row = 0; row < 6; row++) {
        const dir = directions[row];
        if (!this.spriteTextures[dir]) this.spriteTextures[dir] = [];
        for (let col = 1; col <= 4; col++) {
          const canvas = document.createElement('canvas');
          canvas.width = frameW;
          canvas.height = frameH;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, col * frameW, row * frameH, frameW, frameH, 0, 0, frameW, frameH);
          this.colorKeyTransparent(canvas);
          const texture = new THREE.CanvasTexture(canvas);
          texture.magFilter = THREE.NearestFilter;
          texture.minFilter = THREE.NearestFilter;
          this.spriteTextures[dir].push(texture);
        }
      }
      this.spritesPreloaded = true;
      if (this.playerSprite && this.spriteMaterial) {
        this.updateSpriteTexture();
      }
    };

    img.onerror = () => {
      console.error('Failed to load hero sprite sheet');
      this.spritesPreloaded = true;
    };

    img.src = 'assets/sprites/hero.png';
  }

  colorKeyTransparent(canvas) {
    const ctx = canvas.getContext('2d');
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] < 30 && data[i + 1] < 30 && data[i + 2] < 30) data[i + 3] = 0;
    }
    ctx.putImageData(imgData, 0, 0);
  }

  getSpriteTexture(direction) {
    const frames = this.spriteTextures[direction];
    if (frames && frames.length > 0) {
      const frameIdx = Math.min(this.playerAnimFrame, frames.length - 1);
      return frames[frameIdx];
    }
    return this.getPlaceholderTexture();
  }

  getPlaceholderTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = CONFIG.FRAME_WIDTH;
    canvas.height = CONFIG.FRAME_HEIGHT;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#333';
    ctx.fillRect(0, 0, CONFIG.FRAME_WIDTH, CONFIG.FRAME_HEIGHT);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, CONFIG.FRAME_WIDTH - 2, CONFIG.FRAME_HEIGHT - 2);
    ctx.fillStyle = '#fff';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('LOAD', CONFIG.FRAME_WIDTH / 2, CONFIG.FRAME_HEIGHT / 2);
    const placeholder = new THREE.CanvasTexture(canvas);
    placeholder.magFilter = THREE.NearestFilter;
    placeholder.minFilter = THREE.NearestFilter;
    return placeholder;
  }

  setSpriteMaterial(spriteMaterial) {
    this.spriteMaterial = spriteMaterial;
  }

  setPlayerSprite(playerSprite) {
    this.playerSprite = playerSprite;
  }

  updateSpriteTexture() {
    if (!this.spriteMaterial) return;
    const tex = this.getSpriteTexture(this.playerFacing);
    if (tex) {
      this.spriteMaterial.map = tex;
      this.spriteMaterial.needsUpdate = true;
    }
  }

  updateAnimation(delta) {
    // Only animate while the player is moving
    const moving = this.game && this.game.playerVelocity && this.game.playerVelocity.length() > 0.001;
    const frames = this.spriteTextures[this.playerFacing] || [];
    const frameCount = frames.length || 1;

    if (moving) {
      this.playerAnimTimer += delta * 1000;
      if (this.playerAnimTimer >= CONFIG.ANIM_INTERVAL) {
        this.playerAnimTimer = 0;
        this.playerAnimFrame = (this.playerAnimFrame + 1) % frameCount;
        this.updateSpriteTexture();
      }
    } else {
      // reset to standing frame 0
      if (this.playerAnimFrame !== 0) {
        this.playerAnimFrame = 0;
        this.playerAnimTimer = 0;
        this.updateSpriteTexture();
      }
    }
  }

  setFacing(direction) {
    this.playerFacing = direction;
    this.updateSpriteTexture();
  }

  isPreloaded() {
    return this.spritesPreloaded;
  }
}
