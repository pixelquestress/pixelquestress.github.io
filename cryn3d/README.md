# IsoCryn 3D - Isometric RPG with Three.js

A 3D isometric RPG game built with Three.js, featuring atmospheric effects and immersive visuals.

![screenshot](screenshot.gif)

## Features

- **Full 3D Isometric Rendering** using Three.js
- **Atmospheric Effects**:
  - Rain particle system
  - Fog for depth and ambiance
  - Smoke particles near ground
  - Dynamic lighting with shadows
- **3D Tile-Based World**:
  - Grass, paths, trees, water, walls, treasure chests
  - Proper isometric projection with depth sorting
- **Animated Entities**:
  - Player character (capsule with smooth movement)
  - Enemies with idle bounce animation
  - 3D trees (trunk + foliage)
  - Interactive chests with emissive glow
- **Smooth Camera** that follows the player
- **Turn-Based Battle System** with UI overlay
- **No External Dependencies** except Three.js (CDN)

## Controls

- **WASD / Arrow Keys**: Move player
- **Camera**: Q/E to rotate (planned), Mouse drag to pan (planned)
- **Battle**: Click buttons (Attack, Magic, Item, Flee)

## How to Play

1. Open `index.html` in a modern browser
2. Click **"Begin Journey"**
3. Explore the isometric 3D world
4. Walk into enemies to trigger turn-based battles
5. Defeat enemies to gain XP and gold
6. Find treasure chests for potions

## Technical Details

- **Renderer**: WebGL via Three.js r128
- **Camera**: Perspective camera with isometric angle (45°)
- **Lighting**: Ambient + Directional with shadow mapping
- **Atmosphere**: Fog, rain particles (2000 drops), smoke particles (300)
- **Grid Size**: 20x20 tiles
- **Tile Size**: 2 units
- **Animation Loop**: 60 FPS target

## Project Structure

```
isocryn3d/
├── index.html                # Main HTML with UI overlay
├── js/
│   ├── main.js               # Entry point (ES6 modules)
│   └── modules/
│       ├── constants/        # Shared configuration (colors, tile settings)
│       │   └── index.js
│       ├── player/           # Player class and stats
│       │   └── Player3D.js
│       ├── battle/           # Battle system and event emitter
│       │   ├── EventEmitter.js
│       │   └── BattleSystem3D.js
│       ├── core/             # Main Game3D class (orchestrates all systems)
│       │   └── Game3D.js
│       ├── tiles/            # Tile sheet loading and properties
│       │   ├── TileSheet.js
│       │   └── TileProperties.js
│       ├── map/              # Map parsing and building
│       │   ├── MapParser.js
│       │   ├── MapLoader.js
│       │   ├── MapBuilder.js
│       │   └── LegacyLevelBuilder.js
│       ├── entities/         # 3D entity creation
│       │   ├── SpritePlayer.js
│       │   ├── Enemies.js
│       │   └── Decorations.js
│       ├── atmosphere/       # Particle effects
│       │   └── Effects.js
│       ├── lighting/         # Torches and glows
│       │   └── Lights.js
│       ├── ui/               # UI management
│       │   └── UIManager.js
│       └── interaction/      # Collision and encounters
│           ├── Collision.js
│           └── Encounter.js
├── assets/                   # Textures and images
│   ├── sprites/
│   │   └── hero.png
│   └── forestcamptiles.bmp
├── maps/
│   └── jungle.txt
└── screenshot.gif
```

## Current State

✅ 3D isometric world rendering  
✅ Player movement with collision detection  
✅ Enemy spawning with animations  
✅ Atmospheric effects (rain, fog, smoke)  
✅ Shadows and dynamic lighting  
✅ Battle system UI (logic separate, needs integration)  
✅ Smooth camera follow  

## Planned Enhancements

- Replace placeholder graphics with actual Cryn sprites/models
- Add ground textures (tiling)
- Implement proper texture atlases for tiles and characters
- Add sound effects and background music
- More enemy types and AI behaviors
- Multiple levels with different themes
- Save/load game state
- Mobile touch controls
- Day/night cycle with dynamic lighting

## Credits

Inspired by [Cryn the Dark Reflection](https://github.com/pixelquestress/cryn) and the isometric 3D gist example.

Built with ❤️ using Three.js and vanilla JavaScript.
