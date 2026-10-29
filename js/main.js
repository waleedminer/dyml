import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { HOTSPOTS, TOUR, INFO } from './data.js';
import { initComments } from './comments.js';

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
scene.fog = new THREE.Fog(0xccd6c4, 110, 380);

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 2000);
const OVERVIEW = { cam: [-62, 42, 72], target: [6, 0, 0] };
camera.position.fromArray(OVERVIEW.cam);


// ---------------------------------------------------------------------------
// Sky, sun, environment lighting
// ---------------------------------------------------------------------------
const sun = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(52), THREE.MathUtils.degToRad(215));
const sky = new Sky();
sky.scale.setScalar(4000);
sky.userData.noPick = true;
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

scene.add(new THREE.HemisphereLight(0xe1ecf5, 0x7a5f3c, 0.42));
const sunLight = new THREE.DirectionalLight(0xffe9cc, 2.85);
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
// Material polish: corrugated sheet reads as painted metal (less glare), the
// sky's image light is eased off a touch so the warm sun does the modelling.
Object.assign(M.roof, { roughness: 0.72, metalness: 0.08, color: new THREE.Color(0xf4e6dc) });
Object.assign(M.white, { color: new THREE.Color(0xf1ece0) });
Object.assign(M.steel, { roughness: 0.5, metalness: 0.6 });
for (const m of Object.values(M)) if (m && m.isMaterial) m.envMapIntensity = 0.8;
M.grass.vertexColors = true;
M.terracotta = new THREE.MeshStandardMaterial({ color: 0xa9603b, roughness: 0.92, envMapIntensity: 0.8 });
M.gutter = new THREE.MeshStandardMaterial({ color: 0xd8d4c8, roughness: 0.55, metalness: 0.3, envMapIntensity: 0.8 });
// Woven palm mat: striped weave with a darker bound edge, on a thin slab.
TEX.mat = canvasTex(128, (g, s) => {
  g.fillStyle = '#8a6a40'; g.fillRect(0, 0, s, s);
  for (let y = 0; y < s; y += 8) { g.fillStyle = (y / 8) % 2 ? 'rgba(60,40,20,0.22)' : 'rgba(230,200,140,0.16)'; g.fillRect(0, y, s, 4); }
  for (let x = 0; x < s; x += 6) { g.fillStyle = 'rgba(40,25,10,0.10)'; g.fillRect(x, 0, 2, s); }
  g.strokeStyle = '#5a4026'; g.lineWidth = 10; g.strokeRect(5, 5, s - 10, s - 10);
});
TEX.mat.wrapS = TEX.mat.wrapT = THREE.ClampToEdgeWrapping;
M.mat = new THREE.MeshStandardMaterial({ map: TEX.mat, roughness: 1, envMapIntensity: 0.8 });

// Decoration RNG, kept separate so the seeded layout of the scene never shifts.
let dseed = 7;
const drand = () => (dseed = (dseed * 16807) % 2147483647) / 2147483647;

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
  const mx = new THREE.Matrix4().compose(new THREE.Vector3(...p), _q.clone(), sc);
  batches.get(key).list.push(mx);
  if (geo === G.box) solids.push(new THREE.Box3(new THREE.Vector3(-0.5, -0.5, -0.5), new THREE.Vector3(0.5, 0.5, 0.5)).applyMatrix4(mx));
}
// Organic materials get a gentle per-instance tone shift so repeats don't read as clones.
const JITTER = new Set();
const _jc = new THREE.Color();
function flushBatches() {
  for (const { geo, mat, shadow, list } of batches.values()) {
    const m = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach((mx, i) => m.setMatrixAt(i, mx));
    if (JITTER.has(mat)) {
      for (let i = 0; i < list.length; i++) {
        const v = 0.88 + drand() * 0.18, w = (drand() - 0.5) * 0.08;
        m.setColorAt(i, _jc.setRGB(v * (1 + w), v, v * (1 - w)));
      }
    }
    m.castShadow = shadow;
    m.receiveShadow = true;
    scene.add(m);
  }
  batches.clear();
}

// Boxes are solid by default in walk mode (you bump into them or stand on them).
function mesh(geo, mat, p = [0, 0, 0], parent = scene, { cast = true, receive = true, r, solid } = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.position.fromArray(p);
  if (r) m.rotation.set(r[0], r[1], r[2]);
  m.castShadow = cast;
  m.receiveShadow = receive;
  m.userData.solid = solid ?? geo.type === 'BoxGeometry';
  parent.add(m);
  return m;
}
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);

// Walk-mode colliders: world-space boxes, plus round posts for trunks and people.
const solids = [];
const posts = [];
function collectSolids() {
  scene.updateMatrixWorld(true);
  scene.traverse((o) => { if (o.isMesh && o.userData.solid) solids.push(new THREE.Box3().setFromObject(o)); });
}

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

// Soft contact shadows: feathered discs and rectangles merged into one
// transparent mesh (one draw call, no per-frame cost). They ground trees,
// buildings, furniture and people the way ambient occlusion would.
const AO = { pos: [], col: [], idx: [] };
function aoVert(x, z, a, y, lift) {
  AO.pos.push(x, y ?? height(x, z) + lift, z);
  AO.col.push(1, 1, 1, Math.min(1, a * 1.4));
  return AO.pos.length / 3 - 1;
}
const AO_RINGS = [[0, 1], [0.38, 0.72], [0.7, 0.32], [1, 0]];
// Disc of radius r (sx/sz stretch it into an ellipse).
function aoDisc(x, z, r, s = 0.5, { y, sz = 1, lift = 0.06 } = {}) {
  const N = 14, c = aoVert(x, z, s, y, lift);
  let prev = null;
  for (let k = 1; k < AO_RINGS.length; k++) {
    const [f, a] = AO_RINGS[k], ring = [];
    for (let i = 0; i < N; i++) {
      const t = (i / N) * Math.PI * 2;
      ring.push(aoVert(x + Math.cos(t) * r * f, z + Math.sin(t) * r * f * sz, s * a, y, lift));
    }
    for (let i = 0; i < N; i++) {
      const j = (i + 1) % N;
      if (!prev) AO.idx.push(c, ring[j], ring[i]);
      else AO.idx.push(prev[i], prev[j], ring[j], prev[i], ring[j], ring[i]);
    }
    prev = ring;
  }
}
// Rectangle (half sizes hw/hd, turned by yaw) with a feathered skirt of width `spread`.
function aoRect(x, z, hw, hd, yaw = 0, spread = 1, s = 0.5, { y, lift = 0.06 } = {}) {
  const cs = Math.cos(yaw), sn = Math.sin(yaw);
  const rings = [[-Math.min(hw, hd, spread * 0.4), 1], [0, 0.82], [spread * 0.3, 0.5], [spread * 0.62, 0.2], [spread, 0]];
  let prev = null;
  for (const [o, a] of rings) {
    const ring = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([u, v]) => {
      const lx = u * (hw + o), lz = v * (hd + o);
      return aoVert(x + lx * cs + lz * sn, z - lx * sn + lz * cs, s * a, y, lift);
    });
    if (!prev) AO.idx.push(ring[0], ring[2], ring[1], ring[0], ring[3], ring[2]);
    else for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; AO.idx.push(prev[i], prev[j], ring[j], prev[i], ring[j], ring[i]); }
    prev = ring;
  }
}
function buildContactShadows() {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(AO.pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(AO.col, 4));
  g.setIndex(AO.idx);
  g.computeBoundingSphere();
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({
    color: 0x2a2114, vertexColors: true, transparent: true, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6, side: THREE.DoubleSide,
  }));
  m.renderOrder = 1;
  m.userData.noPick = true;
  m.raycast = () => {};
  scene.add(m);
}
// World-space helpers for decorating a (possibly rotated) group before it is furnished.
const yawOf = (grp) => new THREE.Euler().setFromQuaternion(grp.getWorldQuaternion(new THREE.Quaternion()), 'YXZ').y;
const atWorld = (grp, x, y, z) => grp.localToWorld(new THREE.Vector3(x, y, z));

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
  flat: new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
  slab: new THREE.BoxGeometry(1, 1, 1), // decorative box: not G.box, so inst() adds no collider
  potT: (() => { const g = new THREE.CylinderGeometry(1, 0.72, 1, 12); g.translate(0, 0.5, 0); return g; })(),
};
// Instanced prop placed in a group's local frame (the group must have its world matrix updated).
const instAt = (grp, geo, mat, p, r = [0, 0, 0], s = 1, shadow = true) => inst(geo, mat, atWorld(grp, ...p).toArray(), [r[0], r[1] + yawOf(grp), r[2]], s, shadow);
// One-sided feathered strip along a wall base: from (x0,z0)-(x1,z1), fading toward normal (nx,nz). World space.
function aoEdge(x0, z0, x1, z1, nx, nz, spread, s, y) {
  let prev = null;
  for (const [f, a] of [[0, 1], [0.3, 0.5], [0.62, 0.2], [1, 0]]) {
    const row = [aoVert(x0 + nx * spread * f, z0 + nz * spread * f, s * a, y), aoVert(x1 + nx * spread * f, z1 + nz * spread * f, s * a, y)];
    if (prev) AO.idx.push(prev[0], prev[1], row[1], prev[0], row[1], row[0]);
    prev = row;
  }
}
// Same, but in a group's local frame.
function aoEdgeIn(grp, x0, z0, x1, z1, nx, nz, spread, s, y) {
  const a = atWorld(grp, x0, y, z0), b = atWorld(grp, x1, y, z1), ry = yawOf(grp);
  const wx = nx * Math.cos(ry) + nz * Math.sin(ry), wz = -nx * Math.sin(ry) + nz * Math.cos(ry);
  aoEdge(a.x, a.z, b.x, b.z, wx, wz, spread, s, a.y);
}
// Split the span [a0,a1] around openings [[g0,g1],...] (sorted or not) into solid runs.
function runs(a0, a1, gaps) {
  const out = []; let s = a0;
  for (const [g0, g1] of [...gaps].sort((p, q) => p[0] - q[0])) { if (g0 > s) out.push([s, Math.min(g0, a1)]); s = Math.max(s, g1); }
  if (s < a1) out.push([s, a1]);
  return out.filter(([p, q]) => q - p > 0.05);
}
const leafMats = [M.leafA, M.leafB, M.leafC, M.leafD];
for (const m of [...leafMats, M.trunk, M.palmTrunk, M.frond, M.bananaLeaf, M.mango, M.orange, M.greenFruit, M.crate, M.crateGreen, M.mulch, M.basket, M.terracotta]) JITTER.add(m);

