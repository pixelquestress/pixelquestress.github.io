// Player3D class - Player stats and leveling system

export class Player3D {
  constructor() {
    this.level = 1;
    this.hp = 65;
    this.maxHp = 65;
    this.mp = 4;
    this.maxMp = 4;
    this.xp = 0;
    this.maxXp = 250;
    this.attack = 6;
    this.defense = 2;
    this.gold = 0;
    this.inventory = { potions: 2 };
    this.alive = true;
    this.bonusAttack = false;
    this.crystalClear = false;
  }

  gainXp(amount) {
    this.xp += amount;
    while (this.xp >= this.maxXp && this.alive) {
      this.xp -= this.maxXp;
      return this.levelUp();
    }
    return null;
  }

  levelUp() {
    this.level++;
    const hpGain = Math.floor(Math.random() * (this.level * 3)) + (this.level * 3);
    const mpGain = Math.floor(Math.random() * this.level) + this.level;
    this.maxHp += hpGain;
    this.hp = this.maxHp;
    this.maxMp += mpGain;
    this.mp = this.maxMp;
    this.maxXp = this.nextXpForLevel(this.level);
    this.attack += 2;
    this.defense += 1;
    this.inventory.potions += 1;
    return `Level up! You are now level ${this.level}!`;
  }

  nextXpForLevel(level) {
    const table = {
      1: 250, 2: 600, 3: 1500, 4: 3000, 5: 5500, 6: 7000, 7: 9000,
      8: 12000, 9: 15000, 10: 20000, 11: 30000, 12: 50000, 13: 75000,
      14: 100000,
    };
    return table[level] || 0;
  }
}
