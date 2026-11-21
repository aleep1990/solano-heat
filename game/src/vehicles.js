// Cars: box-built models, arcade driving physics, enter / exit / steal,
// damage, smoke and burning wrecks (see wrecks.js for the fire itself).
import * as THREE from 'three';
import { collideCircle, clampToCity } from './world.js';

const CAR_COLORS = [0xd23c2e, 0x2e6fd2, 0xffd23e, 0x3aa655, 0xeeeeee, 0x222222, 0xff7a1a, 0x8a3fd2];
const CAR_TYPES = [
  { name: 'SEDAN', top: 34, accel: 16 },
  { name: 'SPORTS', top: 46, accel: 22 },
  { name: 'SUV', top: 30, accel: 13 },
  { name: 'TAXI', top: 32, accel: 15 },
];

export function buildCarMesh(color, typeName) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color });
  const glassMat = new THREE.MeshLambertMaterial({ color: 0x1a2430 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.62, 4.4), bodyMat);
  body.position.y = 0.55;
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.55, 2.2), glassMat);
  cabin.position.set(0, 1.08, -0.2);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.3, 0.7), bodyMat);
  nose.position.set(0, 0.45, 2.2);
  g.add(body, cabin, nose);
  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 12);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const wheels = [];
  for (const [x, z] of [[-0.95, 1.45], [0.95, 1.45], [-0.95, -1.45], [0.95, -1.45]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.38, z);
    g.add(w); wheels.push(w);
  }
  // Headlights + taillights.
  const hl = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
  for (const x of [-0.6, 0.6]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.14, 0.06), hl);
    h.position.set(x, 0.6, 2.56); g.add(h);
  }
  const tl = new THREE.MeshBasicMaterial({ color: 0xff2d2d });
  for (const x of [-0.6, 0.6]) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.14, 0.06), tl);
    t.position.set(x, 0.6, -2.24); g.add(t);
  }
  g.userData.typeName = typeName;
  g.userData.wheels = wheels;
  return g;
}

export function createVehicleSystem(scene, rng) {
  const cars = []; // parked + traffic cars the player can steal
  function spawnCar(x, z, heading, color, typeIdx) {
    const type = CAR_TYPES[typeIdx ?? rng.int(0, CAR_TYPES.length - 1)];
    const mesh = buildCarMesh(color ?? rng.pick(CAR_COLORS), type.name);
    mesh.position.set(x, 0, z);
    mesh.rotation.y = heading;
    scene.add(mesh);
    const car = {
      mesh, pos: mesh.position, heading, speed: 0, steer: 0,
      type, damage: 0, owned: false, parked: true, color: mesh.children[0].material.color.getHex(),
      smokeTimer: 0,
    };
    cars.push(car);
    return car;
  }
  // Parked cars along the roadside: on a road line, offset to the kerb.
  for (let i = 0; i < 26; i += 1) {
    const roadCoord = () => rng.int(-7, 7) * 40 + 20;
    const along = () => Math.max(-280, Math.min(280, roadCoord() + rng.range(-90, 90)));
    let x, z, heading;
    if (rng.next() < 0.5) { x = roadCoord() + (rng.next() < 0.5 ? 7 : -7); z = along(); heading = 0; }
    else { z = roadCoord() + (rng.next() < 0.5 ? 7 : -7); x = along(); heading = Math.PI / 2; }
    spawnCar(x, z, heading);
  }
  return { cars, spawnCar };
}

export function nearestStealableCar(G, maxDist = 5) {
  let best = null, bestD = maxDist;
  for (const car of G.vehicles.cars) {
    if (car === G.car) continue;
    const d = car.pos.distanceTo(G.player.state.pos);
    if (d < bestD) { bestD = d; best = car; }
  }
  return best;
}

export function enterCar(G, car) {
  G.car = car;
  car.parked = false;
  car.owned = true;
  G.inCar = true;
  G.player.group.visible = false;
  G.hud.toast(`Stole a ${car.type.name} — wanted +1★`);
  G.police.addWanted(1);
  G.audio.carDoor();
}

export function exitCar(G) {
  if (!G.car) return;
  G.inCar = false;
  const p = G.player.state.pos;
  p.set(G.car.pos.x + Math.sin(G.car.heading + Math.PI / 2) * 3, 0, G.car.pos.z + Math.cos(G.car.heading + Math.PI / 2) * 3);
  G.player.group.visible = true;
  G.car.speed = 0;
  G.audio.carDoor();
}

export function driveCar(G, dt) {
  const car = G.car;
  if (!car) return;
  const input = G.input;
  const ax = input.axis();
  const top = car.type.top * (1 + (G.garage.has('engine2') ? 0.3 : G.garage.has('engine1') ? 0.15 : 0)) * (G.crew.state.driverActive ? 1.1 : 1);
  const nitro = G.garage.has('nitro') && input.sprint;
  const accel = car.type.accel * (nitro ? 1.7 : 1);
  if (ax.z < 0) car.speed += accel * dt;          // W = gas
  else if (ax.z > 0) car.speed -= 22 * dt;        // S = brake/reverse
  else car.speed -= Math.sign(car.speed) * 6 * dt; // drag
  if (input.down('Space')) car.speed -= Math.sign(car.speed) * 26 * dt; // handbrake
  car.speed = Math.max(-12, Math.min(top * (nitro ? 1.25 : 1), car.speed));
  if (Math.abs(car.speed) < 0.3 && ax.z === 0) car.speed = 0;
  const steerTarget = -ax.x * (car.speed >= 0 ? 1 : -1) * Math.min(1, Math.abs(car.speed) / 8);
  car.steer += (steerTarget - car.steer) * Math.min(1, dt * 8);
  car.heading += car.steer * 1.9 * dt * Math.sign(car.speed || 1);
  const nx = car.pos.x + Math.sin(car.heading) * car.speed * dt;
  const nz = car.pos.z + Math.cos(car.heading) * car.speed * dt;
  const hit = collideCircle(G.city.colliders, nx, nz, 2.2);
  if (hit.hit && Math.abs(car.speed) > 6) {
    damageCar(G, car, Math.abs(car.speed) * 0.6);
    car.speed *= -0.25;
  }
  car.pos.x = hit.x; car.pos.z = hit.z;
  const cl = clampToCity(car.pos.x, car.pos.z);
  car.pos.x = cl.x; car.pos.z = cl.z;
  car.mesh.position.copy(car.pos);
  car.mesh.rotation.y = car.heading;
  // Wheel spin + body lean.
  const spin = car.speed * dt * 2.4;
  for (const w of car.mesh.userData.wheels) w.rotation.x += spin;
  car.mesh.rotation.z = -car.steer * 0.06;
  // Smoke when damaged.
  if (car.damage > 45) {
    car.smokeTimer -= dt;
    if (car.smokeTimer <= 0) {
      car.smokeTimer = 0.12;
      G.fx.smoke(car.pos.x, 1.4, car.pos.z);
    }
  }
  if (car.damage >= 100) G.wrecks.ignite(car);
  G.audio.engine(car.speed / top, nitro);
}

export function damageCar(G, car, amount) {
  const factor = G.garage.has('armor2') ? 0.25 : G.garage.has('armor1') ? 0.5 : 1;
  car.damage = Math.min(100, car.damage + amount * factor);
  G.fx.sparks(car.pos.x, 1, car.pos.z);
  G.audio.crash();
}