// ---------------------------------------------------------------------------
// Ground, paths, road
// ---------------------------------------------------------------------------
{
  const g = new THREE.PlaneGeometry(700, 700, 200, 200);
  scaleUV(g, 90, 90);
  g.rotateX(-Math.PI / 2);
  drape(g, 0);
  // Vertex tint: broad lighter/darker swathes, and dry, trodden grass that
  // fades in around the laterite paths so their edges sit into the ground.
  const PATHS = [[600, 7, 0, 31], [36, 10, -3, 3.5], [4, 22, 6, 18], [4, 12, 30, 23], [12, 3.5, 13, 8], [3, 14, -20, 13], [16, 3, -27, 20], [3.5, 22, -16, -11], [30, 46, 30, -5]];
  const gp = g.attributes.position, gc = new Float32Array(gp.count * 3);
  for (let i = 0; i < gp.count; i++) {
    const x = gp.getX(i), z = gp.getZ(i);
    let d = 1e9;
    for (const [w, dd, cx, cz] of PATHS) d = Math.min(d, Math.max(Math.abs(x - cx) - w / 2, Math.abs(z - cz) - dd / 2));
    const worn = 1 - THREE.MathUtils.smoothstep(d, 0, 4.5);
    const n = Math.sin(x * 0.045 + 1.3) * Math.cos(z * 0.052 - 0.4) + 0.5 * Math.sin((x - z) * 0.11 + 2.1);
    const v = 0.97 + n * 0.05, dry = THREE.MathUtils.clamp(0.5 + 0.5 * Math.sin(x * 0.021 - z * 0.033 + 0.7), 0, 1) * 0.06 + worn * 0.16;
    gc[i * 3] = v * (1 + dry * 0.9); gc[i * 3 + 1] = v * (1 - dry * 0.08); gc[i * 3 + 2] = v * (1 - dry * 1.1);
  }
  g.setAttribute('color', new THREE.BufferAttribute(gc, 3));
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

// Walls are built from segments around door and window openings so every
// building is hollow and walkable. The lower metre gets the green dado band.
const WALL_T = 0.22, DADO = 1.0;
// Interiors take less sky light than the outside (there is a roof overhead),
// so the warm lamps and the window light read.
M.floor = new THREE.MeshStandardMaterial({ map: TEX.concrete, color: 0xdacbac, roughness: 0.9, envMapIntensity: 0.55 });
M.ceiling = new THREE.MeshStandardMaterial({ color: 0xf4ead6, roughness: 0.95, envMapIntensity: 0.5 });
M.door = new THREE.MeshStandardMaterial({ map: TEX.shutter, roughness: 0.7 });
M.lamp = new THREE.MeshStandardMaterial({ color: 0xfff4d6, emissive: 0xffe2a8, emissiveIntensity: 1.6 });
function wall(grp, axis, a0, a1, at, y0, h, openings = []) {
  const seg = (s0, s1, b, t) => {
    if (s1 - s0 < 0.01 || t - b < 0.01) return;
    const parts = b < DADO ? [[b, Math.min(t, DADO), M.band], [DADO, t, M.plaster]] : [[b, t, M.plaster]];
    for (const [pb, pt, mat] of parts) {
      if (pt - pb < 0.01) continue;
      const len = s1 - s0, c = (s0 + s1) / 2, y = y0 + (pb + pt) / 2;
      mesh(axis === 'x' ? box(len, pt - pb, WALL_T) : box(WALL_T, pt - pb, len), mat, axis === 'x' ? [c, y, at] : [at, y, c], grp);
    }
  };
  let cur = a0;
  for (const o of [...openings].sort((p, q) => p.c - q.c)) {
    seg(cur, o.c - o.w / 2, 0, h);
    seg(o.c - o.w / 2, o.c + o.w / 2, 0, o.b);
    seg(o.c - o.w / 2, o.c + o.w / 2, o.t, h);
    cur = o.c + o.w / 2;
  }
  seg(cur, a1, 0, h);
}
// Place a box along a wall: u = position along the wall, n = offset from the wall plane.
const onWall = (axis, u, at, n, y) => (axis === 'x' ? [u, y, at + n] : [at + n, y, u]);
const alongWall = (axis, len, hgt, thick) => (axis === 'x' ? box(len, hgt, thick) : box(thick, hgt, len));

// Window: sill, security bars and two shutters folded open against the outside wall.
function windowAt(grp, axis, c, at, out, y0, w = 1.6) {
  mesh(alongWall(axis, w + 0.2, 0.08, 0.34), M.white, onWall(axis, c, at, out * 0.06, y0 + 1.3), grp);
  for (let i = -2; i <= 2; i++) mesh(alongWall(axis, 0.03, 1.35, 0.03), M.steel, onWall(axis, c + i * (w / 5), at, 0, y0 + 1.97), grp, { solid: false });
  for (const s of [-1, 1]) mesh(alongWall(axis, w / 2, 1.35, 0.05), M.shutter, onWall(axis, c + s * w * 0.75, at, out * (WALL_T / 2 + 0.03), y0 + 1.97), grp);
}

// Hinged door that opens inward. Collision follows the leaf as it swings.
const doors = [];
function doorAt(grp, axis, c, at, out, y0, { w = 1.2, h = 2.3, name = 'door' } = {}) {
  const pivot = new THREE.Group();
  const lw = w - 0.06;
  const leaf = mesh(box(lw, h - 0.04, 0.06), M.door, [lw / 2 + 0.02, h / 2, 0], pivot, { solid: false });
  for (const s of [-1, 1]) mesh(new THREE.SphereGeometry(0.045, 10, 8), M.steel, [lw - 0.12, 1.05, s * 0.06], pivot, { solid: false });
  if (axis === 'x') pivot.position.set(c - w / 2, y0, at);
  else { pivot.position.set(at, y0, c - w / 2); pivot.rotation.y = -Math.PI / 2; }
  grp.add(pivot);
  // Frame (architrave) on both faces
  for (const f of [-1, 1]) {
    for (const s of [-1, 1]) mesh(alongWall(axis, 0.1, h + 0.1, 0.04), M.white, onWall(axis, c + s * (w / 2 + 0.05), at, f * (WALL_T / 2 + 0.02), y0 + h / 2), grp, { solid: false });
    mesh(alongWall(axis, w + 0.3, 0.1, 0.04), M.white, onWall(axis, c, at, f * (WALL_T / 2 + 0.02), y0 + h + 0.05), grp, { solid: false });
  }
  const sign = axis === 'x' ? out : -out;
  const d = { pivot, leaf, base: pivot.rotation.y, sign, open: false, a: 0, from: 0, to: 0, t: 1, box: new THREE.Box3(), name, anchor: grp, local: new THREE.Vector3(...onWall(axis, c, at, 0, y0 + 1.25)) };
  doors.push(d);
  return d;
}

// A single-storey block, front (veranda) facing local +z. Returns layout info for furnishing.
function schoolBlock(w, d, { x, z, rotY = 0, doors: doorIdx = [], h = 3.4, partitions = [], names = [] }) {
  const grp = new THREE.Group();
  const P = 0.5, ver = 2.8;
  mesh(box(w + 1, P, d + ver + 0.6), M.concrete, [0, P / 2, ver / 2], grp);
  mesh(box(3, 0.25, 0.5), M.concrete, [0, 0.125, d / 2 + ver + 0.55], grp);
  mesh(box(w - 0.2, 0.02, d - 0.2), M.floor, [0, P + 0.01, 0], grp);

  const step = 3.2, n = Math.floor((w - 2) / step);
  const bay = (i) => -((n * step) / 2) + i * step;
  const front = [], back = [], doorList = [];
  for (let i = 0; i <= n; i++) {
    back.push({ c: bay(i), w: 1.6, b: 1.3, t: 2.65 });
    windowAt(grp, 'x', bay(i), -d / 2, -1, P);
    if (doorIdx.includes(i)) {
      front.push({ c: bay(i), w: 1.2, b: 0, t: 2.3 });
      doorList.push(doorAt(grp, 'x', bay(i), d / 2, 1, P, { name: names[doorIdx.indexOf(i)] }));
    } else {
      front.push({ c: bay(i), w: 1.6, b: 1.3, t: 2.65 });
      windowAt(grp, 'x', bay(i), d / 2, 1, P);
    }
  }
  wall(grp, 'x', -w / 2 - WALL_T / 2, w / 2 + WALL_T / 2, d / 2, P, h, front);
  wall(grp, 'x', -w / 2 - WALL_T / 2, w / 2 + WALL_T / 2, -d / 2, P, h, back);
  for (const sx of [-1, 1]) wall(grp, 'z', -d / 2, d / 2, sx * w / 2, P, h);
  for (const px of partitions) wall(grp, 'z', -d / 2, d / 2, px, P, h, [{ c: d / 2 - 1.3, w: 1.1, b: 0, t: 2.3 }]);
  // Cornice and ceiling
  for (const s of [-1, 1]) {
    mesh(box(w + 0.34, 0.18, 0.06), M.white, [0, P + h - 0.09, s * (d / 2 + WALL_T / 2 + 0.03)], grp, { solid: false });
    mesh(box(0.06, 0.18, d + 0.34), M.white, [s * (w / 2 + WALL_T / 2 + 0.03), P + h - 0.09, 0], grp, { solid: false });
  }
  mesh(box(w, 0.08, d), M.ceiling, [0, P + h + 0.04, 0], grp);

  // Veranda columns and beam (round concrete columns, like the site photos)
  const cz = d / 2 + ver - 0.3;
  const cols = Math.round(w / 2.6);
  for (let i = 0; i <= cols; i++) {
    const px = -w / 2 + (i * w) / cols;
    mesh(new THREE.CylinderGeometry(0.2, 0.22, h, 14), M.white, [px, P + h / 2, cz], grp, { solid: true });
    mesh(box(0.55, 0.22, 0.55), M.white, [px, P + h - 0.11, cz], grp);
    mesh(box(0.5, 0.25, 0.5), M.concrete, [px, P + 0.12, cz], grp);
  }
  mesh(box(w + 0.4, 0.35, 0.45), M.white, [0, P + h + 0.17, cz], grp);
  for (let i = 0; i < cols; i++) {
    if (i === Math.floor(cols / 2)) continue;
    const px = -w / 2 + ((i + 0.5) * w) / cols;
    mesh(box(w / cols - 0.45, 0.7, 0.2), M.band, [px, P + 0.35, cz], grp);
  }
  // Roof
  const rw = w + 2, rd = d + ver + 1.4;
  const roof = mesh(hipRoofGeo(rw, rd, 2.3), M.roof, [0, P + h + 0.35, ver / 2 + 0.2], grp);
  roof.castShadow = true;
  for (const s of [1, -1]) mesh(box(rw, 0.25, 0.08), M.white, [0, P + h + 0.3, ver / 2 + 0.2 + s * rd / 2], grp, { solid: false });
  grp.position.set(x, 0, z);
  grp.rotation.y = rotY;
  scene.add(grp);
  grp.updateMatrixWorld(true);

  // Rainwater gutters on both eaves; downpipes drop at the back corners.
  const eaveY = P + h + 0.24, zf = ver / 2 + 0.2 + rd / 2 + 0.09, zb = ver / 2 + 0.2 - rd / 2 - 0.09;
  for (const gz of [zf, zb]) instAt(grp, G.cylLow, M.gutter, [0, eaveY, gz], [0, 0, Math.PI / 2], [0.075, rw, 0.075]);
  for (const sx of [-1, 1]) {
    const px = sx * (w / 2 + WALL_T / 2 + 0.12), pz = -d / 2 - WALL_T / 2 - 0.12;
    instAt(grp, G.cylLow, M.gutter, [px, (P + eaveY) / 2, pz], [0, 0, 0], [0.05, eaveY - P, 0.05]);
    instAt(grp, G.cylLow, M.gutter, [px, eaveY, (pz + zb) / 2], [Math.PI / 2, 0, 0], [0.05, Math.abs(zb - pz) + 0.05, 0.05]);
    instAt(grp, G.cylLow, M.gutter, [px, P + 0.12, pz - 0.08], [Math.PI / 2.6, 0, 0], [0.05, 0.25, 0.05]);
  }
  // Woven mat outside each door
  for (const o of front) if (o.b === 0) instAt(grp, G.slab, M.mat, [o.c, P + 0.012, d / 2 + WALL_T / 2 + 0.5], [0, 0, 0], [1.0, 0.018, 0.6], false);

  // Contact shadows: around the plinth, along the veranda wall, column feet,
  // and soft occlusion along every interior wall base.
  const pc = atWorld(grp, 0, 0, ver / 2);
  aoRect(pc.x, pc.z, (w + 1) / 2, (d + ver + 0.6) / 2, rotY, 2.0, 0.55);
  const doorGaps = front.filter((o) => o.b === 0).map((o) => [o.c - o.w / 2 - 0.1, o.c + o.w / 2 + 0.1]);
  for (const [a0, a1] of runs(-w / 2, w / 2, doorGaps)) aoEdgeIn(grp, a0, d / 2 + WALL_T / 2, a1, d / 2 + WALL_T / 2, 0, 1, 0.8, 0.32, P + 0.015);
  for (let i = 0; i <= cols; i++) { const c = atWorld(grp, -w / 2 + (i * w) / cols, P + 0.015, cz); aoDisc(c.x, c.z, 0.6, 0.3, { y: c.y }); }
  const fy = P + 0.03, iz = d / 2 - WALL_T / 2, ix = w / 2 - WALL_T / 2;
  aoEdgeIn(grp, -ix, -iz, ix, -iz, 0, 1, 1.1, 0.46, fy);
  for (const [a0, a1] of runs(-ix, ix, doorGaps)) aoEdgeIn(grp, a0, iz, a1, iz, 0, -1, 1.1, 0.46, fy);
  aoEdgeIn(grp, -ix, -iz, -ix, iz, 1, 0, 1.1, 0.46, fy);
  aoEdgeIn(grp, ix, -iz, ix, iz, -1, 0, 1.1, 0.46, fy);
  const pGap = [[d / 2 - 1.3 - 0.55 - 0.1, d / 2 - 1.3 + 0.55 + 0.1]];
  for (const px of partitions) for (const sx of [-1, 1]) for (const [a0, a1] of runs(-iz, iz, pGap)) aoEdgeIn(grp, px + sx * WALL_T / 2, a0, px + sx * WALL_T / 2, a1, sx, 0, 1.1, 0.46, fy);
  return { grp, P, h, w, d, bay, doors: doorList };
}

const MAIN = schoolBlock(26, 9, { x: 0, z: -9, doors: [2, 5], partitions: [0], names: ['Orchard Science classroom', 'Harvest & Preserve lab'] });
const ADMIN = schoolBlock(13, 8, { x: -27, z: 2, rotY: Math.PI / 2, doors: [1], names: ['Library & records office'] });

// Veranda life: a bench under a window and potted plants flanking the doors,
// kept against the wall so the veranda, door swings and column gaps stay clear.
function pottedPlant(grp, x, y, z, s = 1) {
  instAt(grp, G.potT, M.terracotta, [x, y, z], [0, 0, 0], [0.2 * s, 0.4 * s, 0.2 * s]);
  instAt(grp, G.cylLow, M.soil, [x, y + 0.39 * s, z], [0, 0, 0], [0.17 * s, 0.02, 0.17 * s], false);
  instAt(grp, G.blobs[Math.floor(drand() * 4)], drand() < 0.5 ? M.leafB : M.leafC, [x, y + 0.66 * s, z], [0, drand() * 6, 0], [0.32 * s, 0.38 * s, 0.32 * s]);
  const c = atWorld(grp, x, y, z);
  solids.push(new THREE.Box3(new THREE.Vector3(c.x - 0.17 * s, y, c.z - 0.17 * s), new THREE.Vector3(c.x + 0.17 * s, y + 0.9 * s, c.z + 0.17 * s)));
  aoDisc(c.x, c.z, 0.45 * s, 0.4, { y: y + 0.016 });
}
for (const [B, benchBays] of [[MAIN, [1, 6]], [ADMIN, [2]]]) {
  const { grp, P, d, bay, doors: dl } = B;
  const wz = d / 2 + WALL_T / 2;
  for (const i of benchBays) {
    // Same shape as bench(), but batched (and the boxes still collide via inst()).
    const bx = bay(i), bz = wz + 0.24, bw = 1.5;
    aoFurniture(grp, bx, P, bz, Math.PI / 2, 0.17, bw / 2, 0.32, 0.3, 0.02);
    instAt(grp, G.box, M.wood, [bx, P + 0.44, bz], [0, 0, 0], [bw, 0.05, 0.34]);
    for (const s of [-1, 1]) instAt(grp, G.box, M.darkWood, [bx + s * (bw / 2 - 0.06), P + 0.21, bz], [0, 0, 0], [0.05, 0.42, 0.3]);
  }
  for (const door of dl) for (const sx of [-1, 1]) pottedPlant(grp, door.local.x + sx * 1.15, P, wz + 0.32, 0.9);
}

// Interior ceiling lamps (the light switches toggle these)
const lamps = [];
function lamp(grp, x, y, z, intensity = 22) {
  const fixture = mesh(box(1.1, 0.05, 0.14), M.lamp, [x, y, z], grp, { cast: false, solid: false });
  const light = new THREE.PointLight(0xffdcaa, intensity, 13, 1.6);
  light.position.set(x, y - 0.3, z);
  grp.add(light);
  const l = { light, fixture, on: true, intensity };
  lamps.push(l);
  return l;
}
function toggleLamp(l) {
  l.on = !l.on;
  l.light.intensity = l.on ? l.intensity : 0;
  l.fixture.material = l.on ? M.lamp : M.white;
}


// Flag of Sierra Leone
let FLAG;
{
  mesh(new THREE.CylinderGeometry(0.05, 0.07, 8, 8), M.steel, [-6, 4, 4]);
  const flag = new THREE.Group();
  [0x1eb53a, 0xffffff, 0x0072c6].forEach((c, i) =>
    mesh(box(2.1, 0.45, 0.02), new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, side: THREE.DoubleSide }), [1.05, -i * 0.45, 0], flag));
  flag.position.set(-6, 7.8, 4);
  scene.add(flag);
  FLAG = flag;
  mesh(box(1.2, 0.3, 1.2), M.concrete, [-6, 0.15, 4]);
}

