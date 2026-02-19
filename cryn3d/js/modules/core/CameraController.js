import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.module.js';

export function animateCameraTo(camera, targetPos, targetLookAt, duration = 1200, targetFov) {
  return new Promise((resolve) => {
    const startPos = camera.position.clone();
    const startLookDir = new THREE.Vector3();
    camera.getWorldDirection(startLookDir);
    const startLookAt = camera.position.clone().add(startLookDir.multiplyScalar(10));
    const startFov = camera.fov;
    const t0 = performance.now();
    const tick = () => {
      const now = performance.now();
      let t = (now - t0) / duration; if (t >= 1) t = 1;
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      camera.position.lerpVectors(startPos, targetPos, eased);
      const lookAt = new THREE.Vector3().lerpVectors(startLookAt, targetLookAt, eased);
      camera.lookAt(lookAt);
      if (typeof targetFov === 'number') { camera.fov = startFov + (targetFov - startFov) * eased; camera.updateProjectionMatrix(); }
      if (t < 1) requestAnimationFrame(tick); else resolve();
    };
    requestAnimationFrame(tick);
  });
}
