// Tree sponsorship (waqf). Every long-term tree in the orchard can be
// sponsored whole or in shares, named after the sponsor, and carries a plaque
// in the model. Records live in Supabase (public.tree_sponsors); when that
// table is unreachable, pledges are kept in this browser so the demo still works.
import { SPONSOR } from './data.js';
import { getSupabase } from './supabase.js';

const KEYS = { name: 'wos.comments.name', local: 'wos.sponsors.local' };
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage blocked */ } },
};
const params = new URLSearchParams(location.search);
const MOCK = params.has('mockSponsors') || params.has('mockComments');
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()));
const money = (n) => `${SPONSOR.currency}${Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

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

// ----- Backends -----
async function supabaseBackend() {
  const sb = await getSupabase();
  const cols = 'id,created_at,tree_id,kind,sponsor,dedication,message,amount,share,show_name';
  return {
    kind: 'supabase',
    async list() {
      const { data, error } = await sb.from('tree_sponsors').select(cols).order('created_at', { ascending: true }).limit(5000);
      if (error) throw error;
      return data || [];
    },
    async insert(row) {
      const { data, error } = await sb.from('tree_sponsors').insert(row).select(cols).single();
      if (error) throw error;
      return data;
    },
    subscribe(fn) {
      try {
        const ch = sb.channel('tree-sponsors-live')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tree_sponsors' }, (p) => p?.new && fn(p.new))
          .subscribe();
        return () => sb.removeChannel(ch);
      } catch { return () => {}; }
    },
  };
}
function localBackend() {
  let rows = store.get(KEYS.local, null);
  if (!Array.isArray(rows)) { rows = []; store.set(KEYS.local, rows); }
  const subs = new Set();
  addEventListener('storage', (e) => {
    if (e.key !== KEYS.local) return;
    const next = store.get(KEYS.local, []);
    if (!Array.isArray(next)) return;
    const have = new Set(rows.map((r) => r.id));
    rows = next;
    next.filter((r) => !have.has(r.id)).forEach((r) => subs.forEach((fn) => fn(r)));
  });
  return {
    kind: 'local',
    async list() { return rows.slice(); },
    async insert(row) {
      const saved = { ...row, id: uuid(), created_at: new Date().toISOString() };
      rows.push(saved); store.set(KEYS.local, rows);
      return saved;
    },
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
  };
}

export function initSponsor(ctx) {
  const { THREE, scene, camera, trees } = ctx;
  const byId = new Map(trees.map((t) => [t.id, t]));
  const rows = new Map(); // id -> row
  const funded = new Map(); // tree id -> { amount, share, sponsors: [] }
  let backend = null, status = 'loading';
  let hover = null, pinned = false;
  let open = null; // tree in the card
  let fromWalk = false;

  // ----- Scene: hover ring and plaques -----
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.82, 1, 48).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xf2a541, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide }),
  );
  ring.visible = false; ring.userData.noPick = true; ring.raycast = () => {}; ring.renderOrder = 2;
  scene.add(ring);
  const plaques = new THREE.Group();
  plaques.userData.noPick = true;
  scene.add(plaques);
  const plaqueMeshes = new Map();
  const wood = new THREE.MeshStandardMaterial({ color: 0x5b4330, roughness: 0.9 });
  const post = new THREE.BoxGeometry(0.08, 1.25, 0.08), board = new THREE.BoxGeometry(1.25, 0.58, 0.05);

  function plaqueTexture(tree, f) {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 240;
    const g = c.getContext('2d');
    g.fillStyle = '#f6efe2'; g.fillRect(0, 0, 512, 240);
    g.strokeStyle = '#b5643a'; g.lineWidth = 10; g.strokeRect(12, 12, 488, 216);
    g.fillStyle = '#9c522c'; g.font = '600 24px Inter, system-ui, sans-serif'; g.textAlign = 'center';
    g.fillText((f.share >= 1 ? 'WAQF · SPONSORED BY' : `WAQF · ${Math.round(f.share * 100)}% SPONSORED BY`).toUpperCase(), 256, 62);
    const names = f.sponsors.filter((s) => s.show_name !== false).map((s) => s.sponsor);
    const line = names.length > 2 ? `${names.slice(0, 2).join(', ')} +${names.length - 2}` : names.join(' & ') || 'Anonymous';
    let size = 56;
    g.fillStyle = '#0f2e1f'; g.font = `700 ${size}px 'Bricolage Grotesque', Arial, sans-serif`;
    while (g.measureText(line).width > 460 && size > 26) { size -= 4; g.font = `700 ${size}px 'Bricolage Grotesque', Arial, sans-serif`; }
    g.fillText(line, 256, 140);
    const ded = f.sponsors.map((s) => s.dedication).filter(Boolean)[0];
    g.fillStyle = '#5b625b'; g.font = "italic 24px 'Instrument Sans', Arial, sans-serif";
    g.fillText(ded ? ded.slice(0, 40) : `${SPONSOR.kinds[tree.kind].label} · ${tree.label}`, 256, 196);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }
  function renderPlaque(tree) {
    const f = funded.get(tree.id);
    let grp = plaqueMeshes.get(tree.id);
    if (!f) { if (grp) { plaques.remove(grp); plaqueMeshes.delete(tree.id); } return; }
    if (!grp) {
      grp = new THREE.Group();
      const p = new THREE.Mesh(post, wood); p.position.y = 0.62; p.castShadow = true;
      const b = new THREE.Mesh(board, [wood, wood, wood, wood, new THREE.MeshStandardMaterial({ roughness: 0.8 }), wood]);
      b.position.y = 1.3; b.castShadow = true;
      grp.add(p, b);
      grp.userData.board = b;
      // Stand the sign at the edge of the mulch ring, on the side facing the road (+z)
      const px = tree.x + 0.35, pz = tree.z + tree.r * 0.55 + 0.6;
      grp.position.set(px, ctx.height(px, pz), pz);
      grp.rotation.y = 0.35;
      grp.scale.setScalar(0.001);
      grp.userData.pop = 0;
      plaques.add(grp);
      plaqueMeshes.set(tree.id, grp);
    }
    const b = grp.userData.board;
    b.material[4].map?.dispose();
    b.material[4].map = plaqueTexture(tree, f);
    b.material[4].needsUpdate = true;
  }

  // ----- Hover -----
  const tip = h('div', { class: 'tree-tip', hidden: true, role: 'status' });
  document.body.append(tip);
  const _v = new THREE.Vector3();
  function setHover(tree, pin = false) {
    if (pin) pinned = !!tree; else if (pinned) return;
    hover = tree;
    ring.visible = !!tree;
    tip.hidden = !tree;
    document.body.classList.toggle('tree-hover', !!tree);
    if (!tree) return;
    ring.position.set(tree.x, ctx.height(tree.x, tree.z) + 0.1, tree.z);
    ring.scale.setScalar(tree.r * 1.3);
    const f = funded.get(tree.id);
    const k = SPONSOR.kinds[tree.kind];
    tip.innerHTML = `<b>${k.label}</b><span>${tree.label}</span>${f ? `<em>${f.share >= 1 ? 'Sponsored' : `${Math.round(f.share * 100)}% funded`} · ${f.sponsors.filter((s) => s.show_name !== false).map((s) => s.sponsor).join(', ') || 'Anonymous'}</em>` : '<em>Not yet sponsored</em>'}<i>${pin ? 'Click to sponsor' : f && f.share >= 1 ? 'Click to see the plaque' : 'Click to sponsor this tree'}</i>`;
  }

  // ----- Card -----
  const eyebrow = h('p', { class: 'eyebrow', text: 'Sponsor a tree · waqf' });
  const title = h('h2');
  const statusEl = h('div', { class: 'sp-status' });
  const why = h('p', { class: 'sp-why' });
  const years = h('p', { class: 'sp-years' });
  const covers = h('ul', { class: 'sp-covers' });
  const costTable = h('table', { class: 'sp-cost' });
  const comparable = h('p', { class: 'sp-comparable', text: SPONSOR.comparable });
  const receives = h('ul', { class: 'sp-receives' }, ...SPONSOR.receives.map((r) => h('li', { text: r })));
  const jariyah = h('p', { class: 'sp-jariyah', text: SPONSOR.jariyah });
  const costToggle = h('button', { class: 'linklike sp-cost-toggle', type: 'button', text: 'What the price covers', onclick: () => { const open = costTable.hidden; costTable.hidden = !open; comparable.hidden = !open; costToggle.textContent = open ? 'Hide the breakdown' : 'What the price covers'; } });
  costTable.hidden = true; comparable.hidden = true;
  const shareBtns = h('div', { class: 'sp-shares', role: 'radiogroup', 'aria-label': 'How much of the tree' });
  const custom = h('input', { type: 'number', min: '5', max: '100000', step: '1', inputmode: 'numeric', placeholder: 'Other', 'aria-label': 'Other amount' });
  const name = h('input', { type: 'text', maxlength: '40', autocomplete: 'name', placeholder: 'e.g. The Bangura family', required: true });
  const dedication = h('input', { type: 'text', maxlength: '80', placeholder: 'e.g. In memory of my grandmother, or for Amina' });
  const message = h('textarea', { rows: '2', maxlength: '280', placeholder: 'A note for the students who tend this tree (optional)' });
  const showName = h('input', { type: 'checkbox', checked: true });
  const err = h('p', { class: 'cm-error', hidden: true, role: 'alert' });
  const submit = h('button', { type: 'submit', class: 'btn primary sp-submit' });
  const form = h('form', { class: 'sp-form', novalidate: true },
    h('p', { class: 'sp-label', text: 'How much of the tree' }), shareBtns,
    h('div', { class: 'sp-custom' }, h('span', { text: SPONSOR.currency }), custom),
    h('label', { class: 'cm-field' }, h('span', { text: 'Name on the plaque' }), name),
    h('label', { class: 'cm-field' }, h('span', { text: 'On behalf of, or in memory of (optional)' }), dedication),
    h('label', { class: 'cm-field' }, h('span', { text: 'Message (optional)' }), message),
    h('label', { class: 'sp-check' }, showName, h('span', { text: 'Show my name on the tree in the 3D model' })),
    err,
    h('div', { class: 'cm-actions' }, h('button', { type: 'button', class: 'btn', text: 'Not now', onclick: () => close() }), submit),
    h('p', { class: 'sp-label', text: 'What you receive' }), receives,
    h('p', { class: 'sp-fine', text: 'Prices are prototype estimates pending local quotes. The update cadence and the donation page are being confirmed with the Foundation.' }),
  );
  const thanks = h('div', { class: 'sp-thanks', hidden: true });
  const card = h('section', { class: 'sp-card card', role: 'dialog', 'aria-label': 'Sponsor a tree', hidden: true },
    h('button', { class: 'close', type: 'button', 'aria-label': 'Close', text: '×', onclick: () => close() }),
    eyebrow, title, statusEl, why, years, jariyah, costToggle, costTable, comparable, covers, form, thanks,
  );
  document.body.append(card);

  let share = 1, amount = 0, tier = null;
  // Trees a "row" tier would cover: this tree plus the next unsponsored trees of the same kind
  const rowTrees = (tree, n) => [tree, ...trees.filter((t) => t !== tree && t.kind === tree.kind && !(funded.get(t.id)?.share >= 0.999))].slice(0, n);
  function renderShares(tree) {
    const price = SPONSOR.kinds[tree.kind].price;
    const f = funded.get(tree.id);
    const left = Math.max(0, 1 - (f ? f.share : 0));
    shareBtns.replaceChildren(...SPONSOR.tiers.map((t) => {
      const n = t.trees || 1;
      const disabled = n === 1 ? t.share > left + 1e-6 : rowTrees(tree, n).length < n || left < 0.999;
      return h('button', { type: 'button', role: 'radio', class: `sp-share${t.default ? ' is-default' : ''}`, 'aria-checked': 'false', disabled, onclick: () => setTier(t, price) },
        h('b', { text: t.label }), h('span', { text: money(price * t.share * n) }), t.default ? h('i', { text: 'Most chosen' }) : null);
    }));
    const def = [...shareBtns.children].find((b, i) => SPONSOR.tiers[i].default && !b.disabled) || [...shareBtns.children].find((b) => !b.disabled);
    if (def) def.click(); else setTier(null, price);
  }
  function setTier(t, price) {
    tier = t; share = t ? t.share : 0; amount = t ? Math.round(price * t.share * (t.trees || 1)) : 0;
    custom.value = '';
    [...shareBtns.children].forEach((b, i) => b.setAttribute('aria-checked', String(SPONSOR.tiers[i] === t)));
    submit.textContent = `${SPONSOR.url ? 'Continue to donate' : 'Pledge'} ${money(amount)} →`;
  }
  custom.addEventListener('input', () => {
    const v = Number(custom.value);
    if (!(v > 0)) return;
    const price = SPONSOR.kinds[open.kind].price;
    tier = null; amount = Math.round(v); share = Math.min(1, amount / price);
    [...shareBtns.children].forEach((b) => b.setAttribute('aria-checked', 'false'));
    submit.textContent = `${SPONSOR.url ? 'Continue to donate' : 'Pledge'} ${money(amount)} →`;
  });

  function renderStatus(tree) {
    const f = funded.get(tree.id), k = SPONSOR.kinds[tree.kind];
    if (!f) { statusEl.innerHTML = `<span class="sp-pill">Not yet sponsored</span><span class="sp-price">${money(k.price)} for the whole tree</span>`; return; }
    const pct = Math.min(100, Math.round(f.share * 100));
    const names = f.sponsors.filter((s) => s.show_name !== false).map((s) => s.sponsor);
    statusEl.innerHTML = `<div class="sp-bar"><i style="width:${pct}%"></i></div><span class="sp-pill ${pct >= 100 ? 'full' : ''}">${pct >= 100 ? 'Fully sponsored' : `${pct}% funded`}</span><span class="sp-price">${names.length ? `by ${names.join(', ')}` : 'by an anonymous sponsor'}${f.sponsors.length > names.length ? ` and ${f.sponsors.length - names.length} more` : ''}</span>`;
  }
  function openCard(tree) {
    if (!tree) return;
    open = tree;
    const k = SPONSOR.kinds[tree.kind];
    title.textContent = `${k.label} · ${tree.label}`;
    why.textContent = k.why;
    years.textContent = k.years;
    covers.replaceChildren();
    costTable.replaceChildren(...k.cost.map(([l, v]) => h('tr', {}, h('td', { text: l }), h('td', { text: money(v) }))), h('tr', { class: 'sp-cost-total' }, h('td', { text: 'One tree' }), h('td', { text: money(k.price) })));
    costTable.hidden = true; comparable.hidden = true; costToggle.textContent = 'What the price covers';
    renderStatus(tree);
    const f = funded.get(tree.id);
    const full = f && f.share >= 0.999;
    form.hidden = !!full;
    thanks.hidden = true;
    if (full) {
      thanks.hidden = false;
      thanks.replaceChildren(
        h('b', { text: 'This tree already carries a name' }),
        h('p', { text: f.sponsors.map((s) => s.message).filter(Boolean)[0] || 'Thank you to its sponsors. Pick another tree in the block to add yours.' }),
        h('button', { class: 'btn primary', type: 'button', text: 'Find a tree to sponsor', onclick: () => { close(); const t = trees.find((x) => !funded.has(x.id)); if (t) { ctx.flyToTree(t); setHover(t, true); } } }),
      );
    } else {
      renderShares(tree);
      name.value = name.value || String(store.get(KEYS.name, '') ?? '').slice(0, 40);
      err.hidden = true;
    }
    setHover(tree, true);
    fromWalk = ctx.getMode() === 'walk';
    if (fromWalk) ctx.releasePointer();
    card.hidden = false;
    card.classList.remove('out'); void card.offsetWidth; card.classList.add('in');
    document.body.classList.add('sp-open');
    if (!full) setTimeout(() => name.focus({ preventScroll: true }), 50);
  }
  function close() {
    if (card.hidden) return;
    if (card.contains(document.activeElement)) document.activeElement.blur();
    card.classList.remove('in'); card.classList.add('out');
    document.body.classList.remove('sp-open');
    setTimeout(() => { card.hidden = true; }, 350);
    setHover(null, true);
    open = null;
    if (fromWalk) { fromWalk = false; ctx.resumeWalk(); }
  }

  let posting = false;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (posting || !open) return;
    const who = name.value.trim();
    if (!who) { err.textContent = 'Add the name you want on the plaque.'; err.hidden = false; name.focus(); return; }
    if (!(amount > 0)) { err.textContent = 'Choose a share of the tree or enter an amount.'; err.hidden = false; return; }
    posting = true; submit.disabled = true; err.hidden = true;
    const targets = tier?.trees ? rowTrees(open, tier.trees) : [open];
    const per = Math.round(amount / targets.length);
    const rows = targets.map((t) => ({ tree_id: t.id, kind: t.kind, sponsor: who, dedication: dedication.value.trim() || null, message: message.value.trim() || null, amount: per, share: Number(share.toFixed(4)), show_name: showName.checked }));
    try {
      await ensureBackend();
      const saved = [];
      for (const row of rows) {
        try { saved.push(await backend.insert(row)); }
        catch (ex) {
          // Table missing or blocked: keep the pledge locally so the demo continues
          if (backend.kind === 'supabase') { backend = localBackend(); status = 'local'; saved.push(await backend.insert(row)); }
          else throw ex;
        }
      }
      store.set(KEYS.name, who);
      ingest(saved);
      const t = open;
      ctx.juice?.sfx.done();
      ctx.juice?.burst(new THREE.Vector3(t.x, t.cy, t.z), 0xff8a1f, 30, 3);
      ctx.emit('sponsor', t.id);
      if (SPONSOR.url) window.open(SPONSOR.url, '_blank', 'noopener');
      // Thank-you state, then show the plaque in the model
      form.hidden = true;
      thanks.hidden = false;
      thanks.replaceChildren(
        h('b', { text: `Shukran, ${who}.` }),
        h('p', { text: `${targets.length > 1 ? `${targets.length} ${SPONSOR.kinds[t.kind].label.toLowerCase()}s now carry your name` : `${SPONSOR.kinds[t.kind].label} ${t.label} now carries your name${share >= 1 ? '' : ` for ${Math.round(share * 100)}% of its cost`}`}. ${SPONSOR.url ? 'Your donation page opened in a new tab.' : `The ${SPONSOR.org} team will follow up on your pledge of ${money(amount)}.`} Your certificate follows within 24 hours.`.replace('..', '.') }),
        h('div', { class: 'cm-actions' },
          h('button', { class: 'btn', type: 'button', text: 'Copy link to this tree', onclick: (e) => { const url = `${location.origin}${location.pathname}#sponsor=${encodeURIComponent(t.id)}`; navigator.clipboard?.writeText(url).then(() => { e.target.textContent = 'Link copied'; }).catch(() => { prompt('Copy this link', url); }); } }),
          h('button', { class: 'btn', type: 'button', text: 'Sponsor another', onclick: () => { close(); const n = trees.find((x) => !funded.has(x.id) && x.kind === t.kind); if (n) { ctx.flyToTree(n); setHover(n, true); } } }),
          h('button', { class: 'btn primary', type: 'button', text: 'See the plaque', onclick: () => { close(); ctx.flyToTree(t, 7); } }),
        ),
      );
      renderStatus(t);
      ctx.toast?.(`${who} sponsored ${SPONSOR.kinds[t.kind].label.toLowerCase()} ${t.label}.`);
      dedication.value = ''; message.value = ''; custom.value = '';
    } catch (ex) {
      err.textContent = 'Could not save the pledge. Please try again.'; err.hidden = false;
      console.warn('sponsor insert failed', ex);
    } finally { posting = false; submit.disabled = false; }
  });
  addEventListener('keydown', (e) => {
    if (card.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); close(); }
    else if (!e.metaKey && !e.ctrlKey && !e.altKey) e.stopPropagation();
  }, { capture: true });
  // Clicking the world while the card is open closes it (walk mode gets its mouse back)
  addEventListener('pointerdown', (e) => {
    if (card.hidden || card.contains(e.target)) return;
    if (e.target === ctx.canvas) { if (fromWalk) e.stopImmediatePropagation(); close(); }
  }, { capture: true });

  // ----- Data -----
  async function ensureBackend() {
    if (backend) return backend;
    if (MOCK) { backend = localBackend(); status = 'local'; return backend; }
    try { backend = await supabaseBackend(); status = 'ready'; }
    catch { backend = localBackend(); status = 'local'; }
    return backend;
  }
  function ingest(list) {
    let changed = new Set();
    for (const r of list) {
      if (!r || !r.id || rows.has(r.id) || !byId.has(r.tree_id)) continue;
      rows.set(r.id, r);
      const f = funded.get(r.tree_id) || { amount: 0, share: 0, sponsors: [] };
      f.amount += Number(r.amount) || 0;
      f.share = Math.min(1, f.share + (Number(r.share) || 0));
      f.sponsors.push(r);
      funded.set(r.tree_id, f);
      changed.add(r.tree_id);
    }
    for (const id of changed) renderPlaque(byId.get(id));
    if (changed.size) { refreshCount(); if (hover && changed.has(hover.id)) setHover(hover, pinned); }
  }
  const countEl = document.getElementById('sponsorCount');
  function refreshCount() {
    if (!countEl) return;
    const full = [...funded.values()].filter((f) => f.share >= 0.999).length, part = funded.size - full;
    countEl.hidden = !funded.size;
    countEl.textContent = `${full} ${full === 1 ? 'tree' : 'trees'} sponsored${part ? `, ${part} in progress` : ''} · ${trees.length - full} to go`;
  }
  (async () => {
    try {
      await ensureBackend();
      let list;
      try { list = await backend.list(); }
      catch { backend = localBackend(); status = 'local'; list = await backend.list(); }
      ingest(list);
      backend.subscribe((r) => ingest([r]));
    } catch (ex) { console.warn('sponsors unavailable', ex); }
  })();

  // ----- Per frame: plaque pop-in and ring pulse -----
  function update(dt, t) {
    for (const g of plaqueMeshes.values()) {
      if (g.userData.pop < 1) {
        g.userData.pop = Math.min(1, g.userData.pop + dt / 0.6);
        const k = g.userData.pop, s = 1 + 0.35 * Math.sin(k * Math.PI) * (1 - k);
        g.scale.setScalar(Math.max(0.001, (1 - Math.pow(1 - k, 3)) * s));
      }
    }
    if (ring.visible) { const p = 1 + 0.06 * Math.sin(t * 4); ring.scale.set(hover.r * 1.3 * p, 1, hover.r * 1.3 * p); ring.material.opacity = 0.65 + 0.25 * Math.sin(t * 4); }
  }
  // Keep the tip near the hovered tree on screen
  function place() {
    if (!hover || tip.hidden) return;
    _v.set(hover.x, hover.cy + hover.r * 0.9, hover.z).project(camera);
    if (_v.z > 1) { tip.style.opacity = '0'; return; }
    tip.style.opacity = '1';
    tip.style.transform = `translate(${(_v.x * 0.5 + 0.5) * innerWidth}px, ${(-_v.y * 0.5 + 0.5) * innerHeight}px)`;
  }

  if (MOCK || params.has('debug')) window.__sponsor = { get status() { return status; }, rows, funded, open: openCard, close, trees };

  // Demo plaques for a stage run: shown in the model, never saved
  function demo(list) {
    ingest(list.map((d, i) => ({ id: `demo-${i}`, created_at: new Date(Date.now() - i * 86400000).toISOString(), tree_id: d.tree, kind: byId.get(d.tree)?.kind || 'mango', sponsor: d.name, dedication: d.dedication || null, message: d.message || null, amount: d.amount, share: d.share, show_name: true })).filter((r) => byId.has(r.tree_id)));
  }
  return { open: openCard, close, hover: setHover, update, place, demo, get isOpen() { return !card.hidden; }, treeById: (id) => byId.get(id) || null, funded: (id) => funded.get(id) || null };
}
