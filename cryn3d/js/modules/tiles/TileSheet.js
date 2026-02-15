// TileSheet - Loads and extracts tile textures from BMP sheet

import { CONFIG } from '../constants/index.js';
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.module.js';

export class TileSheet {
  constructor(game) {
    this.game = game;
    this.tileTextures = [];
    this.loaded = false;
  }

  loadTileSheet(callback) {
    if (this.loaded) {
      if (callback) callback();
      return;
    }

    const img = new Image();
    img.onload = () => {
      console.log(`Tile sheet loaded: ${img.width}x${img.height} pixels`);
      const tileW = img.width / CONFIG.TILE_SHEET_COLS;
      const tileH = img.height / CONFIG.TILE_SHEET_ROWS;
      console.log(`Computed tile size: ${tileW}x${tileH} (cols=${CONFIG.TILE_SHEET_COLS}, rows=${CONFIG.TILE_SHEET_ROWS})`);

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, img.width, img.height);

      this.tileTextures = [];
      for (let row = 0; row < CONFIG.TILE_SHEET_ROWS; row++) {
        for (let col = 0; col < CONFIG.TILE_SHEET_COLS; col++) {
          const tileCanvas = document.createElement('canvas');
          tileCanvas.width = tileW;
          tileCanvas.height = tileH;
          const tctx = tileCanvas.getContext('2d');
          tctx.drawImage(canvas, col * tileW, row * tileH, tileW, tileH, 0, 0, tileW, tileH);
          this.colorKeyTransparent(tileCanvas);
          const texture = new THREE.CanvasTexture(tileCanvas);
          texture.magFilter = THREE.NearestFilter;
          texture.minFilter = THREE.NearestFilter;
          this.tileTextures.push(texture);
        }
      }
      this.loaded = true;
      console.log(`Loaded ${this.tileTextures.length} tile textures from sheet`);
      if (callback) callback();
    };

    img.onerror = () => {
      console.error('Failed to load tile sheet forestcamptiles.bmp');
      this.loaded = true;
      if (callback) callback();
    };

    img.src = 'assets/forestcamptiles.bmp';
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

  getTexture(index) {
    return this.tileTextures[index] || null;
  }

  isLoaded() {
    return this.loaded;
  }

  getTextureCount() {
    return this.tileTextures.length;
  }
}
