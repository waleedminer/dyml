// "Skip the game": a direct path for people who already know they want to
// help. Role cards say what you will do, when, for how long, with whom, and
// what happens next (the sludge and silence that lose volunteers). Step one is
// four fields inside the experience; the details come by email.
// Saved to Supabase (public.volunteer_applications); kept in this browser if
// that table is unreachable, so the demo never dead-ends.
import { getSupabase } from './supabase.js';

const KEY = 'wos.applications.local';
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage blocked */ } },
};
const MOCK = new URLSearchParams(location.search).has('mockSponsors');

// Each card answers: what, when, how long, with whom, what you need. Dates are set with the Foundation.
const ROLES = [
  { id: 'planting', title: 'Planting weekend', does: 'Plant and stake 60 seedlings, build mulch rings, run the first watering', when: 'Start of the rains (May to June)', long: '2 days', who: 'The orchard teacher and 8 volunteers', need: 'No skills needed. Bring boots. We train you on site', tag: 'Hands on' },
  { id: 'grafting', title: 'Grafting day', does: 'Graft mango and citrus seedlings in the nursery with students', when: 'Rainy season, one Saturday a month', long: '1 day', who: 'A trained grafter and 6 students', need: 'Good with your hands. We teach the cut', tag: 'Learn a skill' },
  { id: 'preserve', title: 'Preserving session', does: 'Run a food-safety and solar-drying session in the Harvest lab', when: 'Harvest season (April to June)', long: '1 afternoon', who: 'The Harvest and Preserve teacher', need: 'Cooking, food science or nursing background helps', tag: 'Teach' },
  { id: 'books', title: 'Bookkeeping mentor', does: 'Help students keep the orchard accounts and price a crate', when: 'Any time, remote', long: '1 hour a week for one term', who: 'The business-term teacher and 4 students', need: 'Comfortable with a simple ledger or spreadsheet', tag: 'Remote' },
  { id: 'market', title: 'Market-day driver', does: 'Drive produce to market and help the students sell it', when: 'Market days in season', long: 'Half a day', who: '2 students and the orchard teacher', need: 'A licence and a vehicle, or hire with us', tag: 'Local' },
  { id: 'build', title: 'Build weekend', does: 'Block walls and veranda columns on the school building', when: 'Now, while the school is under construction', long: '2 days', who: 'The construction crew', need: 'Construction, carpentry or electrical skills', tag: 'Hands on' },
  { id: 'other', title: 'Something else', does: 'Tell us what you can offer and we find the fit', when: 'You choose', long: 'You choose', who: 'The Foundation team', need: 'Anything: design, fundraising, translation, photography', tag: 'Open' },
];
const WANTS = ['Help people', 'Learn a skill', 'Meet people', 'Build my career', 'Give back to my faith', 'Something else'];

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

async function save(row) {
  if (!MOCK) {
    try {
      const sb = await getSupabase();
      const { error } = await sb.from('volunteer_applications').insert(row);
      if (!error) return 'supabase';
      console.warn('application insert failed', error);
    } catch (e) { console.warn('application backend unavailable', e); }
  }
  const rows = store.get(KEY, []);
  rows.push({ ...row, created_at: new Date().toISOString() });
  store.set(KEY, Array.isArray(rows) ? rows : [row]);
  return 'local';
}

