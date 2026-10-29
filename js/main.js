import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { HOTSPOTS, TOUR } from './data.js';

// ---------------------------------------------------------------------------
// Renderer, scene, camera
// ---------------------------------------------------------------------------
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.85;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xc9d6c6, 110, 380);

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 2000);
const OVERVIEW = { cam: [-62, 42, 72], target: [6, 0, 0] };
camera.position.fromArray(OVERVIEW.cam);

const controls = new OrbitControls(camera, canvas);
controls.target.fromArray(OVERVIEW.target);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.maxPolarAngle = Math.PI / 2 - 0.06;
controls.minDistance = 4;
controls.maxDistance = 170;

// ---------------------------------------------------------------------------
// Sky, sun, environment lighting
// ---------------------------------------------------------------------------
const sun = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(52), THREE.MathUtils.degToRad(215));
const sky = new Sky();
sky.scale.setScalar(4000);
const su = sky.material.uniforms;
su.turbidity.value = 7;
su.rayleigh.value = 1.4;
su.mieCoefficient.value = 0.004;
su.mieDirectionalG.value = 0.82;
su.sunPosition.value.copy(sun);

const pmrem = new THREE.PMREMGenerator(renderer);
const envScene = new THREE.Scene();
envScene.add(sky);
scene.environment = pmrem.fromScene(envScene).texture;
scene.add(sky);

scene.add(new THREE.HemisphereLight(0xe4f0ff, 0x6a5534, 0.35));
const sunLight = new THREE.DirectionalLight(0xffefd2, 2.8);
sunLight.position.copy(sun).multiplyScalar(150);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
Object.assign(sunLight.shadow.camera, { left: -85, right: 85, top: 85, bottom: -85, near: 1, far: 420 });
sunLight.shadow.bias = -0.0003;
sunLight.shadow.normalBias = 0.05;
sunLight.target.position.set(5, 0, 0);
scene.add(sunLight, sunLight.target);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
let seed = 11;
const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const rr = (a, b) => a + (b - a) * rand();
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

const maxAniso = renderer.capabilities.getMaxAnisotropy();
function canvasTex(size, draw, { srgb = true } = {}) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = maxAniso;
  return t;
}
function speckle(g, s, base, cols, n, rmin, rmax, alpha = [0.15, 0.6]) {
  g.fillStyle = base;
  g.fillRect(0, 0, s, s);
  for (let i = 0; i < n; i++) {
    g.fillStyle = cols[i % cols.length];
    g.globalAlpha = rr(alpha[0], alpha[1]);
    g.beginPath();
    g.arc(rand() * s, rand() * s, rr(rmin, rmax), 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;
}

const TEX = {
  grass: canvasTex(512, (g, s) => speckle(g, s, '#5f7a35', ['#4b6a2a', '#71903d', '#82924a', '#3e5823', '#8d7b4c', '#6a8a33'], 14000, 0.6, 2.6)),
  laterite: canvasTex(512, (g, s) => speckle(g, s, '#b4643b', ['#9a5131', '#c77b4b', '#8a4a2d', '#d6936a', '#a85a36'], 9000, 0.6, 3)),
  soil: canvasTex(512, (g, s) => speckle(g, s, '#5a3e2a', ['#4a3222', '#6b4a32', '#3d2a1d', '#7a5a3a'], 9000, 0.6, 3)),
  plaster: canvasTex(256, (g, s) => speckle(g, s, '#efe2c2', ['#e6d6b0', '#f5ead0', '#dccb9f'], 2500, 1, 5, [0.1, 0.35])),
  concrete: canvasTex(256, (g, s) => speckle(g, s, '#bdb6a6', ['#a9a294', '#cfc8b8', '#9a9384'], 3000, 0.6, 3, [0.15, 0.4])),
  roof: canvasTex(256, (g, s) => {
    for (let x = 0; x < s; x++) {
      const k = 0.5 + 0.5 * Math.sin((x / s) * Math.PI * 2 * 16);
      const v = 120 + k * 70;
      g.fillStyle = `rgb(${v * 0.95 + 25},${v * 0.55},${v * 0.42})`;
      g.fillRect(x, 0, 1, s);
    }
    g.globalAlpha = 0.25;
    for (let i = 0; i < 400; i++) {
      g.fillStyle = pick(['#5a2a18', '#c9a080', '#3a1d10']);
      g.fillRect(rand() * s, rand() * s, rr(2, 14), rr(2, 30));
    }
    g.globalAlpha = 1;
  }),
  wood: canvasTex(256, (g, s) => {
    g.fillStyle = '#7a5434';
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < 140; i++) {
      g.strokeStyle = pick(['#5d3e24', '#8d6542', '#6b4a2c']);
      g.globalAlpha = rr(0.2, 0.6);
      g.lineWidth = rr(0.5, 2);
      const y = rand() * s;
      g.beginPath();
      g.moveTo(0, y);
      g.bezierCurveTo(s * 0.3, y + rr(-6, 6), s * 0.6, y + rr(-6, 6), s, y);
      g.stroke();
    }
    g.globalAlpha = 1;
  }),
  shutter: canvasTex(128, (g, s) => {
    g.fillStyle = '#2d5b86';
    g.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y += 10) {
      g.fillStyle = '#1d3f60';
      g.fillRect(0, y, s, 3);
    }
    g.fillStyle = '#e9e0c8';
    g.fillRect(0, 0, s, 6); g.fillRect(0, s - 6, s, 6); g.fillRect(0, 0, 6, s); g.fillRect(s - 6, 0, 6, s); g.fillRect(s / 2 - 3, 0, 6, s);
  }),
  frond: canvasTex(256, (g, s) => {
    g.clearRect(0, 0, s, s);
    g.strokeStyle = '#4f6e2a';
    g.lineWidth = 4;
    g.beginPath(); g.moveTo(s / 2, s); g.lineTo(s / 2, 0); g.stroke();
    for (let y = 8; y < s; y += 7) {
      const len = (s / 2) * Math.sin((y / s) * Math.PI) * 0.95;
      g.strokeStyle = pick(['#3f6a24', '#4e7b2c', '#5d8a33', '#3a5e20']);
      g.lineWidth = 3.5;
      g.beginPath(); g.moveTo(s / 2, y); g.lineTo(s / 2 - len, y - 18); g.stroke();
      g.beginPath(); g.moveTo(s / 2, y); g.lineTo(s / 2 + len, y - 18); g.stroke();
    }
  }),
  bananaLeaf: canvasTex(128, (g, s) => {
    g.clearRect(0, 0, s, s);
    g.fillStyle = '#5c8f2e';
    g.beginPath(); g.ellipse(s / 2, s / 2, s * 0.32, s * 0.49, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#7fae45'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(s / 2, 2); g.lineTo(s / 2, s - 2); g.stroke();
    g.strokeStyle = 'rgba(40,70,20,0.5)'; g.lineWidth = 1;
    for (let y = 8; y < s; y += 5) { g.beginPath(); g.moveTo(s / 2, y); g.lineTo(s * 0.2, y + 6); g.moveTo(s / 2, y); g.lineTo(s * 0.8, y + 6); g.stroke(); }
    g.clearRect(s * 0.18, s * 0.3, s * 0.12, 2); g.clearRect(s * 0.7, s * 0.55, s * 0.14, 2);
  }),
};

const M = {
  grass: new THREE.MeshStandardMaterial({ map: TEX.grass, roughness: 1 }),
  laterite: new THREE.MeshStandardMaterial({ map: TEX.laterite, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
  soil: new THREE.MeshStandardMaterial({ map: TEX.soil, roughness: 1, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }),
  plaster: new THREE.MeshStandardMaterial({ map: TEX.plaster, roughness: 0.9 }),
  band: new THREE.MeshStandardMaterial({ color: 0x2f6f63, roughness: 0.8 }),
  concrete: new THREE.MeshStandardMaterial({ map: TEX.concrete, roughness: 0.95 }),
  roof: new THREE.MeshStandardMaterial({ map: TEX.roof, roughness: 0.55, metalness: 0.35, side: THREE.DoubleSide }),
  wood: new THREE.MeshStandardMaterial({ map: TEX.wood, roughness: 0.85 }),
  darkWood: new THREE.MeshStandardMaterial({ color: 0x4a3222, roughness: 0.85 }),
  shutter: new THREE.MeshStandardMaterial({ map: TEX.shutter, roughness: 0.7 }),
  trunk: new THREE.MeshStandardMaterial({ color: 0x5b4330, roughness: 1 }),
  palmTrunk: new THREE.MeshStandardMaterial({ color: 0x6d5a45, roughness: 1 }),
  leafA: new THREE.MeshStandardMaterial({ color: 0x2f5a22, roughness: 0.85 }),
  leafB: new THREE.MeshStandardMaterial({ color: 0x3b6b27, roughness: 0.85 }),
  leafC: new THREE.MeshStandardMaterial({ color: 0x4f7d2e, roughness: 0.85 }),
  leafD: new THREE.MeshStandardMaterial({ color: 0x5f8a34, roughness: 0.85 }),
  frond: new THREE.MeshStandardMaterial({ map: TEX.frond, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.85 }),
  bananaLeaf: new THREE.MeshStandardMaterial({ map: TEX.bananaLeaf, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.8 }),
  mango: new THREE.MeshStandardMaterial({ color: 0xf0a531, roughness: 0.5 }),
  orange: new THREE.MeshStandardMaterial({ color: 0xf28a1c, roughness: 0.55 }),
  greenFruit: new THREE.MeshStandardMaterial({ color: 0x8fae3c, roughness: 0.6 }),
  mulch: new THREE.MeshStandardMaterial({ color: 0x4a3420, roughness: 1 }),
  pipeBlack: new THREE.MeshStandardMaterial({ color: 0x1b1b1b, roughness: 0.5 }),
  pipeBlue: new THREE.MeshStandardMaterial({ color: 0x2a6fb5, roughness: 0.45 }),
  tank: new THREE.MeshStandardMaterial({ color: 0x1f2a22, roughness: 0.45 }),
  steel: new THREE.MeshStandardMaterial({ color: 0x8a8f94, roughness: 0.45, metalness: 0.7 }),
  solar: new THREE.MeshStandardMaterial({ color: 0x14233d, roughness: 0.2, metalness: 0.6 }),
  glass: new THREE.MeshStandardMaterial({ color: 0xbcd6e6, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.35 }),
  shadeNet: new THREE.MeshStandardMaterial({ color: 0x2e5a2a, transparent: true, opacity: 0.6, side: THREE.DoubleSide, roughness: 1 }),
  crate: new THREE.MeshStandardMaterial({ color: 0xc8892f, roughness: 0.7 }),
  crateGreen: new THREE.MeshStandardMaterial({ color: 0x3f8a46, roughness: 0.7 }),
  basket: new THREE.MeshStandardMaterial({ color: 0xb08a4f, roughness: 0.95 }),
  compost: new THREE.MeshStandardMaterial({ color: 0x3b2a1a, roughness: 1 }),
  tire: new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 }),
  truckCab: new THREE.MeshStandardMaterial({ color: 0xe9e4d6, roughness: 0.4, metalness: 0.2 }),
  truckBlue: new THREE.MeshStandardMaterial({ color: 0x2c5f8f, roughness: 0.45, metalness: 0.2 }),
  windshield: new THREE.MeshStandardMaterial({ color: 0x1d2a33, roughness: 0.1, metalness: 0.5 }),
  white: new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.8 }),
  pot: new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 }),
  bowl: new THREE.MeshStandardMaterial({ color: 0xd9572b, roughness: 0.6 }),
  chalk: null,
  sign: null,
};

