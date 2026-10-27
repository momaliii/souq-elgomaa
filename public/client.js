// سوق الجمعة — الكلاينت
const $ = (id) => document.getElementById(id);
const show = (id) => { document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active')); $(id).classList.add('active'); };
const COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#e67e22', '#1abc9c', '#ff6b9d', '#ecf0f1', '#8d6e63'];
const HAT_ICONS = { tarboosh: '🎩', cap: '🧢', scarf: '🧕', bald: '👨‍🦲', shawl: '👳' };

let ws, you, hostId, quick = [];
let MAP, CFG, role, special = null, mates = [], fakeTarget = 8, night = false, camsOpen = false, office = false;
let state = null, prevPos = new Map(), curPos = new Map(), lastStateAt = 0;
let meetingOpen = false, lobbyPlayers = [];

// ---------- الصوت (متولّد بالكود، من غير ملفات) ----------
const Sound = (() => {
  let ac = null, muted = false;
  try { muted = localStorage.getItem('souq-mute') === '1'; } catch {}
  const ctx = () => (ac ||= new (window.AudioContext || window.webkitAudioContext)());
  function tone(freq, dur, { type = 'sine', vol = 0.15, slide = 0, delay = 0 } = {}) {
    if (muted) return;
    const a = ctx(), t = a.currentTime + delay;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur);
  }
  const FX = {
    coin: () => { tone(1320, 0.08, { type: 'square', vol: 0.06 }); tone(1760, 0.15, { type: 'square', vol: 0.06, delay: 0.07 }); },
    print: () => { for (let i = 0; i < 4; i++) tone(180 + i * 20, 0.05, { type: 'sawtooth', vol: 0.05, delay: i * 0.06 }); },
    plant: () => tone(500, 0.2, { slide: -300, vol: 0.08 }),
    clean: () => tone(880, 0.15, { vol: 0.08 }),
    alert: () => { tone(440, 0.15, { type: 'square', vol: 0.08 }); tone(330, 0.25, { type: 'square', vol: 0.08, delay: 0.15 }); },
    alarm: () => { for (let i = 0; i < 3; i++) { tone(700, 0.18, { type: 'sawtooth', vol: 0.07, delay: i * 0.4 }); tone(500, 0.18, { type: 'sawtooth', vol: 0.07, delay: i * 0.4 + 0.2 }); } },
    fixed: () => { tone(523, 0.1, { vol: 0.1 }); tone(784, 0.2, { vol: 0.1, delay: 0.1 }); },
    bell: () => { tone(988, 0.8, { type: 'triangle', vol: 0.2 }); tone(1318, 0.8, { type: 'triangle', vol: 0.12, delay: 0.25 }); },
    vote: () => tone(660, 0.1, { type: 'triangle', vol: 0.1 }),
    eject: () => tone(400, 0.9, { slide: -340, type: 'sawtooth', vol: 0.08 }),
    skip: () => tone(500, 0.2, { type: 'triangle', vol: 0.08 }),
    hit: () => { tone(90, 0.25, { type: 'square', vol: 0.15, slide: -40 }); tone(60, 0.4, { type: 'sine', vol: 0.2, delay: 0.02 }); },
    report: () => { for (let i = 0; i < 4; i++) tone(i % 2 ? 660 : 880, 0.12, { type: 'square', vol: 0.08, delay: i * 0.13 }); },
    steal: () => { tone(900, 0.05, { type: 'square', vol: 0.05 }); tone(1300, 0.08, { type: 'square', vol: 0.05, delay: 0.06 }); },
    start: () => [392, 523, 659].forEach((f, i) => tone(f, 0.2, { type: 'triangle', vol: 0.12, delay: i * 0.12 })),
    win: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.25, { type: 'triangle', vol: 0.12, delay: i * 0.13 })),
    lose: () => [392, 349, 311, 262].forEach((f, i) => tone(f, 0.3, { type: 'triangle', vol: 0.12, delay: i * 0.18 })),
    click: () => tone(1000, 0.03, { type: 'square', vol: 0.03 }),
    pop: () => tone(700, 0.08, { slide: 400, vol: 0.06 }),
    flap: () => { for (let i = 0; i < 5; i++) tone(200 + Math.random() * 100, 0.04, { type: 'triangle', vol: 0.03, delay: i * 0.05 }); },
    shutter: () => { for (let i = 0; i < 6; i++) tone(120 + Math.random() * 60, 0.05, { type: 'sawtooth', vol: 0.06, delay: i * 0.05 }); },
  };
  return {
    play: (k) => { try { FX[k] && FX[k](); } catch {} },
    toggle() { muted = !muted; try { localStorage.setItem('souq-mute', muted ? '1' : '0'); } catch {} return muted; },
    get muted() { return muted; },
  };
})();
const setMuteIcon = () => ($('mute').textContent = Sound.muted ? '🔇' : '🔊');
setMuteIcon();
$('mute').onclick = () => { Sound.toggle(); setMuteIcon(); };

// ---------- اتصال ----------
let session = (() => { try { return JSON.parse(sessionStorage.getItem('souq-session')) || null; } catch { return null; } })();
let retries = 0;
function connect(first) {
  ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host);
  ws.onopen = () => { retries = 0; ws.send(JSON.stringify(first)); };
  ws.onmessage = (e) => handle(JSON.parse(e.data));
  ws.onclose = () => {
    if (!you || !session) return;
    // بنحاول نرجع لوحدنا لو النت فصل
    if (retries++ < 8) { toast('الاتصال اتقطع.. بنحاول نرجّعك', 'warn'); setTimeout(() => connect({ t: 'rejoin', ...session }), 1500); }
    else toast('مش قادرين نوصل للسيرفر.. اعمل ريفرش', 'warn');
  };
}
// لو عملت ريفرش وانت في غرفة، ارجع لها على طول
if (session) connect({ t: 'rejoin', ...session });
const sendMsg = (m) => ws && ws.readyState === 1 && ws.send(JSON.stringify(m));

function handle(m) {
  switch (m.t) {
    case 'error': ($('lobby').classList.contains('active') ? $('lobbyErr') : $('homeErr')).textContent = m.text; if (!you) ws.close(); break;
    case 'joined':
      you = m.you; quick = m.quick; renderQuick(); history.replaceState(null, '', '?room=' + m.code);
      session = { code: m.code, token: m.token };
      try { sessionStorage.setItem('souq-session', JSON.stringify(session)); } catch {}
      break;
    case 'rejoinFail': session = null; you = null; try { sessionStorage.removeItem('souq-session'); } catch {} ws.close(); break;
    case 'haggle': openHaggle(m); break;
    case 'lobby': onLobby(m); break;
    case 'start': onStart(m); break;
    case 's': onState(m); break;
    case 'toast': toast(m.text, m.kind); break;
    case 'fx':
      Sound.play(m.kind);
      if (m.kind === 'alert' || m.kind === 'alarm') shake();
      if (m.kind === 'coin') { floatText('💰', '#f0b429'); coinBurst(); }
      if (m.kind === 'print') floatText('+1 🖨️', '#e5533d');
      if (m.kind === 'plant') floatText('🤫', '#fff');
      break;
    case 'meeting':
      meetingOpen = true; $('meeting').classList.remove('hidden'); $('mChat').innerHTML = '';
      if (m.report) { Sound.play('report'); flash('#ffd166'); }
      break;
    case 'knocked': flash('#e5533d'); shake(); break;
    case 'camsOn': camsOpen = true; $('camBar').classList.remove('hidden'); $('camBar').querySelector('span').textContent = m.remote ? `📹 بتتفرج من الجهاز (${m.until} ثانية)` : '📹 قاعد على الكاميرات'; keys.clear(); joy = { x: 0, y: 0 }; pushInput(); Sound.play('click'); break;
    case 'camsOff': camsOpen = false; $('camBar').classList.add('hidden'); break;
    case 'hideState': renderHide(m.hidden); break;
    case 'puff': puffAt(m.x, m.y); { const h = (MAP.hides || []).find((x) => x.x === m.x && x.y === m.y); if (h) shaking.set(h.id, performance.now() + 500); } Sound.play('plant'); break;
    case 'mstate': onMeeting(m); break;
    case 'resume': meetingOpen = false; $('meeting').classList.add('hidden'); prevPos.clear(); curPos.clear(); cam.init = false; break;
    case 'end': onEnd(m); break;
    case 'emote': bubbles.set(m.id, { e: m.e, at: performance.now() }); Sound.play('pop'); break;
  }
}
function shake() { const g = $('game'); g.classList.remove('shake'); void g.offsetWidth; g.classList.add('shake'); }

// ---------- الرئيسية ----------
$('name').value = (() => { try { return localStorage.getItem('souq-name') || ''; } catch { return ''; } })();
const urlRoom = new URLSearchParams(location.search).get('room');
if (urlRoom) $('code').value = urlRoom.toUpperCase();
const myName = () => { const n = $('name').value.trim() || 'تاجر'; try { localStorage.setItem('souq-name', n); } catch {} return n; };
$('btnCreate').onclick = () => connect({ t: 'create', name: myName(), public: $('pubRoom').checked });
function joinCode(code) {
  code = code.trim().toUpperCase();
  if (code.length !== 4) return ($('homeErr').textContent = 'الكود 4 حروف');
  connect({ t: 'join', code, name: myName() });
}
$('btnJoin').onclick = () => joinCode($('code').value);
$('code').addEventListener('keydown', (e) => { if (e.key === 'Enter') joinCode($('code').value); });

async function loadRooms() {
  if (!$('home').classList.contains('active')) return;
  try {
    const list = await (await fetch('/api/rooms')).json();
    $('roomList').innerHTML = '';
    if (!list.length) $('roomList').innerHTML = '<li class="empty">مفيش غرف مفتوحة دلوقتي.. اعمل واحدة!</li>';
    for (const r of list) {
      const li = document.createElement('li');
      li.innerHTML = `<b dir="ltr"></b><span></span><span class="wins"></span>`;
      li.children[0].textContent = r.code;
      li.children[1].textContent = 'غرفة ' + r.host;
      li.children[2].textContent = `${r.n}/10`;
      li.onclick = () => joinCode(r.code);
      $('roomList').appendChild(li);
    }
  } catch {}
}
$('refreshRooms').onclick = loadRooms;
loadRooms();
setInterval(loadRooms, 5000);

// ---------- اللوبي ----------
$('btnBot').onclick = () => sendMsg({ t: 'addbot' });
$('btnStart').onclick = () => sendMsg({ t: 'start' });
$('btnAgain').onclick = () => sendMsg({ t: 'again' });
$('copyCode').onclick = async () => {
  const link = location.origin + '/?room=' + $('roomCode').textContent;
  try { await navigator.clipboard.writeText(link); $('copyCode').textContent = 'اتنسخ ✓'; } catch { prompt('انسخ اللينك:', link); }
  setTimeout(() => ($('copyCode').textContent = 'نسخ اللينك'), 1500);
};
const pushSettings = () => sendMsg({
  t: 'settings', settings: {
    fakers: $('sFakers').value, fakeTarget: $('sTarget').value, listSize: $('sList').value,
    reveal: $('sReveal').checked, public: $('sPublic').checked, specials: $('sSpecials').checked, thief: $('sThief').checked, map: $('sMap').value, mode: $('sMode').value,
  },
});
['sFakers', 'sTarget', 'sList', 'sReveal', 'sPublic', 'sSpecials', 'sThief', 'sMap', 'sMode'].forEach((id) => $(id).addEventListener('change', pushSettings));

function onLobby(m) {
  hostId = m.hostId;
  lobbyPlayers = m.players;
  $('end').classList.add('hidden');
  $('meeting').classList.add('hidden');
  show('lobby');
  $('roomCode').textContent = m.code;
  $('lobbyErr').textContent = '';
  const isHost = you === hostId;
  $('hostCtrls').classList.toggle('hidden', !isHost);
  $('waitHost').classList.toggle('hidden', isHost);
  $('settings').classList.toggle('locked', !isHost);
  $('sFakers').value = m.settings.fakers; $('sTarget').value = m.settings.fakeTarget; $('sList').value = m.settings.listSize;
  $('sReveal').checked = m.settings.reveal; $('sPublic').checked = m.public; $('sSpecials').checked = m.settings.specials; $('sThief').checked = m.settings.thief; $('sMap').value = m.settings.map; $('sMode').value = m.settings.mode || 'classic'; $('sMap').disabled = m.settings.mode === 'office';
  $('settings').classList.toggle('office-mode', m.settings.mode === 'office');
  $('listLbl').textContent = m.settings.mode === 'office' ? 'عدد المهام' : 'حاجات الليستة';
  $('lobbyList').innerHTML = '';
  for (const p of m.players) {
    const li = document.createElement('li');
    li.innerHTML = `<span class="dot" style="background:${p.color}"></span><span></span><span class="wins"></span>`;
    li.children[1].textContent = `${p.name}` + (p.bot ? ' 🤖' : '') + (p.id === hostId ? ' 👑' : '') + (p.id === you ? ' (انت)' : '');
    li.children[2].textContent = p.wins ? `🏆 ${p.wins}` : '';
    li.children[0].replaceWith(avatar(p.color, p.hat, p.id, 30));
    if (isHost && p.bot) {
      const b = document.createElement('button'); b.className = 'x mini'; b.textContent = '✕';
      b.onclick = () => sendMsg({ t: 'kick', id: p.id }); li.appendChild(b);
    }
    $('lobbyList').appendChild(li);
  }
  renderLook();
  $('btnStart').disabled = m.players.length < 4;
  $('btnStart').textContent = m.players.length < 4 ? `محتاجين ${4 - m.players.length} كمان` : 'ابدأ السوق';
  $('btnBot').disabled = m.players.length >= 10;
}

