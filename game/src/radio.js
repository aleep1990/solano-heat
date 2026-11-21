// Radio: three switchable stations of synthesized music (see audio.js for the
// sequenced loops). R cycles; the station name shows on the HUD.
import { RADIO_STATIONS } from './config.js';

export function createRadio() {
  const state = { station: 0 };
  function current() { return RADIO_STATIONS[state.station]; }
  function next(G) {
    state.station = (state.station + 1) % RADIO_STATIONS.length;
    G.hud.setRadio(current().name);
    G.audio.setStation(state.station);
    G.hud.toast(`RADIO — ${current().name}`);
  }
  function set(index, G) {
    state.station = ((index % RADIO_STATIONS.length) + RADIO_STATIONS.length) % RADIO_STATIONS.length;
    if (G) { G.hud.setRadio(current().name); G.audio.setStation(state.station); }
  }
  return { state, current, next, set };
}
