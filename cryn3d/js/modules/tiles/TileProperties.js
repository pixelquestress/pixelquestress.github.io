// TileProperties - Walkability and properties for tile sheet indices

import { CONFIG, COLORS } from '../constants/index.js';

export class TileProperties {
  constructor() {
    this.tileSheetCols = CONFIG.TILE_SHEET_COLS;
    this.tileSheetRows = CONFIG.TILE_SHEET_ROWS;
    this.walkableSet = new Set(['0,1', '1,8', '1,9', '2,0', '2,1', '3,1']);
  }

  indexToRowCol(index) {
    const row = Math.floor(index / this.tileSheetCols);
    const col = index % this.tileSheetCols;
    return { row, col };
  }

  isWalkable(index) {
    const { row, col } = this.indexToRowCol(index);
    return this.walkableSet.has(`${row},${col}`);
  }

  getProperties(index) {
    const { row, col } = this.indexToRowCol(index);
    const walkable = this.isWalkable(index);

    let color;
    if (index === 1) {
      color = COLORS.GRASS;
    } else if (index === 18) {
      color = COLORS.PATH;
    } else if (index === 0) {
      color = COLORS.BLANK;
    } else if (walkable) {
      color = COLORS.GRAVEL;
    } else {
      color = COLORS.OBSTACLE;
    }

    return { walkable, color, row, col, index };
  }

  charToIndex(c) {
    if (c >= 'a' && c <= 'z') {
      return c.charCodeAt(0) - 'a'.charCodeAt(0);
    }
    if (c >= '0' && c <= '9') {
      return 26 + (c.charCodeAt(0) - '0'.charCodeAt(0));
    }
    console.warn(`Unknown character in map: '${c}'`);
    return -1;
  }
}