// School sign
let SIGN;
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
  SIGN = grp;
}

// ---------------------------------------------------------------------------
// Vegetation
// ---------------------------------------------------------------------------
// Ground shadow under plants near the site (far away it is lost in the haze anyway).
const aoPlant = (x, z, r, s) => { if (Math.hypot(x - 5, z) < 105) aoDisc(x, z, r, s, { lift: Math.hypot(x - 5, z) > 78 ? 0.12 : 0.06 }); };
function fruitOn(cx, cy, cz, r, mat, n, size = 0.13) {
  for (let i = 0; i < n; i++) {
    const a = rand() * Math.PI * 2, el = rr(-0.9, 0.2);
    inst(G.sphere, mat, [cx + Math.cos(a) * Math.cos(el) * r * 0.95, cy + Math.sin(el) * r * 0.9, cz + Math.sin(a) * Math.cos(el) * r * 0.95], [0, 0, 0], [size, size * 1.25, size]);
  }
}
function mangoTree(x, z, s = 1, fruit = true, mat = M.mango) {
  const y0 = height(x, z);
  posts.push({ x, z, r: 0.26 * s });
  aoPlant(x, z, 2.7 * s, 0.4);
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
  posts.push({ x, z, r: 0.16 * s });
  aoPlant(x, z, 1.8 * s, 0.38);
  inst(G.trunk, M.trunk, [x, y0, z], [0, rand() * 6, 0], [0.13 * s, 0.9 * s, 0.13 * s]);
  const cy = y0 + 1.9 * s;
  inst(pick(G.blobs), pick([M.leafA, M.leafB]), [x, cy, z], [0, rand() * 6, 0], [1.35 * s, 1.25 * s, 1.35 * s]);
  inst(pick(G.blobs), M.leafB, [x + 0.4 * s, cy + 0.6 * s, z - 0.2 * s], [0, rand() * 6, 0], [0.9 * s, 0.8 * s, 0.9 * s]);
  fruitOn(x, cy, z, 1.32 * s, M.orange, 12, 0.11);
}
function bananaPlant(x, z, s = 1) {
  const y0 = height(x, z);
  posts.push({ x, z, r: 0.15 * s });
  aoPlant(x, z, 1.2 * s, 0.3);
  inst(G.cylLow, M.leafD, [x, y0 + 1.2 * s, z], [0, 0, 0], [0.13 * s, 2.4 * s, 0.13 * s]);
  const n = 7;
  for (let i = 0; i < n; i++) {
    inst(G.bLeaf, M.bananaLeaf, [x, y0 + 2.3 * s, z], [rr(0.6, 1.2), (i / n) * Math.PI * 2 + rr(0, 0.5), 0], [s, s, s]);
  }
  inst(G.sphere, M.greenFruit, [x + 0.25 * s, y0 + 1.9 * s, z], [0.3, 0, 0], [0.16 * s, 0.35 * s, 0.16 * s]);
}
function papaya(x, z, s = 1) {
  const y0 = height(x, z);
  posts.push({ x, z, r: 0.11 * s });
  aoPlant(x, z, 0.9 * s, 0.3);
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
  posts.push({ x, z, r: 0.22 * s });
  aoPlant(x, z, 1.1 * s, 0.3);
  inst(G.trunk, M.palmTrunk, [x, y0, z], [lean, dir, 0], [0.22 * s, hgt, 0.22 * s]);
  const n = 13;
  for (let i = 0; i < n; i++) inst(G.frond, M.frond, [tx, y0 + hgt, tz], [rr(0.9, 1.7), (i / n) * Math.PI * 2 + rr(0, 0.3), 0], [s, s, s]);
}
function bush(x, z, s = 1) {
  aoPlant(x, z, 1.75 * s, 0.42);
  inst(pick(G.blobs), pick(leafMats), [x, height(x, z) + 0.5 * s, z], [0, rand() * 6, 0], [1.4 * s, 0.9 * s, 1.4 * s]);
}

// Orchard blocks
const pickables = [];
const ORCH = { x0: 18, x1: 42 };
const mulch = (x, z, r) => inst(G.cyl, M.mulch, [x, 0.05, z], [0, 0, 0], [r, 0.06, r], false);
const dripLine = (z) => inst(G.cylLow, M.pipeBlack, [(ORCH.x0 + ORCH.x1) / 2 - 1, 0.08, z + 0.4], [0, 0, Math.PI / 2], [0.035, ORCH.x1 - ORCH.x0 + 4, 0.035], false);
for (let z = -25; z <= -13; z += 6) {
  for (let x = ORCH.x0 + 1; x <= ORCH.x1; x += 6) {
    const cashew = (x + z) % 4 === 0;
    mangoTree(x + rr(-0.3, 0.3), z + rr(-0.3, 0.3), rr(0.85, 1.05), true, cashew ? M.orange : M.mango);
    pickables.push({ pos: [x, 1.9, z], kind: cashew ? 'cashew' : 'mango' });
    mulch(x, z, 1.4);
  }
  dripLine(z);
}
for (let z = -8; z <= 2; z += 5) {
  for (let x = ORCH.x0; x <= ORCH.x1; x += 4) { citrusTree(x + rr(-0.2, 0.2), z + rr(-0.2, 0.2), rr(0.9, 1.1)); mulch(x, z, 1.0); pickables.push({ pos: [x, 1.6, z], kind: 'orange' }); }
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
    (x > 14 && x < 46 && z > -29 && z < 18) || Math.abs(z - 31) < 4 || (x > -21 && x < 15 && z > -2 && z < 9) || (x > -35 && x < -29 && z > -20 && z < -14);
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
  im.userData.noPick = true;
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
const HUT = {};
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
  // Cool store hut: hollow, with a door (furnished further down)
  {
    const hut = new THREE.Group(), hw = 4, hd = 3.4, hh = 2.6;
    mesh(box(hw + 0.4, 0.12, hd + 0.4), M.concrete, [0, 0.06, 0], hut);
    wall(hut, 'x', -hw / 2 - WALL_T / 2, hw / 2 + WALL_T / 2, hd / 2, 0.12, hh, [{ c: 0, w: 1.1, b: 0, t: 2.1 }]);
    wall(hut, 'x', -hw / 2 - WALL_T / 2, hw / 2 + WALL_T / 2, -hd / 2, 0.12, hh, [{ c: 0, w: 0.8, b: 1.6, t: 2.1 }]);
    for (const sx of [-1, 1]) wall(hut, 'z', -hd / 2, hd / 2, sx * hw / 2, 0.12, hh);
    for (let i = -2; i <= 2; i++) mesh(box(0.03, 0.5, 0.03), M.steel, [i * 0.16, 1.97, -hd / 2], hut, { solid: false });
    mesh(box(hw, 0.08, hd), M.ceiling, [0, 0.12 + hh + 0.04, 0], hut);
    mesh(hipRoofGeo(4.8, 4.2, 1.2), M.roof, [0, 2.75, 0], hut);
    hut.position.set(dx - 6, 0, dz + 1);
    scene.add(hut);
    hut.updateMatrixWorld(true);
    HUT.grp = hut;
    HUT.door = doorAt(hut, 'x', 0, hd / 2, 1, 0.12, { w: 1.1, h: 2.1, name: 'cool store' });
  }
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
// People. Each person has jointed arms, legs and head so one shared animation
// system (same tempo, same easing) drives every scene in the model.
// ---------------------------------------------------------------------------
const people = [];
const SKIN = [0x4a2e1f, 0x3b2418, 0x5a3825, 0x432a1c];
const matCache = new Map();
const cmat = (c) => { if (!matCache.has(c)) matCache.set(c, new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 })); return matCache.get(c); };
const PG = {
  leg: (() => { const g = new THREE.CylinderGeometry(0.075, 0.065, 0.86, 8); g.translate(0, -0.43, 0); return g; })(),
  thigh: (() => { const g = new THREE.CylinderGeometry(0.075, 0.07, 0.45, 8); g.rotateX(Math.PI / 2); g.translate(0, 0, 0.22); return g; })(),
  shin: new THREE.CylinderGeometry(0.065, 0.06, 0.45, 8),
  torso: new THREE.CapsuleGeometry(0.18, 0.42, 4, 10),
  arm: (() => { const g = new THREE.CylinderGeometry(0.055, 0.05, 0.55, 8); g.translate(0, -0.27, 0); return g; })(),
  head: new THREE.SphereGeometry(0.135, 14, 12),
  scarf: new THREE.SphereGeometry(0.16, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.62),
  hair: new THREE.SphereGeometry(0.14, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.45),
  crate: new THREE.BoxGeometry(0.5, 0.28, 0.4),
};

function person({ x, z, y, rotY = 0, shirt = 0xf2efe6, pants = 0x1f3a66, scale = 1, sit = false, scarf = null, carry = false, parent = scene, shadow = true, anim = 'stand' }) {
  const g = new THREE.Group();
  const skin = cmat(pick(SKIN));
  const hip = sit ? 0.48 : 0.86;
  const legs = [];
  if (sit) {
    for (const s of [-1, 1]) {
      mesh(PG.thigh, cmat(pants), [s * 0.1, hip, 0], g);
      mesh(PG.shin, cmat(pants), [s * 0.1, hip / 2, 0.44], g);
    }
  } else {
    for (const s of [-1, 1]) {
      const lp = new THREE.Group();
      lp.position.set(s * 0.1, hip, 0);
      mesh(PG.leg, cmat(pants), [0, 0, 0], lp);
      g.add(lp);
      legs.push(lp);
    }
  }
  const torso = mesh(PG.torso, cmat(shirt), [0, hip + 0.33, 0], g);
  const arms = [-1, 1].map((s) => {
    const ap = new THREE.Group();
    ap.position.set(s * 0.25, hip + 0.6, 0);
    mesh(PG.arm, cmat(shirt), [0, 0, 0], ap);
    g.add(ap);
    return ap;
  });
  const head = new THREE.Group();
  head.position.set(0, hip + 0.82, 0);
  mesh(PG.head, skin, [0, 0, 0], head);
  mesh(scarf ? PG.scarf : PG.hair, cmat(scarf || 0x161009), [0, scarf ? 0.02 : 0.03, -0.01], head);
  g.add(head);
  const crate = carry ? mesh(PG.crate, M.crate, [0, hip + 1.1, 0], g) : null;
  if (sit) for (const a of arms) a.rotation.x = -0.9;
  g.traverse((o) => { if (o.isMesh) { o.castShadow = shadow; o.userData.solid = false; } });
  g.position.set(x, y ?? height(x, z), z);
  g.rotation.y = rotY;
  g.scale.setScalar(scale);
  parent.add(g);
  g.userData = { legs, arms, head, torso, crate, anim, phase: rand() * 20, baseRot: rotY, stride: 0 };
  people.push(g);
  return g;
}
const UNIFORM = [0x3a6fb0, 0xf2efe6];
const student = (o) => person({ shirt: pick(UNIFORM), pants: 0x1f3a66, scale: rr(0.72, 0.82), scarf: rand() < 0.5 ? pick([0xf2efe6, 0x1f3a66]) : null, ...o });

// Canvas textures for chalkboards and posters (any aspect ratio).
function drawTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = maxAniso;
  return t;
}
function chalkboard(title, lines, doodle) {
  return drawTex(1024, 400, (g, w, h) => {
    g.fillStyle = '#1e3b2c'; g.fillRect(0, 0, w, h);
    g.globalAlpha = 0.08; g.fillStyle = '#fff';
    for (let i = 0; i < 40; i++) g.fillRect(rand() * w, rand() * h, rr(40, 160), 2);
    g.globalAlpha = 1; g.fillStyle = '#efe9da'; g.strokeStyle = '#efe9da'; g.lineWidth = 4;
    g.font = '48px Georgia'; g.fillText(title, 40, 72);
    g.font = '32px Georgia';
    lines.forEach((t, i) => g.fillText(t, 48, 140 + i * 50));
    if (doodle) doodle(g, w, h);
  });
}
function posterTex(tag, title, lines, { accent = '#b5643a', placeholder = false } = {}) {
  return drawTex(512, 512, (g, s) => {
    g.fillStyle = '#f6efe2'; g.fillRect(0, 0, s, s);
    g.fillStyle = accent; g.fillRect(0, 0, s, 76);
    g.fillStyle = '#fff'; g.font = 'bold 30px Georgia'; g.fillText(tag, 26, 50);
    g.fillStyle = '#1f3b2c'; g.font = 'bold 46px Georgia'; g.fillText(title, 26, 150);
    g.font = '28px Georgia';
    lines.forEach((t, i) => g.fillText('• ' + t, 30, 220 + i * 52));
    if (placeholder) { g.fillStyle = '#8a5100'; g.font = 'italic 24px Georgia'; g.fillText('Placeholder · team to finalize', 26, s - 30); }
    g.strokeStyle = accent; g.lineWidth = 8; g.strokeRect(4, 4, s - 8, s - 8);
  });
}
const faceMats = (tex, face) => { const arr = Array(6).fill(M.darkWood); arr[face] = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 }); return arr; };
// Box face indices: +x 0, -x 1, +y 2, -y 3, +z 4, -z 5
function poster(grp, x, y, z, tex, face = 4, size = 1.1) {
  const geo = face < 2 ? box(0.03, size, size) : box(size, size, 0.03);
  return mesh(geo, faceMats(tex, face), [x, y, z], grp, { cast: false, solid: false });
}
// Local -> world helpers for instanced props inside rotated buildings
const toWorld = (grp, x, y, z) => grp.localToWorld(new THREE.Vector3(x, y, z)).toArray();

// Interaction registry (walk mode). Anchors are resolved to world positions once the scene is built.
const interactables = [];
function addInteract(anchor, local, label, act, r = 2.4) {
  interactables.push({ anchor, local: new THREE.Vector3(...local), pos: new THREE.Vector3(), label, act, r });
}

