(function () {
'use strict';
/* ========== helpers ========== */
const $ = (s, r) => (r || document).querySelector(s);
function h(tag, props, ...kids) {
  const e = document.createElement(tag);
  for (const k in (props || {})) {
    const v = props[k];
    if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) e.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat(Infinity)) { if (kid == null || kid === false) continue; e.append(kid.nodeType ? kid : document.createTextNode(String(kid))); }
  return e;
}
const DAY = 864e5;
const pad = n => String(n).padStart(2, '0');
const dstr = (d = new Date()) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const SUBJ = { P: 'Physics', C: 'Chemistry', B: 'Biology' };
const VLAB = { quick: 'Quick win', core: 'Core', corehard: 'Core · needs effort', fill: 'Cheap fill', low: 'Last' };
const VHELP = { quick: 'Heavy marks and mostly easy. Do these first.', core: 'Heavy marks. Steady practice.', corehard: 'Heavy marks but harder. Start early and repeat often.', fill: 'Light marks, easy to learn. Do after the core.', low: 'Light marks and harder. Do last.' };
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = a => a[Math.floor(Math.random() * a.length)];
let toastT;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2600); }

/* ========== data ========== */
const UNITS = window.UNITS || [], SHEETS = window.SHEETS || {}, CARDS = window.CARDS || {};
const UMAP = {}; UNITS.forEach(u => UMAP[u.id] = u);
const QB = (window.QB || []).filter(q => UMAP[q.s + q.u]);
const QMAP = {}; QB.forEach(q => QMAP[q.id] = q);
const QBYU = {}; QB.forEach(q => { const k = q.s + q.u; if (UMAP[k]) (QBYU[k] = QBYU[k] || []).push(q); });
const QBYS = { P: [], C: [], B: [] }; QB.forEach(q => { if (UMAP[q.s + q.u]) QBYS[q.s].push(q); });
const PATH = UNITS.slice().sort((a, b) => ({ quick: 0, core: 1, corehard: 1, fill: 2, low: 3 }[a.v] - { quick: 0, core: 1, corehard: 1, fill: 2, low: 3 }[b.v]) || a.rank - b.rank);

