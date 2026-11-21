// Effects: particle tracers, muzzle flash, sparks, smoke, blood and the
// objective marker beacon. All effects are pooled meshes, no allocations
// per frame beyond the pool.
import * as THREE from 'three';

export function createFx(scene) {
  const pool = [];
  function spawn(kind, x, y, z, color, life, size) {
    let p = pool.find((q) => !q.active);
    if (!p) {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(1, 6, 5),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true }),
      );
      scene.add(mesh);
      p = { mesh, active: false, life: 0, maxLife: 1, vy: 0 };
      pool.push(p);
    }
    p.active = true;
    p.life = life; p.maxLife = life;
    p.mesh.visible = true;
    p.mesh.position.set(x, y, z);
    p.mesh.material.color.setHex(color);
    p.mesh.scale.setScalar(size);
    p.vy = kind === 'smoke' ? 1.2 : 0;
    return p;
  }
  function line(from, to, color) {
    const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
    const l = new THREE.Line(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 }));
    scene.add(l);
    setTimeout(() => { scene.remove(l); geo.dispose(); }, 70);
  }
  function tracer(from, to, color) { line(from, to, color); }
  function muzzle(pos, heading) {
    const p = spawn('flash', pos.x + Math.sin(heading) * 1.2, 1.3, pos.z + Math.cos(heading) * 1.2, 0xffe9a8, 0.08, 0.5);
    p.mesh.scale.set(0.5, 0.5, 0.5);
  }
  function sparks(x, y, z) {
    for (let i = 0; i < 5; i += 1) {
      spawn('spark', x + (Math.random() - 0.5), y + Math.random() * 0.5, z + (Math.random() - 0.5), 0xffd23e, 0.3, 0.12);
    }
  }
  function smoke(x, y, z) { spawn('smoke', x, y, z, 0x555555, 1.1, 0.7); }
  function blood(x, y, z) {
    for (let i = 0; i < 4; i += 1) spawn('blood', x, y, z, 0xaa1111, 0.4, 0.15);
  }
  function explosion(x, y, z, scale = 1) {
    spawn('fire', x, y, z, 0xff7a1a, 0.5, 2.2 * scale);
    spawn('fire', x, y + 1, z, 0xffd23e, 0.4, 1.6 * scale);
    smoke(x, y + 2, z);
  }
  function update(dt) {
    for (const p of pool) {
      if (!p.active) continue;
      p.life -= dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.material.opacity = Math.max(0, p.life / p.maxLife);
      p.mesh.scale.multiplyScalar(1 + dt * 1.5);
      if (p.life <= 0) { p.active = false; p.mesh.visible = false; }
    }
  }
  // Objective marker: a pulsing golden ring + beam on the ground.
  const marker = { x: 0, z: 0, active: false, mesh: null, beam: null };
  function createMarker() {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(4, 0.35, 8, 28),
      new THREE.MeshBasicMaterial({ color: 0xffd23e }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.4;
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.8, 0.8, 30, 10, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffd23e, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false }),
    );
    beam.position.y = 15;
    ring.add(beam);
    scene.add(ring);
    marker.mesh = ring;
    marker.beam = beam;
    return marker;
  }
  function setMarker(x, z) {
    if (!marker.mesh) createMarker();
    marker.x = x; marker.z = z; marker.active = true;
    marker.mesh.position.x = x; marker.mesh.position.z = z;
    marker.mesh.visible = true;
  }
  function hideMarker() { marker.active = false; if (marker.mesh) marker.mesh.visible = false; }
  function updateMarker(t) {
    if (marker.mesh && marker.active) {
      marker.mesh.rotation.z = t * 0.8;
      marker.mesh.position.y = 0.4 + Math.sin(t * 2) * 0.25;
    }
  }
  return { tracer, muzzle, sparks, smoke, blood, explosion, update, setMarker, hideMarker, updateMarker, marker };
}