export function initApply(ctx) {
  let fromWalk = false, chosen = null;
  const name = h('input', { type: 'text', maxlength: '80', autocomplete: 'name', placeholder: 'Your name', required: true });
  const email = h('input', { type: 'email', maxlength: '120', autocomplete: 'email', placeholder: 'Email or WhatsApp number', required: true });
  const cards = h('div', { class: 'ap-roles', role: 'radiogroup', 'aria-label': 'Choose a role' });
  const want = h('div', { class: 'ap-chips', role: 'radiogroup', 'aria-label': 'What you want from this' },
    ...WANTS.map((w, i) => h('label', { class: 'ap-chip' }, h('input', { type: 'radio', name: 'ap-want', value: w, checked: i === 0 }), h('span', { text: w }))));
  const message = h('textarea', { rows: '2', maxlength: '600', placeholder: 'Optional: where you are, when you could start, anything else' });
  const err = h('p', { class: 'cm-error', hidden: true, role: 'alert' });
  const submit = h('button', { type: 'submit', class: 'btn primary', text: 'Send application' });
  const next = h('div', { class: 'ap-next' },
    h('b', { text: 'What happens next' }),
    h('ol', {}, h('li', { text: 'A named person from the Foundation replies within 48 hours.' }), h('li', { text: 'You get the dates and a short call to match you to a role.' }), h('li', { text: 'You hear first when the planting season is set.' })));
  const form = h('form', { class: 'ap-form', novalidate: true },
    h('p', { class: 'sp-label', text: 'Pick a role' }), cards,
    h('div', { class: 'ap-row' },
      h('label', { class: 'cm-field' }, h('span', { text: 'Name' }), name),
      h('label', { class: 'cm-field' }, h('span', { text: 'How to reach you' }), email)),
    h('p', { class: 'sp-label', text: 'What do you most want from this?' }), want,
    h('label', { class: 'cm-field' }, h('span', { text: 'Message (optional)' }), message),
    err,
    h('div', { class: 'cm-actions' }, h('button', { type: 'button', class: 'btn', text: 'Back', onclick: () => close() }), submit),
    next,
    h('p', { class: 'sp-fine', text: 'Your details go to the project team only. Dates are set with the Foundation. Prototype: the reply process is being confirmed.' }),
  );
  const done = h('div', { class: 'sp-thanks', hidden: true });
  const card = h('section', { class: 'ap-card card', role: 'dialog', 'aria-label': 'Apply to volunteer', hidden: true },
    h('button', { class: 'close', type: 'button', 'aria-label': 'Close', text: '×', onclick: () => close() }),
    h('p', { class: 'eyebrow', text: 'Skip the game' }),
    h('h2', { text: 'Apply to volunteer' }),
    h('p', { class: 'ap-lede', text: 'Four fields now. The details come by email. Every role says what you will do, when, for how long and with whom.' }),
    form, done,
  );
  document.body.append(card);

  function renderCards() {
    cards.replaceChildren(...ROLES.map((r) => h('button', { type: 'button', role: 'radio', class: `ap-role${chosen === r.id ? ' on' : ''}`, 'aria-checked': String(chosen === r.id), onclick: () => { chosen = r.id; renderCards(); } },
      h('span', { class: 'ap-role-tag', text: r.tag }),
      h('b', { text: r.title }),
      h('span', { class: 'ap-role-does', text: r.does }),
      h('dl', { class: 'ap-role-meta' },
        h('dt', { text: 'When' }), h('dd', { text: r.when }),
        h('dt', { text: 'How long' }), h('dd', { text: r.long }),
        h('dt', { text: 'With' }), h('dd', { text: r.who }),
        h('dt', { text: 'You need' }), h('dd', { text: r.need })),
    )));
  }

  function open(preset) {
    fromWalk = ctx.getMode() === 'walk';
    if (fromWalk) ctx.releasePointer();
    ctx.hideMenu?.();
    chosen = preset || chosen || null;
    renderCards();
    form.hidden = false; done.hidden = true; err.hidden = true;
    card.hidden = false;
    card.classList.remove('out'); void card.offsetWidth; card.classList.add('in');
    document.body.classList.add('ap-open');
  }
  function close() {
    if (card.hidden) return;
    if (card.contains(document.activeElement)) document.activeElement.blur();
    card.classList.remove('in'); card.classList.add('out');
    document.body.classList.remove('ap-open');
    setTimeout(() => { card.hidden = true; }, 350);
    if (fromWalk) { fromWalk = false; ctx.resumeWalk(); }
  }
  let posting = false;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (posting) return;
    const who = name.value.trim(), contact = email.value.trim();
    if (!chosen) { err.textContent = 'Pick a role first.'; err.hidden = false; cards.scrollIntoView({ block: 'nearest' }); return; }
    if (!who) { err.textContent = 'Add your name.'; err.hidden = false; name.focus(); return; }
    if (contact.length < 5) { err.textContent = 'Add an email or a WhatsApp number we can reply to.'; err.hidden = false; email.focus(); return; }
    posting = true; submit.disabled = true; err.hidden = true;
    try {
      const role = ROLES.find((r) => r.id === chosen);
      const motive = want.querySelector('input:checked')?.value || WANTS[0];
      await save({ name: who, email: contact, location: null, skills: [role.title], availability: role.long, message: [`Wants: ${motive}`, message.value.trim()].filter(Boolean).join(' · ') || null, role: ctx.getRole?.() || null });
      form.hidden = true;
      done.hidden = false;
      done.replaceChildren(
        h('b', { text: `Shukran, ${who}.` }),
        h('p', { text: `You asked for "${role.title}". A named person replies to ${contact} within 48 hours with the dates. Until then, the orchard is yours to explore, and any tree can carry your name.` }),
        h('div', { class: 'cm-actions' },
          h('button', { class: 'btn', type: 'button', text: 'Explore the model', onclick: () => { close(); ctx.showMenu?.(); } }),
          h('button', { class: 'btn primary', type: 'button', text: 'Sponsor a tree', onclick: () => { close(); ctx.sponsorAny?.(); } }),
        ),
      );
      ctx.toast?.('Application sent. A reply comes within 48 hours.');
      ctx.emit?.('apply', chosen);
    } catch (ex) {
      err.textContent = 'Could not send. Please try again.'; err.hidden = false;
    } finally { posting = false; submit.disabled = false; }
  });
  addEventListener('keydown', (e) => {
    if (card.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); close(); }
    else if (!e.metaKey && !e.ctrlKey && !e.altKey) e.stopPropagation();
  }, { capture: true });

  return { open, close, get isOpen() { return !card.hidden; } };
}