// Terrain height: flat around the site, rolling hills beyond.
function height(x, z) {
  const d = Math.hypot(x - 5, z);
  const t = THREE.MathUtils.smoothstep(d, 80, 150);
  const hills = Math.sin(x * 0.028) * 7 + Math.cos(z * 0.024) * 6 + Math.sin((x + z) * 0.06) * 2.5 + Math.cos(x * 0.11 - z * 0.07) * 1.2 + 7;
  return t * hills;
}

// Instanced batching keeps draw calls low for trees, fruit, crates, etc.
const batches = new Map();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
function inst(geo, mat, p, r = [0, 0, 0], s = [1, 1, 1], shadow = true) {
  const key = geo.uuid + mat.uuid + shadow;
  if (!batches.has(key)) batches.set(key, { geo, mat, shadow, list: [] });
  _e.set(r[0], r[1], r[2], 'YXZ');
  _q.setFromEuler(_e);
  const sc = typeof s === 'number' ? new THREE.Vector3(s, s, s) : new THREE.Vector3(...s);
  batches.get(key).list.push(new THREE.Matrix4().compose(new THREE.Vector3(...p), _q.clone(), sc));
}
function flushBatches() {
  for (const { geo, mat, shadow, list } of batches.values()) {
    const m = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach((mx, i) => m.setMatrixAt(i, mx));
    m.castShadow = shadow;
    m.receiveShadow = true;
    scene.add(m);
  }
  batches.clear();
}

function mesh(geo, mat, p = [0, 0, 0], parent = scene, { cast = true, receive = true, r } = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.position.fromArray(p);
  if (r) m.rotation.set(r[0], r[1], r[2]);
  m.castShadow = cast;
  m.receiveShadow = receive;
  parent.add(m);
  return m;
}
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);

function scaleUV(geo, su, sv) {
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
}
function drape(geo, lift = 0.04) {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, height(p.getX(i), p.getZ(i)) + lift);
  geo.computeVertexNormals();
}
function patch(w, d, x, z, mat, { scale = 6, rot = 0, lift = 0.03 } = {}) {
  const g = new THREE.PlaneGeometry(w, d, Math.max(1, Math.ceil(w / 3)), Math.max(1, Math.ceil(d / 3)));
  scaleUV(g, w / scale, d / scale);
  g.rotateX(-Math.PI / 2);
  g.rotateY(rot);
  g.translate(x, 0, z);
  drape(g, lift);
  const m = new THREE.Mesh(g, mat);
  m.receiveShadow = true;
  scene.add(m);
  return m;
}

// Organic foliage blob (smooth, slightly lumpy sphere).
function blobGeo(variant) {
  let g = new THREE.IcosahedronGeometry(1, 3);
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  g = mergeVertices(g);
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = 1 + 0.16 * Math.sin(v.x * 5 + variant * 1.7) * Math.cos(v.y * 4.3 + variant) * Math.sin(v.z * 5.7 + variant * 2.3)
      + 0.07 * Math.sin(v.x * 13 + v.z * 11 + variant) + 0.05 * Math.cos(v.y * 17 - v.x * 7);
    v.multiplyScalar(n);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

const G = {
  blobs: [0, 1, 2, 3].map(blobGeo),
  trunk: (() => { const g = new THREE.CylinderGeometry(0.65, 1, 1, 9); g.translate(0, 0.5, 0); return g; })(),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 12),
  cylLow: new THREE.CylinderGeometry(1, 1, 1, 8),
  sphere: new THREE.SphereGeometry(1, 10, 8),
  box: new THREE.BoxGeometry(1, 1, 1),
  frond: (() => { const g = new THREE.PlaneGeometry(1.4, 5, 1, 6); g.translate(0, 2.5, 0); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setZ(i, -0.06 * y * y); } g.computeVertexNormals(); return g; })(),
  bLeaf: (() => { const g = new THREE.PlaneGeometry(0.9, 2.6, 1, 5); g.translate(0, 1.3, 0); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setZ(i, -0.12 * y * y); } g.computeVertexNormals(); return g; })(),
  grass: (() => { const g = new THREE.ConeGeometry(0.07, 0.55, 3); g.translate(0, 0.27, 0); return g; })(),
};
const leafMats = [M.leafA, M.leafB, M.leafC, M.leafD];