function renderLook() {
  const me = lobbyPlayers.find((p) => p.id === you);
  if (!me) return;
  $('hatPick').innerHTML = '';
  for (const [h, icon] of Object.entries(HAT_ICONS)) {
    const b = document.createElement('button'); b.textContent = icon; b.className = me.hat === h ? 'sel' : '';
    b.onclick = () => sendMsg({ t: 'look', hat: h }); $('hatPick').appendChild(b);
  }
  $('colorPick').innerHTML = '';
  const taken = new Set(lobbyPlayers.filter((p) => p.id !== you).map((p) => p.color));
  for (const c of COLORS) {
    const b = document.createElement('button'); b.style.background = c;
    b.className = (me.color === c ? 'sel' : '') + (taken.has(c) ? ' taken' : '');
    b.disabled = taken.has(c);
    b.onclick = () => sendMsg({ t: 'look', color: c }); $('colorPick').appendChild(b);
  }
}

// ---------- بداية الدور ----------
function onStart(m) {
  MAP = m.map; CFG = m.cfg; role = m.role; special = m.special; mates = m.mates; fakeTarget = m.fakeTarget; night = !!m.night; office = !!m.office;
  if (m.quick) { quick = m.quick; renderQuick(); }
  document.body.classList.toggle('office', office);
  $('progLbl').textContent = office ? 'مهام الموظفين' : 'مشتريات التجار';
  $('listTitle').textContent = office ? '📋 مهامك' : '📋 ليستتك';
  state = null; prevPos.clear(); curPos.clear(); particles.length = 0; floats.length = 0; coinFx.length = 0; bubbles.clear();
  // ليلة السوق بتبدأ والدنيا ليل أصلاً
  roundStart = Date.now() - ((m.elapsed || 0) + (m.night ? 230 : 0)) * 1000; cam.init = false; groundCache = null; initPigeons();
  Ambient.start(MAP.theme);
  $('end').classList.add('hidden');
  show('game');
  resize();
  document.querySelectorAll('.faker').forEach((b) => b.classList.toggle('hidden', role !== 'faker'));
  $('aSearch').classList.toggle('hidden', special !== 'police');
  $('aSteal').classList.toggle('hidden', role !== 'thief');
  $('aCams').classList.toggle('hidden', special !== 'guard');
  camsOpen = false; $('camBar').classList.add('hidden'); renderHide(null); seenBodies.clear();
  const isF = role === 'faker', isT = role === 'thief';
  const SP = { police: ['👮', 'انت أمين الشرطة', 'تاجر وكمان تقدر تفتّش جيب لاعب واحد بس في الدور (T) وتعرف معاه كام ورقة مضروبة. اختار صح!'],
    guard: ['🧑‍✈️', 'انت الأمن', 'تاجر وكمان معاك جهاز الكاميرات: تقدر تفتحه من أي مكان (X) لمدة 12 ثانية. لو شفت حد بيضرب على الكاميرا هتعرفه!'],
    watcher: ['🪙', 'انت الشحات', 'تاجر عينه في وسط راسه.. لو حد دسّ ورق أو قفل بسطة قريب منك هتشوفه. اتلم على الزحمة!'] };
  const sp = isT ? ['🦹', 'انت الحرامي', `مش مع التجار ولا مع المزوّر.. انشل من جيوب الناس (G) واجمع ${m.thiefGoal} جنيه حقيقي وتهرب وتكسب لوحدك. خلي بالك: الورق المضروب ملوش لازمة!`] : SP[special];
  $('roleTag').textContent = isF ? '🖨️ انت المزوّر' : sp ? `${sp[0]} ${sp[1]}` : '🧺 انت تاجر';
  $('roleTag').className = role;
  $('roleIcon').textContent = isF ? '🖨️' : sp ? sp[0] : '🧺';
  $('roleBig').textContent = isF ? 'انت المزوّر' : sp ? sp[1] : 'انت تاجر';
  $('roleBig').style.color = isF ? 'var(--red)' : isT ? '#b388ff' : 'var(--gold)';
  if (office) {
    // الشركة: موظفين وقاتل، مفيش فلوس
    $('roleTag').textContent = isF ? '🔪 انت القاتل' : sp ? `${sp[0]} ${sp[1]}` : '💼 انت موظف';
    $('roleIcon').textContent = isF ? '🔪' : sp ? sp[0] : '💼';
    $('roleBig').textContent = isF ? 'انت القاتل' : sp ? sp[1] : 'انت موظف';
    $('roleDesc').textContent = isF
      ? `اضرب الموظفين (K) من غير ما حد يشوفك، استخبى في الدواليب والممرات السرية (V)، اقطع النور (B) وعطّل الأجهزة (C). اعمل نفسك شغال!${mates.length ? ' شريكك: ' + mates.join('، ') : ''}`
      : `خلّص مهامك في الشركة، ولو لقيت حد مرمي بلّغ (R). اعرف مين القاتل قبل ما يخلّص عليكم.` + (special === 'guard' ? ' · وانت الأمن: تقدر تفتح الكاميرات من أي مكان (X).' : ' · 📹 غرفة الكاميرات فوق.');
    if (m.rejoin) { toast('🔌 رجعت للشركة', 'info'); return; }
    $('roleCard').classList.remove('hidden');
    setTimeout(() => $('roleCard').classList.add('hidden'), 4500);
    return;
  }
  $('roleDesc').textContent = isF
    ? `اطبع ورق مضروب وادفع بيه، دسّه في جيوب التجار، واقطع الكهربا واقفل البسط. غرّق السوق بـ ${fakeTarget} ورقات قبل ما يكشفوك.${mates.length ? ' شريكك: ' + mates.join('، ') : ''}`
    : sp ? sp[2] : `اشتري حاجات ليستتك، واكشف أدراج البسط، واعرف مين المزوّر من بين ${m.nFake > 1 ? m.nFake + ' مزوّرين' : 'التجار'}.`;
  if (night) $('roleDesc').textContent += isF ? ' · 💥 تقدر تضرب أي تاجر لوحده (K)، وتستخبى في المخابئ السرية (V) وتطلع من مكان تاني.' : ' · 💥 المزوّر بيضرب! لو لقيت حد مرمي بلّغ (R).';
  if (MAP.cams && !isF) $('roleDesc').textContent += ' · 📹 روح غرفة الكاميرات عشان تتفرج على الشركة.';
  if (m.hasThief && !isT) $('roleDesc').textContent += ' · وخلي بالك على جيبك: فيه حرامي في السوق 🦹';
  if (m.rejoin) { toast('🔌 رجعت للسوق', 'info'); return; }
  $('roleCard').classList.remove('hidden');
  setTimeout(() => $('roleCard').classList.add('hidden'), 4500);
}

// ---------- الحالة ----------
function onState(m) {
  state = m;
  prevPos = curPos; curPos = new Map();
  for (const p of m.ps) curPos.set(p.id, p);
  lastStateAt = performance.now();
  const me = m.me;
  $('circBar').style.width = Math.min(100, (m.circ / m.target) * 100) + '%';
  $('circTxt').textContent = `${m.circ}/${m.target}`;
  $('progBar').style.width = Math.round(m.prog * 100) + '%';
  $('progTxt').textContent = Math.round(m.prog * 100) + '%';
  $('coins').textContent = me.coins;
  $('fakes').textContent = me.fakes !== undefined ? `(${me.fakes} مضروب)` : me.loot !== undefined ? `· 🦹 سرقت ${me.loot}/${CFG.thiefGoal}` : '';
  $('shopList').innerHTML = me.list.map((i) => {
    const s = MAP.stalls[i];
    return `<li class="${me.bought.includes(i) ? 'done' : ''}">${s.icon} ${office ? s.task : s.item}</li>`;
  }).join('');
  $('meetLeft').textContent = me.alive ? (me.meetings > 0 ? '📣 معاك نداء واحد' : '📣 استخدمت النداء') : '';
  $('ghostTag').classList.toggle('hidden', me.alive);
  $('inspBar').classList.toggle('hidden', !me.insp);
  if (me.insp) {
    $('inspFill').style.width = (1 - me.insp / (me.inspT || CFG.inspectTime)) * 100 + '%';
    $('inspBar').querySelector('span').textContent = me.task ? (role === 'faker' ? '😏 بتعمل نفسك شغال…' : '💼 بتشتغل… متتحركش') : '🔦 بتكشف على الدرج…';
  }
  $('blackoutBanner').classList.toggle('hidden', !m.bo);
  if (m.bo) $('boLeft').textContent = Math.ceil(m.bo) + ' ثانية';
  updateButtons(me);
}

