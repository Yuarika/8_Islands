(() => {
'use strict';
const R = window.IslandRules;

/* ================= 設定 ================= */
/* 投稿・リンクの設定は config.js にまとめています */
// config.js が読めなかった場合でも動くよう、初期値を用意しておく
const CFG = Object.assign({
  ANNOUNCEMENT_POST_URL: '', PUZZLE_URL: 'https://yuarika.github.io/8_Islands/',
  CHALLENGE_TEXT: 'WEB謎『8 Islands』に挑戦します！', CHALLENGE_TAGS: '#Web_8_Islands #謎解き',
  CLEAR_TEXT: 'Web謎「8 Islands」をクリアしました！', CLEAR_TAGS: '#Web_8_Islands',
  PROFILE_URL: 'https://yuarika.github.io/Yuarika_Profile/'
}, window.SITE_CONFIG || {});

/* 飛行: speed は速さの倍率、height は山なりの高さの倍率 */
const FLIGHT = { speed: 1.0, height: 1.0 };

/* 効果音: ファイルを置いて登録すると優先されます。無ければ内蔵の合成音が鳴ります。
   使えるキー: select reveal takeoff land step success toggle wrong vanish fall clear
   例: const SFX_FILES = { clear: 'sfx/clear.mp3' }; */
const SFX_FILES = {};
const SFX_VOL = 0.8;
/* 環境音(低い持続音): false で鳴らさない */
const AMBIENT = false;

/* ================= 状態と保存 ================= */
const $ = id => document.getElementById(id);
const KEY = 'eight-islands:web:v2:' + location.pathname.replace(/[^/]*$/, '');
let state = R.initial(), saveOK = true, soundOn = true;
try {
  state = R.restore(localStorage.getItem(KEY)) || state;
  soundOn = localStorage.getItem(KEY + ':sound') !== 'off';
} catch (e) { saveOK = false; }
let revealed = false;
try { revealed = localStorage.getItem(KEY + ':reveal') === '1'; } catch (e) {}
if (state.cleared || state.lights & 128) revealed = true;
function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); saveOK = true; } catch (e) { saveOK = false; } }

let busy = false;
const NAMES = ['上の島', '右上の島', '右下の島', '下の島', '左下の島', '左上の島', '中央の島', '離れた島', '上空'];
const reduced = matchMedia('(prefers-reduced-motion: reduce)');