// ---------------------------------------------------------------------------
// Ground, paths, road
// ---------------------------------------------------------------------------
{
  const g = new THREE.PlaneGeometry(700, 700, 200, 200);
  scaleUV(g, 90, 90);
  g.rotateX(-Math.PI / 2);
  drape(g, 0);
  const ground = new THREE.Mesh(g, M.grass);
  ground.receiveShadow = true;
  scene.add(ground);

  patch(600, 7, 0, 31, M.laterite, { scale: 5 });                // road
  patch(36, 10, -3, 3.5, M.laterite, { scale: 5 });              // courtyard
  patch(4, 22, 6, 18, M.laterite, { scale: 4 });                 // path road -> school
  patch(4, 12, 30, 23, M.laterite, { scale: 4 });                // path orchard -> road
  patch(12, 3.5, 13, 8, M.laterite, { scale: 4 });               // school -> orchard
  patch(3, 14, -20, 13, M.laterite, { scale: 4 });               // to dining
  patch(16, 3, -27, 20, M.laterite, { scale: 4 });               // to nursery
  patch(3.5, 22, -16, -11, M.laterite, { scale: 4 });            // to preservation
  patch(30, 46, 30, -5, M.soil, { scale: 5, lift: 0.025 });      // orchard ground
}

// ---------------------------------------------------------------------------
// Buildings
// ---------------------------------------------------------------------------
function hipRoofGeo(w, d, h) {
  const hw = w / 2, hd = d / 2, inset = Math.min(hd, hw * 0.9);
  const A = [-hw, 0, -hd], B = [hw, 0, -hd], C = [hw, 0, hd], D = [-hw, 0, hd];
  const R1 = [-hw + inset, h, 0], R2 = [hw - inset, h, 0];
  const tris = [D, C, R2, D, R2, R1, B, A, R1, B, R1, R2, A, D, R1, C, B, R2];
  const pos = new Float32Array(tris.flat());
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const uv = [];
  for (let i = 0; i < tris.length; i++) uv.push(tris[i][0] / 3, (tris[i][2] + tris[i][1]) / 3);
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}

// A single-storey block, front (veranda) facing local +z.
function schoolBlock(w, d, { x, z, rotY = 0, doors = [], h = 3.4 }) {
  const grp = new THREE.Group();
  const plinthH = 0.5, ver = 2.8;
  mesh(box(w + 1, plinthH, d + ver + 0.6), M.concrete, [0, plinthH / 2, ver / 2], grp);
  mesh(box(3, 0.25, 0.5), M.concrete, [0, 0.125, d / 2 + ver + 0.55], grp);
  mesh(box(w, h, d), M.plaster, [0, plinthH + h / 2, 0], grp);
  mesh(box(w + 0.06, 1.0, d + 0.06), M.band, [0, plinthH + 0.5, 0], grp);
  mesh(box(w + 0.08, 0.18, d + 0.08), M.white, [0, plinthH + h - 0.09, 0], grp);

  const step = 3.2;
  const n = Math.floor((w - 2) / step);
  for (let i = 0; i <= n; i++) {
    const px = -((n * step) / 2) + i * step;
    for (const side of [1, -1]) {
      const isDoor = side === 1 && doors.includes(i);
      if (isDoor) {
        mesh(box(1.2, 2.3, 0.1), M.wood, [px, plinthH + 1.15, side * (d / 2 + 0.03)], grp);
      } else {
        mesh(box(1.6, 1.3, 0.1), M.shutter, [px, plinthH + 2.0, side * (d / 2 + 0.03)], grp);
        mesh(box(1.8, 0.1, 0.22), M.white, [px, plinthH + 1.3, side * (d / 2 + 0.08)], grp);
      }
    }
  }
  // Side windows
  for (const sx of [1, -1]) {
    mesh(box(0.1, 1.3, 1.6), M.shutter, [sx * (w / 2 + 0.03), plinthH + 2.0, 0], grp);
  }
  // Veranda columns and beam (round concrete columns, like the site photos)
  const cz = d / 2 + ver - 0.3;
  const cols = Math.round(w / 2.6);
  for (let i = 0; i <= cols; i++) {
    const px = -w / 2 + (i * w) / cols;
    mesh(new THREE.CylinderGeometry(0.2, 0.22, h, 14), M.white, [px, plinthH + h / 2, cz], grp);
    mesh(box(0.55, 0.22, 0.55), M.white, [px, plinthH + h - 0.11, cz], grp);
    mesh(box(0.5, 0.25, 0.5), M.concrete, [px, plinthH + 0.12, cz], grp);
  }
  mesh(box(w + 0.4, 0.35, 0.45), M.white, [0, plinthH + h + 0.17, cz], grp);
  // Low veranda wall segments
  for (let i = 0; i < cols; i++) {
    if (i === Math.floor(cols / 2)) continue;
    const px = -w / 2 + ((i + 0.5) * w) / cols;
    mesh(box(w / cols - 0.45, 0.7, 0.2), M.band, [px, plinthH + 0.35, cz], grp);
  }
  // Roof
  const rw = w + 2, rd = d + ver + 1.4;
  const roof = mesh(hipRoofGeo(rw, rd, 2.3), M.roof, [0, plinthH + h + 0.35, ver / 2 + 0.2], grp);
  roof.castShadow = true;
  const fascia = new THREE.Mesh(box(rw, 0.25, 0.08), M.white);
  for (const s of [1, -1]) {
    const f = fascia.clone(); f.position.set(0, plinthH + h + 0.3, ver / 2 + 0.2 + s * rd / 2); grp.add(f);
  }
  grp.position.set(x, 0, z);
  grp.rotation.y = rotY;
  scene.add(grp);
  return grp;
}

schoolBlock(26, 9, { x: 0, z: -9, doors: [2, 5] });
schoolBlock(13, 8, { x: -27, z: 2, rotY: Math.PI / 2, doors: [1] });

// Flag of Sierra Leone
{
  mesh(new THREE.CylinderGeometry(0.05, 0.07, 8, 8), M.steel, [-6, 4, 4]);
  const flag = new THREE.Group();
  [0x1eb53a, 0xffffff, 0x0072c6].forEach((c, i) =>
    mesh(box(2.1, 0.45, 0.02), new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, side: THREE.DoubleSide }), [1.05, -i * 0.45, 0], flag));
  flag.position.set(-6, 7.8, 4);
  scene.add(flag);
  mesh(box(1.2, 0.3, 1.2), M.concrete, [-6, 0.15, 4]);
}