function distToRect(px, py, r) {
  const dx = Math.max(r.x - px, 0, px - (r.x + r.w));
  const dy = Math.max(r.y - py, 0, py - (r.y + r.h));
  return Math.hypot(dx, dy);
}
function nearestStall(p) {
  let best = null, bd = CFG.reach;
  for (const s of MAP.stalls) { const d = distToRect(p.x, p.y, s); if (d < bd) { bd = d; best = s; } }
  return best;
}
function nearWhat(p) {
  if (!p || !MAP) return null;
  if (MAP.camRoom && distToRect(p.x, p.y, MAP.camRoom) < CFG.reach) return { k: 'cam' };
  if (distToRect(p.x, p.y, MAP.power) < CFG.reach) return { k: 'power' };
  if (distToRect(p.x, p.y, MAP.boss) < CFG.reach) return { k: 'boss' };
  if (distToRect(p.x, p.y, MAP.changer) < CFG.reach) return { k: 'changer' };
  const s = nearestStall(p);
  return s ? { k: 'stall', s } : null;
}
function setCd(btn, n) {
  let c = btn.querySelector('.cd');
  if (n > 0) { if (!c) { c = document.createElement('span'); c.className = 'cd'; btn.appendChild(c); } c.textContent = n; }
  else if (c) c.remove();
}
function updateButtons(me) {
  const p = curPos.get(you);
  const w = nearWhat(p);
  const k = w && w.k;
  let useOn = !!w, label = 'استخدام', hint = '';
  if (k === 'power') { label = 'صلّح'; useOn = !!state.bo && me.alive; hint = state.bo ? 'دوس E عشان ترجّع الكهربا' : office ? 'لوحة الكهربا' : 'موتور الكهربا'; }
  else if (k === 'boss') { label = 'نداء'; useOn = me.alive && me.meetings > 0 && !state.bo; hint = useOn ? 'دوس E عشان تنادي اجتماع' : ''; }
  else if (k === 'changer' && office) { useOn = false; hint = '🔐 الخزنة مقفولة'; }
  else if (k === 'changer') { label = 'صرّاف'; hint = me.cd.changer ? `الصرّاف فاضي بعد ${me.cd.changer} ثانية` : 'دوس E والصرّاف يكشف محفظتك'; useOn = !me.cd.changer; }
  else if (k === 'stall') {
    const s = w.s, inList = me.list.includes(s.id), got = me.bought.includes(s.id);
    label = office ? 'اشتغل' : 'اشتري';
    if ((state.cl || []).includes(s.id)) { useOn = false; hint = office ? `⚠️ ال${s.item} عطلان` : `🔒 بسطة ${s.item} مقفولة`; }
    else if (office) {
      if (role === 'faker') hint = `${s.icon} ${s.task} · E اعمل نفسك شغال`;
      else if (!inList) { useOn = false; hint = `${s.icon} "${s.task}" مش من مهامك`; }
      else if (got) { useOn = false; hint = `✅ خلّصت "${s.task}"`; }
      else hint = `${s.icon} E · ${s.task} (${CFG.taskTime} ثواني)`;
    }
    else
    if (role === 'faker') hint = `${s.icon} ${s.item} · E اشتري · I اكشف`;
    else if (!inList) { useOn = false; hint = `${s.icon} ${s.item} مش في ليستتك` + (me.alive ? ' · I اكشف الدرج' : ''); }
    else if (got) { useOn = false; hint = `${s.icon} اشتريته خلاص` + (me.alive ? ' · I اكشف الدرج' : ''); }
    else hint = `${s.icon} ${s.item} · E اشتري بـ ${CFG.price} جنيه` + (me.alive ? ' · I اكشف' : '');
  }
  $('aUse').classList.toggle('on', useOn);
  $('aUse').querySelector('small').textContent = label;
  $('hint').classList.toggle('hidden', !hint);
  $('hint').textContent = hint;
  $('aInspect').classList.toggle('hidden', !me.alive || office);
  $('aInspect').classList.toggle('on', k === 'stall' && !me.cd.inspect);
  setCd($('aInspect'), me.cd.inspect);
  if (role === 'thief') {
    setCd($('aSteal'), me.cd.steal);
    const close = state.ps.some((q) => q.id !== you && q.a && p && Math.hypot(q.x - p.x, q.y - p.y) < CFG.stealReach);
    $('aSteal').classList.toggle('on', close && !me.cd.steal);
    $('aSteal').classList.toggle('hidden', !me.alive);
  }
  if (special === 'police') {
    $('aSearch').classList.toggle('hidden', !me.alive || !me.search);
    const close = state.ps.some((q) => q.id !== you && q.a && p && Math.hypot(q.x - p.x, q.y - p.y) < CFG.searchReach);
    $('aSearch').classList.toggle('on', close);
  }
  // زرار الضرب للمزوّر بس في ليلة السوق، وبيتحسب كل مرة عشان ميفضلش ظاهر من دور قديم
  $('aKill').classList.toggle('hidden', !night || role !== 'faker' || !me.alive);
  if (role === 'faker') {
    setCd($('aPrint'), me.cd.print); $('aPrint').classList.toggle('on', !me.cd.print);
    setCd($('aPlant'), me.cd.plant); $('aPlant').classList.toggle('on', !me.cd.plant && me.fakes > 0);
    setCd($('aBlackout'), state.bo ? 0 : me.cd.blackout); $('aBlackout').classList.toggle('on', !me.cd.blackout && !state.bo);
    setCd($('aClose'), me.cd.close); $('aClose').classList.toggle('on', !me.cd.close && k === 'stall');
    document.querySelectorAll('.faker').forEach((b) => b.classList.toggle('hidden', !me.alive));
    if (night) {
      setCd($('aKill'), me.cd.kill);
      const prey = state.ps.some((q) => q.id !== you && q.a && !mates.includes(q.n) && p && Math.hypot(q.x - p.x, q.y - p.y) < CFG.killReach);
      $('aKill').classList.toggle('on', prey && !me.cd.kill);
    }
  }
  if (special === 'guard') { setCd($('aCams'), me.cd.cams); $('aCams').classList.toggle('on', !me.cd.cams); $('aCams').classList.toggle('hidden', !me.alive); }
  // زرار الاستخباية للمزوّر جنب مخبأ
  const nh = night && role === 'faker' && me.alive && p && (MAP.hides || []).find((h) => Math.hypot(h.x - p.x, h.y - p.y) < CFG.hideReach);
  $('aHide').classList.toggle('hidden', !nh || me.hidden != null);
  $('aHide').classList.toggle('on', !!nh);
  if (nh && me.hidden == null && !hint) { $('hint').classList.remove('hidden'); $('hint').textContent = `🚪 ${nh.name} · دوس V عشان تستخبى`; }
  if (k === 'cam') { $('hint').classList.remove('hidden'); $('hint').textContent = '📺 دوس E عشان تتفرج على الكاميرات'; }
  // زرار البلاغ بيظهر بس لما تكون جنب حد مرمي
  const body = night && me.alive && p && (state.bodies || []).find((b) => Math.hypot(b.x - p.x, b.y - p.y) < CFG.reportReach);
  $('aReport').classList.toggle('hidden', !body);
  $('aReport').classList.toggle('on', !!body);
  if (body) { $('hint').classList.remove('hidden'); $('hint').textContent = `📢 ${body.n} مرمي هنا! دوس R عشان تبلّغ`; }
}

// ---------- التحكم ----------
const keys = new Set();
let joy = { x: 0, y: 0 }, lastIn = '';
function pushInput() {
  let x = joy.x, y = joy.y;
  if (keys.has('a') || keys.has('arrowleft')) x -= 1;
  if (keys.has('d') || keys.has('arrowright')) x += 1;
  if (keys.has('w') || keys.has('arrowup')) y -= 1;
  if (keys.has('s') || keys.has('arrowdown')) y += 1;
  const k = x.toFixed(2) + ',' + y.toFixed(2);
  if (k !== lastIn) { lastIn = k; sendMsg({ t: 'in', x, y }); }
}
const EMOTES = { 1: '👋', 2: '😂', 3: '🤔', 4: '😠', 5: '👀' };
const ACTION_KEYS = { e: 'use', ' ': 'use', i: 'inspect', q: 'print', f: 'plant', b: 'blackout', c: 'close', t: 'search', g: 'steal', k: 'kill', r: 'report', v: 'hide', x: 'cams' };
// كمان نقبل الحروف العربي لو الكيبورد عربي
const AR = { 'ث': 'e', 'ه': 'i', 'ض': 'q', 'ب': 'f', 'لا': 'b', 'ؤ': 'c', 'ف': 't', 'ل': 'g', 'ن': 'k', 'ق': 'r', 'ر': 'v', 'ء': 'x', 'ص': 'w', 'ش': 'a', 'س': 's', 'ي': 'd', 'ة': 'm' };
addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
  const k = AR[e.key] || e.key.toLowerCase();
  if (k === 'm') { Sound.toggle(); setMuteIcon(); return; }
  if (!$('game').classList.contains('active') || meetingOpen) return;
  if (haggleOpen) { if (k === 'e' || k === ' ') { e.preventDefault(); haggleHit(); } return; }
  // وانت قاعد على الكاميرات: أي زرار استخدام/خروج بيقفلها
  if (camsOpen) { if (['e', ' ', 'x', 'escape'].includes(k)) { e.preventDefault(); sendMsg({ t: 'cams', on: false }); } return; }
  if (state && state.me.hidden != null) { if (['v', 'e', ' '].includes(k)) sendMsg({ t: 'hide' }); const n = Number(k); if (n >= 1 && n <= 3) { const h = MAP.hides[state.me.hidden]; if (h.link[n - 1] != null) sendMsg({ t: 'tunnel', to: h.link[n - 1] }); } return; }
  if (k === 'x') { sendMsg({ t: 'cams', on: true }); return; }
  if (ACTION_KEYS[k] && !e.repeat) { e.preventDefault(); sendMsg({ t: ACTION_KEYS[k] }); return; }
  if (EMOTES[k] && !e.repeat) { sendMsg({ t: 'emote', e: EMOTES[k] }); return; }
  keys.add(k); pushInput();
  if (k.startsWith('arrow')) e.preventDefault();
});
addEventListener('keyup', (e) => { keys.delete(AR[e.key] || e.key.toLowerCase()); pushInput(); });
addEventListener('blur', () => { keys.clear(); pushInput(); });
$('aUse').onclick = () => sendMsg({ t: 'use' });
$('aInspect').onclick = () => sendMsg({ t: 'inspect' });
$('aPrint').onclick = () => sendMsg({ t: 'print' });
$('aPlant').onclick = () => sendMsg({ t: 'plant' });
$('aBlackout').onclick = () => sendMsg({ t: 'blackout' });
$('aClose').onclick = () => sendMsg({ t: 'close' });
$('aSearch').onclick = () => sendMsg({ t: 'search' });
$('aSteal').onclick = () => sendMsg({ t: 'steal' });
$('aKill').onclick = () => sendMsg({ t: 'kill' });
$('aCams').onclick = () => sendMsg({ t: 'cams', on: true });
$('aHide').onclick = () => sendMsg({ t: 'hide' });
$('camBar').querySelector('button').onclick = () => sendMsg({ t: 'cams', on: false });
// لوحة المخبأ: تتنقل في الممرات السرية أو تطلع
function renderHide(id) {
  const box = $('hidePanel');
  if (id == null || !MAP || !MAP.hides) { box.classList.add('hidden'); return; }
  const h = MAP.hides[id];
  box.classList.remove('hidden');
  box.innerHTML = '<b></b><div class="hlinks"></div>';
  box.firstChild.textContent = `🚪 انت مستخبي في ${h.name}`;
  h.link.forEach((to, i) => {
    const b = document.createElement('button'); b.textContent = `${i + 1} ↪ ${MAP.hides[to].name}`;
    b.onclick = () => sendMsg({ t: 'tunnel', to }); box.lastChild.appendChild(b);
  });
  const out = document.createElement('button'); out.className = 'primary'; out.textContent = 'V · اطلع';
  out.onclick = () => sendMsg({ t: 'hide' }); box.lastChild.appendChild(out);
}
$('aReport').onclick = () => sendMsg({ t: 'report' });
for (const [k, e] of Object.entries(EMOTES)) {
  const b = document.createElement('button'); b.textContent = e; b.title = `حرف ${k}`;
  b.onclick = () => sendMsg({ t: 'emote', e }); $('emotes').appendChild(b);
}
document.addEventListener('click', (e) => { if (e.target.closest('button')) Sound.play('click'); });

// جويستيك الموبايل
if ('ontouchstart' in window) document.body.classList.add('touch');
(() => {
  const base = $('joy'), knob = $('knob');
  let tid = null;
  const move = (t) => {
    const r = base.getBoundingClientRect();
    let dx = t.clientX - (r.left + r.width / 2), dy = t.clientY - (r.top + r.height / 2);
    const d = Math.hypot(dx, dy), max = r.width / 2;
    if (d > max) { dx = dx / d * max; dy = dy / d * max; }
    knob.style.transform = `translate(${dx}px,${dy}px)`;
    joy = { x: dx / max, y: dy / max };
    pushInput();
  };
  base.addEventListener('touchstart', (e) => { tid = e.changedTouches[0].identifier; move(e.changedTouches[0]); e.preventDefault(); });
  base.addEventListener('touchmove', (e) => { for (const t of e.changedTouches) if (t.identifier === tid) move(t); e.preventDefault(); });
  const end = (e) => { for (const t of e.changedTouches) if (t.identifier === tid) { tid = null; joy = { x: 0, y: 0 }; knob.style.transform = ''; pushInput(); } };
  base.addEventListener('touchend', end); base.addEventListener('touchcancel', end);
})();

// ---------- الرسم ----------
const cv = $('cv'), mainCtx = cv.getContext('2d');
let ctx = mainCtx;
const mini = $('mini'), mctx = mini.getContext('2d');
let W, H, DPR;
function resize() {
  DPR = devicePixelRatio || 1; W = innerWidth; H = innerHeight; cv.width = W * DPR; cv.height = H * DPR;
  mini.width = mini.clientWidth * DPR; mini.height = mini.clientHeight * DPR;
}
addEventListener('resize', resize);

function lerpPos(id) {
  const c = curPos.get(id), p = prevPos.get(id);
  if (!p) return c;
  const k = Math.min(1, (performance.now() - lastStateAt) / 50);
  return { ...c, x: p.x + (c.x - p.x) * k, y: p.y + (c.y - p.y) * k };
}
function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
function label(text, x, y, size = 15) {
  ctx.font = `700 ${size}px Cairo, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = 4; ctx.strokeStyle = '#000a'; ctx.strokeText(text, x, y);
  ctx.fillStyle = '#fff'; ctx.fillText(text, x, y);
}
function emoji(e, x, y, size) { ctx.font = `${size}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(e, x, y); }

// تراب وأرقام طايرة في الجو
const particles = [];
const floats = [];
function spawnDust(x, y) { particles.push({ x, y: y + 14, vx: (Math.random() - 0.5) * 20, vy: -10 - Math.random() * 10, life: 0.5, kind: 'dust' }); }
function spawnSparks(x, y) { for (let i = 0; i < 2; i++) particles.push({ x, y, vx: (Math.random() - 0.5) * 160, vy: -60 - Math.random() * 80, life: 0.6, kind: 'spark' }); }
function floatText(text, color = '#fff') { const p = curPos.get(you); if (p) floats.push({ x: p.x, y: p.y - 40, text, color, life: 1.4 }); }

