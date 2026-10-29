// Comments pinned to points in the 3D model.
// A round button on the right opens a list of comments; "Drop a comment" (or C)
// lets you pin one into the world. Markers float above the spot they were left at.
// Data lives in Supabase (public.comments); ?mockComments uses an in-browser store.
import { getSupabase } from './supabase.js';

const LIFT = 1.6; // metres the marker floats above its spot
const MAX_DIST = 150; // hide markers beyond this
const FAR_DIST = 120; // collapse to a dot beyond this
const MAX_PINS = 24; // nearest markers shown at once
const POLL_MS = 30000;
const FULL_SYNC_MS = 5 * 60000; // full re-read (picks up deletions) at most this often
const PAGE = 1000;
const MAX_ROWS = 20000;
const LIMITS = { author: 40, body: 1000 };
const KEYS = { name: 'wos.comments.name', show: 'wos.comments.show', seen: 'wos.comments.seen', mock: 'wos.comments.mock' };
const params = new URLSearchParams(location.search);
const MOCK = params.has('mockComments');

const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage blocked */ } },
};
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
  const r = (Math.random() * 16) | 0; return (c === 'x' ? r : (r & 3) | 8).toString(16);
}));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Backends: same interface for Supabase and the local mock
// ---------------------------------------------------------------------------
async function supabaseBackend() {
  const sb = await getSupabase();
  const cols = 'id,created_at,parent_id,author,body,x,y,z,mode';
  return {
    kind: 'supabase',
    // Every row, oldest first. PostgREST caps a response (1000 rows by default), so page through it.
    async list() {
      const out = [];
      for (let from = 0; out.length < MAX_ROWS; from += PAGE) {
        const { data, error } = await sb.from('comments').select(cols)
          .order('created_at', { ascending: true }).order('id', { ascending: true }).range(from, from + PAGE - 1);
        if (error) throw error;
        out.push(...(data || []));
        if (!data || data.length < PAGE) break;
      }
      return out;
    },
    // Only rows at or after a timestamp (cheap poll between full syncs)
    async since(iso) {
      const { data, error } = await sb.from('comments').select(cols).gte('created_at', iso).order('created_at', { ascending: true }).limit(PAGE);
      if (error) throw error;
      return data || [];
    },
    async insert(row) {
      const { data, error } = await sb.from('comments').insert(row).select(cols).single();
      if (error) throw error;
      return data;
    },
    subscribe(fn) {
      try {
        const ch = sb.channel('comments-live')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' }, (p) => p?.new && fn(p.new))
          .subscribe();
        return () => sb.removeChannel(ch);
      } catch { return () => {}; }
    },
  };
}

function mockBackend(height) {
  const iso = (minsAgo) => new Date(Date.now() - minsAgo * 60000).toISOString();
  const at = (x, z) => ({ x, y: height(x, z), z });
  const seed = () => {
    const a = uuid(), b = uuid();
    return [
      { id: a, created_at: iso(60 * 26), parent_id: null, author: 'Amina', body: 'Love that the outdoor classroom faces the orchard. Could the benches be shaded with a mango canopy?', ...at(13, 15), mode: 'explore' },
      { id: uuid(), created_at: iso(60 * 20), parent_id: a, author: 'Ibrahim', body: 'Agreed. Grafted mangoes would give shade within three years.', x: null, y: null, z: null, mode: null },
      { id: b, created_at: iso(90), parent_id: null, author: 'Fatmata', body: 'Where do students wash their hands before lunch?', ...at(-6, 6), mode: 'walk' },
    ];
  };
  let rows = store.get(KEYS.mock, null);
  if (!Array.isArray(rows)) { rows = seed(); store.set(KEYS.mock, rows); }
  const subs = new Set();
  const emit = (row) => subs.forEach((fn) => fn(row));
  // Other tabs act like other visitors
  addEventListener('storage', (e) => {
    if (e.key !== KEYS.mock) return;
    const next = store.get(KEYS.mock, []);
    if (!Array.isArray(next)) return;
    const have = new Set(rows.map((r) => r.id));
    rows = next;
    next.filter((r) => !have.has(r.id)).forEach(emit);
  });
  return {
    kind: 'mock',
    async list() { await wait(120); return rows.slice(); },
    async since(iso) { await wait(80); const t = Date.parse(iso); return rows.filter((r) => Date.parse(r.created_at) >= t); },
    async insert(row) {
      await wait(160);
      if (row.parent_id) {
        const parent = rows.find((r) => r.id === row.parent_id);
        if (!parent || parent.parent_id) throw new Error('Replies can only be added to top-level comments');
      }
      const saved = { x: null, y: null, z: null, mode: null, ...row, id: uuid(), created_at: new Date().toISOString() };
      rows.push(saved);
      store.set(KEYS.mock, rows);
      setTimeout(() => emit(saved), 50); // like a realtime echo
      return saved;
    },
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
  };
}

