// Synthesized audio only — no audio files. Engine hum, two-tone siren,
// helicopter rotor, per-weapon gunshots, pickup chime, and three radio
// stations as sequenced synth loops (WebAudio oscillators, no samples).
import { RADIO_STATIONS } from './config.js';

export function createAudio() {
  let ctx = null, master = null, muted = false;
  let engineOsc = null, engineGain = null;
  let sirenOsc = null, sirenGain = null, sirenOn = false;
  let heliGain = null, heliOn = false;
  let station = 0, radioTimer = null, radioStep = 0;
  let radioNodes = [];

  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return true; }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      // Engine: sawtooth whose pitch follows speed.
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 50;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      const engineFilter = ctx.createBiquadFilter();
      engineFilter.type = 'lowpass'; engineFilter.frequency.value = 600;
      engineOsc.connect(engineFilter); engineFilter.connect(engineGain); engineGain.connect(master);
      engineOsc.start();
      // Siren: two-tone triangle.
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'triangle';
      sirenOsc.frequency.value = 700;
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain); sirenGain.connect(master);
      sirenOsc.start();
      // Helicopter rotor: chopped noise via a square LFO on a noise buffer.
      const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      noise.buffer = buf; noise.loop = true;
      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'lowpass'; noiseFilter.frequency.value = 300;
      heliGain = ctx.createGain(); heliGain.gain.value = 0;
      noise.connect(noiseFilter); noiseFilter.connect(heliGain); heliGain.connect(master);
      noise.start();
      startRadio();
      return true;
    } catch {
      return false;
    }
  }
  function setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : 0.5; }
  function isMuted() { return muted; }

  function engine(ratio, nitro) {
    if (!ctx || muted) return;
    engineGain.gain.value = 0.05 + ratio * 0.06 + (nitro ? 0.04 : 0);
    engineOsc.frequency.value = 45 + ratio * 130 + (nitro ? 40 : 0);
  }
  function engineIdle() { if (ctx) engineGain.gain.value = 0.02; }
  let sirenPhase = 0;
  function siren(active, dist) {
    if (!ctx) return;
    if (!active) { sirenGain.gain.value = 0; sirenOn = false; return; }
    sirenOn = true;
    sirenPhase += 0.06;
    sirenOsc.frequency.value = 660 + Math.sin(sirenPhase) * 180;
    sirenGain.gain.value = Math.max(0, 0.05 - Math.min(0.04, (dist || 50) * 0.0004));
  }
  function heli(active) {
    heliOn = active;
    if (ctx) heliGain.gain.value = active ? 0.06 : 0;
  }
  function rotor() { if (ctx && heliOn) heliGain.gain.value = 0.05 + Math.random() * 0.02; }

  function blip(freq, dur, type, vol, when = 0) {
    if (!ctx || muted) return;
    const t = ctx.currentTime + when;
    const o = ctx.createOscillator();
    o.type = type; o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function gunshot(id) {
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    const dur = id === 'shotgun' ? 0.25 : id === 'rifle' ? 0.16 : 0.09;
    const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i += 1) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = id === 'shotgun' ? 900 : 2400;
    const g = ctx.createGain(); g.gain.value = 0.5;
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t);
    blip(id === 'rifle' ? 160 : 90, 0.08, 'square', 0.2);
  }
  function dryFire() { blip(1200, 0.05, 'square', 0.12); }
  function pickup() { blip(880, 0.1, 'sine', 0.25); blip(1320, 0.14, 'sine', 0.25, 0.08); }
  function crash() { blip(70, 0.3, 'sawtooth', 0.4); }
  function carDoor() { blip(220, 0.08, 'square', 0.2); }
  function missionStart() { blip(523, 0.12, 'sine', 0.3); blip(659, 0.12, 'sine', 0.3, 0.1); blip(784, 0.2, 'sine', 0.3, 0.2); }
  function missionComplete() { [523, 659, 784, 1046].forEach((f, i) => blip(f, 0.18, 'sine', 0.3, i * 0.11)); }

  // Radio: a step sequencer — bass note + lead note per step from the scale.
  function startRadio() {
    if (radioTimer) return;
    radioTimer = setInterval(() => {
      if (!ctx || muted) return;
      const st = RADIO_STATIONS[station];
      const stepDur = 60 / st.bpm / 2;
      void stepDur;
      const root = 55;
      const scale = st.scale;
      const idx = scale[radioStep % scale.length];
      const bass = root * Math.pow(2, idx / 12);
      blip(bass, 0.22, 'triangle', 0.16);
      if (radioStep % 2 === 0) blip(bass * 4, 0.16, 'sine', 0.07);
      if (radioStep % 8 === 6) blip(bass * 6, 0.3, 'sine', 0.08);
      radioStep += 1;
    }, 240);
  }
  function setStation(i) { station = i; radioStep = 0; }

  return {
    ensure, setMuted, isMuted, engine, engineIdle, siren, heli, rotor,
    gunshot, dryFire, pickup, crash, carDoor, missionStart, missionComplete, setStation,
  };
}
