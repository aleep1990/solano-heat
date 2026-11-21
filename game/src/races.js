// Street races: timed checkpoint runs through the city, with a cash prize
// and a best time. Two circuits: the Plaza loop and the Coastal Run.
import * as THREE from 'three';

export const RACE_DEFS = {
  plaza: {
    name: 'PLAZA LOOP', prize: 1500, par: 75,
    checkpoints: [[20, 20], [140, 20], [140, 140], [20, 140], [-100, 140], [-100, 20], [20, 20]],
  },
  coast: {
    name: 'COASTAL RUN', prize: 2200, par: 95,
    checkpoints: [[20, -260], [180, -260], [220, -140], [100, -140], [-100, -140], [-220, -260], [20, -260]],
  },
};

export function createRaces(scene) {
  const state = { active: false, race: null, cp: 0, time: 0, won: false, done: false, best: {} };
  let markers = [];
  function clearMarkers() {
    for (const m of markers) scene.remove(m);
    markers = [];
  }
  function start(G, raceId) {
    const def = RACE_DEFS[raceId];
    clearMarkers();
    state.active = true; state.race = raceId; state.cp = 0; state.time = 0;
    state.won = false; state.done = false;
    for (const [x, z] of def.checkpoints) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(6, 0.5, 8, 24),
        new THREE.MeshBasicMaterial({ color: 0xffd23e }),
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.set(x, 1.5, z);
      scene.add(ring);
      markers.push(ring);
    }
    G.hud.toast(`RACE: ${def.name} — hit every checkpoint!`);
    G.audio.missionStart();
  }
  function update(G, dt) {
    if (!state.active) return;
    state.time += dt;
    const def = RACE_DEFS[state.race];
    const pos = G.inCar && G.car ? G.car.pos : G.player.state.pos;
    const [cx, cz] = def.checkpoints[state.cp];
    const d = Math.hypot(pos.x - cx, pos.z - cz);
    G.hud.setObjective(`RACE — ${def.name}`, `Checkpoint ${state.cp + 1}/${def.checkpoints.length} · ${state.time.toFixed(1)}s`, `${Math.round(d)}m`);
    G.marker.set(cx, cz);
    if (d < 9) {
      state.cp += 1;
      G.audio.pickup();
      if (state.cp >= def.checkpoints.length) {
        state.active = false; state.done = true;
        state.won = state.time <= def.par + 30;
        const best = state.best[state.race];
        if (!best || state.time < best) state.best[state.race] = state.time;
        if (state.won) {
          G.progress.cash += def.prize;
          G.progress.respect += 80;
          G.hud.toast(`RACE WON in ${state.time.toFixed(1)}s — $${def.prize}!`);
          G.audio.missionComplete();
        } else {
          G.hud.toast(`Race over in ${state.time.toFixed(1)}s — too slow for the prize.`);
        }
        clearMarkers();
        G.save.save();
      }
    }
    // Rings spin for visibility.
    for (const m of markers) m.rotation.z += dt;
  }
  return { state, start, update, clearMarkers };
}
