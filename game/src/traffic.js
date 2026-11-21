// Living city: traffic cars looping the road graph, pedestrians on sidewalks
// who flee when shots are fired.
import * as THREE from 'three';
import { buildCarMesh } from './vehicles.js';

const PED_COLORS = [0xe8b04b, 0x4b7ae8, 0xe84b7a, 0x7ae84b, 0x9a4be8, 0xe8e8e8, 0x333333];

export function createTraffic(scene, rng, city) {
  const traffic = [];
  for (let i = 0; i < 22; i += 1) {
    const node = rng.pick(city.roadNodes);
    const car = buildCarMesh(rng.pick([0xd23c2e, 0x2e6fd2, 0xffd23e, 0x3aa655, 0xeeeeee, 0x222222]), 'SEDAN');
    car.position.set(node.x, 0, node.z);
    scene.add(car);
    traffic.push({
      mesh: car, pos: car.position, heading: rng.pick([0, Math.PI / 2, Math.PI, -Math.PI / 2]),
      speed: rng.range(8, 14), node, targetNode: null, panic: 0,
    });
  }
  const peds = [];
  const pedGeo = new THREE.BoxGeometry(0.55, 1.7, 0.4);
  const headGeo = new THREE.SphereGeometry(0.24, 10, 8);
  for (let i = 0; i < 46; i += 1) {
    const g = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ color: rng.pick(PED_COLORS) });
    const body = new THREE.Mesh(pedGeo, mat);
    body.position.y = 0.85;
    const head = new THREE.Mesh(headGeo, new THREE.MeshLambertMaterial({ color: 0xc98a5a }));
    head.position.y = 1.85;
    g.add(body, head);
    const x = Math.round(rng.range(-280, 280) / 40) * 40 + 14;
    const z = Math.round(rng.range(-280, 280) / 40) * 40 + 14;
    g.position.set(x, 0, z);
    scene.add(g);
    peds.push({
      mesh: g, pos: g.position, heading: rng.next() * Math.PI * 2,
      speed: rng.range(1.2, 2.2), flee: 0, phase: rng.next() * 6,
    });
  }
  return { traffic, peds };
}

function nearestNode(nodes, x, z) {
  let best = nodes[0], bd = Infinity;
  for (const n of nodes) {
    const d = (n.x - x) ** 2 + (n.z - z) ** 2;
    if (d < bd) { bd = d; best = n; }
  }
  return best;
}

export function updateTraffic(G, dt) {
  const nodes = G.city.roadNodes;
  for (const t of G.traffic.traffic) {
    if (!t.targetNode) {
      // Pick a neighbouring intersection (one block along a road).
      const options = nodes.filter((n) => (Math.abs(n.x - t.pos.x) === 40 && n.z === t.pos.z) || (Math.abs(n.z - t.pos.z) === 40 && n.x === t.pos.x));
      t.targetNode = options.length ? options[Math.floor(Math.random() * options.length)] : nearestNode(nodes, t.pos.x, t.pos.z);
    }
    const dx = t.targetNode.x - t.pos.x, dz = t.targetNode.z - t.pos.z;
    const dist = Math.hypot(dx, dz);
    const wantHeading = Math.atan2(dx, dz);
    let dh = wantHeading - t.heading;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    t.heading += Math.max(-2.4 * dt, Math.min(2.4 * dt, dh));
    const speed = t.panic > 0 ? t.speed * 1.8 : t.speed;
    t.pos.x += Math.sin(t.heading) * speed * dt;
    t.pos.z += Math.cos(t.heading) * speed * dt;
    t.mesh.position.copy(t.pos);
    t.mesh.rotation.y = t.heading;
    if (dist < 3) t.targetNode = null;
    if (t.panic > 0) t.panic -= dt;
    // Bump the player car: traffic swerves, player car takes a little damage.
    if (G.inCar && G.car) {
      const d = Math.hypot(t.pos.x - G.car.pos.x, t.pos.z - G.car.pos.z);
      if (d < 3.4) {
        t.panic = 2;
        if (Math.abs(G.car.speed) > 10) G.vehicles.damageCar(G, G.car, 4);
        t.pos.x += Math.sin(t.heading) * 4 * dt;
        t.pos.z += Math.cos(t.heading) * 4 * dt;
      }
    }
  }
  // Pedestrians: stroll the sidewalks, flee from gunfire.
  const playerPos = G.inCar && G.car ? G.car.pos : G.player.state.pos;
  for (const p of G.traffic.peds) {
    if (p.flee > 0) {
      p.flee -= dt;
      const dx = p.pos.x - playerPos.x, dz = p.pos.z - playerPos.z;
      const d = Math.hypot(dx, dz) || 1;
      p.pos.x += (dx / d) * 5 * dt;
      p.pos.z += (dz / d) * 5 * dt;
      p.heading = Math.atan2(dx, dz);
    } else {
      p.phase += dt;
      p.pos.x += Math.sin(p.heading) * p.speed * dt;
      p.pos.z += Math.cos(p.heading) * p.speed * dt;
      if (Math.abs(p.pos.x) > 295 || Math.abs(p.pos.z) > 295 || Math.random() < dt * 0.02) {
        p.heading += (Math.random() - 0.5) * 2.4;
      }
      // Keep peds near sidewalks (offset from road centres).
      if (Math.abs(p.pos.x % 40) < 4) p.pos.x += 6 * dt;
    }
    p.pos.x = Math.max(-295, Math.min(295, p.pos.x));
    p.pos.z = Math.max(-295, Math.min(295, p.pos.z));
    p.mesh.position.copy(p.pos);
    p.mesh.rotation.y = p.heading;
    p.mesh.position.y = Math.abs(Math.sin(p.phase * 6)) * 0.05;
  }
}

export function scarePedestrians(G, radius = 40) {
  const pp = G.inCar && G.car ? G.car.pos : G.player.state.pos;
  for (const p of G.traffic.peds) {
    if (p.pos.distanceTo(pp) < radius) p.flee = 4;
  }
  for (const t of G.traffic.traffic) {
    if (t.pos.distanceTo(pp) < radius) t.panic = 3;
  }
}
