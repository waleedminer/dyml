// Cinematic intro: an automated camera flight through the model with captions.
// The camera follows a Catmull-Rom path between beats with a speed ramp per
// leg (slow in, fast through, slow out), the field of view stretches with
// speed, and each beat holds on a slow drift or an orbit while a caption reads.
// Skippable at any time (button, Esc, Space or Enter).
import { TUTORIAL } from './data.js';

const KEY = 'wos.intro.seen';
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage blocked */ } },
};

// Speed ramps: position along the leg as a function of time (0..1).
const RAMPS = {
  inout: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  whip: (t) => (t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2),
  glide: (t) => { const a = t * t * (3 - 2 * t); return 0.35 * t + 0.65 * a; },
  out: (t) => 1 - Math.pow(1 - t, 3),
  in: (t) => t * t * t,
};
const smooth = (t) => t * t * (3 - 2 * t);
// Peak slope of a ramp, so speed can be normalised to 0..1 for the FOV stretch
const peak = {};
for (const [k, f] of Object.entries(RAMPS)) {
  let m = 0;
  for (let i = 1; i < 200; i++) m = Math.max(m, (f(i / 200) - f((i - 1) / 200)) * 200);
  peak[k] = m;
}

// Key handling is registered at import time so it runs ahead of other modules'
// capture listeners (comments, roles) while the intro plays.
let current = null;
addEventListener('keydown', (e) => current?.onKey(e), { capture: true });

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

