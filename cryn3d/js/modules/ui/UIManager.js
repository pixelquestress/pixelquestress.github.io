// UIManager - Handles all UI updates

import { UI } from '../constants/index.js';

export class UIManager {
  constructor(game) {
    this.game = game;
    this.dialog = { messages: [], index: 0, open: false, onClose: null };
  }

  showMessage(text, duration = 3000) {
    const log = document.getElementById('message-log');
    const msg = document.createElement('div');
    msg.className = 'message';
    msg.innerHTML = text;
    log.appendChild(msg);
    setTimeout(() => {
      if (msg.parentNode) msg.parentNode.removeChild(msg);
    }, duration);
  }

  showDialog(messages, onClose) {
    if (!messages || messages.length === 0) return;
    this.dialog.messages = messages.slice();
    this.dialog.index = 0;
    this.dialog.open = true;
    this.dialog.onClose = typeof onClose === 'function' ? onClose : null;
    // show modal
    const modal = document.getElementById('dialog-modal');
    const textEl = document.getElementById('dialog-text');
    if (modal && textEl) {
      modal.style.display = 'block';
      // hide text until the msgbox zoom animation completes
      textEl.style.visibility = 'hidden';
      textEl.textContent = '';
    }
    // notify game so it can block movement/input
    if (this.game) this.game.dialogActive = true;
    // play msgbox sound
    try { this.game && this.game.audio && this.game.audio.playSfx('cryn/music/msgbox.wav', { volume: 0.85 }); } catch (e) {}

    // Draw msgbox sprite (use row 5 of the 6-row sprite sheet) into canvas and animate zoom
    const canvas = document.getElementById('dialog-border-canvas');
    const box = document.getElementById('dialog-box');
    if (canvas && box) {
      // size canvas to box
      const rect = box.getBoundingClientRect();
      canvas.width = Math.max(200, Math.floor(rect.width));
      canvas.height = Math.max(80, Math.floor(rect.height));
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        try {
          const rows = 6;
          const frameH = Math.floor(img.height / rows);
          const sx = 0;
          const sy = frameH * (rows - 1); // row 5 (0-based)
          const sW = img.width;
          const sH = frameH;
          ctx.clearRect(0,0,canvas.width,canvas.height);
          ctx.drawImage(img, sx, sy, sW, sH, 0, 0, canvas.width, canvas.height);
          // trigger zoom via class
          canvas.classList.remove('zoomed');
          // add a fallback reveal in case the transitionend doesn't fire
          let revealTimeout = null;
          const revealNow = () => {
            try {
              const textElInner = document.getElementById('dialog-text');
              if (textElInner) {
                textElInner.textContent = this.dialog.messages[this.dialog.index] || '';
                textElInner.style.visibility = 'visible';
              }
            } catch (e) {}
          };
          const onTransitionEnd = (ev) => {
            if (ev.propertyName && ev.propertyName !== 'transform') return;
            revealNow();
            if (revealTimeout) clearTimeout(revealTimeout);
            canvas.removeEventListener('transitionend', onTransitionEnd);
          };
          canvas.addEventListener('transitionend', onTransitionEnd);
          // fallback: reveal after 400ms if transitionend didn't fire
          revealTimeout = setTimeout(() => { revealNow(); }, 400);
          // small timeout to allow initial scale to apply, then add zoom class
          setTimeout(() => canvas.classList.add('zoomed'), 20);
        } catch (e) {}
      };
      img.onerror = () => {
        // fallback: try PNG in assets
        img.src = 'assets/sprites/msgbox_yellow.bmp';
      };
      img.src = 'cryn/tiles/msgbox_yellow2.png';
    }
  }

  advanceDialog() {
    if (!this.dialog.open) return;
    this.dialog.index++;
    if (this.dialog.index >= this.dialog.messages.length) {
      this.closeDialog();
      return;
    }
    const textEl = document.getElementById('dialog-text');
    if (textEl) textEl.textContent = this.dialog.messages[this.dialog.index] || '';
    // Do not play the msgbox SFX on subsequent messages in the same interaction.
  }

  closeDialog() {
    this.dialog.open = false;
    const modal = document.getElementById('dialog-modal');
    if (modal) modal.style.display = 'none';
    if (this.game) this.game.dialogActive = false;
    if (this.dialog.onClose) {
      try { this.dialog.onClose(); } catch (e) {}
      this.dialog.onClose = null;
    }
    // reset canvas zoom state
    const canvas = document.getElementById('dialog-border-canvas');
    if (canvas) {
      canvas.classList.remove('zoomed');
    }
  }

  updatePlayerStats() {
    const player = this.game.player;
    document.getElementById('level').textContent = player.level;
    document.getElementById('hp').textContent = `${player.hp}/${player.maxHp}`;
    const hpBar = document.getElementById('hp-bar');
    hpBar.max = player.maxHp;
    hpBar.value = player.hp;
    document.getElementById('mp').textContent = `${player.mp}/${player.maxMp}`;
    const mpBar = document.getElementById('mp-bar');
    mpBar.max = player.maxMp;
    mpBar.value = player.mp;
    document.getElementById('xp').textContent = `${player.xp}/${player.maxXp}`;
    const xpBar = document.getElementById('xp-bar');
    xpBar.max = player.maxXp;
    xpBar.value = player.xp;
    document.getElementById('attack').textContent = player.attack;
    document.getElementById('defense').textContent = player.defense;
  }

  updateBattleEnemyHP() {
    if (!this.game.battleSystem.enemy) return;
    const enemy = this.game.battleSystem.enemy;
    document.getElementById('enemy-name').textContent = enemy.name;
    document.getElementById('enemy-hp').textContent = `${enemy.hp}/${enemy.maxHp}`;
    const hpBar = document.getElementById('enemy-hp-bar');
    hpBar.max = enemy.maxHp;
    hpBar.value = enemy.hp;
  }

  showBattlePanel(show) {
    const panel = document.getElementById('battle-panel');
    if (show) {
      panel.classList.add('visible');
    } else {
      panel.classList.remove('visible');
    }
  }

  bindStartButton(callback) {
    document.getElementById('btn-start').addEventListener('click', callback);
  }

  bindBattleButtons(attackFn, magicFn, itemFn, fleeFn) {
    document.getElementById('btn-attack').addEventListener('click', attackFn);
    document.getElementById('btn-magic').addEventListener('click', magicFn);
    document.getElementById('btn-item').addEventListener('click', itemFn);
    document.getElementById('btn-flee').addEventListener('click', fleeFn);
  }

  hideStartScreen() {
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('stats-panel').classList.add('stats-visible');
  }
}