// قطط السوق.. ديكور بس
const cats = Array.from({ length: 4 }, (_, i) => ({ x: 300 + i * 400, y: 300 + (i % 2) * 500, tx: 0, ty: 0, wait: 0, f: 1 }));
function moveCats(dt) {
  for (const c of cats) {
    if (c.wait > 0) { c.wait -= dt; continue; }
    if (!c.tx || Math.hypot(c.tx - c.x, c.ty - c.y) < 5) {
      c.tx = 100 + Math.random() * (MAP.w - 200); c.ty = 260 + Math.random() * (MAP.h - 520); c.wait = 1 + Math.random() * 4; continue;
    }
    const dx = c.tx - c.x, dy = c.ty - c.y, d = Math.hypot(dx, dy);
    c.x += (dx / d) * 45 * dt; c.y += (dy / d) * 45 * dt; c.f = dx > 0 ? 1 : -1;
  }
}

const SKINS = ['#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffdbac'];

// أرضية السوق مرسومة مرة واحدة
let groundCache = null;
function buildGround() {
  const g = document.createElement('canvas'); g.width = MAP.w; g.height = MAP.h;
  const c = g.getContext('2d');
  if (MAP.theme === 'office') {
    c.fillStyle = '#2a2830'; c.fillRect(0, 0, MAP.w, MAP.h);
    for (const r of MAP.rooms) {
      c.fillStyle = r.floor; c.fillRect(r.x, r.y, r.w, r.h);
      // موكيت أو بلاط
      const tile = r.name === 'الطرقة' || r.name === 'البوفيه' ? 40 : 0;
      if (tile) for (let y = r.y; y < r.y + r.h; y += tile) for (let x = r.x; x < r.x + r.w; x += tile) { c.fillStyle = ((x / tile + y / tile) % 2) ? '#ffffff10' : '#0000000d'; c.fillRect(x, y, tile, tile); }
      else for (let i = 0; i < 300; i++) { c.fillStyle = `rgba(255,255,255,${Math.random() * 0.04})`; c.fillRect(r.x + Math.random() * r.w, r.y + Math.random() * r.h, 2, 2); }
      c.font = '900 30px Cairo, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#ffffff14';
      c.fillText(r.name, r.x + r.w / 2, r.y + r.h / 2);
    }
    // سجادة أوضة الاجتماعات
    const b = MAP.boss; c.fillStyle = '#7a2633'; c.fillRect(b.x - 40, b.y - 30, b.w + 80, b.h + 60);
    c.fillStyle = '#4a4552'; c.fillRect(0, 0, MAP.w, 14); c.fillRect(0, MAP.h - 14, MAP.w, 14); c.fillRect(0, 0, 14, MAP.h); c.fillRect(MAP.w - 14, 0, 14, MAP.h);
    groundCache = g; return;
  }
  const sea = MAP.theme === 'sea';
  c.fillStyle = sea ? '#8fa3a8' : '#cfa96f'; c.fillRect(0, 0, MAP.w, MAP.h);
  // بلاط حجر (في سوق السمك رمادي ومبلول)
  for (let y = 0; y < MAP.h; y += 40) for (let x = (y / 40) % 2 ? -20 : 0; x < MAP.w; x += 40) {
    const v = 200 + Math.floor(Math.random() * 25);
    c.fillStyle = sea ? `rgb(${v - 60},${v - 40},${v - 35})` : `rgb(${v + 10},${v - 25},${v - 85})`;
    c.beginPath(); c.roundRect(x + 2, y + 2, 36, 36, 6); c.fill();
  }
  if (sea) for (let i = 0; i < 60; i++) { // بُرك مية
    c.fillStyle = `rgba(120,170,200,${0.15 + Math.random() * 0.2})`;
    c.beginPath(); c.ellipse(Math.random() * MAP.w, 200 + Math.random() * (MAP.h - 200), 10 + Math.random() * 30, 5 + Math.random() * 12, Math.random() * 3, 0, 7); c.fill();
  }
  // ممشى متاكل في نص السوق
  const path = (y, h) => { const gr = c.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#0000'); gr.addColorStop(0.5, '#f3dcae55'); gr.addColorStop(1, '#0000'); c.fillStyle = gr; c.fillRect(0, y, MAP.w, h); };
  if (!sea) { path(200, 120); path(880, 120); path(520, 160); c.fillStyle = '#f3dcae33'; c.fillRect(840, 0, 120, MAP.h); }
  else { path(330, 120); path(880, 120); }
  // بلّاعة وخطوط مية
  c.strokeStyle = '#8a6a4255'; c.lineWidth = 3;
  for (let x = 30; x < MAP.w; x += 260) { c.beginPath(); c.moveTo(x, 600); c.bezierCurveTo(x + 40, 620, x + 80, 580, x + 120, 610); c.stroke(); }
  // أرضية القهوة (موزاييك)
  const cf = MAP.cafe;
  for (let y = cf.y; y < cf.y + cf.h; y += 25) for (let x = cf.x; x < cf.x + cf.w; x += 25) {
    c.fillStyle = ((x - cf.x) / 25 + (y - cf.y) / 25) % 2 ? (sea ? '#2c6e8a' : '#7b4f2c') : '#e8d5b0'; c.fillRect(x, y, 25, 25);
  }
  c.strokeStyle = '#4a2f18'; c.lineWidth = 6; c.strokeRect(cf.x, cf.y, cf.w, cf.h);
  // سجادة المعلم
  const b = MAP.boss;
  c.fillStyle = '#8e1f2a'; c.fillRect(b.x - 30, b.y - 25, b.w + 60, b.h + 60);
  c.strokeStyle = '#e0b84c'; c.lineWidth = 4; c.strokeRect(b.x - 22, b.y - 17, b.w + 44, b.h + 44);
  // بقع
  for (let i = 0; i < 200; i++) { c.fillStyle = `rgba(80,50,20,${Math.random() * 0.12})`; c.beginPath(); c.ellipse(Math.random() * MAP.w, Math.random() * MAP.h, 3 + Math.random() * 10, 2 + Math.random() * 5, Math.random() * 3, 0, 7); c.fill(); }
  // سور السوق
  // رصيف البحر
  if (MAP.water) { const w = MAP.water; c.fillStyle = '#5b4a3a'; c.fillRect(0, w.y + w.h - 4, MAP.w, 18); for (let x = 20; x < MAP.w; x += 120) { c.fillStyle = '#3b2f25'; c.beginPath(); c.arc(x, w.y + w.h + 6, 7, 0, 7); c.fill(); } }
  c.fillStyle = sea ? '#4a5a60' : '#6e4a2a';
  c.fillRect(0, 0, MAP.w, 14); c.fillRect(0, MAP.h - 14, MAP.w, 14); c.fillRect(0, 0, 14, MAP.h); c.fillRect(MAP.w - 14, 0, 14, MAP.h);
  groundCache = g;
}

// شخص كامل (جلابية + راس + طاقية) — بيستخدمه اللاعبين والبياعين
function drawPerson(x, y, color, hat, face, skin, t, moving, seed) {
  const swing = moving ? Math.sin(t * 12 + seed) * 4 : 0;
  // دراعات
  ctx.strokeStyle = skin; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x - 11, y - 2); ctx.lineTo(x - 15, y + 9 + swing); ctx.moveTo(x + 11, y - 2); ctx.lineTo(x + 15, y + 9 - swing); ctx.stroke();
  // الجلابية
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(x - 10, y - 6); ctx.lineTo(x + 10, y - 6); ctx.lineTo(x + 14, y + 16); ctx.quadraticCurveTo(x, y + 20, x - 14, y + 16); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#0005'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.strokeStyle = '#ffffff55'; ctx.beginPath(); ctx.moveTo(x, y - 5); ctx.lineTo(x, y + 6); ctx.stroke();
  // رجلين بتمشي
  ctx.fillStyle = '#3b2a1a';
  ctx.fillRect(x - 7 + swing * 0.6, y + 16, 5, 4); ctx.fillRect(x + 2 - swing * 0.6, y + 16, 5, 4);
  // الراس
  const hy = y - 14;
  ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(x, hy, 10, 0, 7); ctx.fill();
  ctx.strokeStyle = '#0004'; ctx.lineWidth = 1.5; ctx.stroke();
  // وش
  const ex = face * 2.5;
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x - 3.5 + ex, hy - 1, 2.8, 0, 7); ctx.arc(x + 3.5 + ex, hy - 1, 2.8, 0, 7); ctx.fill();
  ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(x - 3 + ex * 1.3, hy - 1, 1.5, 0, 7); ctx.arc(x + 4 + ex * 1.3, hy - 1, 1.5, 0, 7); ctx.fill();
  ctx.strokeStyle = '#5a2e1a'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(x + ex, hy + 3, 3, 0.2, Math.PI - 0.2); ctx.stroke();
  // الطاقية
  switch (hat) {
    case 'tarboosh': ctx.fillStyle = '#b03a2e'; ctx.beginPath(); ctx.moveTo(x - 8, hy - 6); ctx.lineTo(x - 6, hy - 17); ctx.lineTo(x + 6, hy - 17); ctx.lineTo(x + 8, hy - 6); ctx.fill(); ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, hy - 17); ctx.quadraticCurveTo(x + 6 * -face, hy - 14, x + 7 * -face, hy - 8); ctx.stroke(); break;
    case 'cap': ctx.fillStyle = '#2c3e50'; ctx.beginPath(); ctx.arc(x, hy - 4, 10, Math.PI, 0); ctx.fill(); ctx.fillRect(x + face * 3, hy - 5, face * 10, 3); break;
    case 'scarf': ctx.fillStyle = '#8e44ad'; ctx.beginPath(); ctx.arc(x, hy, 12.5, Math.PI * 0.85, Math.PI * 2.15); ctx.lineTo(x + 9, hy + 12); ctx.lineTo(x - 9, hy + 12); ctx.fill(); ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(x, hy + 1, 8, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x - 3 + ex, hy, 2.4, 0, 7); ctx.arc(x + 3 + ex, hy, 2.4, 0, 7); ctx.fill(); ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(x - 2.6 + ex * 1.3, hy, 1.3, 0, 7); ctx.arc(x + 3.4 + ex * 1.3, hy, 1.3, 0, 7); ctx.fill(); break;
    case 'shawl': ctx.fillStyle = '#f5f5f5'; ctx.beginPath(); ctx.ellipse(x, hy - 7, 12, 6, 0, Math.PI, 0); ctx.fill(); ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, hy - 7, 12, 6, 0, Math.PI, 0); ctx.stroke(); break;
    default: ctx.fillStyle = '#ffffff33'; ctx.beginPath(); ctx.arc(x - 3, hy - 6, 3, 0, 7); ctx.fill(); break;
  }
}

