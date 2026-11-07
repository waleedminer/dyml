// Presentation mode (?present). Turns the site into a stage tool:
// clicker keys step through the intro beats, the tour and a scripted demo
// path; number keys jump straight to a moment; H shows the key sheet; the
// comments button and other chrome are hidden; captions are enlarged; demo
// plaques and scores are seeded so the orchard never looks empty.
// ?present=120 also returns to the intro after 120 seconds without input (kiosk).

const DEMO_SPONSORS = [
  { tree: 'mango-0-0', name: 'The Bangura family', amount: 120, share: 1, dedication: 'For our grandmother, Fatmata' },
  { tree: 'mango-0-2', name: 'Amina & Ibrahim', amount: 120, share: 1 },
  { tree: 'mango-1-1', name: 'Class of 2026', amount: 60, share: 0.5 },
  { tree: 'mango-1-3', name: 'Dr. Sesay', amount: 120, share: 1, dedication: 'In memory of my father' },
  { tree: 'mango-2-4', name: 'Stanford DYML', amount: 100, share: 1 },
  { tree: 'citrus-0-1', name: 'The Kamara family', amount: 80, share: 1 },
  { tree: 'citrus-1-4', name: 'Ihsan youth group', amount: 40, share: 0.5 },
  { tree: 'citrus-2-2', name: 'Mariama', amount: 80, share: 1, message: 'Grow strong.' },
  { tree: 'citrus-2-6', name: 'Yusuf & Hawa', amount: 20, share: 0.25 },
];
const DEMO_SCORES = [
  { name: 'Hawa', score: 135, answered: 13 }, { name: 'Alhaji', score: 120, answered: 13 }, { name: 'Isatu', score: 95, answered: 12 },
];

const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

