// HUD: DOM overlay (stars, cash, rank, health, ammo, speed, objective, radio)
// plus a 2D canvas minimap with roads, the player arrow, mission marker,
// police dots, the helicopter icon and a north indicator.
import { WORLD } from './config.js';

export function createHud() {
  const el = (id) => document.getElementById(id);
  const starsEl = el('stars'), cashEl = el('cash'), rankEl = el('rank'),
    hpEl = el('hpfill'), ammoEl = el('ammo'), weaponEl = el('weapon'),
    speedEl = el('speed'), mnameEl = el('mname'), mtextEl = el('mtext'),
    mdistEl = el('mdist'), radioEl = el('radio'), toastEl = el('toast'),
    wheelEl = el('wheel'), flashEl = el('wanted-flash');
  const map = el('minimap');
  const mctx = map.getContext('2d');
  let toastTimer = 0;

  function toast(msg, ms = 2600) {
    toastEl.textContent = msg;
    toastEl.style.display = 'block';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastEl.style.display = 'none'; }, ms);
  }
  function setObjective(name, text, dist) {
    mnameEl.textContent = name;
    mtextEl.textContent = text;
    mdistEl.textContent = dist || '';
  }
  function setRadio(name) { radioEl.textContent = '📻 ' + name; }
  function showWheel(weapon) {
    wheelEl.style.display = 'block';
    for (const slot of wheelEl.querySelectorAll('.slot')) {
      slot.classList.toggle('sel', slot.dataset.w === weapon);
    }
  }
  function hideWheel() { wheelEl.style.display = 'none'; }

  function drawMinimap(G) {
    const S = 210, C = S / 2;
    const scale = S / (WORLD.half * 2 + 60);
    mctx.clearRect(0, 0, S, S);
    mctx.save();
    mctx.beginPath(); mctx.arc(C, C, C - 2, 0, Math.PI * 2); mctx.clip();
    // Water + sand + land.
    mctx.fillStyle = '#0e3a52'; mctx.fillRect(0, 0, S, S);
    mctx.fillStyle = '#d9b380'; mctx.fillRect(0, 0, S, 18);
    mctx.fillStyle = '#233018'; mctx.fillRect(0, 18, S, S - 18);
    const toMap = (x, z) => [C + x * scale, C + z * scale];
    // Roads.
    mctx.strokeStyle = '#5a5a68'; mctx.lineWidth = 4;
    for (let v = -WORLD.half; v <= WORLD.half; v += WORLD.block) {
      const [x1, y1] = toMap(-WORLD.half, v);
      const [x2, y2] = toMap(WORLD.half, v);
      mctx.beginPath(); mctx.moveTo(x1, y1); mctx.lineTo(x2, y2); mctx.stroke();
      const [x3, y3] = toMap(v, -WORLD.half);
      const [x4, y4] = toMap(v, WORLD.half);
      mctx.beginPath(); mctx.moveTo(x3, y3); mctx.lineTo(x4, y4); mctx.stroke();
    }
    // Beach + marina.
    mctx.fillStyle = '#1e6f8e';
    mctx.fillRect(0, 0, S, 12);
    // Safehouses + garage + shop (green / orange squares).
    const mark = (x, z, color) => {
      const [mx, my] = toMap(x, z);
      mctx.fillStyle = color;
      mctx.fillRect(mx - 3, my - 3, 6, 6);
    };
    mark(G.city.markers.garage.x, G.city.markers.garage.z, '#ff7a1a');
    mark(G.city.markers.weaponShop.x, G.city.markers.weaponShop.z, '#ff5a5a');
    mark(G.city.markers.safehouse1.x, G.city.markers.safehouse1.z, '#7dff9a');
    mark(G.city.markers.safehouse2.x, G.city.markers.safehouse2.z, '#7dff9a');
    // Mission marker (yellow diamond).
    if (G.marker.active) {
      const [mx, my] = toMap(G.marker.x, G.marker.z);
      mctx.fillStyle = '#ffd23e';
      mctx.beginPath();
      mctx.moveTo(mx, my - 7); mctx.lineTo(mx + 6, my); mctx.lineTo(mx, my + 7); mctx.lineTo(mx - 6, my);
      mctx.closePath(); mctx.fill();
    }
    // Police dots (blue) + roadblocks (red squares).
    mctx.fillStyle = '#4b7ae8';
    for (const u of G.police.state.units) {
      const [mx, my] = toMap(u.pos.x, u.pos.z);
      mctx.beginPath(); mctx.arc(mx, my, 3, 0, Math.PI * 2); mctx.fill();
    }
    mctx.fillStyle = '#ff2d2d';
    for (const rb of G.police.state.roadblocks) {
      const [mx, my] = toMap(rb.x, rb.z);
      mctx.fillRect(mx - 3, my - 3, 6, 6);
    }
    // Helicopter icon (white H).
    if (G.heli.state.active) {
      const [mx, my] = toMap(G.heli.state.pos.x, G.heli.state.pos.z);
      mctx.fillStyle = '#ffffff';
      mctx.font = 'bold 12px sans-serif';
      mctx.textAlign = 'center';
      mctx.fillText('H', mx, my + 4);
    }
    // Player arrow (white triangle, rotated to heading).
    const pp = G.inCar && G.car ? G.car.pos : G.player.state.pos;
    const heading = G.inCar && G.car ? G.car.heading : G.player.state.heading;
    const [px, py] = toMap(pp.x, pp.z);
    mctx.save();
    mctx.translate(px, py);
    mctx.rotate(Math.PI - heading);
    mctx.fillStyle = '#ffffff';
    mctx.beginPath();
    mctx.moveTo(0, -7); mctx.lineTo(5, 6); mctx.lineTo(-5, 6);
    mctx.closePath(); mctx.fill();
    mctx.restore();
    mctx.restore();
    // North indicator.
    mctx.fillStyle = '#ffffff';
    mctx.font = 'bold 11px sans-serif';
    mctx.textAlign = 'center';
    mctx.fillText('N', C, 12);
  }

  function update(G) {
    const w = G.police.state.wanted;
    starsEl.textContent = '★'.repeat(w) + '☆'.repeat(5 - w);
    starsEl.style.color = w >= 4 ? '#ff2d2d' : '#ffd23e';
    flashEl.style.opacity = w >= 3 ? (Math.floor(performance.now() / 400) % 2 ? 0.9 : 0.15) : 0;
    cashEl.textContent = '$' + G.progress.cash.toLocaleString('en-US');
    rankEl.textContent = `${G.respect.rankName(G.progress.respect)} · ${G.progress.respect} RESPECT`;
    hpEl.style.width = Math.max(0, G.player.state.health) + '%';
    const weapon = G.combat.state.weapon;
    weaponEl.textContent = weapon.toUpperCase();
    const ammo = G.combat.state.ammo[weapon];
    ammoEl.textContent = ammo === Infinity ? '∞' : String(ammo);
    const speed = G.inCar && G.car ? Math.abs(G.car.speed) * 2.2 : G.player.state.speed * 2.2;
    speedEl.innerHTML = `${Math.round(speed)}<small>MPH${G.inCar ? ' · IN CAR' : ''}</small>`;
    if (G.combat.state.wheelOpen) showWheel(weapon); else hideWheel();
    drawMinimap(G);
  }

  return { toast, setObjective, setRadio, showWheel, hideWheel, update, drawMinimap };
}