/* ================= 効果音 ================= */
let ac = null, master = null, ambientOn = false;
function actx() {
  if (!ac) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    ac = new C(); master = ac.createGain(); master.gain.value = soundOn ? 1 : 0; master.connect(ac.destination);
  }
  if (ac.state === 'suspended') ac.resume();
  return ac;
}
function tone(f0, f1, d, type, vol, delay = 0) {
  const c = actx(); if (!c) return;
  const t = c.currentTime + delay, o = c.createOscillator(), n = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + d);
  n.gain.setValueAtTime(.0001, t); n.gain.exponentialRampToValueAtTime(vol, t + .015); n.gain.exponentialRampToValueAtTime(.0001, t + d);
  o.connect(n); n.connect(master); o.start(t); o.stop(t + d + .05);
}
function noise(d, vol, delay = 0, hz = 1200, hz2 = hz, type = 'lowpass') {
  const c = actx(); if (!c) return;
  const t = c.currentTime + delay, len = Math.ceil(c.sampleRate * d);
  const buf = c.createBuffer(1, len, c.sampleRate), a = buf.getChannelData(0);
  for (let i = 0; i < len; i++) a[i] = Math.random() * 2 - 1;
  const s = c.createBufferSource(), f = c.createBiquadFilter(), n = c.createGain();
  s.buffer = buf; f.type = type; f.Q.value = type === 'bandpass' ? 2 : .7;
  f.frequency.setValueAtTime(hz, t); f.frequency.exponentialRampToValueAtTime(hz2, t + d);
  n.gain.setValueAtTime(.0001, t); n.gain.exponentialRampToValueAtTime(vol, t + d * .3); n.gain.exponentialRampToValueAtTime(.0001, t + d);
  s.connect(f); f.connect(n); n.connect(master); s.start(t);
}
const SCALE = [392, 440, 523.25, 587.33, 659.25, 783.99, 880, 1046.5];
const synth = {
  select() { tone(1200, 1200, .05, 'sine', .04); },
  takeoff() { noise(.75, .09, 0, 300, 2400, 'bandpass'); tone(220, 440, .4, 'sine', .025); },
  land() { tone(150, 70, .18, 'sine', .12); noise(.12, .06, 0, 600); },
  step() { noise(.05, .03, .18, 900); noise(.05, .025, .42, 800); },
  success(n) {
    // 点灯数に応じて高く、重なりを増やす
    const k = Math.max(0, Math.min(7, n - 1));
    for (let v = 0; v <= Math.floor(k / 2); v++) tone(SCALE[Math.max(0, k - v * 2)], SCALE[Math.max(0, k - v * 2)], .9, 'sine', .05, v * .07);
    tone(SCALE[k] * 2, SCALE[k] * 2, .5, 'triangle', .015, .12);
  },
  toggle() { tone(659.25, 659.25, .25, 'sine', .04); tone(440, 440, .5, 'sine', .04, .12); },
  wrong() { tone(196, 98, .7, 'sawtooth', .025); tone(207, 103, .7, 'sawtooth', .02); noise(.5, .04, .05, 400); },
  vanish() { noise(.9, .08, 0, 4000, 300, 'bandpass'); tone(1400, 300, .8, 'sine', .02); },
  reveal() { noise(1.1, .07, 0, 200, 1800, 'bandpass'); tone(196, 196, 1.4, 'sine', .04); tone(293.66, 293.66, 1.4, 'sine', .03, .25); tone(440, 440, 1.2, 'triangle', .012, .5); },
  fall() { tone(520, 55, 1.6, 'sine', .05); noise(1.4, .05, .1, 800, 120); },
  clear() {
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => tone(f, f, 1.6 - i * .1, 'sine', .055, i * .13));
    [1046.5, 1568, 2093].forEach((f, i) => tone(f, f, 1.2, 'triangle', .012, .7 + i * .09));
  }
};
const aud = {};
Object.keys(SFX_FILES).forEach(k => {
  const a = new Audio(SFX_FILES[k]); a.preload = 'auto';
  a.addEventListener('canplaythrough', () => { a._ok = 1; });
  aud[k] = a;
});
function sfx(k, arg) {
  if (!soundOn) return;
  try {
    const a = aud[k];
    if (a && a._ok) { const c = a.cloneNode(); c.volume = SFX_VOL; c.play().catch(() => {}); return; }
    synth[k](arg);
  } catch (e) { /* 音が出なくても進行する */ }
}
function startAmbient() {
  if (!AMBIENT || ambientOn || !soundOn) return;
  const c = actx(); if (!c) return;
  ambientOn = true;
  const f = c.createBiquadFilter(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
  f.type = 'lowpass'; f.frequency.value = 380; g.gain.value = .022;
  lfo.frequency.value = .07; lg.gain.value = .01; lfo.connect(lg); lg.connect(g.gain); lfo.start();
  [55, 82.6, 110.3].forEach(hz => { const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = hz; o.connect(f); o.start(); });
  f.connect(g); g.connect(master);
}
function duck(level, sec) {
  if (!ac || !master) return;
  const t = ac.currentTime; master.gain.cancelScheduledValues(t);
  master.gain.setValueAtTime(master.gain.value, t); master.gain.linearRampToValueAtTime(soundOn ? level : 0, t + sec);
}

/* ================= ボード ================= */
const orbs = [...document.querySelectorAll('.orb[data-island]')];
const digitsSvg = $('digits');
const SEGS = [];
(function buildDigits() {
  // 現在のStage(2桁) → 次のStage(2桁)
  let html = '';
  html += Seg.digit(6, 12, 62, 104, 13, 2.2, 'data-d="0"') + Seg.digit(86, 12, 62, 104, 13, 2.2, 'data-d="1"');
  html += '<polygon class="arrow" points="190,52 202,52 220,70 202,88 190,88 208,70"/>';
  html += '<g class="next">' + Seg.digit(246, 38, 46, 78, 10, 1.8, 'data-d="2"') + Seg.digit(306, 38, 46, 78, 10, 1.8, 'data-d="3"') + '</g>';
  digitsSvg.innerHTML = html;
  digitsSvg.querySelectorAll('g[data-d]').forEach(gr => { SEGS[gr.dataset.d] = [...gr.querySelectorAll('.seg')]; });
})();
$('pips').innerHTML = '<i></i>'.repeat(8);

function countLights(l) { let c = 0; for (let i = 0; i < 8; i++) if (l & 1 << i) c++; return c; }
function setMessage(t) { $('message').textContent = t; }
let toastTimer = 0;
function toast(text, kind = '') {
  const el = $('toast'); el.textContent = text; el.className = 'toast show ' + kind;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.className = 'toast ' + kind; }, 2000);
}
const isTutorial = () => state.stage === '1' && !state.cleared && !state.fallen;
function renderBoard() {
  const atLimit = BigInt(state.stage) >= R.MAX_STAGE && !state.cleared;
  const cur = R.display(state.stage), nxt = atLimit ? { left: 64, right: 64, text: '−−' } : R.display((BigInt(state.stage) + 1n).toString());
  [cur.left, cur.right, nxt.left, nxt.right].forEach((mask, d) => SEGS[d].forEach((el, i) => el.classList.toggle('on', !!(mask & 1 << i))));
  digitsSvg.querySelector('.next').style.visibility = atLimit ? 'hidden' : '';   // 99のときはNEXTを表示しない
  digitsSvg.setAttribute('aria-label', atLimit ? 'Stage ' + cur.text : 'Stage ' + cur.text + ' から ' + nxt.text);
  const tut = isTutorial();
  orbs.forEach(b => {
    const i = Number(b.dataset.island), on = !!(state.lights & 1 << i);
    b.classList.toggle('lit', on);
    b.classList.toggle('hint', tut && i === 2 && !on);
    b.classList.toggle('here', state.island === i && !state.fallen);
    b.setAttribute('aria-pressed', String(on));
    b.disabled = busy || state.fallen;
  });
  const n = countLights(state.lights);
  $('count').textContent = n;
  [...$('pips').children].forEach((el, i) => el.classList.toggle('on', i < n));
  $('tutorial').hidden = !tut;
  $('limit-note').hidden = !atLimit;
  document.body.classList.toggle('is-clear', state.cleared);
  $('clear-tools').hidden = !state.cleared; $('clear-badge').hidden = !state.cleared;
  $('sound').setAttribute('aria-pressed', String(soundOn)); $('sound-label').textContent = soundOn ? 'ON' : 'OFF';
}