// ---------------------------------------------------------------------------
// Outdoor scenes: classroom, dining, truck, orchard
// ---------------------------------------------------------------------------
{ // Outdoor classroom
  const cx = 10, cz = 12;
  const chalkTex = chalkboard('The Orchard Cycle', ['Seed  →  Grow  →  Harvest  →  Preserve  →  Sell', '', 'Compost = food for soil'], (g) => {
    g.beginPath(); g.moveTo(860, 360); g.lineTo(860, 270); g.stroke();
    g.beginPath(); g.arc(860, 240, 44, 0, Math.PI * 2); g.stroke();
  });
  const board = new THREE.Group();
  mesh(box(2.6, 1.3, 0.06), faceMats(chalkTex, 4), [0, 1.6, 0], board);
  mesh(box(0.08, 2.4, 0.08), M.darkWood, [-1.2, 1.2, -0.06], board);
  mesh(box(0.08, 2.4, 0.08), M.darkWood, [1.2, 1.2, -0.06], board);
  board.position.set(cx, 0, cz - 2.2);
  scene.add(board);
  addInteract(board, [0, 1.6, 0.1], 'Read the lesson', () => showInfo(HOTSPOTS.find((h) => h.id === 'classroom')));
  person({ x: cx + 1.8, z: cz - 1.6, rotY: -0.5, shirt: 0xd9692b, pants: 0x2a2a2a, scarf: 0x2a3b5a, anim: 'teach' });
  for (let r = 0; r < 3; r++) {
    mesh(box(3.4, 0.08, 0.35), M.wood, [cx, 0.42, cz + r * 1.25], scene);
    for (const lx of [-1.5, 1.5]) mesh(box(0.08, 0.42, 0.3), M.darkWood, [cx + lx, 0.21, cz + r * 1.25]);
    for (let i = 0; i < 4; i++) student({ x: cx - 1.2 + i * 0.8, z: cz + r * 1.25, y: 0, rotY: Math.PI, sit: true, anim: 'seated' });
  }
}

{ // Dining pavilion with tables
  const px = -20, pz = 18, w = 10, d = 7;
  for (const sx of [-1, 0, 1]) for (const sz of [-1, 1]) mesh(new THREE.CylinderGeometry(0.12, 0.12, 3, 8), M.darkWood, [px + sx * w / 2, 1.5, pz + sz * d / 2], scene, { solid: true });
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
        student({ x: sx, z: tz + bs * 0.85, y: 0, rotY: bs > 0 ? Math.PI : 0, sit: true, anim: 'eat' });
        inst(G.cyl, M.bowl, [sx, 0.86, tz + bs * 0.25], [0, 0, 0], [0.14, 0.08, 0.14]);
        inst(G.sphere, pick([M.mango, M.orange]), [sx + 0.18, 0.9, tz + bs * 0.25], [0, 0, 0], 0.07);
      }
    }
    for (let i = 0; i < 4; i++) inst(G.sphere, pick([M.mango, M.orange, M.greenFruit]), [px - 1.5 + i, 0.92, tz], [0, 0, 0], [0.1, 0.12, 0.1]);
  }
  person({ x: px + 4.2, z: pz, rotY: -Math.PI / 2, shirt: 0xe9b949, pants: 0x6b2f4a, scarf: 0x6b2f4a, anim: 'stir' });
  inst(G.cyl, M.steel, [px + 3.6, 0.95, pz], [0, 0, 0], [0.35, 0.4, 0.35]);
  mesh(box(1, 0.75, 1.2), M.darkWood, [px + 3.6, 0.375, pz]);
  addInteract(null, [px, 1, pz - 1.6], () => (basketCount() ? `Share your ${basketCount()} fruit at lunch` : 'About the community tables'), () => {
    if (basketCount()) { const n = basketCount(); clearBasket(); toast(`Shared ${n} fruit at the community tables. A share of every harvest stays here.`); }
    else showInfo(HOTSPOTS.find((h) => h.id === 'dining'));
  }, 3.2);
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
  for (let i = 0; i < 18; i++) {
    const cx = -1.2 + (i % 6) * 0.72, cz = -0.55 + (Math.floor(i / 6) % 2) * 1.1, cy = 1.2 + Math.floor(i / 12) * 0.36;
    mesh(box(0.66, 0.34, 0.5), i % 3 ? M.crate : M.crateGreen, [cx, cy, cz], truck);
    mesh(box(0.55, 0.06, 0.4), i % 2 ? M.mango : M.orange, [cx, cy + 0.19, cz], truck, { solid: false });
  }
  truck.position.set(tx, 0, tz);
  scene.add(truck);
  addInteract(truck, [1, 1.4, -1.3], () => (basketCount() ? `Load your ${basketCount()} fruit onto the truck` : 'About harvest to market'), () => {
    if (basketCount()) { const n = basketCount(); clearBasket(); sold += n; toast(`Loaded ${n} fruit for market (${sold} so far). Sales fund upkeep, the school and families.`); }
    else showInfo(HOTSPOTS.find((h) => h.id === 'truck'));
  }, 3.4);
  for (let i = 0; i < 14; i++) {
    const cx = 28 + (i % 4) * 0.72, cz = 22.5 + Math.floor(i / 4) % 2 * 0.6, cy = 0.17 + Math.floor(i / 8) * 0.35;
    inst(G.box, i % 3 ? M.crate : M.crateGreen, [cx, cy, cz], [0, rr(-0.08, 0.08), 0], [0.66, 0.34, 0.5]);
    inst(G.box, i % 2 ? M.mango : M.orange, [cx, cy + 0.19, cz], [0, 0, 0], [0.55, 0.06, 0.4], false);
  }
  for (let i = 0; i < 4; i++) inst(G.cyl, M.basket, [26.5 + i * 0.7, 0.22, 24.2], [0, 0, 0], [0.28, 0.44, 0.28]);
  // Workers carry crates from the pile to the truck and walk back empty-handed
  for (let i = 0; i < 3; i++) {
    const w = person({ x: 29, z: 25, shirt: [0x7a3b2e, 0x2f6f63, 0xd9a441][i], pants: 0x2b2b2b, carry: true, scarf: i === 1 ? 0xd9572b : null, anim: 'carry' });
    Object.assign(w.userData, { a: new THREE.Vector3(29 + i * 0.4, 0, 24), b: new THREE.Vector3(29.6 + i * 0.4, 0, 28.8), phase: i * 4 });
  }
  person({ x: 33, z: 22.8, rotY: -2.2, shirt: 0xf2efe6, pants: 0x4a5a3a, anim: 'stand' });
}

// A few students picking fruit in the orchard
for (const [x, z, r] of [[24, -10.5, 0.4], [33, 4.2, 2.6], [21, 4.5, -1], [36, -11, 1.9]]) student({ x, z, rotY: r, anim: 'pick' });

// ---------------------------------------------------------------------------
// Interiors
// ---------------------------------------------------------------------------
M.book = [0x8a2f2a, 0x2c5f8f, 0x3f7a3e, 0xd9a441, 0x5a3e6b, 0xe9e0c8].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 }));
M.jar = new THREE.MeshStandardMaterial({ color: 0xdfeee8, roughness: 0.1, transparent: true, opacity: 0.45 });
M.clay = new THREE.MeshStandardMaterial({ color: 0xa65a35, roughness: 0.95 });
M.sack = new THREE.MeshStandardMaterial({ color: 0xc8b38a, roughness: 1 });
M.seed = new THREE.MeshStandardMaterial({ color: 0x6b4a2a, roughness: 1 });
M.tray = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.9 });

// Furniture contact shadow, in the parent group's frame (lift: floor surface above y).
function aoFurniture(grp, x, y, z, rot, hw, hd, spread, s, lift = 0.03) {
  const c = atWorld(grp, x, y, z);
  aoRect(c.x, c.z, hw, hd, yawOf(grp) + rot, spread, s, { y: c.y + lift });
}
function desk(grp, x, y, z, rot = 0, w = 1.3, d = 0.55) {
  aoFurniture(grp, x, y, z, rot, d / 2, w / 2, 0.45, 0.36);
  const g = new THREE.Group();
  mesh(box(d, 0.05, w), M.wood, [0, 0.74, 0], g);
  for (const s of [-1, 1]) mesh(box(d - 0.05, 0.72, 0.05), M.darkWood, [0, 0.36, s * (w / 2 - 0.05)], g);
  g.position.set(x, y, z);
  g.rotation.y = rot;
  grp.add(g);
  return g;
}
function bench(grp, x, y, z, rot = 0, w = 1.3, lift = 0.03) {
  aoFurniture(grp, x, y, z, rot, 0.17, w / 2, 0.32, 0.3, lift);
  const g = new THREE.Group();
  mesh(box(0.34, 0.05, w), M.wood, [0, 0.44, 0], g);
  for (const s of [-1, 1]) mesh(box(0.3, 0.42, 0.05), M.darkWood, [0, 0.21, s * (w / 2 - 0.06)], g);
  g.position.set(x, y, z);
  g.rotation.y = rot;
  grp.add(g);
}
function shelfUnit(grp, x, y, z, rot, w = 2, h = 2, d = 0.4, fill) {
  aoFurniture(grp, x, y, z, rot, w / 2, d / 2, 0.45, 0.38);
  const g = new THREE.Group();
  for (const s of [-1, 1]) mesh(box(0.05, h, d), M.darkWood, [s * w / 2, h / 2, 0], g);
  mesh(box(w, h, 0.03), M.darkWood, [0, h / 2, -d / 2], g);
  const levels = 4;
  for (let i = 0; i <= levels; i++) mesh(box(w, 0.04, d), M.wood, [0, 0.08 + (i * (h - 0.12)) / levels, 0], g);
  g.position.set(x, y, z);
  g.rotation.y = rot;
  grp.add(g);
  g.updateMatrixWorld(true);
  if (fill) for (let i = 0; i < levels; i++) fill(g, 0.1 + (i * (h - 0.12)) / levels, w, d, i);
  return g;
}
const shelfInst = (g, geo, mat, x, y, z, s, ry = 0) => inst(geo, mat, toWorld(g, x, y, z), [0, g.parent.rotation.y + g.rotation.y + ry, 0], s);

