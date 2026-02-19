// MapParser - Parses text-based map format (like jungle.txt)

export class MapParser {
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
}