export function initTutorial(ctx) {
  const { THREE, camera } = ctx;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ----- Overlay -----
  const root = el('div', 'tut');
  root.hidden = true;
  const barTop = el('div', 'tut-bar top'), barBot = el('div', 'tut-bar bottom');
  const cap = el('div', 'tut-cap');
  const tag = el('span', 'tut-tag'), title = el('h2', 'tut-title'), text = el('p', 'tut-text');
  cap.append(tag, title, text);
  const progress = el('div', 'tut-progress');
  const fill = el('div', 'tut-fill');
  const ticks = el('div', 'tut-ticks');
  progress.append(fill, ticks);
  const skip = el('button', 'tut-skip');
  skip.type = 'button';
  skip.innerHTML = 'Skip intro <kbd>Esc</kbd>';
  const steps = el('div', 'tut-steps');
  const brand = el('div', 'tut-brand');
  brand.innerHTML = '<span class="brand-mark" aria-hidden="true">◆</span> Waqf Orchard School';
  root.append(barTop, barBot, brand, cap, progress, steps, skip);
  document.body.append(root);

  // ----- State -----
  let playing = false, present = false;
  let beats = [], legs = [];
  let time = 0, total = 0;
  let onDone = null;
  let capIdx = -1;
  let uiState = null;
  const _p = new THREE.Vector3(), _t = new THREE.Vector3(), _a = new THREE.Vector3(), _b = new THREE.Vector3();

  // Build the timeline: for each beat a leg (travel) and a hold.
  function build() {
    beats = TUTORIAL.map((b) => ({ ...b }));
    legs = [];
    let at = 0;
    let prevCam = new THREE.Vector3(...beats[0].cam), prevTarget = new THREE.Vector3(...beats[0].target);
    beats.forEach((b, i) => {
      const cam = new THREE.Vector3(...b.cam), target = new THREE.Vector3(...b.target);
      let curve = null, lookCurve = null;
      if (i > 0 && b.travel > 0) {
        const pts = [prevCam.clone(), ...(b.via || []).map((v) => new THREE.Vector3(...v)), cam.clone()];
        curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5);
        if (b.look !== 'ahead') lookCurve = { from: prevTarget.clone(), to: target.clone() };
      }
      const leg = { beat: b, index: i, start: at, travel: i > 0 ? b.travel : 0, hold: b.hold, curve, lookCurve, cam, target, ramp: RAMPS[b.ramp] || RAMPS.inout, rampKey: b.ramp || 'inout' };
      leg.end = at + leg.travel + leg.hold;
      legs.push(leg);
      at = leg.end;
      // Where this beat ends (after drift or orbit) is where the next leg starts
      if (b.orbit) {
        const o = cam.clone().sub(target);
        o.applyAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(b.orbit));
        prevCam = target.clone().add(o); prevTarget = target.clone();
      } else if (b.drift) {
        prevCam = new THREE.Vector3(...b.drift.cam); prevTarget = new THREE.Vector3(...b.drift.target);
      } else { prevCam = cam.clone(); prevTarget = target.clone(); }
    });
    total = at;
    ticks.replaceChildren(...legs.slice(1).map((l) => { const t = el('i'); t.style.left = `${(l.start / total) * 100}%`; return t; }));
    steps.replaceChildren(...legs.map((l) => el('i', 'tut-step')));
  }

  function showCaption(i) {
    if (capIdx === i) return;
    capIdx = i;
    const b = beats[i];
    cap.classList.remove('in'); void cap.offsetWidth;
    tag.textContent = b.tag; title.textContent = b.title; text.textContent = b.text;
    cap.classList.add('in');
    steps.querySelectorAll('.tut-step').forEach((s, k) => s.classList.toggle('on', k <= i));
    setUI(b.ui, b);
  }
  function setUI(kind, b) {
    if (uiState === kind) return;
    document.body.classList.remove('tut-hotspots', 'tut-modebar', 'tut-tree');
    if (uiState === 'tree') ctx.sponsorHover?.(null, true);
    uiState = kind;
    if (!kind) return;
    document.body.classList.add(`tut-${kind}`);
    if (kind === 'tree') ctx.sponsorHover?.(ctx.treeById?.(b.tree) || null, true);
  }

  // Pose the camera for a moment in time
  function pose(t) {
    const leg = legs.find((l) => t < l.end) || legs[legs.length - 1];
    const { beat: b } = leg;
    let fov = 50;
    if (leg.travel > 0 && t < leg.start + leg.travel) {
      const k = THREE.MathUtils.clamp((t - leg.start) / leg.travel, 0, 1);
      const u = leg.ramp(k);
      leg.curve.getPointAt(u, _p);
      camera.position.copy(_p);
      // Look: either the blend of the two beat targets or a point ahead on the path,
      // settling onto the beat's target over the last stretch of the leg.
      if (leg.lookCurve) _t.lerpVectors(leg.lookCurve.from, leg.lookCurve.to, smooth(k));
      else {
        leg.curve.getPointAt(Math.min(1, u + 0.06), _a);
        _a.y -= 0.6;
        const settle = smooth(THREE.MathUtils.clamp((k - 0.72) / 0.28, 0, 1));
        _t.lerpVectors(_a, leg.target, settle);
      }
      camera.lookAt(_t);
      // Speed ramp read-out: faster travel widens the lens
      const e = 0.004;
      const speed = (leg.ramp(Math.min(1, k + e)) - leg.ramp(Math.max(0, k - e))) / (2 * e) / peak[leg.rampKey];
      fov = 50 + 17 * THREE.MathUtils.clamp(speed, 0, 1) * (leg.curve.getLength() > 25 ? 1 : 0.5);
      if (k > 0.7) showCaption(leg.index);
    } else {
      const k = THREE.MathUtils.clamp((t - leg.start - leg.travel) / leg.hold, 0, 1);
      if (b.orbit) {
        _a.copy(leg.cam).sub(leg.target);
        _a.applyAxisAngle(_b.set(0, 1, 0), THREE.MathUtils.degToRad(b.orbit) * (0.12 * k + 0.88 * smooth(k)));
        camera.position.copy(leg.target).add(_a);
        camera.lookAt(leg.target);
      } else if (b.drift) {
        const s = 0.25 * k + 0.75 * smooth(k);
        camera.position.lerpVectors(leg.cam, _a.set(...b.drift.cam), s);
        camera.lookAt(_t.lerpVectors(leg.target, _b.set(...b.drift.target), s));
      } else { camera.position.copy(leg.cam); camera.lookAt(leg.target); }
      showCaption(leg.index);
    }
    if (Math.abs(camera.fov - fov) > 0.05) { camera.fov += (fov - camera.fov) * 0.18; camera.updateProjectionMatrix(); }
    fill.style.transform = `scaleX(${t / total})`;
  }

  function update(dt) {
    if (!playing) return;
    time += dt;
    if (time >= total) { finish(false); return; }
    pose(time);
  }

  function play({ onDone: cb } = {}) {
    if (playing) return;
    if (reduced) { store.set(KEY, '1'); cb?.({ skipped: true }); return; }
    build();
    onDone = cb;
    playing = true;
    time = 0; capIdx = -1; uiState = null;
    root.hidden = false;
    root.classList.remove('out'); void root.offsetWidth; root.classList.add('in');
    document.body.classList.add('cinematic');
    ctx.beginCinematic(update);
    camera.fov = 50; camera.updateProjectionMatrix();
    pose(0);
    skip.focus({ preventScroll: true });
  }
  // Jump to the start of the next / previous beat (clicker in presentation mode)
  function step(dir) {
    if (!playing) return false;
    const i = legs.findIndex((l) => time < l.end);
    const cur = i < 0 ? legs.length - 1 : i;
    const next = cur + dir;
    if (next >= legs.length) { finish(false); return true; }
    if (next < 0) { time = 0; } else time = legs[next].start + (dir < 0 && next === cur ? 0 : 0.001);
    capIdx = -1;
    pose(time);
    return true;
  }
  function finish(skipped) {
    if (!playing) return;
    playing = false;
    store.set(KEY, '1');
    setUI(null);
    root.classList.remove('in'); root.classList.add('out');
    document.body.classList.remove('cinematic');
    // Leave the camera on the overview the menu expects
    const last = legs[legs.length - 1];
    camera.position.copy(last.cam); camera.lookAt(last.target);
    camera.fov = 50; camera.updateProjectionMatrix();
    ctx.endCinematic();
    setTimeout(() => { root.hidden = true; }, 500);
    const cb = onDone; onDone = null;
    cb?.({ skipped });
  }

  skip.addEventListener('click', () => finish(true));
  current = { onKey(e) {
    if (!playing) return;
    if (present && e.code === 'PageDown') { e.preventDefault(); e.stopImmediatePropagation(); step(1); }
    else if (present && e.code === 'PageUp') { e.preventDefault(); e.stopImmediatePropagation(); step(-1); }
    else if (e.code === 'Escape' || (!present && ['Space', 'Enter'].includes(e.code))) { e.preventDefault(); e.stopImmediatePropagation(); finish(true); }
    else if (!e.metaKey && !e.ctrlKey) e.stopImmediatePropagation();
  } };
  // Any press on the scene while the intro runs skips it, like a game's "press any key"
  root.addEventListener('pointerdown', (e) => { if (e.target === root || e.target.classList.contains('tut-bar')) finish(true); });

  return {
    play, step,
    setPresent(v) { present = !!v; skip.innerHTML = present ? 'Skip intro <kbd>Esc</kbd> · next <kbd>PgDn</kbd>' : 'Skip intro <kbd>Esc</kbd>'; },
    get playing() { return playing; },
    seen: () => store.get(KEY) === '1',
    reset: () => store.set(KEY, ''),
  };
}