// School sign
{
  const tex = canvasTex(512, (g, s) => {
    g.fillStyle = '#1f4a3a'; g.fillRect(0, 0, s, s);
    g.strokeStyle = '#e9c46a'; g.lineWidth = 10; g.strokeRect(14, 14, s - 28, s - 28);
    g.fillStyle = '#f6efe2'; g.textAlign = 'center';
    g.font = 'bold 54px Georgia'; g.fillText('ISRA IHSAN', s / 2, 170);
    g.fillText('SADREDDIN', s / 2, 240); g.fillText('ACADEMY', s / 2, 310);
    g.fillStyle = '#e9c46a'; g.font = 'italic 30px Georgia'; g.fillText('School & Waqf Orchard', s / 2, 390);
  });
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  const signMat = [M.wood, M.wood, M.wood, M.wood, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 }), M.wood];
  const grp = new THREE.Group();
  mesh(box(2.2, 1.4, 0.1), signMat, [0, 1.9, 0], grp);
  mesh(box(0.12, 2.6, 0.12), M.darkWood, [-1, 1.3, -0.05], grp);
  mesh(box(0.12, 2.6, 0.12), M.darkWood, [1, 1.3, -0.05], grp);
  grp.position.set(9.2, 0, 23.5);
  grp.rotation.y = -0.4;
  scene.add(grp);
}

// ---------------------------------------------------------------------------
// Vegetation
// ---------------------------------------------------------------------------
function fruitOn(cx, cy, cz, r, mat, n, size = 0.13) {
  for (let i = 0; i < n; i++) {
    const a = rand() * Math.PI * 2, el = rr(-0.9, 0.2);
    inst(G.sphere, mat, [cx + Math.cos(a) * Math.cos(el) * r * 0.95, cy + Math.sin(el) * r * 0.9, cz + Math.sin(a) * Math.cos(el) * r * 0.95], [0, 0, 0], [size, size * 1.25, size]);
  }
}
function mangoTree(x, z, s = 1, fruit = true, mat = M.mango) {
  const y0 = height(x, z);
  inst(G.trunk, M.trunk, [x, y0, z], [rr(-0.05, 0.05), rand() * 6, rr(-0.05, 0.05)], [0.24 * s, 2.0 * s, 0.24 * s]);
  const lm = pick(leafMats.slice(0, 3));
  const cy = y0 + 2.9 * s;
  inst(pick(G.blobs), lm, [x, cy, z], [0, rand() * 6, 0], [2.1 * s, 1.6 * s, 2.1 * s]);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + rr(0, 1);
    inst(pick(G.blobs), pick(leafMats), [x + Math.cos(a) * 1.3 * s, cy - 0.3 * s + rr(-0.2, 0.3), z + Math.sin(a) * 1.3 * s], [0, rand() * 6, 0], [1.4 * s, 1.15 * s, 1.4 * s]);
  }
  inst(pick(G.blobs), lm, [x, cy + 1.1 * s, z], [0, rand() * 6, 0], [1.3 * s, 1.0 * s, 1.3 * s]);
  if (fruit) fruitOn(x, cy - 0.2 * s, z, 2.05 * s, mat, 9);
}
function citrusTree(x, z, s = 1) {
  const y0 = height(x, z);
  inst(G.trunk, M.trunk, [x, y0, z], [0, rand() * 6, 0], [0.13 * s, 0.9 * s, 0.13 * s]);
  const cy = y0 + 1.9 * s;
  inst(pick(G.blobs), pick([M.leafA, M.leafB]), [x, cy, z], [0, rand() * 6, 0], [1.35 * s, 1.25 * s, 1.35 * s]);
  inst(pick(G.blobs), M.leafB, [x + 0.4 * s, cy + 0.6 * s, z - 0.2 * s], [0, rand() * 6, 0], [0.9 * s, 0.8 * s, 0.9 * s]);
  fruitOn(x, cy, z, 1.32 * s, M.orange, 12, 0.11);
}
function bananaPlant(x, z, s = 1) {
  const y0 = height(x, z);
  inst(G.cylLow, M.leafD, [x, y0 + 1.2 * s, z], [0, 0, 0], [0.13 * s, 2.4 * s, 0.13 * s]);
  const n = 7;
  for (let i = 0; i < n; i++) {
    inst(G.bLeaf, M.bananaLeaf, [x, y0 + 2.3 * s, z], [rr(0.6, 1.2), (i / n) * Math.PI * 2 + rr(0, 0.5), 0], [s, s, s]);
  }
  inst(G.sphere, M.greenFruit, [x + 0.25 * s, y0 + 1.9 * s, z], [0.3, 0, 0], [0.16 * s, 0.35 * s, 0.16 * s]);
}
function papaya(x, z, s = 1) {
  const y0 = height(x, z);
  inst(G.cylLow, M.palmTrunk, [x, y0 + 1.6 * s, z], [0, 0, 0], [0.09 * s, 3.2 * s, 0.09 * s]);
  for (let i = 0; i < 8; i++) inst(G.bLeaf, M.bananaLeaf, [x, y0 + 3.2 * s, z], [rr(0.8, 1.3), (i / 8) * Math.PI * 2, 0], [0.7 * s, 0.55 * s, 0.7 * s]);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    inst(G.sphere, pick([M.greenFruit, M.mango]), [x + Math.cos(a) * 0.17 * s, y0 + 2.85 * s, z + Math.sin(a) * 0.17 * s], [0, 0, 0], [0.11 * s, 0.17 * s, 0.11 * s]);
  }
}
function palm(x, z, s = 1) {
  const y0 = height(x, z);
  const hgt = rr(7, 10) * s, lean = rr(-0.12, 0.12), dir = rand() * 6;
  const tx = x + Math.sin(dir) * Math.sin(lean) * hgt, tz = z + Math.cos(dir) * Math.sin(lean) * hgt;
  inst(G.trunk, M.palmTrunk, [x, y0, z], [lean, dir, 0], [0.22 * s, hgt, 0.22 * s]);
  const n = 13;
  for (let i = 0; i < n; i++) inst(G.frond, M.frond, [tx, y0 + hgt, tz], [rr(0.9, 1.7), (i / n) * Math.PI * 2 + rr(0, 0.3), 0], [s, s, s]);
}
function bush(x, z, s = 1) {
  inst(pick(G.blobs), pick(leafMats), [x, height(x, z) + 0.5 * s, z], [0, rand() * 6, 0], [1.4 * s, 0.9 * s, 1.4 * s]);
}

// Orchard blocks
const ORCH = { x0: 18, x1: 42 };
const mulch = (x, z, r) => inst(G.cyl, M.mulch, [x, 0.05, z], [0, 0, 0], [r, 0.06, r], false);
const dripLine = (z) => inst(G.cylLow, M.pipeBlack, [(ORCH.x0 + ORCH.x1) / 2 - 1, 0.08, z + 0.4], [0, 0, Math.PI / 2], [0.035, ORCH.x1 - ORCH.x0 + 4, 0.035], false);
for (let z = -25; z <= -13; z += 6) {
  for (let x = ORCH.x0 + 1; x <= ORCH.x1; x += 6) {
    const cashew = (x + z) % 4 === 0;
    mangoTree(x + rr(-0.3, 0.3), z + rr(-0.3, 0.3), rr(0.85, 1.05), true, cashew ? M.orange : M.mango);
    mulch(x, z, 1.4);
  }
  dripLine(z);
}
for (let z = -8; z <= 2; z += 5) {
  for (let x = ORCH.x0; x <= ORCH.x1; x += 4) { citrusTree(x + rr(-0.2, 0.2), z + rr(-0.2, 0.2), rr(0.9, 1.1)); mulch(x, z, 1.0); }
  dripLine(z);
}
for (let z = 6; z <= 16; z += 3.5) {
  for (let x = ORCH.x0; x <= ORCH.x1; x += 3) {
    if (Math.abs(x - 30) < 2) continue;
    ((x / 3 + Math.round(z)) % 3 === 0 ? papaya : bananaPlant)(x + rr(-0.2, 0.2), z + rr(-0.2, 0.2), rr(0.85, 1.1));
    mulch(x, z, 0.8);
  }
  dripLine(z);
}
// Irrigation header pipe from the tank
inst(G.cylLow, M.pipeBlue, [15.5, 0.12, -6], [Math.PI / 2, 0, 0], [0.08, 40, 0.08], false);
inst(G.cylLow, M.pipeBlue, [13.8, 0.12, -24], [0, 0, Math.PI / 2], [0.08, 3.4, 0.08], false);

