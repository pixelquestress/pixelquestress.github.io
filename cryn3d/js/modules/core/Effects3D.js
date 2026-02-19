import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.module.js';
import { loadTextureMakeTransparent, getAverageColorFromTexture, darkenColor } from './TextureUtils.js';

export async function playBattleEffect(scene, effectName, fromPos, toPos, duration = 600, audioPlay = null) {
  let path = 'cryn/graphics/magicmissile.bmp';
  if (effectName === 'slash') path = 'cryn/graphics/slash.bmp';
  if (effectName === 'fire') path = 'cryn/graphics/fire.bmp';

  let tex = null;
  try { tex = await loadTextureMakeTransparent(path).catch(() => null); } catch (e) { tex = null; }
  if (!tex) {
    try { tex = new THREE.TextureLoader().load(path); } catch (e) { tex = null; }
  }

  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
  mat.alphaTest = 0.05;
  mat.depthWrite = false;
  mat.depthTest = false;
  const sprite = new THREE.Sprite(mat);
  sprite.renderOrder = 950;
  sprite.scale.set(1.2, 1.2, 1.2);
  sprite.position.copy(fromPos);
  scene.add(sprite);

  if (effectName === 'magicmissile' && typeof audioPlay === 'function') {
    audioPlay('cryn/music/battleeffects/magicmissile.wav');
  }

  const t0 = performance.now();
  const tick = () => {
    const now = performance.now();
    let t = (now - t0) / duration; if (t >= 1) t = 1;
    sprite.position.lerpVectors(fromPos, toPos, t);
    sprite.material.opacity = 1 - t;
    if (t < 1) requestAnimationFrame(tick);
    else scene.remove(sprite);
  };
  requestAnimationFrame(tick);
}

export function createSlashEffect(scene, fromPos, toPos, color = 'white', duration = 450) {
  const canvas = document.createElement('canvas');
  canvas.width = 128; canvas.height = 32;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0,0,128,32);
  ctx.strokeStyle = color;
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.globalAlpha = 0.95;
  ctx.beginPath();
  ctx.moveTo(8,24);
  ctx.lineTo(120,8);
  ctx.stroke();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(20,22); ctx.lineTo(108,10); ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
  mat.depthWrite = false; mat.depthTest = false;
  const sprite = new THREE.Sprite(mat);
  sprite.renderOrder = 1000;
  const mid = new THREE.Vector3().lerpVectors(fromPos, toPos, 0.5);
  sprite.position.copy(mid);
  const dist = fromPos.distanceTo(toPos);
  sprite.scale.set(Math.max(0.8, dist * 1.0), 0.5 + dist * 0.08, 1);
  scene.add(sprite);

  const t0 = performance.now();
  const start = fromPos.clone(); const end = toPos.clone();
  const tick = () => {
    const now = performance.now(); let t = (now - t0) / duration; if (t >= 1) t = 1;
    const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    sprite.position.lerpVectors(start, end, eased);
    sprite.material.opacity = 1 - eased;
    if (t < 1) requestAnimationFrame(tick);
    else scene.remove(sprite);
  };
  requestAnimationFrame(tick);
}

export function createDiagonalSlashAt(scene, worldPos, size = 2.2, rotationDeg = -45, color = 'rgba(220,40,40,1)', duration = 450) {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.save();
  ctx.translate(canvas.width/2, canvas.height/2);
  ctx.rotate((rotationDeg * Math.PI) / 180);
  ctx.translate(-canvas.width/2, -canvas.height/2);
  ctx.fillStyle = color || 'rgba(220,40,40,1)';
  ctx.beginPath();
  ctx.roundRect = function(x,y,w,h,r){ ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r); ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h); ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r); ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); };
  ctx.roundRect(16, 20, 224, 24, 12);
  ctx.fill();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = 'rgba(255,120,120,0.6)';
  ctx.fillRect(40, 22, 176, 20);
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
  mat.depthWrite = false; mat.depthTest = false;
  const sprite = new THREE.Sprite(mat);
  sprite.renderOrder = 1000;
  sprite.position.copy(worldPos);
  sprite.scale.set(size * 1.6, size * 0.45, 1);
  mat.rotation = (rotationDeg * Math.PI) / 180;
  scene.add(sprite);

  const t0 = performance.now();
  const tick = () => {
    const now = performance.now(); let t = (now - t0) / duration; if (t >= 1) t = 1;
    const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    sprite.material.opacity = 1 - eased;
    if (t < 1) requestAnimationFrame(tick);
    else scene.remove(sprite);
  };
  requestAnimationFrame(tick);
}