function drawStall(s, hl, want, closed, t) {
  const top = s.y < MAP.h / 2;
  const cx = s.x + s.w / 2;
  // ضل
  ctx.fillStyle = '#0003'; roundRect(s.x + 6, s.y + 8, s.w, s.h, 8); ctx.fill();
  // البياع ورا البسطة
  if (!closed) drawPerson(cx + Math.sin(t * 0.7 + s.id) * 20, top ? s.y + 6 : s.y + s.h + 2, '#d7c4a3', s.id % 3 ? 'tarboosh' : 'shawl', top ? 1 : -1, SKINS[s.id % SKINS.length], t, false, s.id);
  // الطاولة الخشب
  ctx.fillStyle = '#7a5230'; roundRect(s.x, s.y + 22, s.w, s.h - 22, 8); ctx.fill();
  ctx.strokeStyle = '#5c3b1e'; ctx.lineWidth = 1;
  for (let y = s.y + 34; y < s.y + s.h; y += 12) { ctx.beginPath(); ctx.moveTo(s.x + 4, y); ctx.lineTo(s.x + s.w - 4, y); ctx.stroke(); }
  // البضاعة كوم
  if (!closed) {
    const n = 5;
    for (let i = 0; i < n; i++) emoji(s.icon, s.x + 22 + i * ((s.w - 44) / (n - 1)), s.y + 72, 24);
    for (let i = 0; i < n - 1; i++) emoji(s.icon, s.x + 38 + i * ((s.w - 76) / (n - 2)), s.y + 58, 24);
    emoji(s.icon, cx, s.y + 45, 24);
  } else {
    // شيش خشب مقفول
    ctx.fillStyle = '#5a3b1f'; roundRect(s.x + 4, s.y + 26, s.w - 8, s.h - 30, 4); ctx.fill();
    ctx.strokeStyle = '#3a2410'; ctx.lineWidth = 2;
    for (let x = s.x + 14; x < s.x + s.w - 8; x += 14) { ctx.beginPath(); ctx.moveTo(x, s.y + 28); ctx.lineTo(x, s.y + s.h - 6); ctx.stroke(); }
    emoji('🔒', cx, s.y + 60 + Math.sin(t * 5) * 2, 30);
  }
  // التندة المقلّمة
  const stripes = 8, sw = s.w / stripes, sway = Math.sin(t * 1.5 + s.id) * 2;
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 ? '#f6ead8' : ['#c0392b', '#2d7d46', '#2266aa', '#d68910'][s.id % 4];
    ctx.beginPath(); ctx.moveTo(s.x + i * sw, s.y); ctx.lineTo(s.x + (i + 1) * sw, s.y);
    ctx.lineTo(s.x + (i + 1) * sw, s.y + 24); ctx.quadraticCurveTo(s.x + (i + 0.5) * sw, s.y + 36 + sway, s.x + i * sw, s.y + 24); ctx.fill();
  }
  ctx.strokeStyle = hl ? '#f0b429' : '#0005'; ctx.lineWidth = hl ? 4 : 2; roundRect(s.x, s.y, s.w, s.h, 8); ctx.stroke();
  // يافطة
  const ly = top ? s.y + s.h + 20 : s.y - 18;
  ctx.fillStyle = '#3b2a1a'; roundRect(cx - 42, ly - 12, 84, 24, 6); ctx.fill();
  ctx.font = '700 14px Cairo, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#f6ead8'; ctx.fillText(s.item, cx, ly + 1);
  if (want && !closed) { // علامة إن الحاجة دي في ليستتك
    const bx = s.x + s.w - 6, by = s.y - 10 + Math.sin(t * 4) * 3;
    ctx.fillStyle = '#f0b429'; ctx.beginPath(); ctx.arc(bx, by, 12, 0, 7); ctx.fill();
    ctx.strokeStyle = '#2a1a05'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#2a1a05'; ctx.font = '900 15px Cairo'; ctx.fillText('!', bx, by + 1);
  }
}
function drawBooth(r, icon, text, color, hl) {
  ctx.fillStyle = '#0003'; roundRect(r.x + 6, r.y + 8, r.w, r.h, 12); ctx.fill();
  ctx.fillStyle = color; roundRect(r.x, r.y, r.w, r.h, 12); ctx.fill();
  ctx.fillStyle = '#ffffff18'; roundRect(r.x + 6, r.y + 6, r.w - 12, 14, 6); ctx.fill();
  ctx.strokeStyle = hl ? '#f0b429' : '#0006'; ctx.lineWidth = hl ? 4 : 2; roundRect(r.x, r.y, r.w, r.h, 12); ctx.stroke();
  emoji(icon, r.x + r.w / 2, r.y + r.h / 2 - 2, 38);
  label(text, r.x + r.w / 2, r.y + r.h + 20);
}

// واحد مرمي على الأرض ونجوم بتلف فوق راسه
function drawBody(b, t) {
  ctx.save(); ctx.translate(b.x, b.y + 8); ctx.rotate(-Math.PI / 2);
  drawPerson(0, 0, b.c, b.h, 1, SKINS[b.id % SKINS.length], 0, false, b.id);
  ctx.restore();
  for (let i = 0; i < 3; i++) {
    const a = t * 3 + (i * Math.PI * 2) / 3;
    emoji('⭐', b.x - 22 + Math.cos(a) * 14, b.y - 4 + Math.sin(a) * 5, 11);
  }
  label(b.n, b.x, b.y - 26, 12);
}

function flash(color) {
  const d = document.createElement('div'); d.className = 'flash'; d.style.background = color;
  document.body.appendChild(d); setTimeout(() => d.remove(), 600);
}

function drawPlayer(p, isMe, t) {
  const bob = p.m ? Math.abs(Math.sin(t * 12 + p.id)) * 3 : Math.sin(t * 2 + p.id) * 0.6;
  const y = p.y - bob;
  ctx.globalAlpha = p.a ? 1 : 0.45;
  ctx.fillStyle = '#0004'; ctx.beginPath(); ctx.ellipse(p.x, p.y + 19, 13 - bob, 4.5, 0, 0, Math.PI * 2); ctx.fill();
  if (isMe) { ctx.strokeStyle = '#fff8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(p.x, p.y + 19, 18, 6, 0, 0, 7); ctx.stroke(); }
  const gy = p.a ? y : y + Math.sin(t * 3 + p.id) * 4 - 6;
  drawPerson(p.x, gy, p.c, p.h, p.f || 1, SKINS[p.id % SKINS.length], t, p.m && p.a, p.id);
  label((p.a ? '' : '👻 ') + p.n, p.x, gy - 42, 14);
  if (p.i) emoji('🔦', p.x + 22, gy - 20 + Math.sin(t * 10) * 2, 20);
  if (role === 'faker' && mates.includes(p.n) && p.a) emoji('🖨️', p.x - 22, gy - 28, 14);
  ctx.globalAlpha = 1;
  if (p.m && p.a && Math.random() < 0.15) spawnDust(p.x, p.y + 4);
}

// زينة وفوانيس فوق السوق
function drawOverhead(t, dark) {
  const FLAG = ['#e74c3c', '#f1c40f', '#2ecc71', '#3498db', '#ecf0f1', '#9b59b6'];
  for (const [x1, y1, x2, y2] of MAP.decor.bunting) {
    const len = Math.hypot(x2 - x1, y2 - y1), n = Math.floor(len / 26);
    ctx.strokeStyle = '#3b2a1a'; ctx.lineWidth = 1.5; ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const k = i / n, sag = Math.sin(k * Math.PI * Math.round(len / 300)) ** 2 * 18;
      const x = x1 + (x2 - x1) * k + (y1 === y2 ? 0 : sag), y = y1 + (y2 - y1) * k + (y1 === y2 ? sag : 0);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
    for (let i = 0; i < n; i++) {
      const k = (i + 0.5) / n, sag = Math.sin(k * Math.PI * Math.round(len / 300)) ** 2 * 18;
      const x = x1 + (x2 - x1) * k + (y1 === y2 ? 0 : sag), y = y1 + (y2 - y1) * k + (y1 === y2 ? sag : 0);
      const w = Math.sin(t * 3 + i) * 2;
      ctx.fillStyle = FLAG[i % FLAG.length];
      ctx.beginPath(); ctx.moveTo(x - 7, y); ctx.lineTo(x + 7, y); ctx.lineTo(x + w, y + 14); ctx.fill();
    }
  }
  if (MAP.theme === 'office') {
    for (const [x, y] of MAP.decor.lanterns) {
      if (dark) continue;
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(x, y, 2, x, y, 160); g.addColorStop(0, '#fff6d533'); g.addColorStop(1, '#fff6d500');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 160, 0, 7); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
    return;
  }
  for (const [x, y] of MAP.decor.lanterns) {
    const flick = 0.85 + Math.sin(t * 9 + x) * 0.08 + Math.random() * 0.05;
    if (!dark) {
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(x, y + 10, 2, x, y + 10, 90 * flick);
      g.addColorStop(0, '#ffb34766'); g.addColorStop(1, '#ffb34700');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y + 10, 90, 0, 7); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.fillStyle = '#2b1b0e'; ctx.fillRect(x - 1, y - 6, 2, 8);
    // فانوس: قبة + زجاج منوّر + قاعدة
    ctx.fillStyle = '#b8860b'; ctx.beginPath(); ctx.arc(x, y + 4, 6, Math.PI, 0); ctx.fill();
    ctx.fillStyle = dark ? '#4a3b20' : `rgba(255,${170 + flick * 50},70,1)`;
    ctx.beginPath(); ctx.roundRect(x - 6, y + 4, 12, 14, 2); ctx.fill();
    ctx.strokeStyle = '#7a5a10'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y + 4); ctx.lineTo(x, y + 18); ctx.stroke();
    ctx.fillStyle = '#b8860b'; ctx.beginPath(); ctx.moveTo(x - 7, y + 18); ctx.lineTo(x + 7, y + 18); ctx.lineTo(x, y + 25); ctx.fill();
  }
}

let lastFrame = performance.now();
// ---------- الحيطان والرؤية ----------
function wallBetween(x0, y0, x1, y1) {
  if (!MAP.walls) return false;
  const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 12);
  for (let i = 1; i < n; i++) {
    const k = i / n, x = x0 + (x1 - x0) * k, y = y0 + (y1 - y0) * k;
    for (const w of MAP.walls) if (x >= w.x && x <= w.x + w.w && y >= w.y && y <= w.y + w.h) return true;
  }
  return false;
}
// مين اللي العين دي شايفاه (لاعب أو كاميرا)
function canSee(eye, x, y, range) {
  if (range && Math.hypot(x - eye.x, y - eye.y) > range) return false;
  return !wallBetween(eye.x, eye.y, x, y);
}

