// Roles: pick a character (volunteer, student, teacher), then see the model
// through that lens. The role tailors the main menu, appends notes to every
// info panel and tracks a short path of objectives in a HUD card.
import { ROLES } from './data.js';

const KEYS = { role: 'wos.role', done: 'wos.mission' };
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage blocked */ } },
};

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

// One icon set, one stroke weight (NN/g: icons always carry a visible label, which the HUD does)
export const ICONS = {
  hands: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12l4-4 4 3 3-3 4 4M3 12v5l5 3h8l5-3v-5M7 15l3 1 4-2"/></svg>',
  leaf: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14zM5 19c3-4 6-7 9-9"/></svg>',
  book: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 5v16M8 7h7"/></svg>',
};
const icon = (k) => ICONS[k] || '';
// Stylised portraits in the site's palette
const AVATARS = {
  volunteer: `<svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="58" fill="#f3d9bf"/><path d="M14 112c6-26 24-38 46-38s40 12 46 38" fill="#b5643a"/><path d="M34 86c6-8 14-12 26-12s20 4 26 12l-6 10H40z" fill="#e9c46a"/><circle cx="60" cy="48" r="22" fill="#8a5a3c"/><path d="M38 44c2-16 12-24 22-24s20 8 22 24c-6-6-14-9-22-9s-16 3-22 9z" fill="#2b1d14"/><path d="M36 40h48l-3 8H39z" fill="#2f5d45"/><circle cx="52" cy="50" r="2.4" fill="#1d231f"/><circle cx="68" cy="50" r="2.4" fill="#1d231f"/><path d="M52 60c3 3 13 3 16 0" stroke="#1d231f" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M86 98l10-16 8 6-8 14z" fill="#5b4330"/><path d="M96 82l6-10 8 4-6 10z" fill="#8fae3c"/></svg>`,
  student: `<svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="58" fill="#d8e6d2"/><path d="M14 112c6-26 24-38 46-38s40 12 46 38" fill="#1f3a66"/><path d="M46 76l14 10 14-10v14H46z" fill="#f2efe6"/><circle cx="60" cy="48" r="22" fill="#6d4a30"/><path d="M34 52c0-20 12-30 26-30s26 10 26 30c0 10-4 20-8 26H42c-4-6-8-16-8-26z" fill="#f2efe6"/><circle cx="60" cy="50" r="18" fill="#6d4a30"/><circle cx="53" cy="50" r="2.4" fill="#1d231f"/><circle cx="67" cy="50" r="2.4" fill="#1d231f"/><path d="M53 59c3 4 11 4 14 0" stroke="#1d231f" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M84 104c0-14 6-22 14-26-2 10 0 20-8 28" fill="#2f5d45"/><path d="M98 78c-6 8-10 18-10 26" stroke="#1f3b2c" stroke-width="2" fill="none"/></svg>`,
  teacher: `<svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="58" fill="#ead9c0"/><path d="M14 112c6-26 24-38 46-38s40 12 46 38" fill="#2f5d45"/><path d="M48 76l12 8 12-8 2 36H46z" fill="#f2efe6"/><path d="M58 84h4l2 28h-8z" fill="#b5643a"/><circle cx="60" cy="48" r="22" fill="#5a3a26"/><path d="M38 46c0-16 10-24 22-24s22 8 22 24c-8-4-14-6-22-6s-14 2-22 6z" fill="#1d231f"/><rect x="44" y="45" width="12" height="9" rx="4" fill="none" stroke="#1d231f" stroke-width="2"/><rect x="64" y="45" width="12" height="9" rx="4" fill="none" stroke="#1d231f" stroke-width="2"/><path d="M56 49h8" stroke="#1d231f" stroke-width="2"/><path d="M52 60c3 3 13 3 16 0" stroke="#1d231f" stroke-width="2" fill="none" stroke-linecap="round"/><rect x="82" y="78" width="26" height="18" rx="2" fill="#1f4a3a" transform="rotate(-8 95 87)"/><path d="M86 84h16M86 89h12" stroke="#e9c46a" stroke-width="2" transform="rotate(-8 95 87)"/></svg>`,
};