export function createJaggedSlashAt(scene, worldPos, size = 2.2, color = 'rgba(220,40,40,1)', duration = 450, segments = 10, jitter = 12, lengthFactor = 1.0, audioPlay = null) {
  const canvasSize = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvasSize; canvas.height = canvasSize;
  const ctx = canvas.getContext('2d');
  const pts = [];
  const margin = 28;
  const start = { x: canvasSize - margin, y: margin };
  const rawEnd = { x: margin, y: canvasSize - margin };
  const end = { x: start.x + (rawEnd.x - start.x) * lengthFactor, y: start.y + (rawEnd.y - start.y) * lengthFactor };
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const x = start.x + (end.x - start.x) * t;
    const y = start.y + (end.y - start.y) * t;
    const nx = end.x - start.x; const ny = end.y - start.y;
    const len = Math.sqrt(nx*nx + ny*ny) || 1;
    const px = -ny / len; const py = nx / len;
    const j = (Math.random() - 0.5) * jitter * (1 - Math.abs(0.5 - t));
    pts.push({ x: x + px * j, y: y + py * j });
  }

  if (typeof audioPlay === 'function') audioPlay('cryn/music/battleeffects/slash.wav');

  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
  mat.depthWrite = false; mat.depthTest = false;
  const sprite = new THREE.Sprite(mat);
  sprite.renderOrder = 1000;
  sprite.position.copy(worldPos);
  sprite.scale.set(size * 1.6, size * 0.6, 1);
  scene.add(sprite);

  const totalLen = pts.reduce((acc, p, i, a) => { if (i === 0) return 0; const prev = a[i-1]; const dx = p.x - prev.x; const dy = p.y - prev.y; return acc + Math.sqrt(dx*dx+dy*dy); }, 0);

  const t0 = performance.now();
  const tick = () => {
    const now = performance.now(); let t = (now - t0) / duration; if (t > 1) t = 1;
    const grow = t < 0.6 ? (t / 0.6) : 1; const fadeT = t;
    ctx.clearRect(0,0,canvasSize,canvasSize);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = color; ctx.lineWidth = Math.max(12, Math.round(size * 8)); ctx.beginPath();
    let acc = 0; const targetLen = totalLen * grow;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i]; if (i === 0) { ctx.moveTo(p.x, p.y); continue; }
      const prev = pts[i-1]; const segLen = Math.hypot(p.x - prev.x, p.y - prev.y);
      if (acc + segLen <= targetLen) { ctx.lineTo(p.x, p.y); } else { const remain = Math.max(0, targetLen - acc); const frac = segLen > 0 ? remain / segLen : 0; const ix = prev.x + (p.x - prev.x) * frac; const iy = prev.y + (p.y - prev.y) * frac; ctx.lineTo(ix, iy); break; }
      acc += segLen;
    }
    ctx.stroke();
    ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(255,150,150,' + (1 - fadeT) * 0.6 + ')'; ctx.lineWidth = Math.max(6, Math.round(size * 3)); ctx.beginPath();
    acc = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i]; if (i === 0) { ctx.moveTo(p.x, p.y); continue; } const prev = pts[i-1]; const segLen = Math.hypot(p.x - prev.x, p.y - prev.y); if (acc + segLen <= targetLen) ctx.lineTo(p.x, p.y); else { const remain = Math.max(0, targetLen - acc); const frac = segLen > 0 ? remain / segLen : 0; const ix = prev.x + (p.x - prev.x) * frac; const iy = prev.y + (p.y - prev.y) * frac; ctx.lineTo(ix, iy); break; } acc += segLen; }
    ctx.stroke(); ctx.globalCompositeOperation = 'source-over';
    tex.needsUpdate = true;
    if (t < 1) requestAnimationFrame(tick);
    else {
      const fadeStart = performance.now(); const fadeDur = 220;
      const fadeTick = () => { const now2 = performance.now(); let ft = (now2 - fadeStart) / fadeDur; if (ft > 1) ft = 1; mat.opacity = 1 - ft; if (ft < 1) requestAnimationFrame(fadeTick); else scene.remove(sprite); };
      requestAnimationFrame(fadeTick);
    }
  };
  requestAnimationFrame(tick);
}

