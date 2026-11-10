// Guided path: one lit objective at a time. The current step of the chosen
// role gets a beacon in the world, a label and distance, a floor trail in Walk
// mode, a screen-edge arrow when it is out of view, and a card on arrival that
// says what to do there. Completed stops get a checkpoint flag.
const TRAIL_MAX = 160;

function h(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'text') e.textContent = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v === true) e.setAttribute(k, '');
    else if (v !== false && v != null) e.setAttribute(k, v);
  }
  e.append(...kids.filter((x) => x != null));
  return e;
}

export function initQuest(ctx) {
  const { THREE, scene, camera, roles } = ctx;
  const coarse = matchMedia('(pointer: coarse)').matches;

  // ----- World objects -----
  const mango = 0xff8a1f;
  const beacon = new THREE.Group();
  const colGeo = new THREE.CylinderGeometry(0.55, 1.1, 22, 24, 1, true);
  colGeo.translate(0, 11, 0);
  const colMat = new THREE.MeshBasicMaterial({ color: mango, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
  const column = new THREE.Mesh(colGeo, colMat);
  const ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 0.82, 0.22), transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.5, 2.0, 48).rotateX(-Math.PI / 2), ringMat);
  const ring2 = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.7, 32).rotateX(-Math.PI / 2), ringMat.clone());
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.9, 1.7, 1.35) }));
  orb.position.y = 3.2;
  beacon.add(column, ring, ring2, orb);
  beacon.visible = false;
  beacon.userData.noPick = true;
  beacon.traverse((o) => { o.userData.noPick = true; o.raycast = () => {}; });
  scene.add(beacon);

  // Floor trail: chevrons from the player to the target (Walk mode)
  const chev = new THREE.BufferGeometry();
  chev.setAttribute('position', new THREE.Float32BufferAttribute([
    -0.3, 0, 0.28, 0, 0, -0.32, 0, 0, 0.04,
    0, 0, 0.04, 0, 0, -0.32, 0.3, 0, 0.28,
  ], 3));
  chev.computeVertexNormals();
  const trail = new THREE.InstancedMesh(chev, new THREE.MeshBasicMaterial({ color: mango, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -8, polygonOffsetUnits: -8 }), TRAIL_MAX);
  trail.count = 0;
  trail.visible = false;
  trail.frustumCulled = false;
  trail.userData.noPick = true; trail.raycast = () => {};
  trail.renderOrder = 3;
  scene.add(trail);

  // Checkpoint flags for finished stops
  const flags = new THREE.Group();
  flags.userData.noPick = true;
  scene.add(flags);
  const flagPole = new THREE.CylinderGeometry(0.035, 0.035, 1.6, 8), flagCloth = new THREE.PlaneGeometry(0.55, 0.34);
  const poleMat = new THREE.MeshStandardMaterial({ color: 0xf1ece0, roughness: 0.6 }), clothMat = new THREE.MeshStandardMaterial({ color: 0x1f6b45, roughness: 0.8, side: THREE.DoubleSide });
  const flagged = new Set();
  function plantFlag(id, p) {
    if (flagged.has(id)) return;
    flagged.add(id);
    const g = new THREE.Group();
    const pole = new THREE.Mesh(flagPole, poleMat); pole.position.y = 0.8;
    const cloth = new THREE.Mesh(flagCloth, clothMat); cloth.position.set(0.3, 1.4, 0);
    g.add(pole, cloth);
    g.position.set(p.x + 0.9, ctx.groundAt(p.x + 0.9, p.z + 0.6), p.z + 0.6);
    g.traverse((o) => { o.userData.noPick = true; o.raycast = () => {}; });
    flags.add(g);
  }

  // ----- HTML -----
  const hudKicker = h('small'), hudTitle = h('b'), hudDist = h('span', { class: 'quest-dist' });
  const hudGo = h('button', { class: 'quest-go', type: 'button', text: 'Take me there', onclick: () => takeMeThere() });
  const hud = h('div', { class: 'quest-hud', hidden: true, role: 'status' },
    h('i', { class: 'quest-hud-icon', 'aria-hidden': 'true', text: '◆' }), h('div', { class: 'quest-hud-text' }, hudKicker, hudTitle), hudDist, hudGo);
  const label = h('div', { class: 'quest-label', hidden: true });
  const edge = h('div', { class: 'quest-edge', hidden: true, 'aria-hidden': 'true' }, h('i', { text: '➤' }), h('span'));
  const cardKicker = h('p', { class: 'eyebrow' }), cardTitle = h('h3'), cardText = h('p', { class: 'quest-card-text' }), cardDo = h('p', { class: 'quest-do' });
  const cardNext = h('button', { class: 'btn primary', type: 'button', text: 'Got it', onclick: () => hideCard() });
  const cardAct = h('button', { class: 'btn primary', type: 'button', hidden: true, onclick: () => { ctx.stepAction?.(step); } });
  const card = h('section', { class: 'quest-card card', hidden: true, role: 'dialog', 'aria-label': 'Checkpoint' },
    h('button', { class: 'close', type: 'button', 'aria-label': 'Close', text: '×', onclick: () => hideCard() }),
    cardKicker, cardTitle, cardText, cardDo, h('div', { class: 'quest-card-actions' }, cardAct, cardNext));
  document.body.append(hud, label, edge, card);

  // ----- State -----
  let step = null, target = null, arrivedId = null, lastTrailFrom = new THREE.Vector3(1e9, 0, 1e9), cardTimer = 0, lastWalk = null;
  const _v = new THREE.Vector3(), _p = new THREE.Vector3(), _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(1, 1, 1), _e = new THREE.Euler();

  function resolve(at) {
    if (!at) return null;
    if (Array.isArray(at)) return new THREE.Vector3(at[0], at[1] ?? 1, at[2]);
    if (at === 'tree') {
      const t = ctx.trees.find((x) => !(ctx.sponsorFunded(x.id)?.share >= 0.999)) || ctx.trees[0];
      return t ? new THREE.Vector3(t.x, 1, t.z) : null;
    }
    if (at.interact) {
      const near = at.near ? new THREE.Vector3(...at.near) : null;
      const hits = ctx.interactables.filter((it) => { const l = typeof it.label === 'function' ? it.label() : it.label; return typeof l === 'string' && l.includes(at.interact); });
      if (!hits.length) return null;
      const it = near ? hits.reduce((a, b) => (a.pos.distanceTo(near) <= b.pos.distanceTo(near) ? a : b)) : hits[0];
      return it.pos.clone();
    }
    return null;
  }

  function retarget() {
    const prev = step;
    step = roles.role ? roles.current() : null;
    target = step ? resolve(step.at) : null;
    if (step !== prev) arrivedId = null;
    const list = roles.steps();
    const idx = step ? list.indexOf(step) : -1;
    beacon.visible = !!target;
    if (target) { beacon.position.set(target.x, ctx.groundAt(target.x, target.z), target.z); lastTrailFrom.set(1e9, 0, 1e9); }
    trail.visible = false; trail.count = 0;
    hud.hidden = !step;
    document.body.classList.toggle('questing', !!step);
    if (step) {
      hudKicker.textContent = `${target ? 'Go to' : 'Next'} · ${idx + 1} of ${list.length}`;
      const prog = step.count ? ` (${roles.progress(step)}/${step.count})` : '';
      hudTitle.textContent = step.label + prog;
      hudGo.hidden = !target || ctx.getMode() === 'tour';
      hudGo.textContent = ctx.getMode() === 'walk' ? 'Walk me there' : 'Take me there';
      hudDist.hidden = !target;
    }
    if (!step && roles.role && prev) {
      // Path complete
      hud.hidden = false; hudKicker.textContent = 'Path complete'; hudTitle.textContent = `${list.length} of ${list.length} done`; hudDist.hidden = true; hudGo.hidden = true;
      setTimeout(() => { if (!step) hud.hidden = true; }, 6000);
    }
    label.hidden = true; edge.hidden = true;
  }

  function showCard(s, done) {
    const list = roles.steps(), idx = list.indexOf(s);
    cardKicker.textContent = done ? `Checkpoint ${idx + 1} of ${list.length} · done` : `Checkpoint ${idx + 1} of ${list.length}`;
    cardTitle.textContent = s.title || s.label;
    cardText.textContent = s.text || '';
    if (done) {
      const nxt = roles.current();
      cardDo.textContent = nxt ? `Next: ${nxt.label}. Follow the light.` : 'That was the last stop. Well done.';
      cardNext.textContent = nxt ? 'Next →' : 'Finish';
    } else {
      cardDo.textContent = s.do ? `→ ${s.do}` : '';
      cardNext.textContent = 'Got it';
    }
    // Direct action for reading steps, so nobody has to find the exact spot to aim at
    const direct = !done && (s.event === 'hotspot' || s.event === 'info' || s.event === 'sponsor' || s.event === 'tour' || s.event === 'fund');
    cardAct.hidden = !direct;
    if (direct) cardAct.textContent = s.event === 'sponsor' ? 'Sponsor this tree →' : s.event === 'tour' ? 'Start the tour →' : s.event === 'fund' ? 'Fund the tank →' : 'Read it now →';
    cardNext.classList.toggle('primary', !direct);
    card.hidden = false;
    card.classList.remove('in'); void card.offsetWidth; card.classList.add('in');
    clearTimeout(cardTimer);
    cardTimer = setTimeout(hideCard, done ? 7000 : 14000);
  }
  function hideCard() { card.hidden = true; clearTimeout(cardTimer); }

  function takeMeThere() {
    if (!target) return;
    ctx.hideMenu();
    if (ctx.getMode() === 'walk') { ctx.walkTo(target, step?.label || ''); hideCard(); return; }
    ctx.flyToPoint(target.clone().setY(target.y + 1), 16);
  }

  // Completion from the roles tracker: plant a flag, show the done card, move on
  let doneIds = new Set();
  roles.onChange(() => {
    const list = roles.steps();
    for (const s of list) {
      if (!roles.isDone(s) || doneIds.has(s.id)) continue;
      doneIds.add(s.id);
      const p = resolve(s.at);
      if (p) { plantFlag(s.id, p); ctx.juice?.burst(p.clone().setY(ctx.groundAt(p.x, p.z) + 1), 0x1f6b45, 20, 2.2); }
      if (!s.welcome) ctx.juice?.sfx.step();
      if (s === step || !step) showCard(s, true);
    }
    retarget();
  });
  // Steps already done before this session (reload): flag them silently
  for (const s of roles.steps()) if (roles.isDone(s)) { doneIds.add(s.id); const p = resolve(s.at); if (p) plantFlag(s.id, p); }
  retarget();

  // ----- Per frame -----
  function rebuildTrail(from) {
    const dx = target.x - from.x, dz = target.z - from.z, len = Math.hypot(dx, dz);
    const ux = dx / len, uz = dz / len;
    const yaw = Math.atan2(-ux, -uz);
    _q.setFromEuler(_e.set(0, yaw, 0));
    let n = 0;
    for (let d = 2.2; d < len - 1.6 && n < TRAIL_MAX; d += 1.7) {
      const x = from.x + ux * d, z = from.z + uz * d;
      _p.set(x, ctx.groundAt(x, z) + 0.07, z);
      _m.compose(_p, _q, _s);
      trail.setMatrixAt(n++, _m);
    }
    trail.count = n;
    trail.instanceMatrix.needsUpdate = true;
    trail.visible = n > 0;
  }

  function update(dt, t) {
    if (!step) return;
    const walking = ctx.getMode() === 'walk';
    if (walking !== lastWalk) { lastWalk = walking; hudGo.hidden = !target || ctx.getMode() === 'tour'; hudGo.textContent = walking ? 'Walk me there' : 'Take me there'; }
    if (!target) { beacon.visible = false; trail.visible = false; label.hidden = true; edge.hidden = true; return; }
    // Beacon animation
    beacon.visible = !document.body.classList.contains('cinematic');
    const pulse = 0.5 + 0.5 * Math.sin(t * 2.4);
    colMat.opacity = 0.11 + 0.09 * pulse;
    ring.scale.setScalar(1 + 0.18 * pulse);
    ringMat.opacity = 0.9 - 0.5 * pulse;
    ring2.rotation.y = t * 0.8;
    orb.position.y = 3.2 + Math.sin(t * 1.6) * 0.25;
    column.rotation.y = t * 0.2;

    // Where the player is
    const me = walking && ctx.isWalkActive() ? ctx.feet() : camera.position;
    const dist = Math.hypot(me.x - target.x, me.z - target.z);
    hudDist.textContent = `${Math.round(dist)} m`;

    // Trail in Walk mode, rebuilt when you have moved a little
    if (walking && ctx.isWalkActive()) {
      if (me.distanceTo(lastTrailFrom) > 1.2) { lastTrailFrom.copy(me); if (dist > 4) rebuildTrail(me); else { trail.count = 0; trail.visible = false; } }
    } else { trail.visible = false; }

    // Label over the beacon, or an arrow at the screen edge when it is out of view
    _v.set(target.x, beacon.position.y + 4.2, target.z).project(camera);
    const behind = _v.z > 1;
    const onScreen = !behind && Math.abs(_v.x) < 0.95 && Math.abs(_v.y) < 0.9;
    if (onScreen) {
      label.hidden = false; edge.hidden = true;
      label.textContent = `${step.label} · ${Math.round(dist)} m`;
      label.style.transform = `translate(${(_v.x * 0.5 + 0.5) * innerWidth}px, ${(-_v.y * 0.5 + 0.5) * innerHeight}px)`;
    } else {
      label.hidden = true; edge.hidden = false;
      let x = _v.x, y = _v.y;
      if (behind) { x = -x; y = -y; }
      if (!Number.isFinite(x) || !Number.isFinite(y) || (x === 0 && y === 0)) { x = 0; y = -1; }
      const k = 0.9 / Math.max(Math.abs(x), Math.abs(y), 1e-6);
      const ex = x * k, ey = y * k;
      const px = (ex * 0.5 + 0.5) * innerWidth, py = (-ey * 0.5 + 0.5) * innerHeight;
      const ang = Math.atan2(-ey, ex);
      edge.style.transform = `translate(${px}px, ${py}px)`;
      edge.firstChild.style.transform = `rotate(${ang}rad)`;
      edge.lastChild.textContent = `${step.label} · ${Math.round(dist)} m`;
    }

    // Arrival
    const r = step.r || 4;
    const arrived = walking ? dist < r : (dist < r * 2 + 4 && camera.position.y - ctx.groundAt(camera.position.x, camera.position.z) < 18);
    if (arrived && arrivedId !== step.id) {
      arrivedId = step.id;
      if (step.event === 'arrive') ctx.emit('arrive', step.id);
      else showCard(step, false);
    }
  }

  // Inside the current checkpoint's circle (Walk mode)
  function near() {
    if (!step || !target) return false;
    const me = ctx.feet();
    return Math.hypot(me.x - target.x, me.z - target.z) < (step.r || 4) + 1;
  }
  function start() {
    retarget();
    if (step && target) ctx.toast?.(`Follow the light to your first stop: ${step.label}.`);
  }

  return { update, retarget, start, near, get step() { return step; }, get target() { return target; }, hideCard };
}
