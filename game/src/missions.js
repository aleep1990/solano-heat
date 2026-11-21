// Story: 12 missions for Dante Reyes in Port Solano. Each mission is a chain
// of steps — drive, go, shoot, race, deliver — with a briefing, a payout and
// respect. Completing a mission unlocks the next and saves progress.
export const MISSIONS = [
  { id: 1, name: 'THE PICKUP', briefing: 'Dante is back. Drive to the marina and collect the package from the pier.', payout: 400, respect: 60, steps: [
    { type: 'drive', x: 0, z: -290, text: 'Drive to the marina pier' },
    { type: 'goto', x: 0, z: -312, text: 'Collect the package on the pier' },
    { type: 'drive', x: 20, z: 20, text: 'Bring the package back to Plaza Solano' },
  ]},
  { id: 2, name: 'HOT WHEELS', briefing: 'Steal a sports car from downtown and lose the 2-star tail.', payout: 600, respect: 80, steps: [
    { type: 'drive', x: 20, z: -60, text: 'Steal a car in downtown' },
    { type: 'escape', wanted: 2, text: 'Lose the 2-star tail — break line of sight' },
    { type: 'drive', x: 100, z: 80, text: 'Deliver the car to the garage' },
  ]},
  { id: 3, name: 'PAYDAY', briefing: 'On-foot pickup in the Barrios. The rival crew is waiting — shoot your way out.', payout: 800, respect: 100, steps: [
    { type: 'goto', x: -180, z: 180, text: 'Reach the Barrios drop point' },
    { type: 'shoot', count: 4, x: -180, z: 180, text: 'Take out the rival crew (4)' },
    { type: 'drive', x: -100, z: 40, text: 'Escape to the weapon shop' },
  ]},
  { id: 4, name: 'THE LONG WAY HOME', briefing: 'Three stars and the whole city behind you. Deliver the goods across town.', payout: 1000, respect: 120, steps: [
    { type: 'drive', x: 180, z: 180, text: 'Drive to the Hills viewpoint with 3 stars on you' },
    { type: 'escape', wanted: 3, text: 'Lose the heat' },
    { type: 'drive', x: 20, z: 20, text: 'Deliver to Plaza Solano' },
  ]},
  { id: 5, name: 'STREET KING', briefing: 'Win the midnight street race and the garage is yours.', payout: 1500, respect: 150, steps: [
    { type: 'race', race: 'plaza', text: 'Win the Plaza street race' },
    { type: 'drive', x: 100, z: 80, text: 'Claim the garage' },
  ]},
  { id: 6, name: 'THE CREW', briefing: 'Recruit a wheelman and a hacker. First crew job: hit the marina warehouse.', payout: 1200, respect: 150, steps: [
    { type: 'goto', x: 180, z: -120, text: 'Meet the wheelman at the Marina safehouse' },
    { type: 'goto', x: -180, z: 200, text: 'Meet the hacker at the Barrios safehouse' },
    { type: 'drive', x: 0, z: -290, text: 'Crew job: hit the marina warehouse' },
  ]},
  { id: 7, name: 'BLACKOUT', briefing: 'Cut the power, rob the downtown shop, get out under 4 stars.', payout: 2000, respect: 200, steps: [
    { type: 'goto', x: 20, z: -60, text: 'Reach the downtown shop' },
    { type: 'shoot', count: 5, x: 20, z: -60, text: 'Hold off the guards (5)' },
    { type: 'escape', wanted: 4, text: 'Escape the 4-star heat' },
  ]},
  { id: 8, name: 'AIR ONE', briefing: 'CONDOR-1 is in the air. Outrun the helicopter and lose 4 stars.', payout: 1800, respect: 180, steps: [
    { type: 'drive', x: -180, z: 180, text: 'Run for the Barrios with the helicopter overhead' },
    { type: 'escape', wanted: 4, text: 'Lose the helicopter and the heat' },
  ]},
  { id: 9, name: 'CAB CALL', briefing: 'A quiet side job: drive the taxi fares around the city. No heat, good money.', payout: 900, respect: 90, steps: [
    { type: 'drive', x: 140, z: 140, text: 'Pick up the first fare in Old Town' },
    { type: 'drive', x: -100, z: -100, text: 'Drop the fare downtown' },
    { type: 'drive', x: 180, z: -120, text: 'Pick up the second fare at the Marina' },
    { type: 'drive', x: 20, z: 20, text: 'Drop the fare at Plaza Solano' },
  ]},
  { id: 10, name: 'COASTAL RUN', briefing: 'A second race, along the beachfront. Beat the clock and the pack.', payout: 2200, respect: 200, steps: [
    { type: 'race', race: 'coast', text: 'Win the Coastal Run race' },
    { type: 'drive', x: 0, z: -290, text: 'Celebrate at the marina' },
  ]},
  { id: 11, name: 'THE HEIST', briefing: 'The big one: crew abilities, a multi-stage hit on the downtown vault.', payout: 5000, respect: 350, steps: [
    { type: 'goto', x: 20, z: -60, text: 'Hacker cuts the alarms downtown' },
    { type: 'shoot', count: 6, x: 20, z: -60, text: 'Clear the vault guards (6)' },
    { type: 'drive', x: 100, z: 80, text: 'Getaway to the garage with the crew' },
  ]},
  { id: 12, name: 'KING OF THE PORT', briefing: 'Five stars. The whole of Port Solano is coming for you. Survive, and the port is yours.', payout: 10000, respect: 500, steps: [
    { type: 'drive', x: 20, z: 20, text: 'Make your stand at Plaza Solano' },
    { type: 'shoot', count: 8, x: 20, z: 20, text: 'Hold the plaza (8)' },
    { type: 'escape', wanted: 5, text: 'Lose the 5-star heat — become King of the Port' },
  ]},
];