{ // Main block: two classrooms joined by an inner doorway
  const { grp, P, h } = MAIN;
  // --- Classroom A: Orchard Science (Soil & Seeds lesson)
  const boardA = chalkboard('Today: Soil & Seeds', ['1. Test the soil: feel, smell, look', '2. Mix compost into the planting hole', '3. Sow seeds in the nursery trays', '4. Water at the roots, not the leaves'], (g) => {
    g.beginPath(); g.moveTo(880, 360); g.lineTo(880, 250); g.stroke();
    g.beginPath(); g.ellipse(850, 250, 30, 14, -0.5, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.ellipse(912, 236, 30, 14, 0.5, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.moveTo(800, 362); g.lineTo(960, 362); g.stroke();
  });
  mesh(box(0.06, 1.3, 3.4), faceMats(boardA, 0), [-12.84, P + 1.75, 0], grp, { cast: false });
  mesh(box(0.14, 0.04, 3.4), M.wood, [-12.78, P + 1.08, 0], grp, { solid: false });
  addInteract(grp, [-12.7, P + 1.75, 0], 'Read the lesson', () => showInfo(INFO.classA), 3.4);
  person({ x: -11.9, z: -0.8, y: P, rotY: Math.PI / 2, parent: grp, shirt: 0xd9692b, pants: 0x2a2a2a, scarf: 0x2a3b5a, anim: 'teach', shadow: false });
  desk(grp, -11.2, P, 2.4, 0, 1.4, 0.7);
  inst(G.box, M.book[1], toWorld(grp, -11.2, P + 0.8, 2.2), [0, 0.2, 0], [0.22, 0.05, 0.3]);
  inst(G.cylLow, M.pot, toWorld(grp, -11.2, P + 0.85, 2.8), [0, 0, 0], [0.09, 0.16, 0.09]);
  inst(G.blobs[1], M.leafC, toWorld(grp, -11.2, P + 1.0, 2.8), [0, 0, 0], [0.14, 0.16, 0.14]);
  let seatN = 0;
  for (const rx of [-10.2, -8.4, -6.6]) {
    for (const dz of [-2.6, 0, 2.6]) {
      desk(grp, rx, P, dz);
      bench(grp, rx + 0.55, P, dz);
      for (const s of [-1, 1]) {
        if ((seatN++ % 3) === 2) continue; // a few empty seats
        student({ x: rx + 0.62, z: dz + s * 0.32, y: P, rotY: -Math.PI / 2, sit: true, parent: grp, anim: 'seated', shadow: false });
        inst(G.box, M.book[(seatN % 5)], toWorld(grp, rx, P + 0.78, dz + s * 0.32), [0, 0, 0], [0.2, 0.02, 0.28]);
      }
    }
  }
  // Seed jars on the partition wall
  shelfUnit(grp, -0.35, P, -2.2, -Math.PI / 2, 1.8, 1.6, 0.36, (g, y, w) => {
    for (let i = 0; i < 6; i++) {
      shelfInst(g, G.cylLow, M.jar, -w / 2 + 0.2 + i * 0.28, y + 0.12, 0, [0.09, 0.22, 0.09]);
      shelfInst(g, G.cylLow, pick([M.seed, M.mango, M.greenFruit, M.soil]), -w / 2 + 0.2 + i * 0.28, y + 0.08, 0, [0.075, 0.14, 0.075]);
    }
  });
  addInteract(grp, [-0.6, P + 1.2, -2.2], 'Look at the seed bank', () => showInfo(INFO.seedBank), 2.4);
  // Posters on the back wall (between windows)
  const posterSpots = [-9.6, -6.4, -3.2, 3.2, 6.4, 9.6];
  const posters = [
    ['TERM 1', 'Soil & seeds', ['Soil testing', 'Compost making', 'Raising seedlings'], INFO.term1],
    ['TERM 2', 'Growing', ['Planting & mulching', 'Drip irrigation', 'Pruning, pest scouting'], INFO.term2],
    ['VALUES', 'Khalifa', ['Stewards of the earth', 'Gratitude & sharing', 'Zakah from the harvest'], INFO.values],
    ['TERM 3', 'Harvest & preserve', ['Picking & grading', 'Solar drying', 'Cool storage'], INFO.term3],
    ['TERM 4', 'Orchard business', ['Record keeping', 'Pricing & selling', 'Saving'], INFO.term4],
    ['MAP', 'Our orchard', ['Mango & cashew: long term', 'Citrus: mid term', 'Banana & papaya: quick'], INFO.orchardMap],
  ];
  posters.forEach(([tag, title, lines, info], i) => {
    const px = posterSpots[i];
    poster(grp, px, P + 1.95, -4.5 + WALL_T / 2 + 0.02, posterTex(tag, title, lines, { accent: i === 2 ? '#2f6f63' : '#b5643a', placeholder: tag.startsWith('TERM') }));
    addInteract(grp, [px, P + 1.95, -4.3], `Read poster · ${title}`, () => showInfo(info), 2.2);
  });
  const lampA = lamp(grp, -6.5, P + h - 0.03, 0);
  mesh(box(0.1, 0.16, 0.03), M.white, [-6.0, P + 1.3, 4.5 - WALL_T / 2 - 0.015], grp, { cast: false, solid: false });
  addInteract(grp, [-6.0, P + 1.3, 4.3], () => (lampA.on ? 'Switch the lights off' : 'Switch the lights on'), () => toggleLamp(lampA), 1.8);

  // --- Classroom B: Harvest & Preserve lab
  const boardB = chalkboard('Harvest & Preserve', ['Pick ripe  →  Wash  →  Slice thin', 'Dry in the solar dryer until leathery', 'Pack in clean jars, label with the date', 'Store cool and dry; sell when prices rise'], (g) => {
    g.beginPath(); g.ellipse(880, 300, 60, 36, 0.3, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.moveTo(930, 270); g.quadraticCurveTo(960, 240, 950, 220); g.stroke();
  });
  mesh(box(0.06, 1.3, 3.4), faceMats(boardB, 1), [12.84, P + 1.75, 0], grp, { cast: false });
  mesh(box(0.14, 0.04, 3.4), M.wood, [12.78, P + 1.08, 0], grp, { solid: false });
  addInteract(grp, [12.7, P + 1.75, 0], 'Read the lesson', () => showInfo(INFO.classB), 3.4);
  person({ x: 11.8, z: 0.9, y: P, rotY: -Math.PI / 2, parent: grp, shirt: 0x2f6f63, pants: 0x2a2a2a, anim: 'teach', shadow: false });
  for (const tx of [4.6, 8.6]) {
    aoFurniture(grp, tx, P, -0.6, 0, 1.2, 0.55, 0.45, 0.3);
    mesh(box(2.4, 0.06, 1.1), M.wood, [tx, P + 0.86, -0.6], grp);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) mesh(box(0.06, 0.83, 0.06), M.darkWood, [tx + sx * 1.1, P + 0.42, -0.6 + sz * 0.48], grp);
    // Seedling tray, jars of dried mango, chopping board with slices
    mesh(box(0.7, 0.06, 0.45), M.tray, [tx - 0.75, P + 0.92, -0.6], grp, { solid: false });
    for (let i = 0; i < 12; i++) inst(G.blobs[i % 4], M.leafD, toWorld(grp, tx - 1.0 + (i % 4) * 0.16, P + 0.99, -0.75 + Math.floor(i / 4) * 0.15), [0, rand() * 6, 0], [0.06, 0.07, 0.06]);
    for (let i = 0; i < 4; i++) {
      inst(G.cylLow, M.jar, toWorld(grp, tx + 0.1 + i * 0.18, P + 1.0, -0.4), [0, 0, 0], [0.07, 0.2, 0.07]);
      inst(G.box, M.mango, toWorld(grp, tx + 0.1 + i * 0.18, P + 0.96, -0.4), [0, i, 0], [0.08, 0.1, 0.03]);
    }
    mesh(box(0.5, 0.03, 0.32), M.wood, [tx + 0.75, P + 0.905, -0.75], grp, { solid: false });
    for (let i = 0; i < 5; i++) inst(G.box, M.mango, toWorld(grp, tx + 0.6 + i * 0.07, P + 0.93, -0.75), [0, 0, 0], [0.04, 0.012, 0.22]);
    for (const [sz, ry] of [[0.45, Math.PI], [-1.65, 0]]) for (const sx of [-0.6, 0.6]) student({ x: tx + sx, z: sz, y: P, rotY: ry, parent: grp, anim: 'work', shadow: false });
  }
  addInteract(grp, [6.6, P + 1.1, -0.6], 'Look at the preserving station', () => showInfo(HOTSPOTS.find((x) => x.id === 'preserve')), 3.2);
  const lampB = lamp(grp, 6.5, P + h - 0.03, 0);
  mesh(box(0.1, 0.16, 0.03), M.white, [3.5, P + 1.3, 4.5 - WALL_T / 2 - 0.015], grp, { cast: false, solid: false });
  addInteract(grp, [3.5, P + 1.3, 4.3], () => (lampB.on ? 'Switch the lights off' : 'Switch the lights on'), () => toggleLamp(lampB), 1.8);
  // Crates of harvest by the lab wall
  aoFurniture(grp, 11.3, P, -3.7, 0, 1.05, 0.25, 0.4, 0.38);
  for (let i = 0; i < 6; i++) inst(G.box, i % 2 ? M.crate : M.crateGreen, toWorld(grp, 10.6 + (i % 3) * 0.7, P + 0.18 + Math.floor(i / 3) * 0.36, -3.7), [0, 0, 0], [0.62, 0.34, 0.46]);
}

{ // Admin block: library and the orchard records office
  const { grp, P, h } = ADMIN;
  const books = (g, y, w, d) => {
    let x = -w / 2 + 0.06;
    while (x < w / 2 - 0.1) {
      const bw = rr(0.05, 0.09), bh = rr(0.24, 0.34);
      shelfInst(g, G.box, pick(M.book), x + bw / 2, y + bh / 2, 0.02, [bw, bh, d * 0.7], rr(-0.04, 0.04));
      x += bw + 0.006;
    }
  };
  for (const sx of [-1, 1]) {
    for (const z of [-1.6, 1.0]) shelfUnit(grp, sx * (6.5 - WALL_T / 2 - 0.22), P, z, sx > 0 ? -Math.PI / 2 : Math.PI / 2, 2.2, 2.1, 0.4, books);
  }
  addInteract(grp, [-5.9, P + 1.3, -0.3], 'Browse the library', () => showInfo(INFO.library), 3);
  addInteract(grp, [5.9, P + 1.3, -0.3], 'Browse the library', () => showInfo(INFO.library), 3);
  // Reading table
  aoFurniture(grp, -1.8, P, -0.6, 0, 0.6, 1.5, 0.45, 0.3);
  mesh(box(1.2, 0.06, 3), M.wood, [-1.8, P + 0.75, -0.6], grp);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) mesh(box(0.06, 0.72, 0.06), M.darkWood, [-1.8 + sx * 0.5, P + 0.36, -0.6 + sz * 1.4], grp);
  for (const s of [-1, 1]) {
    bench(grp, -1.8 + s * 0.9, P, -0.6, 0, 2.8);
    for (const z of [-1.4, 0.2]) {
      student({ x: -1.8 + s * 0.98, z, y: P, rotY: s > 0 ? -Math.PI / 2 : Math.PI / 2, sit: true, parent: grp, anim: 'read', shadow: false });
      inst(G.box, pick(M.book), toWorld(grp, -1.8 + s * 0.3, P + 0.8, z), [0, rr(-0.3, 0.3), 0], [0.24, 0.03, 0.32]);
    }
  }
  // Records desk with ledger
  const ledgerTex = drawTex(512, 340, (g, w, hh) => {
    g.fillStyle = '#f4ecd8'; g.fillRect(0, 0, w, hh);
    g.fillStyle = '#1f3b2c'; g.font = 'bold 30px Georgia'; g.fillText('Orchard Accounts', 20, 42);
    g.font = '22px Georgia';
    [['Mango, 6 crates', '— TBD'], ['Citrus, 4 crates', '— TBD'], ['Dried mango, 20 jars', '— TBD'], ['Upkeep · School · Families', '⅓ ⅓ ⅓ ?']].forEach(([a, b], i) => { g.fillText(a, 20, 96 + i * 52); g.fillText(b, 360, 96 + i * 52); });
    g.strokeStyle = '#b5643a'; g.lineWidth = 2; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(16, 66 + i * 52); g.lineTo(w - 16, 66 + i * 52); g.stroke(); }
  });
  desk(grp, 3.6, P, 2.2, 0, 1.6, 0.8);
  mesh(box(0.42, 0.02, 0.6), [M.white, M.white, new THREE.MeshStandardMaterial({ map: ledgerTex, roughness: 0.9 }), M.white, M.white, M.white], [3.6, P + 0.78, 2.1], grp, { solid: false, r: [0, Math.PI / 2, 0] });
  inst(G.box, M.steel, toWorld(grp, 3.7, P + 0.82, 2.75), [0, 0.3, 0], [0.22, 0.1, 0.16]);
  person({ x: 2.7, z: 2.0, y: P, rotY: Math.PI / 2, parent: grp, shirt: 0xf2efe6, pants: 0x2a2a2a, scarf: 0x6b2f4a, anim: 'stand', shadow: false });
  addInteract(grp, [3.6, P + 0.9, 2.1], 'Read the orchard accounts', () => showInfo(INFO.ledger), 2.4);
  poster(grp, 3.2, P + 1.95, -4 + WALL_T / 2 + 0.02, posterTex('INCOME PLAN', 'Where money goes', ['Orchard upkeep', 'School fund', 'Steward families'], { placeholder: true, accent: '#2f6f63' }));
  addInteract(grp, [3.2, P + 1.95, -3.8], 'Read poster · Income plan', () => showInfo(INFO.ledger), 2.2);
  poster(grp, -3.2, P + 1.95, -4 + WALL_T / 2 + 0.02, posterTex('READ', 'Library', ['Farming handbooks', 'Quran & Islamic studies', 'Stories & science']));
  const lampL = lamp(grp, 0, P + h - 0.03, 0);
  mesh(box(0.1, 0.16, 0.03), M.white, [-2.6, P + 1.3, 4 - WALL_T / 2 - 0.015], grp, { cast: false, solid: false });
  addInteract(grp, [-2.6, P + 1.3, 3.8], () => (lampL.on ? 'Switch the lights off' : 'Switch the lights on'), () => toggleLamp(lampL), 1.8);
}

{ // Cool store hut interior
  const grp = HUT.grp, F = 0.12;
  shelfUnit(grp, 0, F, -1.45, 0, 3.2, 1.9, 0.4, (g, y, w, d, lvl) => {
    for (let i = 0; i < 8; i++) {
      const x = -w / 2 + 0.25 + i * 0.38;
      if (lvl % 2) { shelfInst(g, G.cylLow, M.jar, x, y + 0.13, 0, [0.1, 0.24, 0.1]); shelfInst(g, G.cylLow, pick([M.mango, M.orange]), x, y + 0.09, 0, [0.085, 0.16, 0.085]); }
      else shelfInst(g, G.sphere, M.clay, x, y + 0.14, 0, [0.15, 0.14, 0.15]);
    }
  });
  // Zeer pots: a clay pot inside a bigger one, wet sand between keeps produce cool
  for (const [x, z] of [[-1.35, 0.6], [1.35, 0.6]]) {
    mesh(new THREE.CylinderGeometry(0.42, 0.32, 0.6, 18), M.clay, [x, F + 0.3, z], grp, { solid: true });
    mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.02, 18), M.soil, [x, F + 0.6, z], grp, { solid: false });
    for (let i = 0; i < 5; i++) inst(G.sphere, pick([M.mango, M.orange, M.greenFruit]), toWorld(grp, x + rr(-0.15, 0.15), F + 0.64, z + rr(-0.15, 0.15)), [0, 0, 0], 0.08);
  }
  for (let i = 0; i < 3; i++) inst(pick(G.blobs), M.sack, toWorld(grp, -1.4 + i * 0.4, F + 0.28, -0.6), [0, rand() * 6, 0], [0.24, 0.3, 0.2]);
  for (let i = 0; i < 4; i++) inst(G.box, i % 2 ? M.crate : M.crateGreen, toWorld(grp, 1.3, F + 0.18 + i * 0.35, -0.55), [0, 0, 0], [0.6, 0.34, 0.45]);
  const lampH = lamp(grp, 0, F + 2.6 - 0.03, 0, 10);
  addInteract(grp, [0, F + 1, -1.2], 'Look at the cool store', () => showInfo(INFO.coolStore), 2.6);
  addInteract(grp, [-1.35, F + 0.7, 0.6], 'Look inside the zeer pot', () => showInfo(INFO.coolStore), 1.6);
  void lampH;
}

// Outdoor info points for walk mode (mirrors the hotspots)
const infoPoint = (id, p, label, r = 3.5) => addInteract(null, p, label, () => showInfo(HOTSPOTS.find((h) => h.id === id)), r);
infoPoint('irrigation', [12, 2, -24], 'About water & irrigation', 4);
infoPoint('compost', [46, 1, -14], 'About the compost station', 3.5);
infoPoint('preserve', [-26, 1.2, -18], 'About the solar dryer', 3.2);
infoPoint('nursery', [-34, 1.2, 20], 'About the seedling nursery', 4.5);
addInteract(SIGN, [0, 1.9, 0.1], 'Read the school sign', () => showInfo(HOTSPOTS.find((h) => h.id === 'school')), 3);
for (const p of pickables) {
  const names = { mango: 'a mango', cashew: 'a cashew apple', orange: 'an orange' };
  addInteract(null, p.pos, `Pick ${names[p.kind]}`, () => pickFruit(p.kind), 2.6);
}