// Shade tree for the outdoor classroom, and trees around the school
mangoTree(5, 17.5, 1.6, true);
mangoTree(-12, -20, 1.4, false);
mangoTree(-36, 8, 1.3, false);
mangoTree(-8, 14, 1.1, true);
citrusTree(-14, 9, 1.0);
citrusTree(-30, 26, 1.0);

// Palms, bushes and distant forest
seed = 99;
for (let i = 0; i < 70; i++) {
  const a = rand() * Math.PI * 2, r = rr(52, 115);
  const x = 5 + Math.cos(a) * r, z = Math.sin(a) * r;
  if (Math.abs(z - 31) < 6 || (z > 30 && x < 0 && r < 80)) continue;
  palm(x, z, rr(0.8, 1.15));
}
for (let i = 0; i < 260; i++) {
  const a = rand() * Math.PI * 2, r = rr(55, 200);
  const x = 5 + Math.cos(a) * r, z = Math.sin(a) * r;
  if (Math.abs(z - 31) < 5) continue;
  if (r > 95 && rand() < 0.6) mangoTree(x, z, rr(1.2, 2.2), false);
  else bush(x, z, rr(0.7, 1.8));
}
for (let i = 0; i < 7; i++) palm(rr(-30, 60), rr(40, 50), rr(0.8, 1.1));
for (let i = 0; i < 26; i++) bush(rr(-48, 52), pick([rr(37, 50), rr(-45, -32)]), rr(0.6, 1.3));

// Grass tufts
{
  const N = 9000;
  const gm = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 });
  const im = new THREE.InstancedMesh(G.grass, gm, N);
  const mtx = new THREE.Matrix4(), col = new THREE.Color();
  const blocked = (x, z) =>
    (x > -15 && x < 15 && z > -15 && z < 8) || (x > -33 && x < -18 && z > -6 && z < 10) ||
    (x > 14 && x < 46 && z > -29 && z < 18) || Math.abs(z - 31) < 4 || (x > -21 && x < 15 && z > -2 && z < 9);
  let k = 0;
  while (k < N) {
    const x = rr(-60, 70), z = rr(-50, 55);
    if (blocked(x, z)) continue;
    const s = rr(0.35, 0.8);
    mtx.compose(new THREE.Vector3(x, height(x, z), z), _q.setFromEuler(_e.set(rr(-0.25, 0.25), rand() * 6, rr(-0.25, 0.25))), new THREE.Vector3(s, s * rr(0.7, 1.6), s));
    im.setMatrixAt(k, mtx);
    im.setColorAt(k, col.setHSL(rr(0.19, 0.26), rr(0.4, 0.6), rr(0.12, 0.22)));
    k++;
  }
  im.receiveShadow = true;
  scene.add(im);
}

// ---------------------------------------------------------------------------
// Systems: water tower, compost, preservation, nursery
// ---------------------------------------------------------------------------
{ // Elevated water tank + solar panel
  const tx = 12, tz = -24;
  for (const [dx, dz] of [[-1.2, -1.2], [1.2, -1.2], [1.2, 1.2], [-1.2, 1.2]]) mesh(box(0.15, 5, 0.15), M.steel, [tx + dx, 2.5, tz + dz]);
  mesh(box(2.9, 0.15, 2.9), M.steel, [tx, 5, tz]);
  mesh(new THREE.CylinderGeometry(1.3, 1.3, 2.6, 24), M.tank, [tx, 6.4, tz]);
  mesh(new THREE.CylinderGeometry(0.4, 1.3, 0.4, 24), M.tank, [tx, 7.9, tz]);
  mesh(box(0.15, 5, 0.15), M.pipeBlue, [tx + 1.5, 2.5, tz]);
  const panel = new THREE.Group();
  mesh(box(2.4, 0.06, 1.4), M.solar, [0, 0, 0], panel);
  panel.rotation.x = -0.35;
  panel.position.set(tx - 4, 2.1, tz);
  scene.add(panel);
  mesh(box(0.1, 2, 0.1), M.steel, [tx - 4, 1, tz]);
}
{ // Three-bay compost
  const cx = 46, cz = -14;
  for (let b = 0; b < 3; b++) {
    const bx = cx + (b - 1) * 2.1;
    for (let s = 0; s < 4; s++) {
      mesh(box(2, 0.14, 0.06), M.wood, [bx, 0.2 + s * 0.24, cz - 1], scene);
      mesh(box(0.06, 0.14, 2), M.wood, [bx - 1, 0.2 + s * 0.24, cz], scene);
    }
    const heap = mesh(G.blobs[b], M.compost, [bx, 0.15, cz + 0.1]);
    heap.scale.set(0.85, 0.55 - b * 0.1, 0.85);
  }
  for (let s = 0; s < 4; s++) mesh(box(0.06, 0.14, 2), M.wood, [cx + 3.15, 0.2 + s * 0.24, cz], scene);
}
{ // Solar dryer + cool store
  const dx = -26, dz = -18;
  const dryer = new THREE.Group();
  mesh(box(3.6, 0.9, 1.6), M.darkWood, [0, 0.75, 0], dryer);
  const top = mesh(box(3.6, 0.05, 1.8), M.glass, [0, 1.35, 0], dryer, { cast: false });
  top.rotation.x = 0.25;
  for (const lx of [-1.6, 1.6]) for (const lz of [-0.7, 0.7]) mesh(box(0.1, 0.4, 0.1), M.darkWood, [lx, 0.2, lz], dryer);
  for (let i = 0; i < 18; i++) mesh(box(0.25, 0.03, 0.12), M.mango, [-1.4 + (i % 9) * 0.35, 1.24, -0.35 + Math.floor(i / 9) * 0.6], dryer);
  dryer.position.set(dx, 0, dz);
  dryer.rotation.y = 0.2;
  scene.add(dryer);
  // Storage hut
  const hut = new THREE.Group();
  mesh(box(4, 2.6, 3.4), M.plaster, [0, 1.3, 0], hut);
  mesh(box(4.06, 0.7, 3.46), M.band, [0, 0.35, 0], hut);
  mesh(box(1, 2, 0.08), M.wood, [0, 1, 1.72], hut);
  mesh(hipRoofGeo(4.8, 4.2, 1.2), M.roof, [0, 2.6, 0], hut);
  hut.position.set(dx - 6, 0, dz + 1);
  scene.add(hut);
  for (let i = 0; i < 6; i++) inst(G.box, i % 2 ? M.crate : M.crateGreen, [dx - 3.6 + (i % 3) * 0.6, 0.18 + Math.floor(i / 3) * 0.36, dz + 3], [0, rr(-0.1, 0.1), 0], [0.55, 0.35, 0.4]);
  for (let i = 0; i < 3; i++) mesh(new THREE.SphereGeometry(0.35, 14, 10), new THREE.MeshStandardMaterial({ color: 0xa65a35, roughness: 0.9 }), [dx - 8.6, 0.3, dz - 0.5 + i * 0.8]);
}
{ // Seedling nursery
  const nx = -34, nz = 20, w = 7, d = 4.5, h = 2.3;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) mesh(box(0.1, h, 0.1), M.darkWood, [nx + sx * w / 2, h / 2, nz + sz * d / 2]);
  mesh(new THREE.PlaneGeometry(w, d), M.shadeNet, [nx, h, nz], scene, { r: [-Math.PI / 2, 0, 0], cast: true });
  for (let r = 0; r < 4; r++) {
    mesh(box(w - 1, 0.5, 0.7), M.wood, [nx, 0.25, nz - 1.5 + r], scene);
    for (let i = 0; i < 12; i++) {
      const px = nx - (w - 1.6) / 2 + i * ((w - 1.6) / 11), pz = nz - 1.5 + r;
      inst(G.cylLow, M.pot, [px, 0.62, pz], [0, 0, 0], [0.11, 0.22, 0.11]);
      inst(G.blobs[i % 4], pick([M.leafC, M.leafD]), [px, 0.85, pz], [0, rand() * 6, 0], [0.17, 0.2, 0.17]);
    }
  }
}

