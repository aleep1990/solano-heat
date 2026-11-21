// Shops and safehouses: the weapon shop sells guns and ammo, and two
// safehouses heal Dante and save the game when he walks in.
import { SHOP_WEAPONS } from './config.js';

export function createShops() {
  function buyWeapon(G, id) {
    const item = SHOP_WEAPONS.find((w) => w.id === id);
    if (!item) return false;
    if (G.progress.cash < item.price) { G.hud.toast('Not enough cash!'); return false; }
    G.progress.cash -= item.price;
    if (id === 'ammo') {
      for (const k of ['smg', 'shotgun', 'rifle']) G.combat.state.ammo[k] += 60;
    } else if (id === 'vest') {
      G.player.state.health = 100;
    } else {
      G.combat.state.owned[id] = true;
      G.combat.state.ammo[id] += id === 'smg' ? 120 : id === 'shotgun' ? 40 : 90;
    }
    G.hud.toast(`Bought: ${item.name}`);
    G.audio.pickup();
    G.save.save();
    return true;
  }
  function list() { return SHOP_WEAPONS; }
  function update(G, dt) {
    const pos = G.player.state.pos;
    for (const key of ['safehouse1', 'safehouse2']) {
      const m = G.city.markers[key];
      const d = Math.hypot(pos.x - m.x, pos.z - m.z);
      if (d < 8 && G.player.state.health < 100) {
        G.player.state.health = Math.min(100, G.player.state.health + 20 * dt);
        if (!G._safeMsg || performance.now() - G._safeMsg > 5000) {
          G._safeMsg = performance.now();
          G.hud.toast(`${m.name} — resting, health recovering, game saved`);
          G.save.save();
        }
      }
    }
    void dt;
  }
  return { buyWeapon, list, update };
}