// Contact shadows for outdoor props, the cool store and everyone standing
{
  const R = (x, z, hw, hd, yaw, sp, st, o) => aoRect(x, z, hw, hd, yaw, sp, st, o);
  R(-6, 4, 0.6, 0.6, 0, 0.6, 0.4);                    // flag base
  R(9.2, 23.45, 1.05, 0.08, -0.4, 0.55, 0.3);         // school sign
  R(12, -24, 1.3, 1.3, 0, 1.3, 0.38);                 // water tower legs
  aoDisc(8, -24, 0.6, 0.3);                           // solar panel post
  R(46.5, -14.1, 3.3, 1.05, 0, 0.8, 0.42);            // compost bays
  R(-26, -18, 1.8, 0.8, 0.2, 0.7, 0.42);              // solar dryer
  R(-32, -17, 2.2, 1.9, 0, 1.0, 0.45);                // cool store hut
  R(-29, -15, 0.95, 0.25, 0, 0.4, 0.4);               // crates by the dryer
  R(-34.6, -17.7, 0.32, 1.15, 0, 0.4, 0.35);          // clay pots
  R(-34, 20, 3.0, 1.85, 0, 0.6, 0.36);                // nursery benches
  R(10, 9.8, 1.25, 0.08, 0, 0.5, 0.3);                // outdoor chalkboard
  for (let r = 0; r < 3; r++) R(10, 12 + r * 1.25, 1.7, 0.18, 0, 0.4, 0.34);
  R(-20, 18, 5.5, 4, 0, 1.0, 0.38);                   // dining slab
  for (const tz of [16.4, 19.6]) {
    R(-20, tz, 3, 0.5, 0, 0.45, 0.3, { y: 0.15 });
    for (const bs of [-1, 1]) R(-20, tz + bs * 0.85, 3, 0.15, 0, 0.3, 0.24, { y: 0.15 });
  }
  R(-16.4, 18, 0.5, 0.6, 0, 0.35, 0.3, { y: 0.15 });  // cooking station
  R(30.2, 30.5, 3.9, 1.1, 0, 0.9, 0.5);               // truck
  R(29.1, 22.8, 1.45, 0.6, 0, 0.5, 0.4);              // crate pile
  R(27.55, 24.2, 1.25, 0.3, 0, 0.4, 0.35);            // baskets
  // Cool store: occlusion along the inside wall bases
  const hg = HUT.grp, hx = 2 - WALL_T / 2, hz = 1.7 - WALL_T / 2, hy = 0.15;
  aoEdgeIn(hg, -hx, -hz, hx, -hz, 0, 1, 0.7, 0.34, hy);
  for (const [a0, a1] of runs(-hx, hx, [[-0.65, 0.65]])) aoEdgeIn(hg, a0, hz, a1, hz, 0, -1, 0.7, 0.34, hy);
  aoEdgeIn(hg, -hx, -hz, -hx, hz, 1, 0, 0.7, 0.34, hy);
  aoEdgeIn(hg, hx, -hz, hx, hz, -1, 0, 0.7, 0.34, hy);
  scene.updateMatrixWorld(true);
  for (const g of people) {
    if (!g.userData.legs.length || ['carry', 'seated', 'eat', 'read'].includes(g.userData.anim)) continue;
    const wp = g.getWorldPosition(new THREE.Vector3());
    aoDisc(wp.x, wp.z, 0.42 * g.scale.x, 0.42, { y: wp.y + (g.parent === scene ? 0.06 : 0.03) });
  }
  buildContactShadows();
}

flushBatches();
// Materials made after the envMapIntensity pass (doors, lamps, people, props)
// get the same eased sky light; tuned ones (floor, ceiling) keep their values.
scene.traverse((o) => { if (o.isMesh) for (const m of [].concat(o.material)) if (m && m.envMapIntensity === 1) m.envMapIntensity = 0.8; });
collectSolids();
scene.updateMatrixWorld(true);
for (const g of people) {
  if (g.userData.anim === 'carry') continue;
  const wp = g.getWorldPosition(new THREE.Vector3());
  posts.push({ x: wp.x, z: wp.z, r: 0.22 });
}
for (const d of doors) addInteract(d.anchor, d.local.toArray(), () => `${d.open ? 'Close' : 'Open'} door · ${d.name}`, () => toggleDoor(d), 2.4);
for (const it of interactables) { it.pos.copy(it.local); if (it.anchor) it.anchor.localToWorld(it.pos); }

// ---------------------------------------------------------------------------
// Shared motion language: one easing curve and one tempo for everything
// ---------------------------------------------------------------------------
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const damp = (cur, target, rate, dt) => cur + (target - cur) * (1 - Math.exp(-rate * dt));
const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));

function toggleDoor(d) {
  d.open = !d.open;
  d.from = d.a; d.to = d.open ? d.sign * 1.75 : 0; d.t = 0;
}
function updateDoors(dt) {
  for (const d of doors) {
    if (d.t < 1) {
      d.t = Math.min(1, d.t + dt / 0.7);
      d.a = d.from + (d.to - d.from) * ease(d.t);
      d.pivot.rotation.y = d.base + d.a;
      d.pivot.updateMatrixWorld(true);
    }
    d.box.setFromObject(d.leaf);
  }
}

function animatePeople(t, dt) {
  for (const g of people) {
    const u = g.userData, ph = u.phase;
    const [armL, armR] = u.arms;
    const look = Math.sin(t * 0.31 + ph) * 0.5 + Math.sin(t * 0.73 + ph * 2) * 0.2;
    u.torso.scale.y = 1 + Math.sin(t * 1.6 + ph) * 0.015;
    switch (u.anim) {
      case 'stand':
        u.head.rotation.y = look * 0.6;
        armL.rotation.x = Math.sin(t * 0.8 + ph) * 0.05;
        armR.rotation.x = -Math.sin(t * 0.8 + ph) * 0.05;
        break;
      case 'teach':
        g.rotation.y = u.baseRot + Math.sin(t * 0.35 + ph) * 0.3;
        armR.rotation.z = 1.55 + Math.sin(t * 1.1 + ph) * 0.22;
        armR.rotation.x = -0.35 + Math.sin(t * 0.55 + ph) * 0.15;
        armL.rotation.x = -0.25;
        u.head.rotation.y = look * 0.35;
        break;
      case 'seated': {
        u.head.rotation.y = look * 0.3;
        u.head.rotation.x = 0.1 + Math.sin(t * 0.5 + ph) * 0.07;
        const raise = THREE.MathUtils.smoothstep(Math.sin(t * 0.21 + ph * 3), 0.9, 0.98);
        armR.rotation.x = -0.9 - raise * 2.1;
        break;
      }
      case 'read':
        u.head.rotation.x = 0.4 + Math.sin(t * 0.4 + ph) * 0.05;
        u.head.rotation.y = Math.sin(t * 0.9 + ph) * 0.12;
        break;
      case 'eat': {
        const bite = Math.max(0, Math.sin(t * 1.2 + ph));
        armR.rotation.x = -0.9 - bite * bite * 0.9;
        u.head.rotation.x = 0.08 + bite * 0.06;
        u.head.rotation.y = look * 0.4;
        break;
      }
      case 'pick': {
        const reach = 0.5 + 0.5 * Math.sin(t * 1.1 + ph);
        armR.rotation.x = -2.3 - reach * 0.4;
        armL.rotation.x = -2.0 - (1 - reach) * 0.5;
        u.head.rotation.x = -0.35;
        u.head.rotation.y = Math.sin(t * 0.4 + ph) * 0.25;
        break;
      }
      case 'work': {
        const k = Math.sin(t * 2.2 + ph);
        armR.rotation.x = -0.75 + k * 0.15;
        armL.rotation.x = -0.75 - k * 0.15;
        u.head.rotation.x = 0.4;
        u.head.rotation.y = Math.sin(t * 0.3 + ph) * 0.2;
        break;
      }
      case 'stir':
        armR.rotation.x = -0.85 + Math.sin(t * 2) * 0.18;
        armR.rotation.z = Math.cos(t * 2) * 0.2;
        u.head.rotation.x = 0.3;
        break;
      case 'carry': {
        // 12 s loop: walk to the truck, set the crate down, walk back, pick up another
        const c = (((t + ph) / 12) % 1 + 1) % 1;
        let k, moving = true;
        if (c < 0.38) k = ease(c / 0.38);
        else if (c < 0.5) { k = 1; moving = false; }
        else if (c < 0.88) k = 1 - ease((c - 0.5) / 0.38);
        else { k = 0; moving = false; }
        const carrying = c < 0.43 || c > 0.94;
        const prev = g.position.clone();
        g.position.lerpVectors(u.a, u.b, k);
        const speed = prev.distanceTo(g.position) / Math.max(dt, 1e-3);
        u.stride += speed * dt * 3.2;
        g.position.y = height(g.position.x, g.position.z) + Math.abs(Math.sin(u.stride)) * 0.04 * Math.min(1, speed);
        const toB = Math.atan2(u.b.x - u.a.x, u.b.z - u.a.z);
        const heading = c < 0.5 ? toB : toB + Math.PI;
        g.rotation.y += wrapAngle(heading - g.rotation.y) * (1 - Math.exp(-dt * 5));
        const swing = Math.sin(u.stride) * 0.55 * Math.min(1, speed);
        u.legs[0].rotation.x = swing; u.legs[1].rotation.x = -swing;
        u.crate.visible = carrying;
        const armUp = carrying ? 1 : 0;
        u.lift = damp(u.lift ?? 1, armUp, 8, dt);
        armL.rotation.z = 2.7 * u.lift; armR.rotation.z = -2.7 * u.lift;
        armL.rotation.x = -swing * (1 - u.lift) * 0.8; armR.rotation.x = swing * (1 - u.lift) * 0.8;
        u.head.rotation.y = moving ? 0 : look * 0.4;
        break;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Hotspots and the info panel
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
function renderPanel(h) {
  document.getElementById('panelKicker').textContent = h.kicker;
  document.getElementById('panelTitle').textContent = h.title;
  document.getElementById('panelSummary').textContent = h.summary;
  document.getElementById('panelBody').innerHTML = h.sections.map((s) => `
    <h3>${s.h}${s.placeholder ? ' <span class="badge">Placeholder · team to finalize</span>' : ''}</h3>
    <ul>${s.items.map((t) => `<li>${t}</li>`).join('')}</ul>`).join('');
  panel.hidden = false;
  panel.scrollTop = 0;
}
function openHotspot(id, fly) {
  const h = HOTSPOTS.find((x) => x.id === id);
  if (!h) return;
  renderPanel(h);
  hideMenu();
  hsEls.forEach((x) => x.el.classList.toggle('active', x.h.id === id));
  if (fly) { if (mode === 'walk') leaveWalk(true); if (tourIdx >= 0) endTour(); flyTo(h.view); }
}
// Walk mode: show info without moving the camera; it closes when you walk away or press E.
function showInfo(h) {
  if (!h) return;
  renderPanel(h);
  walk.panelAt = camera.position.clone();
}
function closePanel() {
  panel.hidden = true;
  walk.panelAt = null;
  hsEls.forEach((x) => x.el.classList.remove('active'));
}
document.getElementById('panelClose').addEventListener('click', closePanel);

// ---------------------------------------------------------------------------
// Camera orientation, shared by Explore (fly) and Walk
// ---------------------------------------------------------------------------
const view = { yaw: 0, pitch: 0, yawT: 0, pitchT: 0 };
const _euler = new THREE.Euler();
function syncViewFromCamera() {
  _euler.setFromQuaternion(camera.quaternion, 'YXZ');
  view.yaw = view.yawT = _euler.y;
  view.pitch = view.pitchT = _euler.x;
}
camera.lookAt(new THREE.Vector3(...OVERVIEW.target));
syncViewFromCamera();

// ---------------------------------------------------------------------------
// Camera flights: duration scales with distance, same easing everywhere
// ---------------------------------------------------------------------------
let flight = null;
function flyTo(v, dur, onDone) {
  const p1 = new THREE.Vector3(...v.cam), t1 = new THREE.Vector3(...v.target);
  const fwd = camera.getWorldDirection(new THREE.Vector3());
  const t0 = camera.position.clone().addScaledVector(fwd, Math.max(6, p1.distanceTo(t1)));
  const dist = camera.position.distanceTo(p1) + t0.distanceTo(t1) * 0.3;
  flight = {
    t: 0, dur: dur ?? THREE.MathUtils.clamp(1 + dist / 70, 1.2, 2.4),
    p0: camera.position.clone(), p1, t0, t1,
    lift: dist > 30 ? Math.min(16, dist * 0.18) : 0,
    onDone,
  };
  fly.vel.set(0, 0, 0);
}
const _target = new THREE.Vector3();
function updateFlight(dt) {
  if (!flight) return;
  flight.t = Math.min(1, flight.t + dt / flight.dur);
  const k = ease(flight.t);
  camera.position.lerpVectors(flight.p0, flight.p1, k).y += Math.sin(Math.PI * k) * flight.lift;
  camera.lookAt(_target.lerpVectors(flight.t0, flight.t1, k));
  if (flight.t >= 1) {
    const done = flight.onDone;
    flight = null;
    syncViewFromCamera();
    done?.();
  }
}

// ---------------------------------------------------------------------------
// Explore mode: free-flying camera, like a spectator.
// Drag to look, WASD to fly where you look, Space/Shift up and down,
// scroll to glide forward, right-drag to pan. Speed scales with altitude.
// ---------------------------------------------------------------------------
const keys = new Set();
const capture = (e) => { try { canvas.setPointerCapture(e.pointerId); } catch { /* synthetic or already released */ } };
const fly = { vel: new THREE.Vector3(), pointers: new Map(), pinch: null, moved: 0 };
const _f = new THREE.Vector3(), _r = new THREE.Vector3(), _w = new THREE.Vector3();
const aboveGround = () => camera.position.y - height(camera.position.x, camera.position.z);
const typing = (e) => { const t = e?.target || document.activeElement; return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable); };

function updateExplore(dt) {
  view.yaw = damp(view.yaw, view.yawT, 20, dt);
  view.pitch = damp(view.pitch, view.pitchT, 20, dt);
  camera.rotation.set(view.pitch, view.yaw, 0, 'YXZ');
  const f = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
  const s = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
  const u = (keys.has('Space') || keys.has('KeyE') ? 1 : 0) - (keys.has('ShiftLeft') || keys.has('ShiftRight') || keys.has('KeyQ') ? 1 : 0);
  camera.getWorldDirection(_f);
  _r.set(Math.cos(view.yaw), 0, -Math.sin(view.yaw));
  _w.set(0, 0, 0).addScaledVector(_f, f).addScaledVector(_r, s);
  _w.y += u;
  if (_w.lengthSq() > 1) _w.normalize();
  const speed = THREE.MathUtils.clamp(8 + aboveGround() * 0.8, 8, 70);
  fly.vel.x = damp(fly.vel.x, _w.x * speed, 5, dt);
  fly.vel.y = damp(fly.vel.y, _w.y * speed, 5, dt);
  fly.vel.z = damp(fly.vel.z, _w.z * speed, 5, dt);
  const p = camera.position.addScaledVector(fly.vel, dt);
  p.x = THREE.MathUtils.clamp(p.x, -260, 260);
  p.z = THREE.MathUtils.clamp(p.z, -260, 260);
  p.y = THREE.MathUtils.clamp(p.y, height(p.x, p.z) + 0.8, 160);
}
function flyLook(dx, dy) {
  view.yawT -= dx * 0.0032;
  view.pitchT = THREE.MathUtils.clamp(view.pitchT - dy * 0.0032, -1.52, 1.52);
}
function flyPan(dx, dy) {
  const k = Math.max(3, aboveGround()) * 0.0018;
  _r.set(Math.cos(view.yaw), 0, -Math.sin(view.yaw));
  _f.set(-Math.sin(view.yaw), 0, -Math.cos(view.yaw));
  camera.position.addScaledVector(_r, -dx * k).addScaledVector(_f, dy * k);
}
function flyDolly(amount) {
  camera.getWorldDirection(_f);
  fly.vel.addScaledVector(_f, amount * THREE.MathUtils.clamp(aboveGround() * 0.012, 0.04, 1.4));
}
function exploreInput() {
  // First real movement dismisses the main menu and any guided tour
  if (!intro.hidden) hideMenu();
  if (tourIdx >= 0 && !flight) endTour();
}
const pinchInfo = () => {
  const ps = [...fly.pointers.values()];
  const cx = (ps[0].x + ps[1].x) / 2, cy = (ps[0].y + ps[1].y) / 2;
  return { cx, cy, spread: Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y) };
};
canvas.addEventListener('pointerdown', (e) => {
  if (mode === 'walk') return walkPointerDown(e);
  if (flight) return;
  capture(e);
  fly.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, button: e.button });
  fly.moved = 0;
  fly.pinch = fly.pointers.size === 2 ? pinchInfo() : null;
});
canvas.addEventListener('pointermove', (e) => {
  if (mode === 'walk') return walkPointerMove(e);
  const p = fly.pointers.get(e.pointerId);
  if (!p || flight) return;
  const dx = e.clientX - p.x, dy = e.clientY - p.y;
  p.x = e.clientX; p.y = e.clientY;
  fly.moved += Math.abs(dx) + Math.abs(dy);
  if (fly.moved > 4) exploreInput();
  if (fly.pointers.size >= 2) {
    const now = pinchInfo();
    if (fly.pinch) { flyDolly((now.spread - fly.pinch.spread) * 1.5); flyPan(now.cx - fly.pinch.cx, now.cy - fly.pinch.cy); }
    fly.pinch = now;
  } else if (p.button === 2 || p.button === 1) flyPan(dx, dy);
  else flyLook(dx, dy);
});
const endPointer = (e) => { fly.pointers.delete(e.pointerId); fly.pinch = fly.pointers.size === 2 ? pinchInfo() : null; walk.drag = null; };
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  if (mode !== 'explore' || flight) return;
  exploreInput();
  flyDolly(-e.deltaY * (e.deltaMode === 1 ? 16 : 1) * 0.6);
}, { passive: false });

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
  closePanel();
  hsEls.forEach((x) => x.el.classList.toggle('active', x.h.id === s.hotspot));
  tourEl.classList.remove('swap'); void tourEl.offsetWidth; tourEl.classList.add('swap');
  flyTo(s.view);
}
function startTour() {
  if (mode === 'walk') leaveWalk(true);
  hideMenu();
  tourEl.hidden = false;
  document.body.classList.add('touring');
  showTourStep(0);
  reflectMode();
}
function endTour() {
  if (tourIdx < 0) return;
  tourEl.hidden = true;
  tourIdx = -1;
  document.body.classList.remove('touring');
  hsEls.forEach((x) => x.el.classList.remove('active'));
  reflectMode();
}
document.getElementById('tourNext').addEventListener('click', () => (tourIdx === TOUR.length - 1 ? endTour() : showTourStep(tourIdx + 1)));
document.getElementById('tourPrev').addEventListener('click', () => showTourStep(tourIdx - 1));
document.getElementById('tourClose').addEventListener('click', endTour);