// ---------------------------------------------------------------------------
// People, classroom, dining, truck
// ---------------------------------------------------------------------------
const animated = [];
const SKIN = [0x4a2e1f, 0x3b2418, 0x5a3825, 0x432a1c];
const matCache = new Map();
const cmat = (c) => { if (!matCache.has(c)) matCache.set(c, new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 })); return matCache.get(c); };

function person({ x, z, rotY = 0, shirt = 0xf2efe6, pants = 0x1f3a66, scale = 1, sit = false, scarf = null, carry = false, point = false }) {
  const g = new THREE.Group();
  const skin = cmat(pick(SKIN));
  const hip = sit ? 0.48 : 0.86;
  if (sit) {
    for (const s of [-1, 1]) {
      mesh(new THREE.CylinderGeometry(0.075, 0.07, 0.45, 8), cmat(pants), [s * 0.1, hip, 0.22], g, { r: [Math.PI / 2, 0, 0] });
      mesh(new THREE.CylinderGeometry(0.065, 0.06, 0.45, 8), cmat(pants), [s * 0.1, hip / 2, 0.44], g);
    }
  } else {
    for (const s of [-1, 1]) mesh(new THREE.CylinderGeometry(0.075, 0.065, 0.86, 8), cmat(pants), [s * 0.1, 0.43, 0], g);
  }
  mesh(new THREE.CapsuleGeometry(0.18, 0.42, 4, 10), cmat(shirt), [0, hip + 0.33, 0], g);
  const armL = mesh(new THREE.CylinderGeometry(0.055, 0.05, 0.55, 8), cmat(shirt), [-0.25, hip + 0.33, 0], g);
  const armR = mesh(new THREE.CylinderGeometry(0.055, 0.05, 0.55, 8), cmat(shirt), [0.25, hip + 0.33, 0], g);
  if (sit) { armL.rotation.x = armR.rotation.x = -0.9; armL.position.z = armR.position.z = 0.15; }
  if (carry) { armL.rotation.z = 2.7; armR.rotation.z = -2.7; armL.position.y = armR.position.y = hip + 0.75; }
  if (point) { armR.rotation.z = -1.9; armR.position.set(0.42, hip + 0.55, 0); }
  mesh(new THREE.SphereGeometry(0.135, 14, 12), skin, [0, hip + 0.82, 0], g);
  if (scarf) mesh(new THREE.SphereGeometry(0.16, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.62), cmat(scarf), [0, hip + 0.84, -0.01], g);
  else mesh(new THREE.SphereGeometry(0.14, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.45), cmat(0x161009), [0, hip + 0.85, -0.01], g);
  if (carry) mesh(box(0.5, 0.28, 0.4), M.crate, [0, hip + 1.1, 0], g);
  g.position.set(x, height(x, z), z);
  g.rotation.y = rotY;
  g.scale.setScalar(scale);
  scene.add(g);
  return g;
}
const UNIFORM = [0x3a6fb0, 0xf2efe6];
const student = (o) => person({ shirt: pick(UNIFORM), pants: 0x1f3a66, scale: rr(0.72, 0.82), scarf: rand() < 0.5 ? pick([0xf2efe6, 0x1f3a66]) : null, ...o });

{ // Outdoor classroom
  const cx = 10, cz = 12;
  const chalkTex = canvasTex(512, (g, s) => {
    g.fillStyle = '#1e3b2c'; g.fillRect(0, 0, s, s / 2);
    g.strokeStyle = '#efe9da'; g.fillStyle = '#efe9da'; g.lineWidth = 4;
    g.font = '34px Georgia'; g.fillText('The Orchard Cycle', 24, 50);
    const steps = ['Seed', 'Grow', 'Harvest', 'Preserve', 'Sell'];
    steps.forEach((t, i) => { g.font = '24px Georgia'; g.fillText(t, 26 + i * 96, 140); if (i < 4) { g.beginPath(); g.moveTo(90 + i * 96, 132); g.lineTo(112 + i * 96, 132); g.stroke(); } });
    g.beginPath(); g.moveTo(420, 240); g.lineTo(420, 190); g.stroke();
    g.beginPath(); g.arc(420, 175, 30, 0, Math.PI * 2); g.stroke();
    g.font = '22px Georgia'; g.fillText('Compost = food for soil', 26, 220);
  });
  chalkTex.wrapS = chalkTex.wrapT = THREE.ClampToEdgeWrapping;
  chalkTex.repeat.set(1, 0.5); chalkTex.offset.set(0, 0.5);
  const board = new THREE.Group();
  const face = new THREE.MeshStandardMaterial({ map: chalkTex, roughness: 0.9 });
  mesh(box(2.6, 1.3, 0.06), [M.wood, M.wood, M.wood, M.wood, face, M.wood], [0, 1.6, 0], board);
  mesh(box(0.08, 2.4, 0.08), M.darkWood, [-1.2, 1.2, -0.06], board);
  mesh(box(0.08, 2.4, 0.08), M.darkWood, [1.2, 1.2, -0.06], board);
  board.position.set(cx, 0, cz - 2.2);
  scene.add(board);
  const teacher = person({ x: cx + 1.8, z: cz - 1.6, rotY: -0.5, shirt: 0xd9692b, pants: 0x2a2a2a, point: true, scarf: 0x2a3b5a });
  animated.push({ obj: teacher, type: 'sway' });
  for (let r = 0; r < 3; r++) {
    mesh(box(3.4, 0.08, 0.35), M.wood, [cx, 0.42, cz + r * 1.25], scene);
    for (const lx of [-1.5, 1.5]) mesh(box(0.08, 0.42, 0.3), M.darkWood, [cx + lx, 0.21, cz + r * 1.25]);
    for (let i = 0; i < 4; i++) {
      const s = student({ x: cx - 1.2 + i * 0.8, z: cz + r * 1.25, rotY: Math.PI, sit: true });
      s.position.y = 0;
      animated.push({ obj: s, type: 'bob', phase: rand() * 6 });
    }
  }
}