export function createMissions() {
  const state = {
    index: 0, step: 0, active: false, kills: 0,
    completed: 0, marker: null,
  };
  function current() { return MISSIONS[state.index] ?? null; }
  function currentStep() {
    const m = current();
    return m ? m.steps[state.step] : null;
  }
  function start(G, index) {
    state.index = index;
    state.step = 0;
    state.kills = 0;
    state.active = true;
    const m = current();
    G.hud.toast(`MISSION ${m.id}: ${m.name}`);
    G.hud.setObjective(m.name, m.briefing, '');
    G.audio.missionStart();
    if (m.id === 2) G.police.setWanted(2);
    if (m.id === 4) G.police.setWanted(3);
    if (m.id === 7) G.police.setWanted(4);
    if (m.id === 8) G.police.setWanted(4);
    if (m.id === 12) G.police.setWanted(5);
    G.save.save();
  }
  function complete(G) {
    const m = current();
    G.progress.cash += m.payout;
    G.progress.respect += m.respect;
    state.completed += 1;
    state.active = false;
    G.combat.clearEnemies();
    G.hud.toast(`MISSION COMPLETE — $${m.payout} · +${m.respect} respect`);
    G.audio.missionComplete();
    G.save.save();
    if (state.index + 1 < MISSIONS.length) {
      state.index += 1;
      setTimeout(() => { if (G.screen === 'play') start(G, state.index); }, 2500);
    } else {
      G.hud.toast('KING OF THE PORT — you own Port Solano!');
      G.gameOver('KING');
    }
  }
  function advanceStep(G) {
    state.step += 1;
    const m = current();
    if (state.step >= m.steps.length) { complete(G); return; }
    const s = currentStep();
    G.hud.setObjective(m.name, s.text, '');
    if (s.type === 'shoot') {
      for (let i = 0; i < s.count; i += 1) {
        G.combat.spawnEnemy(s.x + (Math.random() - 0.5) * 30, s.z + (Math.random() - 0.5) * 30, 'rival');
      }
      state.kills = 0;
    }
    if (s.type === 'race') G.races.start(G, s.race);
    G.audio.pickup();
  }
  function update(G, dt) {
    if (!state.active) return;
    const m = current();
    const s = currentStep();
    if (!s) return;
    const pos = G.inCar && G.car ? G.car.pos : G.player.state.pos;
    if (s.type === 'drive' || s.type === 'goto') {
      const d = Math.hypot(pos.x - s.x, pos.z - s.z);
      G.hud.setObjective(m.name, s.text, `${Math.round(d)}m`);
      G.marker.set(s.x, s.z);
      if (d < 10) advanceStep(G);
    } else if (s.type === 'escape') {
      G.hud.setObjective(m.name, s.text, `Wanted: ${'★'.repeat(G.police.state.wanted)}`);
      G.marker.set(pos.x, pos.z);
      if (G.police.state.wanted <= 0) advanceStep(G);
    } else if (s.type === 'shoot') {
      const left = G.combat.state.enemies.length;
      G.hud.setObjective(m.name, s.text, `Enemies left: ${left}`);
      G.marker.set(s.x, s.z);
      if (left === 0) advanceStep(G);
    } else if (s.type === 'race') {
      if (G.races.state.done) {
        if (G.races.state.won) advanceStep(G);
        else { G.hud.toast('Race lost — try again!'); G.races.start(G, s.race); }
      }
    }
    void dt;
  }
  return { state, current, currentStep, start, complete, advanceStep, update };
}
