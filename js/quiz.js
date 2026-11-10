// Quick checks: a question at the end of every info panel. First try scores
// 10, second try 5, then the answer is shown. Three first-try answers in a row
// earn a streak bonus. Answer every stop to earn the Orchard Scholar
// certificate and put a score on the class leaderboard (Supabase
// public.quiz_scores, kept in this browser if the table is unreachable).
import { QUIZ } from './data.js';
import { getSupabase } from './supabase.js';

const KEYS = { state: 'wos.quiz', name: 'wos.comments.name', board: 'wos.quiz.board.local' };
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage blocked */ } },
};
const MOCK = new URLSearchParams(location.search).has('mockSponsors');
const IDS = Object.keys(QUIZ);
const TOTAL = IDS.length;
const PTS = { first: 10, second: 5, streak: 5 };
const MAX = TOTAL * PTS.first + Math.floor(TOTAL / 3) * PTS.streak;

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

export function initQuiz(ctx) {
  let state = store.get(KEYS.state, null);
  if (!state || typeof state !== 'object' || !state.answers) state = { answers: {}, streak: 0, best: 0 };
  const save = () => store.set(KEYS.state, state);
  const answered = () => IDS.filter((id) => state.answers[id]?.done).length;
  const score = () => IDS.reduce((s, id) => s + (state.answers[id]?.points || 0), 0) + (state.bonus || 0);

  // ----- Question block inside a panel -----
  function mount(id, host) {
    const q = QUIZ[id];
    if (!q || !host) return;
    const rec = state.answers[id] || { tries: 0, done: false, points: 0, picked: [] };
    const student = ctx.getRole?.() === 'student';
    const block = h('section', { class: `quiz${student || rec.done ? '' : ' collapsed'}`, 'aria-label': 'Quick check' });
    const pts = h('span', { class: 'quiz-pts' });
    const head = h('div', { class: 'quiz-head' }, h('span', { class: 'quiz-tag', text: 'Quick check' }), pts);
    const qEl = h('p', { class: 'quiz-q', text: q.q });
    const opts = h('div', { class: 'quiz-opts', role: 'group' });
    const fb = h('p', { class: 'quiz-fb', hidden: true, role: 'status' });
    const expand = h('button', { class: 'quiz-expand', type: 'button', html: `Test yourself <b>${PTS.first} pts</b>`, onclick: () => { block.classList.remove('collapsed'); } });
    block.append(head, expand, qEl, opts, fb);
    host.append(block);

    function render() {
      pts.textContent = rec.done ? (rec.points ? `+${rec.points} pts` : 'Answered') : rec.tries === 0 ? `${PTS.first} pts` : `${PTS.second} pts left`;
      pts.classList.toggle('won', rec.done && rec.points > 0);
      opts.replaceChildren(...q.o.map((text, i) => {
        const picked = rec.picked.includes(i);
        const cls = rec.done ? (i === q.a ? 'right' : picked ? 'wrong' : 'dim') : picked ? 'wrong' : '';
        return h('button', { type: 'button', class: `quiz-opt ${cls}`, style: `--i:${i}`, disabled: rec.done || picked, onclick: () => answer(i) },
          h('i', { 'aria-hidden': 'true', text: String.fromCharCode(65 + i) }), h('span', { text }));
      }));
      if (rec.done) {
        fb.hidden = false;
        fb.className = `quiz-fb ${rec.points ? 'ok' : 'no'}`;
        fb.textContent = `${rec.points ? (rec.tries === 1 ? 'Right first time.' : 'Right.') : `The answer is ${String.fromCharCode(65 + q.a)}.`} ${q.why}`;
      } else if (rec.tries) {
        fb.hidden = false; fb.className = 'quiz-fb no';
        fb.textContent = 'Not that one. One more try for half points.';
      }
    }
    function answer(i) {
      if (rec.done) return;
      rec.tries++;
      rec.picked.push(i);
      if (i === q.a) {
        ctx.juice?.sfx.right();
        rec.done = true;
        rec.points = rec.tries === 1 ? PTS.first : PTS.second;
        if (rec.tries === 1) { state.streak++; if (state.streak % 3 === 0) { state.bonus = (state.bonus || 0) + PTS.streak; ctx.toast?.(`Streak! +${PTS.streak} bonus points.`); } }
        else state.streak = 0;
      } else { ctx.juice?.sfx.wrong(); if (rec.tries >= 2) { rec.done = true; rec.points = 0; state.streak = 0; } }
      state.answers[id] = rec;
      save();
      render();
      if (rec.done) {
        block.classList.remove('bump'); void block.offsetWidth; block.classList.add('bump');
        ctx.emit?.('quiz', id);
        refreshChip();
        if (answered() === TOTAL) { ctx.juice?.sfx.done(); setTimeout(() => openCert(), 900); }
      }
    }
    render();
  }

  // ----- Contextual prompt: one question anchored to what you just did -----
  const popHost = h('div', { class: 'quiz-pop-body' });
  const popKicker = h('p', { class: 'eyebrow' });
  const pop = h('section', { class: 'quiz-pop card', role: 'dialog', 'aria-label': 'Quick check', hidden: true },
    h('button', { class: 'close', type: 'button', 'aria-label': 'Close', text: '×', onclick: () => closePrompt() }), popKicker, popHost);
  document.body.append(pop);
  let popWalk = false, popTimer = 0;
  function prompt(id, context) {
    const q = QUIZ[id];
    if (!q || state.answers[id]?.done || !pop.hidden || !(ctx.getRole?.() === 'student' || ctx.getRole?.() == null)) return;
    popKicker.textContent = context ? `${context} · quick check` : 'Quick check';
    popHost.replaceChildren();
    mount(id, popHost);
    popHost.querySelector('.quiz')?.classList.remove('collapsed');
    popWalk = ctx.getMode() === 'walk';
    if (popWalk) ctx.releasePointer();
    pop.hidden = false;
    pop.classList.remove('in'); void pop.offsetWidth; pop.classList.add('in');
    clearTimeout(popTimer);
    popHost.addEventListener('click', onPopAnswer);
  }
  function onPopAnswer(e) {
    if (!e.target.closest('.quiz-opt')) return;
    // close a beat after the question is finished (a correct option is only marked once the question is done)
    setTimeout(() => { if (popHost.querySelector('.quiz-opt.right')) { clearTimeout(popTimer); popTimer = setTimeout(closePrompt, 3200); } }, 50);
  }
  function closePrompt() {
    if (pop.hidden) return;
    popHost.removeEventListener('click', onPopAnswer);
    pop.hidden = true;
    if (popWalk) { popWalk = false; ctx.resumeWalk(); }
  }
  addEventListener('keydown', (e) => {
    if (pop.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); closePrompt(); }
  }, { capture: true });

  // ----- Score in the path card -----
  function refreshChip() {
    const n = answered();
    ctx.setExtra?.(n ? `${score()} pts · ${n}/${TOTAL}` : '');
  }

  // ----- Certificate and leaderboard -----
  const certName = h('input', { type: 'text', maxlength: '40', autocomplete: 'name', placeholder: 'Your name' });
  const certNameLine = h('b', { class: 'cert-name' });
  const certScore = h('span', { class: 'cert-score' });
  const certDate = h('span', { class: 'cert-date' });
  const board = h('ol', { class: 'cert-board', hidden: true });
  const boardNote = h('p', { class: 'cert-board-note', hidden: true });
  const boardToggle = h('button', { class: 'linklike', type: 'button', text: 'For teachers: show the class board', onclick: () => { const show = board.hidden; board.hidden = !show; boardNote.hidden = !show || !boardNote.textContent; boardToggle.textContent = show ? 'Hide the class board' : 'For teachers: show the class board'; if (show) loadBoard(); } });
  const impact = h('div', { class: 'cert-impact' });
  const certEmail = h('input', { type: 'email', maxlength: '120', autocomplete: 'email', placeholder: 'you@example.com (optional)' });
  const shareBtn = h('button', { class: 'btn', type: 'button', text: 'Share image', onclick: () => shareImage() });
  const saveBtn = h('button', { class: 'btn primary', type: 'button', text: 'Save my score' });
  const certSheet = h('div', { class: 'cert-sheet' },
    h('p', { class: 'eyebrow', text: 'Waqf Orchard School · Sierra Leone' }),
    h('h2', { text: 'Orchard Scholar' }),
    h('p', { class: 'cert-sub', text: 'This certifies that' }),
    certNameLine,
    h('p', { class: 'cert-sub', text: 'answered every quick check in the orchard, from seed to market, and knows how a school can grow its own future.' }),
    h('div', { class: 'cert-meta' }, certScore, certDate),
    h('div', { class: 'cert-seal', 'aria-hidden': 'true', text: '◆' }),
  );
  const cert = h('section', { class: 'cert card', role: 'dialog', 'aria-label': 'Orchard Scholar certificate', hidden: true },
    h('button', { class: 'close', type: 'button', 'aria-label': 'Close', text: '×', onclick: () => closeCert() }),
    certSheet,
    h('figure', { class: 'cert-photo' }, h('img', { src: 'assets/site-today-1.jpg', alt: 'Block walls going up at the school under construction', loading: 'lazy' }), h('figcaption', { text: 'The school today: walls going up between the concrete columns. The orchard you walked through is the plan for the land around it.' })),
    impact,
    h('div', { class: 'cert-actions' },
      h('label', { class: 'cm-field cert-field' }, h('span', { text: 'Name on the certificate' }), certName),
      h('label', { class: 'cm-field cert-field' }, h('span', { text: 'Email me the certificate and tree updates' }), certEmail),
    ),
    h('div', { class: 'cert-actions' }, saveBtn, shareBtn, h('button', { class: 'btn', type: 'button', text: 'Print', onclick: () => window.print() })),
    h('p', { class: 'cert-board-row' }, boardToggle),
    board, boardNote,
  );
  document.body.append(cert);
  certName.addEventListener('input', () => { certNameLine.textContent = certName.value.trim() || '…'; });

  let fromWalk = false;
  function renderImpact() {
    const im = ctx.impact?.() || {};
    impact.replaceChildren(
      h('b', { text: 'Together, so far' }),
      h('div', { class: 'cert-impact-row' },
        h('span', {}, h('b', { text: String(im.trees ?? 0) }), h('small', { text: 'trees sponsored' })),
        h('span', {}, h('b', { text: String(im.fruit ?? 0) }), h('small', { text: 'fruit you picked' })),
        h('span', {}, h('b', { text: String(answered()) }), h('small', { text: 'quick checks answered' })),
      ),
    );
  }
  function openCert() {
    const n = answered(), s = score();
    renderImpact();
    certName.value = certName.value || String(store.get(KEYS.name, '') ?? '').slice(0, 40);
    certNameLine.textContent = certName.value.trim() || '…';
    certScore.textContent = `${s} of ${MAX} points · ${n} of ${TOTAL} stops`;
    certDate.textContent = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    cert.classList.toggle('partial', n < TOTAL);
    cert.querySelector('h2').textContent = n < TOTAL ? 'Your score so far' : 'Orchard Scholar';
    fromWalk = ctx.getMode() === 'walk';
    if (fromWalk) ctx.releasePointer();
    ctx.hideMenu?.();
    cert.hidden = false;
    cert.classList.remove('out'); void cert.offsetWidth; cert.classList.add('in');
    document.body.classList.add('cert-open');
    if (!board.hidden) loadBoard();
  }
  function closeCert() {
    if (cert.hidden) return;
    if (cert.contains(document.activeElement)) document.activeElement.blur();
    cert.classList.remove('in'); cert.classList.add('out');
    document.body.classList.remove('cert-open');
    setTimeout(() => { cert.hidden = true; }, 350);
    if (fromWalk) { fromWalk = false; ctx.resumeWalk(); }
  }
  addEventListener('keydown', (e) => {
    if (cert.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); closeCert(); }
    else if (!e.metaKey && !e.ctrlKey && !e.altKey) e.stopPropagation();
  }, { capture: true });

  async function backend() {
    if (!MOCK) {
      try {
        const sb = await getSupabase();
        const probe = await sb.from('quiz_scores').select('id').limit(1);
        if (!probe.error) return {
          kind: 'supabase',
          async top() { const { data, error } = await sb.from('quiz_scores').select('name,score,answered,created_at').order('score', { ascending: false }).order('created_at', { ascending: true }).limit(10); if (error) throw error; return data || []; },
          async add(row) { const { error } = await sb.from('quiz_scores').insert(row); if (error) throw error; },
        };
      } catch (e) { console.warn('quiz board unavailable', e); }
    }
    return {
      kind: 'local',
      async top() { const rows = store.get(KEYS.board, []); return (Array.isArray(rows) ? rows : []).sort((a, b) => b.score - a.score).slice(0, 10); },
      async add(row) { const rows = store.get(KEYS.board, []); rows.push({ ...row, created_at: new Date().toISOString() }); store.set(KEYS.board, Array.isArray(rows) ? rows : [row]); },
    };
  }
  let be = null, demoRows = [];
  async function loadBoard() {
    be = be || await backend();
    try {
      let rows = await be.top();
      if (demoRows.length && rows.length < 3) rows = [...rows, ...demoRows].sort((a, b) => b.score - a.score).slice(0, 10);
      board.replaceChildren(...rows.map((r) => h('li', {}, h('b', { text: r.name }), h('span', { text: `${r.score} pts` }))));
      boardNote.hidden = rows.length > 0;
      boardNote.textContent = 'No scores yet. Be the first on the board.';
      if (be.kind === 'local') { boardNote.hidden = false; boardNote.textContent = rows.length ? 'Scores on this device only until the class board is connected.' : 'No scores yet. Scores stay on this device until the class board is connected.'; }
    } catch { boardNote.hidden = false; boardNote.textContent = 'The leaderboard could not be loaded.'; }
  }
  saveBtn.addEventListener('click', async () => {
    const who = certName.value.trim();
    if (!who) { certName.focus(); return; }
    saveBtn.disabled = true;
    try {
      be = be || await backend();
      const mail = certEmail.value.trim() || null;
      await be.add({ name: who, score: score(), answered: answered(), email: mail });
      store.set(KEYS.name, who);
      state.posted = true; save();
      ctx.toast?.(mail ? `Saved. Your certificate goes to ${mail}.` : `${who}: ${score()} points saved.`);
      if (!board.hidden) await loadBoard();
    } catch { ctx.toast?.('Could not save the score. Try again.'); }
    finally { saveBtn.disabled = false; }
  });

  // A ready-to-post image of the certificate (Web Share where available, otherwise a download)
  async function shareImage() {
    const who = certName.value.trim() || 'Orchard Scholar';
    try { await document.fonts.ready; } catch { /* fonts may be blocked */ }
    const c = document.createElement('canvas'); c.width = 1200; c.height = 630;
    const g = c.getContext('2d');
    g.fillStyle = '#0f2e1f'; g.fillRect(0, 0, 1200, 630);
    g.fillStyle = '#1f6b45'; g.beginPath(); g.arc(1040, 120, 260, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ff8a1f'; g.beginPath(); g.arc(1040, 120, 40, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffffff'; g.textBaseline = 'top';
    g.font = "600 22px 'Atkinson Hyperlegible', 'Instrument Sans', Arial, sans-serif"; g.fillText('WAQF ORCHARD SCHOOL · SIERRA LEONE', 72, 72);
    g.font = "800 76px 'Bricolage Grotesque', Arial, sans-serif"; g.fillText('Orchard Scholar', 72, 120);
    g.fillStyle = '#ff8a1f'; g.font = "800 54px 'Bricolage Grotesque', Arial, sans-serif"; g.fillText(who.slice(0, 28), 72, 230);
    g.fillStyle = '#ffffff'; g.font = "400 28px 'Atkinson Hyperlegible', 'Instrument Sans', Arial, sans-serif";
    g.fillText(`${score()} of ${MAX} points · ${answered()} of ${TOTAL} stops · ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`, 72, 310);
    g.fillStyle = 'rgba(255,255,255,0.8)'; g.font = "400 26px 'Atkinson Hyperlegible', 'Instrument Sans', Arial, sans-serif";
    g.fillText('I learned how a school orchard feeds, teaches and earns.', 72, 400);
    g.fillText('Sponsor a tree with me: a grafted mango feeds a family for decades.', 72, 440);
    g.fillStyle = '#ff8a1f'; g.fillRect(72, 520, 160, 6);
    const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
    const file = new File([blob], 'orchard-scholar.png', { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: 'Orchard Scholar', text: 'I finished the Waqf Orchard School orchard. Sponsor a tree with me.' }); return; } catch { /* cancelled */ }
    }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'orchard-scholar.png'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    ctx.toast?.('Certificate image saved.');
  }

  refreshChip();
  return { mount, prompt, closePrompt, openCert, closeCert, setDemoBoard(rows) { demoRows = rows; }, get score() { return score(); }, get answered() { return answered(); }, total: TOTAL, max: MAX };
}