{ // Dining pavilion with tables
  const px = -20, pz = 18, w = 10, d = 7;
  for (const sx of [-1, 0, 1]) for (const sz of [-1, 1]) mesh(new THREE.CylinderGeometry(0.12, 0.12, 3, 8), M.darkWood, [px + sx * w / 2, 1.5, pz + sz * d / 2]);
  mesh(hipRoofGeo(w + 1.5, d + 1.5, 1.6), M.roof, [px, 3, pz]);
  mesh(box(w + 1, 0.12, d + 1), M.concrete, [px, 0.06, pz]);
  for (let t = 0; t < 2; t++) {
    const tz = pz - 1.6 + t * 3.2;
    mesh(box(6, 0.08, 1), M.wood, [px, 0.78, tz]);
    for (const lx of [-2.7, 2.7]) mesh(box(0.1, 0.74, 0.8), M.darkWood, [px + lx, 0.37, tz]);
    for (const bs of [-1, 1]) {
      mesh(box(6, 0.07, 0.3), M.wood, [px, 0.45, tz + bs * 0.85]);
      for (let i = 0; i < 5; i++) {
        const sx = px - 2.2 + i * 1.1;
        const s = student({ x: sx, z: tz + bs * 0.85, rotY: bs > 0 ? Math.PI : 0, sit: true });
        s.position.y = 0;
        animated.push({ obj: s, type: 'bob', phase: rand() * 6 });
        inst(G.cyl, M.bowl, [sx, 0.86, tz + bs * 0.25], [0, 0, 0], [0.14, 0.08, 0.14]);
        inst(G.sphere, pick([M.mango, M.orange]), [sx + 0.18, 0.9, tz + bs * 0.25], [0, 0, 0], 0.07);
      }
    }
    for (let i = 0; i < 4; i++) inst(G.sphere, pick([M.mango, M.orange, M.greenFruit]), [px - 1.5 + i, 0.92, tz], [0, 0, 0], [0.1, 0.12, 0.1]);
  }
  const cook = person({ x: px + 4.2, z: pz, rotY: -Math.PI / 2, shirt: 0xe9b949, pants: 0x6b2f4a, scarf: 0x6b2f4a });
  animated.push({ obj: cook, type: 'sway' });
}

{ // Truck being loaded with harvest
  const tx = 30, tz = 30.5;
  const truck = new THREE.Group();
  mesh(box(7.6, 0.3, 2.1), M.steel, [0, 0.75, 0], truck);
  mesh(box(2.1, 1.9, 2.2), M.truckCab, [-3.1, 1.85, 0], truck);
  mesh(box(0.05, 0.8, 1.9), M.windshield, [-4.17, 2.25, 0], truck);
  for (const s of [1, -1]) mesh(box(1.2, 0.7, 0.05), M.windshield, [-3, 2.3, s * 1.11], truck);
  mesh(box(2.12, 0.4, 2.22), M.truckBlue, [-3.1, 1.1, 0], truck);
  mesh(box(5.2, 0.12, 2.2), M.wood, [0.95, 0.96, 0], truck);
  for (const s of [1, -1]) mesh(box(5.2, 0.7, 0.08), M.truckBlue, [0.95, 1.37, s * 1.08], truck);
  mesh(box(0.08, 0.7, 2.2), M.truckBlue, [3.52, 1.37, 0], truck);
  for (const wx of [-3, 0.5, 2.2]) for (const s of [1, -1]) mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.35, 18), M.tire, [wx, 0.48, s * 1.0], truck, { r: [Math.PI / 2, 0, 0] });
  // Crates in the bed
  for (let i = 0; i < 18; i++) {
    const cx = -1.2 + (i % 6) * 0.72, cz = -0.55 + (Math.floor(i / 6) % 2) * 1.1, cy = 1.2 + Math.floor(i / 12) * 0.36;
    mesh(box(0.66, 0.34, 0.5), i % 3 ? M.crate : M.crateGreen, [cx, cy, cz], truck);
    mesh(box(0.55, 0.06, 0.4), i % 2 ? M.mango : M.orange, [cx, cy + 0.19, cz], truck);
  }
  truck.position.set(tx, 0, tz);
  scene.add(truck);
  // Harvest pile at the orchard edge
  for (let i = 0; i < 14; i++) {
    const cx = 28 + (i % 4) * 0.72, cz = 22.5 + Math.floor(i / 4) % 2 * 0.6, cy = 0.17 + Math.floor(i / 8) * 0.35;
    inst(G.box, i % 3 ? M.crate : M.crateGreen, [cx, cy, cz], [0, rr(-0.08, 0.08), 0], [0.66, 0.34, 0.5]);
    inst(G.box, i % 2 ? M.mango : M.orange, [cx, cy + 0.19, cz], [0, 0, 0], [0.55, 0.06, 0.4], false);
  }
  for (let i = 0; i < 4; i++) inst(G.cyl, M.basket, [26.5 + i * 0.7, 0.22, 24.2], [0, 0, 0], [0.28, 0.44, 0.28]);
  // Workers carrying crates between the pile and the truck
  for (let i = 0; i < 3; i++) {
    const w = person({ x: 29, z: 25, shirt: [0x7a3b2e, 0x2f6f63, 0xd9a441][i], pants: 0x2b2b2b, carry: true, scarf: i === 1 ? 0xd9572b : null });
    animated.push({ obj: w, type: 'walk', a: new THREE.Vector3(29 + i * 0.4, 0, 24), b: new THREE.Vector3(29.6 + i * 0.4, 0, 28.8), phase: i * 2.1 });
  }
  const farmer = person({ x: 33, z: 22.8, rotY: -2.2, shirt: 0xf2efe6, pants: 0x4a5a3a });
  animated.push({ obj: farmer, type: 'sway' });
}

// A few students working in the orchard
for (const [x, z, r] of [[24, -10.5, 0.4], [33, 4.2, 2.6], [21, 4.5, -1], [36, -11, 1.9]]) {
  const s = student({ x, z, rotY: r });
  animated.push({ obj: s, type: 'sway' });
}

flushBatches();

// ---------------------------------------------------------------------------
// Hotspots
// ---------------------------------------------------------------------------
const hsLayer = document.getElementById('hotspots');
const hsEls = HOTSPOTS.map((h, i) => {
  const el = document.createElement('button');
  el.className = 'hotspot';
  el.type = 'button';
  el.innerHTML = `<span class="dot">${i + 1}</span><span class="label">${h.title}</span>`;
  el.addEventListener('click', (e) => { e.stopPropagation(); openHotspot(h.id, true); });
  hsLayer.appendChild(el);
  return { el, h, v: new THREE.Vector3(...h.pos) };
});

const panel = document.getElementById('panel');
function openHotspot(id, fly) {
  const h = HOTSPOTS.find((x) => x.id === id);
  if (!h) return;
  document.getElementById('panelKicker').textContent = h.kicker;
  document.getElementById('panelTitle').textContent = h.title;
  document.getElementById('panelSummary').textContent = h.summary;
  document.getElementById('panelBody').innerHTML = h.sections.map((s) => `
    <h3>${s.h}${s.placeholder ? ' <span class="badge">Placeholder · team to finalize</span>' : ''}</h3>
    <ul>${s.items.map((t) => `<li>${t}</li>`).join('')}</ul>`).join('');
  panel.hidden = false;
  hideIntro();
  hsEls.forEach((x) => x.el.classList.toggle('active', x.h.id === id));
  if (fly) { if (walk.on) setWalk(false); if (tourIdx >= 0) endTour(); hsEls.forEach((x) => x.el.classList.toggle('active', x.h.id === id)); flyTo(h.view); }
}
function closePanel() {
  panel.hidden = true;
  hsEls.forEach((x) => x.el.classList.remove('active'));
}
document.getElementById('panelClose').addEventListener('click', closePanel);

// ---------------------------------------------------------------------------
// Camera flights
// ---------------------------------------------------------------------------
let flight = null;
function flyTo(view, dur = 1.8) {
  flight = {
    t: 0, dur,
    p0: camera.position.clone(), p1: new THREE.Vector3(...view.cam),
    t0: controls.target.clone(), t1: new THREE.Vector3(...view.target),
  };
  controls.enableDamping = false;
  controls.update();
  controls.enabled = false;
}
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
function updateFlight(dt) {
  if (!flight) return;
  flight.t = Math.min(1, flight.t + dt / flight.dur);
  const k = ease(flight.t);
  // Arc upward mid-flight so long hops don't clip through trees
  const lift = Math.sin(Math.PI * k) * Math.min(18, flight.p0.distanceTo(flight.p1) * 0.25);
  camera.position.lerpVectors(flight.p0, flight.p1, k).y += lift;
  controls.target.lerpVectors(flight.t0, flight.t1, k);
  camera.lookAt(controls.target);
  if (flight.t >= 1) { flight = null; controls.enabled = true; controls.enableDamping = true; }
}

