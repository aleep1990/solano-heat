// Golden-hour / dusk lighting: low warm sun, purple-orange sky dome, warm fog.
// The top entries are all dusk — Port Solano lives at golden hour.
import * as THREE from 'three';
import { PALETTE } from './config.js';

export function createDayNight(scene) {
  const sun = new THREE.DirectionalLight(PALETTE.sun, 2.6);
  sun.position.set(-180, 55, -120);
  sun.castShadow = false;
  scene.add(sun);
  const hemi = new THREE.HemisphereLight(0x8a6bbf, 0x3a2a1a, 0.9);
  scene.add(hemi);
  const ambient = new THREE.AmbientLight(0xff9a5a, 0.35);
  scene.add(ambient);

  // Sky dome: vertical gradient shader, purple top → orange horizon.
  const skyGeo = new THREE.SphereGeometry(900, 24, 16);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      top: { value: new THREE.Color(PALETTE.skyTop) },
      mid: { value: new THREE.Color(PALETTE.skyMid) },
      low: { value: new THREE.Color(PALETTE.skyLow) },
    },
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `varying vec3 vP; uniform vec3 top; uniform vec3 mid; uniform vec3 low;
      void main(){ float h = normalize(vP).y; vec3 c = h > 0.25 ? mix(mid, top, smoothstep(0.25, 0.8, h)) : mix(low, mid, smoothstep(-0.05, 0.25, h)); gl_FragColor = vec4(c, 1.0); }`,
  });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  scene.add(sky);

  // Low sun disc + glow sprite near the horizon over the bay.
  const sunMesh = new THREE.Mesh(
    new THREE.CircleGeometry(26, 32),
    new THREE.MeshBasicMaterial({ color: 0xffe9a8, fog: false }),
  );
  sunMesh.position.set(-320, 42, -620);
  sunMesh.lookAt(0, 42, 0);
  scene.add(sunMesh);

  scene.fog = new THREE.Fog(PALETTE.fog, 180, 780);

  let timeOfDay = 0.78; // 0 = dawn, 0.78 = golden hour, 1 = night
  function setTimeOfDay(t) {
    timeOfDay = Math.max(0, Math.min(1, t));
    const warmth = 1 - Math.abs(timeOfDay - 0.78) * 1.4;
    sun.intensity = 1.2 + Math.max(0, warmth) * 1.6;
    const el = (1 - timeOfDay) * Math.PI * 0.5 + 0.08;
    sun.position.set(-Math.cos(el) * 260, Math.sin(el) * 160 + 12, -140);
    hemi.intensity = 0.5 + Math.max(0, warmth) * 0.5;
    scene.fog.color.setHex(PALETTE.fog).lerp(new THREE.Color(0x1a1030), Math.max(0, timeOfDay - 0.85) * 4);
  }
  function update(dt, clock) {
    // Slow drift: a full day cycle takes ~10 minutes of play.
    timeOfDay = (timeOfDay + dt / 600) % 1;
    setTimeOfDay(timeOfDay);
    void clock;
  }
  setTimeOfDay(timeOfDay);
  return { sun, hemi, sky, sunMesh, setTimeOfDay, update, get timeOfDay() { return timeOfDay; } };
}
