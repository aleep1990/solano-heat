// Five-star police dispatch: wanted level, pursuing police cars, foot cops,
// ROADBLOCKS at 3+ stars, and the BUSTED / escape cooldown.
import * as THREE from 'three';
import { buildCarMesh } from './vehicles.js';

export function createPolice(scene, rng) {
  const state = {
    wanted: 0, heat: 0, cooldown: 0, roadblockTimer: 0,
    units: [], footCops: [], roadblocks: [],
  };
  const sirenMat = new THREE.MeshBasicMaterial({ color: 0x2244ff });
  const sirenMat2 = new THREE.MeshBasicMaterial({ color: 0xff2222 });

  function spawnUnit() {
    const mesh = buildCarMesh(0x111111, 'POLICE');
    // Light bar.
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.18, 0.4), sirenMat);
    bar.position.set(0, 1.45, -0.2);
    mesh.add(bar);
    const bar2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.42), sirenMat2);
    bar2.position.set(0.35, 1.45, -0.2);
    mesh.add(bar2);
    scene.add(mesh);
    const u = { mesh, pos: mesh.position, heading: 0, speed: 0, bar, bar2, flash: 0 };
    state.units.push(u);
    return u;
  }
  function spawnFootCop(x, z) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.0, 0.4), new THREE.MeshLambertMaterial({ color: 0x1a2a6b }));
    body.position.y = 1.0;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), new THREE.MeshLambertMaterial({ color: 0xc98a5a }));
    head.position.y = 1.75;
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.12, 10), new THREE.MeshLambertMaterial({ color: 0x0a1a4b }));
    cap.position.y = 1.95;
    g.add(body, head, cap);
    g.position.set(x, 0, z);
    scene.add(g);
    const cop = { mesh: g, pos: g.position, heading: 0, speed: 4.5 };
    state.footCops.push(cop);
    return cop;
  }
  function spawnRoadblock(G, ahead) {
    // Two police cars parked across the road ahead of the player.
    const target = G.inCar && G.car ? G.car : null;
    const base = target ? { x: target.pos.x + Math.sin(target.heading) * ahead, z: target.pos.z + Math.cos(target.heading) * ahead, h: target.heading } : { x: G.player.state.pos.x, z: G.player.state.pos.z - ahead, h: 0 };
    const group = new THREE.Group();
    const cars = [];
    for (const off of [-5, 5]) {
      const mesh = buildCarMesh(0x111111, 'POLICE');
      mesh.position.set(base.x + Math.cos(base.h) * off, 0, base.z - Math.sin(base.h) * off);
      mesh.rotation.y = base.h + Math.PI / 2;
      scene.add(mesh);
      cars.push(mesh);
    }
    const rb = { cars, x: base.x, z: base.z, ttl: 45 };
    state.roadblocks.push(rb);
    G.hud.toast('ROADBLOCK AHEAD — find another route!');
    return rb;
  }
  function addWanted(n) {
    state.wanted = Math.max(0, Math.min(5, state.wanted + n));
    state.cooldown = 0;
  }
  function setWanted(n) {
    state.wanted = Math.max(0, Math.min(5, n));
    state.cooldown = 0;
  }
  function clearRoadblocks(sceneRef) {
    for (const rb of state.roadblocks) for (const c of rb.cars) sceneRef.remove(c);
    state.roadblocks = [];
  }
  return { state, spawnUnit, spawnFootCop, spawnRoadblock, addWanted, setWanted, clearRoadblocks };
}