export function initPresent(ctx) {
  const params = new URLSearchParams(location.search);
  const idleSec = Number(params.get('present')) || 0;
  document.body.classList.add('present');
  ctx.tutorial.setPresent(true);
  ctx.sponsor.demo(DEMO_SPONSORS);
  ctx.quiz.setDemoBoard(DEMO_SCORES);

  // The scripted demo path: what the clicker steps through outside the intro and tour
  const PATH = [
    { key: '1', label: 'Intro', run: () => ctx.tutorial.play({ onDone: () => { ctx.showMenu(); ctx.roles.show(() => ctx.showMenu()); } }) },
    { key: '2', label: 'Choose a role', run: () => { ctx.goToMainMenu(); ctx.roles.show(() => ctx.showMenu()); } },
    { key: '3', label: 'Volunteer: sponsor a tree', run: () => { ctx.roles.set('volunteer'); ctx.sponsorAny(); } },
    { key: '4', label: 'Student: quick check', run: () => { ctx.roles.set('student'); ctx.closeAll(); ctx.openHotspot('mango', true); } },
    { key: '5', label: 'Certificate & leaderboard', run: () => { ctx.closeAll(); ctx.quiz.openCert(); } },
    { key: '6', label: 'Teacher: guided tour', run: () => { ctx.roles.set('teacher'); ctx.closeAll(); ctx.startTour(); } },
    { key: '7', label: 'Walk around', run: () => { ctx.closeAll(); ctx.enterWalk(); } },
    { key: '8', label: 'Apply to volunteer', run: () => { ctx.closeAll(); ctx.apply.open(); } },
    { key: '9', label: 'Overview & menu', run: () => ctx.goToMainMenu() },
  ];
  let at = -1;
  function go(i) {
    at = Math.max(0, Math.min(PATH.length - 1, i));
    PATH[at].run();
    flash(`${at + 1} · ${PATH[at].label}`);
  }

  // ----- Chip and key sheet -----
  const chip = el('div', 'pr-chip', '<b>Presenting</b> <kbd>PgDn</kbd> next <kbd>1</kbd>–<kbd>9</kbd> jump <kbd>H</kbd> keys');
  const flashEl = el('div', 'pr-flash');
  flashEl.hidden = true;
  const sheet = el('section', 'pr-sheet card');
  sheet.hidden = true;
  sheet.setAttribute('role', 'dialog');
  sheet.innerHTML = `<p class="eyebrow">Presentation mode</p><h2>Keys</h2>
    <dl>
      <dt><kbd>PgDn</kbd> / <kbd>PgUp</kbd></dt><dd>Next / previous: intro beat, tour stop, or demo step (a clicker sends these)</dd>
      <dt><kbd>W A S D</kbd> <kbd>↑ ↓ ← →</kbd></dt><dd>Move around. Never step anything.</dd>
      <dt><kbd>Esc</kbd></dt><dd>Skip the intro · close anything · main menu</dd>
      <dt><kbd>H</kbd> or <kbd>?</kbd></dt><dd>This sheet</dd>
      <dt><kbd>0</kbd></dt><dd>Restart the intro</dd>
    </dl>
    <p class="pr-sheet-label">Jump to</p>
    <ol class="pr-path">${PATH.map((p) => `<li><kbd>${p.key}</kbd> ${p.label}</li>`).join('')}</ol>
    <p class="sp-fine">Demo plaques and scores shown here are seeded for the stage and are not saved.${idleSec ? ` Returns to the intro after ${idleSec} s without input.` : ''}</p>`;
  document.body.append(chip, flashEl, sheet);
  setTimeout(() => chip.classList.add('dim'), 6000);
  let flashTimer = 0;
  function flash(text) {
    flashEl.textContent = text; flashEl.hidden = false;
    flashEl.classList.remove('show'); void flashEl.offsetWidth; flashEl.classList.add('show');
    clearTimeout(flashTimer); flashTimer = setTimeout(() => { flashEl.hidden = true; }, 1800);
  }
  const toggleSheet = (force) => { sheet.hidden = force ?? !sheet.hidden; };
  sheet.addEventListener('click', () => toggleSheet(false));

  // ----- Keys -----
  const typing = () => { const t = document.activeElement; return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable); };
  addEventListener('keydown', (e) => {
    if (typing() || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'h' || e.key === 'H' || e.key === '?') { e.preventDefault(); e.stopImmediatePropagation(); toggleSheet(); return; }
    if (!sheet.hidden) { toggleSheet(false); if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); return; } }
    if (/^[0-9]$/.test(e.key)) {
      e.preventDefault(); e.stopImmediatePropagation();
      if (e.key === '0') { ctx.closeAll(); go(0); } else { ctx.closeAll(); go(Number(e.key) - 1); }
      return;
    }
    // Only Page Down / Page Up (what a clicker sends) step anything. Arrows and
    // Space are never touched here: they move the camera, as in normal mode.
    const next = e.code === 'PageDown', prev = e.code === 'PageUp';
    if (!next && !prev) return;
    if (ctx.tutorial.playing) return; // the intro handles its own stepping
    e.preventDefault(); e.stopImmediatePropagation();
    if (ctx.tourActive()) { ctx.tourStep(next ? 1 : -1); return; }
    if (ctx.roles.picking) { if (next) { ctx.roles.hide(); go(2); } return; }
    go(at + (next ? 1 : -1));
  }, { capture: true });

  // ----- Kiosk: back to the intro after idle -----
  if (idleSec > 0) {
    let last = performance.now();
    const bump = () => { last = performance.now(); };
    for (const ev of ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart']) addEventListener(ev, bump, { capture: true, passive: true });
    setInterval(() => {
      if (ctx.tutorial.playing) { last = performance.now(); return; }
      if (performance.now() - last > idleSec * 1000) { last = performance.now(); ctx.closeAll(); go(0); }
    }, 1000);
  }

  // Called once the opening intro has played, so the path continues from it instead of replaying it
  const introDone = () => { if (at < 0) at = 0; };
  return { go, introDone, get step() { return at; }, flash };
}