function drawWalls() {
  for (const w of MAP.walls || []) {
    ctx.fillStyle = '#0005'; ctx.fillRect(w.x + 4, w.y + 6, w.w, w.h);
    ctx.fillStyle = '#4a4552'; ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.fillStyle = '#6c6676'; ctx.fillRect(w.x, w.y, w.w, Math.min(6, w.h));
  }
}
function drawStation(s, hl, want, closed, t) {
  const cx = s.x + s.w / 2;
  ctx.fillStyle = '#0004'; roundRect(s.x + 5, s.y + 7, s.w, s.h, 8); ctx.fill();
  ctx.fillStyle = closed ? '#3b3f46' : '#9aa3ad'; roundRect(s.x, s.y, s.w, s.h, 8); ctx.fill();
  ctx.fillStyle = closed ? '#2b2e33' : '#c9d0d8'; roundRect(s.x + 6, s.y + 6, s.w - 12, 16, 4); ctx.fill();
  ctx.strokeStyle = hl ? '#f0b429' : '#0006'; ctx.lineWidth = hl ? 4 : 2; roundRect(s.x, s.y, s.w, s.h, 8); ctx.stroke();
  emoji(closed ? '⚠️' : s.icon, cx, s.y + s.h / 2 + 6, 30);
  if (!closed) { ctx.fillStyle = Math.sin(t * 4 + s.id) > 0 ? '#2ecc71' : '#145a32'; ctx.beginPath(); ctx.arc(s.x + s.w - 14, s.y + 14, 4, 0, 7); ctx.fill(); }
  const top = s.face === 'down';
  label(s.item, cx, top ? s.y + s.h + 18 : s.y - 14, 14);
  if (want && !closed) {
    const bx = s.x + s.w - 6, by = s.y - 10 + Math.sin(t * 4) * 3;
    ctx.fillStyle = '#f0b429'; ctx.beginPath(); ctx.arc(bx, by, 12, 0, 7); ctx.fill();
    ctx.fillStyle = '#2a1a05'; ctx.font = '900 15px Cairo'; ctx.fillText('!', bx, by + 1);
  }
}
function drawFurniture(c) {
  ctx.fillStyle = '#0003'; roundRect(c.x + 5, c.y + 8, c.w, c.h, 6); ctx.fill();
  if (c.kind === 'desk') {
    ctx.fillStyle = '#8b6b4a'; roundRect(c.x, c.y, c.w, c.h, 6); ctx.fill();
    emoji('💻', c.x + c.w * 0.35, c.y + c.h / 2, 24); emoji('📋', c.x + c.w * 0.75, c.y + c.h / 2, 18);
  } else if (c.kind === 'shelf') {
    ctx.fillStyle = '#5b4a3a'; roundRect(c.x, c.y, c.w, c.h, 4); ctx.fill();
    for (let i = 0; i < 5; i++) emoji('📚', c.x + 18 + i * 30, c.y + c.h / 2, 18);
  } else if (c.kind === 'rack') {
    ctx.fillStyle = '#1f262e'; roundRect(c.x, c.y, c.w, c.h, 4); ctx.fill();
    for (let y = c.y + 10; y < c.y + c.h - 6; y += 14) { ctx.fillStyle = Math.random() < 0.5 ? '#2ecc71' : '#3498db'; ctx.fillRect(c.x + 8, y, 4, 3); ctx.fillStyle = '#39424d'; ctx.fillRect(c.x + 16, y, c.w - 24, 6); }
  } else {
    ctx.fillStyle = '#6d4c2f'; roundRect(c.x, c.y, c.w, c.h, 6); ctx.fill();
    ctx.strokeStyle = '#4a311b'; ctx.lineWidth = 2; for (let x = c.x + 10; x < c.x + c.w; x += 14) { ctx.beginPath(); ctx.moveTo(x, c.y + 4); ctx.lineTo(x, c.y + c.h - 4); ctx.stroke(); }
    ctx.fillStyle = '#2b1d10'; ctx.beginPath(); ctx.arc(c.x + 16, c.y + c.h, 10, 0, 7); ctx.arc(c.x + c.w - 16, c.y + c.h, 10, 0, 7); ctx.fill();
    ctx.fillStyle = '#8d6e4f'; ctx.beginPath(); ctx.arc(c.x + 16, c.y + c.h, 4, 0, 7); ctx.arc(c.x + c.w - 16, c.y + c.h, 4, 0, 7); ctx.fill();
    if (c.kind === 'melon') { for (let i = 0; i < 3; i++) emoji('🍉', c.x + 25 + i * 30, c.y + c.h / 2, 24); }
    else if (c.kind === 'crate') { for (let i = 0; i < 2; i++) emoji('🐟', c.x + 30 + i * 40, c.y + c.h / 2 - 4, 24); }
    else if (c.kind === 'net') { emoji('🎣', c.x + 30, c.y + c.h / 2, 26); emoji('🦞', c.x + 75, c.y + c.h / 2, 24); }
    else emoji('📦', c.x + c.w / 2, c.y + c.h / 2 - 4, 26);
  }
}
// المخابئ السرية: دولاب / فتحة تكييف / صندوق
function drawHide(h, hl, t, shake) {
  const sx = shake ? Math.sin(t * 60) * 3 : 0;
  ctx.save(); ctx.translate(h.x + sx, h.y);
  if (h.icon === 'closet') {
    ctx.fillStyle = '#0004'; ctx.fillRect(-22, -26, 48, 56);
    ctx.fillStyle = '#7a5a3a'; ctx.fillRect(-24, -30, 48, 56);
    ctx.strokeStyle = '#4a3220'; ctx.lineWidth = 2; ctx.strokeRect(-24, -30, 48, 56); ctx.beginPath(); ctx.moveTo(0, -30); ctx.lineTo(0, 26); ctx.stroke();
    ctx.fillStyle = '#d4a017'; ctx.fillRect(-5, -4, 3, 6); ctx.fillRect(2, -4, 3, 6);
  } else if (h.icon === 'box') {
    ctx.fillStyle = '#c49a5c'; ctx.fillRect(-22, -18, 44, 36);
    ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 2; ctx.strokeRect(-22, -18, 44, 36); ctx.beginPath(); ctx.moveTo(-22, -6); ctx.lineTo(22, -6); ctx.stroke();
  } else {
    ctx.fillStyle = '#5c6670'; ctx.fillRect(-20, -14, 40, 28);
    ctx.strokeStyle = '#2b3138'; ctx.lineWidth = 2;
    for (let x = -14; x <= 14; x += 7) { ctx.beginPath(); ctx.moveTo(x, -10); ctx.lineTo(x, 10); ctx.stroke(); }
    ctx.strokeRect(-20, -14, 40, 28);
  }
  ctx.restore();
  if (hl) { ctx.strokeStyle = '#b388ff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(h.x, h.y, 34 + Math.sin(t * 5) * 3, 0, 7); ctx.stroke(); }
}
// بقعة دم ثابتة لكل واحد اتضرب
function drawBlood(b) {
  let seed = b.id * 9301 + 49297;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  ctx.fillStyle = '#8b0000cc';
  ctx.beginPath(); ctx.ellipse(b.x, b.y + 10, 30, 14, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#a40000aa';
  for (let i = 0; i < 7; i++) { const a = rnd() * Math.PI * 2, d = 25 + rnd() * 25; ctx.beginPath(); ctx.ellipse(b.x + Math.cos(a) * d, b.y + 10 + Math.sin(a) * d * 0.5, 3 + rnd() * 6, 2 + rnd() * 4, a, 0, 7); ctx.fill(); }
}
const seenBodies = new Set();
function bloodBurst(x, y) { for (let i = 0; i < 26; i++) particles.push({ x, y, vx: (Math.random() - 0.5) * 260, vy: -80 - Math.random() * 160, life: 0.7, kind: 'blood' }); }
function puffAt(x, y) { for (let i = 0; i < 14; i++) particles.push({ x, y, vx: (Math.random() - 0.5) * 120, vy: -20 - Math.random() * 60, life: 0.8, kind: 'dust' }); }
const shaking = new Map();

// كل حاجة في العالم مرسومة من عين معينة (اللاعب أو كاميرا)
function drawWorld(eye, t, dt, isCam) {
  ctx.drawImage(groundCache, 0, 0);
  const alive = state.me.alive;
  const reach = (r) => !isCam && distToRect(eye.x, eye.y, r) < CFG.reach;
  const closed = state.cl || [];
  drawWater(t);
  if (MAP.cafe) label('☕ ' + MAP.cafe.name, MAP.cafe.x + MAP.cafe.w / 2, MAP.cafe.y - 16, 16);
  for (const tb of MAP.tables) {
    const cx = tb.x + tb.w / 2, cy = tb.y + tb.h / 2;
    ctx.fillStyle = '#0003'; ctx.beginPath(); ctx.ellipse(cx + 3, cy + 6, tb.w / 2, tb.w / 2.4, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#5d3a1f'; ctx.beginPath(); ctx.arc(cx, cy, tb.w / 2, 0, 7); ctx.fill();
    ctx.fillStyle = '#7a4f2b'; ctx.beginPath(); ctx.arc(cx, cy, tb.w / 2 - 5, 0, 7); ctx.fill();
    emoji(tb.x < MAP.cafe.x + 100 ? '🍵' : '🎲', cx, cy, 18);
    if (tb.x < MAP.cafe.x + 100) { ctx.strokeStyle = '#ffffff55'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, cy - 10); ctx.bezierCurveTo(cx + 5 * Math.sin(t * 2), cy - 18, cx - 5 * Math.sin(t * 2), cy - 24, cx, cy - 32); ctx.stroke(); }
  }
  for (const c of MAP.carts) drawFurniture(c);
  const office = MAP.theme === 'office';
  for (const s of MAP.stalls) (office ? drawStation : drawStall)(s, reach(s), role === 'trader' && state.me.list.includes(s.id) && !state.me.bought.includes(s.id), closed.includes(s.id), t);
  drawBooth(MAP.changer, '💱', office ? 'الخزنة' : 'الصرّاف', '#2e5d4b', reach(MAP.changer));
  drawBooth(MAP.boss, '📣', office ? 'المدير' : 'معلم السوق', '#5b3a6b', alive && reach(MAP.boss));
  if (MAP.camRoom) drawBooth(MAP.camRoom, '📺', 'شاشات الكاميرات', state.cw ? '#3a1a1a' : '#1e2a38', reach(MAP.camRoom));
  const pw = MAP.power;
  drawBooth(pw, state.bo ? '💥' : '⚙️', office ? 'لوحة الكهربا' : 'موتور الكهربا', state.bo ? (Math.sin(t * 8) > 0 ? '#a52a1a' : '#5a1a10') : '#44515a', reach(pw));
  if (state.bo && Math.random() < 0.5 && dt) spawnSparks(pw.x + Math.random() * pw.w, pw.y + 10);
  else if (!state.bo) {
    ctx.save(); ctx.translate(pw.x + pw.w - 20, pw.y + 20); ctx.rotate(t * 8);
    ctx.fillStyle = '#9aa7b0'; for (let i = 0; i < 3; i++) { ctx.rotate(Math.PI * 2 / 3); ctx.fillRect(-2, 0, 4, 12); }
    ctx.restore();
  }
  // المخابئ: المزوّر شايفها متعلّمة، والباقيين شايفينها دواليب عادية
  const iAmHider = role === 'faker' && night;
  for (const h of MAP.hides || []) drawHide(h, iAmHider && !isCam && Math.hypot(h.x - eye.x, h.y - eye.y) < CFG.hideReach, t, (shaking.get(h.id) || 0) > performance.now());
  drawWalls();
  // الكاميرات على الحيطان
  for (const c of MAP.cams || []) {
    ctx.fillStyle = '#0006'; ctx.beginPath(); ctx.arc(c.x + 2, c.y + 3, 12, 0, 7); ctx.fill();
    ctx.fillStyle = '#2b2f36'; ctx.beginPath(); ctx.arc(c.x, c.y, 12, 0, 7); ctx.fill();
    ctx.fillStyle = '#55606e'; ctx.beginPath(); ctx.arc(c.x, c.y, 7, 0, 7); ctx.fill();
    ctx.fillStyle = '#0b0d10'; ctx.beginPath(); ctx.arc(c.x, c.y, 3.5, 0, 7); ctx.fill();
    const on = state.cw && Math.sin(t * 6) > 0;
    ctx.fillStyle = on ? '#ff2d2d' : '#5a1c1c'; ctx.beginPath(); ctx.arc(c.x + 8, c.y - 8, 2.8, 0, 7); ctx.fill();
  }
  if (!office) { moveCats(dt); for (const c of cats) { ctx.save(); ctx.translate(c.x, c.y); ctx.scale(-c.f, 1); emoji('🐈', 0, 0, 22); ctx.restore(); } }
  for (let i = particles.length - 1; i >= 0; i--) {
    const q = particles[i];
    if (dt) { q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; if (q.kind === 'spark' || q.kind === 'blood') q.vy += 400 * dt; }
    if (q.life <= 0) { particles.splice(i, 1); continue; }
    ctx.fillStyle = q.kind === 'spark' ? `rgba(255,${180 + Math.random() * 70},60,${q.life * 1.5})` : q.kind === 'blood' ? `rgba(160,0,0,${Math.min(1, q.life * 1.6)})` : `rgba(150,110,60,${q.life})`;
    ctx.beginPath(); ctx.arc(q.x, q.y, q.kind === 'spark' ? 2 : q.kind === 'blood' ? 3 : 4 * (1 - q.life) + 2, 0, 7); ctx.fill();
  }
  // اللاعبين اللي العين دي شايفاهم بس (الحيطان بتحجب)
  const range = isCam ? CFG.camRange : null;
  const seeAll = !isCam && !alive;
  const vis = (x, y, id) => seeAll || id === you || canSee(eye, x, y, range);
  const ps = [...curPos.keys()].map(lerpPos).filter((p) => vis(p.x, p.y, p.id) || (role === 'faker' && mates.includes(p.n))).sort((a, b) => a.y - b.y);
  for (const b of state.bodies || []) if (vis(b.x, b.y)) { drawBlood(b); drawBody(b, t); }
  for (const p of ps) drawPlayer(p, p.id === you && !isCam, t);
  if (!office) drawPigeons(dt, t, ps);
  drawCoins(dt);
  drawOverhead(t, !!state.bo);
  for (const p of ps) drawBubble(p, t);
  if (!isCam) for (let i = floats.length - 1; i >= 0; i--) {
    const f = floats[i]; f.life -= dt; f.y -= 30 * dt;
    if (f.life <= 0) { floats.splice(i, 1); continue; }
    ctx.globalAlpha = Math.min(1, f.life);
    ctx.font = '900 18px Cairo, sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = '#000b';
    ctx.strokeText(f.text, f.x, f.y); ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, f.y);
    ctx.globalAlpha = 1;
  }
}

// شاشة الكاميرات: 4 مربعات كل واحد بيوري كاميرا
function drawCams(t) {
  const camsList = MAP.cams || [];
  const cols = W >= H ? Math.min(3, camsList.length) : 2, rows = Math.ceil(camsList.length / cols), gap = 6;
  const cw = (W - gap * 3) / cols, ch = (H - 60 - gap * (rows + 1)) / rows;
  ctx.fillStyle = '#05080a'; ctx.fillRect(0, 0, W, H);
  camsList.forEach((c, i) => {
    const x = gap + (i % cols) * (cw + gap), y = 50 + gap + Math.floor(i / cols) * (ch + gap);
    const z = Math.min(cw, ch) / (CFG.camRange * 2.1);
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, cw, ch); ctx.clip();
    ctx.translate(x + cw / 2, y + ch / 2); ctx.scale(z, z); ctx.translate(-c.x, -c.y);
    drawWorld(c, t, 0, true);
    ctx.restore();
    // دايرة مدى الكاميرا + لون أخضر + خطوط
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, cw, ch); ctx.clip();
    const g = ctx.createRadialGradient(x + cw / 2, y + ch / 2, CFG.camRange * z * 0.8, x + cw / 2, y + ch / 2, CFG.camRange * z * 1.15);
    g.addColorStop(0, '#0000'); g.addColorStop(1, '#000e'); ctx.fillStyle = g; ctx.fillRect(x, y, cw, ch);
    ctx.fillStyle = 'rgba(40,255,120,0.08)'; ctx.fillRect(x, y, cw, ch);
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; for (let yy = y + ((t * 40) % 4); yy < y + ch; yy += 4) ctx.fillRect(x, yy, cw, 1);
    ctx.restore();
    ctx.strokeStyle = '#2ecc71'; ctx.lineWidth = 2; ctx.strokeRect(x, y, cw, ch);
    ctx.font = '700 14px Cairo, sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'top'; ctx.fillStyle = '#9effc4';
    ctx.fillText(`📹 ${c.name}`, x + cw - 8, y + 6);
    if (Math.sin(t * 4) > 0) { ctx.fillStyle = '#ff3b3b'; ctx.beginPath(); ctx.arc(x + 14, y + 14, 5, 0, 7); ctx.fill(); }
  });
}