/* ================= 情景(canvas) ================= */
const cv = $('cv'), g = cv.getContext('2d');
const ISL = [[900, 170], [1085, 318], [1085, 582], [900, 730], [715, 582], [715, 318], [900, 450], [330, 452]];
const SKY = [900, 40];
const scaleOf = i => i === 7 ? .8 : .72 + (ISL[i][1] - 170) / 560 * .36;
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const ROCKS = ISL.map((_, i) => {
  const r = rng(i * 97 + 13), pts = [];
  for (let k = 0; k <= 16; k++) {
    const u = -1 + k / 8, base = 8 + 125 * Math.pow(1 - Math.abs(u), 1.15);
    pts.push([88 * u * (1 - .12 * (1 - Math.abs(u))) + (r() - .5) * 8, Math.max(4, base * (.72 + .4 * r()) + (r() - .5) * 16)]);
  }
  const pebbles = [0, 1, 2].map(() => ({ x: (r() - .5) * 170, y: 60 + r() * 90, s: 5 + r() * 9, p: r() * 6 }));
  return { pts, pebbles };
});
const DUST = Array.from({ length: 70 }, (_, i) => { const r = rng(500 + i); return { x: r() * 2000 - 200, y: r() * 1100 - 100, s: .6 + r() * 1.8, v: 4 + r() * 12, p: r() * 6 }; });
/* 表示枠: 最初は7島だけ。〇を選ぶと左へ広がり、8つ目の島が見える */
const FRAME7 = [575, 1225], FRAME8 = [210, 1225], FRAME_Y = [60, 830];

const light = ISL.map((_, i) => (state.lights & 1 << i) ? 1 : 0);
const vis = ISL.map(() => 1);
let flicker = 0, dim = state.fallen ? .7 : 0, clearGlow = state.cleared ? 1 : 0, clearFlash = 0;
let frameT = revealed ? 1 : 0, revealFlash = 0;
const particles = [];
let traveler = { x: SKY[0], y: SKY[1], a: state.fallen || state.island === 8 ? 0 : 1, trail: [] };
let viewTop = -200;
let flight = null;
let W = 0, H = 0, DPR = 1;

function resize() {
  const r = cv.getBoundingClientRect();
  DPR = Math.min(2, window.devicePixelRatio || 1);
  W = Math.max(1, r.width); H = Math.max(1, r.height);
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
}
new ResizeObserver(resize).observe(cv);
resize();
function camera() {
  const e = frameT * frameT * (3 - 2 * frameT);
  const x0 = FRAME7[0] + (FRAME8[0] - FRAME7[0]) * e, x1 = FRAME7[1] + (FRAME8[1] - FRAME7[1]) * e;
  const fh = FRAME_Y[1] - FRAME_Y[0];
  const K = Math.min(W / (x1 - x0 + 30), H / fh);
  return { K, OX: W / 2 - (x0 + x1) / 2 * K, OY: H / 2 - (FRAME_Y[0] + fh / 2) * K, x0, x1 };
}