// ---------------------------------------------------------------------------
// Modes: Explore (default) and Walk, plus the main menu over the overview.
// Switching picks a sensible spot from wherever you are right now.
// ---------------------------------------------------------------------------
let mode = 'explore';
const intro = document.getElementById('intro');
const hint = document.getElementById('controlsHint');
const hud = document.getElementById('walkHud');
const promptEl = document.getElementById('prompt');
const coachEl = document.getElementById('coach');
const resumeEl = document.getElementById('resume');
const coarse = matchMedia('(pointer: coarse)').matches;
const HINTS = {
  explore: coarse
    ? 'Drag to look · Pinch or two-finger drag to move'
    : '<kbd>Drag</kbd> look <kbd>W A S D</kbd> fly <kbd>Space</kbd>/<kbd>Shift</kbd> up/down <kbd>Scroll</kbd> glide <kbd>F</kbd> walk here',
  walk: '<kbd>Mouse</kbd> look <kbd>W A S D</kbd> walk <kbd>Space</kbd> jump <kbd>E</kbd> use <kbd>F</kbd> fly <kbd>Esc</kbd> menu',
};
const COACH = {
  explore: '<b>Explore freely</b><span><kbd>Drag</kbd> to look around</span><span><kbd>W A S D</kbd> to fly where you look</span><span><kbd>Space</kbd> / <kbd>Shift</kbd> to rise and descend</span><span><kbd>F</kbd> to land and walk</span>',
  walk: '<b>Walk around</b><span><kbd>Mouse</kbd> to look, no clicking needed</span><span><kbd>W A S D</kbd> to walk · <kbd>Shift</kbd> to run · <kbd>Space</kbd> to jump</span><span><kbd>E</kbd> or <kbd>Click</kbd> to open doors, read and pick fruit</span><span><kbd>F</kbd> to fly · <kbd>Esc</kbd> for the main menu</span>',
  walkDrag: '<b>Walk around</b><span><kbd>Drag</kbd> to look around</span><span><kbd>W A S D</kbd> to walk · <kbd>Shift</kbd> to run · <kbd>Space</kbd> to jump</span><span><kbd>E</kbd> to open doors, read and pick fruit</span><span><kbd>F</kbd> to fly · <kbd>Esc</kbd> for the main menu</span>',
};
const coached = new Set();
let coachTimer = 0;
function coach(kind) {
  if (coached.has(kind)) return;
  coached.add(kind);
  coachEl.innerHTML = COACH[kind];
  coachEl.hidden = false;
  coachEl.classList.remove('out');
  clearTimeout(coachTimer);
  coachTimer = setTimeout(hideCoach, 7000);
}
function hideCoach() {
  if (coachEl.hidden || coachEl.classList.contains('out')) return;
  coachEl.classList.add('out');
  setTimeout(() => (coachEl.hidden = true), 450);
}
function reflectMode() {
  const shown = tourIdx >= 0 ? 'tour' : mode;
  document.body.dataset.mode = mode;
  document.body.classList.toggle('walking', mode === 'walk');
  document.body.classList.toggle('menu-open', !intro.hidden);
  document.querySelectorAll('.mode-btn[data-mode]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === shown)));
  hint.innerHTML = mode === 'walk' && walk.lockFailed ? HINTS.walk.replace('<kbd>Mouse</kbd>', '<kbd>Drag</kbd>') : HINTS[mode];
  hud.hidden = mode !== 'walk';
}
function showMenu() { intro.hidden = false; reflectMode(); }
function hideMenu() { if (intro.hidden) return; intro.hidden = true; reflectMode(); }
function nearOverview() { return camera.position.distanceTo(new THREE.Vector3(...OVERVIEW.cam)) < 25; }

// Esc from anywhere: back to the main menu over the overview, in Explore mode.
function goToMainMenu() {
  if (mode === 'walk') leaveWalk(true);
  endTour();
  closePanel();
  hideCoach();
  showMenu();
  if (!nearOverview() || flight) flyTo(OVERVIEW);
}
function explore() {
  if (mode === 'walk') { leaveWalk(false); return; }
  endTour();
  hideMenu();
  if (nearOverview()) flyTo({ cam: [-30, 22, 40], target: [6, 0, -2] });
  coach('explore');
}

// Where to land when switching to Walk: the ground you're looking at (a few
// steps short of it), or straight below you if you're already low.
function isFree(x, z, feetY) {
  for (const b of colliders()) {
    if (b.max.y <= feetY + STEP || b.min.y >= feetY + HEAD) continue;
    if (x > b.min.x - RAD && x < b.max.x + RAD && z > b.min.z - RAD && z < b.max.z + RAD) return false;
  }
  for (const c of posts) if (Math.hypot(x - c.x, z - c.z) < RAD + c.r) return false;
  return true;
}
function landingSpot() {
  const p = camera.position;
  const dir = camera.getWorldDirection(new THREE.Vector3());
  const h = Math.hypot(dir.x, dir.z) || 1;
  let x = p.x, z = p.z;
  if (aboveGround() > 4 && dir.y < -0.05) {
    for (let t = 0; t < 600; t += 0.5) {
      const qx = p.x + dir.x * t, qy = p.y + dir.y * t, qz = p.z + dir.z * t;
      if (qy <= height(qx, qz)) { x = qx - (dir.x / h) * 5; z = qz - (dir.z / h) * 5; break; }
    }
  }
  x = THREE.MathUtils.clamp(x, -80, 90);
  z = THREE.MathUtils.clamp(z, -80, 80);
  // Nudge outward in a spiral until there's room to stand
  for (let r = 0; r <= 8; r += 0.5) {
    const n = r === 0 ? 1 : Math.ceil(r * 6);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const cx = x + Math.cos(a) * r, cz = z + Math.sin(a) * r;
      const y = supportAt(cx, cz, height(cx, cz) + 0.45);
      if (isFree(cx, cz, y)) return { x: cx, y, z: cz, yaw: Math.atan2(-dir.x, -dir.z) };
    }
  }
  return { x, y: height(x, z), z, yaw: Math.atan2(-dir.x, -dir.z) };
}

function enterWalk() {
  if (mode === 'walk' || coarse) return;
  endTour();
  hideMenu();
  closePanel();
  mode = 'walk';
  keys.clear();
  walk.active = false;
  walk.paused = false;
  const spot = landingSpot();
  walk.feet.set(spot.x, spot.y, spot.z);
  walk.vel.set(0, 0, 0); walk.vy = 0; walk.grounded = true;
  requestLock();
  reflectMode();
  const eye = [spot.x, spot.y + EYE, spot.z];
  const ahead = [spot.x - Math.sin(spot.yaw) * 8, spot.y + EYE - 0.15, spot.z - Math.cos(spot.yaw) * 8];
  flyTo({ cam: eye, target: ahead }, undefined, () => {
    walk.yaw = view.yaw; walk.pitch = view.pitch;
    walk.eyeY = eye[1];
    walk.active = true;
    coach(walk.lockFailed ? 'walkDrag' : 'walk');
  });
}
function leaveWalk(silent) {
  if (mode !== 'walk') return;
  mode = 'explore';
  walk.active = false;
  walk.paused = false;
  keys.clear();
  closePanel();
  hideResume();
  if (document.pointerLockElement) { walk.releasing = true; document.exitPointerLock(); }
  syncViewFromCamera();
  reflectMode();
  if (silent) return;
  // Rise up and back from where you stood, still facing the same way
  const dir = new THREE.Vector3(-Math.sin(walk.yaw), 0, -Math.cos(walk.yaw));
  const at = camera.position.clone();
  const target = at.clone().addScaledVector(dir, 8).setY(walk.feet.y + 1);
  const cam = at.clone().addScaledVector(dir, -12).setY(walk.feet.y + 11);
  flyTo({ cam: cam.toArray(), target: target.toArray() });
  coach('explore');
}

// Pointer lock (walk mode): mouse-look without clicking
function requestLock() {
  if (walk.lockFailed || !canvas.requestPointerLock) return;
  try {
    const p = canvas.requestPointerLock();
    if (p && p.catch) p.catch(onLockError);
  } catch { onLockError(); }
}
function onLockError() {
  if (mode !== 'walk') return;
  if (walk.everLocked) { showResume(); return; } // browsers refuse an instant re-lock; ask for a click
  walk.lockFailed = true;
  reflectMode();
}
function showResume() { if (mode === 'walk' && !walk.lockFailed) { resumeEl.hidden = false; walk.paused = true; keys.clear(); } }
function hideResume() { resumeEl.hidden = true; if (mode === 'walk') walk.paused = false; }
resumeEl.addEventListener('click', () => { hideResume(); requestLock(); });
document.addEventListener('pointerlockchange', () => {
  walk.locked = document.pointerLockElement === canvas;
  if (walk.locked) { walk.everLocked = true; hideResume(); return; }
  if (walk.releasing) { walk.releasing = false; return; }
  if (mode !== 'walk' || walk.holdLock) return;
  // Esc releases the mouse: treat it as "back to the main menu". Losing focus (alt-tab) just pauses.
  if (document.hasFocus()) goToMainMenu();
  else showResume();
});
document.addEventListener('pointerlockerror', onLockError);

// Hooks for other modules (comments): free the mouse without leaving Walk, then pick it back up.
function releasePointer() {
  if (mode !== 'walk') return;
  walk.paused = true;
  keys.clear();
  if (document.pointerLockElement) { walk.releasing = true; document.exitPointerLock(); }
}
function resumeWalk() {
  if (mode !== 'walk') return;
  walk.paused = false;
  requestLock();
}

// Buttons
document.getElementById('startTour').addEventListener('click', startTour);
document.getElementById('freeExplore').addEventListener('click', explore);
document.getElementById('menuWalk').addEventListener('click', enterWalk);
document.getElementById('btnTour').addEventListener('click', startTour);
document.getElementById('btnExplore').addEventListener('click', explore);
document.getElementById('btnWalk').addEventListener('click', enterWalk);
document.getElementById('btnMenu').addEventListener('click', goToMainMenu);
document.getElementById('hudMenu').addEventListener('click', goToMainMenu);
if (coarse) { document.getElementById('btnWalk').hidden = true; document.getElementById('menuWalk').hidden = true; }

