// Save / load: cash, respect, mission progress, garage, best stats —
// localStorage, with a Continue button on the title screen.
import { SAVE_KEY } from './config.js';

export function createSave() {
  function save(G) {
    try {
      const data = {
        cash: G.progress.cash,
        respect: G.progress.respect,
        mission: G.missions.state.index,
        missionsDone: G.missions.state.completed,
        garage: G.garage.serialize(),
        crew: G.crew.state.recruited,
        radio: G.radio.state.station,
        savedAt: new Date().toISOString(),
      };
      window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch { /* storage can be off: the session still plays */ }
  }
  function load() {
    try {
      const raw = window.localStorage.getItem(SAVE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
  function apply(G, data) {
    if (!data) return;
    G.progress.cash = data.cash ?? 500;
    G.progress.respect = data.respect ?? 0;
    G.missions.state.index = data.mission ?? 0;
    G.missions.state.completed = data.missionsDone ?? 0;
    G.garage.restore(data.garage);
    if (data.crew) G.crew.recruit(G);
    if (typeof data.radio === 'number') G.radio.set(data.radio, G);
  }
  function describe(data) {
    if (!data) return '';
    return `Saved game: $${data.cash} · ${data.respect} respect · mission ${((data.mission ?? 0) + 1)} of 12`;
  }
  return { save, load, apply, describe };
}