export function showFloatingDamage(scene, worldPos, amount, color = 'white', duration = 900) {
  const txt = String(amount);
  const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 48;
  const ctx = canvas.getContext('2d'); ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.font = 'bold 28px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.strokeText(txt, canvas.width/2, canvas.height/2);
  ctx.fillStyle = color; ctx.fillText(txt, canvas.width/2, canvas.height/2);
  const tex = new THREE.CanvasTexture(canvas); tex.needsUpdate = true;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true }); mat.depthWrite = false; mat.depthTest = false; mat.opacity = 1;
  const spr = new THREE.Sprite(mat); spr.renderOrder = 1001; spr.scale.set(1.2, 0.45, 1); spr.position.copy(worldPos).add(new THREE.Vector3(0, 1.8, 0)); scene.add(spr);
  const startY = spr.position.y; const t0 = performance.now();
  const tick = () => { const now = performance.now(); let t = (now - t0) / duration; if (t >= 1) t = 1; const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; spr.position.y = startY + eased * 0.9; spr.material.opacity = 1 - eased; if (t < 1) requestAnimationFrame(tick); else scene.remove(spr); };
  requestAnimationFrame(tick);
}

export function spawnBloodBurst(scene, worldPos, duration = 700, particleCount = 12, color = null) {
  const canvas = document.createElement('canvas'); canvas.width = 32; canvas.height = 32; const ctx = canvas.getContext('2d'); ctx.clearRect(0,0,32,32);
  const centerColor = color || 'rgba(200,0,0,1)'; const mid = darkenColor(centerColor, 0.7) || 'rgba(150,0,0,0.9)'; const edge = darkenColor(centerColor, 0.4) || 'rgba(100,0,0,0)';
  const grd = ctx.createRadialGradient(16,16,2,16,16,16); grd.addColorStop(0, centerColor); grd.addColorStop(0.6, mid); grd.addColorStop(1, edge); ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(16,16,12,0,Math.PI*2); ctx.fill();
  const tex = new THREE.CanvasTexture(canvas);
  const particles = [];
  for (let i=0;i<particleCount;i++) {
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true }); mat.depthWrite = false; mat.depthTest = false; mat.opacity = 1;
    const spr = new THREE.Sprite(mat); spr.renderOrder = 1000; spr.scale.set(0.4 + Math.random()*0.8, 0.4 + Math.random()*0.8, 1); spr.position.copy(worldPos);
    const angle = Math.random() * Math.PI * 2; const speed = 0.6 + Math.random() * 1.2; spr.userData.velocity = new THREE.Vector3(Math.cos(angle) * speed, 0.1 + Math.random()*0.4, Math.sin(angle) * speed);
    particles.push(spr); scene.add(spr);
  }
  const t0 = performance.now(); const tick = () => { const now = performance.now(); let t = (now - t0) / duration; if (t >= 1) t = 1; const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; particles.forEach((p) => { p.position.addScaledVector(p.userData.velocity, 0.016); p.userData.velocity.y -= 0.02; p.material.opacity = 1 - eased; p.scale.setScalar(p.scale.x * (1 + eased*0.02)); }); if (t < 1) requestAnimationFrame(tick); else particles.forEach(p => scene.remove(p)); };
  requestAnimationFrame(tick);
}

export function animateEnemyDeath(scene, node, duration = 600) {
  return new Promise((resolve) => {
    if (!node) return resolve();
    const t0 = performance.now();
    let mat = null;
    if (node.isSprite && node.material) mat = node.material;
    else if (node.material) mat = node.material;
    if (mat && !mat.transparent) mat.transparent = true;
    if (mat && typeof mat.opacity !== 'number') mat.opacity = 1;
    const startScale = node.scale ? node.scale.clone() : new THREE.Vector3(1,1,1);
    const tick = () => { const now = performance.now(); let t = (now - t0) / duration; if (t >= 1) t = 1; const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; if (node.scale) { node.scale.lerpVectors(startScale, startScale.clone().multiplyScalar(1.4), 1 - (1 - eased) * 0.6); } if (mat && typeof mat.opacity === 'number') mat.opacity = 1 - eased; if (t < 1) requestAnimationFrame(tick); else resolve(); };
    requestAnimationFrame(tick);
  });
}