// ---------------------------------------------------------------------------
// Guided tour
// ---------------------------------------------------------------------------
const tourEl = document.getElementById('tour');
let tourIdx = -1;
function showTourStep(i) {
  tourIdx = Math.max(0, Math.min(TOUR.length - 1, i));
  const s = TOUR[tourIdx];
  document.getElementById('tourTag').textContent = s.tag;
  document.getElementById('tourSteps').textContent = `${tourIdx + 1} / ${TOUR.length}`;
  document.getElementById('tourTitle').textContent = s.title;
  document.getElementById('tourText').textContent = s.text;
  document.getElementById('tourPrev').disabled = tourIdx === 0;
  const next = document.getElementById('tourNext');
  next.textContent = tourIdx === TOUR.length - 1 ? 'Explore freely' : 'Next →';
  document.getElementById('tourCta').hidden = !s.cta;
  hsEls.forEach((x) => x.el.classList.toggle('active', x.h.id === s.hotspot));
  closePanel();
  if (s.hotspot) hsEls.find((x) => x.h.id === s.hotspot)?.el.classList.add('active');
  flyTo(s.view, 2.2);
}
function startTour() {
  if (walk.on) setWalk(false);
  hideIntro();
  tourEl.hidden = false;
  document.body.classList.add('touring');
  showTourStep(0);
}
function endTour() {
  tourEl.hidden = true;
  tourIdx = -1;
  document.body.classList.remove('touring');
  hsEls.forEach((x) => x.el.classList.remove('active'));
}
document.getElementById('tourNext').addEventListener('click', () => (tourIdx === TOUR.length - 1 ? endTour() : showTourStep(tourIdx + 1)));
document.getElementById('tourPrev').addEventListener('click', () => showTourStep(tourIdx - 1));
document.getElementById('tourClose').addEventListener('click', endTour);
document.getElementById('startTour').addEventListener('click', startTour);
document.getElementById('btnTour').addEventListener('click', startTour);
document.getElementById('freeExplore').addEventListener('click', () => { hideIntro(); flyTo({ cam: [-30, 22, 40], target: [6, 0, -2] }); });
document.getElementById('btnOverview').addEventListener('click', () => { if (walk.on) setWalk(false); endTour(); closePanel(); flyTo(OVERVIEW); });
function hideIntro() { document.getElementById('intro').hidden = true; }

// ---------------------------------------------------------------------------
// Walk mode (eye-level, WASD + drag to look)
// ---------------------------------------------------------------------------
const walk = { on: false, yaw: 0, pitch: 0, keys: new Set(), drag: null };
const hint = document.getElementById('controlsHint');
const walkBtn = document.getElementById('btnWalk');
function setWalk(on) {
  walk.on = on;
  walk.keys.clear();
  flight = null;
  controls.enabled = !on;
  walkBtn.classList.toggle('on', on);
  walkBtn.textContent = on ? '⟲ Orbit' : '🚶 Walk';
  hint.textContent = on ? 'W A S D / arrows to walk · Shift to run · Drag to look' : 'Drag to orbit · Scroll to zoom · Right-drag to pan';
  if (on) {
    endTour(); hideIntro();
    camera.position.set(6, 1.7, 27);
    walk.yaw = 0; walk.pitch = -0.05;
  } else {
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    controls.target.copy(camera.position).addScaledVector(dir, 12);
    controls.target.y = Math.max(0, controls.target.y);
    camera.position.y += 4;
  }
}
walkBtn.addEventListener('click', () => setWalk(!walk.on));
addEventListener('keydown', (e) => { if (walk.on) { walk.keys.add(e.code); if (e.code.startsWith('Arrow')) e.preventDefault(); } });
addEventListener('keyup', (e) => walk.keys.delete(e.code));
canvas.addEventListener('pointerdown', (e) => { if (walk.on) { walk.drag = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); } });
canvas.addEventListener('pointermove', (e) => {
  if (!walk.on || !walk.drag) return;
  walk.yaw -= (e.clientX - walk.drag.x) * 0.004;
  walk.pitch = THREE.MathUtils.clamp(walk.pitch - (e.clientY - walk.drag.y) * 0.004, -1.2, 1.2);
  walk.drag = { x: e.clientX, y: e.clientY };
});
canvas.addEventListener('pointerup', () => (walk.drag = null));
canvas.addEventListener('pointercancel', () => (walk.drag = null));
addEventListener('blur', () => walk.keys.clear());
if (matchMedia('(pointer: coarse)').matches) walkBtn.hidden = true;
function updateWalk(dt) {
  const k = walk.keys, speed = (k.has('ShiftLeft') || k.has('ShiftRight') ? 9 : 4) * dt;
  const f = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
  const s = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
  const fx = -Math.sin(walk.yaw), fz = -Math.cos(walk.yaw);
  camera.position.x = THREE.MathUtils.clamp(camera.position.x + (fx * f - fz * s) * speed, -90, 100);
  camera.position.z = THREE.MathUtils.clamp(camera.position.z + (fz * f + fx * s) * speed, -90, 90);
  camera.position.y = height(camera.position.x, camera.position.z) + 1.7;
  camera.rotation.set(walk.pitch, walk.yaw, 0, 'YXZ');
}

// ---------------------------------------------------------------------------
// Loop
// ---------------------------------------------------------------------------
const clock = new THREE.Clock();
const tmp = new THREE.Vector3();
function updateHotspots() {
  const w = innerWidth, h = innerHeight;
  for (const { el, v } of hsEls) {
    tmp.copy(v).project(camera);
    const visible = tmp.z < 1 && Math.abs(tmp.x) < 1.1 && Math.abs(tmp.y) < 1.1;
    el.style.display = visible ? '' : 'none';
    if (!visible) continue;
    const dist = camera.position.distanceTo(v);
    el.style.transform = `translate(${(tmp.x * 0.5 + 0.5) * w}px, ${(-tmp.y * 0.5 + 0.5) * h}px)`;
    el.style.zIndex = String(1000 - Math.round(dist));
    el.classList.toggle('far', dist > 140);
  }
}
function animate() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  updateFlight(dt);
  if (walk.on) updateWalk(dt);
  else if (!flight) controls.update();
  for (const a of animated) {
    if (a.type === 'bob') a.obj.children[4] && (a.obj.rotation.x = Math.sin(t * 1.3 + a.phase) * 0.03);
    else if (a.type === 'sway') a.obj.rotation.z = Math.sin(t * 1.1 + (a.phase || 0)) * 0.03;
    else if (a.type === 'walk') {
      const cyc = ((t * 0.12 + a.phase / 6) % 1);
      const k = cyc < 0.5 ? cyc * 2 : 2 - cyc * 2;
      a.obj.position.lerpVectors(a.a, a.b, k);
      a.obj.position.y = Math.abs(Math.sin(t * 7 + a.phase)) * 0.05;
      a.obj.rotation.y = cyc < 0.5 ? 0 : Math.PI;
    }
  }
  updateHotspots();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// Deep link: #mango opens that hotspot
if (location.hash.length > 1) setTimeout(() => openHotspot(location.hash.slice(1), true), 400);

animate();
requestAnimationFrame(() => document.getElementById('loader').classList.add('done'));
