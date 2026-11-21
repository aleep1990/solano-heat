// Combat: mouse-aim shooting, 4 weapons, weapon wheel (Q / 1–4), ammo,
// health, damage, and enemies (rival crew / cops) who shoot back in missions.
import * as THREE from 'three';
import { WEAPONS, WEAPON_ORDER } from './weapons.js';

export function createCombat(scene, rng) {
  const state = {
    weapon: 'pistol',
    ammo: { pistol: Infinity, smg: 120, shotgun: 40, rifle: 90 },
    owned: { pistol: true, smg: true, shotgun: true, rifle: true },
    cooldown: 0, wheelOpen: false,
    enemies: [],
  };

  function spawnEnemy(x, z, kind) {
    const g = new THREE.Group();
    const shirtColor = kind === 'cop' ? 0x1a2a6b : 0x8a1a2a;
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.0, 0.4), new THREE.MeshLambertMaterial({ color: shirtColor }));
    body.position.y = 1.0;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), new THREE.MeshLambertMaterial({ color: 0xc98a5a }));
    head.position.y = 1.75;
    const gun = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.7), new THREE.MeshLambertMaterial({ color: 0x111111 }));
    gun.position.set(0.35, 1.2, 0.3);
    g.add(body, head, gun);
    g.position.set(x, 0, z);
    scene.add(g);
    const e = { mesh: g, pos: g.position, health: kind === 'cop' ? 60 : 80, kind, shootTimer: rng.range(0.5, 2), speed: 3.2 };
    state.enemies.push(e);
    return e;
  }

  function selectWeapon(id) {
    if (!state.owned[id]) return;
    state.weapon = id;
    state.wheelOpen = false;
  }

  function cycleWeapon(dir) {
    const i = WEAPON_ORDER.indexOf(state.weapon);
    const next = WEAPON_ORDER[(i + dir + WEAPON_ORDER.length) % WEAPON_ORDER.length];
    selectWeapon(next);
  }

  // Ray from the camera through the screen centre; hits the nearest enemy,
  // traffic car or pedestrian within range, else sparks on a building.
  function shoot(G) {
    const w = WEAPONS[state.weapon];
    if (state.cooldown > 0) return;
    if (state.ammo[w.id] !== Infinity && state.ammo[w.id] <= 0) {
      G.hud.toast(`${w.name} is empty — buy ammo at the weapon shop!`);
      G.audio.dryFire();
      state.cooldown = 0.3;
      return;
    }
    state.cooldown = w.rate;
    if (state.ammo[w.id] !== Infinity) state.ammo[w.id] -= 1;
    const origin = G.camera.position.clone();
    const dir = new THREE.Vector3();
    G.camera.getWorldDirection(dir);
    let bestHit = null, bestD = w.range;
    const targets = [];
    for (const e of state.enemies) targets.push({ pos: e.pos, radius: 1.1, ref: e, kind: 'enemy' });
    for (const t of G.traffic.traffic) targets.push({ pos: t.pos, radius: 2.4, ref: t, kind: 'traffic' });
    for (const p of G.traffic.peds) targets.push({ pos: p.pos, radius: 0.9, ref: p, kind: 'ped' });
    for (const u of G.police.state.units) targets.push({ pos: u.pos, radius: 2.4, ref: u, kind: 'police' });
    for (const t of targets) {
      const to = new THREE.Vector3(t.pos.x, 1.2, t.pos.z).sub(origin);
      const along = to.dot(dir);
      if (along < 0 || along > bestD) continue;
      const closest = origin.clone().addScaledVector(dir, along);
      const perp = closest.distanceTo(new THREE.Vector3(t.pos.x, 1.2, t.pos.z));
      if (perp < t.radius + w.spread * along) { bestD = along; bestHit = t; }
    }
    const end = origin.clone().addScaledVector(dir, bestD);
    G.fx.tracer(origin, end, w.color);
    G.fx.muzzle(G.player.state.pos, G.player.state.heading);
    G.audio.gunshot(w.id);
    G.trafficScare();
    if (bestHit) {
      if (bestHit.kind === 'enemy') {
        bestHit.ref.health -= w.damage * w.pellets;
        G.fx.blood(bestHit.pos.x, 1.2, bestHit.pos.z);
        if (bestHit.ref.health <= 0) killEnemy(G, bestHit.ref);
      } else if (bestHit.kind === 'police') {
        G.police.addWanted(1);
        G.fx.sparks(bestHit.pos.x, 1.2, bestHit.pos.z);
      } else if (bestHit.kind === 'traffic') {
        G.fx.sparks(bestHit.pos.x, 1, bestHit.pos.z);
        G.police.addWanted(1);
      } else if (bestHit.kind === 'ped') {
        G.fx.blood(bestHit.pos.x, 1, bestHit.pos.z);
        G.police.addWanted(1);
        bestHit.ref.flee = 6;
      }
    } else if (bestD < w.range) {
      G.fx.sparks(end.x, end.y, end.z);
    }
  }

  function killEnemy(G, e) {
    const i = state.enemies.indexOf(e);
    if (i >= 0) state.enemies.splice(i, 1);
    G.fx.explosion(e.pos.x, 1, e.pos.z, 0.4);
    scene.remove(e.mesh);
    G.progress.cash += 50;
    G.progress.respect += 5;
    G.audio.pickup();
  }

  function update(G, dt) {
    if (state.cooldown > 0) state.cooldown -= dt;
    const playerPos = G.player.state.pos;
    // Enemies advance on the player and shoot back.
    for (const e of [...state.enemies]) {
      const dx = playerPos.x - e.pos.x, dz = playerPos.z - e.pos.z;
      const dist = Math.hypot(dx, dz) || 1;
      e.mesh.rotation.y = Math.atan2(dx, dz);
      if (dist > 14) {
        e.pos.x += Math.sin(e.mesh.rotation.y) * e.speed * dt;
        e.pos.z += Math.cos(e.mesh.rotation.y) * e.speed * dt;
      }
      e.shootTimer -= dt;
      if (e.shootTimer <= 0 && dist < 45) {
        e.shootTimer = rng.range(0.9, 1.8);
        const from = new THREE.Vector3(e.pos.x, 1.4, e.pos.z);
        const to = new THREE.Vector3(playerPos.x, 1.2, playerPos.z);
        G.fx.tracer(from, to, 0xff5a5a);
        G.audio.gunshot('pistol');
        if (Math.random() < 0.3) {
          G.player.state.health -= 8;
          G.hud.toast('You are hit!');
          if (G.player.state.health <= 0) G.gameOver('WASTED');
        }
      }
    }
  }

  function clearEnemies() {
    for (const e of state.enemies) scene.remove(e.mesh);
    state.enemies = [];
  }

  return { state, spawnEnemy, selectWeapon, cycleWeapon, shoot, update, clearEnemies };
}
