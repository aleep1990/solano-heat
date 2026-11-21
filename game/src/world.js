// Port Solano — procedural coastal city: grid streets, districts, beach and marina.
// All geometry is generated in code from a seed; no external assets.
import * as THREE from 'three';
import { WORLD, DISTRICTS, PALETTE } from './config.js';

function districtAt(x, z) {
  for (const d of DISTRICTS) if (x >= d.x0 && x < d.x1 && z >= d.z0 && z < d.z1) return d;
  return DISTRICTS[4];
}

// Canvas texture: lit windows for the dusk skyline.
function makeWindowTexture(rng) {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#3a3340'; g.fillRect(0, 0, 128, 256);
  for (let y = 8; y < 248; y += 16) {
    for (let x = 8; x < 120; x += 16) {
      const lit = rng.next() < 0.45;
      g.fillStyle = lit ? (rng.next() < 0.7 ? '#ffd27a' : '#9ad5ff') : '#221d28';
      g.fillRect(x, y, 9, 11);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function makePalm(rng) {
  const g = new THREE.Group();
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x6b4a2f });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.3, 5, 6), trunkMat);
  trunk.position.y = 2.5; trunk.rotation.z = rng.range(-0.08, 0.08);
  g.add(trunk);
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x2f7a3a, side: THREE.DoubleSide });
  for (let i = 0; i < 7; i += 1) {
    const leaf = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 3.2), leafMat);
    const a = (i / 7) * Math.PI * 2;
    leaf.position.set(Math.cos(a) * 1.1, 5.1, Math.sin(a) * 1.1);
    leaf.rotation.set(Math.sin(a) * 1.1, a, -Math.cos(a) * 1.1);
    g.add(leaf);
  }
  return g;
}

