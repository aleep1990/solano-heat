// SOLANO HEAT — boot, game loop and state machine (menu / play / pause /
// busted / wasted / king). Assembles every system into one shared game
// object G and steps it at a fixed 1/60 s. ?shot=start|drive|chase|mission
// stages a deterministic screenshot scene instead of the menu.
import * as THREE from 'three';
import { WORLD } from './config.js';
import { createRandom } from './random.js';
import { createInput } from './input.js';
import { createCity } from './world.js';
import { createDayNight } from './daynight.js';
import { createPlayer } from './player.js';
import { createVehicleSystem, nearestStealableCar, enterCar, exitCar, driveCar, damageCar } from './vehicles.js';
import { createTraffic, updateTraffic, scarePedestrians } from './traffic.js';
import { createPolice, updatePolice } from './police.js';
import { createHelicopter, updateHelicopter } from './helicopter.js';
import { createCombat } from './combat.js';
import { WEAPON_ORDER } from './weapons.js';
import { createMissions } from './missions.js';
import { createRaces } from './races.js';
import { createCrew } from './crew.js';
import { createGarage } from './garage.js';
import { createShops } from './shops.js';
import { createRespect } from './respect.js';
import { createRadio } from './radio.js';
import { createAudio } from './audio.js';
import { createHud } from './hud.js';
import { createSave } from './save.js';
import { createFx } from './render.js';
import { createWrecks } from './wrecks.js';
import { stageShot } from './shots.js';

const STEP = 1 / 60;
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : WORLD.seedDefault;
const rng = createRandom(seed);

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(0, 20, 140);

const input = createInput(canvas);
const city = createCity(scene, rng);
const daynight = createDayNight(scene);
const fx = createFx(scene);
const player = createPlayer(scene);
const vehicles = createVehicleSystem(scene, rng);
vehicles.damageCar = (G, car, amt) => damageCar(G, car, amt);
const traffic = createTraffic(scene, rng, city);
const police = createPolice(scene, rng);
const heli = createHelicopter(scene);
const combat = createCombat(scene, rng);
const missions = createMissions();
const races = createRaces(scene);
const crew = createCrew(scene);
const garage = createGarage();
const shops = createShops();
const respect = createRespect();
const radio = createRadio();
const audio = createAudio();
const hud = createHud();
const save = createSave();
const wrecks = createWrecks(scene);

const G = {
  scene, camera, renderer, input, city, daynight, fx, player, vehicles,
  traffic, police, heli, combat, missions, races, crew, garage, shops,
  respect, radio, audio, hud, save, wrecks, rng,
  progress: { cash: 500, respect: 0 },
  inCar: false, car: null, screen: 'menu',
  marker: {
    set: (x, z) => fx.setMarker(x, z),
    get active() { return fx.marker.active; },
    get x() { return fx.marker.x; },
    get z() { return fx.marker.z; },
  },
  trafficScare: () => scarePedestrians(G),
  gameOver: (reason) => endGame(reason),
};
G.vehicles.damageCar = (GG, car, amt) => damageCar(GG, car, amt);
window.__G = G; // debug/QC handle: lets a test page read live state.

const menuEl = document.getElementById('menu');
const statusEl = document.getElementById('status');
function announce(msg) { statusEl.textContent = msg; }

function showMenu(title, sub) {
  menuEl.style.display = 'flex';
  menuEl.querySelector('h1').textContent = title;
  menuEl.querySelector('h2').textContent = sub || 'PORT SOLANO';
  G.screen = 'menu';
}

function startGame(fresh) {
  if (fresh) {
    G.progress.cash = 500;
    G.progress.respect = 0;
    missions.state.index = 0;
    missions.state.completed = 0;
    missions.state.active = false;
    garage.restore([]);
    police.setWanted(0);
    player.state.health = 100;
    player.state.pos.set(0, 0, 20);
  } else {
    const data = save.load();
    if (data) save.apply(G, data);
  }
  menuEl.style.display = 'none';
  G.screen = 'play';
  audio.ensure();
  if (!missions.state.active && missions.state.completed === 0 && missions.state.index === 0) {
    missions.start(G, 0);
  } else if (!missions.state.active) {
    missions.start(G, missions.state.index);
  }
  announce('Playing SOLANO HEAT.');
}

function endGame(reason) {
  if (G.screen !== 'play') return;
  save.save();
  if (reason === 'KING') {
    showMenu('KING OF THE PORT', 'YOU OWN PORT SOLANO');
  } else {
    showMenu(reason, 'Dante Reyes — press PLAY to try again');
  }
  G.screen = 'menu';
  announce(reason === 'KING' ? 'You won. King of the Port.' : `${reason}. Game over.`);
}

document.getElementById('btn-play').addEventListener('click', () => startGame(true));
document.getElementById('btn-continue').addEventListener('click', () => startGame(false));
const saved = save.load();
if (saved) document.getElementById('menu-save').textContent = save.describe(saved);

