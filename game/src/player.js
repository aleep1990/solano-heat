// Dante Reyes on foot: third-person capsule character, WASD + mouse orbit camera,
// Shift sprint, Space jump, collision against building AABBs.
import * as THREE from 'three';
import { collideCircle, clampToCity } from './world.js';

export function createPlayer(scene) {
  const group = new THREE.Group();
  group.name = 'DanteReyes';
  const skin = new THREE.MeshLambertMaterial({ color: 0xc98a5a });
  const shirt = new THREE.MeshLambertMaterial({ color: 0xff7a1a });
  const pants = new THREE.MeshLambertMaterial({ color: 0x2b3a67 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.4), shirt);
  body.position.y = 1.05;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), skin);
  head.position.y = 1.75;
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.29, 12, 8, 0, Math.PI * 2, 0, 1.2), new THREE.MeshLambertMaterial({ color: 0x1a1210 }));
  hair.position.y = 1.8;
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.7, 0.3), pants);
  legL.position.set(-0.18, 0.35, 0);
  const legR = legL.clone();
  legR.position.x = 0.18;
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.24), shirt);
  armL.position.set(-0.48, 1.05, 0);
  const armR = armL.clone();
  armR.position.x = 0.48;
  group.add(body, head, hair, legL, legR, armL, armR);
  scene.add(group);

  const state = {
    pos: new THREE.Vector3(0, 0, 20),
    heading: 0, camYaw: Math.PI, camPitch: 0.32,
    vy: 0, grounded: true, speed: 0, walkPhase: 0,
    health: 100,
  };

  function update(G, dt) {
    const input = G.input;
    const mouse = input.consumeMouse();
    state.camYaw -= mouse.dx * 0.0032;
    state.camPitch = Math.max(-0.15, Math.min(1.0, state.camPitch + mouse.dy * 0.0024));
    const ax = input.axis();
    const sprint = input.sprint;
    const speed = sprint ? 9.5 : 5.2;
    // Movement is relative to the camera yaw.
    const fwd = new THREE.Vector3(-Math.sin(state.camYaw), 0, -Math.cos(state.camYaw));
    const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
    const move = new THREE.Vector3().addScaledVector(fwd, -ax.z).addScaledVector(right, ax.x);
    const moving = move.lengthSq() > 0.001;
    if (moving) {
      move.normalize();
      state.heading = Math.atan2(move.x, move.z);
      state.pos.addScaledVector(move, speed * dt);
      state.walkPhase += dt * (sprint ? 13 : 9);
      state.speed = speed;
    } else state.speed = 0;
    // Jump + gravity.
    if (input.pollPressed('Space') && state.grounded) { state.vy = 6.5; state.grounded = false; }
    if (!state.grounded) {
      state.vy -= 18 * dt;
      state.pos.y += state.vy * dt;
      if (state.pos.y <= 0) { state.pos.y = 0; state.vy = 0; state.grounded = true; }
    }
    // Collisions + city bounds.
    const hit = collideCircle(G.city.colliders, state.pos.x, state.pos.z, 0.7);
    state.pos.x = hit.x; state.pos.z = hit.z;
    const cl = clampToCity(state.pos.x, state.pos.z);
    state.pos.x = cl.x; state.pos.z = cl.z;
    // Pose.
    group.position.copy(state.pos);
    group.rotation.y = state.heading;
    const swing = moving ? Math.sin(state.walkPhase) * 0.55 : 0;
    legL.rotation.x = swing; legR.rotation.x = -swing;
    armL.rotation.x = -swing * 0.8; armR.rotation.x = swing * 0.8;
    body.position.y = 1.05 + (moving ? Math.abs(Math.sin(state.walkPhase)) * 0.05 : 0);
  }

  function updateCamera(G) {
    const cam = G.camera;
    const dist = G.inCar ? 11 : 7.5;
    const height = G.inCar ? 4.2 : 3.4;
    const target = G.inCar ? G.car.pos : state.pos;
    const cx = target.x + Math.sin(state.camYaw) * dist;
    const cz = target.z + Math.cos(state.camYaw) * dist;
    const cy = target.y + height + state.camPitch * 6;
    cam.position.lerp(new THREE.Vector3(cx, cy, cz), 0.25);
    cam.lookAt(target.x, target.y + 1.6, target.z);
  }

  return { group, state, update, updateCamera };
}