const bobOf = (i, t) => Math.sin(t * .8 + i * 1.7) * 5;
function standPoint(i, t) {
  if (i === 8) return [SKY[0], SKY[1] + Math.sin(t * 1.6) * 6];
  const s = scaleOf(i); return [ISL[i][0], ISL[i][1] + bobOf(i, t) - 20 * s];
}

function burst(x, y, n, colors, spread = 1, up = 0) {
  for (let k = 0; k < n; k++) {
    const a = Math.random() * Math.PI * 2, v = (40 + Math.random() * 160) * spread;
    particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v * .5 - up * Math.random(), life: 0, max: .7 + Math.random() * .9, s: 1.5 + Math.random() * 3, c: colors[k % colors.length] });
  }
}

function drawIsland(i, t) {
  const [x, y0] = ISL[i], s = scaleOf(i), y = y0 + bobOf(i, t);
  const a = vis[i] * (i === 7 ? frameT : 1);
  if (a <= .01) return;
  const L = light[i] * (1 - flicker * (Math.sin(t * 60) > 0 ? 1 : .2));
  const faint = i === 7 ? .5 + .5 * Math.max(L, clearGlow) : 1;
  g.save(); g.translate(x, y); g.scale(s, s); g.globalAlpha = a * faint;
  ROCKS[i].pebbles.forEach(pb => {
    g.fillStyle = '#121d2c';
    g.beginPath(); g.ellipse(pb.x, pb.y + Math.sin(t * .9 + pb.p) * 6, pb.s, pb.s * .7, 0, 0, Math.PI * 2); g.fill();
  });
  const rg = g.createLinearGradient(0, 0, 0, 150);
  rg.addColorStop(0, '#2a3c55'); rg.addColorStop(.35, '#131e2e'); rg.addColorStop(1, 'rgba(6,10,18,.2)');
  g.fillStyle = rg; g.beginPath(); g.moveTo(-88, 0);
  ROCKS[i].pts.forEach(([px, py]) => g.lineTo(px, py)); g.lineTo(88, 0); g.closePath(); g.fill();
  if (L > .01) {
    g.globalAlpha = a * faint * L * .5;
    const lg = g.createLinearGradient(0, 0, 0, 70); lg.addColorStop(0, 'rgba(127,232,255,.55)'); lg.addColorStop(1, 'rgba(127,232,255,0)');
    g.fillStyle = lg; g.fill();
    g.globalAlpha = a * faint;
  }
  const tg = g.createLinearGradient(0, -26, 0, 26);
  tg.addColorStop(0, i === 7 ? '#1c2838' : '#2a3e58'); tg.addColorStop(1, '#121c2b');
  g.fillStyle = tg; g.beginPath(); g.ellipse(0, 0, 90, 26, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = i === 7 ? 'rgba(110,150,190,.25)' : 'rgba(130,180,230,.42)'; g.lineWidth = 1.6; g.stroke();
  g.strokeStyle = 'rgba(255,255,255,.05)'; g.beginPath(); g.ellipse(0, -2, 70, 17, 0, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
  if (L > .01) {
    g.globalAlpha = a * L;
    g.shadowColor = '#7fe8ff'; g.shadowBlur = 40;
    const lg = g.createRadialGradient(-14, -6, 4, 0, 0, 92);
    lg.addColorStop(0, '#effeff'); lg.addColorStop(.45, '#8eecff'); lg.addColorStop(1, '#2aa3c9');
    g.fillStyle = lg; g.beginPath(); g.ellipse(0, 0, 90, 26, 0, 0, Math.PI * 2); g.fill();
    g.shadowBlur = 0; g.strokeStyle = '#e3fdff'; g.lineWidth = 2; g.stroke();
    g.globalCompositeOperation = 'lighter';
    const halo = g.createRadialGradient(0, 0, 10, 0, 0, 170);
    halo.addColorStop(0, 'rgba(127,232,255,.28)'); halo.addColorStop(1, 'rgba(127,232,255,0)');
    g.fillStyle = halo; g.beginPath(); g.ellipse(0, -10, 170, 80, 0, 0, Math.PI * 2); g.fill();
    g.globalCompositeOperation = 'source-over';
  }
  // チュートリアル: Stage 1 の間は右下を青く
  if (isTutorial() && i === 2 && !busy && L < .5) {
    const p = .55 + .45 * Math.sin(t * 3.2);
    g.globalAlpha = a * .85;
    g.fillStyle = `rgba(63,123,255,${.35 + .25 * p})`; g.beginPath(); g.ellipse(0, 0, 90, 26, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = `rgba(150,185,255,${.5 + .5 * p})`; g.lineWidth = 2.5; g.beginPath(); g.ellipse(0, 0, 100 + p * 14, 30 + p * 4, 0, 0, Math.PI * 2); g.stroke();
  }
  g.restore();
}

function drawTraveler(t) {
  const { x, y, a } = traveler;
  traveler.trail.forEach((p, k) => {
    const f = (k + 1) / traveler.trail.length;
    g.globalAlpha = a * f * .35; g.fillStyle = '#bff6ff';
    g.beginPath(); g.arc(p[0], p[1], 2 + f * 4, 0, Math.PI * 2); g.fill();
  });
  if (a <= .01) { g.globalAlpha = 1; return; }
  g.globalAlpha = a;
  g.globalCompositeOperation = 'lighter';
  const pulse = 1 + .08 * Math.sin(t * 4);
  const hg = g.createRadialGradient(x, y, 0, x, y, 46 * pulse);
  hg.addColorStop(0, 'rgba(220,250,255,.75)'); hg.addColorStop(.3, 'rgba(127,232,255,.28)'); hg.addColorStop(1, 'rgba(127,232,255,0)');
  g.fillStyle = hg; g.beginPath(); g.arc(x, y, 46 * pulse, 0, Math.PI * 2); g.fill();
  g.globalCompositeOperation = 'source-over';
  g.fillStyle = '#ffffff'; g.beginPath(); g.arc(x, y, 7, 0, Math.PI * 2); g.fill();
  g.globalAlpha = 1;
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  const t = now / 1000;
  // ---- 更新 ----
  for (let i = 0; i < 8; i++) {
    const target = (state.lights & 1 << i) ? 1 : 0;
    light[i] += (target - light[i]) * Math.min(1, dt * 6);
  }
  flicker = Math.max(0, flicker - dt * 1.6);
  clearGlow += ((state.cleared ? 1 : 0) - clearGlow) * Math.min(1, dt * 1.5);
  clearFlash = Math.max(0, clearFlash - dt * .8);
  revealFlash = Math.max(0, revealFlash - dt * .9);
  frameT += ((revealed ? 1 : 0) > frameT ? 1 : -1) * Math.min(Math.abs((revealed ? 1 : 0) - frameT), dt * (reduced.matches ? 10 : 1));
  if (!flight) {
    const [sx, sy] = standPoint(state.island, t);
    traveler.x = sx; traveler.y = sy - 6 + Math.sin(t * 2.4) * 3;
    if (state.island === 8) traveler.a = Math.max(0, traveler.a - dt * 3);   // 上空では見えない
    else if (!state.fallen && traveler.a < 1) traveler.a = Math.min(1, traveler.a + dt * 1.5);
    if (traveler.trail.length) traveler.trail.shift();
  } else stepFlight(now, dt, t);
  for (let k = particles.length - 1; k >= 0; k--) {
    const p = particles[k]; p.life += dt;
    if (p.life > p.max) { particles.splice(k, 1); continue; }
    p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 60 * dt; p.vx *= .985;
  }
  // ---- 描画 ----
  const { K, OX, OY, x0: fx0, x1: fx1 } = camera();
  g.setTransform(DPR, 0, 0, DPR, 0, 0);
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#060c17'); bg.addColorStop(.5, '#08111f'); bg.addColorStop(1, '#030610');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  g.setTransform(DPR * K, 0, 0, DPR * K, DPR * OX, DPR * OY);
  const vx0 = -OX / K, vy0 = -OY / K, vx1 = (W - OX) / K, vy1 = (H - OY) / K;
  viewTop = vy0;

  [[300, 120, .9], [1300, 140, 1.3], [700, 860, .7], [1500, 840, 1.1]].forEach(([fx, fy, sp], k) => {
    const xx = fx + Math.sin(t * .05 * sp + k) * 160, fr = g.createRadialGradient(xx, fy, 0, xx, fy, 520);
    fr.addColorStop(0, 'rgba(40,70,120,.16)'); fr.addColorStop(1, 'rgba(40,70,120,0)');
    g.fillStyle = fr; g.fillRect(xx - 520, fy - 520, 1040, 1040);
  });
  // 上から照らす青い光の筋(数字用の7島)
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 7; i++) {
    const [x, y0] = ISL[i], s = scaleOf(i), y = y0 + bobOf(i, t);
    const f = (.8 + .2 * Math.sin(t * 1.1 + i * 2)) * (1 + clearGlow * .6);
    const bm = g.createLinearGradient(0, vy0, 0, y);
    bm.addColorStop(0, 'rgba(70,120,255,0)'); bm.addColorStop(1, `rgba(${70 + 50 * clearGlow | 0},${130 + 90 * clearGlow | 0},255,${.17 * f})`);
    g.fillStyle = bm; g.beginPath();
    g.moveTo(x - 24 * s, vy0); g.lineTo(x + 24 * s, vy0); g.lineTo(x + 92 * s, y); g.lineTo(x - 92 * s, y); g.closePath(); g.fill();
  }
  if (clearGlow > .01) {
    const [x, y0] = ISL[7], y = y0 + bobOf(7, t), bm = g.createLinearGradient(0, vy0, 0, y);
    bm.addColorStop(0, 'rgba(127,232,255,0)'); bm.addColorStop(1, `rgba(127,232,255,${.16 * clearGlow})`);
    g.fillStyle = bm; g.beginPath(); g.moveTo(x - 20, vy0); g.lineTo(x + 20, vy0); g.lineTo(x + 75, y); g.lineTo(x - 75, y); g.closePath(); g.fill();
  }
  DUST.forEach(d => {
    const yy = ((d.y - t * d.v) % 1100 + 1100) % 1100 - 100;
    g.globalAlpha = .25 + .25 * Math.sin(t * 1.3 + d.p);
    g.fillStyle = '#9fd8ff'; g.beginPath(); g.arc(d.x + Math.sin(t * .3 + d.p) * 12, yy, d.s, 0, Math.PI * 2); g.fill();
  });
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  [0, 5, 1, 6, 7, 4, 2, 3].forEach(i => drawIsland(i, t));
  drawTraveler(t);
  g.globalCompositeOperation = 'lighter';
  particles.forEach(p => { g.globalAlpha = Math.max(0, 1 - p.life / p.max); g.fillStyle = p.c; g.beginPath(); g.arc(p.x, p.y, p.s, 0, Math.PI * 2); g.fill(); });
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  const ft = g.createLinearGradient(0, vy0, 0, 120);
  ft.addColorStop(0, 'rgba(10,20,36,.9)'); ft.addColorStop(1, 'rgba(10,20,36,0)');
  g.fillStyle = ft; g.fillRect(vx0, vy0, vx1 - vx0, 120 - vy0);
  const fb = g.createLinearGradient(0, 760, 0, vy1);
  fb.addColorStop(0, 'rgba(8,22,44,0)'); fb.addColorStop(.6, 'rgba(10,28,56,.75)'); fb.addColorStop(1, 'rgba(8,20,40,.98)');
  g.fillStyle = fb; g.fillRect(vx0, 760, vx1 - vx0, vy1 - 760);
  // 表示枠の外側を闇で覆う
  g.setTransform(DPR, 0, 0, DPR, 0, 0);
  const sx0 = Math.max(0, OX + fx0 * K), sx1 = Math.min(W, OX + fx1 * K);
  g.fillStyle = '#02050b'; g.fillRect(0, 0, sx0, H); g.fillRect(sx1, 0, W - sx1, H);
  [sx0, sx1].forEach(sx => {
    if (sx <= 1 || sx >= W - 1) return;
    const eg = g.createLinearGradient(0, 0, 0, H);
    eg.addColorStop(0, 'rgba(127,232,255,0)'); eg.addColorStop(.5, `rgba(127,232,255,${.25 + revealFlash * .6})`); eg.addColorStop(1, 'rgba(127,232,255,0)');
    g.fillStyle = eg; g.fillRect(sx - 1, 0, 2, H);
  });
  const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .35, W / 2, H / 2, Math.max(W, H) * .75);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.55)');
  g.fillStyle = vg; g.fillRect(0, 0, W, H);
  if (dim > .005) { g.fillStyle = `rgba(1,3,8,${dim})`; g.fillRect(0, 0, W, H); }
  if (clearFlash > .005) { g.fillStyle = `rgba(200,250,255,${clearFlash * .35})`; g.fillRect(0, 0, W, H); }
  requestAnimationFrame(frame);
}

