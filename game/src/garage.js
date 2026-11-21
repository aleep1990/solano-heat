// Garage: car upgrades bought with cash — engine tunes, armor, paint, nitro.
// The garage lives at the marker in the city; press G nearby to open it.
import { GARAGE_UPGRADES } from './config.js';

export function createGarage() {
  const owned = new Set();
  function has(id) { return owned.has(id); }
  function buy(G, id) {
    const item = GARAGE_UPGRADES.find((u) => u.id === id);
    if (!item || owned.has(id)) return false;
    if (G.progress.cash < item.price) { G.hud.toast('Not enough cash for that upgrade!'); return false; }
    G.progress.cash -= item.price;
    owned.add(id);
    if (id === 'paint') G.progress.respect += 50;
    G.hud.toast(`Installed: ${item.name}`);
    G.audio.pickup();
    G.save.save();
    return true;
  }
  function list() { return GARAGE_UPGRADES.map((u) => ({ ...u, owned: owned.has(u.id) })); }
  function serialize() { return [...owned]; }
  function restore(ids) { owned.clear(); for (const id of ids || []) owned.add(id); }
  return { has, buy, list, serialize, restore };
}