function frame() {
  requestAnimationFrame(frame);
  const nowMs = performance.now(), dt = Math.min(0.05, (nowMs - lastFrame) / 1000); lastFrame = nowMs;
  if (!$('game').classList.contains('active') || !state || !MAP) return;
  if (!groundCache || groundCache.width !== MAP.w) buildGround();
  const t = nowMs / 1000;
  const me = lerpPos(you) || { x: MAP.w / 2, y: MAP.h / 2 };
  // أول مرة نشوف حد مرمي: طرطشة دم
  for (const b of state.bodies || []) if (!seenBodies.has(b.id)) { seenBodies.add(b.id); if (canSee(me, b.x, b.y, 500)) bloodBurst(b.x, b.y); }
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (camsOpen) { drawCams(t); return; }
  const zoom = Math.min(1.15, Math.max(0.6, Math.min(W, H) / 700));
  // الكاميرا بتلحق اللاعب بنعومة وبتبص شوية قدّامه
  const look = { x: (me.m ? (keysDir().x || joy.x) : 0) * 60, y: (me.m ? (keysDir().y || joy.y) : 0) * 45 };
  if (!cam.init) { cam.x = me.x; cam.y = me.y; cam.init = true; }
  cam.x += (me.x + look.x - cam.x) * Math.min(1, dt * 5);
  cam.y += (me.y + look.y - cam.y) * Math.min(1, dt * 5);
  ctx.fillStyle = '#120d0a'; ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.translate(W / 2, H / 2); ctx.scale(zoom, zoom); ctx.translate(-cam.x, -cam.y);
  drawWorld(me, t, dt, false);
  ctx.restore();
  const alive = state.me.alive;

  // مدى الرؤية (بيقل لما الكهربا تقطع، والمزوّر شايف عادي)
  if (alive) {
    const hiddenNow = state.me.hidden != null;
    const base = hiddenNow ? 90 : state.bo && role !== 'faker' ? CFG.darkVision : night && role !== 'faker' && MAP.theme !== 'office' ? CFG.vision * 0.8 : CFG.vision;
    visR += (base - visR) * Math.min(1, dt * 3);
    const R = visR * zoom;
    const sx = W / 2 + (me.x - cam.x) * zoom, sy = H / 2 + (me.y - cam.y) * zoom;
    const g = ctx.createRadialGradient(sx, sy, R * 0.7, sx, sy, R * 1.3);
    g.addColorStop(0, '#0000'); g.addColorStop(1, state.bo || hiddenNow ? '#000f' : '#000d');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  if (MAP.theme !== 'office') {
    // الوقت بيعدّي: عصر ← مغرب ← ليل
    const k = Math.min(1, (Date.now() - roundStart) / 1000 / 300);
    ctx.fillStyle = `rgba(255,140,50,${0.05 + Math.min(k, 0.6) * 0.18})`; ctx.fillRect(0, 0, W, H);
    if (k > 0.45) { ctx.fillStyle = `rgba(25,20,70,${(k - 0.45) * 0.55})`; ctx.fillRect(0, 0, W, H); }
    if (night) { ctx.fillStyle = 'rgba(8,10,40,0.28)'; ctx.fillRect(0, 0, W, H); }
  } else { ctx.fillStyle = 'rgba(180,210,255,0.05)'; ctx.fillRect(0, 0, W, H); }
  drawMini(me);
}
let visR = 320;
const cam = { x: 0, y: 0, init: false };
let roundStart = Date.now();
function keysDir() {
  let x = 0, y = 0;
  if (keys.has('a') || keys.has('arrowleft')) x -= 1;
  if (keys.has('d') || keys.has('arrowright')) x += 1;
  if (keys.has('w') || keys.has('arrowup')) y -= 1;
  if (keys.has('s') || keys.has('arrowdown')) y += 1;
  return { x, y };
}

// حمام السوق: بيقعد على الأرض ويطير لما حد يقرب
const pigeons = [];
// البحر: موج ومراكب بتتهز
function drawWater(t) {
  const w = MAP.water; if (!w) return;
  const g = ctx.createLinearGradient(0, w.y, 0, w.y + w.h);
  g.addColorStop(0, '#0d4f6e'); g.addColorStop(1, '#1d7fa3');
  ctx.fillStyle = g; ctx.fillRect(w.x, w.y, w.w, w.h);
  ctx.strokeStyle = '#ffffff55'; ctx.lineWidth = 2;
  for (let row = 0; row < 4; row++) {
    ctx.beginPath();
    for (let x = 0; x <= w.w; x += 20) { const y = w.y + 25 + row * 35 + Math.sin(x / 60 + t * 2 + row) * 5; x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke();
  }
  for (const [bx, by] of MAP.decor.boats || []) {
    const rock = Math.sin(t * 1.5 + bx) * 0.06, bob = Math.sin(t * 2 + bx) * 3;
    ctx.save(); ctx.translate(bx, by + bob); ctx.rotate(rock);
    ctx.fillStyle = '#0006'; ctx.beginPath(); ctx.ellipse(0, 22, 70, 8, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.moveTo(-70, 0); ctx.lineTo(70, 0); ctx.lineTo(50, 22); ctx.lineTo(-50, 22); ctx.fill();
    ctx.fillStyle = '#f6ead8'; ctx.fillRect(-70, -4, 140, 6);
    ctx.fillStyle = '#2266aa'; ctx.fillRect(-60, 6, 120, 4);
    ctx.fillStyle = '#5a3b1f'; ctx.fillRect(-2, -50, 4, 50);
    ctx.fillStyle = '#f6ead8'; ctx.beginPath(); ctx.moveTo(2, -48); ctx.lineTo(40, -10); ctx.lineTo(2, -10); ctx.fill();
    ctx.restore();
  }
}
function initPigeons() {
  pigeons.length = 0;
  for (const [cx, cy] of MAP.decor.birds)
    for (let i = 0; i < 4; i++) pigeons.push({ x: cx + (Math.random() - 0.5) * 80, y: cy + (Math.random() - 0.5) * 50, vx: 0, vy: 0, fly: 0, peck: Math.random() * 5, f: Math.random() < 0.5 ? 1 : -1 });
}
function drawPigeons(dt, t, ps) {
  for (const b of pigeons) {
    if (!b.fly && ps.some((p) => p.a && Math.hypot(p.x - b.x, p.y - b.y) < 90)) {
      b.fly = 2.5 + Math.random(); const a = Math.random() * Math.PI * 2;
      b.vx = Math.cos(a) * 220; b.vy = -120 - Math.random() * 80; b.f = b.vx > 0 ? 1 : -1;
      if (Math.random() < 0.3) Sound.play('flap');
    }
    if (b.fly) {
      b.fly -= dt; b.x += b.vx * dt; b.y += b.vy * dt; b.vy += 40 * dt;
      if (b.fly <= 0) { b.fly = 0; b.x = 150 + Math.random() * (MAP.w - 300); b.y = 300 + Math.random() * 600; }
      ctx.globalAlpha = Math.min(1, b.fly);
      ctx.save(); ctx.translate(b.x, b.y - 30); ctx.scale(-b.f, 1);
      const wing = Math.sin(t * 30) * 6;
      ctx.fillStyle = MAP.theme === 'sea' ? '#f2f2f2' : '#8a8f99'; ctx.beginPath(); ctx.ellipse(0, 0, 8, 4, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-2, 0); ctx.lineTo(4, -6 - wing); ctx.lineTo(8, 0); ctx.fill();
      ctx.restore(); ctx.globalAlpha = 1;
    } else {
      b.peck -= dt; const down = b.peck < 0.3 ? 3 : 0; if (b.peck < 0) b.peck = 1 + Math.random() * 4;
      ctx.save(); ctx.translate(b.x, b.y); ctx.scale(b.f, 1);
      ctx.fillStyle = '#0003'; ctx.beginPath(); ctx.ellipse(0, 6, 7, 2.5, 0, 0, 7); ctx.fill();
      ctx.fillStyle = MAP.theme === 'sea' ? '#f2f2f2' : '#8a8f99'; ctx.beginPath(); ctx.ellipse(0, 0, 8, 5, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#6b7079'; ctx.beginPath(); ctx.ellipse(-2, -1, 5, 3, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#7c8390'; ctx.beginPath(); ctx.arc(7, -3 + down, 3.5, 0, 7); ctx.fill();
      ctx.fillStyle = '#e67e22'; ctx.fillRect(10, -3 + down, 3, 1.5);
      ctx.restore();
    }
  }
}

// عملات طايرة بين اللاعب والبسطة
const coinFx = [];
function coinBurst() {
  const p = curPos.get(you); if (!p || !MAP) return;
  const s = MAP.stalls.find((x) => distToRect(p.x, p.y, x) < CFG.reach) || (distToRect(p.x, p.y, MAP.changer) < CFG.reach ? MAP.changer : null);
  if (!s) return;
  const sx = s.x + s.w / 2, sy = s.y + s.h / 2;
  for (let i = 0; i < 2; i++) coinFx.push({ x0: p.x, y0: p.y - 10, x1: sx, y1: sy, t: -i * 0.12 });
  coinFx.push({ x0: sx, y0: sy, x1: p.x, y1: p.y - 10, t: -0.45 });
}
function drawCoins(dt) {
  for (let i = coinFx.length - 1; i >= 0; i--) {
    const c = coinFx[i]; c.t += dt * 1.8;
    if (c.t >= 1) { coinFx.splice(i, 1); continue; }
    if (c.t < 0) continue;
    const x = c.x0 + (c.x1 - c.x0) * c.t, y = c.y0 + (c.y1 - c.y0) * c.t - Math.sin(c.t * Math.PI) * 50;
    ctx.fillStyle = '#f0b429'; ctx.beginPath(); ctx.ellipse(x, y, 6 * Math.abs(Math.cos(c.t * 12)) + 1, 6, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = '#a5760c'; ctx.lineWidth = 1.5; ctx.stroke();
  }
}

// فقاعات الإيموشن فوق الراس
const bubbles = new Map();
function drawBubble(p, t) {
  const b = bubbles.get(p.id);
  if (!b) return;
  const age = (performance.now() - b.at) / 1000;
  if (age > 2.6) { bubbles.delete(p.id); return; }
  const pop = Math.min(1, age * 6), y = p.y - 70 - Math.min(age, 0.3) * 20;
  ctx.globalAlpha = age > 2.2 ? (2.6 - age) / 0.4 : 1;
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.roundRect(p.x - 20 * pop, y - 18 * pop, 40 * pop, 32 * pop, 12); ctx.fill();
  ctx.beginPath(); ctx.moveTo(p.x - 5, y + 13 * pop); ctx.lineTo(p.x + 5, y + 13 * pop); ctx.lineTo(p.x, y + 20 * pop); ctx.fill();
  emoji(b.e, p.x, y - 2, 22 * pop);
  ctx.globalAlpha = 1;
}

// صورة صغيرة للشخصية (للوبي والاجتماع والنهاية)
function avatar(color, hat, id, size = 40, ghost = false) {
  const c = document.createElement('canvas');
  const d = devicePixelRatio || 1;
  c.width = size * d; c.height = size * 1.2 * d; c.className = 'av';
  c.style.width = size + 'px'; c.style.height = size * 1.2 + 'px';
  const g = c.getContext('2d');
  g.scale(d * size / 40, d * size / 40);
  ctx = g;
  if (ghost) g.globalAlpha = 0.4;
  drawPerson(20, 30, color, hat, 1, SKINS[id % SKINS.length], 0, false, id);
  ctx = mainCtx;
  return c;
}
requestAnimationFrame(frame);

function drawMini(me) {
  const w = mini.width, h = mini.height, sx = w / MAP.w, sy = h / MAP.h;
  mctx.setTransform(1, 0, 0, 1, 0, 0);
  mctx.clearRect(0, 0, w, h);
  mctx.fillStyle = '#d9b77e44'; mctx.fillRect(0, 0, w, h);
  const box = (r, c) => { mctx.fillStyle = c; mctx.fillRect(r.x * sx, r.y * sy, r.w * sx, r.h * sy); };
  for (const s of MAP.stalls) box(s, role === 'trader' && state.me.list.includes(s.id) && !state.me.bought.includes(s.id) ? '#f0b429' : '#c0392b99');
  box(MAP.changer, '#2ecc71aa'); box(MAP.boss, '#9b59b6cc'); box(MAP.power, state.bo ? '#ff3b1f' : '#7f8c8d');
  for (const c of [...MAP.carts, ...MAP.tables]) box(c, '#6d4c2f88');
  for (const w of MAP.walls || []) box(w, '#cfc8d6');
  if (MAP.camRoom) box(MAP.camRoom, '#3498db');
  for (const c of MAP.cams || []) {
    mctx.fillStyle = 'rgba(46,204,113,.12)'; mctx.beginPath(); mctx.ellipse(c.x * sx, c.y * sy, CFG.camRange * sx, CFG.camRange * sy, 0, 0, 7); mctx.fill();
    mctx.fillStyle = state.cw ? '#ff4d4d' : '#2ecc71'; mctx.beginPath(); mctx.arc(c.x * sx, c.y * sy, 2.5 * DPR, 0, 7); mctx.fill();
  }
  if (role === 'faker' && night) for (const h of MAP.hides || []) box({ x: h.x - 20, y: h.y - 20, w: 40, h: 40 }, '#b388ff');
  mctx.fillStyle = '#fff'; mctx.beginPath(); mctx.arc(me.x * sx, me.y * sy, 3.5 * DPR, 0, 7); mctx.fill();
}

// ---------- الاجتماع ----------
let myVote = null, lastStage = '', meetingEnds = 0;
function onMeeting(m) {
  meetingOpen = true;
  $('meeting').classList.remove('hidden');
  keys.clear(); joy = { x: 0, y: 0 }; pushInput();
  if (m.stage !== lastStage && m.stage === 'discuss') myVote = null;
  lastStage = m.stage;
  meetingEnds = Date.now() / 1000 + m.left;
  const meAlive = m.players.find((p) => p.id === you)?.alive;
  $('mSub').textContent = (m.report ? m.report + ' · ' : `${m.caller} نادى.. `) + (m.stage === 'discuss' ? 'اتكلموا الأول، التصويت بعد شوية' : m.stage === 'vote' ? (office ? 'صوّتوا: مين القاتل؟' : 'صوّتوا: مين المزوّر؟') : 'النتيجة');
  $('mResult').classList.toggle('hidden', m.stage !== 'result');
  if (m.result && $('mResult').dataset.text !== m.result.text) {
    $('mResult').dataset.text = m.result.text;
    $('mResult').innerHTML = '<span></span>';
    $('mResult').firstChild.textContent = m.result.text;
    const out = m.players.find((p) => p.id === m.result.out);
    if (out) { const a = avatar(out.color, out.hat, out.id, 60); a.classList.add('flyout'); $('mResult').prepend(a); }
  }
  if (!m.result) $('mResult').dataset.text = '';
  const canVote = m.stage === 'vote' && meAlive && !m.voted.includes(you);
  // مين صوّت لمين (بيظهر في النتيجة بس)
  const votersFor = {};
  if (m.votes) for (const [voter, target] of Object.entries(m.votes)) (votersFor[target] ||= []).push(Number(voter));
  const colorOf = (id) => m.players.find((p) => p.id === id)?.color || '#888';
  $('mPlayers').innerHTML = '';
  for (const p of m.players) {
    const b = document.createElement('button');
    b.className = 'vbtn' + (p.alive ? '' : ' out') + (myVote === p.id ? ' mine' : '') + (m.result && m.result.out === p.id ? ' ejected' : '');
    b.innerHTML = `<span class="dot" style="background:${p.color}"></span><span></span><span class="voters"></span>`;
    b.children[1].textContent = `${p.name}` + (p.id === you ? ' (انت)' : '') + (!p.alive ? ' 👻' : m.voted.includes(p.id) && !m.votes ? ' 🗳️' : '');
    for (const v of votersFor[p.id] || []) { const i = document.createElement('i'); i.style.background = colorOf(v); b.children[2].appendChild(i); }
    b.children[0].replaceWith(avatar(p.color, p.hat, p.id, 34, !p.alive));
    b.disabled = !canVote || !p.alive || p.id === you;
    b.onclick = () => { myVote = p.id; sendMsg({ t: 'vote', id: p.id }); };
    $('mPlayers').appendChild(b);
  }
  $('mSkip').disabled = !canVote;
  $('mSkip').innerHTML = 'سكيب ⏭ ';
  for (const v of votersFor.skip || []) { const i = document.createElement('i'); i.className = 'dot'; i.style.cssText = `display:inline-block;width:10px;height:10px;background:${colorOf(v)}`; $('mSkip').appendChild(i); }
  $('mSkip').onclick = () => { myVote = 'skip'; sendMsg({ t: 'vote', id: 'skip' }); };
  const log = $('mChat');
  const atBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 30;
  log.innerHTML = '';
  for (const c of m.chat) {
    const p = document.createElement('p');
    p.innerHTML = `<b></b>: <span></span>`;
    p.children[0].style.color = c.c; p.children[0].textContent = c.n; p.children[1].textContent = c.text;
    log.appendChild(p);
  }
  if (atBottom) log.scrollTop = log.scrollHeight;
  $('chatIn').disabled = !meAlive;
  $('quick').classList.toggle('hidden', !meAlive);
}
setInterval(() => {
  if (!meetingOpen) return;
  $('mTimer').textContent = Math.max(0, Math.ceil(meetingEnds - Date.now() / 1000));
}, 250);
$('chatForm').onsubmit = (e) => { e.preventDefault(); const v = $('chatIn').value.trim(); if (v) sendMsg({ t: 'chat', text: v }); $('chatIn').value = ''; };
function renderQuick() {
  $('quick').innerHTML = '';
  for (const q of quick) { const b = document.createElement('button'); b.type = 'button'; b.textContent = q; b.onclick = () => sendMsg({ t: 'chat', text: q }); $('quick').appendChild(b); }
}

// ---------- النهاية ----------
function onEnd(m) {
  meetingOpen = false;
  $('meeting').classList.add('hidden');
  $('end').classList.remove('hidden');
  Ambient.stop();
  const me = m.players.find((p) => p.id === you);
  if (me && !role) role = me.role;
  const won = m.winner === role;
  $('endIcon').textContent = won ? '🏆' : '💸';
  const T = office ? { faker: '🔪 القاتل كسب', trader: '💼 الموظفين كسبوا' } : { faker: '🖨️ المزوّر كسب', trader: '🧺 التجار كسبوا', thief: '🦹 الحرامي كسب' };
  $('endTitle').textContent = T[m.winner] + (won ? ' — مبروك!' : ' — حظ أوفر');
  $('endTitle').style.color = m.winner === 'faker' ? 'var(--red)' : m.winner === 'thief' ? '#b388ff' : 'var(--gold)';
  $('endWhy').textContent = office ? `${m.why} · المهام ${Math.round(m.prog * 100)}%` : `${m.why} · ورق مضروب ${m.circ}/${fakeTarget} · مشتريات ${Math.round(m.prog * 100)}%`;
  $('awards').innerHTML = '';
  for (const a of m.awards || []) {
    const d = document.createElement('div'); d.className = 'award';
    d.innerHTML = '<div class="ai"></div><b></b><span></span><small></small>';
    d.children[0].textContent = a.icon; d.children[1].textContent = a.title;
    d.children[2].textContent = a.name; d.children[2].style.color = a.color; d.children[3].textContent = a.detail;
    $('awards').appendChild(d);
  }
  $('endList').innerHTML = '';
  for (const p of m.players) {
    const li = document.createElement('li');
    li.innerHTML = `<span class="dot" style="background:${p.color}"></span><span></span><span class="wins"></span>`;
    const roleName = office ? (p.role === 'faker' ? 'القاتل 🔪' : p.special === 'guard' ? 'أمن 🧑‍✈️' : 'موظف 💼') : p.role === 'faker' ? 'مزوّر 🖨️' : p.role === 'thief' ? 'حرامي 🦹' : p.special === 'guard' ? 'أمن 🧑‍✈️' : p.special === 'police' ? 'أمين شرطة 👮' : p.special === 'watcher' ? 'شحات 🪙' : 'تاجر 🧺';
    li.children[1].textContent = `${p.name} — ${roleName}${p.alive ? '' : ' (اتطرد)'}`;
    li.children[2].textContent = `🏆 ${p.wins}`;
    li.children[0].replaceWith(avatar(p.color, p.hat || 'bald', p.id, 30));
    $('endList').appendChild(li);
  }
  const isHost = you === hostId;
  $('btnAgain').classList.toggle('hidden', !isHost);
  $('endWait').classList.toggle('hidden', isHost);
}

// ---------- تنبيهات ----------
function toast(text, kind = 'info') {
  const d = document.createElement('div');
  d.className = 'toast ' + kind; d.textContent = text;
  $('toasts').prepend(d);
  setTimeout(() => d.remove(), kind === 'warn' ? 8000 : 5000);
  while ($('toasts').children.length > 5) $('toasts').lastChild.remove();
}

// ---------- الفصال ----------
let haggleOpen = false, haggle = null;
function openHaggle(m) {
  haggleOpen = true;
  keys.clear(); joy = { x: 0, y: 0 }; pushInput();
  const zone = 0.15 + Math.random() * 0.55, width = 0.16 + Math.random() * 0.06;
  haggle = { start: performance.now(), zone, width, done: false, speed: 1.1 + Math.random() * 0.5 };
  $('hgItem').textContent = `${m.icon} ${m.item}`;
  $('hgMsg').textContent = 'دوس E (أو المس الشاشة) لما المؤشر يبقى في الأخضر';
  $('hgZone').style.right = zone * 100 + '%'; $('hgZone').style.width = width * 100 + '%';
  $('haggle').classList.remove('hidden');
  requestAnimationFrame(haggleFrame);
}
function haggleNeedle() { const t = (performance.now() - haggle.start) / 1000 * haggle.speed; return Math.abs(((t % 2) + 2) % 2 - 1); }
function haggleFrame() {
  if (!haggleOpen || haggle.done) return;
  const x = haggleNeedle();
  $('hgNeedle').style.right = `calc(${x * 100}% - 3px)`;
  if (performance.now() - haggle.start > 5000) return haggleHit(true);
  requestAnimationFrame(haggleFrame);
}
function haggleHit(timeout) {
  if (!haggleOpen || haggle.done) return;
  haggle.done = true;
  const x = haggleNeedle();
  const good = !timeout && x >= haggle.zone && x <= haggle.zone + haggle.width;
  $('hgMsg').textContent = good ? '🤝 البياع وافق! هيرجعلك باقي زيادة' : timeout ? '⌛ اتأخرت.. هتدفع السعر العادي' : '😤 البياع مرضيش.. هتدفع السعر العادي';
  Sound.play(good ? 'fixed' : 'skip');
  sendMsg({ t: 'haggled', good });
  setTimeout(() => { haggleOpen = false; $('haggle').classList.add('hidden'); }, 700);
}
$('haggle').addEventListener('pointerdown', (e) => { e.preventDefault(); haggleHit(); });

// ---------- صوت زحمة السوق في الخلفية ----------
const Ambient = (() => {
  let ac, src, gain, timer;
  function start(theme) {
    stop();
    if (Sound.muted) return;
    try {
      ac ||= new (window.AudioContext || window.webkitAudioContext)();
      const len = ac.sampleRate * 2, buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3; }
      src = ac.createBufferSource(); src.buffer = buf; src.loop = true;
      const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = theme === 'sea' ? 500 : 900;
      gain = ac.createGain(); gain.gain.value = 0.05;
      src.connect(f).connect(gain).connect(ac.destination); src.start();
      // نداءات بياعين من بعيد
      timer = setInterval(() => {
        if (Sound.muted || !ac) return;
        const t0 = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
        o.type = 'sawtooth'; const f0 = 180 + Math.random() * 120;
        o.frequency.setValueAtTime(f0, t0); o.frequency.linearRampToValueAtTime(f0 * 1.3, t0 + 0.25); o.frequency.linearRampToValueAtTime(f0 * 0.9, t0 + 0.6);
        g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.012, t0 + 0.1); g.gain.linearRampToValueAtTime(0, t0 + 0.7);
        const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700;
        o.connect(lp).connect(g).connect(ac.destination); o.start(t0); o.stop(t0 + 0.8);
      }, 4000 + Math.random() * 3000);
    } catch {}
  }
  function stop() { try { src && src.stop(); } catch {} src = null; clearInterval(timer); }
  return { start, stop };
})();
$('mute').addEventListener('click', () => { if (Sound.muted) Ambient.stop(); else if (MAP && $('game').classList.contains('active')) Ambient.start(MAP.theme); });