/* ================= 飛行 ================= */
/* 上空からは降ってくる。島からは山なりに飛ぶ */
function fly(to, falling) {
  return new Promise(resolve => {
    const t = performance.now() / 1000;
    const drop = state.island === 8, end = standPoint(to, t);
    // 上空からは、選んだ島の真上から落ちてくる
    const from = drop ? [end[0], Math.min(-80, viewTop - 60)] : [traveler.x, traveler.y];
    if (drop) { traveler.x = from[0]; traveler.y = from[1]; traveler.a = 1; traveler.trail.length = 0; }
    const dist = Math.hypot(end[0] - from[0], end[1] - from[1]);
    const dur = reduced.matches ? 200 : (drop ? 300 + dist * .3 : 300 + dist * .42) / FLIGHT.speed;
    const h = reduced.matches || drop ? 0 : (50 + dist * .18) * FLIGHT.height;
    flight = { from, to, start: performance.now(), dur, h, drop, falling, resolve, phase: 'move', vanished: false };
  });
}
function pathAt(f, u, end) {
  if (f.drop) return [end[0], f.from[1] + (end[1] - f.from[1]) * u * u];
  return [f.from[0] + (end[0] - f.from[0]) * u, f.from[1] + (end[1] - f.from[1]) * u - f.h * 4 * u * (1 - u)];
}
function stepFlight(now, dt, t) {
  const f = flight;
  traveler.trail.push([traveler.x, traveler.y]); if (traveler.trail.length > 14) traveler.trail.shift();
  if (f.phase === 'move') {
    const u = Math.min(1, (now - f.start) / f.dur);
    const end = standPoint(f.to, t);
    [traveler.x, traveler.y] = pathAt(f, u, end);
    if (f.falling) {
      vis[f.to] = 1 - Math.min(1, Math.max(0, (u - .25) / .55));
      dim = Math.max(dim, Math.max(0, u - .5) * .5);
      if (u > .72 && !f.vanished) {
        f.vanished = true; sfx('vanish'); duck(.35, 1);
        const [x, y] = ISL[f.to]; burst(x, y + 10, 70, ['#6f8fb8', '#3c5576', '#9fd8ff'], 1.2, 40);
      }
    }
    if (u >= 1) {
      if (!f.falling) { flight = null; traveler.trail.length = 0; f.resolve(); return; }
      // 接線方向の速度を引き継いで落下
      f.phase = 'fall'; f.fallStart = now;
      const k = 1000 / f.dur;
      if (f.drop) { f.vx = 0; f.vy = 2 * (end[1] - f.from[1]) * k; }
      else { f.vx = (end[0] - f.from[0]) * k; f.vy = ((end[1] - f.from[1]) + 4 * f.h) * k; }
      vis[f.to] = 0; sfx('fall');
    }
  } else {
    f.vy += 1500 * dt; traveler.x += f.vx * dt; traveler.y += f.vy * dt;
    const el = (now - f.fallStart) / 1000;
    traveler.a = Math.max(0, 1 - el / 1);
    dim = Math.min(.72, dim + dt * .55);
    if (el > (reduced.matches ? .3 : 1.15)) { flight = null; traveler.trail.length = 0; f.resolve(); }
  }
}

