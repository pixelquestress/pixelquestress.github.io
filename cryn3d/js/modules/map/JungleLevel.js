export const JUNGLE_LOCATION = {
  INTRO_WAITING_FOR_BEORNE: 0,
  KING_WAITING: 1,
  BEORNE_PLAN_READY: 2,
  FOREST_OPEN: 3,
  LINEER_TRACKS_SEEN: 4,
  LINEER_DEFEATED: 5,
};

const path = (p) => `cryn/${p}`;

export class JungleLevel {
  constructor(game) {
    this.game = game;
    this.location = JUNGLE_LOCATION.INTRO_WAITING_FOR_BEORNE;
    this.area = 'FOREST';
    this.scriptedBattle = null;
  }

  reset() {
    this.location = JUNGLE_LOCATION.INTRO_WAITING_FOR_BEORNE;
    this.scriptedBattle = null;
  }

  isDangerousForestTile(gridX, gridY) {
    return gridX > 37 || gridY > 18;
  }

  handleStep(gridX, gridY) {
    if (this.location < JUNGLE_LOCATION.KING_WAITING) {
      const beorne = this.game.npcs && this.game.npcs.getNpcById('beorne');
      if (beorne && this.isNearNpc(beorne, gridX, gridY, 2)) {
        this.say(beorne, [
          "Beorne:\nDad wants to see us. I wonder what he wants this time.",
          "Cryn:\nYeh well, don't give him a hard time Beorne.",
          "Beorne:\nWhat are you talking about? You are the one not meeting his expectations of a warrior.",
          "Cryn:\nAnd you are the one always causing trouble and getting into fights.",
          "Beorne:\nUhg, I don't have time for this Cryn. Let's just see what he wants.",
        ], () => {
          this.location = JUNGLE_LOCATION.KING_WAITING;
        });
      }
    }

    if (gridX > 17 && this.location === JUNGLE_LOCATION.BEORNE_PLAN_READY) {
      const beorne = this.game.npcs && this.game.npcs.getNpcById('beorne');
      this.say(beorne, [
        "Beorne:\nHey Cryn, I have an idea. Want to go hunting?",
        "Cryn:\nOur dad is dying, and you're thinking about killing things?",
        "Beorne:\nUhg Cryn, you're so naive. I know of this place .. in an ancient tree, which is supposed to house a special leaf capable of healing anything.",
        "Beorne:\nThe path is riddled with monsters, and evil .. hm, you know what, never mind Cryn. You're not strong enough for this kind of thing.",
        "Cryn:\nI AM strong! And if this will help father, then I'm in!",
        "Beorne:\nOk then. I believe the tree is just east of the forest. If we can make it there quick enough, we should be able to help father.",
      ], () => {
        this.location = JUNGLE_LOCATION.FOREST_OPEN;
        this.fullHeal();
      });
    }

    if (gridX === 69 && gridY === 12 && this.location < JUNGLE_LOCATION.LINEER_TRACKS_SEEN) {
      const beorne = this.game.npcs && this.game.npcs.getNpcById('beorne');
      this.say(beorne, [
        "Cryn:\nLook, those tracks look like the footprints of a Lineer. We should be careful.",
        "Beorne:\nGod Cryn, you are so gullible. Thats just a story parents tell their kids so they stay out of the forest.",
      ], () => {
        this.location = JUNGLE_LOCATION.LINEER_TRACKS_SEEN;
      });
    }

    if (gridX >= 79 && this.location >= JUNGLE_LOCATION.LINEER_DEFEATED) {
      this.game.showMessage('The great tree lies ahead. Swampcave comes next after the jungle pass.');
    }
  }