// ---------------------------------------------------------------------------
// Small DOM helpers (user text only ever goes in via textContent)
// ---------------------------------------------------------------------------
function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v == null) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) if (kid != null) el.append(kid);
  return el;
}
const SVG_NS = 'http://www.w3.org/2000/svg';
function svg(markup, cls) {
  // Static, trusted icon markup only
  const t = document.createElementNS(SVG_NS, 'svg');
  t.setAttribute('viewBox', '0 0 24 24');
  t.setAttribute('aria-hidden', 'true');
  if (cls) t.setAttribute('class', cls);
  t.innerHTML = markup;
  return t;
}
const ICON_CHAT = '<path d="M5 4.5h14a2.5 2.5 0 0 1 2.5 2.5v8.5A2.5 2.5 0 0 1 19 18h-7.2l-4.6 3.4c-.5.4-1.2 0-1.2-.6V18H5a2.5 2.5 0 0 1-2.5-2.5V7A2.5 2.5 0 0 1 5 4.5Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle class="acc" cx="8" cy="11.3" r="1.35"/><circle class="acc" cx="12" cy="11.3" r="1.35"/><circle class="acc" cx="16" cy="11.3" r="1.35"/>';
const ICON_PIN = '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/><circle cx="12" cy="10" r="2.3" fill="currentColor"/>';
const ICON_REPLY = '<path d="M9.5 7 4.5 12l5 5M5 12h9.5a5 5 0 0 1 5 5v1" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>';

const initial = (name) => (name || '?').trim().charAt(0).toUpperCase() || '?';
function ago(iso) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 50) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  if (s < 86400 * 7) { const d = Math.round(s / 86400); return d === 1 ? 'yesterday' : `${d} days ago`; }
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: s > 86400 * 300 ? 'numeric' : undefined });
}
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const snippet = (s, n = 90) => { const t = s.replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t; };

