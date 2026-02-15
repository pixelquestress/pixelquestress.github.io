// Player3D class - Player stats and leveling system

export class Player3D {
  constructor() {
    this.level = 1;
    this.hp = 20;
    this.maxHp = 20;
    this.mp = 10;
    this.maxMp = 10;
    this.xp = 0;
    this.maxXp = 100;
    this.attack = 5;
    this.defense = 3;
    this.gold = 0;
    this.inventory = { potions: 2 };
    this.alive = true;
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
    this.maxHp += 10;
    this.hp = this.maxHp;
    this.maxMp += 5;
    this.mp = this.maxMp;
    this.maxXp = Math.floor(this.maxXp * 1.5);
    this.attack += 2;
    this.defense += 1;
    this.inventory.potions += 1;
    return `Level up! You are now level ${this.level}!`;
  }
}
