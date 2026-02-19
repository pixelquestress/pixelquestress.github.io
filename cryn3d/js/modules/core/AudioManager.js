export class AudioManager {
  constructor() {
    this.bg = null;
    this.battle = null;
  }

  playBackground(path, { loop = true, volume = 0.6 } = {}) {
    try {
      if (this.bg) { try { this.bg.pause(); } catch (e) {} }
      this.bg = new Audio(path);
      this.bg.loop = !!loop;
      this.bg.volume = volume;
      this.bg.play().catch(() => {
        const resume = () => { this.bg.play().catch(()=>{}); document.removeEventListener('pointerdown', resume); };
        document.addEventListener('pointerdown', resume);
      });
    } catch (e) {
      console.warn('AudioManager: cannot play background', e);
    }
  }

  stopBackground() {
    try { if (this.bg) { this.bg.pause(); this.bg.currentTime = 0; } } catch (e) {}
  }

  playBattle(path, { loop = true, volume = 0.9 } = {}) {
    try {
      if (this.battle) { try { this.battle.pause(); } catch (e) {} }
      this.battle = new Audio(path);
      this.battle.loop = !!loop;
      this.battle.volume = volume;
      this.battle.play().catch(() => {
        const resume = () => { this.battle.play().catch(()=>{}); document.removeEventListener('pointerdown', resume); };
        document.addEventListener('pointerdown', resume);
      });
    } catch (e) {
      console.warn('AudioManager: cannot play battle music', e);
    }
  }

  stopBattle() {
    try { if (this.battle) { this.battle.pause(); this.battle.currentTime = 0; } } catch (e) {}
  }

  playSfx(path, { volume = 0.8 } = {}) {
    try {
      const s = new Audio(path);
      s.volume = volume;
      s.play().catch(() => {});
    } catch (e) {}
  }
}
