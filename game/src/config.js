// SOLANO HEAT — Port Solano: shared tuning, districts, ranks and palette.
// Original city, characters and story. No Rockstar names, art or music.
export const WORLD = {
  half: 300,          // playable city half-extent (metres)
  block: 40,          // street grid pitch
  roadWidth: 11,
  beachZ: -300,       // water starts beyond this z
  waterZ: -430,
  seedDefault: 1337,
};

export const DISTRICTS = [
  { name: 'DOWNTOWN', x0: -120, z0: -120, x1: 120, z1: 60, tall: true, color: 0x8a7f8a },
  { name: 'MARINA', x0: -300, z0: -300, x1: 300, z1: -180, tall: false, color: 0x7fb2c9 },
  { name: 'BARRIOS', x0: -300, z0: 60, x1: -120, z1: 300, tall: false, color: 0xd98a5a },
  { name: 'HILLS', x0: 120, z0: 60, x1: 300, z1: 300, tall: false, color: 0x9ab87a },
  { name: 'OLD TOWN', x0: -120, z0: 60, x1: 120, z1: 300, tall: false, color: 0xc9a06a },
];

export const RANKS = [
  { name: 'ROOKIE', respect: 0 },
  { name: 'HUSTLER', respect: 150 },
  { name: 'WHEELMAN', respect: 400 },
  { name: 'STREET KING', respect: 800 },
  { name: 'PORT LEGEND', respect: 1500 },
];

export const GARAGE_UPGRADES = [
  { id: 'engine1', name: 'Engine Tune I — +15% top speed', price: 1200 },
  { id: 'engine2', name: 'Engine Tune II — +30% top speed', price: 3000 },
  { id: 'armor1', name: 'Armor Plating — car takes half damage', price: 2000 },
  { id: 'armor2', name: 'Heavy Armor — car nearly indestructible', price: 4500 },
  { id: 'paint', name: 'Sunset Paint Job — respect +50', price: 800 },
  { id: 'nitro', name: 'Nitro Boost — hold SHIFT in car for boost', price: 2500 },
];

export const SHOP_WEAPONS = [
  { id: 'smg', name: 'SMG + 120 ammo', price: 900 },
  { id: 'shotgun', name: 'Shotgun + 40 shells', price: 1100 },
  { id: 'rifle', name: 'Rifle + 90 ammo', price: 2200 },
  { id: 'ammo', name: 'Ammo pack — all weapons', price: 500 },
  { id: 'vest', name: 'Body Armor — full health', price: 600 },
];

export const RADIO_STATIONS = [
  { name: 'SOLANO FM — Synthwave', bpm: 96, scale: [0, 3, 5, 7, 10] },
  { name: 'CALLE 9 — Latin Groove', bpm: 118, scale: [0, 2, 4, 7, 9] },
  { name: 'DUSK AM — Ambient Drift', bpm: 70, scale: [0, 5, 7, 12] },
];

export const PALETTE = {
  skyTop: 0x2a1a4e, skyMid: 0xff7a3d, skyLow: 0xffb347,
  sun: 0xffc46b, fog: 0xe08a5a, water: 0x1e6f8e, sand: 0xd9b380,
  asphalt: 0x2e2e38, sidewalk: 0x8d8578,
};

export const SAVE_KEY = 'solano-heat-save-v2';
export const BEST_KEY = 'solano-heat-best-v2';