  handleNpcInteraction(npc) {
    if (!npc) return false;

    if (npc.id === 'king') {
      if (this.location === JUNGLE_LOCATION.INTRO_WAITING_FOR_BEORNE) {
        this.say(npc, ["King:\nWhere is your brother Cryn?"]);
      } else if (this.location === JUNGLE_LOCATION.KING_WAITING) {
        this.say(npc, [
          "King:\nMy sons I am not well at all, and it is clear one of you will be an heir to my throne. Cryn, so wise and of a kind heart. Beorne, so strong and\nknowing. You two must be strong during my final days.",
          "Cryn:\nBut dad, what will we do when you're gone?",
          "Beorne:\nOh spare me.",
          "King:\nBoys, listen to me. My decision on the heir has already been made. You\nmust take care of each other while I gather my final moments ..",
        ], () => {
          this.location = JUNGLE_LOCATION.BEORNE_PLAN_READY;
        });
      } else {
        this.say(npc, ["King:\nI'm very weak Cryn.. let me rest. The least I can do is heal you."], () => {
          this.fullHeal();
        });
      }
      return true;
    }

    if (npc.id === 'lineer' && this.location < JUNGLE_LOCATION.LINEER_DEFEATED) {
      this.say(npc, [
        "Cryn:\nJust a story parents tell their kids huh?",
        "Beorne:\nUh .. well maybe he's not as bad as the story tells.",
        "Lineer:\naaarrrhhh.. dinner time my children!",
        "Beorne:\nI was afraid he was gonna say that.",
      ], () => this.startLineerBattle());
      return true;
    }

    if (npc.id === 'beorne') {
      npc.following = true;
    }

    return false;
  }

  startLineerBattle() {
    this.scriptedBattle = 'lineer';
    this.game.startBattle([
      monster('Lineer', 'graphics/forestmonster.bmp', 3, 55, 8, 45, 20, 100, 150, 8),
      monster('Lineer Mini', 'graphics/forestmonstermini.bmp', 2, 18, 0, 10, 0, 25, 0, 2),
      monster('Lineer Mini', 'graphics/forestmonstermini.bmp', 2, 18, 0, 10, 0, 25, 0, 2),
    ], { boss: true, scripted: 'lineer', battleBackground: path('graphics/forest.bmp') });
  }

  onBattleEnd(result) {
    if (!result || !result.victory || result.fled) return;
    const scripted = result.scripted || this.scriptedBattle;
    this.scriptedBattle = null;

    if (scripted === 'lineer' && this.location < JUNGLE_LOCATION.LINEER_DEFEATED) {
      this.location = JUNGLE_LOCATION.LINEER_DEFEATED;
      const lineer = this.game.npcs && this.game.npcs.getNpcById('lineer');
      if (lineer) this.game.npcs.removeNpc(lineer);
      this.game.player.bonusAttack = true;
      this.game.showMessage('You find a firey red jewel on Lineer. Bonus attacks are now unlocked.', 7000);
    }
  }

  say(npc, messages, onClose) {
    if (npc) npc.speaking = true;
    this.game.ui.showDialog(messages, () => {
      if (npc) npc.speaking = false;
      if (typeof onClose === 'function') onClose();
    });
  }

  fullHeal() {
    const p = this.game.player;
    if (!p) return;
    p.hp = p.maxHp;
    p.mp = p.maxMp;
    this.game.ui.updatePlayerStats();
  }

  isNearNpc(npc, gridX, gridY, range = 1) {
    const nx = Math.round(npc.pos.x / this.game.tileSize);
    const ny = Math.round(npc.pos.z / this.game.tileSize);
    return Math.abs(nx - gridX) < range && Math.abs(ny - gridY) < range;
  }
}

export function monster(name, bmp, level, hp, mp, armor, castRate = 0, xp = 0, gold = 0, attack = null) {
  const generatedHp = hp || roll(level, level, level * 2 + level - 1);
  return {
    name,
    level,
    maxHp: generatedHp,
    hp: generatedHp,
    maxMp: mp || roll(level, 4, 8),
    mp: mp || roll(level, 4, 8),
    attack: attack || Math.max(1, level + 1),
    defense: Math.max(0, Math.round((armor || level) / 12)),
    spellCaster: castRate,
    xpReward: xp || level * 25,
    goldReward: gold || roll(level, 0, 14),
    bmp: path(bmp),
  };
}

function roll(times, min, max) {
  let total = 0;
  for (let i = 0; i < times; i++) {
    total += Math.floor(Math.random() * (max - min + 1)) + min;
  }
  return total;
}