export function updatePolice(G, dt) {
  const P = G.police;
  const S = P.state;
  const playerPos = G.inCar && G.car ? G.car.pos : G.player.state.pos;
  const playerSpeed = G.inCar && G.car ? Math.abs(G.car.speed) : G.player.state.speed;

  // Wanted decay: hide / outrun the heat and it cools down.
  if (S.wanted > 0) {
    const nearestCop = nearestUnitDistance(S, playerPos);
    if (nearestCop > 90) {
      S.cooldown += dt;
      if (S.cooldown > 8) { S.wanted -= 1; S.cooldown = 0; G.hud.toast('Heat cooling off…'); }
    } else S.cooldown = 0;
  }

  // Spawn units to match the wanted level (1 unit per star, max 5).
  const wantUnits = S.wanted;
  while (S.units.length < wantUnits) {
    const u = P.spawnUnit();
    const a = Math.random() * Math.PI * 2;
    u.pos.set(playerPos.x + Math.sin(a) * 70, 0, playerPos.z + Math.cos(a) * 70);
  }
  while (S.units.length > wantUnits) {
    const u = S.units.pop();
    G.scene.remove(u.mesh);
  }
  // Foot cops at 2+ stars when on foot.
  const wantCops = S.wanted >= 2 && !G.inCar ? Math.min(3, S.wanted - 1) : 0;
  while (S.footCops.length < wantCops) {
    const a = Math.random() * Math.PI * 2;
    P.spawnFootCop(playerPos.x + Math.sin(a) * 25, playerPos.z + Math.cos(a) * 25);
  }
  while (S.footCops.length > wantCops) {
    const c = S.footCops.pop();
    G.scene.remove(c.mesh);
  }

  // Pursuit: police cars chase and ram; foot cops run the player down.
  for (const u of S.units) {
    const dx = playerPos.x - u.pos.x, dz = playerPos.z - u.pos.z;
    const dist = Math.hypot(dx, dz) || 1;
    const wantHeading = Math.atan2(dx, dz);
    let dh = wantHeading - u.heading;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    u.heading += Math.max(-2.6 * dt, Math.min(2.6 * dt, dh));
    const targetSpeed = Math.min(30 + S.wanted * 3, dist < 8 ? 12 : 40);
    u.speed += (targetSpeed - u.speed) * dt * 1.2;
    u.pos.x += Math.sin(u.heading) * u.speed * dt;
    u.pos.z += Math.cos(u.heading) * u.speed * dt;
    u.mesh.position.copy(u.pos);
    u.mesh.rotation.y = u.heading;
    u.flash += dt;
    const on = Math.floor(u.flash * 6) % 2 === 0;
    u.bar.material.color.setHex(on ? 0x2244ff : 0xff2222);
    u.bar2.material.color.setHex(on ? 0xff2222 : 0x2244ff);
    // Ram: damage the player's car, or bust the player on foot.
    if (dist < 4) {
      if (G.inCar && G.car) {
        G.vehicles.damageCar(G, G.car, 6 * dt * 10);
        G.car.speed *= 0.92;
      } else if (playerSpeed < 2) {
        G.gameOver('BUSTED');
        return;
      }
    }
  }
  for (const c of S.footCops) {
    const dx = playerPos.x - c.pos.x, dz = playerPos.z - c.pos.z;
    const dist = Math.hypot(dx, dz) || 1;
    c.heading = Math.atan2(dx, dz);
    c.pos.x += Math.sin(c.heading) * c.speed * dt;
    c.pos.z += Math.cos(c.heading) * c.speed * dt;
    c.mesh.position.copy(c.pos);
    c.mesh.rotation.y = c.heading;
    if (dist < 1.6 && playerSpeed < 2) { G.gameOver('BUSTED'); return; }
  }

  // Roadblocks at 3+ stars, refreshed ahead of the player.
  S.roadblockTimer -= dt;
  if (S.wanted >= 3 && S.roadblockTimer <= 0) {
    S.roadblockTimer = 25;
    P.spawnRoadblock(G, 90);
  }
  for (const rb of S.roadblocks) {
    rb.ttl -= dt;
    const d = Math.hypot(rb.x - playerPos.x, rb.z - playerPos.z);
    if (d < 6 && G.inCar && G.car && Math.abs(G.car.speed) > 8) {
      G.vehicles.damageCar(G, G.car, 25);
      G.car.speed *= 0.3;
      G.hud.toast('Smashed through the roadblock!');
    }
  }
  S.roadblocks = S.roadblocks.filter((rb) => rb.ttl > 0);
  if (S.wanted < 3) P.clearRoadblocks(G.scene);
  // Siren audio follows the nearest unit.
  G.audio.siren(S.units.length > 0, nearestUnitDistance(S, playerPos));
}

function nearestUnitDistance(S, pos) {
  let best = Infinity;
  for (const u of S.units) best = Math.min(best, Math.hypot(u.pos.x - pos.x, u.pos.z - pos.z));
  return best;
}