export function createCity(scene, rng) {
  const colliders = [];
  const roadNodes = [];
  const group = new THREE.Group();
  group.name = 'PortSolanoCity';
  scene.add(group);

  // Ground: grass/asphalt base, sand strip, water plane.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD.half * 2 + 40, WORLD.half * 2 + 40),
    new THREE.MeshLambertMaterial({ color: 0x4a5a3a }),
  );
  ground.rotation.x = -Math.PI / 2; ground.position.set(0, -0.05, 0);
  group.add(ground);
  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD.half * 2 + 40, 46),
    new THREE.MeshLambertMaterial({ color: PALETTE.sand }),
  );
  sand.rotation.x = -Math.PI / 2; sand.position.set(0, 0, WORLD.beachZ - 18);
  group.add(sand);
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD.half * 2 + 260, 220),
    new THREE.MeshLambertMaterial({ color: PALETTE.water, transparent: true, opacity: 0.92 }),
  );
  water.rotation.x = -Math.PI / 2; water.position.set(0, 0.15, WORLD.waterZ + 60);
  water.name = 'SolanoBay';
  group.add(water);

  // Road strips + sidewalks + centre dashes.
  const roadMat = new THREE.MeshLambertMaterial({ color: PALETTE.asphalt });
  const walkMat = new THREE.MeshLambertMaterial({ color: PALETTE.sidewalk });
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xd8d8c8 });
  const pitch = WORLD.block;
  const lines = [];
  for (let v = -WORLD.half; v <= WORLD.half; v += pitch) lines.push(v);
  for (const v of lines) {
    for (const [w, len, horizontal] of [[WORLD.roadWidth, WORLD.half * 2, true]]) {
      const road = new THREE.Mesh(new THREE.PlaneGeometry(len, w), roadMat);
      road.rotation.x = -Math.PI / 2;
      road.position.set(0, 0.02, v);
      group.add(road);
      const road2 = new THREE.Mesh(new THREE.PlaneGeometry(w, len), roadMat);
      road2.rotation.x = -Math.PI / 2;
      road2.position.set(v, 0.02, 0);
      group.add(road2);
    }
    // Sidewalk strips along each road.
    for (const off of [-8.5, 8.5]) {
      const s1 = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.half * 2, 5), walkMat);
      s1.rotation.x = -Math.PI / 2; s1.position.set(0, 0.03, v + off); group.add(s1);
      const s2 = new THREE.Mesh(new THREE.PlaneGeometry(5, WORLD.half * 2), walkMat);
      s2.rotation.x = -Math.PI / 2; s2.position.set(v + off, 0.03, 0); group.add(s2);
    }
    // Centre dashes (every second road only, to keep the draw count sane).
    if ((Math.round(v / WORLD.block) % 2) === 0) {
      for (let d = -WORLD.half + 10; d < WORLD.half; d += 16) {
        const dash = new THREE.Mesh(new THREE.PlaneGeometry(4, 0.5), dashMat);
        dash.rotation.x = -Math.PI / 2; dash.position.set(d, 0.04, v); group.add(dash);
        const dash2 = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 4), dashMat);
        dash2.rotation.x = -Math.PI / 2; dash2.position.set(v, 0.04, d); group.add(dash2);
      }
    }
  }
  // Intersection nodes for the traffic graph.
  for (const x of lines) for (const z of lines) roadNodes.push({ x, z });

  // Buildings inside each block.
  const winTex = makeWindowTexture(rng);
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const roofGeo = new THREE.BoxGeometry(1, 0.5, 1);
  const matCache = new Map();
  function buildingMat(color, tall) {
    const key = color + (tall ? 't' : 's');
    if (!matCache.has(key)) {
      matCache.set(key, new THREE.MeshLambertMaterial({
        color, map: tall ? winTex : null, emissive: tall ? 0x332211 : 0x000000, emissiveIntensity: 0.6,
      }));
    }
    return matCache.get(key);
  }
  let buildingCount = 0;
  for (let bx = -WORLD.half + pitch / 2; bx < WORLD.half; bx += pitch) {
    for (let bz = -WORLD.half + pitch / 2; bz < WORLD.half; bz += pitch) {
      if (bz < -180) continue; // marina / beachfront stays open
      const d = districtAt(bx, bz);
      const n = rng.noise2(bx * 0.05, bz * 0.05);
      const tall = d.tall && n > -0.2;
      const h = tall ? rng.range(18, 68) : rng.range(6, 16);
      const w = rng.range(16, 26), dep = rng.range(16, 26);
      const col = new THREE.Color(d.color).offsetHSL(rng.range(-0.02, 0.02), rng.range(-0.1, 0.1), rng.range(-0.12, 0.12));
      const b = new THREE.Mesh(boxGeo, buildingMat(col.getHex(), tall));
      b.scale.set(w, h, dep);
      b.position.set(bx + rng.range(-3, 3), h / 2, bz + rng.range(-3, 3));
      group.add(b);
      const roof = new THREE.Mesh(roofGeo, new THREE.MeshLambertMaterial({ color: 0x2a2430 }));
      roof.scale.set(w * 0.7, 1, dep * 0.7);
      roof.position.set(b.position.x, h + 0.25, b.position.z);
      group.add(roof);
      colliders.push({ minX: b.position.x - w / 2, maxX: b.position.x + w / 2, minZ: b.position.z - dep / 2, maxZ: b.position.z + dep / 2 });
      buildingCount += 1;
      // Rooftop props on some towers.
      if (tall && rng.next() < 0.4) {
        const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 2.4, 8), new THREE.MeshLambertMaterial({ color: 0x777777 }));
        tank.position.set(b.position.x + 4, h + 1.4, b.position.z - 3);
        group.add(tank);
      }
    }
  }

  // Palms along the beachfront and marina promenade.
  for (let x = -280; x <= 280; x += 14) {
    if (rng.next() < 0.25) continue;
    const palm = makePalm(rng);
    palm.position.set(x + rng.range(-3, 3), 0, -272 + rng.range(-6, 6));
    group.add(palm);
  }
  for (let i = 0; i < 40; i += 1) {
    const palm = makePalm(rng);
    palm.position.set(rng.range(-280, 280), 0, rng.range(-280, 280));
    // Keep palms off roads: snap to block centres.
    palm.position.x = Math.round(palm.position.x / 40) * 40 + 14;
    palm.position.z = Math.round(palm.position.z / 40) * 40 + 14;
    group.add(palm);
  }

  // Marina: pier + moored boats.
  const pier = new THREE.Mesh(new THREE.BoxGeometry(60, 1, 8), new THREE.MeshLambertMaterial({ color: 0x7a5a38 }));
  pier.position.set(0, 0.5, -312); group.add(pier);
  for (let i = -2; i <= 2; i += 1) {
    const hull = new THREE.Mesh(new THREE.BoxGeometry(4, 1.6, 10), new THREE.MeshLambertMaterial({ color: [0xffffff, 0xffd23e, 0x3d7aff, 0xff5a5a, 0x7dff9a][i + 2] }));
    hull.position.set(i * 12, 0.6, -330);
    group.add(hull);
  }

  // Named places the missions, shops and safehouses use.
  const markers = {
    marina: { x: 0, z: -290, name: 'MARINA' },
    garage: { x: 100, z: 80, name: 'SOLANO GARAGE' },
    weaponShop: { x: -100, z: 40, name: 'WEAPON SHOP' },
    safehouse1: { x: -180, z: 200, name: 'SAFEHOUSE — BARRIOS' },
    safehouse2: { x: 180, z: -120, name: 'SAFEHOUSE — MARINA' },
    raceStart: { x: 20, z: 20, name: 'RACE START — PLAZA' },
    plaza: { x: 20, z: 20, name: 'PLAZA SOLANO' },
    downtown: { x: 20, z: -60, name: 'DOWNTOWN' },
    hills: { x: 180, z: 180, name: 'HILLS VIEWPOINT' },
  };
  // Marker beacons: glowing pillars so places read on the minimap and in 3D.
  const beaconMat = new THREE.MeshBasicMaterial({ color: 0xffd23e, transparent: true, opacity: 0.75 });
  for (const key of Object.keys(markers)) {
    const m = markers[key];
    const beacon = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 26, 10, 1, true), beaconMat.clone());
    beacon.material.opacity = 0.35;
    beacon.position.set(m.x, 13, m.z);
    beacon.name = `beacon-${key}`;
    group.add(beacon);
  }

  return { colliders, roadNodes, markers, buildingCount, group };
}

// Circle (radius r) vs building AABBs: push the point out, return true on hit.
export function collideCircle(colliders, x, z, r) {
  let hit = false;
  for (const c of colliders) {
    const cx = Math.max(c.minX, Math.min(x, c.maxX));
    const cz = Math.max(c.minZ, Math.min(z, c.maxZ));
    const dx = x - cx, dz = z - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 < r * r) {
      hit = true;
      if (d2 > 0.0001) {
        const d = Math.sqrt(d2);
        const push = (r - d) / d;
        x += dx * push; z += dz * push;
      } else {
        z += r;
      }
    }
  }
  return { x, z, hit };
}

export function clampToCity(x, z, margin = 4) {
  const h = WORLD.half - margin;
  return { x: Math.max(-h, Math.min(h, x)), z: Math.max(-h, Math.min(h, z)) };
}