// ---------------------------------------------------------------------------
export function initComments(ctx) {
  const { THREE, camera, canvas } = ctx;
  const threads = new Map(); // id -> { root, replies, pos, top, phase, pin, unInteract }
  const orphans = new Map(); // parent id -> replies that arrived first
  let backend = null;
  let status = 'loading'; // loading | ready | unavailable
  let show = store.get(KEYS.show, true) !== false;
  const storedSeen = store.get(KEYS.seen, null);
  // First visit: everything already there counts as read; only later arrivals are "new"
  let firstVisit = !(storedSeen && typeof storedSeen === 'object' && !Array.isArray(storedSeen));
  let seen = firstVisit ? {} : storedSeen;
  let placing = false;
  let compose = null; // { point, walk }
  let openId = null; // thread being read
  let threadFromWalk = false;
  let hoverId = null;
  let draft = '';
  let lastPost = 0;
  const narrow = () => innerWidth <= 720;
  // Float lower over spots already off the ground (a wall, a table, a roof) so markers stay near what they're about
  const liftAt = (p) => (p.y - ctx.height(p.x, p.z) > 0.8 ? 0.9 : LIFT);

  // ----- DOM -----
  const layer = h('div', { class: 'cm-layer', 'aria-label': 'Comments in the model' });
  const tip = h('div', { class: 'cm-tip', hidden: true, role: 'tooltip' });

  const fabDot = h('span', { class: 'cm-fab-dot', hidden: true });
  const fab = h('button', { class: 'cm-fab', type: 'button', 'aria-label': 'Comments', title: 'Comments (C to drop one)', 'aria-expanded': 'false', 'aria-haspopup': 'dialog' }, svg(ICON_CHAT), fabDot);

  // Popover: drop + list + toggle
  const popCount = h('span', { class: 'cm-pop-count' });
  const dropBtn = h('button', { class: 'btn primary cm-drop', type: 'button' }, svg(ICON_PIN), h('span', { text: 'Drop a comment' }), h('kbd', { text: 'C' }));
  const toggle = h('input', { type: 'checkbox', class: 'cm-switch-input' });
  toggle.checked = show;
  const notice = h('p', { class: 'cm-notice', hidden: true });
  const list = h('ul', { class: 'cm-list' });
  const empty = h('p', { class: 'cm-empty', hidden: true, text: 'No comments yet. Drop the first one anywhere in the model.' });
  const pop = h('section', { class: 'cm-pop card', role: 'dialog', 'aria-label': 'Comments', hidden: true },
    h('header', { class: 'cm-pop-head' }, h('h3', { text: 'Comments' }), popCount),
    h('p', { class: 'cm-pop-sub', text: 'Leave a note at any spot in the model, or read what others noticed.' }),
    dropBtn,
    h('label', { class: 'cm-switch' }, toggle, h('span', { class: 'cm-switch-track', 'aria-hidden': 'true' }), h('span', { text: 'Show comments on the map' })),
    notice,
    h('p', { class: 'cm-list-label', text: 'Recent' }),
    list, empty,
  );

  const hintEl = h('div', { class: 'cm-hint', hidden: true, role: 'status' }, svg(ICON_PIN), h('span', { text: 'Click anywhere to place your comment · Esc to cancel' }));

  // Compose card
  const cName = h('input', { type: 'text', name: 'author', maxlength: String(LIMITS.author), autocomplete: 'nickname', placeholder: 'e.g. Amina', required: true });
  const cBody = h('textarea', { name: 'body', rows: '3', maxlength: String(LIMITS.body), placeholder: 'What do you notice here?', required: true });
  const cCount = h('span', { class: 'cm-count' });
  const cErr = h('p', { class: 'cm-error', hidden: true, role: 'alert' });
  const cPost = h('button', { type: 'submit', class: 'btn primary', text: 'Post' });
  const cCancel = h('button', { type: 'button', class: 'btn', text: 'Cancel' });
  const composeForm = h('form', { class: 'cm-form', novalidate: true },
    h('label', { class: 'cm-field' }, h('span', { text: 'Your name' }), cName),
    h('label', { class: 'cm-field' }, h('span', { text: 'Comment' }), cBody),
    cErr,
    h('div', { class: 'cm-actions' }, cCount, cCancel, cPost),
  );
  const composeCard = h('section', { class: 'cm-card card', role: 'dialog', 'aria-label': 'New comment', hidden: true },
    h('button', { class: 'close', type: 'button', 'aria-label': 'Cancel', text: '×', onclick: () => closeCompose(true) }),
    h('p', { class: 'eyebrow', text: 'New comment' }),
    h('h3', { class: 'cm-title', text: 'Leave a note here' }),
    composeForm,
  );
  const ghost = h('div', { class: 'cm-pin ghost' }, h('span', { class: 'cm-dot' }), h('span', { class: 'cm-stem' }), h('span', { class: 'cm-bubble' }, h('span', { class: 'cm-face' }, h('span', { class: 'cm-initial', text: '+' }))));
  ghost.hidden = true;

  // Thread card
  const tBody = h('div', { class: 'cm-thread-scroll' });
  const rName = h('input', { type: 'text', name: 'author', maxlength: String(LIMITS.author), autocomplete: 'nickname', placeholder: 'Your name', required: true });
  const rBody = h('textarea', { name: 'body', rows: '2', maxlength: String(LIMITS.body), placeholder: 'Write a reply…', required: true });
  const rErr = h('p', { class: 'cm-error', hidden: true, role: 'alert' });
  const rCount = h('span', { class: 'cm-count' });
  const rPost = h('button', { type: 'submit', class: 'btn primary', text: 'Reply' });
  const replyForm = h('form', { class: 'cm-form cm-reply', novalidate: true },
    h('label', { class: 'cm-field' }, h('span', { text: 'Reply as' }), rName),
    rBody, rErr,
    h('div', { class: 'cm-actions' }, rCount, rPost),
  );
  const threadCard = h('section', { class: 'cm-card card cm-thread', role: 'dialog', 'aria-label': 'Comment thread', hidden: true },
    h('button', { class: 'close', type: 'button', 'aria-label': 'Close', text: '×', onclick: () => closeThread(true) }),
    h('p', { class: 'eyebrow', text: 'Comment' }),
    tBody, replyForm,
  );

  layer.append(ghost);
  document.body.append(layer, tip, fab, pop, hintEl, composeCard, threadCard);

  // Keep the button clear of the info panel
  const panelEl = document.getElementById('panel');
  const syncPanel = () => document.body.classList.toggle('cm-panel-open', !!panelEl && !panelEl.hidden);
  if (panelEl) new MutationObserver(syncPanel).observe(panelEl, { attributes: true, attributeFilter: ['hidden'] });
  syncPanel();

  // ----- Data -----
  const savedName = () => String(store.get(KEYS.name, '') ?? '').slice(0, LIMITS.author);
  const ts = (r) => Date.parse(r.created_at) || 0;
  const byTime = (a, b) => ts(a) - ts(b);
  const count = (t) => 1 + t.replies.length;
  const lastActivity = (t) => ts(t.replies.length ? t.replies[t.replies.length - 1] : t.root);
  const isUnread = (t) => (seen[t.root.id] || 0) < count(t) && Date.now() - lastActivity(t) < 14 * 86400000;
  function markSeen(t) { seen[t.root.id] = count(t); store.set(KEYS.seen, seen); }

  const arrived = new Map(); // id -> performance.now() when we first saw it
  let latest = null; // newest created_at seen (string, as the server wrote it)
  function ingest(rows) {
    let changed = false;
    for (const r of rows) {
      if (!r || !r.id || typeof r.created_at !== 'string') continue;
      if (!arrived.has(r.id)) arrived.set(r.id, performance.now());
      if (!latest || ts(r) > ts({ created_at: latest })) latest = r.created_at;
      if (!r.parent_id) {
        if (threads.has(r.id) || !Number.isFinite(r.x) || !Number.isFinite(r.y) || !Number.isFinite(r.z)) continue;
        const pos = new THREE.Vector3(r.x, r.y, r.z);
        const t = { root: r, replies: orphans.get(r.id) || [], pos, top: pos.clone().setY(pos.y + liftAt(pos)), phase: Math.random() * 6.28, pin: null, unInteract: null };
        orphans.delete(r.id);
        t.replies.sort(byTime);
        threads.set(r.id, t);
        changed = true;
      } else {
        const t = threads.get(r.parent_id);
        const bucket = t ? t.replies : (orphans.get(r.parent_id) || orphans.set(r.parent_id, []).get(r.parent_id));
        if (bucket.some((x) => x.id === r.id)) continue;
        bucket.push(r);
        bucket.sort(byTime);
        if (t) { changed = true; if (t.pin) t.pin.n.textContent = t.replies.length ? String(t.replies.length) : ''; }
      }
    }
    if (changed) refreshUI();
  }

  // Drop rows that are gone from the server (deleted by a moderator), unless they arrived after the read began
  function reconcile(rows, startedAt) {
    const ids = new Set(rows.map((r) => r && r.id));
    const gone = (id) => !ids.has(id) && (arrived.get(id) ?? Infinity) < startedAt;
    let changed = false;
    for (const [id, t] of threads) {
      if (gone(id)) {
        if (openId === id) closeThread(false);
        if (hoverId === id) { hoverId = null; tip.hidden = true; }
        if (t.unInteract) t.unInteract();
        t.pin?.el.remove();
        threads.delete(id); arrived.delete(id);
        changed = true;
        continue;
      }
      const keep = t.replies.filter((r) => !gone(r.id));
      if (keep.length !== t.replies.length) {
        t.replies = keep;
        if (t.pin) t.pin.n.textContent = keep.length ? String(keep.length) : '';
        changed = true;
      }
    }
    for (const [pid, list] of orphans) { const keep = list.filter((r) => !gone(r.id)); keep.length ? orphans.set(pid, keep) : orphans.delete(pid); }
    if (changed) refreshUI();
  }

  let lastFull = 0, syncing = false;
  async function refresh() {
    if (!(await ensureBackend()) || syncing) return;
    syncing = true;
    try {
      const full = !latest || !backend.since || Date.now() - lastFull > FULL_SYNC_MS;
      const startedAt = performance.now();
      const rows = full ? await backend.list() : await backend.since(latest);
      ingest(rows);
      if (full) { reconcile(rows, startedAt); lastFull = Date.now(); }
      if (firstVisit) {
        firstVisit = false;
        for (const t of threads.values()) seen[t.root.id] = Math.max(seen[t.root.id] || 0, count(t));
        store.set(KEYS.seen, seen);
      }
      setStatus('ready');
    } catch (err) {
      if (status !== 'unavailable') console.info('[comments] not available yet:', err?.message || err);
      lastFull = 0; // full re-read once it comes back
      setStatus('unavailable');
    } finally { syncing = false; }
  }
  function setStatus(s) { if (status === s) return; status = s; refreshUI(); }

  // Create the backend; retried from the poll if it failed (e.g. the client library didn't load)
  let starting = null;
  function ensureBackend() {
    if (backend) return Promise.resolve(backend);
    starting ||= (async () => {
      try {
        const be = MOCK ? mockBackend(ctx.height) : await supabaseBackend();
        be.subscribe((row) => { ingest([row]); });
        backend = be;
        return be;
      } catch (err) {
        console.info('[comments] backend unavailable:', err?.message || err);
        setStatus('unavailable');
        return null;
      }
    })().finally(() => { starting = null; });
    return starting;
  }
  refresh();
  setInterval(() => { if (!document.hidden) refresh(); }, POLL_MS);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
  setInterval(() => { if (!pop.hidden) renderList(); if (openId) renderThread(); }, 60000);

  // ----- UI rendering -----
  function refreshUI() {
    const n = threads.size;
    popCount.textContent = n ? String(n) : '';
    fabDot.hidden = ![...threads.values()].some(isUnread);
    if (!pop.hidden) renderList();
    if (openId) renderThread();
    syncInteracts();
  }

  function renderList() {
    notice.hidden = status !== 'unavailable';
    if (status === 'unavailable') notice.textContent = 'Comments will appear here once the database is ready.';
    const items = [...threads.values()].sort((a, b) => lastActivity(b) - lastActivity(a));
    list.replaceChildren(...items.slice(0, 60).map((t) => {
      const r = t.root;
      return h('li', {},
        h('button', { class: `cm-item${isUnread(t) ? ' unread' : ''}`, type: 'button', onclick: () => goTo(t.root.id) },
          h('span', { class: 'cm-avatar', 'aria-hidden': 'true', text: initial(r.author) }),
          h('span', { class: 'cm-item-main' },
            h('span', { class: 'cm-item-head' }, h('b', { text: r.author }), h('time', { datetime: r.created_at, text: ago(r.created_at) })),
            h('span', { class: 'cm-item-body', text: snippet(r.body, 110) }),
            t.replies.length ? h('span', { class: 'cm-item-replies' }, svg(ICON_REPLY), h('span', { text: plural(t.replies.length, 'reply', 'replies') })) : null,
          ),
        ),
      );
    }));
    empty.hidden = status !== 'ready' || items.length > 0;
    list.previousElementSibling.hidden = items.length === 0;
    if (status === 'loading' && !items.length) { empty.hidden = false; empty.textContent = 'Loading comments…'; }
    else empty.textContent = 'No comments yet. Drop the first one anywhere in the model.';
  }

  function msg(r, root) {
    return h('article', { class: `cm-msg${root ? ' root' : ''}` },
      h('span', { class: 'cm-avatar', 'aria-hidden': 'true', text: initial(r.author) }),
      h('div', { class: 'cm-msg-main' },
        h('header', {}, h('b', { text: r.author }), h('time', { datetime: r.created_at, title: new Date(r.created_at).toLocaleString(), text: ago(r.created_at) })),
        h('p', { text: r.body }),
      ),
    );
  }
  function renderThread() {
    const t = threads.get(openId);
    if (!t) return;
    const stick = tBody.scrollHeight - tBody.scrollTop - tBody.clientHeight < 8;
    tBody.replaceChildren(msg(t.root, true));
    if (t.replies.length) {
      tBody.append(
        h('p', { class: 'cm-replies-label', text: plural(t.replies.length, 'reply', 'replies') }),
        h('div', { class: 'cm-replies' }, t.replies.map((r) => msg(r))),
      );
    }
    if (stick) tBody.scrollTop = tBody.scrollHeight;
    markSeen(t);
    if (t.pin) t.pin.el.classList.remove('unread');
    fabDot.hidden = ![...threads.values()].some(isUnread);
  }

  // ----- Markers -----
  function makePin(t) {
    const n = h('span', { class: 'cm-n', text: t.replies.length ? String(t.replies.length) : '' });
    const bubble = h('button', { class: 'cm-bubble', type: 'button', 'aria-label': `Comment by ${t.root.author}` }, h('span', { class: 'cm-face' }, h('span', { class: 'cm-initial', text: initial(t.root.author) })), n);
    const dot = h('span', { class: 'cm-dot' });
    const stem = h('span', { class: 'cm-stem' });
    const el = h('div', { class: 'cm-pin off fresh' }, dot, stem, bubble);
    bubble.addEventListener('click', (e) => { e.stopPropagation(); if (!placing) openThread(t.root.id); });
    bubble.addEventListener('pointerenter', () => { hoverId = t.root.id; showTip(t); });
    bubble.addEventListener('pointerleave', () => { if (hoverId === t.root.id) { hoverId = null; tip.hidden = true; } });
    layer.append(el);
    setTimeout(() => el.classList.remove('fresh'), 600);
    t.pin = { el, bubble, dot, stem, n, shown: false, occluded: false };
  }
  function showTip(t) {
    if (narrow() || matchMedia('(pointer: coarse)').matches) return;
    tip.replaceChildren(
      h('span', { class: 'cm-tip-head' }, h('b', { text: t.root.author }), h('span', { text: ` · ${ago(t.root.created_at)}` })),
      h('span', { class: 'cm-tip-body', text: snippet(t.root.body, 120) }),
      h('span', { class: 'cm-tip-foot', text: t.replies.length ? `${plural(t.replies.length, 'reply', 'replies')} · click to open` : 'Click to open' }),
    );
    tip.hidden = false;
  }

  // Walk mode: look at a marker and press E
  // Only markers you can actually see (on screen, not behind a wall) are registered
  function setInteract(t, want) {
    if (want && !t.unInteract) {
      t.unInteract = ctx.addInteract(t.top, () => `Read ${t.root.author}'s comment${t.replies.length ? ` · ${plural(t.replies.length, 'reply', 'replies')}` : ''}`, () => openThread(t.root.id, { fromWalk: true }), 4);
    } else if (!want && t.unInteract) { t.unInteract(); t.unInteract = null; }
  }
  function syncInteracts() {
    for (const t of threads.values()) setInteract(t, show && !!t.pin?.shown && !t.pin.occluded);
  }

  // ----- Opening and closing things -----
  function anyCard() { return !!compose || !!openId; }
  function resumeIfWalk(fromGesture) {
    if (ctx.getMode() === 'walk' && fromGesture !== false) ctx.resumeWalk();
  }

  function openPop() {
    if (placing) stopPlacing();
    renderList();
    pop.hidden = false;
    fab.setAttribute('aria-expanded', 'true');
    fab.classList.add('on');
    document.body.classList.add('cm-pop-open');
  }
  function closePop() {
    pop.hidden = true;
    fab.setAttribute('aria-expanded', 'false');
    fab.classList.remove('on');
    document.body.classList.remove('cm-pop-open');
  }

  function startPlacing() {
    closePop();
    if (openId) closeThread(false);
    if (compose) return;
    if (ctx.getMode() === 'walk') {
      const p = ctx.aimPoint(30);
      ctx.releasePointer();
      openCompose(p, true);
      return;
    }
    placing = true;
    document.body.classList.add('cm-placing');
    hintEl.hidden = false;
    hintEl.lastElementChild.textContent = matchMedia('(pointer: coarse)').matches
      ? 'Tap a spot to place it · tap the button to cancel' : 'Click anywhere to place your comment · Esc to cancel';
    fab.classList.add('on');
  }
  function stopPlacing() {
    placing = false;
    document.body.classList.remove('cm-placing');
    hintEl.hidden = true;
    if (pop.hidden) fab.classList.remove('on');
  }

  function openCompose(point, walk) {
    compose = { point: point.clone(), walk };
    composeCard.hidden = false;
    document.body.classList.add('cm-card-open');
    composeCard.classList.remove('settled');
    cardPos.init = false;
    cName.value = cName.value || savedName();
    cBody.value = draft;
    cErr.hidden = true;
    cPost.disabled = false;
    updateCount(cBody, cCount);
    ghost.hidden = false;
    (cName.value ? cBody : cName).focus({ preventScroll: true });
  }
  function closeCompose(gesture) {
    if (!compose) return;
    const wasWalk = compose.walk;
    draft = cBody.value;
    compose = null;
    composeCard.hidden = true;
    if (!openId) document.body.classList.remove('cm-card-open');
    ghost.hidden = true;
    if (document.activeElement && composeCard.contains(document.activeElement)) document.activeElement.blur();
    if (wasWalk) resumeIfWalk(gesture);
  }

  function openThread(id, { fromWalk = false } = {}) {
    const t = threads.get(id);
    if (!t) return;
    if (compose) closeCompose(false);
    closePop();
    if (fromWalk || ctx.getMode() === 'walk') { threadFromWalk = ctx.getMode() === 'walk'; if (threadFromWalk) ctx.releasePointer(); }
    else threadFromWalk = false;
    if (openId && threads.get(openId)?.pin) threads.get(openId).pin.el.classList.remove('active');
    openId = id;
    if (t.pin) t.pin.el.classList.add('active');
    tip.hidden = true;
    threadCard.hidden = false;
    document.body.classList.add('cm-card-open');
    cardPos.init = false;
    rName.value = rName.value || savedName();
    rErr.hidden = true;
    rPost.disabled = false;
    updateCount(rBody, rCount);
    renderThread();
    tBody.scrollTop = 0;
  }
  function closeThread(gesture) {
    if (!openId) return;
    const t = threads.get(openId);
    if (t?.pin) t.pin.el.classList.remove('active');
    openId = null;
    threadCard.hidden = true;
    if (!compose) document.body.classList.remove('cm-card-open');
    if (document.activeElement && threadCard.contains(document.activeElement)) document.activeElement.blur();
    if (threadFromWalk) { threadFromWalk = false; resumeIfWalk(gesture); }
  }

  function goTo(id) {
    const t = threads.get(id);
    if (!t) return;
    closePop();
    ctx.flyToPoint(t.top.clone(), 12);
    threadFromWalk = false;
    openThread(id);
    threadFromWalk = false; // flyToPoint leaves Walk, nothing to resume
  }

  // ----- Posting -----
  function updateCount(field, out) {
    const n = field.value.trim().length;
    out.textContent = n > LIMITS.body - 200 ? `${n}/${LIMITS.body}` : '';
    out.classList.toggle('over', n > LIMITS.body);
  }
  function validate(author, body) {
    if (!author) return 'Please add your name.';
    if (author.length > LIMITS.author) return `Names can be up to ${LIMITS.author} characters.`;
    if (!body) return 'Write a comment first.';
    if (body.length > LIMITS.body) return `Comments can be up to ${LIMITS.body} characters.`;
    if (Date.now() - lastPost < 4000) return 'One moment, you just posted.';
    return '';
  }
  function friendlyError(err) {
    const m = String(err?.message || err || '');
    if (!backend || status === 'unavailable' || /relation|does not exist|schema cache|PGRST2/i.test(m)) return 'Comments aren’t switched on yet. The database is still being set up.';
    if (/fetch|network/i.test(m)) return 'Couldn’t reach the server. Check your connection and try again.';
    return 'Couldn’t post that. Please try again.';
  }

  composeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!compose) return;
    const author = cName.value.trim(), body = cBody.value.trim();
    const bad = validate(author, body);
    if (bad) { cErr.textContent = bad; cErr.hidden = false; return; }
    if (!backend) { cErr.textContent = friendlyError(); cErr.hidden = false; return; }
    cErr.hidden = true;
    cPost.disabled = true;
    const p = compose.point;
    const row = { author, body, parent_id: null, x: +p.x.toFixed(3), y: +p.y.toFixed(3), z: +p.z.toFixed(3), mode: ctx.getMode() === 'walk' ? 'walk' : 'explore' };
    try {
      const saved = await backend.insert(row);
      lastPost = Date.now();
      store.set(KEYS.name, author);
      cName.value = rName.value = author;
      draft = '';
      cBody.value = '';
      seen[saved.id] = 1; store.set(KEYS.seen, seen);
      ingest([saved]);
      setStatus('ready');
      const wasWalk = compose?.walk;
      if (compose) { compose.walk = false; closeCompose(false); }
      ctx.toast('Comment posted. Others can find it on the map.');
      if (wasWalk && ctx.getMode() === 'walk' && !walkResumed) ctx.resumeWalk();
    } catch (err) {
      cErr.textContent = friendlyError(err);
      cErr.hidden = false;
      cPost.disabled = false;
      composeCard.classList.remove('posting');
      // We resumed Walk on the click; free the mouse again so the card can be fixed
      if (walkResumed && compose && ctx.getMode() === 'walk') {
        ctx.releasePointer();
        compose.walk = true;
        // The lock request is async and may land after this failure; free the mouse again when it does
        document.addEventListener('pointerlockchange', () => { if (compose && document.pointerLockElement) ctx.releasePointer(); }, { once: true });
      }
    }
    composeCard.classList.remove('posting');
    walkResumed = false;
  });
  // Pointer lock needs the click itself, so resume Walk on the Post click when it's going to succeed
  let walkResumed = false;
  cPost.addEventListener('click', () => {
    if (!compose?.walk || ctx.getMode() !== 'walk' || !backend) return;
    if (validate(cName.value.trim(), cBody.value.trim())) return;
    walkResumed = true;
    compose.walk = false; // resumed here, not again on close
    composeCard.classList.add('posting');
    ctx.resumeWalk();
  });
  cCancel.addEventListener('click', () => closeCompose(true));
  cBody.addEventListener('input', () => updateCount(cBody, cCount));
  rBody.addEventListener('input', () => updateCount(rBody, rCount));
  for (const f of [cBody, rBody]) {
    f.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); f.form.requestSubmit(); } });
  }
  cName.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); cBody.focus(); } });
  rName.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); rBody.focus(); } });

  replyForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const t = threads.get(openId);
    if (!t) return;
    const author = rName.value.trim(), body = rBody.value.trim();
    const bad = validate(author, body);
    if (bad) { rErr.textContent = bad; rErr.hidden = false; return; }
    if (!backend) { rErr.textContent = friendlyError(); rErr.hidden = false; return; }
    rErr.hidden = true;
    rPost.disabled = true;
    try {
      const saved = await backend.insert({ author, body, parent_id: t.root.id, x: null, y: null, z: null, mode: null });
      lastPost = Date.now();
      store.set(KEYS.name, author);
      cName.value = rName.value = author;
      rBody.value = '';
      updateCount(rBody, rCount);
      ingest([saved]);
      if (openId === t.root.id) { renderThread(); tBody.scrollTop = tBody.scrollHeight; }
    } catch (err) {
      rErr.textContent = friendlyError(err);
      rErr.hidden = false;
    }
    rPost.disabled = false;
  });

  // ----- Input -----
  fab.addEventListener('click', (e) => {
    e.stopPropagation();
    if (placing) { stopPlacing(); return; }
    pop.hidden ? openPop() : closePop();
  });
  dropBtn.addEventListener('click', () => startPlacing());
  toggle.addEventListener('change', () => {
    show = toggle.checked;
    store.set(KEYS.show, show);
    syncInteracts();
  });

  // Esc closes our UI first (capture phase, before main.js sends you to the main menu)
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      let used = true;
      if (placing) stopPlacing();
      else if (compose) closeCompose(true);
      else if (openId) closeThread(true);
      else if (!pop.hidden) closePop();
      else used = false;
      if (used) { e.preventDefault(); e.stopImmediatePropagation(); }
      return;
    }
    if (e.code === 'KeyC' && !e.repeat && !e.metaKey && !e.ctrlKey && !e.altKey && !ctx.typing(e)) {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (placing) stopPlacing(); else startPlacing();
    }
  }, { capture: true });

  // Placement: a click (or tap) that didn't turn into a drag. Dragging still looks around.
  let down = null;
  addEventListener('pointerdown', (e) => {
    if (placing && e.target === canvas) down = e.isPrimary ? { x: e.clientX, y: e.clientY, id: e.pointerId, moved: 0, multi: false } : (down && (down.multi = true), down);
    // Clicking the world closes the list
    if (!pop.hidden && !pop.contains(e.target) && !fab.contains(e.target)) closePop();
    // Walk with the mouse freed for a card: clicking the world goes back to walking
    if (e.target === canvas && ctx.getMode() === 'walk' && ((compose && compose.walk) || (openId && threadFromWalk))) {
      e.stopImmediatePropagation();
      if (compose) closeCompose(true); else closeThread(true);
    }
  }, { capture: true });
  addEventListener('pointermove', (e) => {
    if (down && e.pointerId === down.id) down.moved = Math.max(down.moved, Math.hypot(e.clientX - down.x, e.clientY - down.y));
  }, { capture: true });
  addEventListener('pointerup', (e) => {
    if (!placing || !down || e.pointerId !== down.id) return;
    const d = down; down = null;
    if (d.multi || d.moved > 6 || e.button !== 0) return;
    // Let main.js see this pointerup too, so its drag state is cleared
    const p = ctx.pickPoint(e.clientX, e.clientY);
    if (!p) { ctx.toast('Aim at the ground or a building to place your comment.'); return; }
    stopPlacing();
    openCompose(p, false);
  }, { capture: true });

  // ----- Per-frame: position markers and cards -----
  const v = new THREE.Vector3(), g = new THREE.Vector3(), b = new THREE.Vector3();
  const ray = new THREE.Raycaster();
  let occIdx = 0, roots = [], rootsAt = -1e9, frameNo = 0, hsRects = [];
  const pickRoots = (now) => {
    if (now - rootsAt > 2000) { rootsAt = now; roots = ctx.scene.children.filter((o) => !o.userData.noPick && !o.isLight); }
    return roots.filter((o) => o.visible);
  };
  // Screen boxes of visible hotspot labels, so markers don't sit on (and steal clicks from) them
  const readHotspots = () => {
    hsRects = [];
    for (const el of document.querySelectorAll('#hotspots .hotspot:not(.off)')) {
      const r = (el.classList.contains('far') && el.querySelector('.dot') || el).getBoundingClientRect(); // far: label is faded out
      if (r.width && r.height) hsRects.push(r);
    }
  };
  const onHotspot = (x, y) => hsRects.some((r) => x > r.left - 16 && x < r.right + 16 && y > r.top - 12 && y < r.bottom + 30);
  const cardPos = { x: 0, y: 0, init: false };
  const clamp = (x, a, z) => Math.max(a, Math.min(z, x));

  function project(world, out) {
    out.copy(world).project(camera);
    return { x: (out.x * 0.5 + 0.5) * innerWidth, y: (-out.y * 0.5 + 0.5) * innerHeight, z: out.z, on: out.z < 1 && Math.abs(out.x) < 1.08 && Math.abs(out.y) < 1.08 };
  }
  function placePin(pin, groundW, topW, dist, far) {
    const T = project(topW, v);
    const G = project(groundW, g);
    const s = clamp(1.15 - dist / 110, 0.7, 1.1);
    // Keep a visible stem even from far away, so markers always read as floating
    if (!far && G.z < 1) {
      const minLen = 26 * s, dx = T.x - G.x, dy = T.y - G.y, len = Math.hypot(dx, dy);
      if (len < minLen) { const k = len > 0.5 ? minLen / len : 0; T.x = G.x + dx * k; T.y = len > 0.5 ? G.y + dy * k : G.y - minLen; }
    }
    pin.bubble.style.transform = `translate(${T.x.toFixed(1)}px, ${T.y.toFixed(1)}px) scale(${s.toFixed(3)})`;
    const stemOk = !far && G.z < 1;
    pin.stem.style.display = pin.dot.style.display = stemOk ? '' : 'none';
    if (stemOk) {
      const dx = G.x - T.x, dy = G.y - T.y, len = Math.hypot(dx, dy);
      pin.stem.style.height = `${len.toFixed(1)}px`;
      pin.stem.style.transform = `translate(${T.x.toFixed(1)}px, ${T.y.toFixed(1)}px) rotate(${Math.atan2(-dx, dy).toFixed(4)}rad)`;
      pin.dot.style.transform = `translate(${G.x.toFixed(1)}px, ${G.y.toFixed(1)}px) scale(${s.toFixed(3)})`;
    }
    return T;
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const t = now / 1000;
    const camPos = camera.position;
    const walking = ctx.getMode() === 'walk';
    camera.updateMatrixWorld();

    // Pick the nearest visible markers
    const cand = [];
    for (const th of threads.values()) {
      const dist = camPos.distanceTo(th.top);
      const forced = th.root.id === openId;
      if (!forced && (!show || dist > MAX_DIST)) { th.vis = false; continue; }
      b.copy(th.top).project(camera);
      if (b.z >= 1 || Math.abs(b.x) > 1.1 || Math.abs(b.y) > 1.1) { th.vis = false; continue; }
      th.dist = dist;
      cand.push(th);
    }
    cand.sort((a, c) => (a.root.id === openId ? -1 : c.root.id === openId ? 1 : a.dist - c.dist));
    const near = cand.slice(0, MAX_PINS);
    const shown = new Set(near);
    if (!walking && frameNo++ % 8 === 0) readHotspots(); // layout read before this frame's writes
    if (walking) hsRects = [];

    // Walk: hide markers behind walls. One raycast per frame, round-robin in a stable (id) order,
    // skipping markers whose view hasn't changed since their last check.
    if (walking && near.length) {
      const order = near.slice().sort((a, c) => (a.root.id < c.root.id ? -1 : 1));
      for (let tries = 0; tries < order.length; tries++) {
        const th = order[occIdx++ % order.length];
        if (!th.pin) { th.occAt = null; continue; } // checked once its marker exists
        if (th.occAt && th.occAt.distanceToSquared(camPos) < 0.04 && now - th.occT < 1500) continue;
        ray.set(camPos, b.subVectors(th.top, camPos).normalize());
        ray.far = Math.max(0, th.dist - 0.8);
        const hit = ray.far > 0.5 && ray.intersectObjects(pickRoots(now), true).some((x) => x.object.visible && !x.object.userData.noPick);
        th.pin.occluded = !!hit;
        (th.occAt ||= new THREE.Vector3()).copy(camPos); th.occT = now;
        break;
      }
    } else for (const th of cand) if (th.pin) { th.pin.occluded = false; th.occAt = null; }

    for (const th of threads.values()) {
      const on = shown.has(th) && !(th.pin?.occluded && th.root.id !== openId);
      if (on && !th.pin) makePin(th);
      if (!th.pin) continue;
      const el = th.pin.el;
      setInteract(th, show && on);
      if (!on) { if (th.pin.shown) { el.classList.add('off'); th.pin.shown = false; } continue; }
      if (!th.pin.shown) { el.classList.remove('off'); th.pin.shown = true; }
      let far = th.dist > FAR_DIST && th.root.id !== openId;
      if (!far && hsRects.length && th.root.id !== openId && hoverId !== th.root.id) {
        b.copy(th.top).project(camera);
        far = onHotspot((b.x * 0.5 + 0.5) * innerWidth, (-b.y * 0.5 + 0.5) * innerHeight);
      }
      el.classList.toggle('far', far);
      el.classList.toggle('unread', isUnread(th));
      el.style.opacity = th.dist > 110 ? String(clamp(1 - (th.dist - 110) / (MAX_DIST - 110), 0, 1)) : '';
      el.style.zIndex = String(2000 - Math.round(th.dist * 10));
      v.copy(th.top); v.y += Math.sin(t * 1.4 + th.phase) * 0.07;
      const T = placePin(th.pin, th.pos, v.clone(), th.dist, far);
      if (hoverId === th.root.id && !tip.hidden) tip.style.transform = `translate(${T.x.toFixed(1)}px, ${(T.y - (far ? 22 : 48) * clamp(1.15 - th.dist / 110, 0.7, 1.1)).toFixed(1)}px) translate(-50%, -100%)`;
    }
    if (hoverId && !threads.get(hoverId)?.pin?.shown) tip.hidden = true;

    // Ghost marker while composing
    if (compose) {
      const top = compose.point.clone(); top.y += liftAt(compose.point) + Math.sin(t * 1.4) * 0.07;
      const T = project(top, b);
      if (T.z < 1) placePin({ bubble: ghost.lastElementChild, stem: ghost.children[1], dot: ghost.firstElementChild }, compose.point, top, camPos.distanceTo(top), false);
      ghost.style.visibility = T.z < 1 ? '' : 'hidden';
    }

    // Cards sit beside their marker (bottom sheet on small screens)
    const card = compose ? composeCard : openId ? threadCard : null;
    if (card) {
      if (narrow()) { card.style.transform = ''; card.classList.add('sheet'); }
      else {
        card.classList.remove('sheet');
        const anchor = compose ? compose.point.clone().setY(compose.point.y + liftAt(compose.point)) : threads.get(openId).top;
        const A = project(anchor, b);
        const w = card.offsetWidth, hgt = card.offsetHeight;
        const reserveR = document.body.classList.contains('cm-panel-open') ? 452 : 92;
        let x, y;
        if (A.z < 1) {
          x = A.x + 34;
          if (x + w > innerWidth - reserveR) x = A.x - 34 - w;
          y = A.y - hgt * 0.4;
        } else { x = innerWidth - reserveR - w; y = innerHeight / 2 - hgt / 2; }
        x = clamp(x, 16, innerWidth - reserveR - w);
        y = clamp(y, 72, innerHeight - 84 - hgt);
        if (!cardPos.init) { cardPos.x = x; cardPos.y = y; cardPos.init = true; }
        else { cardPos.x += (x - cardPos.x) * 0.2; cardPos.y += (y - cardPos.y) * 0.2; }
        card.style.transform = `translate(${cardPos.x.toFixed(1)}px, ${cardPos.y.toFixed(1)}px)`;
      }
    }
  }
  requestAnimationFrame(frame);

  if (MOCK || params.has('debug')) {
    window.__comments = {
      get status() { return status; }, threads, startPlacing, openThread, closeThread, openPop, closePop, goTo,
      get compose() { return compose; }, get openId() { return openId; }, get placing() { return placing; }, refresh,
      fullSync: () => { lastFull = 0; return refresh(); }, get backend() { return backend?.kind || null; },
    };
  }
}