function pdfA(q, label, cls) { const f = (window.QB_PDF || {})[q.y]; return f ? h('a', { class: cls || '', target: '_blank', rel: 'noopener', href: 'pdfs/' + f + '#page=' + q.pg }, label) : null; }
function solFallback(q) { return (window.QB_PDF || {})[q.y] ? 'See the original page for the full solution.' : 'The written solution is not in this public version. Re-read this unit\u2019s sheet, then try the question again.'; }
/* ========== state ========== */
const KEY = 'neet27_v1';
function defaults() { return { name: 'Maheen', exam: '2027-05-02', goal: 30, theme: 'auto', fs: 16, att: [], us: {}, steps: {}, mocks: [], mist: {}, xp: 0, streak: { last: '', n: 0, best: 0 }, daily: {}, badges: {}, cards: {}, active: null, intro: false, goalMin: 90, timer: null, sess: [] }; }
let S = defaults(), canSave = true;
try { S = Object.assign(defaults(), JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { canSave = false; }
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { if (canSave) { canSave = false; toast('Progress cannot be saved in this browser mode. Use Settings → Backup.'); } } _st = null; }
let _st = null;
function stats() {
  if (_st) return _st;
  const bu = {}, bs = { P: { a: 0, c: 0 }, C: { a: 0, c: 0 }, B: { a: 0, c: 0 } }, bq = {}; let a = 0, c = 0;
  S.att.forEach(t => {
    const q = QMAP[t.q]; if (!q) return; const k = q.s + q.u;
    (bu[k] = bu[k] || { a: 0, c: 0 }).a++; bs[q.s].a++; a++;
    (bq[t.q] = bq[t.q] || { a: 0, c: 0, last: 0, lastOk: null }).a++; bq[t.q].last = t.t; bq[t.q].lastOk = t.ok;
    if (t.ok) { bu[k].c++; bs[q.s].c++; c++; bq[t.q].c++; }
  });
  return (_st = { bu, bs, bq, a, c });
}
const acc = o => (o && o.a ? o.c / o.a : null);
const pct = x => x == null ? '–' : Math.round(x * 100) + '%';
function today() { return S.daily[dstr()] = S.daily[dstr()] || { q: 0, min: 0, steps: 0, rev: 0 }; }
function bump() { const t = dstr(); if (S.streak.last === t) return; const y = dstr(new Date(Date.now() - DAY)); S.streak.n = S.streak.last === y ? S.streak.n + 1 : 1; S.streak.last = t; if (S.streak.n > S.streak.best) S.streak.best = S.streak.n; }
const level = () => Math.floor(Math.sqrt(S.xp / 60)) + 1;
function addXP(n) { const before = level(); S.xp += n; if (level() > before) toast('Level up! You are now level ' + level() + ' 🎉'); }
const BADGES = [
  ['first', 'First step', 'Answer your first question', () => S.att.length >= 1],
  ['q100', '100 solved', 'Answer 100 questions', () => S.att.length >= 100],
  ['q500', '500 solved', 'Answer 500 questions', () => S.att.length >= 500],
  ['str3', '3-day streak', 'Study 3 days in a row', () => S.streak.best >= 3],
  ['str7', '7-day streak', 'Study 7 days in a row', () => S.streak.best >= 7],
  ['str30', '30-day streak', 'Study 30 days in a row', () => S.streak.best >= 30],
  ['mock1', 'First mock', 'Finish a mock test', () => S.mocks.length >= 1],
  ['mock5', '5 mocks', 'Finish 5 mock tests', () => S.mocks.length >= 5],
  ['u5', '5 units done', 'Finish 5 units', () => Object.values(S.us).filter(v => v === 'done' || v === 'revised').length >= 5],
  ['u25', '25 units done', 'Finish 25 units', () => Object.values(S.us).filter(v => v === 'done' || v === 'revised').length >= 25],
  ['fix', 'Mistake fixer', 'Master 10 mistakes', () => (S.fixed || 0) >= 10],
  ['acc80', 'Sharp', '80%+ accuracy over 50+ questions', () => { const s = stats(); return s.a >= 50 && s.c / s.a >= .8; }]
];
function checkBadges() { BADGES.forEach(b => { if (!S.badges[b[0]] && b[3]()) { S.badges[b[0]] = dstr(); toast('Badge unlocked: ' + b[1] + ' 🏅'); confetti(); } }); }

/* ========== focus timer, sound, confetti ========== */
let _ac;
function beep(f, d) { try { _ac = _ac || new (window.AudioContext || window.webkitAudioContext)(); const o = _ac.createOscillator(), g = _ac.createGain(); o.frequency.value = f; g.gain.value = .07; o.connect(g); g.connect(_ac.destination); o.start(); o.stop(_ac.currentTime + d); } catch (e) {} }
function confetti() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cv = h('canvas', { style: 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:80', 'aria-hidden': 'true' }); document.body.append(cv);
  const W = cv.width = innerWidth, H = cv.height = innerHeight, c = cv.getContext('2d'), cols = ['#b8307f', '#f28b6b', '#1c9a72', '#f4c25b', '#5a66e0', '#ff7db8'];
  const ps = Array.from({ length: 140 }, () => ({ x: W / 2 + (Math.random() - .5) * 120, y: H * .35, vx: (Math.random() - .5) * 14, vy: -Math.random() * 14 - 4, s: Math.random() * 7 + 4, c: pick(cols), r: Math.random() * 6, vr: (Math.random() - .5) * .4 }));
  const t0 = Date.now();
  (function f() { const e = Date.now() - t0; c.clearRect(0, 0, W, H); ps.forEach(p => { p.vy += .35; p.x += p.vx; p.y += p.vy; p.r += p.vr; c.save(); c.translate(p.x, p.y); c.rotate(p.r); c.fillStyle = p.c; c.globalAlpha = Math.max(0, 1 - e / 2200); c.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); c.restore(); }); if (e < 2300) requestAnimationFrame(f); else cv.remove(); })();
}
let _wl = null;
async function wake(on) { try { if (on && navigator.wakeLock && !_wl) { _wl = await navigator.wakeLock.request('screen'); _wl.addEventListener('release', () => { _wl = null; }); } else if (!on && _wl) { await _wl.release(); _wl = null; } } catch (e) {} }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && S.timer && S.timer.state === 'run') wake(true); });
function tmLeft() { const T = S.timer; if (!T) return 0; return T.state === 'run' ? Math.max(0, T.end - Date.now()) : T.left; }
const mmss = ms => { const s = Math.ceil(ms / 1000); return pad(Math.floor(s / 60)) + ':' + pad(s % 60); };
function logFocus(min) { today().min += min; S.sess.unshift({ t: Date.now(), min }); S.sess = S.sess.slice(0, 200); bump(); addXP(min * 2); checkBadges(); save(); }
function startTimer(min, kind, label) { S.timer = { state: 'run', kind: kind || 'focus', total: min * 60000, left: min * 60000, end: Date.now() + min * 60000, label: label || '' }; save(); beep(660, .12); chipTimer(); wake(true); }
function pauseTimer() { const T = S.timer; if (T && T.state === 'run') { T.left = tmLeft(); T.state = 'pause'; save(); chipTimer(); wake(false); } }
function resumeTimer() { const T = S.timer; if (T && T.state === 'pause') { T.end = Date.now() + T.left; T.state = 'run'; save(); chipTimer(); wake(true); } }
function stopTimer(credit) { const T = S.timer; if (!T) return; if (credit && T.kind === 'focus') { const m = Math.floor((T.total - tmLeft()) / 60000); if (m >= 1) { logFocus(m); toast('Logged ' + m + ' focused minutes. Good effort 💪'); } } S.timer = null; save(); chipTimer(); wake(false); }
function finishTimer() {
  const T = S.timer; if (!T) return; const m = Math.round(T.total / 60000);
  if (T.kind === 'focus') { logFocus(m); toast('Focus session complete! +' + (m * 2) + ' XP 🎉'); confetti(); } else toast('Break over. Ready for another round?');
  beep(880, .25); setTimeout(() => beep(1040, .25), 300); try { navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch (e) {}
  S.timer = { state: 'done', kind: T.kind, total: T.total, left: 0, end: 0, label: T.label }; save(); chipTimer(); if (location.hash.indexOf('#focus') === 0) route(); else header();
}
function chipTimer() {
  const el = document.getElementById('chip-timer'); if (!el) return; const T = S.timer;
  if (!T || T.state === 'done') { el.hidden = true; return; }
  el.hidden = false; el.textContent = (T.kind === 'focus' ? '⏱ ' : '☕ ') + mmss(tmLeft()) + (T.state === 'pause' ? ' ⏸' : ''); el.classList.toggle('pulse', T.state === 'run');
}
setInterval(() => { const T = S.timer; if (T && T.state === 'run') { if (tmLeft() <= 0) finishTimer(); else chipTimer(); } }, 1000);
const lvlPct = () => { const L = level(), a = 60 * (L - 1) * (L - 1), b = 60 * L * L; return (S.xp - a) / (b - a) * 100; };
const MIST_BOX = [1, 3, 7, 21, 60];
function record(qid, sel, ms, mode) {
  const q = QMAP[qid], ok = sel === q.a; const t = today();
  S.att.push({ q: qid, ok: ok ? 1 : 0, s: sel, ms: Math.min(ms || 0, 6e5), t: Date.now(), m: mode });
  t.q++; bump(); addXP(ok ? 10 : 3);
  const m = S.mist[qid];
  if (!ok) { S.mist[qid] = { notes: m ? m.notes : '', box: 0, due: Date.now() + DAY, wrong: (m ? m.wrong : 0) + 1 }; }
  else if (m && (mode === 'review' || mode === 'practice')) { m.box++; if (m.box >= MIST_BOX.length) { delete S.mist[qid]; S.fixed = (S.fixed || 0) + 1; toast('Mistake mastered and removed 🎉'); } else m.due = Date.now() + MIST_BOX[m.box] * DAY; }
  _st = null; checkBadges(); save();
  return ok;
}
function dueMistakes() { const n = Date.now(); return Object.keys(S.mist).filter(k => QMAP[k] && S.mist[k].due <= n); }

/* ========== question picking ========== */
function choose(pool, n) {
  const st = stats().bq; const un = [], wr = [], rest = [];
  pool.forEach(q => { const b = st[q.id]; if (!b) un.push(q); else if (b.lastOk === 0) wr.push(q); else rest.push(q); });
  rest.sort((a, b) => st[a.id].last - st[b.id].last);
  return shuffle(un).concat(shuffle(wr), rest).slice(0, n);
}
function weakPool() {
  const s = stats(), out = [];
  UNITS.forEach(u => { const x = s.bu[u.id]; const a = acc(x); if (!x || x.a < 5 || a < .7) (QBYU[u.id] || []).forEach(q => out.push(q)); });
  return out.length ? out : QB.slice();
}

/* ========== in-page dialogs (browser pop-ups are blocked in the viewer) ========== */
function ask(msg, okLabel, danger) {
  return new Promise(res => {
    const ov = h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': msg });
    const kd = e => { if (e.key === 'Escape') done(false); };
    const done = v => { ov.remove(); window.removeEventListener('keydown', kd, true); res(v); };
    ov.append(h('div', { class: 'modal-box' }, h('p', {}, msg), h('div', { class: 'row', style: 'justify-content:flex-end' }, h('button', { class: 'btn', onclick: () => done(false) }, 'Cancel'), h('button', { class: 'btn ' + (danger ? 'danger' : 'pri'), id: 'mok', onclick: () => done(true) }, okLabel || 'OK'))));
    document.body.append(ov); window.addEventListener('keydown', kd, true); setTimeout(() => { const b = ov.querySelector('#mok'); if (b) b.focus(); }, 30);
  });
}
/* ========== router ========== */
let tick = null;
function stopTick() { if (tick) { clearInterval(tick); tick = null; } }
const app = $('#app');
const norm = path => { const p = String(path).replace(/^#?\/?/, '').split(/[\/-]/).filter(Boolean); if (p[0] === 'settings') p[0] = 'prefs'; return p.join('-'); };
function go(path) { const n = norm(path); if (location.hash === '#' + n) route(); else location.hash = n; }
window.addEventListener('hashchange', route);
function route() {
  stopTick(); window.onkeydown = null;
  const p = (location.hash.replace(/^#/, '') || 'home').split(/[\/-]/).filter(Boolean);
  const r = p[0] || 'home';
  document.querySelectorAll('#nav a').forEach(a => a.classList.toggle('on', a.dataset.r === ((r === 'unit' || r === 'cards') ? 'learn' : (r === 'test' || r === 'result') ? 'mock' : r === 'start' ? 'home' : r)));
  if (r === 'settings') { go('/prefs'); return; }
  if (!S.intro && r !== 'start' && r !== 'prefs') { go('/start'); return; }
  app.innerHTML = '';
  try {
    ({ home, start, learn, unit, cards, practice, session, mock, test, result, mistakes, progress, library, prefs: settings, about, focus }[r] || home)(p.slice(1));
  } catch (e) { console.error(e); app.append(h('div', { class: 'card' }, h('h2', {}, 'Something went wrong'), h('p', {}, String(e.message || e)), h('a', { class: 'btn pri', href: '#/home' }, 'Go home'))); }
  window.scrollTo(0, 0); app.focus({ preventScroll: true });
  header();
}
function header() {
  chipTimer();
  $('#chip-streak').textContent = '🔥 ' + (S.streak.last === dstr() || S.streak.last === dstr(new Date(Date.now() - DAY)) ? S.streak.n : 0);
  $('#chip-xp').textContent = 'Lv ' + level() + ' · ' + S.xp + ' XP';
}
const HOST_THEME = document.documentElement.getAttribute('data-theme');
function applyTheme() { const r = document.documentElement; const v = S.theme === 'auto' ? HOST_THEME : S.theme; if (v) r.setAttribute('data-theme', v); else r.removeAttribute('data-theme'); r.style.setProperty('--fs', S.fs + 'px'); }
$('#btn-theme').addEventListener('click', () => { S.theme = S.theme === 'dark' ? 'light' : 'dark'; applyTheme(); save(); });

/* ========== small components ========== */
const ring = (p, label, color) => h('div', { class: 'ring', style: '--p:' + Math.max(0, Math.min(100, p)) + ';--c:' + (color || 'var(--pri)'), role: 'img', 'aria-label': label + ' ' + Math.round(p) + ' percent' }, h('b', {}, Math.round(p) + '%'));
const bar = (p, cls) => h('div', { class: 'bar ' + (cls || '') }, h('i', { style: 'width:' + Math.max(0, Math.min(100, p)) + '%' }));
const sbadge = s => h('span', { class: 'badge sb' + s }, SUBJ[s]);
const vbadge = v => h('span', { class: 'badge v-' + v }, VLAB[v]);
function unitDone(id) { return S.us[id] === 'done' || S.us[id] === 'revised'; }
function nextUnit() { return PATH.find(u => !unitDone(u.id)) || PATH[0]; }
const daysLeft = () => Math.max(0, Math.ceil((new Date(S.exam + 'T00:00:00') - new Date(dstr() + 'T00:00:00')) / DAY));
const encour = ['Small steps every day beat big plans on one day.', 'A wrong answer is a free lesson. Write the trap in your notebook.', 'You do not need to be fast today. You need to be steady.', 'Understanding first, speed later.', 'Ten focused questions are better than fifty rushed ones.', 'Rest is part of studying. Sleep locks memory in.', 'Every expert was once a beginner who kept going.'];


/* ========== live countdown to NEET ========== */
function addMonths(d, n) { const x = new Date(d.getTime()), day = x.getDate(); x.setDate(1); x.setMonth(x.getMonth() + n); x.setDate(Math.min(day, new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate())); return x; }
function cdParts() {
  const now = new Date(), target = new Date(S.exam + 'T14:00:00+05:30');
  if (target <= now) return { m: 0, d: 0, h: 0, i: 0, s: 0, done: true };
  let m = (target.getFullYear() - now.getFullYear()) * 12 + target.getMonth() - now.getMonth();
  while (m > 0 && addMonths(now, m) > target) m--;
  let rest = target - addMonths(now, Math.max(0, m)); const s = Math.floor(rest / 1000);
  return { m: Math.max(0, m), d: Math.floor(s / 86400), h: Math.floor(s % 86400 / 3600), i: Math.floor(s % 3600 / 60), s: s % 60 };
}
function countdown() {
  const cells = {}, row = h('div', { class: 'cd', role: 'timer', 'aria-label': 'Time left until NEET UG 2027' });
  [['m', 'Months'], ['d', 'Days'], ['h', 'Hours'], ['i', 'Minutes'], ['s', 'Seconds']].forEach(x => { const b = h('b', {}, '00'); cells[x[0]] = b; row.append(h('div', {}, b, h('span', {}, x[1]))); });
  function upd() { const p = cdParts(); Object.keys(cells).forEach(k => { const v = pad(p[k]); if (cells[k].textContent !== v) cells[k].textContent = v; }); }
  upd(); stopTick(); tick = setInterval(upd, 1000);
  return h('div', { class: 'cd-wrap' }, h('div', { class: 'cd-label' }, 'Until NEET UG 2027'), row, h('div', { class: 'cd-note' }, 'Expected ' + new Date(S.exam + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) + ', 2:00 pm IST. NTA has not announced the date yet, so this is an estimate you can change in Settings.'));
}
/* ========== HOME ========== */
function home() {
  const t = today(), st = stats(), nu = nextUnit(), due = dueMistakes().length;
  const done = UNITS.filter(u => unitDone(u.id)), cover = done.reduce((s, u) => s + u.marks, 0);
  const goalP = Math.min(100, t.q / S.goal * 100);
  const active = S.active;
  const tasks = [
    { n: 1, t: 'Learn: ' + nu.name, d: SUBJ[nu.s] + ' · about ' + nu.marks + ' marks · ' + VLAB[nu.v], href: '#/unit/' + nu.id, done: t.steps > 0 },
    { n: 2, t: 'Practice 10 questions', d: 'Real past-paper questions with solutions', href: '#/session/unit/' + nu.id + '/10', done: t.q >= 10 },
    { n: 3, t: due ? 'Fix ' + due + ' old mistake' + (due > 1 ? 's' : '') : 'Mistake book is clear', d: due ? 'These come back so you remember them for good' : 'Nothing due today. Nice work.', href: due ? '#/session/review/0/' + Math.min(due, 10) : '#/mistakes', done: due === 0 || t.rev > 0 }
  ];
  tasks.push({ n: 4, t: 'Focus for 25 minutes', d: 'Phone away, timer on. ' + t.min + ' of ' + S.goalMin + ' minutes today', href: '#/focus', done: t.min >= 25 });
  const weak = UNITS.map(u => ({ u, a: acc(st.bu[u.id]), n: (st.bu[u.id] || {}).a || 0 })).filter(x => x.n >= 3 && x.a < .7).sort((a, b) => b.u.marks * (1 - b.a) - a.u.marks * (1 - a.a)).slice(0, 3);
  app.append(
    h('div', { class: 'hero' },
      h('div', { class: 'row sp' },
        h('div', {}, h('h1', {}, (S.name ? 'Hi ' + S.name + ' ✨' : 'Welcome ✨')), h('div', { class: 'mute' }, pick(encour))),
        h('div', { class: 'hero-date' }, h('b', {}, new Date(S.exam + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })), h('span', {}, 'expected'))),
      countdown(),
      h('div', { class: 'xpwrap' }, h('div', { class: 'row sp small' }, h('b', {}, 'Level ' + level()), h('span', {}, S.xp + ' XP')), h('div', { class: 'xpbar' }, h('i', { style: 'width:' + Math.max(3, lvlPct()) + '%' }))),
      h('div', { class: 'row', style: 'margin-top:14px' }, h('a', { class: 'btn', href: tasks.find(x => !x.done) ? tasks.find(x => !x.done).href : '#/mock' }, tasks.every(x => x.done) ? 'All done today. Try a mock →' : 'Start my next step →'), active ? h('a', { class: 'btn', href: '#/test/' + active.id }, '⏱ Resume your test') : null)),
    weekStrip(),
    h('h2', {}, "Today's quest"),
    h('div', { class: 'grid' }, tasks.map(x => h('a', { class: 'task' + (x.done ? ' done' : ''), href: x.href }, h('div', { class: 'n' }, x.done ? '✓' : x.n), h('div', {}, h('b', {}, x.t), h('div', { class: 'small mute' }, x.d))))),
    h('div', { class: 'grid g3', style: 'margin-top:16px' },
      h('div', { class: 'card row' }, ring(goalP, 'Daily goal', 'var(--ok)'), h('div', {}, h('b', {}, 'Daily goal'), h('div', { class: 'small mute' }, t.q + ' of ' + S.goal + ' questions today'))),
      h('div', { class: 'card row' }, ring(cover / 720 * 100, 'Marks covered'), h('div', {}, h('b', {}, 'Syllabus covered'), h('div', { class: 'small mute' }, done.length + ' of 50 units · about ' + Math.round(cover) + ' of 720 marks'))),
      h('div', { class: 'card row' }, ring(st.a ? st.c / st.a * 100 : 0, 'Accuracy', 'var(--B)'), h('div', {}, h('b', {}, 'Accuracy'), h('div', { class: 'small mute' }, st.a + ' answered · best streak ' + S.streak.best + ' days')))),
    weak.length ? h('div', {}, h('h2', {}, 'Needs a little love'), h('div', { class: 'grid g3' }, weak.map(x => h('a', { class: 'card flat ucard sb' + x.u.s, href: '#/unit/' + x.u.id }, h('h3', {}, x.u.name), h('div', { class: 'small mute' }, 'Accuracy ' + pct(x.a) + ' over ' + x.n + ' questions'), h('span', { class: 'btn sm' }, 'Review sheet'))))) : null,
    h('h2', {}, 'Quick starts'),
    h('div', { class: 'grid g4' },
      [['🧠 Smart mix 15', '#/session/smart/0/15'], ['⚡ Biology 20', '#/session/subj/B/20'], ['📘 Chemistry 15', '#/session/subj/C/15'], ['🧲 Physics 15', '#/session/subj/P/15']].map(x => h('a', { class: 'btn', href: x[1] }, x[0]))),
    h('p', { class: 'small mute', style: 'margin-top:18px' }, 'Exam date is an estimate (NEET UG 2027 is not announced yet). Change it in Settings when NTA announces it.'));
}

/* ========== FOCUS TIMER PAGE ========== */
function weekStrip() {
  const days = []; for (let i = 6; i >= 0; i--) { const d = new Date(Date.now() - i * DAY), x = S.daily[dstr(d)]; days.push({ l: 'SMTWTFS'[d.getDay()], on: !!(x && (x.q > 0 || x.min > 0)), now: i === 0 }); }
  return h('div', { class: 'week card flat', 'aria-label': 'Last 7 days' }, days.map(d => h('div', { class: 'wd' + (d.on ? ' on' : '') + (d.now ? ' now' : '') }, h('i', {}, d.on ? '✓' : ''), h('span', {}, d.l))), h('div', { class: 'wk-note' }, h('b', {}, '🔥 ' + S.streak.n + ' day streak'), h('span', { class: 'small mute' }, 'best ' + S.streak.best)));
}
function focus() {
  const t = today(), nu = nextUnit(); let pm = 25, kind = 'focus'; const box = h('div');
  const wk = []; for (let i = 6; i >= 0; i--) { const d = new Date(Date.now() - i * DAY); wk.push({ l: 'SMTWTFS'[d.getDay()], m: (S.daily[dstr(d)] || {}).min || 0 }); }
  const maxm = Math.max(S.goalMin, ...wk.map(x => x.m), 1);
  function draw() {
    box.innerHTML = ''; const T = S.timer, live = T && T.state !== 'done', left = tmLeft(), total = live ? T.total : pm * 60000, p = live ? (1 - left / total) * 100 : 0;
    const col = (live ? T.kind : kind) === 'break' ? 'var(--ok)' : 'var(--pri)';
    const ringEl = h('div', { class: 'focus-ring' + (live && T.state === 'run' ? ' run' : ''), id: 'fr', style: '--p:' + p + ';--c:' + col }, h('div', { class: 'focus-in' }, h('div', { class: 'focus-time', id: 'ft' }, live ? mmss(left) : (T && T.state === 'done' ? '00:00' : mmss(total))), h('div', { class: 'mute' }, live ? (T.kind === 'focus' ? (T.state === 'pause' ? 'Paused' : 'Stay with it. You are doing great.') : 'Rest your eyes. Drink water.') : T && T.state === 'done' ? (T.kind === 'focus' ? 'Session complete 🎉' : 'Break finished') : 'Ready when you are')));
    let ctl;
    if (live) ctl = h('div', { class: 'row', style: 'justify-content:center' }, T.state === 'run' ? h('button', { class: 'btn', onclick: () => { pauseTimer(); draw(); } }, '⏸ Pause') : h('button', { class: 'btn pri', onclick: () => { resumeTimer(); draw(); } }, '▶ Resume'), h('button', { class: 'btn', onclick: async () => { if (T.kind === 'focus' && !(await ask('Stop now? Your completed full minutes will still be saved.', 'Stop'))) return; stopTimer(true); draw(); } }, '■ Stop'));
    else if (T && T.state === 'done') ctl = h('div', { class: 'row', style: 'justify-content:center' }, T.kind === 'focus' ? h('button', { class: 'btn pri', onclick: () => { startTimer(5, 'break'); draw(); } }, '☕ Take a 5-minute break') : null, h('button', { class: T.kind === 'focus' ? 'btn' : 'btn pri', onclick: () => { startTimer(pm, 'focus'); draw(); } }, '▶ Another focus round'), h('button', { class: 'btn', onclick: () => { S.timer = null; save(); chipTimer(); draw(); } }, 'Done'));
    else ctl = h('div', {}, h('div', { class: 'chips', style: 'justify-content:center' }, [[15, 'focus'], [25, 'focus'], [45, 'focus'], [60, 'focus'], [5, 'break'], [10, 'break']].map(x => h('button', { class: 'fchip' + (pm === x[0] && kind === x[1] ? ' on' : ''), onclick: () => { pm = x[0]; kind = x[1]; draw(); } }, x[0] + ' min' + (x[1] === 'break' ? ' break' : '')))), h('div', { class: 'row', style: 'justify-content:center' }, h('button', { class: 'btn pri big-btn', onclick: () => { startTimer(pm, kind, nu.name); draw(); } }, '▶ Start ' + pm + ' min ' + (kind === 'break' ? 'break' : 'focus'))));
    const bars = h('div', { class: 'wbars' }, wk.map(x => h('div', { class: 'wb' }, h('i', { style: 'height:' + Math.max(4, x.m / maxm * 100) + '%' }, ''), h('b', {}, x.m || ''), h('span', {}, x.l))));
    box.append(h('div', { class: 'focus-grid' },
      h('div', { class: 'card focus-card' }, ringEl, ctl, h('p', { class: 'small mute', style: 'text-align:center;margin-top:14px' }, 'Studying now: ', h('a', { href: '#/unit/' + nu.id }, nu.name))),
      h('div', {}, h('div', { class: 'card row' }, ring(Math.min(100, t.min / S.goalMin * 100), 'Minutes today', 'var(--ok)'), h('div', {}, h('b', {}, t.min + ' of ' + S.goalMin + ' min today'), h('div', { class: 'small mute' }, 'Every focused minute earns 2 XP'))),
        h('div', { class: 'card', style: 'margin-top:14px' }, h('b', {}, 'Last 7 days (minutes)'), bars),
        h('div', { class: 'card', style: 'margin-top:14px' }, h('b', {}, 'Make focus easy'), h('ul', { class: 'small mute' }, h('li', {}, 'Phone in another room, or on silent.'), h('li', {}, 'One task per session: one unit, one set of questions.'), h('li', {}, '25 minutes work, 5 minutes rest. After 4 rounds, rest 15 minutes.'), h('li', {}, 'Stuck for 5 minutes? Mark it and move on.'))))));
  }
  app.append(h('h1', {}, 'Focus timer'), h('p', { class: 'lead' }, 'The timer keeps running while you move around the site. You will hear a soft chime at the end.'), box);
  draw();
  tick = setInterval(() => { const T = S.timer; if (T && T.state === 'run') { const l = tmLeft(), e = $('#ft'), r = $('#fr'); if (e) e.textContent = mmss(l); if (r) r.style.setProperty('--p', (1 - l / T.total) * 100); } }, 500);
}

/* ========== START HERE ========== */
function start() {
  const next = () => { S.intro = true; save(); go('/home'); };
  app.append(
    h('div', { class: 'hero' }, h('h1', {}, 'Welcome, ' + (S.name || 'Maheen') + '. One small step at a time.'), h('div', { class: 'mute' }, 'This studio is built for beginners. Every unit has a short lesson plan, a one-page cheat sheet, and real past NEET questions with solutions.')),
    h('h2', {}, 'How it works (4 steps)'),
    h('div', { class: 'grid g2' },
      [['1  Read', 'Open a unit. Read the matching NCERT chapter slowly, then the one-page sheet. Do not rush.'], ['2  Practice', 'Do 10 real questions. After each one, read the solution, even when you were right.'], ['3  Fix', 'Wrong answers go to your Mistake Book. They return after 1, 3, 7, 21 days until you truly know them.'], ['4  Test', 'Take a short mock every week. Look at what went wrong. Then go back to step 1 for the weak units.']].map(x => h('div', { class: 'card' }, h('h3', {}, x[0]), h('p', { class: 'mute' }, x[1])))),
    h('h2', {}, 'A good day'),
    h('ul', {}, h('li', {}, 'Open "Today" and do the 3 steps. That is a complete day.'), h('li', {}, 'Study in blocks of 25 minutes with 5 minutes rest.'), h('li', {}, 'Before sleeping, look at the formula sheet of the unit you studied.'), h('li', {}, 'Sleep 7 hours. Memory is built during sleep.')),
    h('div', { class: 'note' }, h('b', {}, 'Honest expectations. '), 'No website can promise a score. What this one gives you is a clear order of study (Biology first, because it is half of the marks), real exam questions, and a way to see your progress. Steady daily work does the rest.'),
    h('h2', {}, 'Make it yours'),
    h('div', { class: 'card' },
      h('div', { class: 'field' }, h('label', { for: 'nm' }, 'Your name (stays on this device)'), h('input', { id: 'nm', type: 'text', value: S.name, maxlength: 30 })),
      h('div', { class: 'field' }, h('label', { for: 'gl' }, 'Daily question goal'), h('input', { id: 'gl', type: 'number', min: 5, max: 200, value: S.goal })),
      h('button', { class: 'btn pri block', onclick: () => { S.name = $('#nm').value.trim(); S.goal = Math.max(5, Math.min(200, +$('#gl').value || 30)); next(); } }, "Let's begin →")));
}

/* ========== LEARN (study map) ========== */
function learn() {
  let fs = 'all', fv = 'all';
  const wrap = h('div'), list = h('div', { class: 'grid g3' });
  const st = stats();
  function draw() {
    list.innerHTML = '';
    UNITS.filter(u => (fs === 'all' || u.s === fs) && (fv === 'all' || u.v === fv)).sort((a, b) => a.rank - b.rank).forEach(u => {
      const m = acc(st.bu[u.id]), stt = S.us[u.id] || 'new';
      list.append(h('a', { class: 'card ucard sb' + u.s, href: '#/unit/' + u.id },
        h('div', { class: 'row sp' }, sbadge(u.s), vbadge(u.v)),
        h('h3', {}, u.name),
        h('div', { class: 'small mute' }, '#' + u.rank + ' of 50 · about ' + u.marks + ' marks (' + u.e + ' Q)'),
        bar(m == null ? 0 : m * 100, u.s),
        h('div', { class: 'row sp status' }, h('span', {}, stt === 'new' ? '○ Not started' : stt === 'learning' ? '◐ Learning' : stt === 'done' ? '● Done' : '★ Revised'), h('span', { class: 'mute' }, m == null ? 'no practice yet' : 'Accuracy ' + pct(m)))));
    });
  }
  const chip = (lab, val, cur, set) => h('button', { class: 'fchip' + (cur() === val ? ' on' : ''), onclick: e => { set(val); wrap.querySelectorAll('[data-g="' + lab + '"]').forEach(c => c.classList.toggle('on', c.dataset.v === val)); draw(); }, 'data-g': lab, 'data-v': val }, val === 'all' ? 'All' : (SUBJ[val] || VLAB[val]));
  app.append(h('h1', {}, 'Study map'), h('p', { class: 'lead' }, 'All 50 official units, ranked by how many marks they give. Start with "Quick win" units, then the core.'),
    h('div', { class: 'chips' }, ['all', 'B', 'P', 'C'].map(v => chip('s', v, () => fs, x => fs = x))),
    h('div', { class: 'chips' }, ['all', 'quick', 'core', 'corehard', 'fill', 'low'].map(v => chip('v', v, () => fv, x => fv = x))),
    h('div', { class: 'callout', style: 'margin-bottom:14px' }, h('b', {}, 'Where the marks are: '), 'the 10 Biology units alone are half of the paper. 30 of the 50 units make 80% of the marks. Every unit is worth at least one question.'),
    list);
  draw();
}

/* ========== UNIT ========== */
function unit(p) {
  const u = UMAP[p[0]]; if (!u) { app.append(h('p', {}, 'Unit not found.'), h('a', { href: '#/learn' }, 'Back')); return; }
  const tab = p[1] || 'learn'; const stt = S.us[u.id] || 'new'; const m = acc(stats().bu[u.id]);
  const stp = S.steps[u.id] = S.steps[u.id] || [false, false, false, false];
  const setStatus = v => { S.us[u.id] = v; if (v === 'done' || v === 'revised') addXP(20); save(); checkBadges(); route(); };
  const tabs = [['learn', 'Learn'], ['sheet', 'Formula sheet'], ['cards', 'Flash cards'], ['practice', 'Practice']];
  app.append(
    h('a', { href: '#/learn', class: 'small' }, '← Study map'),
    h('div', { class: 'row sp' }, h('div', {}, h('h1', {}, u.name), h('div', { class: 'row' }, sbadge(u.s), vbadge(u.v), h('span', { class: 'small mute' }, 'about ' + u.marks + ' marks · ' + u.e + ' Q expected · #' + u.rank + ' of 50'))),
      h('div', { class: 'pill-row' }, [['new', 'Not started'], ['learning', 'Learning'], ['done', 'Done'], ['revised', 'Revised']].map(x => h('button', { class: 'fchip' + (stt === x[0] ? ' on' : ''), onclick: () => setStatus(x[0]) }, x[1])))),
    h('p', { class: 'mute' }, VHELP[u.v] + (u.easy != null ? ' Past papers labelled about ' + u.easy + '% of its questions easy.' : '') + (m != null ? ' Your accuracy here: ' + pct(m) + '.' : '')),
    h('div', { class: 'tabs', role: 'tablist' }, tabs.map(t => h('button', { class: 'tab' + (tab === t[0] ? ' on' : ''), role: 'tab', onclick: () => go(t[0] === 'cards' ? '/cards/' + u.id : '/unit/' + u.id + '/' + t[0]) }, t[1]))));
  if (tab === 'learn') {
    const steps = ['Read the matching NCERT chapter slowly (30–45 minutes). Underline new words.', 'Read the formula sheet in the next tab. Cover it and say it back.', 'Practice 10 real questions and read every solution.', 'Close everything. Write what you remember on a blank sheet.'];
    app.append(h('h2', {}, 'Your 4-step mission'), steps.map((s, i) => h('label', { class: 'step' }, h('input', { type: 'checkbox', checked: !!stp[i], onchange: e => { stp[i] = e.target.checked; if (e.target.checked) { today().steps++; bump(); addXP(5); } if (stp.every(Boolean) && S.us[u.id] !== 'done' && S.us[u.id] !== 'revised') { S.us[u.id] = 'done'; addXP(20); toast('Unit finished! ✅'); confetti(); } save(); checkBadges(); route(); } }), h('div', {}, h('b', {}, 'Step ' + (i + 1)), h('div', { class: 'mute' }, s), i === 2 ? h('a', { class: 'btn sm pri', style: 'margin-top:8px', href: '#/session/unit/' + u.id + '/10' }, 'Start 10 questions') : null))),
      h('h2', {}, 'Quick look'), h('div', { class: 'card sheet', html: (SHEETS[u.id] || '').split('</ul>')[0].slice(0, 2500) + '</ul>' }), h('a', { class: 'btn', href: '#/unit/' + u.id + '/sheet', style: 'margin-top:10px' }, 'Open the full sheet'));
  } else if (tab === 'sheet') {
    app.append(h('div', { class: 'card sheet', html: SHEETS[u.id] || '<p>No sheet.</p>' }), h('p', { class: 'small mute' }, 'Question codes like 24.58 mean year 2024 Q58, 26.x is the 3 May 2026 paper and R.x is Re-NEET 2026. [T] marks a memory trick made for this sheet, not an official rule.'));
  } else if (tab === 'practice') {
    const n = (QBYU[u.id] || []).length, st = stats().bu[u.id] || { a: 0, c: 0 };
    app.append(h('div', { class: 'card' }, h('h3', {}, 'Real past questions on this unit'), h('p', { class: 'mute' }, n + ' questions are available here (2020, 2022–2025). You answered ' + st.a + ' times, ' + st.c + ' correct.'), n < 6 ? h('div', { class: 'note' }, 'This unit has few readable questions in the bank. Use the PYQ Index in Library to find more in the PDFs.') : null,
      h('div', { class: 'row', style: 'margin-top:10px' }, [5, 10, 20].map(k => h('a', { class: 'btn' + (k === 10 ? ' pri' : ''), href: '#/session/unit/' + u.id + '/' + Math.min(k, Math.max(n, 1)) }, k + ' questions')))));
  }
}

/* ========== FLASH CARDS ========== */
function cards(p) {
  const uid = p[0], u = UMAP[uid]; if (!u) { go('/learn'); return; }
  const all = (CARDS[uid] || []).map((c, i) => ({ k: uid + ':' + i, q: c[0], a: c[1] }));
  if (!all.length) { app.append(h('a', { href: '#/unit/' + uid }, '← Back'), h('div', { class: 'card' }, h('p', {}, 'No flash cards for this unit yet. Use the formula sheet.'))); return; }
  const now = Date.now(); let deck = all.filter(c => !S.cards[c.k] || S.cards[c.k].due <= now); if (!deck.length) deck = all.slice();
  deck = shuffle(deck); let i = 0, show = false;
  const box = h('div');
  function draw() {
    box.innerHTML = '';
    if (i >= deck.length) { box.append(h('div', { class: 'card' }, h('h2', {}, 'Deck finished 🎉'), h('p', { class: 'mute' }, 'Cards you missed will come back sooner.'), h('div', { class: 'row' }, h('a', { class: 'btn pri', href: '#/unit/' + uid + '/practice' }, 'Practice questions'), h('a', { class: 'btn', href: '#/learn' }, 'Study map')))); return; }
    const c = deck[i];
    box.append(h('div', { class: 'small mute' }, 'Card ' + (i + 1) + ' of ' + deck.length), h('div', { class: 'card flash', role: 'button', tabindex: 0, onclick: () => { show = true; draw(); }, onkeydown: e => { if (e.key === 'Enter' || e.key === ' ') { show = true; draw(); } } }, show ? h('div', {}, h('div', { class: 'small mute' }, c.q), h('div', { style: 'margin-top:8px' }, c.a)) : h('div', {}, c.q, h('div', { class: 'small mute', style: 'margin-top:10px' }, 'Say the answer, then tap to reveal'))),
      show ? h('div', { class: 'row', style: 'margin-top:12px' }, h('button', { class: 'btn ok', onclick: () => grade(true) }, '✓ I knew it'), h('button', { class: 'btn', onclick: () => grade(false) }, '↺ Again')) : null);
  }
  function grade(ok) { const c = deck[i], s = S.cards[c.k] || { b: 0 }; s.b = ok ? Math.min(4, s.b + 1) : 0; s.due = Date.now() + (ok ? MIST_BOX[s.b] : 0.01) * DAY; S.cards[c.k] = s; addXP(2); today(); bump(); save(); show = false; i++; draw(); }
  app.append(h('a', { href: '#/unit/' + uid + '/cards', class: 'small', onclick: e => { e.preventDefault(); go('/unit/' + uid + '/learn'); } }, '← ' + u.name), h('h1', {}, 'Flash cards: ' + u.name), h('p', { class: 'lead' }, 'Made automatically from the formula sheet. Say it out loud before you flip.'), box);
  draw();
}

/* ========== PRACTICE ========== */
function practice() {
  const sel = h('select', { id: 'scope' }, h('option', { value: 'smart/0' }, '🧠 Smart mix (new + weak + wrong first)'), ['B', 'C', 'P'].map(s => h('option', { value: 'subj/' + s }, SUBJ[s] + ' (all units)')), h('optgroup', { label: 'One unit' }, PATH.map(u => h('option', { value: 'unit/' + u.id }, SUBJ[u.s][0] + ' · ' + u.name))));
  const cnt = h('select', { id: 'cnt' }, [5, 10, 15, 20, 30, 45].map(n => h('option', { value: n, selected: n === 10 }, n + ' questions')));
  app.append(h('h1', {}, 'Practice'), h('p', { class: 'lead' }, 'Real NEET questions from 2020 and 2022–2025, with step-by-step solutions. ' + QB.length + ' questions in the bank.'),
    h('div', { class: 'card' }, h('div', { class: 'field' }, h('label', { for: 'scope' }, 'What to practice'), sel), h('div', { class: 'field' }, h('label', { for: 'cnt' }, 'How many'), cnt), h('button', { class: 'btn pri block', onclick: () => go('/session/' + sel.value + '/' + cnt.value) }, 'Start practice')),
    h('h2', {}, 'Other ways'), h('div', { class: 'grid g3' },
      h('a', { class: 'card flat', href: '#/session/review/0/10' }, h('b', {}, '📒 Fix my mistakes'), h('div', { class: 'small mute' }, dueMistakes().length + ' due now')),
      h('a', { class: 'card flat', href: '#/session/weak/0/15' }, h('b', {}, '🎯 Weak areas'), h('div', { class: 'small mute' }, 'Units where you score under 70%')),
      h('a', { class: 'card flat', href: '#/learn' }, h('b', {}, '🗺️ Pick from the map'), h('div', { class: 'small mute' }, 'See every unit'))));
}
function buildSet(kind, arg, n) {
  let pool;
  if (kind === 'unit') pool = QBYU[arg] || [];
  else if (kind === 'subj') pool = QBYS[arg] || [];
  else if (kind === 'weak') pool = weakPool();
  else if (kind === 'review') { const d = dueMistakes(); pool = (d.length ? d : Object.keys(S.mist).filter(k => QMAP[k])).map(k => QMAP[k]); return shuffle(pool).slice(0, n); }
  else pool = QB.filter(q => UMAP[q.s + q.u]);
  return choose(pool, n);
}
function session(p) {
  const kind = p[0], arg = p[1], n = Math.max(1, +p[2] || 10);
  const qs = buildSet(kind, arg, n);
  if (!qs.length) { app.append(h('div', { class: 'card' }, h('h2', {}, kind === 'review' ? 'Your mistake book is empty 🎉' : 'No questions here'), h('p', { class: 'mute' }, kind === 'review' ? 'Wrong answers will show up here for review.' : 'Try another unit.'), h('a', { class: 'btn pri', href: '#/practice' }, 'Back'))); return; }
  const mode = kind === 'review' ? 'review' : 'practice';
  let i = 0, picked = null, checked = false, t0 = Date.now(), ok = 0, xp0 = S.xp, frozen = null; const log = [];
  const box = h('div'); app.append(box);
  tick = setInterval(() => { const el = $('#qt'); if (!el) return; const ms = frozen != null ? frozen : Date.now() - t0; el.textContent = '⏱ ' + Math.floor(ms / 60000) + ':' + pad(Math.floor(ms / 1000) % 60); el.className = 'qt' + (ms > 90000 ? ' slow' : ms > 60000 ? ' warn' : ''); }, 400);
  function draw() {
    box.innerHTML = '';
    if (i >= qs.length) { done(); return; }
    const q = qs[i], u = UMAP[q.s + q.u];
    const opts = q.o.map((o, k) => {
      const b = h('button', { class: 'opt', 'data-k': k + 1, disabled: checked, onclick: () => { if (checked) return; picked = k + 1; box.querySelectorAll('.opt').forEach(x => x.classList.toggle('sel', +x.dataset.k === picked)); $('#chk').disabled = false; } }, h('span', { class: 'k' }, k + 1), h('span', {}, o));
      if (checked) { if (k + 1 === q.a) b.classList.add('right'); else if (k + 1 === picked) b.classList.add('wrong'); } else if (picked === k + 1) b.classList.add('sel');
      return b;
    });
    box.append(
      h('div', { class: 'row sp' }, h('div', { class: 'small mute' }, 'Question ' + (i + 1) + ' of ' + qs.length), h('span', { class: 'qt', id: 'qt', title: 'Aim for about one minute per question' }, '⏱ 0:00'), h('a', { class: 'small', href: '#/practice', onclick: e => { e.preventDefault(); ask('Stop this practice? Answers so far are saved.', 'Stop').then(ok => { if (ok) go('/practice'); }); } }, 'End')), h('div', { class: 'dots' }, qs.map((_, k) => h('i', { class: 'dot' + (log[k] ? (log[k].ok ? ' ok' : ' bad') : '') + (k === i ? ' cur' : '') }))),
      h('div', { class: 'card q-card', style: 'margin-top:12px' },
        h('div', { class: 'q-meta' }, sbadge(q.s), h('span', { class: 'badge' }, u ? u.name : ''), h('span', { class: 'badge' }, 'NEET ' + q.y + ' Q' + q.n)),
        h('div', { class: 'q-text' }, q.q), h('div', { class: 'opts' }, opts),
        checked ? feedback(q) : h('div', { class: 'row' }, h('button', { id: 'chk', class: 'btn pri', disabled: picked == null, onclick: check }, 'Check answer'), h('button', { class: 'btn', onclick: () => { picked = 0; check(); } }, "I don't know"), pdfA(q, 'See original page (figures)', 'small'))));
    window.onkeydown = e => { if (e.target.matches('input,textarea,select')) return; if (!checked && e.key >= '1' && e.key <= '4') { picked = +e.key; draw(); $('#chk') && ($('#chk').disabled = false); } else if (e.key === 'Enter') { if (!checked && picked != null) check(); else if (checked) next(); } };
  }
  const QB_PDF = window.QB_PDF || {};
  function check() {
    const q = qs[i]; const okk = picked === q.a; checked = true; frozen = Date.now() - t0;
    record(q.id, picked || 0, Date.now() - t0, mode); if (okk) ok++; log.push({ q: q.id, ok: okk, sel: picked });
    draw();
  }
  function feedback(q) {
    const okk = picked === q.a; const m = S.mist[q.id];
    return h('div', {}, h('div', { class: 'explain ' + (okk ? 'ok' : 'bad'), 'aria-live': 'polite' }, h('b', {}, okk ? 'Correct! ' + pick(['Well done.', 'Nice thinking.', 'That is how it is done.']) : (picked ? 'Not this time. ' : 'No problem. ') + 'The answer is option ' + q.a + '.'), h('p', {}, q.e || solFallback(q)), h('p', { class: 'small' }, pdfA(q, 'Open original page with figures')), !okk ? h('p', { class: 'small' }, 'This question is now in your Mistake Book and will come back in 1 day.') : null),
      !okk ? h('div', { class: 'field' }, h('label', { for: 'trap' }, 'Write the trap in one line (optional)'), h('textarea', { id: 'trap', placeholder: 'e.g. forgot that Cl has the highest electron gain enthalpy', onblur: e => { if (S.mist[q.id]) { S.mist[q.id].notes = e.target.value; save(); } } }, m ? m.notes : '')) : null,
      h('button', { class: 'btn pri block', style: 'margin-top:12px', onclick: next }, i + 1 >= qs.length ? 'Finish' : 'Next question →'));
  }
  function next() { const tr = $('#trap'); if (tr && S.mist[qs[i].id]) { S.mist[qs[i].id].notes = tr.value; save(); } i++; picked = null; checked = false; frozen = null; t0 = Date.now(); draw(); }
  function done() {
    window.onkeydown = null; stopTick(); if (mode === 'review') today().rev++; save(); if (ok / qs.length >= .7) confetti();
    const wrong = log.filter(x => !x.ok);
    box.append(h('div', { class: 'card' }, h('h1', {}, ok === qs.length ? 'Perfect round! 🌟' : 'Round complete'), h('div', { class: 'row' }, ring(ok / qs.length * 100, 'Score', ok / qs.length >= .7 ? 'var(--ok)' : 'var(--C)'), h('div', {}, h('div', { class: 'big' }, ok + ' / ' + qs.length), h('div', { class: 'mute' }, '+' + (S.xp - xp0) + ' XP'))),
      h('p', { class: 'mute' }, ok / qs.length >= .8 ? 'Strong. Move to the next unit.' : ok / qs.length >= .5 ? 'Good start. Read the sheet again, then retry.' : 'This unit needs another read of NCERT and the sheet. That is normal. Repeat tomorrow.'),
      h('div', { class: 'row' }, h('a', { class: 'btn pri', href: '#/session/' + kind + '/' + arg + '/' + n, onclick: () => setTimeout(route, 0) }, 'Another round'), kind === 'unit' ? h('a', { class: 'btn', href: '#/unit/' + arg + '/learn' }, 'Back to unit') : null, wrong.length ? h('a', { class: 'btn', href: '#/mistakes' }, 'See ' + wrong.length + ' mistake' + (wrong.length > 1 ? 's' : '')) : null, h('a', { class: 'btn', href: '#/home' }, 'Home'))));
  }
  draw();
}

/* ========== MOCK ========== */
const MOCKS = [
  { id: 'full', name: 'Full NEET-style mock', n: 180, min: 180, spec: { P: 45, C: 45, B: 90 }, desc: '180 questions, 3 hours. Physics 45, Chemistry 45, Biology 90. +4 / −1.' },
  { id: 'bio', name: 'Biology sprint', n: 45, min: 40, spec: { B: 45 }, desc: '45 Biology questions in 40 minutes.' },
  { id: 'phy', name: 'Physics sprint', n: 25, min: 35, spec: { P: 25 }, desc: '25 Physics questions in 35 minutes.' },
  { id: 'chem', name: 'Chemistry sprint', n: 25, min: 30, spec: { C: 25 }, desc: '25 Chemistry questions in 30 minutes.' },
  { id: 'weak', name: 'Weak-area mock', n: 30, min: 30, spec: null, desc: '30 questions from your weakest units.' }
];
function alloc(s, total) {
  const us = UNITS.filter(u => u.s === s), sum = us.reduce((a, u) => a + u.e, 0); const raw = us.map(u => ({ u, x: u.e / sum * total }));
  raw.forEach(r => { r.n = Math.floor(r.x); r.f = r.x - r.n; }); let left = total - raw.reduce((a, r) => a + r.n, 0);
  raw.sort((a, b) => b.f - a.f).forEach(r => { if (left > 0) { r.n++; left--; } });
  return raw;
}
function buildMock(def, unitId) {
  let ids = [];
  if (unitId) { ids = choose(QBYU[unitId] || [], 15).map(q => q.id); }
  else if (def.spec) {
    Object.keys(def.spec).forEach(s => {
      const taken = new Set(); const got = [];
      alloc(s, def.spec[s]).forEach(r => choose(QBYU[r.u.id] || [], r.n).forEach(q => { got.push(q); taken.add(q.id); }));
      if (got.length < def.spec[s]) choose(QBYS[s].filter(q => !taken.has(q.id)), def.spec[s] - got.length).forEach(q => got.push(q));
      ids = ids.concat(got.map(q => q.id));
    });
  } else ids = choose(weakPool(), def.n).map(q => q.id);
  const order = { P: 0, C: 1, B: 2 };
  return ids.map(id => QMAP[id]).sort((a, b) => order[a.s] - order[b.s]).map(q => q.id);
}
function mock() {
  const sel = h('select', { id: 'uu' }, PATH.map(u => h('option', { value: u.id }, SUBJ[u.s][0] + ' · ' + u.name)));
  app.append(h('h1', {}, 'Mock tests'), h('p', { class: 'lead' }, 'Real questions from past NEET papers, sampled in the same proportion as the real exam. Same marking: +4 correct, −1 wrong.'));
  if (S.active) app.append(h('div', { class: 'callout', style: 'margin-bottom:14px' }, h('b', {}, 'You have a test in progress: ' + S.active.name + '. '), h('a', { class: 'btn pri sm', href: '#/test/' + S.active.id }, 'Resume')));
  app.append(h('div', { class: 'grid g2' }, MOCKS.map(m => h('div', { class: 'card' }, h('h3', {}, m.name), h('p', { class: 'mute' }, m.desc), h('button', { class: 'btn pri', onclick: () => startTest(m) }, 'Start')))),
    h('div', { class: 'card', style: 'margin-top:14px' }, h('h3', {}, 'Unit test (15 questions, 15 minutes)'), h('div', { class: 'field' }, sel), h('button', { class: 'btn pri', onclick: () => startTest({ id: 'unit', name: 'Unit test: ' + UMAP[sel.value].name, n: 15, min: 15 }, sel.value) }, 'Start')),
    h('div', { class: 'note', style: 'margin-top:14px' }, 'The bank has ' + QB.length + ' real questions (about 1,000 exist in the 5 papers; the rest could not be read cleanly by software). Repeating mocks will show some questions again. Early mocks are for learning, not for judging yourself.'),
    h('h2', {}, 'Your mock history'),
    S.mocks.length ? h('div', { class: 'card', style: 'overflow-x:auto' }, h('table', { class: 't' }, h('thead', {}, h('tr', {}, ['Date', 'Test', 'Score', 'Accuracy', ''].map(x => h('th', {}, x)))), h('tbody', {}, S.mocks.slice(0, 25).map(m => h('tr', {}, h('td', {}, dstr(new Date(m.t))), h('td', {}, m.name), h('td', {}, m.score + ' / ' + m.max), h('td', {}, pct(m.c + m.w ? m.c / (m.c + m.w) : null)), h('td', {}, h('a', { href: '#/result/' + m.id }, 'Review'))))))) : h('p', { class: 'mute' }, 'No mocks yet. Your first one is a baseline, not a judgement.'));
}
async function startTest(def, unitId) {
  if (S.active && !(await ask('You already have a test in progress. Start a new one and discard it?', 'Discard and start', true))) return;
  const ids = buildMock(def, unitId);
  if (ids.length < Math.min(def.n, 10)) { toast('Not enough questions for this test.'); return; }
  const id = 'm' + Date.now();
  S.active = { id, name: def.name, kind: def.id, qids: ids, ans: {}, mark: {}, vis: {}, per: {}, start: Date.now(), end: Date.now() + def.min * 60000, cur: 0, min: def.min };
  save(); go('/test/' + id);
}
function test(p) {
  const A = S.active; if (!A || A.id !== p[0]) { go('/mock'); return; }
  const qs = A.qids.map(id => QMAP[id]); let t0 = Date.now(); const QB_PDF = window.QB_PDF || {};
  const root = h('div'); app.append(root);
  function leave() { const q = qs[A.cur]; A.per[q.id] = (A.per[q.id] || 0) + (Date.now() - t0); t0 = Date.now(); }
  function jump(i) { leave(); A.cur = i; A.vis[qs[i].id] = 1; save(); draw(); }
  function remaining() { return Math.max(0, A.end - Date.now()); }
  const fmt = ms => { const s = Math.ceil(ms / 1000); return pad(Math.floor(s / 3600)) + ':' + pad(Math.floor(s % 3600 / 60)) + ':' + pad(s % 60); };
  function draw() {
    root.innerHTML = ''; const q = qs[A.cur]; A.vis[q.id] = 1; const sel = A.ans[q.id];
    const counts = { ans: Object.keys(A.ans).length, mark: Object.keys(A.mark).filter(k => A.mark[k]).length };
    const secs = ['P', 'C', 'B'].filter(s => qs.some(x => x.s === s));
    const pal = h('div', { class: 'pal' }, qs.map((x, i) => h('button', { class: 'pb' + (A.ans[x.id] ? ' ans' : '') + (A.mark[x.id] ? ' mark' : '') + (!A.ans[x.id] && A.vis[x.id] ? ' vis' : '') + (i === A.cur ? ' cur' : ''), 'aria-label': 'Question ' + (i + 1), onclick: () => jump(i) }, i + 1)));
    root.append(h('div', { class: 'card row sp', style: 'position:sticky;top:60px;z-index:5' }, h('div', {}, h('b', {}, A.name), h('div', { class: 'small mute' }, counts.ans + ' of ' + qs.length + ' answered · ' + counts.mark + ' marked')), h('div', { class: 'timer', id: 'tm' }, fmt(remaining())), h('button', { class: 'btn sm', onclick: () => submit(false) }, 'Submit')),
      h('div', { class: 'exam', style: 'margin-top:12px' },
        h('div', {}, h('div', { class: 'chips' }, secs.map(s => h('button', { class: 'fchip' + (q.s === s ? ' on' : ''), onclick: () => jump(qs.findIndex(x => x.s === s)) }, SUBJ[s]))),
          h('div', { class: 'card q-card' }, h('div', { class: 'q-meta' }, sbadge(q.s), h('span', { class: 'badge' }, 'Q' + (A.cur + 1) + ' of ' + qs.length), pdfA(q, 'See figure / original', 'small')),
            h('div', { class: 'q-text' }, q.q), h('div', { class: 'opts' }, q.o.map((o, k) => h('button', { class: 'opt' + (sel === k + 1 ? ' sel' : ''), onclick: () => { A.ans[q.id] = k + 1; save(); draw(); } }, h('span', { class: 'k' }, k + 1), h('span', {}, o)))),
            h('div', { class: 'row' }, h('button', { class: 'btn', disabled: A.cur === 0, onclick: () => jump(A.cur - 1) }, '← Prev'), h('button', { class: 'btn', onclick: () => { delete A.ans[q.id]; save(); draw(); } }, 'Clear'), h('button', { class: 'btn', onclick: () => { A.mark[q.id] = !A.mark[q.id]; save(); draw(); } }, A.mark[q.id] ? 'Unmark' : 'Mark for review'), h('button', { class: 'btn pri', disabled: A.cur >= qs.length - 1, onclick: () => jump(A.cur + 1) }, 'Save & Next →')))),
        h('div', { class: 'card' }, h('b', {}, 'Question palette'), h('div', { class: 'small mute', style: 'margin:6px 0 10px' }, 'Green = answered · Purple = marked · Red edge = seen, not answered'), pal)));
    window.onkeydown = e => { if (e.target.matches('input,textarea,select')) return; if (e.key >= '1' && e.key <= '4') { A.ans[q.id] = +e.key; save(); draw(); } else if (e.key === 'n' && A.cur < qs.length - 1) jump(A.cur + 1); else if (e.key === 'p' && A.cur > 0) jump(A.cur - 1); else if (e.key === 'm') { A.mark[q.id] = !A.mark[q.id]; save(); draw(); } };
  }
  async function submit(auto) {
    if (!auto) { const un = qs.length - Object.keys(A.ans).length; if (!(await ask(un ? 'You have ' + un + ' unanswered question(s). Submit now?' : 'Submit your test?', 'Submit'))) return; }
    leave(); stopTick(); window.onkeydown = null;
    let c = 0, w = 0, u = 0; const subj = {}, unit = {};
    qs.forEach(q => { const k = q.s + q.u; const a = A.ans[q.id]; subj[q.s] = subj[q.s] || { c: 0, w: 0, u: 0, n: 0 }; unit[k] = unit[k] || { c: 0, w: 0, u: 0 }; subj[q.s].n++;
      if (!a) { u++; subj[q.s].u++; unit[k].u++; } else { record(q.id, a, A.per[q.id] || 0, 'mock'); if (a === q.a) { c++; subj[q.s].c++; unit[k].c++; } else { w++; subj[q.s].w++; unit[k].w++; } } });
    const rec = { id: A.id, t: Date.now(), name: A.name, kind: A.kind, n: qs.length, c, w, u, score: 4 * c - w, max: 4 * qs.length, subj, unit, used: Math.min(Date.now() - A.start, A.min * 60000), qids: A.qids, ans: A.ans, per: A.per };
    S.mocks.unshift(rec); S.active = null; addXP(50); bump(); checkBadges(); save(); go('/result/' + rec.id);
  }
  window._submitTest = submit;
  tick = setInterval(() => { const el = $('#tm'); if (!el) return; const r = remaining(); el.textContent = fmt(r); el.classList.toggle('low', r < 5 * 60000); if (r <= 0) { submit(true); } }, 1000);
  if (remaining() <= 0) { submit(true); return; }
  draw();
}
function result(p) {
  const m = S.mocks.find(x => x.id === p[0]); if (!m) { go('/mock'); return; }
  const QB_PDF = window.QB_PDF || {}; let filt = 'wrong'; const list = h('div');
  const att = m.c + m.w, accv = att ? m.c / att : null;
  function draw() {
    list.innerHTML = '';
    m.qids.map((id, i) => ({ q: QMAP[id], i, a: m.ans[id] })).filter(x => x.q && (filt === 'all' || (filt === 'wrong' && x.a && x.a !== x.q.a) || (filt === 'skip' && !x.a))).forEach(x => {
      const q = x.q, st = !x.a ? 'Not answered' : x.a === q.a ? 'Correct' : 'Wrong';
      list.append(h('details', {}, h('summary', {}, '#' + (x.i + 1) + ' · ' + st + ' · ' + (UMAP[q.s + q.u] || {}).name), h('div', { class: 'q-text', style: 'margin:10px 0' }, q.q), h('div', { class: 'opts' }, q.o.map((o, k) => h('div', { class: 'opt' + (k + 1 === q.a ? ' right' : (k + 1 === x.a ? ' wrong' : '')) }, h('span', { class: 'k' }, k + 1), h('span', {}, o)))), h('div', { class: 'explain ' + (x.a === q.a ? 'ok' : 'bad') }, h('b', {}, 'Answer: option ' + q.a), h('p', {}, q.e || solFallback(q)), h('p', { class: 'small' }, pdfA(q, 'Open original page')))));
    });
    if (!list.childNodes.length) list.append(h('p', { class: 'mute' }, 'Nothing here.'));
  }
  const uRows = Object.keys(m.unit).map(k => ({ k, meta: UMAP[k], c: m.unit[k].c, w: m.unit[k].w, sk: m.unit[k].u })).filter(x => x.meta).sort((a, b) => (b.w + b.sk) - (a.w + a.sk));
  app.append(h('h1', {}, 'Result: ' + m.name),
    h('div', { class: 'grid g4' }, h('div', { class: 'stat' }, h('b', {}, m.score + ' / ' + m.max), 'Score'), h('div', { class: 'stat' }, h('b', {}, m.c), 'Correct'), h('div', { class: 'stat' }, h('b', {}, m.w), 'Wrong'), h('div', { class: 'stat' }, h('b', {}, m.u), 'Skipped')),
    h('p', { class: 'mute' }, 'Accuracy on attempted: ' + pct(accv) + ' · time used ' + Math.round(m.used / 60000) + ' min · XP earned. Wrong answers were added to your Mistake Book.'),
    h('div', { class: 'callout' }, m.score / m.max < .4 ? 'This is a baseline. Every top scorer started with a low first mock. Open the units below and fix them one by one.' : m.score / m.max < .7 ? 'You are building. Fix the units below, then retake a mock in a week.' : 'Strong result. Keep the weak units warm and keep timing yourself.'),
    h('h2', {}, 'By subject'), h('div', { class: 'grid g3' }, Object.keys(m.subj).map(s => { const x = m.subj[s]; return h('div', { class: 'card' }, sbadge(s), h('div', { class: 'big' }, (4 * x.c - x.w) + ' / ' + (4 * x.n)), h('div', { class: 'small mute' }, x.c + ' right · ' + x.w + ' wrong · ' + x.u + ' skipped')); })),
    h('h2', {}, 'Fix these units first'), h('div', { class: 'card', style: 'overflow-x:auto' }, h('table', { class: 't' }, h('thead', {}, h('tr', {}, ['Unit', 'Right', 'Wrong', 'Skipped', ''].map(x => h('th', {}, x)))), h('tbody', {}, uRows.slice(0, 8).map(r => h('tr', {}, h('td', {}, r.meta.name), h('td', {}, r.c), h('td', {}, r.w), h('td', {}, r.sk), h('td', {}, h('a', { href: '#/unit/' + r.k + '/sheet' }, 'Sheet'))))))),
    h('h2', {}, 'Review questions'), h('div', { class: 'chips' }, [['wrong', 'Wrong'], ['skip', 'Skipped'], ['all', 'All']].map(x => h('button', { class: 'fchip' + (filt === x[0] ? ' on' : ''), onclick: e => { filt = x[0]; e.target.parentNode.querySelectorAll('.fchip').forEach(c => c.classList.toggle('on', c === e.target)); draw(); } }, x[1]))), list,
    h('div', { class: 'row', style: 'margin-top:14px' }, h('a', { class: 'btn pri', href: '#/mock' }, 'Another mock'), h('a', { class: 'btn', href: '#/mistakes' }, 'Mistake Book')));
  draw();
}

/* ========== MISTAKES ========== */
function mistakes() {
  const ids = Object.keys(S.mist).filter(k => QMAP[k]); const due = dueMistakes().length;
  app.append(h('h1', {}, 'Mistake Book'), h('p', { class: 'lead' }, 'Every wrong answer lands here and returns after 1, 3, 7, 21 and 60 days. Answer it right each time and it disappears for good.'),
    h('div', { class: 'row' }, h('a', { class: 'btn pri', href: '#/session/review/0/10' }, due ? 'Review ' + Math.min(due, 10) + ' due now' : 'Review any 10'), h('span', { class: 'mute' }, ids.length + ' in the book · ' + due + ' due')));
  if (!ids.length) { app.append(h('div', { class: 'card', style: 'margin-top:14px' }, h('p', {}, 'Empty for now. Wrong answers will show up here.'))); return; }
  const by = {}; ids.forEach(k => { const q = QMAP[k], key = q.s + q.u; (by[key] = by[key] || []).push(q); });
  Object.keys(by).sort((a, b) => by[b].length - by[a].length).forEach(k => {
    const u = UMAP[k]; if (!u) return;
    app.append(h('h2', {}, u.name + ' (' + by[k].length + ')'), by[k].map(q => { const m = S.mist[q.id]; return h('details', {}, h('summary', {}, q.q.slice(0, 110) + (q.q.length > 110 ? '…' : '')), h('div', { class: 'q-text', style: 'margin:10px 0' }, q.q), h('div', { class: 'opts' }, q.o.map((o, i) => h('div', { class: 'opt' + (i + 1 === q.a ? ' right' : '') }, h('span', { class: 'k' }, i + 1), h('span', {}, o)))), h('div', { class: 'explain ok' }, h('p', {}, q.e || solFallback(q))), h('div', { class: 'field' }, h('label', {}, 'My trap note'), h('textarea', { onblur: e => { m.notes = e.target.value; save(); } }, m.notes || '')), h('div', { class: 'row' }, h('span', { class: 'small mute' }, 'Wrong ' + m.wrong + '× · step ' + (m.box + 1) + ' of 5 · next review ' + dstr(new Date(m.due))), h('button', { class: 'btn sm', onclick: async () => { if (await ask('Remove this from the book? Only do this if you truly know it.', 'Remove')) { delete S.mist[q.id]; S.fixed = (S.fixed || 0) + 1; save(); route(); } } }, 'I know it now'))); }));
  });
}

/* ========== PROGRESS ========== */
function progress() {
  const st = stats(); const done = UNITS.filter(u => unitDone(u.id));
  let est = 0; UNITS.forEach(u => { const x = st.bu[u.id]; est += u.marks * (x ? x.c / (x.a + 4) : 0); });
  app.append(h('h1', {}, 'Your progress'));
  app.append(h('div', { class: 'grid g4' },
    h('div', { class: 'stat' }, h('b', {}, st.a), 'Questions answered'), h('div', { class: 'stat' }, h('b', {}, pct(st.a ? st.c / st.a : null)), 'Overall accuracy'), h('div', { class: 'stat' }, h('b', {}, done.length + '/50'), 'Units done'), h('div', { class: 'stat' }, h('b', {}, S.mocks.length), 'Mocks taken')));
  app.append(h('h2', {}, 'Subject accuracy'), h('div', { class: 'grid g3' }, ['B', 'C', 'P'].map(s => { const x = st.bs[s]; return h('div', { class: 'card' }, h('div', { class: 'row sp' }, sbadge(s), h('b', {}, pct(acc(x)))), bar(x.a ? x.c / x.a * 100 : 0, s), h('div', { class: 'small mute' }, x.a + ' answered')); })));
  // trend
  app.append(h('h2', {}, 'Mock score trend'));
  const full = S.mocks.slice().reverse();
  if (full.length < 2) app.append(h('div', { class: 'card' }, h('p', { class: 'mute' }, 'Take 2 or more mocks to see your trend. Scores are shown as a percentage of the maximum.')));
  else { const cv = h('canvas', { width: 700, height: 220, style: 'width:100%;max-width:700px' }); app.append(h('div', { class: 'card' }, cv)); drawLine(cv, full.map(m => Math.max(0, m.score / m.max * 100))); }
  app.append(h('h2', {}, 'Unit heat map'), h('p', { class: 'small mute' }, 'Green = strong, amber = shaky, red = weak, grey = not enough practice (fewer than 3 answers). Tap a unit.'),
    h('div', { class: 'heat' }, UNITS.slice().sort((a, b) => a.rank - b.rank).map(u => { const x = st.bu[u.id], a = acc(x), n = x ? x.a : 0; const col = n < 3 ? 'var(--card)' : a >= .75 ? 'var(--ok-soft)' : a >= .5 ? 'var(--warn-soft)' : 'var(--bad-soft)'; return h('a', { class: 'tile', style: 'background:' + col, href: '#/unit/' + u.id + '/sheet' }, h('b', {}, n < 3 ? '–' : pct(a)), u.name); })));
  // calendar
  const cal = h('div', { class: 'cal' }); for (let i = 27; i >= 0; i--) { const d = S.daily[dstr(new Date(Date.now() - i * DAY))]; const q = d ? d.q : 0; cal.append(h('i', { class: q >= S.goal ? 'l3' : q >= S.goal / 2 ? 'l2' : q > 0 ? 'l1' : '', title: dstr(new Date(Date.now() - i * DAY)) + ': ' + q + ' questions' })); }
  app.append(h('h2', {}, 'Last 4 weeks'), h('div', { class: 'card' }, cal, h('p', { class: 'small mute' }, 'Darker = closer to your daily goal. Streak ' + S.streak.n + ' days · best ' + S.streak.best + '.')));
  app.append(h('h2', {}, 'Practice-based estimate'), h('div', { class: 'card' }, h('div', { class: 'big' }, '≈ ' + Math.round(est) + ' / 720'), h('p', { class: 'mute' }, 'A very rough, conservative number from your accuracy per unit, weighted by how many marks each unit carries. It starts near zero and rises as you practise. Only full timed mocks give a real signal.')));
  app.append(h('h2', {}, 'Badges'), h('div', { class: 'grid g4' }, BADGES.map(b => h('div', { class: 'card flat', style: S.badges[b[0]] ? '' : 'opacity:.5' }, h('div', { style: 'font-size:1.6rem' }, S.badges[b[0]] ? '🏅' : '🔒'), h('b', {}, b[1]), h('div', { class: 'small mute' }, b[2])))));
}
function drawLine(cv, vals) {
  const c = cv.getContext('2d'), W = cv.width, H = cv.height, pL = 36, pB = 24; c.clearRect(0, 0, W, H);
  const css = getComputedStyle(document.documentElement); const line = css.getPropertyValue('--line').trim() || '#ddd', pri = css.getPropertyValue('--pri').trim() || '#4f46e5', mute = css.getPropertyValue('--mute').trim() || '#666';
  c.font = '12px system-ui'; c.fillStyle = mute; c.strokeStyle = line;
  [0, 25, 50, 75, 100].forEach(v => { const y = H - pB - v / 100 * (H - pB - 10); c.beginPath(); c.moveTo(pL, y); c.lineTo(W - 8, y); c.stroke(); c.fillText(v + '%', 2, y + 4); });
  c.strokeStyle = pri; c.lineWidth = 3; c.beginPath();
  vals.forEach((v, i) => { const x = pL + (vals.length === 1 ? 0 : i / (vals.length - 1)) * (W - pL - 16), y = H - pB - v / 100 * (H - pB - 10); if (i) c.lineTo(x, y); else c.moveTo(x, y); }); c.stroke();
  c.fillStyle = pri; vals.forEach((v, i) => { const x = pL + (vals.length === 1 ? 0 : i / (vals.length - 1)) * (W - pL - 16), y = H - pB - v / 100 * (H - pB - 10); c.beginPath(); c.arc(x, y, 4, 0, 7); c.fill(); });
}

/* ========== LIBRARY ========== */
function library() {
  const idx = UNITS.map(u => ({ u, t: (u.name + ' ' + (SHEETS[u.id] || '').replace(/<[^>]+>/g, ' ')).toLowerCase() }));
  const res = h('div', { class: 'grid g3' });
  function draw(qv) { res.innerHTML = ''; const q = qv.trim().toLowerCase(); idx.filter(x => !q || x.t.includes(q)).sort((a, b) => a.u.rank - b.u.rank).forEach(x => { const i = q ? x.t.indexOf(q) : -1; const snip = i >= 0 ? '…' + x.t.slice(Math.max(0, i - 40), i + 90).replace(/\s+/g, ' ') + '…' : 'About ' + x.u.marks + ' marks'; res.append(h('a', { class: 'card flat ucard sb' + x.u.s, href: '#/unit/' + x.u.id + '/sheet' }, h('b', {}, x.u.name), h('div', { class: 'small mute' }, SUBJ[x.u.s] + ' · ' + snip))); }); if (!res.childNodes.length) res.append(h('p', { class: 'mute' }, 'No sheet matches. Try another word.')); }
  const inp = h('input', { class: 'search', type: 'text', placeholder: 'Search every sheet: e.g. Nernst, lac operon, Lucas test…', oninput: e => draw(e.target.value) });
  const pdfs = [['NEET_2027_Formula_Tricks_Sheet.pdf', 'Formula and tricks sheet, all 50 units (28 pages)'], ['NEET_2027_Top1_Master_Plan.pdf', 'Master plan and syllabus facts'], ['NEET_2027_Weightage_From_PYQ_Tagging.pdf', 'Weightage from 1,700 tagged questions'], ['PYQ_Index_by_Unit.pdf', 'Every past question listed by unit'], ['NEET_2027_Syllabus_Weightage_Guide.pdf', 'Official syllabus text and chapter tables'], ['NEET_2020_Code-E1_Ans-Solutions.pdf', 'NEET 2020 paper with solutions'], ['NEET_2022_Code-Q1_Qs-Ans-Solutions.pdf', 'NEET 2022 paper with solutions'], ['NEET_2023_Code-E2_Ans-Solutions.pdf', 'NEET 2023 paper with solutions'], ['NEET_2024_Code-R1_Ans-Solutions.pdf', 'NEET 2024 paper with solutions'], ['NEET_2025_Code-45_Ans-Solutions.pdf', 'NEET 2025 paper with solutions']];
  app.append(h('h1', {}, 'Library'), h('p', { class: 'lead' }, 'Search all formula sheets or open the PDFs.'), h('div', { class: 'field' }, inp), res, h('h2', {}, 'PDF downloads'), h('div', { class: 'grid g2' }, pdfs.filter(p => !/^NEET_20\d\d_Code/.test(p[0]) || Object.keys(window.QB_PDF || {}).length).map(p => h('a', { class: 'card flat', href: 'pdfs/' + p[0], target: '_blank', rel: 'noopener' }, h('b', {}, '📄 ' + p[1]), h('div', { class: 'small mute' }, p[0])))), h('p', {}, h('a', { href: '#/about' }, 'About this data and its limits')));
  draw('');
}
function about() {
  app.append(h('h1', {}, 'About the data'), h('div', { class: 'card' },
    h('ul', {}, h('li', {}, 'Syllabus: official NMC NEET (UG) 2026 syllabus (NTA notice 8 Jan 2026). No 2027 syllabus is published yet; the studio will need updating when it is.'), h('li', {}, 'Questions: ' + QB.length + ' real questions from NEET 2020, 2022, 2023, 2024, 2025, read from solution PDFs. About 100 questions in those papers could not be read cleanly and are left out; figures and subscripts may be lost, so use the "original page" link when a question looks odd.'), h('li', {}, 'Answers and solutions come from the publisher of those PDFs, not from NTA. If an answer looks wrong, check the official NTA key.'), h('li', {}, 'Unit tags and weightage were made by reading each question; about 10% are judgement calls. Weightage is an estimate, not an official number.'), h('li', {}, 'Formula sheets, tricks and flash cards were written for this project from standard NCERT-level knowledge and have not been line-checked against NCERT. Ask a teacher to cross-check before relying on them.'), h('li', {}, 'Your progress is stored only in this browser. Use Settings → Backup to save a copy.'))));
}

/* ========== SETTINGS ========== */
function settings() {
  const f = {};
  app.append(h('h1', {}, 'Settings'), h('div', { class: 'card' },
    h('div', { class: 'field' }, h('label', { for: 's1' }, 'Name'), f.name = h('input', { id: 's1', type: 'text', value: S.name })),
    h('div', { class: 'field' }, h('label', { for: 's2' }, 'NEET date (estimate; change when NTA announces it)'), f.exam = h('input', { id: 's2', type: 'date', value: S.exam })),
    h('div', { class: 'field' }, h('label', { for: 's3' }, 'Daily question goal'), f.goal = h('input', { id: 's3', type: 'number', min: 5, max: 200, value: S.goal })),
    h('div', { class: 'field' }, h('label', { for: 's3b' }, 'Daily study-minutes goal'), f.gm = h('input', { id: 's3b', type: 'number', min: 15, max: 600, value: S.goalMin })),
    h('div', { class: 'field' }, h('label', { for: 's4' }, 'Theme'), f.theme = h('select', { id: 's4' }, [['auto', 'Match my device'], ['light', 'Light'], ['dark', 'Dark']].map(o => h('option', { value: o[0], selected: S.theme === o[0] }, o[1])))),
    h('div', { class: 'field' }, h('label', { for: 's5' }, 'Text size'), f.fs = h('select', { id: 's5' }, [[15, 'Small'], [16, 'Normal'], [18, 'Large'], [20, 'Extra large']].map(o => h('option', { value: o[0], selected: +S.fs === o[0] }, o[1])))),
    h('button', { class: 'btn pri', onclick: () => { S.name = f.name.value.trim(); S.exam = f.exam.value || S.exam; S.goal = Math.max(5, Math.min(200, +f.goal.value || 30)); S.goalMin = Math.max(15, Math.min(600, +f.gm.value || 90)); S.theme = f.theme.value; S.fs = +f.fs.value; applyTheme(); save(); toast('Saved'); } }, 'Save settings')),
    h('h2', {}, 'Backup'), h('div', { class: 'card' }, h('p', { class: 'mute' }, 'Your progress lives in this browser only. Press "Make and copy backup", then paste the text into Notes or a message to yourself. To restore, paste it back here.'),
      h('div', { class: 'field' }, h('label', { for: 'bk' }, 'Backup text'), f.bk = h('textarea', { id: 'bk', placeholder: 'Backup text appears here. Paste a backup here to restore.' })),
      h('div', { class: 'row' }, h('button', { class: 'btn', onclick: () => { f.bk.value = JSON.stringify(S); f.bk.select(); const w = navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(f.bk.value) : Promise.reject(); w.then(() => toast('Backup copied')).catch(() => toast('Select the text and copy it')); } }, '📋 Make and copy backup'),
        h('button', { class: 'btn', onclick: () => { try { const d = JSON.parse(f.bk.value); if (typeof d !== 'object' || !Array.isArray(d.att)) throw 0; S = Object.assign(defaults(), d); save(); applyTheme(); toast('Backup restored'); route(); } catch (x) { toast('That text is not a valid backup'); } } }, '⬆ Restore from text'),
        h('button', { class: 'btn', onclick: async () => { if (await ask('Delete ALL your progress on this device? This cannot be undone.', 'Delete everything', true)) { S = defaults(); S.intro = true; save(); toast('Progress cleared'); route(); } } }, 'Reset everything'))),
    h('p', {}, h('a', { href: '#/start' }, 'Show the welcome guide again'), ' · ', h('a', { href: '#/about' }, 'About the data')));
}

/* ========== boot ========== */
$('#chip-timer').addEventListener('click', () => go('/focus'));
function fixLinks() { app.querySelectorAll('a[href^="#/"]').forEach(a => a.setAttribute('href', '#' + norm(a.getAttribute('href')))); }
new MutationObserver(fixLinks).observe(app, { childList: true, subtree: true });
applyTheme(); route(); chipTimer();
})();
