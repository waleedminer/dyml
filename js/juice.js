// Game feel: particle bursts, floating "+1" text, and small synthesized sounds
// for picking, loading, answering and finishing. Two switches, both remembered:
// "Reduce motion" (also follows the system setting) and "Sound".
const KEYS = { motion: 'wos.motion', sound: 'wos.sound' };
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage blocked */ } },
};

export function initJuice(ctx) {
  const { THREE, scene, camera } = ctx;
  const sysReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let reduced = store.get(KEYS.motion, null) ?? sysReduced;
  let sound = store.get(KEYS.sound, true) !== false;
  document.body.classList.toggle('reduce-motion', !!reduced);

  // ----- Particles: one instanced pool -----
  const N = 96;
  const geo = new THREE.SphereGeometry(0.09, 6, 5);
  const mat = new THREE.MeshBasicMaterial({ vertexColors: false, color: 0xffffff, transparent: true, opacity: 0.95, depthWrite: false });
  const pool = new THREE.InstancedMesh(geo, mat, N);
  pool.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  pool.frustumCulled = false;
  pool.userData.noPick = true; pool.raycast = () => {};
  pool.count = 0;
  scene.add(pool);
  const parts = [];
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _c = new THREE.Color();
  function burst(pos, color = 0xff8a1f, n = 18, speed = 2.6) {
    if (reduced) return;
    for (let i = 0; i < n && parts.length < N; i++) {
      const a = Math.random() * Math.PI * 2, el = Math.random() * 1.1 + 0.2, sp = speed * (0.5 + Math.random());
      parts.push({ p: new THREE.Vector3(pos.x, pos.y, pos.z), v: new THREE.Vector3(Math.cos(a) * Math.cos(el) * sp, Math.sin(el) * sp, Math.sin(a) * Math.cos(el) * sp), life: 0, max: 0.8 + Math.random() * 0.5, color: new THREE.Color(color).offsetHSL((Math.random() - 0.5) * 0.04, 0, (Math.random() - 0.5) * 0.2), s: 0.7 + Math.random() * 0.8 });
    }
  }

  // ----- Floating text -----
  const floats = [];
  const layer = document.createElement('div');
  layer.className = 'float-layer';
  document.body.append(layer);
  function floatText(pos, text, cls = '') {
    if (reduced) return;
    const el = document.createElement('div');
    el.className = `float-text ${cls}`;
    el.textContent = text;
    layer.append(el);
    floats.push({ el, p: new THREE.Vector3(pos.x, pos.y, pos.z), t: 0, max: 1.3 });
  }

  // ----- Sound: a tiny synth, created on first use (needs a gesture) -----
  let ac = null, master = null;
  function audio() {
    if (!sound) return null;
    if (!ac) {
      try { ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.gain.value = 0.35; master.connect(ac.destination); } catch { return null; }
    }
    if (ac.state === 'suspended') ac.resume().catch(() => {});
    return ac;
  }
  function tone({ freq = 440, type = 'sine', dur = 0.18, gain = 0.5, slide = 0, at = 0 }) {
    const a = audio(); if (!a) return;
    const t0 = a.currentTime + at;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq * slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + dur + 0.02);
  }
  const vary = (f) => f * (0.9 + Math.random() * 0.2);
  const sfx = {
    pick: () => { tone({ freq: vary(880), type: 'triangle', dur: 0.16, gain: 0.35 }); tone({ freq: vary(1320), type: 'sine', dur: 0.12, gain: 0.18, at: 0.05 }); },
    step: () => { [523, 659, 784].forEach((f, i) => tone({ freq: f, type: 'triangle', dur: 0.22, gain: 0.3, at: i * 0.09 })); },
    right: () => { tone({ freq: 660, type: 'triangle', dur: 0.14, gain: 0.3 }); tone({ freq: 990, type: 'triangle', dur: 0.2, gain: 0.3, at: 0.1 }); },
    wrong: () => { tone({ freq: 220, type: 'sine', dur: 0.22, gain: 0.3, slide: 0.7 }); },
    load: () => { tone({ freq: 110, type: 'sawtooth', dur: 0.3, gain: 0.22 }); tone({ freq: 165, type: 'sawtooth', dur: 0.3, gain: 0.2, at: 0.02 }); },
    honk: () => { tone({ freq: 196, type: 'sawtooth', dur: 0.32, gain: 0.25 }); tone({ freq: 247, type: 'sawtooth', dur: 0.32, gain: 0.25 }); },
    done: () => { [523, 659, 784, 1047].forEach((f, i) => tone({ freq: f, type: 'triangle', dur: 0.35, gain: 0.3, at: i * 0.11 })); },
    tap: () => { tone({ freq: vary(1200), type: 'sine', dur: 0.05, gain: 0.12 }); },
  };

  // ----- Per frame -----
  function update(dt) {
    let k = 0;
    for (let i = parts.length - 1; i >= 0; i--) {
      const q = parts[i];
      q.life += dt;
      if (q.life >= q.max) { parts.splice(i, 1); continue; }
      q.v.y -= 7 * dt; q.v.multiplyScalar(1 - 1.8 * dt);
      q.p.addScaledVector(q.v, dt);
      const f = 1 - q.life / q.max;
      _s.setScalar(q.s * (0.4 + 0.6 * f));
      _m.compose(q.p, _q, _s);
      pool.setMatrixAt(k, _m);
      pool.setColorAt(k, _c.copy(q.color));
      k++;
    }
    pool.count = k;
    if (k) { pool.instanceMatrix.needsUpdate = true; if (pool.instanceColor) pool.instanceColor.needsUpdate = true; }
    for (let i = floats.length - 1; i >= 0; i--) {
      const f = floats[i];
      f.t += dt;
      if (f.t >= f.max) { f.el.remove(); floats.splice(i, 1); continue; }
      _p.copy(f.p).project(camera);
      const k2 = f.t / f.max;
      f.el.style.transform = `translate(${(_p.x * 0.5 + 0.5) * innerWidth}px, ${(-_p.y * 0.5 + 0.5) * innerHeight - k2 * 70}px) translate(-50%, -50%) scale(${1 + 0.25 * Math.sin(Math.min(1, k2 * 4) * Math.PI)})`;
      f.el.style.opacity = String(_p.z > 1 ? 0 : 1 - Math.max(0, (k2 - 0.6) / 0.4));
    }
  }

  function setReduced(v) { reduced = !!v; store.set(KEYS.motion, reduced); document.body.classList.toggle('reduce-motion', reduced); }
  function setSound(v) { sound = !!v; store.set(KEYS.sound, sound); if (sound) audio(); }

  return { burst, floatText, sfx, update, setReduced, setSound, get reduced() { return reduced; }, get sound() { return sound; } };
}
