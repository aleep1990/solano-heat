// CONDOR-1 — the police helicopter (air unit): follows the player at 4+ stars,
// sweeps a searchlight, and calls in ground units.
import * as THREE from 'three';

export function createHelicopter(scene) {
  const group = new THREE.Group();
  group.name = 'CONDOR-1';
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0x1a2a4b });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.4, 5.2), bodyMat);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 4.5), bodyMat);
  tail.position.set(0, 0.3, -4.2);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.8, 1.6), new THREE.MeshLambertMaterial({ color: 0x9ad5ff }));
  glass.position.set(0, 0.3, 2.0);
  const rotor = new THREE.Mesh(new THREE.BoxGeometry(9, 0.08, 0.5), new THREE.MeshLambertMaterial({ color: 0x222222 }));
  rotor.position.y = 1.0;
  const tailRotor = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.2, 0.4), new THREE.MeshLambertMaterial({ color: 0x222222 }));
  tailRotor.position.set(0.3, 0.4, -6.2);
  group.add(body, tail, glass, rotor, tailRotor);
  // Searchlight: spotlight + visible cone.
  const spot = new THREE.SpotLight(0xfff2b0, 900, 120, 0.32, 0.5, 1.2);
  spot.position.set(0, -0.6, 0);
  group.add(spot);
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(7, 42, 16, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }),
  );
  cone.position.y = -21;
  cone.rotation.x = Math.PI;
  group.add(cone);
  group.visible = false;
  scene.add(group);
  spot.target = new THREE.Object3D();
  scene.add(spot.target);
  const state = { active: false, pos: group.position, rotor, spot, cone, callTimer: 0 };
  return { group, state };
}

export function updateHelicopter(G, dt) {
  const H = G.heli;
  const S = H.state;
  const wanted = G.police.state.wanted;
  const shouldFly = wanted >= 4;
  if (shouldFly && !S.active) {
    S.active = true;
    H.group.visible = true;
    G.hud.toast('CONDOR-1 air unit is overhead — lose the helicopter!');
    G.audio.heli(true);
  }
  if (!shouldFly && S.active) {
    S.active = false;
    H.group.visible = false;
    G.audio.heli(false);
  }
  if (!S.active) return;
  const playerPos = G.inCar && G.car ? G.car.pos : G.player.state.pos;
  // Hover above and slightly behind the player, circling slowly.
  const t = performance.now() / 1000;
  const tx = playerPos.x + Math.sin(t * 0.25) * 14;
  const tz = playerPos.z + Math.cos(t * 0.25) * 14;
  S.pos.x += (tx - S.pos.x) * Math.min(1, dt * 0.9);
  S.pos.z += (tz - S.pos.z) * Math.min(1, dt * 0.9);
  S.pos.y = 42 + Math.sin(t * 0.7) * 1.5;
  H.group.position.copy(S.pos);
  H.group.rotation.y = Math.atan2(playerPos.x - S.pos.x, playerPos.z - S.pos.z);
  S.rotor.rotation.y += dt * 22;
  // Searchlight tracks the player; the cone follows.
  S.spot.target.position.set(playerPos.x, 0, playerPos.z);
  S.spot.target.updateMatrixWorld();
  // Calls in ground units every 12 seconds while the air unit is up.
  S.callTimer -= dt;
  if (S.callTimer <= 0) {
    S.callTimer = 12;
    if (G.police.state.units.length < 5) G.police.spawnUnit();
  }
  G.audio.rotor();
}