// Shop / garage panel (G near a marker).
const shopEl = document.getElementById('shop');
let shopKind = null;
function openShop(kind) {
  shopKind = kind;
  document.getElementById('shop-title').textContent = kind === 'garage' ? 'SOLANO GARAGE — upgrades' : 'WEAPON SHOP — guns & ammo';
  const items = kind === 'garage' ? garage.list() : shops.list();
  const box = document.getElementById('shop-items');
  box.innerHTML = '';
  for (const item of items) {
    const row = document.createElement('div');
    row.className = 'item';
    const label = document.createElement('span');
    label.textContent = `${item.name} — $${item.price}${item.owned ? ' (OWNED)' : ''}`;
    const btn = document.createElement('button');
    btn.textContent = item.owned ? 'OWNED' : 'BUY';
    btn.disabled = !!item.owned;
    btn.addEventListener('click', () => {
      const ok = kind === 'garage' ? garage.buy(G, item.id) : shops.buyWeapon(G, item.id);
      if (ok) openShop(kind);
    });
    row.appendChild(label); row.appendChild(btn);
    box.appendChild(row);
  }
  shopEl.style.display = 'flex';
  G.screen = 'shop';
}
function closeShop() {
  shopEl.style.display = 'none';
  if (G.screen === 'shop') G.screen = 'play';
}
document.getElementById('shop-close').addEventListener('click', closeShop);

function nearestMarker(pos, maxDist) {
  let best = null, bestD = maxDist;
  for (const [key, m] of Object.entries(city.markers)) {
    const d = Math.hypot(pos.x - m.x, pos.z - m.z);
    if (d < bestD) { bestD = d; best = key; }
  }
  return best;
}

function handleKeys() {
  if (input.pollPressed('KeyP') || input.pollPressed('Escape')) {
    if (G.screen === 'play') { showMenu('PAUSED', 'PORT SOLANO — press P to resume'); G.screen = 'paused'; }
    else if (G.screen === 'paused') { menuEl.style.display = 'none'; G.screen = 'play'; }
  }
  if (G.screen !== 'play') return;
  if (input.pollPressed('KeyM')) audio.setMuted(!audio.isMuted());
  if (input.pollPressed('KeyR')) radio.next(G);
  if (input.pollPressed('KeyH')) crew.hackerJam(G);
  if (input.pollPressed('KeyQ')) {
    combat.state.wheelOpen = !combat.state.wheelOpen;
    if (combat.state.wheelOpen) hud.showWheel(combat.state.weapon); else hud.hideWheel();
  }
  for (let i = 0; i < 4; i += 1) {
    if (input.pollPressed('Digit' + (i + 1))) combat.selectWeapon(WEAPON_ORDER[i]);
  }
  if (input.pollPressed('KeyE')) {
    if (G.inCar) exitCar(G);
    else {
      const car = nearestStealableCar(G, 5);
      if (car) enterCar(G, car);
    }
  }
  if (input.pollPressed('KeyG')) {
    if (shopEl.style.display === 'flex') closeShop();
    else {
      const pos = G.inCar && G.car ? G.car.pos : player.state.pos;
      const near = nearestMarker(pos, 14);
      if (near === 'garage') openShop('garage');
      else if (near === 'weaponShop') openShop('weapons');
      else hud.toast('No shop nearby — look for the garage or weapon shop markers.');
    }
  }
  if (input.firing) combat.shoot(G);
}

function step(dt) {
  handleKeys();
  if (G.screen !== 'play') return;
  if (G.inCar && G.car) driveCar(G, dt);
  else player.update(G, dt);
  player.updateCamera(G);
  updateTraffic(G, dt);
  updatePolice(G, dt);
  updateHelicopter(G, dt);
  combat.update(G, dt);
  missions.update(G, dt);
  races.update(G, dt);
  crew.update(G, dt);
  shops.update(G, dt);
  wrecks.update(G, dt);
  fx.update(dt);
  fx.updateMarker(performance.now() / 1000);
  daynight.update(dt);
  if (!G.inCar) audio.engineIdle();
  hud.update(G);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

if (shot) {
  // Deterministic screenshot staging: compose the scene, render, flag ready.
  stageShot(G, shot);
  if (G.shotCam) {
    camera.position.copy(G.shotCam);
    camera.lookAt(G.shotLook);
  } else if (shot !== 'start') {
    for (let i = 0; i < 24; i += 1) player.updateCamera(G);
  }
  hud.update(G);
  renderer.render(scene, camera);
  window.__shotReady = true;
  // Keep rendering so the frame stays live under virtual-time screenshots.
  (function loop() {
    requestAnimationFrame(loop);
    if (shot === 'chase') {
      heli.state.rotor.rotation.y += 0.2;
    }
    renderer.render(scene, camera);
  })();
} else {
  let last = performance.now();
  let acc = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    acc += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    while (acc >= STEP) { step(STEP); acc -= STEP; }
    if (G.screen === 'menu') {
      // Slow cinematic orbit behind the title screen.
      const t = now / 1000;
      camera.position.set(Math.sin(t * 0.05) * 160, 46, Math.cos(t * 0.05) * 160);
      camera.lookAt(0, 10, -60);
    }
    renderer.render(scene, camera);
  }
  announce('SOLANO HEAT. Press PLAY.');
  requestAnimationFrame(frame);
}
