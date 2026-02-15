// Shared constants for IsoCryn 3D

export const CONFIG = {
  USE_SPRITES: true,
  TILE_SIZE: 2,
  MAP_SIZE: 20,
  MOVE_SPEED_MULTIPLIER: 3,
  ANIM_INTERVAL: 150,
  FRAME_WIDTH: 40,
  FRAME_HEIGHT: 40,
  TILE_SHEET_COLS: 10,
  TILE_SHEET_ROWS: 4,
  SPRITE_DIRECTIONS: ['left', 'up', 'down', 'right', 'up2', 'down2'],
};

export const COLORS = {
  // Background
  SCENE_BG: 0x0d1117,
  FOG: 0x0d1117,

  // Lighting
  AMBIENT: 0xbabaca,
  AMBIENT_INTENSITY: 0.70,
  DIRECTIONAL: 0xffffff,
  DIRECTIONAL_INTENSITY: 0.1,

  // Tiles
  GRASS: 0x3d5a4c,
  PATH: 0x8a9a7a,
  BLANK: 0x2a5a2a,
  GRAVEL: 0x5a5a5a,
  OBSTACLE: 0x2a5a2a,
  EDGE: 0x000000,
  EDGE_OPACITY: 0.15,

  // Decorations
  CHEST: 0xffd700,
  FLOWER: 0xff6b8a,
  CHEST_EMISSIVE: 0xaa6600,
  CHEST_GLOW: 0xffaa00,

  // Torches
  TORCH_COLOR: 0xffaa44,
  TORCH_INTENSITY: 2.0,
  TORCH_DISTANCE: 15,
  TORCH_HEIGHT: 0.5,

  // Ground glows
  GLOW_COLOR: 0x44ff88,
  GLOW_INTENSITY: 1.0,
  GLOW_DISTANCE: 8,
  GLOW_CHANCE: 0.02,

  // Particles
  RAIN_COLOR: 0x88aaff,
  RAIN_COUNT: 1500,
  RAIN_SIZE: 0.15,
  RAIN_OPACITY: 0.5,
  RAIN_SPEED: 12,
  SMOKE_COLOR: 0x666688,
  SMOKE_COUNT: 200,
  SMOKE_SIZE: 0.8,
  SMOKE_OPACITY: 0.25,
  SMOKE_SPEED: 0.8,
};

export const UI = {
  MP_COST: 3,
  WALKABLE_TILES_3D: new Set(['0,1', '1,8', '1,9', '2,0', '2,1', '3,1']),
  TORCH_CHARS: ['z', '0', '1', '2', '9'],
};

export const ENEMY_TYPES = {
  SLIME: 'slime',
  BOAR: 'boar',
  GUARDIAN: 'guardian',
};

export const DIRECTIONS = {
  LEFT: 'left',
  UP: 'up',
  DOWN: 'down',
  RIGHT: 'right',
};