// Keyboard
addEventListener('keydown', (e) => {
  if (e.defaultPrevented || typing(e)) return;
  if (e.code === 'Escape') { goToMainMenu(); return; }
  if (e.code === 'KeyF' && !e.repeat && !flight) { mode === 'walk' ? leaveWalk(false) : enterWalk(); return; }
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  if (mode === 'walk') {
    if (walk.paused) return;
    if (e.code === 'Space' && !e.repeat) walk.jumpQueued = true;
    if (e.code === 'KeyE' && !e.repeat) interact();
    hideCoachSoon();
  } else if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyE', 'KeyQ', 'ShiftLeft', 'ShiftRight'].includes(e.code)) {
    exploreInput();
    hideCoachSoon();
  }
  keys.add(e.code);
});
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('blur', () => keys.clear());
function hideCoachSoon() { clearTimeout(coachTimer); coachTimer = setTimeout(hideCoach, 2500); }

// ---------------------------------------------------------------------------
// Walk mode: physics, collisions and interactions
// ---------------------------------------------------------------------------
const EYE = 1.62, RAD = 0.28, STEP = 0.42, GRAV = 22, JUMP = 7.4, HEAD = 1.8;
const walk = {
  active: false, paused: false, locked: false, lockFailed: false, everLocked: false, releasing: false, holdLock: false,
  yaw: 0, pitch: 0, keys, drag: null,
  feet: new THREE.Vector3(), vel: new THREE.Vector3(), vy: 0, grounded: true, eyeY: 0, bob: 0, jumpQueued: false,
  focus: null, panelAt: null,
};
function walkPointerDown(e) {
  if (!walk.active || walk.paused) return;
  if (walk.locked) { if (e.button === 0) interact(); return; }
  if (!walk.lockFailed) { requestLock(); return; }
  walk.drag = { x: e.clientX, y: e.clientY };
  capture(e);
}
function walkPointerMove(e) {
  if (!walk.active || walk.locked || !walk.drag) return;
  walk.yaw -= (e.clientX - walk.drag.x) * 0.004;
  walk.pitch = THREE.MathUtils.clamp(walk.pitch - (e.clientY - walk.drag.y) * 0.004, -1.35, 1.35);
  walk.drag = { x: e.clientX, y: e.clientY };
}
canvas.addEventListener('mousemove', (e) => {
  if (mode !== 'walk' || !walk.active || walk.paused || !walk.locked) return;
  walk.yaw -= e.movementX * 0.0022;
  walk.pitch = THREE.MathUtils.clamp(walk.pitch - e.movementY * 0.0022, -1.35, 1.35);
});

// Collision helpers: boxes block the body unless they're low enough to step onto.
function* colliders() { yield* solids; for (const d of doors) yield d.box; }
function supportAt(x, z, feetY) {
  let g = height(x, z);
  const r = 0.16;
  for (const b of colliders()) {
    if (b.max.y > feetY + STEP || b.max.y <= g) continue;
    if (x < b.min.x - r || x > b.max.x + r || z < b.min.z - r || z > b.max.z + r) continue;
    g = b.max.y;
  }
  return g;
}
function pushOut(p, feetY) {
  const lo = feetY + STEP, hi = feetY + HEAD;
  for (const b of colliders()) {
    if (b.max.y <= lo || b.min.y >= hi) continue;
    if (p.x < b.min.x - RAD || p.x > b.max.x + RAD || p.z < b.min.z - RAD || p.z > b.max.z + RAD) continue;
    const cx = Math.min(Math.max(p.x, b.min.x), b.max.x), cz = Math.min(Math.max(p.z, b.min.z), b.max.z);
    const dx = p.x - cx, dz = p.z - cz, d2 = dx * dx + dz * dz;
    if (d2 >= RAD * RAD) continue;
    if (d2 > 1e-9) {
      const d = Math.sqrt(d2), k = (RAD - d) / d;
      p.x += dx * k; p.z += dz * k;
    } else {
      const l = p.x - b.min.x, r = b.max.x - p.x, n = p.z - b.min.z, f = b.max.z - p.z, m = Math.min(l, r, n, f);
      if (m === l) p.x = b.min.x - RAD; else if (m === r) p.x = b.max.x + RAD; else if (m === n) p.z = b.min.z - RAD; else p.z = b.max.z + RAD;
    }
  }
  if (feetY > height(p.x, p.z) + 2.5) return;
  for (const c of posts) {
    const dx = p.x - c.x, dz = p.z - c.z, rr2 = RAD + c.r, d2 = dx * dx + dz * dz;
    if (d2 < rr2 * rr2 && d2 > 1e-9) { const d = Math.sqrt(d2); p.x = c.x + (dx / d) * rr2; p.z = c.z + (dz / d) * rr2; }
  }
}
function ceilingAt(x, z, feetY) {
  let c = Infinity;
  for (const b of colliders()) {
    if (b.min.y <= feetY + STEP || b.min.y >= c) continue;
    if (x < b.min.x - RAD * 0.7 || x > b.max.x + RAD * 0.7 || z < b.min.z - RAD * 0.7 || z > b.max.z + RAD * 0.7) continue;
    c = b.min.y;
  }
  return c;
}

function updateWalk(dt) {
  const k = walk.keys, f = walk.feet;
  const run = k.has('ShiftLeft') || k.has('ShiftRight');
  let fwd = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
  let side = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
  if (walk.paused) fwd = side = 0;
  const len = Math.hypot(fwd, side) || 1;
  const fx = -Math.sin(walk.yaw), fz = -Math.cos(walk.yaw);
  const speed = run ? 7.5 : 3.8;
  const wx = ((fx * fwd - fz * side) / len) * speed, wz = ((fz * fwd + fx * side) / len) * speed;
  const accel = walk.grounded ? 12 : 3;
  walk.vel.x = damp(walk.vel.x, wx, accel, dt);
  walk.vel.z = damp(walk.vel.z, wz, accel, dt);

  if (walk.jumpQueued && walk.grounded) { walk.vy = JUMP; walk.grounded = false; }
  walk.jumpQueued = false;
  walk.vy -= GRAV * dt;

  const steps = Math.max(1, Math.ceil((Math.hypot(walk.vel.x, walk.vel.z) * dt) / 0.12));
  for (let i = 0; i < steps; i++) {
    f.x += (walk.vel.x * dt) / steps;
    f.z += (walk.vel.z * dt) / steps;
    pushOut(f, f.y);
  }
  f.x = THREE.MathUtils.clamp(f.x, -90, 100);
  f.z = THREE.MathUtils.clamp(f.z, -90, 90);

  const wasGrounded = walk.grounded;
  f.y += walk.vy * dt;
  const ceil = ceilingAt(f.x, f.z, f.y);
  if (f.y + HEAD > ceil) { f.y = ceil - HEAD; walk.vy = Math.min(walk.vy, 0); }
  const sup = supportAt(f.x, f.z, f.y);
  if (f.y <= sup || (wasGrounded && walk.vy <= 0 && f.y - sup < STEP)) {
    f.y = sup; walk.vy = 0; walk.grounded = true;
  } else walk.grounded = false;

  // Camera: smooth out step-ups, gentle head bob while walking
  const hs = Math.hypot(walk.vel.x, walk.vel.z);
  walk.eyeY = walk.grounded ? damp(walk.eyeY, f.y + EYE, 16, dt) : f.y + EYE;
  if (walk.grounded) walk.bob += dt * hs * 2.1;
  const amp = walk.grounded ? Math.min(1, hs / 4) : 0;
  camera.position.set(f.x, walk.eyeY + Math.sin(walk.bob * 2) * 0.035 * amp, f.z);
  camera.rotation.set(walk.pitch, walk.yaw, Math.sin(walk.bob) * 0.004 * amp, 'YXZ');
  fovTarget = run && hs > 4 ? 68 : 62;

  // Info panels close once you walk away from what you were reading
  if (walk.panelAt && camera.position.distanceTo(walk.panelAt) > 4) closePanel();
  updateFocus();
}

const _fwd = new THREE.Vector3(), _to = new THREE.Vector3();
function updateFocus() {
  camera.getWorldDirection(_fwd);
  let best = null, bestScore = -Infinity;
  for (const it of interactables) {
    _to.subVectors(it.pos, camera.position);
    const d = _to.length();
    if (d > it.r) continue;
    const dot = _to.dot(_fwd) / (d || 1);
    if (dot < 0.8 && d > 1) continue;
    const score = dot * 2 - d * 0.35;
    if (score > bestScore) { bestScore = score; best = it; }
  }
  walk.focus = best;
  const label = walk.panelAt ? 'Close' : best ? (typeof best.label === 'function' ? best.label() : best.label) : '';
  promptEl.hidden = !label;
  if (label) promptEl.querySelector('span').textContent = label;
  hud.classList.toggle('aim', !!best && !walk.panelAt);
}
function interact() {
  if (!walk.active) return;
  if (walk.panelAt) { closePanel(); return; }
  walk.focus?.act();
}

// Harvest basket: pick fruit in the orchard, then load the truck or share it at lunch
const basket = { mango: 0, orange: 0, cashew: 0 };
let sold = 0;
const basketEl = document.getElementById('basket');
const basketCount = () => basket.mango + basket.orange + basket.cashew;
function renderBasket() {
  const n = basketCount();
  basketEl.hidden = !n;
  basketEl.innerHTML = `<b>Basket</b> ${basket.mango ? `${basket.mango} mango` : ''}${basket.cashew ? ` · ${basket.cashew} cashew` : ''}${basket.orange ? ` · ${basket.orange} orange` : ''}`.replace('</b>  · ', '</b> ');
  basketEl.classList.remove('bump'); void basketEl.offsetWidth; basketEl.classList.add('bump');
}
function pickFruit(kind) {
  if (basketCount() >= 12) { toast('Your basket is full. Take it to the truck by the road, or to the community tables.'); return; }
  basket[kind]++;
  renderBasket();
  if (basketCount() === 1) toast('Picked! Load fruit onto the truck to sell it, or share it at the community tables.');
}
function clearBasket() { basket.mango = basket.orange = basket.cashew = 0; renderBasket(); }

const toastEl = document.getElementById('toast');
let toastTimer = 0;
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.hidden = false;
  toastEl.classList.remove('show'); void toastEl.offsetWidth; toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (toastEl.hidden = true), 3600);
}

// ---------------------------------------------------------------------------
// Picking points in the world (used by comments)
// ---------------------------------------------------------------------------
const raycaster = new THREE.Raycaster();
const _ndc = new THREE.Vector2();
function terrainHit(ray, max = 600) {
  for (let t = 0; t < max; t += 0.5) {
    const q = ray.at(t, new THREE.Vector3());
    if (q.y <= height(q.x, q.z)) return q.setY(height(q.x, q.z));
  }
  return null;
}
// World point under a screen position: buildings, trees, people or ground.
function pickPoint(clientX, clientY, maxDist = 400) {
  _ndc.set((clientX / innerWidth) * 2 - 1, -(clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(_ndc, camera);
  raycaster.far = maxDist;
  const roots = scene.children.filter((o) => !o.userData.noPick && !o.isLight);
  const hit = raycaster.intersectObjects(roots, true).find((h) => h.object.visible && !h.object.userData.noPick);
  if (hit) return hit.point.clone();
  const q = terrainHit(raycaster.ray, maxDist);
  return q;
}
// Walk mode: what the crosshair is on (or a spot just ahead of you).
function aimPoint(maxDist = 30) {
  const p = pickPoint(innerWidth / 2, innerHeight / 2, maxDist);
  if (p) return p;
  const dir = camera.getWorldDirection(new THREE.Vector3()).setY(0).normalize();
  const q = camera.position.clone().addScaledVector(dir, 4);
  return q.setY(height(q.x, q.z));
}
// Fly the camera to look at a world point (switches to Explore if needed).
function flyToPoint(p, dist = 12) {
  if (mode === 'walk') leaveWalk(true);
  endTour();
  hideMenu();
  const from = camera.position.clone().sub(p).setY(0);
  if (from.lengthSq() < 1) from.set(0, 0, 1);
  from.normalize().multiplyScalar(dist);
  const cam = p.clone().add(from).setY(Math.max(p.y + dist * 0.5, height(p.x + from.x, p.z + from.z) + 2));
  flyTo({ cam: cam.toArray(), target: p.toArray() });
}

// ---------------------------------------------------------------------------
// Loop
// ---------------------------------------------------------------------------
const clock = new THREE.Clock();
const tmp = new THREE.Vector3();
let fovTarget = 50;
function updateHotspots() {
  const w = innerWidth, h = innerHeight;
  for (const { el, v } of hsEls) {
    tmp.copy(v).project(camera);
    const visible = mode !== 'walk' && tmp.z < 1 && Math.abs(tmp.x) < 1.1 && Math.abs(tmp.y) < 1.1;
    el.classList.toggle('off', !visible);
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
  updateDoors(dt);
  if (!flight) {
    if (mode === 'walk') { if (walk.active) updateWalk(dt); }
    else { updateExplore(dt); fovTarget = 50; }
  }
  if (Math.abs(camera.fov - fovTarget) > 0.01) { camera.fov = damp(camera.fov, fovTarget, 5, dt); camera.updateProjectionMatrix(); }
  animatePeople(t, dt);
  if (FLAG) FLAG.rotation.y = Math.sin(t * 1.4) * 0.12 + Math.sin(t * 3.1) * 0.04;
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

initComments({
  THREE, scene, camera, canvas, height,
  getMode: () => mode, isWalkActive: () => mode === 'walk' && walk.active,
  pickPoint, aimPoint, flyToPoint, releasePointer, resumeWalk, toast, typing,
  // Walk mode: make a world point usable with E / click. Returns a function that removes it.
  addInteract: (pos, label, act, r = 3) => {
    const it = { anchor: null, local: pos.clone(), pos: pos.clone(), label, act, r };
    interactables.push(it);
    return () => { const i = interactables.indexOf(it); if (i >= 0) interactables.splice(i, 1); };
  },
});

if (location.search.includes('debug')) window.__dbg = { walk, view, camera, doors, interactables, solids, enterWalk, leaveWalk, goToMainMenu, get mode() { return mode; } };

reflectMode();
animate();
requestAnimationFrame(() => document.getElementById('loader').classList.add('done'));