export function initRoles(ctx) {
  const coarse = matchMedia('(pointer: coarse)').matches;
  let role = ROLES[store.get(KEYS.role, null)] ? store.get(KEYS.role, null) : null;
  let done = store.get(KEYS.done, {});
  if (typeof done !== 'object' || !done) done = {};
  let onPicked = null;

  // ----- Picker -----
  const order = ['student', 'volunteer', 'teacher'];
  const cards = order.map((id) => [id, ROLES[id]]).map(([id, r]) =>
    h('button', { class: `role-card${id === 'student' ? ' is-primary' : ''}`, type: 'button', 'data-role': id, style: `--role: ${r.color}`, onclick: () => choose(id) },
      id === 'student' ? h('span', { class: 'role-start', text: 'Start here' }) : null,
      h('span', { class: 'role-avatar', html: AVATARS[id] }),
      h('span', { class: 'role-name', text: r.name }),
      h('span', { class: 'role-tag', text: r.tagline }),
      h('ul', { class: 'role-does' }, ...r.does.map((d) => h('li', { text: d }))),
      h('span', { class: 'role-go', html: `Play as ${r.article} <span aria-hidden="true">→</span>` }),
    ));
  const picker = h('section', { class: 'role-pick', role: 'dialog', 'aria-label': 'Choose your role', hidden: true },
    h('div', { class: 'role-pick-inner' },
      h('p', { class: 'eyebrow', text: 'Choose your character' }),
      h('h2', { text: 'How do you want to see the orchard?' }),
      h('p', { class: 'role-lede', text: 'Most people start as a student: one short walk, one job at a time. Each role changes what the model tells you. You can switch at any time.' }),
      h('div', { class: 'role-cards' }, ...cards),
      h('div', { class: 'role-foot' },
        h('button', { class: 'role-later', type: 'button', text: 'Just look around for now', onclick: () => { hide(); onPicked?.(null); } }),
        h('button', { class: 'role-skip', type: 'button', html: 'Skip the game · <b>Apply to volunteer</b> <span aria-hidden="true">→</span>', onclick: () => { hide(); onPicked?.(null); onPicked = null; ctx.apply?.(); } }),
      ),
    ));
  document.body.append(picker);

  // ----- Mission HUD -----
  const mTitle = h('b');
  const mCount = h('span', { class: 'mission-count' });
  const mExtra = h('span', { class: 'mission-extra', hidden: true });
  const mList = h('ol', { class: 'mission-list' });
  const mDone = h('div', { class: 'mission-done', hidden: true });
  const mSwitch = h('button', { class: 'mission-switch', type: 'button', text: 'Change role', onclick: () => show(ctx.onPicked) });
  const mBody = h('div', { class: 'mission-body', hidden: true }, mList, mDone, mSwitch);
  const mHead = h('button', { class: 'mission-head', type: 'button', 'aria-expanded': 'false', onclick: () => toggleHud() },
    h('span', { class: 'mission-icon' }), h('span', { class: 'mission-text' }, mTitle, h('span', {}, mCount, mExtra)), h('span', { class: 'mission-chev', 'aria-hidden': 'true', text: '⌄' }));
  const hud = h('aside', { class: 'mission card', hidden: true, 'aria-label': 'Your path' }, mHead, mBody);
  document.body.append(hud);
  let hudOpen = false;
  function toggleHud(force) {
    hudOpen = force ?? !hudOpen;
    mBody.hidden = !hudOpen;
    hud.classList.toggle('open', hudOpen);
    mHead.setAttribute('aria-expanded', String(hudOpen));
  }

  const steps = () => (role ? ROLES[role].mission.steps.filter((s) => !(s.kb && coarse)) : []);
  const stepDone = (s) => !!(done[role] && done[role][s.id]);
  const current = () => steps().find((s) => !stepDone(s)) || null;
  const listeners = new Set();
  const notify = () => listeners.forEach((fn) => fn());
  const progress = (s) => (done[role] && done[role].__n && done[role].__n[s.id]) || 0;
  const stepLabel = (s) => (s.count && !stepDone(s) && progress(s) ? `${s.label} (${progress(s)}/${s.count})` : s.label);
  function renderHud() {
    if (!role) { hud.hidden = true; return; }
    const r = ROLES[role], list = steps();
    const n = list.filter(stepDone).length;
    hud.hidden = false;
    hud.style.setProperty('--role', r.color);
    mHead.querySelector('.mission-icon').innerHTML = icon(r.icon);
    mTitle.textContent = r.mission.title;
    mCount.textContent = `${n} / ${list.length}`;
    const cur = current();
    mList.replaceChildren(...list.map((s) => h('li', { class: stepDone(s) ? 'done' : s === cur ? 'current' : '' }, h('i', { 'aria-hidden': 'true' }), h('span', { text: stepLabel(s) }))));
    const all = n === list.length && list.length > 0;
    mDone.hidden = !all;
    if (all) {
      const cta = r.mission.done.cta;
      mDone.replaceChildren(
        h('b', { text: r.mission.done.title }),
        h('p', { text: r.mission.done.text }),
        cta.href ? h('a', { class: 'btn primary', href: cta.href, text: cta.label })
          : h('button', { class: 'btn primary', type: 'button', text: cta.label, onclick: () => ctx.action?.(cta.action) }),
      );
    }
  }

  // ----- Apply a role to the page -----
  function apply() {
    document.body.dataset.role = role || '';
    const r = role ? ROLES[role] : null;
    const eyebrow = document.querySelector('#intro .eyebrow');
    const lede = document.querySelector('#intro .lede');
    if (eyebrow) {
      eyebrow.replaceChildren();
      if (r) {
        eyebrow.append(`Playing as ${r.article} · `, h('button', { class: 'linklike', type: 'button', text: 'change role', onclick: () => show(ctx.onPicked) }));
      } else eyebrow.append('Sierra Leone · DYML prototype · ', h('button', { class: 'linklike', type: 'button', text: 'pick a role', onclick: () => show(ctx.onPicked) }));
    }
    if (lede) lede.textContent = r ? r.lede : 'A 3D model of a school orchard designed to give students food, skills and income, and to keep giving for generations.';
    // Recommended mode card
    const rec = { tour: 'startTour', explore: 'freeExplore', walk: 'menuWalk' };
    document.querySelectorAll('.mode-card').forEach((c) => {
      const isRec = r ? c.id === rec[r.recommend] : c.id === 'freeExplore';
      c.classList.toggle('is-default', isRec);
      const t = c.querySelector('.mode-tag');
      if (t) t.remove();
      if (isRec) c.querySelector('.mode-text b').append(h('span', { class: 'mode-tag', text: r ? `For ${r.name.toLowerCase()}s` : 'Default' }));
    });
    renderHud();
    notify();
  }

  function welcome() {
    const s = steps().find((x) => x.welcome && !stepDone(x));
    if (!s) return false;
    done[role] = done[role] || {}; done[role][s.id] = Date.now(); store.set(KEYS.done, done);
    renderHud(); notify();
    return true;
  }
  function choose(id) {
    if (!ROLES[id]) return;
    role = id;
    store.set(KEYS.role, id);
    apply();
    hide();
    const gift = welcome();
    ctx.toast?.(gift ? `Welcome gift: your first stop is done. ${steps().length - 1} to go. Your path is in the top-right corner.` : `You are now ${ROLES[id].article}. Your path is in the top-right corner.`);
    toggleHud(true);
    setTimeout(() => toggleHud(false), 5000);
    onPicked?.(id);
    onPicked = null;
  }
  function show(cb) {
    onPicked = cb || onPicked;
    picker.hidden = false;
    picker.classList.remove('out'); void picker.offsetWidth; picker.classList.add('in');
    document.body.classList.add('role-picking');
    cards[0].focus({ preventScroll: true });
  }
  function hide() {
    if (picker.hidden) return;
    picker.classList.remove('in'); picker.classList.add('out');
    document.body.classList.remove('role-picking');
    setTimeout(() => { picker.hidden = true; }, 420);
  }
  addEventListener('keydown', (e) => {
    if (picker.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); hide(); onPicked?.(null); onPicked = null; }
  }, { capture: true });

  // ----- Objectives -----
  function complete(s) {
    done[role] = done[role] || {};
    if (done[role][s.id]) return;
    done[role][s.id] = Date.now();
    store.set(KEYS.done, done);
    renderHud();
    notify();
    hud.classList.remove('bump'); void hud.offsetWidth; hud.classList.add('bump');
    const list = steps(), n = list.filter(stepDone).length;
    if (n === list.length) { toggleHud(true); ctx.toast?.(`${ROLES[role].mission.done.title}. ${ROLES[role].name} path complete.`); }
    else ctx.toast?.(`✓ ${s.label} · ${n} of ${list.length}`);
  }
  function onEvent(name, detail) {
    if (!role) return;
    for (const s of steps()) {
      if (s.event !== name || stepDone(s)) continue;
      if (s.match && !s.match.some((m) => (typeof detail === 'string' ? detail === m || detail.includes(m) : false))) continue;
      if (s.count) {
        done[role] = done[role] || {}; done[role].__n = done[role].__n || {};
        const n = (done[role].__n[s.id] = (done[role].__n[s.id] || 0) + 1);
        store.set(KEYS.done, done);
        if (n < s.count) { renderHud(); notify(); continue; }
      }
      complete(s);
    }
  }
  for (const ev of ['hotspot', 'info', 'walk', 'tour', 'pick', 'truck', 'share', 'sponsor', 'door', 'quiz', 'apply', 'arrive', 'fund']) ctx.on(ev, (d) => onEvent(ev, d));

  // Notes appended to an info panel for the current role (HTML, from our own data only)
  function notesFor(id) {
    if (!role) return '';
    const r = ROLES[role], items = r.notes[id];
    if (!items) return '';
    return `<h3 class="role-note" style="--role:${r.color}"><span class="role-note-icon" aria-hidden="true">${icon(r.icon)}</span>${r.noteTitle}</h3><ul class="role-note-list">${items.map((t) => `<li>${t}</li>`).join('')}</ul>`;
  }

  function setExtra(text) { mExtra.textContent = text || ''; mExtra.hidden = !text; }
  function set(id) { if (!ROLES[id]) return; role = id; store.set(KEYS.role, id); apply(); hide(); welcome(); }

  apply();
  if (role) welcome();
  function reset() { if (!role) return; delete done[role]; store.set(KEYS.done, done); renderHud(); notify(); }
  return {
    get role() { return role; }, show, hide, set, notesFor, apply, setExtra, reset,
    steps, current, isDone: stepDone, progress, onChange: (fn) => listeners.add(fn),
    get picking() { return !picker.hidden; },
  };
}