/* ================= 操作 ================= */
const wait = ms => new Promise(r => setTimeout(r, ms));
function overlayOpen() { return !!document.querySelector('.overlay:not([hidden])'); }
function openOverlay(id) { $(id).hidden = false; const b = $(id).querySelector('button'); if (b) b.focus({ preventScroll: true }); }
function closeOverlay(el) { el.hidden = true; }
function setRevealed(v) { revealed = v; try { localStorage.setItem(KEY + ':reveal', v ? '1' : '0'); } catch (e) {} }

async function select(index) {
  if (busy || overlayOpen()) return;
  startAmbient();
  const r = R.move(state, index);           // 選択時点の状態で1回だけ判定
  if (r.outcome === 'blocked') return;
  if (r.outcome === 'limit') {               // Stage 99 より先へは進めない
    sfx('wrong'); toast('100以上には進めない', 'bad');
    setMessage('Stage 100 以上には進めない。');
    openOverlay('limit');
    return;
  }
  busy = true; sfx('select');
  $('board').classList.add('away'); renderBoard();
  if (index === 7 && !revealed) {
    // 〇を選ぶと表示枠が広がり、離れた島が姿を現す
    setRevealed(true); revealFlash = 1; sfx('reveal');
    await wait(reduced.matches ? 150 : 1150);
  }
  setTimeout(() => sfx('takeoff'), 40);
  await fly(index, r.outcome === 'fall');
  state = r.state; save();
  if (r.outcome === 'fall') {
    busy = false; renderBoard(); setMessage('');
    openOverlay('abyss');
    return;
  }
  sfx('land'); sfx('step');
  busy = false;
  const [x, y] = ISL[index];
  if (r.outcome === 'success' || r.outcome === 'clear') {
    sfx('success', countLights(state.lights));
    burst(x, y - 5, 36, ['#bff6ff', '#7fe8ff', '#ffffff'], .9, 120);
    toast('光が灯った', 'good');
    setMessage('正しい島に着地した。島に光が灯った。');
  } else if (r.outcome === 'toggle') {
    sfx('toggle'); toast('光が消えた');
    setMessage('正しい島に着地した。この島の光が消えた。');
  } else if (r.outcome === 'wrong') {
    sfx('wrong'); flicker = 1; toast('光がすべて消えた', 'bad');
    setMessage('正しくない島に着地した。灯っていた光はすべて消えた。');
  } else if (r.outcome === 'free') {
    setMessage('どの島へも自由に移動できる。');
  }
  $('board').classList.remove('away'); renderBoard();
  if (r.outcome === 'clear') celebrate();
  else orbs[index].focus({ preventScroll: true });
}

