// MapLoader - Loads map files from URL

import { MapParser } from './MapParser.js';

export class MapLoader {
  constructor(game) {
    this.game = game;
    this.parser = new MapParser();
  }

  async loadMapFromUrl(url) {
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`Failed to load map: ${resp.status}`);
      const text = await resp.text();
      const { nonWalkable, grid } = this.parser.parseMapFormat(text);
      this.game.buildFromMap(grid, nonWalkable);
    } catch (e) {
      console.error('Map load error:', e);
    }
  }
}
