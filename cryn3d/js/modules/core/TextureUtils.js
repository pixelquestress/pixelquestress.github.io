import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.module.js';

export async function loadTextureMakeTransparent(path, threshold = 24) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = '';
    img.onload = () => {
      try {
        const w = img.width;
        const h = img.height;
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, w, h);
        const px = data.data;
        for (let i = 0; i < px.length; i += 4) {
          const r = px[i], g = px[i+1], b = px[i+2];
          if (r <= threshold && g <= threshold && b <= threshold) {
            px[i+3] = 0;
          }
        }
        ctx.putImageData(data, 0, 0);
        const tex = new THREE.CanvasTexture(canvas);
        tex.needsUpdate = true;
        resolve(tex);
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = (e) => reject(e);
    img.src = path;
  });
}

export function getAverageColorFromTexture(tex) {
  try {
    if (!tex || !tex.image) return null;
    const img = tex.image;
    const w = 16, h = 16;
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;
    let r=0,g=0,b=0,count=0;
    for (let i=0;i<data.length;i+=4) {
      const a = data[i+3];
      if (a < 30) continue;
      r += data[i]; g += data[i+1]; b += data[i+2]; count++;
    }
    if (count === 0) return null;
    return { r: Math.round(r/count), g: Math.round(g/count), b: Math.round(b/count) };
  } catch (e) {
    return null;
  }
}

export function darkenColor(colorStr, factor = 0.7) {
  try {
    if (!colorStr) return null;
    if (colorStr.startsWith('rgba')) {
      const m = colorStr.match(/rgba\((\d+),(\d+),(\d+),(.*)\)/);
      if (!m) return null;
      let r = Math.round(parseInt(m[1]) * factor);
      let g = Math.round(parseInt(m[2]) * factor);
      let b = Math.round(parseInt(m[3]) * factor);
      const a = parseFloat(m[4] || '1');
      return `rgba(${r},${g},${b},${a})`;
    } else if (colorStr.startsWith('#')) {
      const hex = colorStr.slice(1);
      const r = parseInt(hex.slice(0,2),16);
      const g = parseInt(hex.slice(2,4),16);
      const b = parseInt(hex.slice(4,6),16);
      const nr = Math.max(0, Math.min(255, Math.round(r * factor)));
      const ng = Math.max(0, Math.min(255, Math.round(g * factor)));
      const nb = Math.max(0, Math.min(255, Math.round(b * factor)));
      return `rgba(${nr},${ng},${nb},1)`;
    }
    return null;
  } catch (e) {
    return null;
  }
}
