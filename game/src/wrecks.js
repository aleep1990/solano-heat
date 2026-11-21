// Burning wrecks: cars whose damage hits 100 catch fire, burn, and explode,
// leaving a smoking wreck that blocks the road for a while.
import * as THREE from 'three';

export function createWrecks(scene) {
  const wrecks = [];
  function ignite(car) {
    if (car._burning) return;
    car._burning = true;
    car.burnTimer = 3;
    car.mesh.children[0].material.color.setHex(0x222222);
  }
  function update(G, dt) {
    for (const car of G.vehicles.cars) {
      if (!car._burning) continue;
      car.burnTimer -= dt;
      G.fx.smoke(car.pos.x + (Math.random() - 0.5), 1.6, car.pos.z + (Math.random() - 0.5));
      if (Math.random() < dt * 6) G.fx.explosion(car.pos.x, 1, car.pos.z, 0.5);
      if (car.burnTimer <= 0) {
        car._burning = false;
        car._wreck = true;
        car.speed = 0;
        G.fx.explosion(car.pos.x, 1.2, car.pos.z, 1.6);
        G.audio.crash();
        G.audio.gunshot('shotgun');
        wrecks.push({ car, ttl: 60 });
        if (car === G.car) {
          G.gameOver('WASTED');
          return;
        }
        // The wreck stays as a charred shell; it no longer drives.
        car.mesh.rotation.z = 0.06;
      }
    }
    for (const w of wrecks) {
      w.ttl -= dt;
      if (Math.random() < dt * 0.5) G.fx.smoke(w.car.pos.x, 1.5, w.car.pos.z);
    }
  }
  return { ignite, update, wrecks };
}
