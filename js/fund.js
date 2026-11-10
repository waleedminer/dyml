// Fundable systems: a progress bar floats above each one in the model, like a
// game objective, and opens a donation card with the itemised estimate.
// Pledges live in Supabase (public.project_pledges); kept in this browser if
// the table is unreachable so the demo never dead-ends.
import { PROJECTS } from './data.js';
import { getSupabase } from './supabase.js';

const KEYS = { name: 'wos.comments.name', local: 'wos.projects.local' };
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage blocked */ } },
};
const params = new URLSearchParams(location.search);
const MOCK = params.has('mockSponsors');
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()));
const money = (n) => `$${Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

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

async function supabaseBackend() {
  const sb = await getSupabase();
  const cols = 'id,created_at,project_id,donor,amount,message,show_name';
  const probe = await sb.from('project_pledges').select('id').limit(1);
  if (probe.error) throw probe.error;
  return {
    kind: 'supabase',
    async list() { const { data, error } = await sb.from('project_pledges').select(cols).order('created_at', { ascending: true }).limit(5000); if (error) throw error; return data || []; },
    async insert(row) { const { data, error } = await sb.from('project_pledges').insert(row).select(cols).single(); if (error) throw error; return data; },
    subscribe(fn) {
      try {
        const ch = sb.channel('project-pledges-live').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'project_pledges' }, (p) => p?.new && fn(p.new)).subscribe();
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
    const next = store.get(KEYS.local, []); if (!Array.isArray(next)) return;
    const have = new Set(rows.map((r) => r.id)); rows = next;
    next.filter((r) => !have.has(r.id)).forEach((r) => subs.forEach((fn) => fn(r)));
  });
  return {
    kind: 'local',
    async list() { return rows.slice(); },
    async insert(row) { const saved = { ...row, id: uuid(), created_at: new Date().toISOString() }; rows.push(saved); store.set(KEYS.local, rows); return saved; },
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
  };
}

export function initFund(ctx) {
  const { THREE, camera } = ctx;
  const rows = new Map();
  const totals = new Map(); // project id -> { amount, donors: [] }
  let backend = null;
  const _v = new THREE.Vector3();

  // ----- Floating bars -----
  const bars = Object.values(PROJECTS).map((p) => {
    const fill = h('i', { class: 'fund-fill' });
    const pct = h('b', { class: 'fund-pct', text: '0%' });
    const sum = h('span', { class: 'fund-sum', text: `${money(0)} of ${money(p.goal)}` });
    const el = h('button', { class: 'fund-bar', type: 'button', 'aria-label': `Fund the ${p.title}`, onclick: (e) => { e.stopPropagation(); open(p.id); } },
      h('span', { class: 'fund-head' }, h('span', { class: 'fund-icon', 'aria-hidden': 'true', html: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4h12v12a6 6 0 0 1-12 0zM6 9h12M4 20h16M9 16v4M15 16v4"/></svg>' }), h('span', { class: 'fund-title', text: p.title }), pct),
      h('span', { class: 'fund-track' }, fill),
      h('span', { class: 'fund-foot' }, sum, h('span', { class: 'fund-cta', text: 'Fund it →' })));
    el.hidden = true;
    document.body.append(el);
    return { p, el, fill, pct, sum, pos: new THREE.Vector3(...p.pos) };
  });

  function paint(id) {
    const b = bars.find((x) => x.p.id === id); if (!b) return;
    const t = totals.get(id) || { amount: 0, donors: [] };
    const frac = Math.min(1, t.amount / b.p.goal);
    b.fill.style.width = `${(frac * 100).toFixed(1)}%`;
    b.pct.textContent = `${Math.round(frac * 100)}%`;
    b.sum.textContent = `${money(t.amount)} of ${money(b.p.goal)}${t.donors.length ? ` · ${t.donors.length} ${t.donors.length === 1 ? 'donor' : 'donors'}` : ''}`;
    b.el.classList.toggle('funded', frac >= 1);
    b.el.querySelector('.fund-cta').textContent = frac >= 1 ? 'Funded. Thank you' : 'Fund it →';
  }

  // Keep each bar above its object; shrink with distance; hide when behind the camera
  function place() {
    for (const b of bars) {
      const hidden = document.body.classList.contains('cinematic') || document.body.classList.contains('role-picking') || document.body.classList.contains('touring');
      _v.copy(b.pos).project(camera);
      const behind = _v.z > 1, off = Math.abs(_v.x) > 1.15 || Math.abs(_v.y) > 1.15;
      if (hidden || behind || off) { b.el.hidden = true; continue; }
      const dist = camera.position.distanceTo(b.pos);
      const scale = THREE.MathUtils.clamp(1.25 - dist / 140, 0.55, 1.05);
      b.el.hidden = false;
      b.el.style.transform = `translate(${(_v.x * 0.5 + 0.5) * innerWidth}px, ${(-_v.y * 0.5 + 0.5) * innerHeight}px) translate(-50%, -100%) scale(${scale.toFixed(3)})`;
      b.el.style.zIndex = String(900 - Math.round(dist));
    }
  }

  // ----- Donation card -----
  const title = h('h2'), why = h('p', { class: 'sp-why' }), progress = h('div', { class: 'fund-progress' });
  const costTable = h('table', { class: 'sp-cost' });
  const receives = h('ul', { class: 'sp-receives' });
  const tiersEl = h('div', { class: 'fund-tiers', role: 'radiogroup', 'aria-label': 'Amount' });
  const custom = h('input', { type: 'number', min: '5', max: '100000', step: '1', inputmode: 'numeric', placeholder: 'Other', 'aria-label': 'Other amount' });
  const name = h('input', { type: 'text', maxlength: '40', autocomplete: 'name', placeholder: 'e.g. The Kamara family', required: true });
  const message = h('textarea', { rows: '2', maxlength: '280', placeholder: 'A note for the student water team (optional)' });
  const showName = h('input', { type: 'checkbox', checked: true });
  const err = h('p', { class: 'cm-error', hidden: true, role: 'alert' });
  const submit = h('button', { type: 'submit', class: 'btn primary sp-submit' });
  const note = h('p', { class: 'sp-fine' });
  const form = h('form', { class: 'sp-form', novalidate: true },
    h('p', { class: 'sp-label', text: 'Your pledge' }), tiersEl,
    h('div', { class: 'sp-custom' }, h('span', { text: '$' }), custom),
    h('label', { class: 'cm-field' }, h('span', { text: 'Name on the tank sign' }), name),
    h('label', { class: 'cm-field' }, h('span', { text: 'Message (optional)' }), message),
    h('label', { class: 'sp-check' }, showName, h('span', { text: 'Show my name on the tank in the 3D model' })),
    err,
    h('div', { class: 'cm-actions' }, h('button', { type: 'button', class: 'btn', text: 'Not now', onclick: () => close() }), submit),
    h('p', { class: 'sp-label', text: 'What you receive' }), receives, note);
  const thanks = h('div', { class: 'sp-thanks', hidden: true });
  const donorsEl = h('p', { class: 'fund-donors' });
  const card = h('section', { class: 'sp-card fund-card card', role: 'dialog', 'aria-label': 'Fund a system', hidden: true },
    h('button', { class: 'close', type: 'button', 'aria-label': 'Close', text: '×', onclick: () => close() }),
    h('p', { class: 'eyebrow', text: 'Build it together' }), title, progress, why,
    h('p', { class: 'sp-label', text: 'What it costs' }), costTable, donorsEl, form, thanks);
  document.body.append(card);

  let open_ = null, amount = 0, fromWalk = false;
  function renderProgress(p) {
    const t = totals.get(p.id) || { amount: 0, donors: [] };
    const pct = Math.min(100, Math.round((t.amount / p.goal) * 100));
    progress.innerHTML = `<div class="sp-bar"><i style="width:${pct}%"></i></div><span class="sp-pill ${pct >= 100 ? 'full' : ''}">${pct}% funded</span><span class="sp-price">${money(t.amount)} raised of ${money(p.goal)}</span>`;
    const names = t.donors.filter((d) => d.show_name !== false).map((d) => d.donor);
    donorsEl.textContent = names.length ? `With thanks to ${names.slice(0, 6).join(', ')}${names.length > 6 ? ` and ${names.length - 6} more` : ''}.` : 'Be the first name on the tank.';
  }
  function setAmount(v) {
    amount = Math.round(v);
    [...tiersEl.children].forEach((b) => b.setAttribute('aria-checked', String(Number(b.dataset.v) === amount)));
    submit.textContent = `Pledge ${money(amount)} →`;
  }
  custom.addEventListener('input', () => { const v = Number(custom.value); if (v > 0) { amount = Math.round(v); [...tiersEl.children].forEach((b) => b.setAttribute('aria-checked', 'false')); submit.textContent = `Pledge ${money(amount)} →`; } });

  function open(id) {
    const p = PROJECTS[id]; if (!p) return;
    open_ = p;
    title.textContent = p.title;
    why.textContent = p.why;
    costTable.replaceChildren(...p.cost.map(([l, v]) => h('tr', {}, h('td', { text: l }), h('td', { text: money(v) }))), h('tr', { class: 'sp-cost-total' }, h('td', { text: 'Estimated total' }), h('td', { text: money(p.goal) })));
    receives.replaceChildren(...p.receives.map((r) => h('li', { text: r })));
    note.textContent = p.note;
    tiersEl.replaceChildren(...p.tiers.map((v) => h('button', { type: 'button', role: 'radio', class: 'sp-share', 'data-v': String(v), 'aria-checked': 'false', onclick: () => { custom.value = ''; setAmount(v); } }, h('b', { text: money(v) }), h('span', { text: v >= p.goal / 10 ? `${Math.round((v / p.goal) * 100)}% of the tank` : `${(v / p.goal * 100).toFixed(1)}% of the tank` }))));
    custom.value = ''; setAmount(p.defaultTier);
    name.value = name.value || String(store.get(KEYS.name, '') ?? '').slice(0, 40);
    renderProgress(p);
    form.hidden = false; thanks.hidden = true; err.hidden = true;
    fromWalk = ctx.getMode() === 'walk';
    if (fromWalk) ctx.releasePointer();
    ctx.hideMenu?.();
    card.hidden = false;
    card.classList.remove('out'); void card.offsetWidth; card.classList.add('in');
    document.body.classList.add('sp-open');
    setTimeout(() => name.focus({ preventScroll: true }), 50);
  }
  function close() {
    if (card.hidden) return;
    if (card.contains(document.activeElement)) document.activeElement.blur();
    card.classList.remove('in'); card.classList.add('out');
    document.body.classList.remove('sp-open');
    setTimeout(() => { card.hidden = true; }, 350);
    open_ = null;
    if (fromWalk) { fromWalk = false; ctx.resumeWalk(); }
  }
  let posting = false;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (posting || !open_) return;
    const who = name.value.trim();
    if (!who) { err.textContent = 'Add the name you want on the tank sign.'; err.hidden = false; name.focus(); return; }
    if (!(amount > 0)) { err.textContent = 'Choose an amount.'; err.hidden = false; return; }
    posting = true; submit.disabled = true; err.hidden = true;
    const row = { project_id: open_.id, donor: who, amount, message: message.value.trim() || null, show_name: showName.checked };
    try {
      await ensureBackend();
      let saved;
      try { saved = await backend.insert(row); }
      catch (ex) { if (backend.kind === 'supabase') { backend = localBackend(); saved = await backend.insert(row); } else throw ex; }
      store.set(KEYS.name, who);
      ingest([saved]);
      const p = open_;
      const t = totals.get(p.id);
      const pct = Math.min(100, Math.round((t.amount / p.goal) * 100));
      ctx.juice?.sfx.done();
      ctx.juice?.burst(new THREE.Vector3(p.pos[0], p.pos[1] - 1.5, p.pos[2]), 0x2a9df4, 30, 3.2);
      form.hidden = true; thanks.hidden = false;
      thanks.replaceChildren(
        h('b', { text: `Shukran, ${who}.` }),
        h('p', { text: `Your ${money(amount)} moves the ${p.title.toLowerCase()} to ${pct}%. ${pct >= 100 ? 'It is fully funded.' : `${money(Math.max(0, p.goal - t.amount))} to go.`} The Foundation follows up on your pledge; your name is on the tank sign now.` }),
        h('div', { class: 'cm-actions' },
          h('button', { class: 'btn', type: 'button', text: 'Copy link', onclick: (ev) => { const url = `${location.origin}${location.pathname}#fund=${p.id}`; navigator.clipboard?.writeText(url).then(() => { ev.target.textContent = 'Link copied'; }).catch(() => {}); } }),
          h('button', { class: 'btn primary', type: 'button', text: 'See the tank', onclick: () => { close(); ctx.flyToPoint(new THREE.Vector3(p.pos[0], p.pos[1] - 3, p.pos[2]), 16); } })));
      renderProgress(p);
      ctx.toast?.(`${who} pledged ${money(amount)}. The ${p.short.toLowerCase()} is ${pct}% funded.`);
      ctx.emit?.('fund', p.id);
      message.value = ''; custom.value = '';
    } catch (ex) { err.textContent = 'Could not save the pledge. Please try again.'; err.hidden = false; console.warn('project pledge failed', ex); }
    finally { posting = false; submit.disabled = false; }
  });
  addEventListener('keydown', (e) => {
    if (card.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); close(); }
    else if (!e.metaKey && !e.ctrlKey && !e.altKey) e.stopPropagation();
  }, { capture: true });
  addEventListener('pointerdown', (e) => {
    if (card.hidden || card.contains(e.target)) return;
    if (e.target === ctx.canvas) { if (fromWalk) e.stopImmediatePropagation(); close(); }
  }, { capture: true });

  // ----- Data -----
  async function ensureBackend() {
    if (backend) return backend;
    if (MOCK) { backend = localBackend(); return backend; }
    try { backend = await supabaseBackend(); } catch { backend = localBackend(); }
    return backend;
  }
  function ingest(list) {
    const changed = new Set();
    for (const r of list) {
      if (!r || !r.id || rows.has(r.id) || !PROJECTS[r.project_id]) continue;
      rows.set(r.id, r);
      const t = totals.get(r.project_id) || { amount: 0, donors: [] };
      t.amount += Number(r.amount) || 0; t.donors.push(r);
      totals.set(r.project_id, t);
      changed.add(r.project_id);
    }
    for (const id of changed) { paint(id); if (open_?.id === id) renderProgress(open_); }
  }
  (async () => {
    try {
      await ensureBackend();
      let list; try { list = await backend.list(); } catch { backend = localBackend(); list = await backend.list(); }
      ingest(list);
      backend.subscribe((r) => ingest([r]));
    } catch (ex) { console.warn('project pledges unavailable', ex); }
  })();
  for (const b of bars) paint(b.p.id);

  // Demo pledges for a stage run: shown, never saved
  function demo(list) { ingest(list.map((d, i) => ({ id: `demo-fund-${i}`, created_at: new Date().toISOString(), project_id: d.project, donor: d.name, amount: d.amount, message: null, show_name: true }))); }

  return { open, close, place, demo, total: (id) => totals.get(id) || { amount: 0, donors: [] }, get isOpen() { return !card.hidden; } };
}
