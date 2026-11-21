// Crew: two companions with abilities who join Dante after mission 6.
// Rico the wheelman (faster getaway driving) and Lena the hacker (jams police).
import * as THREE from 'three';

export function createCrew(scene) {
  const state = {
    recruited: false, driverActive: false, hackerCooldown: 0,
    members: [],
  };
  function makeMember(x, z, color, name) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.0, 0.4), new THREE.MeshLambertMaterial({ color }));
    body.position.y = 1.0;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), new THREE.MeshLambertMaterial({ color: 0xc98a5a }));
    head.position.y = 1.75;
    g.add(body, head);
    g.position.set(x, 0, z);
    scene.add(g);
    const m = { mesh: g, pos: g.position, name, follow: false };
    state.members.push(m);
    return m;
  }
  const rico = makeMember(200, -118, 0x2e6fd2, 'RICO — wheelman');
  const lena = makeMember(-198, 198, 0x9a4be8, 'LENA — hacker');
  function recruit(G) {
    state.recruited = true;
    state.driverActive = true;
    for (const m of state.members) m.follow = true;
    G.hud.toast('CREW RECRUITED — Rico drives faster, Lena can jam the police [H]');
  }
  function hackerJam(G) {
    if (!state.recruited || state.hackerCooldown > 0) return;
    state.hackerCooldown = 45;
    const w = G.police.state.wanted;
    G.police.setWanted(Math.max(0, w - 2));
    G.hud.toast('LENA JAMMED THE DISPATCH — wanted down 2 stars!');
    G.audio.pickup();
  }
  function update(G, dt) {
    if (state.hackerCooldown > 0) state.hackerCooldown -= dt;
    for (const m of state.members) {
      if (!m.follow) continue;
      const target = G.inCar && G.car ? G.car.pos : G.player.state.pos;
      const dx = target.x - m.pos.x, dz = target.z - m.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > 6 && d < 120) {
        m.pos.x += (dx / d) * 6.5 * dt;
        m.pos.z += (dz / d) * 6.5 * dt;
        m.mesh.rotation.y = Math.atan2(dx, dz);
      } else if (d >= 120) {
        m.pos.set(target.x + 3, 0, target.z + 3);
      }
      m.mesh.position.y = Math.abs(Math.sin(performance.now() / 300)) * 0.04;
    }
  }
  return { state, rico, lena, recruit, hackerJam, update };
}
