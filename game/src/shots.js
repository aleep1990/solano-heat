// Deterministic screenshot staging: ?shot=start|drive|chase|mission&seed=N
// places the player, camera and world in a composed scene so the four
// screenshots are reproducible. Each mode paints the real game, then sets
// window.__shotReady for the screenshot tool.
import * as THREE from 'three';
import { enterCar } from './vehicles.js';

export function stageShot(G, name) {
  const city = G.city;
  G.screen = 'play';
  document.getElementById('menu').style.display = 'none';
  if (name === 'start') {
    // Title vista: camera high over the plaza looking at downtown + the bay sun.
    G.player.state.pos.set(0, 0, 120);
    G.player.state.camYaw = Math.PI;
    G.camera.position.set(0, 26, 190);
    G.camera.lookAt(0, 14, -160);
    G.daynight.setTimeOfDay(0.78);
    G.hud.setObjective('PORT SOLANO', 'Twelve missions. Five stars. One last job.', '');
    G.progress.cash = 500;
    document.getElementById('menu').style.display = 'flex';
    G.hud.update(G);
    return;
  }
  if (name === 'drive') {
    // Driving through downtown traffic at dusk, mission objective on the HUD.
    const car = G.vehicles.spawnCar(20, 60, Math.PI, 0xd23c2e, 1);
    enterCar(G, car);
    G.car.speed = 22;
    G.player.state.camYaw = 0;
    // Traffic ahead on the same road so the street reads as alive:
    // 5 cars in frame — ahead in the player's lane and both adjacent lanes.
    G.vehicles.spawnCar(14, 46, Math.PI, 0x2e6fd2, 0);
    G.vehicles.spawnCar(26, 38, Math.PI, 0xeeeeee, 2);
    G.vehicles.spawnCar(20, 30, Math.PI, 0xf5c542, 1);
    G.vehicles.spawnCar(14, 22, Math.PI, 0x37b24d, 0);
    G.vehicles.spawnCar(26, 14, Math.PI, 0x9c36b5, 2);
    G.missions.start(G, 0);
    G.missions.state.step = 0;
    G.hud.setObjective('MISSION 1 — THE PICKUP', 'Drive to the marina pier', '312m');
    G.marker.set(0, -290);
    G.daynight.setTimeOfDay(0.78);
    G.progress.cash = 1250;
    G.progress.respect = 120;
    return;
  }
  if (name === 'chase') {
    // The money shot: 4 stars, CONDOR-1 overhead with searchlight, a roadblock
    // ahead, police cars behind, minimap + objective on the HUD.
    const car = G.vehicles.spawnCar(-20, 60, Math.PI, 0xff7a1a, 1);
    enterCar(G, car);
    G.car.speed = 26;
    G.player.state.camYaw = 0;
    G.missions.start(G, 3);
    G.missions.state.step = 1;
    G.police.setWanted(4);
    // Roadblock CLOSE ahead (26m) so it reads large: 2 parked-across cars
    // plus a third unit filling the middle gap — a solid wall of police.
    G.police.spawnRoadblock(G, 26);
    const rbCar = G.police.spawnUnit();
    rbCar.pos.set(-20, 0, 34);
    rbCar.mesh.position.set(-20, 0, 34);
    rbCar.mesh.rotation.y = Math.PI * 1.5;
    // Police units flanking the player (visible in frame) + one tailing behind.
    const flank = [[-28, 34], [-12, 46], [-20, 86]];
    for (const [ux, uz] of flank) {
      const u = G.police.spawnUnit();
      u.pos.set(ux, 0, uz);
      u.heading = Math.PI;
      u.mesh.rotation.y = Math.PI;
    }
    // CONDOR-1 LOW and CLOSE: just ahead-LEFT of the player, big in frame,
    // rotor + searchlight beam clearly visible. Staged on the LEFT so the
    // dark heli reads against the bright dusk sky, not the dark buildings.
    // (Shot mode never runs the heli update, so this staged position is
    // the one photographed.)
    G.heli.state.active = true;
    G.heli.group.visible = true;
    G.heli.state.pos.set(-24, 9, 40);
    G.heli.group.position.copy(G.heli.state.pos);
    G.heli.group.rotation.y = Math.atan2(-20 - (-24), 60 - 34);
    G.heli.state.spot.target.position.set(-20, 0, 60);
    G.heli.state.spot.target.updateMatrixWorld();
    // Fixed camera: low, looking slightly UP the street, so CONDOR-1 (low,
    // close) sits in the upper frame, the roadblock mid-frame, the player
    // car low-center. (The follow camera tilts down too steeply and pushes
    // the helicopter off the top edge.)
    G.shotCam = new THREE.Vector3(-20, 3.5, 80);
    G.shotLook = new THREE.Vector3(-17, 5, 20);
    G.hud.setObjective('MISSION 4 — THE LONG WAY HOME', 'Lose the 4-star heat — CONDOR-1 is overhead', 'Wanted: ★★★★');
    G.marker.set(180, 180);
    G.progress.cash = 3400;
    G.progress.respect = 420;
    G.daynight.setTimeOfDay(0.8);
    return;
  }
  // mission: on-foot combat near the objective with a crew companion + enemies.
  // Dante stands just south of the marker ring so he is not hidden by its beam.
  G.player.state.pos.set(-180, 0, 188);
  // The player mesh only follows state.pos inside the game loop — sync it here.
  G.player.group.position.copy(G.player.state.pos);
  G.player.group.visible = true;
  G.player.state.heading = Math.PI * 0.25;
  G.player.group.rotation.y = G.player.state.heading;
  G.player.state.camYaw = Math.PI * 0.85;
  G.crew.recruit(G);
  G.crew.state.members[0].pos.set(-172, 0, 184);
  G.crew.state.members[1].pos.set(-186, 0, 180);
  // Enemies CLOSE to Dante (~10m) so they read as figures, not dots —
  // and turned to face him, guns toward him, so the fight reads.
  const e1 = G.combat.spawnEnemy(-172, 180, 'rival');
  const e2 = G.combat.spawnEnemy(-188, 180, 'rival');
  const e3 = G.combat.spawnEnemy(-176, 196, 'rival');
  for (const e of [e1, e2, e3]) {
    e.mesh.rotation.y = Math.atan2(-180 - e.pos.x, 188 - e.pos.z);
  }
  // Fixed CLOSER, lower camera for this shot: player + crew + enemies all
  // in frame, figures large. Camera sits on the road south of the player.
  G.shotCam = new THREE.Vector3(-178, 4.5, 203);
  G.shotLook = new THREE.Vector3(-180, 1.2, 183);
  G.combat.selectWeapon('rifle');
  G.missions.start(G, 2);
  G.missions.state.step = 1;
  G.hud.setObjective('MISSION 3 — PAYDAY', 'Take out the rival crew (3)', 'Enemies left: 3');
  G.marker.set(-180, 180);
  G.progress.cash = 2100;
  G.progress.respect = 260;
  G.police.setWanted(2);
  G.daynight.setTimeOfDay(0.76);
}

export function paintShot(G) {
  G.renderer.render(G.scene, G.camera);
  G.hud.update(G);
  window.__shotReady = true;
}
