// Weapon definitions: pistol, SMG, shotgun, rifle — damage, rate, ammo, spread.
// All four are unlocked from the start in free roam; shops sell ammo.
export const WEAPONS = {
  pistol: {
    id: 'pistol', name: 'PISTOL', damage: 34, rate: 0.28, range: 60,
    spread: 0.012, pellets: 1, auto: false, ammo: Infinity, maxAmmo: Infinity,
    color: 0xffd23e, kick: 0.02,
  },
  smg: {
    id: 'smg', name: 'SMG', damage: 16, rate: 0.085, range: 55,
    spread: 0.05, pellets: 1, auto: true, ammo: 120, maxAmmo: 240,
    color: 0xff9a3d, kick: 0.012,
  },
  shotgun: {
    id: 'shotgun', name: 'SHOTGUN', damage: 13, rate: 0.85, range: 26,
    spread: 0.11, pellets: 8, auto: false, ammo: 40, maxAmmo: 80,
    color: 0xff5a5a, kick: 0.06,
  },
  rifle: {
    id: 'rifle', name: 'RIFLE', damage: 62, rate: 0.16, range: 120,
    spread: 0.004, pellets: 1, auto: false, ammo: 90, maxAmmo: 180,
    color: 0x9ad5ff, kick: 0.03,
  },
};

export const WEAPON_ORDER = ['pistol', 'smg', 'shotgun', 'rifle'];

export function weaponLabel(id) {
  return WEAPONS[id].name;
}