function celebrate() {
  busy = true; renderBoard();
  setTimeout(() => { sfx('clear'); clearFlash = 1; ISL.forEach(([x, y]) => burst(x, y, 24, ['#e8feff', '#7fe8ff'], .8, 160)); }, 500);
  setTimeout(() => { busy = false; renderBoard(); setMessage('8つの島に光を灯した！'); openOverlay('clear'); }, 2100);
}

function restart(previous) {
  state = R.restart(state, previous); save();
  closeOverlay($('abyss')); closeOverlay($('limit'));
  vis.fill(1);
  traveler.a = 0; traveler.trail.length = 0; dim = 0; duck(1, .6);
  $('board').classList.remove('away');
  renderBoard();
  setMessage('ボードの丸を選んでください');
  orbs[2].focus({ preventScroll: true });
}

orbs.forEach(b => b.addEventListener('click', () => select(Number(b.dataset.island))));
$('retry-one').addEventListener('click', () => restart(false));
$('retry-prev').addEventListener('click', () => restart(true));
document.querySelectorAll('[data-restart]').forEach(b => b.addEventListener('click', () => {
  if (busy) return;
  sfx('select'); restart(b.dataset.restart === 'prev');
}));
$('show-clear').addEventListener('click', () => { if (!busy) openOverlay('clear'); });
$('help').addEventListener('click', () => { sfx('select'); openOverlay('howto'); });
$('reset').addEventListener('click', () => { if (!busy) { sfx('select'); openOverlay('reset-dialog'); } });
$('confirm-reset').addEventListener('click', () => {
  state = R.initial(); save(); setRevealed(false); closeOverlay($('reset-dialog'));
  vis.fill(1); traveler.a = 0; dim = 0; duck(1, .3);
  $('board').classList.remove('away'); renderBoard();
  setMessage('ボードの丸を選んでください');
});
document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => { sfx('select'); closeOverlay(b.closest('.overlay')); }));
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  const o = document.querySelector('.overlay:not([hidden]):not(.abyss)'); if (o) closeOverlay(o);
});
$('sound').addEventListener('click', () => {
  soundOn = !soundOn;
  try { localStorage.setItem(KEY + ':sound', soundOn ? 'on' : 'off'); } catch (e) {}
  actx(); duck(soundOn ? (state.fallen ? .35 : 1) : 0, .2);
  if (soundOn) { startAmbient(); sfx('select'); }
  renderBoard();
});
document.addEventListener('pointerdown', startAmbient, { once: true });

/* ================= クリア画面 ================= */
$('clear-tag').textContent = CFG.CLEAR_TAGS;
$('profile').href = CFG.PROFILE_URL;
$('x-post').addEventListener('click', () => {
  sfx('select');
  const text = CFG.CLEAR_TEXT + '\n\n' +
    (CFG.ANNOUNCEMENT_POST_URL ? CFG.ANNOUNCEMENT_POST_URL + '\n\n' : '') +
    CFG.PUZZLE_URL + '\n\n' + CFG.CLEAR_TAGS;
  window.open('https://x.com/intent/post?text=' + encodeURIComponent(text), '_blank', 'noopener,noreferrer');
});

/* ================= 開始 ================= */
renderBoard();
if (state.fallen) { $('board').classList.add('away'); openOverlay('abyss'); }
else if (state.cleared) setMessage('クリア済み。どの島へも自由に移動できる。');
else setMessage('ボードの丸を選んでください');
if (!saveOK) setMessage('この環境では進行を保存できません。ページを閉じると進行が失われます。');
requestAnimationFrame(frame);
})();
