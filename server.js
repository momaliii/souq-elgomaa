// سوق الجمعة — سيرفر اللعبة (HTTP للملفات + WebSocket للعب)
const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, 'public');

// ---------- الخرايط ----------
const MAPS = {
  souq: {
    id: 'souq', name: 'سوق الجمعة', theme: 'souq', w: 1800, h: 1200, vendor: 'البياع',
    stalls: [
      { id: 0, item: 'طماطم', icon: '🍅', x: 150, y: 90, w: 180, h: 95, face: 'down' },
      { id: 1, item: 'عيش', icon: '🍞', x: 580, y: 90, w: 180, h: 95, face: 'down' },
      { id: 2, item: 'بصل', icon: '🧅', x: 1040, y: 90, w: 180, h: 95, face: 'down' },
      { id: 3, item: 'برتقال', icon: '🍊', x: 1470, y: 90, w: 180, h: 95, face: 'down' },
      { id: 4, item: 'سمك', icon: '🐟', x: 150, y: 1015, w: 180, h: 95, face: 'up' },
      { id: 5, item: 'شاي', icon: '🫖', x: 580, y: 1015, w: 180, h: 95, face: 'up' },
      { id: 6, item: 'فول', icon: '🫘', x: 1040, y: 1015, w: 180, h: 95, face: 'up' },
      { id: 7, item: 'جبنة', icon: '🧀', x: 1470, y: 1015, w: 180, h: 95, face: 'up' },
    ],
    changer: { x: 70, y: 545, w: 140, h: 110 },     // الصرّاف
    boss: { x: 835, y: 555, w: 130, h: 90 },        // معلم السوق (زرار النداء)
    power: { x: 1590, y: 545, w: 140, h: 110 },     // موتور الكهربا
    cafe: { x: 330, y: 330, w: 300, h: 200, name: 'قهوة المعلم' },
    tables: [
      { x: 370, y: 370, w: 50, h: 50 }, { x: 530, y: 370, w: 50, h: 50 },
      { x: 370, y: 450, w: 50, h: 50 }, { x: 530, y: 450, w: 50, h: 50 },
    ],
    carts: [
      { x: 1250, y: 350, w: 110, h: 80, kind: 'melon' },
      { x: 1150, y: 760, w: 110, h: 80, kind: 'melon' },
      { x: 420, y: 790, w: 80, h: 70, kind: 'box' },
      { x: 840, y: 330, w: 70, h: 60, kind: 'box' },
    ],
    water: null,
    hides: [
      { id: 0, x: 120, y: 330, name: 'صندوق كرتون', icon: 'box', link: [1] },
      { id: 1, x: 1680, y: 860, name: 'بلاعة', icon: 'vent', link: [0, 2] },
      { id: 2, x: 1000, y: 260, name: 'تحت البسطة', icon: 'box', link: [1, 3] },
      { id: 3, x: 700, y: 900, name: 'بلاعة', icon: 'vent', link: [2] },
    ],
    decor: {
      bunting: [[60, 255, 1740, 255], [60, 945, 1740, 945]],
      lanterns: [[240, 255], [700, 255], [1100, 255], [1560, 255], [240, 945], [700, 945], [1100, 945], [1560, 945], [480, 560], [1320, 560]],
      birds: [[500, 640], [1300, 520], [900, 820], [300, 260]],
    },
  },
  sea: {
    id: 'sea', name: 'سوق السمك', theme: 'sea', w: 1800, h: 1200, vendor: 'البياع',
    stalls: [
      { id: 0, item: 'بلطي', icon: '🐟', x: 200, y: 215, w: 180, h: 95, face: 'down' },
      { id: 1, item: 'جمبري', icon: '🦐', x: 620, y: 215, w: 180, h: 95, face: 'down' },
      { id: 2, item: 'كابوريا', icon: '🦀', x: 1040, y: 215, w: 180, h: 95, face: 'down' },
      { id: 3, item: 'سبيط', icon: '🦑', x: 1460, y: 215, w: 180, h: 95, face: 'down' },
      { id: 4, item: 'ليمون', icon: '🍋', x: 200, y: 1015, w: 180, h: 95, face: 'up' },
      { id: 5, item: 'عيش', icon: '🍞', x: 620, y: 1015, w: 180, h: 95, face: 'up' },
      { id: 6, item: 'تلج', icon: '🧊', x: 1040, y: 1015, w: 180, h: 95, face: 'up' },
      { id: 7, item: 'ملح', icon: '🧂', x: 1460, y: 1015, w: 180, h: 95, face: 'up' },
    ],
    changer: { x: 1590, y: 590, w: 140, h: 110 },
    boss: { x: 835, y: 610, w: 130, h: 90 },
    power: { x: 70, y: 590, w: 140, h: 110 },
    cafe: { x: 1130, y: 640, w: 300, h: 190, name: 'قهوة البحر' },
    tables: [
      { x: 1170, y: 680, w: 50, h: 50 }, { x: 1330, y: 680, w: 50, h: 50 },
      { x: 1170, y: 760, w: 50, h: 50 }, { x: 1330, y: 760, w: 50, h: 50 },
    ],
    carts: [
      { x: 420, y: 470, w: 100, h: 70, kind: 'crate' },
      { x: 1280, y: 450, w: 100, h: 70, kind: 'crate' },
      { x: 560, y: 790, w: 110, h: 80, kind: 'net' },
      { x: 860, y: 430, w: 80, h: 60, kind: 'crate' },
    ],
    water: { x: 0, y: 0, w: 1800, h: 165 },
    hides: [
      { id: 0, x: 120, y: 420, name: 'برميل', icon: 'box', link: [1] },
      { id: 1, x: 1700, y: 880, name: 'بلاعة', icon: 'vent', link: [0, 2] },
      { id: 2, x: 980, y: 900, name: 'شبك صيد', icon: 'box', link: [1] },
    ],
    decor: {
      bunting: [[60, 360, 1740, 360], [60, 950, 1740, 950]],
      lanterns: [[300, 360], [760, 360], [1180, 360], [1600, 360], [300, 950], [760, 950], [1180, 950], [1600, 950]],
      birds: [[480, 640], [1000, 860], [700, 380], [1500, 480]],
      boats: [[260, 70], [900, 90], [1500, 60]],
    },
  },
};

// خريطة الشركة: أوض وحيطان وأبواب وكاميرات
function wallsFrom(hs, vs, t = 20) {
  // hs: [y, [[x0,x1],...]]   vs: [x, [[y0,y1],...]]
  const out = [];
  for (const [y, segs] of hs) for (const [a, b] of segs) out.push({ x: a, y, w: b - a, h: t, wall: true });
  for (const [x, segs] of vs) for (const [a, b] of segs) out.push({ x, y: a, w: t, h: b - a, wall: true });
  return out;
}
MAPS.office = {
  id: 'office', name: 'الشركة', theme: 'office', w: 1800, h: 1200, vendor: 'الساعي',
  spawn: { x: 900, y: 490, rx: 420, ry: 25 },
  rooms: [
    { x: 0, y: 0, w: 500, h: 400, name: 'مكتب المدير', floor: '#6b4f3a' },
    { x: 520, y: 0, w: 480, h: 400, name: 'الاجتماعات', floor: '#3e5a6e' },
    { x: 1020, y: 0, w: 330, h: 400, name: 'غرفة الكاميرات', floor: '#2f3640' },
    { x: 1370, y: 0, w: 430, h: 400, name: 'السيرفرات', floor: '#2d3d4a' },
    { x: 0, y: 420, w: 1800, h: 140, name: 'الطرقة', floor: '#b9b2a6' },
    { x: 0, y: 580, w: 450, h: 620, name: 'الحسابات', floor: '#4f6b54' },
    { x: 470, y: 580, w: 430, h: 620, name: 'البوفيه', floor: '#a0764f' },
    { x: 920, y: 580, w: 480, h: 620, name: 'المكاتب', floor: '#57606f' },
    { x: 1420, y: 580, w: 380, h: 620, name: 'الأرشيف', floor: '#7a6a53' },
  ],
  walls: wallsFrom(
    [[400, [[0, 200], [300, 700], [800, 1120], [1220, 1520], [1620, 1800]]],
     [560, [[0, 180], [280, 620], [720, 1050], [1250, 1550], [1650, 1800]]]],
    [[500, [[0, 400]]], [1000, [[0, 140], [250, 400]]], [1350, [[0, 400]]],
     [450, [[580, 1200]]], [900, [[580, 790], [900, 1200]]], [1400, [[580, 1200]]]],
  ),
  stalls: [
    { id: 0, item: 'قهوة', task: 'اعمل قهوة', icon: '☕', x: 500, y: 1100, w: 150, h: 75, face: 'up' },
    { id: 1, item: 'سندوتش', task: 'حضّر الفطار', icon: '🥪', x: 700, y: 1100, w: 150, h: 75, face: 'up' },
    { id: 2, item: 'ورق A4', task: 'صوّر الورق', icon: '📄', x: 1440, y: 1100, w: 150, h: 75, face: 'up' },
    { id: 3, item: 'حبر', task: 'غيّر حبر الطابعة', icon: '🖋️', x: 1000, y: 1100, w: 150, h: 75, face: 'up' },
    { id: 4, item: 'دبّاسة', task: 'دبّس التقارير', icon: '📎', x: 60, y: 30, w: 150, h: 75, face: 'down' },
    { id: 5, item: 'ملفات', task: 'رتّب الملفات', icon: '📁', x: 1620, y: 1100, w: 150, h: 75, face: 'up' },
    { id: 6, item: 'شاحن', task: 'اشحن اللابتوب', icon: '🔌', x: 1400, y: 30, w: 150, h: 75, face: 'down' },
    { id: 7, item: 'ختم', task: 'اختم الورق', icon: '📮', x: 230, y: 1100, w: 150, h: 75, face: 'up' },
  ],
  changer: { x: 30, y: 610, w: 140, h: 100 },
  boss: { x: 690, y: 160, w: 130, h: 90 },
  power: { x: 1620, y: 30, w: 140, h: 110 },
  camRoom: { x: 1100, y: 30, w: 170, h: 80 },
  cafe: { x: 520, y: 700, w: 330, h: 250, name: 'البوفيه' },
  tables: [
    { x: 560, y: 760, w: 50, h: 50 }, { x: 740, y: 760, w: 50, h: 50 },
    { x: 560, y: 860, w: 50, h: 50 }, { x: 740, y: 860, w: 50, h: 50 },
  ],
  carts: [
    { x: 980, y: 680, w: 120, h: 60, kind: 'desk' }, { x: 1200, y: 680, w: 120, h: 60, kind: 'desk' },
    { x: 980, y: 900, w: 120, h: 60, kind: 'desk' }, { x: 1200, y: 900, w: 120, h: 60, kind: 'desk' },
    { x: 230, y: 200, w: 160, h: 70, kind: 'desk' }, { x: 1500, y: 680, w: 160, h: 50, kind: 'shelf' },
    { x: 1500, y: 820, w: 160, h: 50, kind: 'shelf' }, { x: 1450, y: 240, w: 60, h: 100, kind: 'rack' },
    { x: 1560, y: 240, w: 60, h: 100, kind: 'rack' }, { x: 1670, y: 240, w: 60, h: 100, kind: 'rack' },
  ],
  water: null,
  hides: [
    { id: 0, x: 420, y: 330, name: 'دولاب المدير', icon: 'closet', link: [1, 3] },
    { id: 1, x: 1700, y: 360, name: 'ممر التكييف', icon: 'vent', link: [0, 2] },
    { id: 2, x: 1740, y: 980, name: 'دولاب الأرشيف', icon: 'closet', link: [1, 3] },
    { id: 3, x: 520, y: 640, name: 'مخزن البوفيه', icon: 'vent', link: [2, 0, 4] },
    { id: 4, x: 1340, y: 1150, name: 'تحت مكتب', icon: 'vent', link: [3] },
  ],
  // الكاميرات بتغطي الطرقة والأوض المهمة، ومكتب المدير والاجتماعات من غير كاميرات (أماكن عمياء)
  cams: [
    { x: 450, y: 490, name: 'الطرقة - غرب' }, { x: 1350, y: 490, name: 'الطرقة - شرق' },
    { x: 685, y: 880, name: 'البوفيه' }, { x: 1160, y: 890, name: 'المكاتب' },
    { x: 1610, y: 900, name: 'الأرشيف' }, { x: 1585, y: 200, name: 'السيرفرات' },
  ],
  decor: {
    bunting: [],
    lanterns: [[250, 200], [760, 200], [1180, 200], [1580, 200], [225, 900], [685, 1000], [1160, 800], [1610, 900], [450, 490], [1350, 490]],
    birds: [],
  },
};
let MAP = MAPS.souq;
let SOLIDS = [];
function solidsOf(m) { return [...m.stalls, m.changer, m.boss, m.power, ...m.tables, ...m.carts, ...(m.water ? [m.water] : []), ...(m.walls || []), ...(m.camRoom ? [m.camRoom] : [])]; }
for (const m of Object.values(MAPS)) m.solids = solidsOf(m);
// كل العمليات بتشتغل على خريطة الغرفة الحالية
function useMap(room) {
  MAP = MAPS[room.settings.map] || MAPS.souq;
  SOLIDS = MAP.solids;
  if (!MAP.grid) MAP.grid = buildGrid();
  ({ BLOCKED, GW, GH } = MAP.grid);
}

const CFG = {
  speed: 200,
  ghostSpeed: 1.4,
  radius: 16,
  reach: 72,
  startCoins: 6,
  price: 2,
  printCd: 9,
  plantCd: 25,
  inspectTime: 3,
  inspectCd: 20,
  changerCd: 15,
  blackoutCd: 50,
  blackoutTime: 30,
  blackoutLeak: 2,
  closeCd: 35,
  taskTime: 4,
  hideReach: 55,
  closeTime: 25,
  watchRange: 300,
  searchReach: 80,
  stealCd: 15,
  killCd: 30,
  killReach: 60,
  reportReach: 90,
  camRange: 300,
  guardCamTime: 12,
  guardCamCd: 25,
  stealReach: 55,
  thiefGoal: 8,
  thiefModeGoal: 12,
  buyerWindow: 45,
  vision: 320,
  darkVision: 110,
  discussTime: 20,
  voteTime: 40,
  resultTime: 7,
};
const DEFAULT_SETTINGS = { fakers: 0, fakeTarget: 10, listSize: 5, reveal: true, specials: true, thief: true, map: 'souq', mode: 'classic' };
const COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#e67e22', '#1abc9c', '#ff6b9d', '#ecf0f1', '#8d6e63'];
const HATS = ['tarboosh', 'cap', 'scarf', 'bald', 'shawl'];
const BOT_NAMES = ['عم سيد', 'الحاجة نعمات', 'شريف', 'أم حسن', 'بلبل', 'الأسطى رضا', 'زيزي', 'كريم', 'عم فتحي'];
const QUICK_OFFICE = ['كنت في البوفيه', 'كنت بعمل مهمتي', 'شفت حد خارج من الدولاب', 'أنا بريء والله', 'سكيب أحسن', 'مين قطع النور؟', 'كنت على الكاميرات', 'لقيته جنب الأرشيف'];
const QUICK_THIEF = ['جيبي اتنشل!', 'كنت عند الصرّاف', 'أنا بريء والله', 'سكيب أحسن', 'مين كان لازق فيّا؟', 'كنت في القهوة', 'شفته جنب الزحمة', 'فتّشوه'];
const QUICK = ['كنت عند الصرّاف', 'شفت حد بيدسّ حاجة', 'أنا بريء والله', 'سكيب أحسن', 'الدرج كان فيه مضروب', 'مين قطع الكهربا؟', 'كنت في القهوة', 'شفته جنب البسطة'];

// ---------- أدوات ----------
const rand = (a) => a[Math.floor(Math.random() * a.length)];
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const now = () => Date.now() / 1000;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
function distToRect(px, py, r) {
  const dx = Math.max(r.x - px, 0, px - (r.x + r.w));
  const dy = Math.max(r.y - py, 0, py - (r.y + r.h));
  return Math.hypot(dx, dy);
}
function collides(x, y) {
  const r = CFG.radius;
  if (x < r || y < r || x > MAP.w - r || y > MAP.h - r) return true;
  return SOLIDS.some((s) => distToRect(x, y, s) < r);
}
function makeCode() {
  const L = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let c;
  do { c = Array.from({ length: 4 }, () => rand([...L])).join(''); } while (rooms.has(c));
  return c;
}

// ---------- الغرف ----------
const rooms = new Map();
let nextId = 1;

function createRoom(isPublic) {
  const room = {
    code: makeCode(), public: !!isPublic, players: new Map(), hostId: null, phase: 'lobby',
    settings: { ...DEFAULT_SETTINGS }, boxes: [], buyers: [], meeting: null, winner: null,
    blackout: null, blackoutReady: 0,
  };
  rooms.set(room.code, room);
  return room;
}

function addPlayer(room, { name, ws = null, bot = false }) {
  const used = new Set([...room.players.values()].map((p) => p.color));
  const p = {
    id: nextId++, name: (name || 'تاجر').slice(0, 14), ws, bot, token: Math.random().toString(36).slice(2) + Date.now().toString(36),
    color: COLORS.find((c) => !used.has(c)) || rand(COLORS), hat: rand(HATS),
    x: 900, y: 700, input: { x: 0, y: 0 }, face: 1,
    alive: true, role: 'trader', wallet: [], list: [], bought: [],
    cd: {}, meetingsLeft: 1, inspecting: null, ai: {}, wins: 0,
  };
  room.players.set(p.id, p);
  if (!room.hostId && !bot) room.hostId = p.id;
  return p;
}

function send(p, msg) {
  if (p.ws && p.ws.readyState === 1) p.ws.send(JSON.stringify(msg));
}
function broadcast(room, msg) { for (const p of room.players.values()) send(p, msg); }
function toast(p, text, kind = 'info') { send(p, { t: 'toast', text, kind }); }
function fx(p, kind) { send(p, { t: 'fx', kind }); }
function fxAll(room, kind) { broadcast(room, { t: 'fx', kind }); }

function lobbyState(room) {
  broadcast(room, {
    t: 'lobby', code: room.code, hostId: room.hostId, settings: room.settings, public: room.public,
    players: [...room.players.values()].map((p) => ({ id: p.id, name: p.name, color: p.color, hat: p.hat, bot: p.bot, wins: p.wins })),
  });
}

// ---------- بداية اللعبة ----------
function fakerCount(room) {
  const n = room.players.size;
  const auto = n >= 7 ? 2 : 1;
  return room.settings.fakers ? Math.min(room.settings.fakers, Math.floor((n - 1) / 3) || 1) : auto;
}

function startGame(room) {
  useMap(room);
  const ps = [...room.players.values()];
  if (ps.length < 4) return false;
  const thiefMode = room.settings.mode === 'thief';
  const nFake = thiefMode ? 0 : fakerCount(room);
  const order = shuffle([...ps]);
  room.boxes = MAP.stalls.map(() => []);
  room.buyers = MAP.stalls.map(() => []);
  room.phase = 'playing';
  room.winner = null;
  room.blackout = null;
  room.blackoutReady = now() + 20;
  room.closed = {};
  room.bodies = [];
  room.night = room.settings.mode === 'night' || room.settings.mode === 'office';
  room.office = MAP.theme === 'office';
  room.thiefMode = thiefMode;
  room.thiefGoal = thiefMode ? CFG.thiefModeGoal : CFG.thiefGoal;
  // كل مزوّر زيادة بيرفع الهدف عشان اللعبة تفضل متوازنة
  room.target = room.settings.fakeTarget + 4 * (nFake - 1);
  room.startedAt = now();
  const listSize = clamp(room.settings.listSize, 3, MAP.stalls.length);
  ps.forEach((p, i) => {
    p.role = order.indexOf(p) < nFake ? 'faker' : 'trader';
    p.alive = true;
    p.wallet = Array(CFG.startCoins).fill(false);
    p.list = shuffle(MAP.stalls.map((s) => s.id)).slice(0, listSize);
    p.bought = [];
    p.cd = { print: now() + 5, plant: now() + 15, inspect: now() + 8, close: now() + 20 };
    p.meetingsLeft = 1;
    p.inspecting = null;
    p.input = { x: 0, y: 0 };
    p.ai = { sus: {}, seen: [], evidence: [] };
    p.special = null;
    p.loot = 0;
    if (room.settings.mode === 'night') p.cd.kill = now() + 25;
    p.searchLeft = 0;
    spawn(p, i, ps.length);
  });
  // أدوار خاصة للتجار: أمين الشرطة من 5 لاعبين، والشحات من 6
  if (room.settings.specials && room.office) {
    // في الشركة: الأمن بس
    const g = shuffle(ps.filter((p) => p.role === 'trader'))[0];
    if (g && ps.length >= 4) g.special = 'guard';
  } else if (room.settings.specials) {
    const traders = shuffle(ps.filter((p) => p.role === 'trader'));
    if (ps.length >= 5 && traders[0]) { traders[0].special = 'police'; traders[0].searchLeft = 1; }
    if (ps.length >= 6 && traders[1] && !MAP.cams) traders[1].special = 'watcher';
    // في الشركة: واحد من الأمن بيقدر يفتح الكاميرات من أي مكان
    if (MAP.cams) { const g = traders.find((q) => !q.special) || traders[1]; if (g && ps.length >= 4) g.special = 'guard'; }
  }
  // مود الحرامي: حرامي واحد (اتنين من 8 لاعبين) وسط التجار
  if (thiefMode) {
    const n = ps.length >= 8 ? 2 : 1;
    shuffle(ps.filter((p) => p.role === 'trader' && !p.special)).slice(0, n).forEach((t) => { t.role = 'thief'; t.cd.steal = now() + 12; });
  } else if (room.settings.thief && ps.length >= 6 && !room.office) {
    // الحرامي: دور تالت لوحده، من 6 لاعبين
    const t = shuffle(ps.filter((p) => p.role === 'trader' && !p.special))[0];
    if (t) { t.role = 'thief'; t.cd.steal = now() + 15; }
  }
  room.nFake = nFake;
  room.stats = new Map(ps.map((p) => [p.id, {}]));
  for (const p of ps) send(p, startPayload(room, p));
  fxAll(room, 'start');
  return true;
}

function startPayload(room, p) {
  const ps = [...room.players.values()];
  const mates = ps.filter((q) => q.role === 'faker' && q.id !== p.id).map((q) => q.name);
  const { solids, grid, ...map } = MAP;
  return {
    t: 'start', role: p.role, mates: p.role === 'faker' ? mates : [], map, cfg: CFG, you: p.id,
    fakeTarget: room.target, nFake: room.nFake, special: p.special, thiefGoal: room.thiefGoal, thiefMode: !!room.thiefMode,
    mates2: p.role === 'thief' && room.thiefMode ? ps.filter((q) => q.role === 'thief' && q.id !== p.id).map((q) => q.name) : [],
    hasThief: ps.some((q) => q.role === 'thief'), elapsed: now() - room.startedAt, night: !!room.night, office: !!room.office, quick: room.office ? QUICK_OFFICE : room.thiefMode ? QUICK_THIEF : QUICK,
  };
}

// ---------- إحصائيات وأبطال الدور ----------
function bump(room, p, key, n = 1) {
  if (!room.stats || !n) return;
  const st = room.stats.get(p.id) || {};
  st[key] = (st[key] || 0) + n;
  room.stats.set(p.id, st);
}
const AWARDS = [
  ['fakesFound', '🔦', 'عين الصقر', (n) => `لقى ${n} ورق مضروب`],
  ['haggled', '🤝', 'ملك الفصال', (n) => `فاصل صح ${n} مرات`],
  ['printed', '🖨️', 'المطبعة', (n) => `طبع ${n} ورقة مضروبة`],
  ['stolen', '🦹', 'إيده خفيفة', (n) => `نشل ${n} جنيه`],
  ['fixes', '⚡', 'الكهربائي', (n) => `رجّع الكهربا ${n} مرة`],
  ['goodVotes', '🕵️', 'المحقق', (n) => `صوّت صح ${n} مرة`],
  ['tasks', '💼', 'موظف الشهر', (n) => `خلّص ${n} مهام`],
  ['camsUsed', '📹', 'عين على كل حاجة', (n) => `فتح الكاميرات ${n} مرة`],
  ['kills', '💥', 'إيده تقيلة', (n) => `ضرب ${n} ${n > 2 ? 'تجار' : 'تاجر'}`],
  ['reports', '📢', 'عين الحارة', (n) => `بلّغ ${n} مرة`],
  ['planted', '🤫', 'إيد في كل جيب', (n) => `دسّ ${n} ورقة في جيوب الناس`],
  ['bought', '🛒', 'أشطر مشتري', (n) => `اشترى ${n} حاجة`],
];
function awards(room) {
  const out = [];
  for (const [key, icon, title, detail] of AWARDS) {
    let best = null, max = 0;
    for (const [id, st] of room.stats || []) if ((st[key] || 0) > max) { max = st[key]; best = room.players.get(id); }
    if (best) out.push({ icon, title, name: best.name, color: best.color, detail: detail(max) });
    if (out.length >= 4) break;
  }
  return out;
}

function spawn(p, i, n) {
  const sp = MAP.spawn || { x: 900, y: 600, rx: 170, ry: 140 };
  const a = (i / n) * Math.PI * 2;
  p.x = sp.x + Math.cos(a) * sp.rx;
  p.y = sp.y + Math.sin(a) * sp.ry;
  for (let k = 0; k < 20 && collides(p.x, p.y); k++) { p.x = sp.x + (Math.random() - 0.5) * sp.rx * 2; p.y = sp.y + (Math.random() - 0.5) * sp.ry * 2; }
}

// ---------- حسابات ----------
function circulation(room) {
  let n = 0;
  for (const b of room.boxes) n += b.filter((c) => c.fake).length;
  for (const p of room.players.values()) if (p.role !== 'faker') n += p.wallet.filter(Boolean).length;
  return n;
}
function progress(room) {
  // التاجر حتى لو اتطرد بيكمّل مشترياته كشبح، فكل الليستات محسوبة
  let need = 0, got = 0;
  for (const p of room.players.values()) {
    if (p.role !== 'trader') continue;
    got += p.list.filter((i) => p.bought.includes(i)).length;
    need += p.list.length;
  }
  return need ? got / need : 0;
}
function checkWin(room) {
  if (room.phase !== 'playing' && room.phase !== 'meeting') return;
  const alive = [...room.players.values()].filter((p) => p.alive);
  const fakers = alive.filter((p) => p.role === 'faker').length;
  const traders = alive.length - fakers;
  let w = null, why = '';
  if (room.thiefMode) {
    const thieves = alive.filter((p) => p.role === 'thief');
    const loot = [...room.players.values()].reduce((n, p) => n + (p.role === 'thief' ? p.loot : 0), 0);
    if (loot >= room.thiefGoal) { w = 'thief'; why = `الحرامي لمّ ${loot} جنيه من جيوب الناس وهرب! 🏃‍♂️💨`; }
    else if (!thieves.length) { w = 'trader'; why = 'التجار مسكوا الحرامي 🚔'; }
    else if (thieves.length >= alive.length - thieves.length) { w = 'thief'; why = 'التجار طردوا بعض والحرامي فضل لوحده معاهم'; }
    else if (progress(room) >= 1) { w = 'trader'; why = 'التجار خلّصوا مشترياتهم قبل ما الحرامي يلم فلوسه'; }
    if (w) endGame(room, w, why);
    return;
  }
  const thief = alive.find((p) => p.role === 'thief' && p.loot >= CFG.thiefGoal);
  if (thief) { w = 'thief'; why = `${thief.name} الحرامي هرب بـ ${thief.loot} جنيه من جيوب الناس!`; }
  else if (fakers === 0) { w = 'trader'; why = room.office ? 'الموظفين طردوا القاتل' : 'التجار طردوا كل المزوّرين'; }
  else if (fakers >= traders) { w = 'faker'; why = room.office ? 'القتلة بقوا قد الموظفين' : 'المزوّرين بقوا قد التجار'; }
  else if (!room.office && circulation(room) >= room.target) { w = 'faker'; why = 'السوق غرق في الفلوس المضروبة'; }
  else if (progress(room) >= 1) { w = 'trader'; why = room.office ? 'الموظفين خلّصوا كل المهام' : 'التجار خلّصوا كل المشتريات'; }
  if (w) endGame(room, w, why);
}
function endGame(room, winner, why) {
  room.phase = 'ended';
  room.meeting = null;
  room.blackout = null;
  room.winner = winner;
  for (const p of room.players.values()) {
    if (p.role === winner) p.wins++;
    fx(p, p.role === winner ? 'win' : 'lose');
  }
  room.lastEnd = {
    t: 'end', winner, why, thiefMode: !!room.thiefMode, circ: room.thiefMode ? [...room.players.values()].reduce((n, p) => n + (p.role === 'thief' ? p.loot : 0), 0) : circulation(room), prog: progress(room), awards: awards(room),
    players: [...room.players.values()].map((p) => ({ id: p.id, name: p.name, color: p.color, hat: p.hat, role: p.role, special: p.special, wins: p.wins, alive: p.alive })),
  };
  broadcast(room, room.lastEnd);
}

// ---------- أفعال اللاعب ----------
function nearestStall(p) {
  let best = null, bd = CFG.reach;
  for (const s of MAP.stalls) { const d = distToRect(p.x, p.y, s); if (d < bd) { bd = d; best = s; } }
  return best;
}
function near(p, r) { return distToRect(p.x, p.y, r) < CFG.reach; }
function ready(p, key) { return !p.cd[key] || p.cd[key] <= now(); }
function cdLeft(p, key) { return Math.max(0, Math.ceil((p.cd[key] || 0) - now())); }

function pay(p) {
  // المزوّر بيدفع بالمضروب الأول، التاجر بيدفع من غير ما يعرف
  if (p.role === 'faker') p.wallet.sort((a, b) => b - a);
  else shuffle(p.wallet);
  return p.wallet.splice(0, CFG.price);
}

function doUse(room, p) {
  if (room.phase !== 'playing') return;
  if (p.alive && near(p, MAP.power)) {
    if (!room.blackout) return toast(p, 'الموتور شغال تمام');
    if (p.role === 'faker') return toast(p, 'عملت نفسك بتصلّح.. 😏');
    room.blackout = null;
    bump(room, p, 'fixes');
    fxAll(room, 'fixed');
    broadcast(room, { t: 'toast', text: `⚡ ${p.name} رجّع الكهربا`, kind: 'info' });
    return;
  }
  if (p.alive && MAP.camRoom && near(p, MAP.camRoom)) return doCams(room, p, true);
  if (p.alive && near(p, MAP.boss)) {
    if (room.blackout) return toast(p, 'المعلم مش سامعك في الضلمة.. صلّحوا الكهربا الأول');
    if (p.meetingsLeft <= 0) return toast(p, 'استخدمت النداء بتاعك خلاص');
    p.meetingsLeft--;
    return startMeeting(room, p);
  }
  if (room.office && near(p, MAP.changer)) return toast(p, 'الخزنة مقفولة بالكود 🔐');
  if (near(p, MAP.changer)) {
    if (!ready(p, 'changer')) return toast(p, `الصرّاف مشغول.. استنى ${cdLeft(p, 'changer')} ثانية`);
    p.cd.changer = now() + CFG.changerCd;
    let msg, kind = 'info';
    if (p.role === 'faker') msg = 'الصرّاف عدّ فلوسك.. كله تمام (ورقك محدش يقدر يكشفه هنا)';
    else {
      const fakes = p.wallet.filter(Boolean).length;
      p.wallet = p.wallet.filter((c) => !c);
      msg = fakes ? `الصرّاف لقى ${fakes} ورقة مضروبة في محفظتك واتصادرت!` : 'محفظتك نضيفة، مفيش ولا ورقة مضروبة';
      if (fakes) kind = 'warn';
    }
    if (p.wallet.length < CFG.price) { p.wallet.push(false, false, false); msg += ' · وسلّفك 3 جنيه'; }
    fx(p, 'coin');
    return toast(p, msg, kind);
  }
  const s = nearestStall(p);
  if (!s) return;
  if (!p.alive && p.role !== 'trader') return;
  if (room.office) return doTask(room, p, s);
  if (isClosed(room, s.id)) return toast(p, `بسطة ${s.item} مقفولة دلوقتي 🔒.. استنى ${Math.ceil(room.closed[s.id] - now())} ثانية`);
  if (p.role === 'trader' && p.list.includes(s.id) && p.bought.includes(s.id)) return toast(p, `انت اشتريت ${s.item} خلاص`);
  if (!p.list.includes(s.id) && p.role === 'trader') return toast(p, `${s.item} مش في ليستتك`);
  if (p.wallet.length < CFG.price) return toast(p, 'فلوسك مش مكفية.. روح للصرّاف');
  // الفصال: لعبة صغيرة قبل الشراء، لو نجحت البياع بيرجعلك باقي أكتر
  if (p.bot) return buy(room, p, s, Math.random() < 0.55);
  p.haggle = { stall: s.id, until: now() + 7 };
  send(p, { t: 'haggle', stall: s.id, item: s.item, icon: s.icon });
}

function finishHaggle(room, p, good) {
  const h = p.haggle;
  p.haggle = null;
  if (!h || now() > h.until || room.phase !== 'playing') return;
  const s = MAP.stalls[h.stall];
  if (distToRect(p.x, p.y, s) > CFG.reach + 10) return toast(p, 'بعدت عن البسطة فالفصال باظ');
  if (isClosed(room, s.id)) return toast(p, `بسطة ${s.item} قفلت في وشك 🔒`);
  if (p.wallet.length < CFG.price) return;
  buy(room, p, s, !!good);
}

function buy(room, p, s, good) {
  const coins = pay(p);
  const box = room.boxes[s.id];
  const t = now();
  coins.forEach((fake) => box.push({ fake, t }));
  const nChange = good ? 2 : 1;
  for (let i = 0; i < nChange && box.length; i++) p.wallet.push(box.splice(Math.floor(Math.random() * box.length), 1)[0].fake);
  if (p.alive) room.buyers[s.id].push({ id: p.id, t });
  if (!p.bought.includes(s.id)) p.bought.push(s.id);
  bump(room, p, 'bought');
  if (good) bump(room, p, 'haggled');
  fx(p, 'coin');
  toast(p, good ? `🤝 فاصلت صح! اشتريت ${s.icon} ${s.item} وخدت ${nChange} جنيه باقي` : `اشتريت ${s.icon} ${s.item} وخدت جنيه باقي`);
  checkWin(room);
}

// مهمة في الشركة: تقف قدام الجهاز كام ثانية (القاتل بيعمل نفسه شغال)
function doTask(room, p, s) {
  if (isClosed(room, s.id)) return toast(p, `ال${s.item} عطلان دلوقتي ⚠️`);
  if (p.role === 'trader') {
    if (!p.list.includes(s.id)) return toast(p, `"${s.task}" مش من مهامك`);
    if (p.bought.includes(s.id)) return toast(p, `خلّصت "${s.task}" خلاص`);
  }
  p.inspecting = { stall: s.id, until: now() + CFG.taskTime, task: true, total: CFG.taskTime };
}
function finishTask(room, p) {
  const s = MAP.stalls[p.inspecting.stall];
  p.inspecting = null;
  if (p.role !== 'trader') return toast(p, 'عملت نفسك شغال 😏');
  if (!p.bought.includes(s.id)) p.bought.push(s.id);
  bump(room, p, 'tasks');
  fx(p, 'fixed');
  toast(p, `✅ خلّصت: ${s.task}`);
  checkWin(room);
}

function doInspect(room, p) {
  if (!p.alive || room.phase !== 'playing' || room.office || room.thiefMode) return;
  const s = nearestStall(p);
  if (!s) return toast(p, 'قرّب من بسطة عشان تكشف على درجها');
  if (isClosed(room, s.id)) return toast(p, `بسطة ${s.item} مقفولة 🔒`);
  if (!ready(p, 'inspect')) return toast(p, `الكشاف بيشحن.. ${cdLeft(p, 'inspect')} ثانية`);
  p.inspecting = { stall: s.id, until: now() + CFG.inspectTime };
}

function finishInspect(room, p) {
  const s = MAP.stalls[p.inspecting.stall];
  p.inspecting = null;
  p.cd.inspect = now() + CFG.inspectCd;
  const t = now();
  const box = room.boxes[s.id];
  const fakes = box.filter((c) => c.fake);
  // البياع بيفتكر مين اشترى منه آخر شوية (من غير ترتيب)
  const recent = [...new Set(room.buyers[s.id].filter((b) => t - b.t < CFG.buyerWindow && b.id !== p.id).map((b) => b.id))];
  room.buyers[s.id] = [];
  const names = shuffle(recent.map((id) => room.players.get(id)).filter(Boolean)).slice(0, 4);
  const who = names.length ? ` · ${MAP.vendor} بيقول اشترى منه: ${names.map((q) => q.name).join('، ')}` : ` · ${MAP.vendor} مش فاكر حد اشترى منه قريب`;
  if (!fakes.length) { if (p.bot) botAfterInspect(room, p, s, 0, names, 0); fx(p, 'clean'); return toast(p, `درج ${s.item} نضيف${who}`); }
  const last = Math.max(...fakes.map((c) => c.t));
  if (p.bot) botAfterInspect(room, p, s, fakes.length, names, last);
  const ago = Math.max(5, Math.round((t - last) / 5) * 5);
  room.boxes[s.id] = box.filter((c) => !c.fake);
  bump(room, p, 'fakesFound', fakes.length);
  fx(p, 'alert');
  toast(p, `🔦 لقيت ${fakes.length} ورقة مضروبة في درج ${s.item} وصادرتها! آخر واحدة دخلت من حوالي ${ago} ثانية${who}`, 'warn');
}

function doPrint(room, p) {
  if (p.role !== 'faker' || !p.alive || room.phase !== 'playing' || room.office) return;
  if (!ready(p, 'print')) return toast(p, `المطبعة بتسخن.. ${cdLeft(p, 'print')} ثانية`);
  p.cd.print = now() + CFG.printCd;
  p.wallet.push(true);
  bump(room, p, 'printed');
  fx(p, 'print');
  toast(p, 'طبعت ورقة مضروبة 🖨️');
}

function doPlant(room, p) {
  if (p.role !== 'faker' || !p.alive || room.phase !== 'playing' || room.office) return;
  if (!ready(p, 'plant')) return toast(p, `استنى ${cdLeft(p, 'plant')} ثانية`);
  const idx = p.wallet.indexOf(true);
  if (idx < 0) return toast(p, 'معاكش ورق مضروب تدسّه.. اطبع الأول');
  let target = null, bd = 60;
  for (const q of room.players.values()) {
    if (q === p || !q.alive || q.role === 'faker') continue;
    const d = Math.hypot(q.x - p.x, q.y - p.y);
    if (d < bd) { bd = d; target = q; }
  }
  if (!target) return toast(p, 'مفيش حد قريب منك');
  p.wallet.splice(idx, 1);
  target.wallet.push(true);
  bump(room, p, 'planted');
  p.cd.plant = now() + CFG.plantCd;
  witness(room, p, `👀 شفت ${p.name} بيدسّ حاجة في جيب ${target.name}!`, [target.id]);
  fx(p, 'plant');
  toast(p, `دسّيت ورقة مضروبة في جيب ${target.name} 🤫`);
  checkWin(room);
}

function isClosed(room, id) { return room.closed[id] && room.closed[id] > now(); }

// الشحات قاعد في السوق وبيلاحظ اللي بيحصل حواليه
function wallBetween(x0, y0, x1, y1) {
  if (!MAP.walls) return false;
  const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 10);
  for (let i = 1; i < n; i++) {
    const k = i / n, x = x0 + (x1 - x0) * k, y = y0 + (y1 - y0) * k;
    if (MAP.walls.some((w) => x >= w.x && x <= w.x + w.w && y >= w.y && y <= w.y + w.h)) return true;
  }
  return false;
}
// الكاميرات اللي شايفة نقطة معينة
function camsSee(x, y) {
  return (MAP.cams || []).filter((c) => Math.hypot(c.x - x, c.y - y) < CFG.camRange && !wallBetween(c.x, c.y, x, y));
}
// اللي قاعدين على الكاميرات وشايفين المكان ده
function camWatchers(room, x, y, except) {
  const cams = camsSee(x, y);
  if (!cams.length) return [];
  return [...room.players.values()].filter((w) => w.watching && w.alive && w !== except).map((w) => ({ w, cam: cams[0] }));
}
function stopWatching(p) {
  if (!p.watching) return;
  if (p.watching.remote) p.cd.cams = now() + CFG.guardCamCd;
  p.watching = null;
  send(p, { t: 'camsOff' });
}
function doCams(room, p, on) {
  if (!on) return stopWatching(p);
  if (!MAP.cams || !p.alive || room.phase !== 'playing' || p.watching) return;
  if (MAP.camRoom && distToRect(p.x, p.y, MAP.camRoom) < CFG.reach) p.watching = { remote: false };
  else if (p.special === 'guard') {
    if (!ready(p, 'cams')) return toast(p, `جهاز الكاميرات بيشحن.. ${cdLeft(p, 'cams')} ثانية`);
    p.watching = { remote: true, until: now() + CFG.guardCamTime };
  } else return toast(p, 'روح غرفة الكاميرات عشان تتفرج');
  p.inspecting = null; p.input = { x: 0, y: 0 };
  bump(room, p, 'camsUsed');
  send(p, { t: 'camsOn', remote: p.watching.remote, until: p.watching.until ? CFG.guardCamTime : 0 });
}

function witness(room, actor, text, skip = []) {
  // الكاميرات بتشوف كمان
  for (const { w, cam } of camWatchers(room, actor.x, actor.y, actor)) {
    if (skip.includes(w.id)) continue;
    toast(w, `📹 كاميرا ${cam.name}: ${text.replace('👀 شفت ', 'شفت ')}`, 'warn');
    fx(w, 'alert');
    if (w.bot) addSus(w, actor.id, 6, `شفت على كاميرا ${cam.name}: ${text.replace('👀 شفت ', '')}`);
  }
  for (const w of room.players.values()) {
    if (w.special !== 'watcher' || !w.alive || w === actor || skip.includes(w.id)) continue;
    if (Math.hypot(w.x - actor.x, w.y - actor.y) > CFG.watchRange || wallBetween(w.x, w.y, actor.x, actor.y)) continue;
    toast(w, text, 'warn');
    fx(w, 'alert');
    if (w.bot) { addSus(w, actor.id, 5, text.replace('👀 ', '')); botEmote(room, w, '👀'); }
  }
}

function doClose(room, p) {
  if (p.role !== 'faker' || !p.alive || room.phase !== 'playing') return;
  if (!ready(p, 'close')) return toast(p, `استنى ${cdLeft(p, 'close')} ثانية`);
  const s = nearestStall(p);
  if (!s) return toast(p, 'قرّب من بسطة عشان تقفلها');
  if (isClosed(room, s.id)) return toast(p, 'البسطة دي مقفولة أصلاً');
  room.closed[s.id] = now() + CFG.closeTime;
  p.cd.close = now() + CFG.closeCd;
  fxAll(room, 'shutter');
  broadcast(room, { t: 'toast', text: MAP.theme === 'office' ? `🔒 ال${s.item} عطل فجأة! (${CFG.closeTime} ثانية)` : `🔒 بياع ال${s.item} قفل بسطته فجأة! (${CFG.closeTime} ثانية)`, kind: 'warn' });
  witness(room, p, `👀 شفت ${p.name} بيعبث في ال${s.item} قبل ما يقفل!`);
}

function doSearch(room, p) {
  if (p.special !== 'police' || !p.alive || room.phase !== 'playing') return;
  if (p.searchLeft <= 0) return toast(p, 'استخدمت التفتيش بتاعك خلاص');
  let target = null, bd = CFG.searchReach;
  for (const q of room.players.values()) {
    if (q === p || !q.alive) continue;
    const d = Math.hypot(q.x - p.x, q.y - p.y);
    if (d < bd) { bd = d; target = q; }
  }
  if (!target) return toast(p, 'قرّب من حد عشان تفتّشه');
  p.searchLeft--;
  const fakes = target.wallet.filter(Boolean).length;
  const money = target.wallet.length + (target.loot || 0);
  if (room.thiefMode) {
    // في مود الحرامي التفتيش بيعد الفلوس بس، والحرامي جيبه تقيل
    const heavy = money >= 9;
    fx(p, heavy ? 'alert' : 'clean');
    toast(p, `👮 فتّشت ${target.name}: معاه ${money} جنيه` + (heavy ? ' .. فلوس كتير بشكل مريب 🤨' : ' .. عادي'), heavy ? 'warn' : 'info');
    toast(target, `👮 ${p.name} فتّش جيبك!`, 'warn');
    if (p.bot) { if (heavy) addSus(p, target.id, 4, `فتّشت ${target.name} ولقيت معاه ${money} جنيه.. جابهم منين؟`); else { p.ai.sus[target.id] = -2; p.ai.evidence.push({ id: target.id, text: `فتّشت ${target.name} ومعاهوش غير ${money} جنيه`, w: 0 }); } }
    if (target.bot) addSus(target, p.id, 0.5);
    return;
  }
  const rich = money >= 9 ? ` · ومعاه ${money} جنيه.. فلوس كتير بشكل مريب 🤨` : ` · ومعاه ${money} جنيه`;
  fx(p, fakes ? 'alert' : 'clean');
  toast(p, (fakes
    ? `👮 فتّشت ${target.name}: معاه ${fakes} ورق مضروب! (ممكن يكون حد دسّهم له.. أو هو المزوّر)`
    : `👮 فتّشت ${target.name}: مفيش مضروب`) + rich, fakes || money >= 9 ? 'warn' : 'info');
  if (p.bot && money >= 9) addSus(p, target.id, 3, `فتّشت ${target.name} ولقيت معاه ${money} جنيه.. جابهم منين؟`);
  toast(target, `👮 ${p.name} فتّش جيبك!`, 'warn');
  if (p.bot) {
    if (fakes) addSus(p, target.id, fakes * 2, `فتّشت ${target.name} ولقيت معاه ${fakes} ورق مضروب`);
    else { p.ai.sus[target.id] = -3; p.ai.evidence.push({ id: target.id, text: `فتّشت ${target.name} وجيبه نضيف`, w: 0 }); }
  }
  if (target.bot) addSus(target, p.id, 0.5);
}

function doSteal(room, p) {
  if (p.role !== 'thief' || !p.alive || room.phase !== 'playing') return;
  if (!ready(p, 'steal')) return toast(p, `إيدك لسه سخنة.. استنى ${cdLeft(p, 'steal')} ثانية`);
  let target = null, bd = CFG.stealReach;
  for (const q of room.players.values()) {
    if (q === p || !q.alive || !q.wallet.length) continue;
    const d = Math.hypot(q.x - p.x, q.y - p.y);
    if (d < bd) { bd = d; target = q; }
  }
  if (!target) return toast(p, 'مفيش جيب قريب فيه فلوس');
  if (room.thiefMode && target.role === 'thief') return toast(p, 'ده زميلك يا معلم 😅');
  p.cd.steal = now() + CFG.stealCd;
  shuffle(target.wallet);
  const taken = target.wallet.splice(0, Math.min(2, target.wallet.length));
  const real = taken.filter((c) => !c).length, fake = taken.length - real;
  p.loot += real;
  for (let i = 0; i < fake; i++) p.wallet.push(true);
  bump(room, p, 'stolen', real);
  fx(p, 'steal');
  toast(p, `🦹 نشلت ${taken.length} من ${target.name}` + (fake ? ` (${fake} منهم طلع مضروب 🤦)` : '') + ` · معاك ${p.loot}/${room.thiefGoal}`);
  witness(room, p, `👀 شفت ${p.name} بيمد إيده في جيب ${target.name}!`, [target.id]);
  const victimId = target.id, at = now(), where = placeName(target.x, target.y);
  if (room.thiefMode) {
    room.thefts = (room.thefts || 0) + 1;
    // اللي واقفين قريب ممكن يحسّوا بزقة، من غير ما يعرفوا مين بالظبط
    for (const w of room.players.values()) {
      if (w === p || w === target || !w.alive || w.role === 'thief' || w.special === 'watcher') continue;
      const d = Math.hypot(w.x - target.x, w.y - target.y);
      if (d > 200 || wallBetween(w.x, w.y, target.x, target.y) || Math.random() > 0.45) continue;
      toast(w, `🤨 حسّيت بزقة غريبة جنب ${target.name}.. حد كان لازق فيه`, 'warn');
      if (w.bot) {
        const close = alivePlayers(room).filter((q) => q !== w && q !== target && Math.hypot(q.x - target.x, q.y - target.y) < 90);
        for (const q of close) addSus(w, q.id, 1.5, `حسّيت بزقة جنب ${target.name} عند ${where}، و${q.name} كان لازق فيه`);
      }
    }
  }
  setTimeout(() => {
    const v = room.players.get(victimId);
    if (!v || room.phase === 'lobby' || room.phase === 'ended') return;
    useMap(room);
    toast(v, room.thiefMode ? `💸 جيبك خف ${taken.length} جنيه! حد نشلك من شوية عند ${where}` : '💸 حسّيت إن جيبك خف! حد نشل منك وانت مش واخد بالك', 'warn');
    fx(v, 'alert');
    if (room.thiefMode && !v.bot) for (const q of room.players.values()) if (q.bot && q.alive && q.role !== 'thief') addSus(q, v.id, -0.5);
    if (v.bot) {
      const near = new Set(v.ai.seen.filter((e) => Math.abs(e.t - at) < 5 && e.id !== v.id).map((e) => e.id));
      for (const id of near) { const q = room.players.get(id); if (q) addSus(v, id, room.thiefMode ? 2.5 : 2, `حد نشل من جيبي عند ${where}، و${q.name} كان لازق فيّا ساعتها`); }
      v.ai.robbed = where;
    }
  }, 4000);
  checkWin(room);
}

// ---------- مود ليلة السوق: ضرب وبلاغ ----------
function placeName(x, y) {
  const room = (MAP.rooms || []).find((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
  if (room) return room.name;
  let best = null, bd = Infinity;
  for (const r of [...MAP.stalls, MAP.changer, MAP.boss, MAP.power, MAP.cafe]) {
    const d = distToRect(x, y, r);
    if (d < bd) { bd = d; best = r; }
  }
  if (!best) return 'السوق';
  if (best.item) return `بسطة ال${best.item}`;
  return best === MAP.changer ? 'الصرّاف' : best === MAP.boss ? 'معلم السوق' : best === MAP.power ? 'الموتور' : best.name || 'القهوة';
}

function doKill(room, p) {
  if (!room.night || p.role !== 'faker' || !p.alive || room.phase !== 'playing' || p.hidden != null) return;
  if (!ready(p, 'kill')) return toast(p, `لسه بدري.. استنى ${cdLeft(p, 'kill')} ثانية`);
  let target = null, bd = CFG.killReach;
  for (const q of room.players.values()) {
    if (q === p || !q.alive || q.role === 'faker') continue;
    const d = Math.hypot(q.x - p.x, q.y - p.y);
    if (d < bd) { bd = d; target = q; }
  }
  if (!target) return toast(p, 'مفيش حد قريب منك');
  p.cd.kill = now() + CFG.killCd;
  target.alive = false;
  stopWatching(target);
  target.inspecting = null;
  target.haggle = null;
  room.bodies.push({ id: target.id, name: target.name, color: target.color, hat: target.hat, x: target.x, y: target.y, t: now(), by: p.id });
  // المزوّر بيتزق شوية لورا عشان ميبقاش واقف فوق الجثة
  bump(room, p, 'kills');
  fx(p, 'hit'); fx(target, 'hit');
  send(target, { t: 'knocked', by: null });
  toast(target, '💥 حد ضربك من ورا وأغمى عليك! بقيت شبح.. لو تاجر لسه تقدر تكمّل مشترياتك', 'warn');
  toast(p, `💥 ضربت ${target.name}.. امشي من هنا بسرعة`);
  witness(room, p, `👀 شفت ${p.name} بيضرب ${target.name}!`, [target.id]);
  checkWin(room);
}

// ---------- المخابئ السرية ----------
function nearHide(p) { return (MAP.hides || []).find((h) => Math.hypot(h.x - p.x, h.y - p.y) < CFG.hideReach); }
function puff(room, h, text) {
  // اللي شايف المخبأ بيشوفه بيتهز
  for (const q of room.players.values()) {
    if (!q.alive || q.hidden != null) continue;
    if (Math.hypot(q.x - h.x, q.y - h.y) < CFG.vision * 0.9 && !wallBetween(q.x, q.y, h.x, h.y)) {
      send(q, { t: 'puff', x: h.x, y: h.y });
      if (text) toast(q, text, 'warn');
    }
  }
}
function doHide(room, p) {
  if (!room.night || p.role !== 'faker' || !p.alive || room.phase !== 'playing') return;
  if (!ready(p, 'hide')) return;
  p.cd.hide = now() + 1.5;
  if (p.hidden != null) {
    const h = MAP.hides[p.hidden];
    p.hidden = null;
    send(p, { t: 'hideState', hidden: null });
    puff(room, h, `🚪 ${h.name} اتهز وحد طلع منه!`);
    witness(room, p, `👀 شفت ${p.name} طالع من ${h.name}!`);
    return;
  }
  const h = nearHide(p);
  if (!h) return toast(p, 'مفيش مخبأ هنا');
  witness(room, p, `👀 شفت ${p.name} داخل ${h.name}!`);
  p.hidden = h.id; p.x = h.x; p.y = h.y; p.input = { x: 0, y: 0 }; p.inspecting = null;
  bump(room, p, 'hid');
  puff(room, h);
  send(p, { t: 'hideState', hidden: h.id });
}
function doTunnel(room, p, to) {
  if (p.hidden == null || room.phase !== 'playing') return;
  const h = MAP.hides[p.hidden];
  const next = h.link.includes(to) ? to : h.link[0];
  const n = MAP.hides[next];
  p.hidden = n.id; p.x = n.x; p.y = n.y;
  send(p, { t: 'hideState', hidden: n.id });
}
function unhideAll(room) {
  for (const p of room.players.values()) if (p.hidden != null) { p.hidden = null; send(p, { t: 'hideState', hidden: null }); }
}

function nearBody(room, p) {
  return room.bodies.find((b) => Math.hypot(b.x - p.x, b.y - p.y) < CFG.reportReach);
}

function doReport(room, p) {
  if (!room.night || !p.alive || room.phase !== 'playing') return;
  const b = nearBody(room, p);
  if (!b) return toast(p, 'مفيش حد مرمي جنبك');
  bump(room, p, 'reports');
  startMeeting(room, p, b);
}

function doBlackout(room, p) {
  if (p.role !== 'faker' || !p.alive || room.phase !== 'playing') return;
  if (room.blackout) return toast(p, 'الكهربا قاطعة أصلاً');
  if (room.blackoutReady > now()) return toast(p, `الموتور لسه سخن.. ${Math.ceil(room.blackoutReady - now())} ثانية`);
  room.blackout = { ends: now() + CFG.blackoutTime };
  room.blackoutReady = now() + CFG.blackoutCd + CFG.blackoutTime;
  fxAll(room, 'alarm');
  broadcast(room, { t: 'toast', text: `⚡ الكهربا قطعت! حد يروح للموتور يصلّحه قبل ${CFG.blackoutTime} ثانية وإلا الورق المضروب هيتسرّب في السوق`, kind: 'warn' });
}

function tickBlackout(room) {
  if (!room.blackout || now() < room.blackout.ends) return;
  room.blackout = null;
  for (let i = 0; i < CFG.blackoutLeak; i++) room.boxes[Math.floor(Math.random() * room.boxes.length)].push({ fake: true, t: now() });
  fxAll(room, 'alert');
  broadcast(room, { t: 'toast', text: `🌑 محدش صلّح الكهربا.. ${CFG.blackoutLeak} ورق مضروب اتسرّب في أدراج السوق`, kind: 'warn' });
  checkWin(room);
}

// ---------- الاجتماع ----------
function startMeeting(room, caller, body = null) {
  room.phase = 'meeting';
  room.blackout = null;
  const t = now();
  const report = body ? `📢 ${caller.name} لقى ${body.name} مرمي جنب ${placeName(body.x, body.y)}` : null;
  room.meeting = { caller: caller.name, report, body: body ? body.id : null, stage: 'discuss', ends: t + CFG.discussTime, votes: {}, chat: [] };
  if (body && caller.bot) caller.ai.reported = body;
  if (body) {
    for (const b of room.players.values()) {
      if (!b.bot || !b.alive || b.role !== 'trader') continue;
      const near = new Set(b.ai.seen.filter((e) => e.id !== body.id && Math.abs(e.t - body.t) < 10 && Math.hypot(e.x - body.x, e.y - body.y) < 220).map((e) => e.id));
      for (const id of near) {
        const q = room.players.get(id);
        if (q) addSus(b, id, 2.5, `أنا شفت ${q.name} جنب ${placeName(body.x, body.y)} قبل ما ${body.name} يتلاقى مرمي`);
      }
    }
  }
  room.bodies = [];
  unhideAll(room);
  for (const p of room.players.values()) { stopWatching(p); p.inspecting = null; p.input = { x: 0, y: 0 }; p.ai.voteAt = null; p.ai.said = 0; p.ai.replied = new Set(); }
  fxAll(room, 'bell');
  broadcast(room, { t: 'meeting', caller: caller.name, report });
  for (const p of room.players.values()) if (p.bot && p.alive) botMeetingTalk(room, p);
  meetingState(room);
}

function meetingState(room) {
  const m = room.meeting;
  const show = m.stage === 'result';
  broadcast(room, {
    t: 'mstate', stage: m.stage, left: m.ends - now(), caller: m.caller, report: m.report, chat: m.chat.slice(-50), result: m.result || null,
    voted: Object.keys(m.votes).map(Number),
    votes: show ? m.votes : null,
    players: [...room.players.values()].map((p) => ({ id: p.id, name: p.name, color: p.color, hat: p.hat, alive: p.alive })),
  });
}

function tickMeeting(room) {
  const m = room.meeting;
  const t = now();
  const alive = [...room.players.values()].filter((p) => p.alive);
  if (m.stage === 'discuss' && t >= m.ends) {
    m.stage = 'vote'; m.ends = t + CFG.voteTime; meetingState(room);
  } else if (m.stage === 'vote' && (t >= m.ends || alive.every((p) => m.votes[p.id] !== undefined))) {
    const tally = {};
    for (const v of Object.values(m.votes)) tally[v] = (tally[v] || 0) + 1;
    let top = null, max = 0, tie = false;
    for (const [k, n] of Object.entries(tally)) {
      if (n > max) { max = n; top = k; tie = false; } else if (n === max) tie = true;
    }
    let text, out = null;
    const from = MAP.theme === 'office' ? 'من الشركة' : 'من السوق';
    if (!top || tie || top === 'skip') text = `محدش اتطرد ${from}`;
    else {
      out = room.players.get(Number(top));
      out.alive = false;
      if (out.role === 'faker' || (room.thiefMode && out.role === 'thief')) for (const [voter, v] of Object.entries(m.votes)) if (v === out.id) bump(room, room.players.get(Number(voter)), 'goodVotes');
      // لو اتطرد تاجر بريء والدور اتكشف، البوتات اللي صوّتت عليه تقلّل ثقتها في اللي حرّضوا
      if (room.settings.reveal && out.role === 'trader') {
        for (const b of room.players.values()) if (b.bot && b.role === 'trader') for (const e of b.ai.evidence) if (e.id === out.id) e.w = 0;
      }
      if (!room.settings.reveal) text = `${out.name} اتطرد ${from}.. ومحدش عارف كان ${room.thiefMode ? 'الحرامي' : 'مزوّر'} ولا لأ`;
      else if (room.thiefMode) text = out.role === 'thief' ? `${out.name} اتطرد.. وطلع الحرامي فعلاً! 🚔 ومعاه ${out.loot} جنيه مسروقين` : `${out.name} اتطرد.. وطلع تاجر غلبان 😢`;
      else if (room.office) text = out.role === 'faker' ? `${out.name} اتطرد.. وطلع القاتل فعلاً! 🚔` : `${out.name} اتطرد.. وطلع موظف بريء 😢`;
      else text = out.role === 'faker' ? `${out.name} اتطرد.. وطلع مزوّر فعلاً! 🚔` : `${out.name} اتطرد.. وطلع تاجر غلبان 😢`;
    }
    m.stage = 'result'; m.result = { text, tally, out: out ? out.id : null }; m.ends = t + CFG.resultTime;
    fxAll(room, out ? 'eject' : 'skip');
    meetingState(room);
  } else if (m.stage === 'result' && t >= m.ends) {
    room.phase = 'playing';
    room.meeting = null;
    const ps = [...room.players.values()];
    ps.forEach((p, i) => { if (p.alive) spawn(p, i, ps.length); p.ai.target = null; if (room.night && p.role === 'faker') p.cd.kill = now() + CFG.killCd; });
    broadcast(room, { t: 'resume' });
    checkWin(room);
  }
}

// ---------- البوتات ----------
// خريطة شبكية للمشي حوالين الحاجات (A*)
const CELL = 30;
let GW = 0, GH = 0, BLOCKED = null;
function buildGrid() {
  const gw = Math.ceil(MAP.w / CELL), gh = Math.ceil(MAP.h / CELL);
  const b = new Uint8Array(gw * gh);
  for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) {
    const cx = gx * CELL + CELL / 2, cy = gy * CELL + CELL / 2;
    b[gy * gw + gx] = collides(cx, cy) || SOLIDS.some((r) => distToRect(cx, cy, r) < CFG.radius + 6) ? 1 : 0;
  }
  return { BLOCKED: b, GW: gw, GH: gh };
}
function cellOf(x, y) { return [clamp(Math.floor(x / CELL), 0, GW - 1), clamp(Math.floor(y / CELL), 0, GH - 1)]; }
function clearLine(x0, y0, x1, y1) {
  const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 10);
  for (let i = 1; i <= n; i++) { const k = i / n; if (collides(x0 + (x1 - x0) * k, y0 + (y1 - y0) * k)) return false; }
  return true;
}
function nearestFree(gx, gy) {
  for (let r = 0; r < 6; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    const x = gx + dx, y = gy + dy;
    if (x >= 0 && y >= 0 && x < GW && y < GH && !BLOCKED[y * GW + x]) return [x, y];
  }
  return [gx, gy];
}
function findPath(x0, y0, x1, y1) {
  if (clearLine(x0, y0, x1, y1)) return [{ x: x1, y: y1 }];
  const [sx, sy] = nearestFree(...cellOf(x0, y0)), [ex, ey] = nearestFree(...cellOf(x1, y1));
  const start = sy * GW + sx, goal = ey * GW + ex;
  const g = new Float32Array(GW * GH).fill(Infinity), from = new Int32Array(GW * GH).fill(-1), closed = new Uint8Array(GW * GH);
  const open = [start]; g[start] = 0;
  const h = (i) => Math.hypot((i % GW) - ex, Math.floor(i / GW) - ey);
  while (open.length) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (g[open[i]] + h(open[i]) < g[open[bi]] + h(open[bi])) bi = i;
    const cur = open.splice(bi, 1)[0];
    if (cur === goal) break;
    closed[cur] = 1;
    const cx = cur % GW, cy = Math.floor(cur / GW);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue;
      const ni = ny * GW + nx;
      if (BLOCKED[ni] || closed[ni]) continue;
      if (dx && dy && (BLOCKED[cy * GW + nx] || BLOCKED[ny * GW + cx])) continue;
      const ng = g[cur] + (dx && dy ? 1.414 : 1);
      if (ng < g[ni]) { g[ni] = ng; from[ni] = cur; if (!open.includes(ni)) open.push(ni); }
    }
  }
  if (from[goal] === -1 && goal !== start) return [{ x: x1, y: y1 }];
  const cells = [];
  for (let i = goal; i !== -1 && i !== start; i = from[i]) cells.unshift({ x: (i % GW) * CELL + CELL / 2, y: Math.floor(i / GW) * CELL + CELL / 2 });
  cells.push({ x: x1, y: y1 });
  // نشد الخط: نشيل النقط اللي نقدر نعدّيها على طول
  const out = [];
  let ax = x0, ay = y0;
  for (let i = 0; i < cells.length; i++) {
    const nxt = cells[i + 1];
    if (nxt && clearLine(ax, ay, nxt.x, nxt.y)) continue;
    out.push(cells[i]); ax = cells[i].x; ay = cells[i].y;
  }
  return out;
}

function standSpot(r, act) {
  if (r === MAP.boss) return { x: r.x + r.w / 2 + (Math.random() - 0.5) * 60, y: r.y + r.h + 30 };
  if (r === MAP.changer) return { x: r.x + r.w + 30, y: r.y + r.h / 2 + (Math.random() - 0.5) * 60 };
  if (r === MAP.power) return { x: r.x - 30, y: r.y + r.h / 2 + (Math.random() - 0.5) * 60 };
  const top = r.face ? r.face === 'down' : r.y < MAP.h / 2;
  return { x: r.x + r.w / 2 + (Math.random() - 0.5) * r.w * 0.6, y: top ? r.y + r.h + 32 : r.y - 32 };
}
function goTo(p, r, act, extra = {}) {
  const spot = r.x !== undefined && r.w === undefined ? r : standSpot(r, act);
  p.ai.target = { ...spot, act, ...extra };
  p.ai.path = findPath(p.x, p.y, spot.x, spot.y);
  p.ai.giveUp = now() + 25;
  p.ai.wait = null;
}

const alivePlayers = (room) => [...room.players.values()].filter((q) => q.alive);
function addSus(p, id, v, why) {
  if (id === p.id) return;
  p.ai.sus[id] = (p.ai.sus[id] || 0) + v;
  if (why) p.ai.evidence.push({ id, text: why, w: v });
}
function topSuspect(room, p) {
  let best = null, max = 0;
  for (const [id, v] of Object.entries(p.ai.sus || {})) {
    const q = room.players.get(Number(id));
    if (q && q.alive && q.id !== p.id && v > max && !(p.role === 'faker' && q.role === 'faker')) { max = v; best = q; }
  }
  return best;
}
function susOf(p, q) { return (q && p.ai.sus[q.id]) || 0; }

// البوت بيفتكر مين شافه فين (في حدود نظره)
function botLook(room, p, t) {
  if (t < (p.ai.nextLook || 0)) return;
  p.ai.nextLook = t + 0.5;
  const range = room.blackout && p.role !== 'faker' ? CFG.darkVision : room.night && p.role !== 'faker' && MAP.theme !== 'office' ? CFG.vision * 0.8 : CFG.vision;
  for (const q of room.players.values()) {
    if (q === p || !q.alive || q.hidden != null) continue;
    if (Math.hypot(q.x - p.x, q.y - p.y) < range && !wallBetween(p.x, p.y, q.x, q.y)) p.ai.seen.push({ t, id: q.id, x: q.x, y: q.y });
    else if (p.watching && camsSee(q.x, q.y).length) p.ai.seen.push({ t, id: q.id, x: q.x, y: q.y });
  }
  while (p.ai.seen.length && t - p.ai.seen[0].t > 120) p.ai.seen.shift();
  if (room.night && room.bodies.length && room.phase === 'playing') {
    const b = room.bodies.find((x) => Math.hypot(x.x - p.x, x.y - p.y) < range && !wallBetween(p.x, p.y, x.x, x.y));
    const going = p.ai.target && p.ai.target.act === 'report';
    // التاجر بيبلّغ على طول، والمزوّر ساعات بيبلّغ عشان يبان بريء (بس مش على اللي هو ضربه)
    if (b && !going && (p.role !== 'faker' || (b.by !== p.id && Math.random() < 0.4))) goTo(p, { x: b.x + 20, y: b.y + 20 }, 'report');
  }
}

// بعد الكشف: نربط وقت آخر ورقة مضروبة باللي البوت شافه عند البسطة
function botEmote(room, p, e) {
  if (p.emoteAt && now() - p.emoteAt < 3) return;
  p.emoteAt = now();
  for (const q of room.players.values()) send(q, { t: 'emote', id: p.id, e });
}

function botAfterInspect(room, p, s, fakes, names, lastT) {
  botEmote(room, p, fakes ? '😠' : '🤔');
  const ago = Math.round(now() - lastT);
  if (!fakes) { for (const q of names) addSus(p, q.id, -0.5); p.ai.cleanAt = s.item; return; }
  const near = new Set(p.ai.seen.filter((e) => Math.abs(e.t - lastT) < 7 && distToRect(e.x, e.y, s) < 110).map((e) => e.id));
  for (const id of near) {
    const q = room.players.get(id);
    if (q) addSus(p, id, 3, `لقيت ${fakes} ورق مضروب في درج ال${s.item}، و${q.name} كان واقف عنده من حوالي ${ago} ثانية`);
  }
  for (const q of names) if (!near.has(q.id)) addSus(p, q.id, 1, `${MAP.vendor} بتاع ال${s.item} قال إن ${q.name} اشترى منه، ودرجه كان فيه مضروب`);
  if (!near.size && !names.length) p.ai.evidence.push({ id: null, text: `درج ال${s.item} كان فيه ${fakes} مضروب بس محدش كان هناك`, w: 0 });
}

function botSay(room, p, text, delay) {
  // كل بوت ليه 4 رسايل بالكتير في الاجتماع عشان الشات ميتزحمش
  if ((p.ai.said || 0) >= 4) return;
  p.ai.said = (p.ai.said || 0) + 1;
  setTimeout(() => {
    if (!room.meeting || !p.alive || room.meeting.stage === 'result') return;
    useMap(room);
    room.meeting.chat.push({ n: p.name, c: p.color, text });
    meetingState(room);
    botsHear(room, p, text);
  }, delay);
}

function botMeetingTalk(room, p) {
  const ai = p.ai;
  const base = 1500 + Math.random() * 6000;
  const alibi = ai.lastStall != null ? (room.office ? `أنا كنت عند ال${MAP.stalls[ai.lastStall].item}` : `أنا كنت عند بسطة ال${MAP.stalls[ai.lastStall].item}`) : room.office ? 'أنا كنت بلف في الشركة' : 'أنا كنت بلف في السوق';
  if (ai.reported) {
    const b = ai.reported; ai.reported = null;
    botSay(room, p, `لقيت ${b.name} مرمي جنب ${placeName(b.x, b.y)}!`, 800);
  }
  if (ai.robbed && room.thiefMode) {
    botSay(room, p, `أنا اتنشلت عند ${ai.robbed}!`, 600 + Math.random() * 1500);
    ai.robbed = null;
  }
  if (p.role === 'trader') {
    const sus = topSuspect(room, p);
    const ev = ai.evidence.filter((e) => e.id && sus && e.id === sus.id).sort((a, b) => b.w - a.w)[0];
    if (sus && susOf(p, sus) >= 2) {
      botSay(room, p, ev ? ev.text : `أنا شاكك في ${sus.name}`, base);
      botSay(room, p, `أنا هصوّت على ${sus.name}`, base + 4000 + Math.random() * 3000);
    } else if (ai.cleanAt && !room.thiefMode) botSay(room, p, `كشفت على درج ال${ai.cleanAt} وكان نضيف.. ${alibi}`, base);
    else botSay(room, p, `${alibi}.. معنديش دليل لسه، ممكن سكيب`, base);
  } else {
    botSay(room, p, alibi, base);
    // المزوّر ساعات بيلبّس حد
    const others = alivePlayers(room).filter((q) => q.role !== 'faker' && q.id !== p.id);
    if (others.length && Math.random() < 0.4) {
      const victim = rand(others);
      ai.framed = victim.id;
      botSay(room, p, room.thiefMode ? `بصراحة ${victim.name} كان بيلزق في الناس جنب بسطة ال${rand(MAP.stalls).item}.. شكله مريب` : room.office ? `بصراحة ${victim.name} كان بيلف لوحده في ${rand(MAP.rooms).name}.. شكله مريب` : `بصراحة ${victim.name} كان واقف كتير جنب درج ال${rand(MAP.stalls).item}.. شكله مريب`, base + 5000 + Math.random() * 4000);
    }
  }
}

// البوتات بتسمع الشات وبترد
const ACCUSE = /شاك|مزو|مريب|صوّت|صوت|هو اللي|كذاب|بيدس|دسّ|حرامي|نشل|سرق|فتّشوه/;
function botsHear(room, speaker, text) {
  for (const b of room.players.values()) {
    if (!b.bot || !b.alive || b === speaker) continue;
    const named = alivePlayers(room).filter((q) => q !== speaker && text.includes(q.name));
    for (const q of named) {
      if (q === b) {
        // اتّهموه
        if (!ACCUSE.test(text) || b.ai.replied?.has(speaker.id) || b.ai.replied?.size >= 2) continue;
        b.ai.replied?.add(speaker.id);
        const where = b.ai.lastStall != null ? `كنت عند ال${MAP.stalls[b.ai.lastStall].item}` : 'كنت بشتري حاجتي';
        botSay(room, b, `أنا؟! والله ${where}.. أنا مالي`, 1500 + Math.random() * 2500);
        if (b.role === 'faker' || susOf(b, speaker) >= 1) {
          addSus(b, speaker.id, 1);
          if (Math.random() < 0.5 && !text.startsWith('وانت يا')) botSay(room, b, `وانت يا ${speaker.name} بتتهم الناس ليه؟ انت اللي مريب`, 5000 + Math.random() * 3000);
        }
      } else if (b.role === 'trader' && ACCUSE.test(text)) {
        // بيصدّق الاتهام شوية، أكتر لو كان شاكك أصلاً، وأقل لو الدليل ضده
        // اتهام من غير دليل بيزوّد الشك شوية بس، محتاج حاجة تانية تأكده
        const trust = speaker.bot ? 0.7 : 1;
        if (susOf(b, q) < -0.5) continue;
        addSus(b, q.id, trust);
      }
    }
  }
}

function botVote(room, p) {
  const m = room.meeting;
  const others = alivePlayers(room).filter((q) => q.id !== p.id);
  const counts = {};
  for (const x of Object.values(m.votes)) if (x !== 'skip') counts[x] = (counts[x] || 0) + 1;
  const lead = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  const leadP = lead && room.players.get(Number(lead[0]));
  if (p.role === 'trader') {
    const s = topSuspect(room, p);
    if (s && susOf(p, s) >= 2) return s.id;
    if (leadP && lead[1] >= 2 && leadP.id !== p.id && susOf(p, leadP) >= 1 && Math.random() < 0.6) return leadP.id;
    return 'skip';
  }
  // المزوّر: يركب الموجة على تاجر، أو يصوّت على اللي اتهمه، أو اللي لبّسه
  if (leadP && leadP.role !== p.role && leadP.id !== p.id) return leadP.id;
  const enemy = topSuspect(room, p);
  if (enemy && Math.random() < 0.7) return enemy.id;
  const framed = room.players.get(p.ai.framed);
  if (framed && framed.alive && Math.random() < 0.5) return framed.id;
  const pool = others.filter((q) => q.role !== p.role);
  return pool.length && Math.random() < 0.3 ? rand(pool).id : 'skip';
}

// قرار البوت: يعمل إيه دلوقتي
function botDecide(room, p, t) {
  const ai = p.ai;
  const todo = p.list.filter((i) => !p.bought.includes(i) && !isClosed(room, i));
  const traders = alivePlayers(room).filter((q) => q.role === 'trader');
  if (p.role === 'trader') {
    if (!p.alive) return todo.length ? goTo(p, MAP.stalls[rand(todo)], 'use') : goTo(p, { x: 200 + Math.random() * 1400, y: 300 + Math.random() * 600 }, 'wander');
    const sus = topSuspect(room, p);
    if (sus && susOf(p, sus) >= (room.thiefMode ? 3.5 : 4) && p.meetingsLeft > 0 && !room.blackout) return goTo(p, MAP.boss, 'use');
    // الشرطي بيروح يفتّش أكتر واحد شاكك فيه
    if (p.special === 'police' && p.searchLeft > 0 && sus && susOf(p, sus) >= 2) return goTo(p, { x: sus.x, y: sus.y }, 'search', { who: sus.id });
    if (room.office) {
      if (todo.length) return goTo(p, MAP.stalls[rand(todo)], 'use');
      const r = rand(MAP.rooms);
      return goTo(p, { x: r.x + r.w / 2 + (Math.random() - 0.5) * 80, y: r.y + r.h / 2 + (Math.random() - 0.5) * 60 }, 'wait');
    }
    if (p.wallet.length < CFG.price || (ai.buys >= 3 && ready(p, 'changer'))) { ai.buys = 0; return goTo(p, MAP.changer, 'use'); }
    if (!room.thiefMode && ready(p, 'inspect') && Math.random() < 0.35) {
      // يكشف على بسطة كان فيها زحمة قريب
      const busy = MAP.stalls.filter((s) => !isClosed(room, s.id) && room.buyers[s.id].length);
      return goTo(p, busy.length ? rand(busy) : rand(MAP.stalls), 'inspect');
    }
    if (todo.length) return goTo(p, MAP.stalls[rand(todo)], 'use');
    // الشحات بيقعد في القهوة أو جنب الزحمة
    if (p.special === 'watcher' && Math.random() < 0.5) return goTo(p, { x: MAP.cafe.x + MAP.cafe.w / 2, y: MAP.cafe.y + MAP.cafe.h + 30 }, 'wait');
    return goTo(p, rand(MAP.stalls), ready(p, 'inspect') && !room.thiefMode ? 'inspect' : 'wait');
  }
  if (p.role === 'thief') {
    // الحرامي بيدوّر على حد ماشي لوحده وفي جيبه فلوس
    if (ready(p, 'steal')) {
      const all = alivePlayers(room).filter((q) => q !== p && !(room.thiefMode && q.role === 'thief'));
      const lone = all.filter((q) => q.wallet.length >= 2 && Math.hypot(q.x - p.x, q.y - p.y) < CFG.vision
        && all.every((o) => o === q || Math.hypot(o.x - q.x, o.y - q.y) > 200));
      if (lone.length) return goTo(p, { x: lone[0].x, y: lone[0].y }, 'steal', { who: lone[0].id });
    }
    if (p.wallet.length < CFG.price) return goTo(p, MAP.changer, 'use');
    return goTo(p, todo.length && Math.random() < 0.5 ? MAP.stalls[rand(todo)] : rand(MAP.stalls), Math.random() < 0.5 ? 'use' : 'pretend');
  }
  // القاتل في الشركة: يضرب، يعطّل الأجهزة، أو يعمل نفسه شغال
  if (room.office) {
    if (room.night && ready(p, 'kill')) {
      const prey = traders.filter((q) => Math.hypot(q.x - p.x, q.y - p.y) < CFG.vision * 1.5 && noWitness(room, p, q));
      if (prey.length) return goTo(p, { x: prey[0].x, y: prey[0].y }, 'kill', { who: prey[0].id });
    }
    if (ready(p, 'close') && Math.random() < 0.3) {
      const hot = MAP.stalls.filter((s) => !isClosed(room, s.id)).sort((a, b) => crowd(room, b, p) - crowd(room, a, p))[0];
      if (hot && crowd(room, hot, p) > 0) return goTo(p, hot, 'close');
    }
    if (Math.random() < 0.6) return goTo(p, rand(MAP.stalls), 'use');
    const r = rand(MAP.rooms);
    return goTo(p, { x: r.x + r.w / 2 + (Math.random() - 0.5) * 80, y: r.y + r.h / 2 + (Math.random() - 0.5) * 60 }, 'wait');
  }
  // المزوّر
  if (p.wallet.length < CFG.price) return goTo(p, MAP.changer, 'use');
  const fakesInHand = p.wallet.filter(Boolean).length;
  // ليلة السوق: يضرب حد لوحده ومفيش حد تاني شايفه
  if (room.night && ready(p, 'kill')) {
    const prey = traders.filter((q) => Math.hypot(q.x - p.x, q.y - p.y) < CFG.vision && noWitness(room, p, q));
    if (prey.length) return goTo(p, { x: prey[0].x, y: prey[0].y }, 'kill', { who: prey[0].id });
  }
  // يدسّ في جيب تاجر لوحده
  if (ready(p, 'plant') && fakesInHand) {
    const lone = traders.filter((q) => Math.hypot(q.x - p.x, q.y - p.y) < CFG.vision && traders.every((o) => o === q || Math.hypot(o.x - q.x, o.y - q.y) > 220));
    if (lone.length) return goTo(p, { x: lone[0].x, y: lone[0].y }, 'plant', { who: lone[0].id });
  }
  // يصرف المضروب في بسطة فاضية من الناس
  if (fakesInHand >= 2) {
    const quiet = MAP.stalls.filter((s) => !isClosed(room, s.id)).sort((a, b) => crowd(room, b, p) - crowd(room, a, p));
    return goTo(p, quiet[quiet.length - 1], 'use');
  }
  // يقفل البسطة اللي التجار رايحينلها
  if (ready(p, 'close')) {
    const hot = MAP.stalls.filter((s) => !isClosed(room, s.id)).sort((a, b) => crowd(room, b, p) - crowd(room, a, p))[0];
    if (hot && crowd(room, hot, p) > 0) return goTo(p, hot, 'close');
  }
  // يعمل نفسه بيكشف عشان يبان تاجر
  if (Math.random() < 0.3) return goTo(p, rand(MAP.stalls), 'pretend');
  return goTo(p, todo.length ? MAP.stalls[rand(todo)] : rand(MAP.stalls), 'use');
}
function noWitness(room, p, q) {
  if (camWatchers(room, q.x, q.y, p).length) return false;
  return alivePlayers(room).every((o) => o === p || o === q || (o.role === 'faker') || Math.hypot(o.x - q.x, o.y - q.y) > CFG.vision * 0.9 || wallBetween(o.x, o.y, q.x, q.y));
}
function crowd(room, s, except) {
  let n = 0;
  for (const q of room.players.values()) if (q.alive && q !== except && distToRect(q.x, q.y, s) < 250) n++;
  return n;
}

function botAct(room, p, act) {
  const ai = p.ai;
  const s = nearestStall(p);
  if (s) ai.lastStall = s.id;
  switch (act) {
    case 'use': if (s && p.list.includes(s.id)) ai.buys = (ai.buys || 0) + 1; doUse(room, p); break;
    case 'inspect': doInspect(room, p); break;
    case 'close': doClose(room, p); break;
    case 'power': doUse(room, p); break;
    case 'report': doReport(room, p); break;
    case 'hide': doHide(room, p); if (p.hidden != null) { ai.hops = 1 + Math.floor(Math.random() * 2); ai.hopAt = now() + 1.5; } break;
    default: break;
  }
}

function botThink(room, p, dt) {
  const ai = p.ai;
  ai.seen ||= []; ai.evidence ||= [];
  const t = now();
  if (room.phase === 'meeting') {
    const m = room.meeting;
    if (m.stage === 'vote' && m.votes[p.id] === undefined && p.alive) {
      if (!ai.voteAt) { ai.voteAt = t + 3 + Math.random() * 12; return; }
      if (t < ai.voteAt) return;
      m.votes[p.id] = botVote(room, p);
      ai.voteAt = null;
      meetingState(room);
    }
    return;
  }
  if (room.phase !== 'playing') { p.input = { x: 0, y: 0 }; return; }
  if (!p.alive && p.role !== 'trader') { p.input = { x: 0, y: 0 }; return; }
  if (p.hidden != null) {
    p.input = { x: 0, y: 0 };
    if (t > (ai.hopAt || 0)) {
      if (ai.hops > 0) { ai.hops--; doTunnel(room, p, rand(MAP.hides[p.hidden].link)); ai.hopAt = t + 1.2; }
      else { p.cd.hide = 0; doHide(room, p); ai.target = null; }
    }
    return;
  }
  if (p.watching) { p.input = { x: 0, y: 0 }; botLook(room, p, t); if (!p.watching.remote && Math.random() < 0.01) stopWatching(p); return; }
  if (p.alive && p.special === 'guard' && ready(p, 'cams') && Math.random() < 0.004) { doCams(room, p, true); return; }
  if (p.alive) botLook(room, p, t);
  if (p.alive && Math.random() < 0.002) botEmote(room, p, rand(['👋', '😂']));
  if (p.inspecting) { p.input = { x: 0, y: 0 }; return; }

  if (p.role === 'faker' && p.alive) {
    if (ready(p, 'print')) doPrint(room, p);
    // يقطع الكهربا لما التجار يبقوا بعيد عن الموتور
    const nearPower = alivePlayers(room).some((q) => q.role === 'trader' && distToRect(q.x, q.y, MAP.power) < 400);
    if (!room.blackout && room.blackoutReady < t && !nearPower && Math.random() < 0.01) doBlackout(room, p);
  }
  // الكهربا قطعت: أقرب بوتين تجار يروحوا للموتور
  if (room.blackout && p.alive && p.role === 'trader' && (!ai.target || ai.target.act !== 'power')) {
    const helpers = alivePlayers(room).filter((q) => q.bot && q.role === 'trader')
      .sort((a, b) => distToRect(a.x, a.y, MAP.power) - distToRect(b.x, b.y, MAP.power)).slice(0, 2);
    if (helpers.includes(p)) goTo(p, MAP.power, 'power');
  }
  if (ai.target && ai.target.act === 'power' && !room.blackout) ai.target = null;
  if (ai.target && (ai.target.act === 'use' || ai.target.act === 'inspect')) {
    const s = MAP.stalls.find((x) => distToRect(ai.target.x, ai.target.y, x) < 50);
    if (s && isClosed(room, s.id)) ai.target = null;
  }
  if (!ai.target || t > ai.giveUp) botDecide(room, p, t);

  // متابعة شخص (دسّ أو تفتيش)
  const tg = ai.target;
  if (tg.who) {
    const q = room.players.get(tg.who);
    if (!q || !q.alive) { ai.target = null; return; }
    const d = Math.hypot(q.x - p.x, q.y - p.y);
    if (tg.act === 'plant' && d < 50) { doPlant(room, p); ai.target = null; return; }
    if (tg.act === 'search' && d < CFG.searchReach - 10) { doSearch(room, p); ai.target = null; return; }
    if (tg.act === 'steal' && d < CFG.stealReach - 10) { doSteal(room, p); ai.target = null; return; }
    if (tg.act === 'kill' && d < CFG.killReach - 10) {
      if (noWitness(room, p, q)) {
        doKill(room, p);
        const hide = (MAP.hides || []).filter((h) => Math.hypot(h.x - p.x, h.y - p.y) < 400).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
        if (hide) goTo(p, { x: hide.x, y: hide.y }, 'hide');
        else {
          // يهرب لأبعد بسطة
          const far = [...MAP.stalls].sort((a, b) => distToRect(p.x, p.y, b) - distToRect(p.x, p.y, a))[0];
          goTo(p, far, 'pretend');
        }
      } else ai.target = null;
      return;
    }
    if (t > (ai.repath || 0)) { ai.path = findPath(p.x, p.y, q.x, q.y); ai.repath = t + 0.6; }
  }
  // امشي على المسار
  let wp = ai.path && ai.path[0];
  while (wp && Math.hypot(wp.x - p.x, wp.y - p.y) < 10 && ai.path.length > 1) { ai.path.shift(); wp = ai.path[0]; }
  if (!wp) wp = tg;
  const dx = wp.x - p.x, dy = wp.y - p.y, d = Math.hypot(dx, dy);
  if (d < 12 && (!ai.path || ai.path.length <= 1)) {
    p.input = { x: 0, y: 0 };
    if (tg.who) return;
    if (!ai.wait) ai.wait = t + (tg.act === 'pretend' ? 3.5 : tg.act === 'wait' ? 4 + Math.random() * 4 : 1.5 + Math.random() * 2.5);
    if (t > ai.wait) { botAct(room, p, tg.act); ai.target = null; ai.wait = null; }
    return;
  }
  p.input = { x: dx / d, y: dy / d };
  if (ai.lx !== undefined && Math.hypot(p.x - ai.lx, p.y - ai.ly) < CFG.speed * dt * 0.2) {
    ai.stuck = (ai.stuck || 0) + dt;
    if (ai.stuck > 0.6) { ai.path = findPath(p.x, p.y, tg.x, tg.y); ai.stuck = 0; }
  } else ai.stuck = 0;
  ai.lx = p.x; ai.ly = p.y;
}

// ---------- اللوب ----------
const TICK = 1 / 20;
setInterval(() => {
  for (const room of rooms.values()) {
    if (room.phase === 'lobby' || room.phase === 'ended') continue;
    useMap(room);
    for (const p of room.players.values()) if (p.bot) botThink(room, p, TICK);
    if (room.phase === 'meeting') { tickMeeting(room); continue; }
    const t = now();
    tickBlackout(room);
    if (room.phase !== 'playing') continue;
    for (const p of room.players.values()) {
      if (p.watching) {
        if (!p.alive || (p.watching.remote && t >= p.watching.until)) stopWatching(p);
        else continue;
      }
      if (p.hidden != null) continue;
      const { x: ix, y: iy } = p.input;
      if (p.inspecting) {
        if (ix || iy) { toast(p, p.inspecting.task ? 'اتحركت فالشغلانة اتلغت' : 'اتحركت فالكشف اتلغى'); p.inspecting = null; }
        else if (t >= p.inspecting.until) (p.inspecting.task ? finishTask : finishInspect)(room, p);
      }
      if (!ix && !iy) continue;
      if (ix) p.face = ix > 0 ? 1 : -1;
      const sp = CFG.speed * (p.alive ? 1 : CFG.ghostSpeed) * TICK;
      const nx = p.x + ix * sp, ny = p.y + iy * sp;
      if (!p.alive) { p.x = clamp(nx, 0, MAP.w); p.y = clamp(ny, 0, MAP.h); continue; }
      if (!collides(nx, p.y)) p.x = nx;
      if (!collides(p.x, ny)) p.y = ny;
    }
    checkWin(room);
    if (room.phase !== 'playing') continue;
    const circ = room.thiefMode ? [...room.players.values()].reduce((n, p) => n + (p.role === 'thief' ? p.loot : 0), 0) : circulation(room), prog = progress(room);
    const pub = [...room.players.values()].map((p) => ({
      id: p.id, x: Math.round(p.x), y: Math.round(p.y), c: p.color, h: p.hat, n: p.name, a: p.alive, i: !!p.inspecting, f: p.face,
      m: p.input.x || p.input.y ? 1 : 0, hd: p.hidden != null ? 1 : 0,
    }));
    const bo = room.blackout ? Math.max(0, room.blackout.ends - t) : 0;
    const cl = Object.keys(room.closed).filter((id) => isClosed(room, id)).map(Number);
    const cw = [...room.players.values()].some((q) => q.watching);
    const bodies = room.bodies.map((b) => ({ id: b.id, n: b.name, c: b.color, h: b.hat, x: Math.round(b.x), y: Math.round(b.y) }));
    for (const p of room.players.values()) {
      if (!p.ws) continue;
      const faker = p.role === 'faker';
      send(p, {
        t: 's', ps: pub.filter((q) => (q.a || !p.alive || q.id === p.id) && (!q.hd || q.id === p.id || (faker && room.players.get(q.id)?.role === 'faker'))), circ, target: room.thiefMode ? room.thiefGoal : room.target, prog, bo, cl, bodies, cw,
        me: {
          coins: p.wallet.length, fakes: faker ? p.wallet.filter(Boolean).length : undefined,
          list: p.list, bought: p.bought, alive: p.alive, meetings: p.meetingsLeft, search: p.searchLeft, hidden: p.hidden ?? null, loot: p.role === 'thief' ? p.loot : undefined,
          insp: p.inspecting ? Math.max(0, p.inspecting.until - t) : 0, inspT: p.inspecting ? (p.inspecting.total || CFG.inspectTime) : 0, task: !!(p.inspecting && p.inspecting.task),
          cd: {
            print: cdLeft(p, 'print'), plant: cdLeft(p, 'plant'), inspect: cdLeft(p, 'inspect'), changer: cdLeft(p, 'changer'),
            blackout: faker ? Math.max(0, Math.ceil(room.blackoutReady - t)) : 0, close: cdLeft(p, 'close'), steal: cdLeft(p, 'steal'), kill: room.night && faker ? cdLeft(p, 'kill') : 0, cams: p.special === 'guard' ? cdLeft(p, 'cams') : 0,
          },
        },
      });
    }
  }
}, TICK * 1000);

// ---------- الشبكة ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  if (url === '/api/rooms') {
    const list = [...rooms.values()]
      .filter((r) => r.public && r.phase === 'lobby' && r.players.size < 10)
      .map((r) => ({ code: r.code, n: r.players.size, host: r.players.get(r.hostId)?.name || '' }));
    res.writeHead(200, { 'Content-Type': MIME['.json'], 'Cache-Control': 'no-store' });
    return res.end(JSON.stringify(list));
  }
  const file = path.join(PUBLIC, url === '/' ? 'index.html' : url);
  if (!file.startsWith(PUBLIC)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('مش موجود'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
});

const wss = new WebSocketServer({ server });
wss.on('connection', (ws) => {
  let room = null, me = null;
  ws.on('message', (raw) => {
    let m;
    try { m = JSON.parse(raw); } catch { return; }
    if (!room) {
      if (m.t === 'rejoin') {
        const r = rooms.get(String(m.code || '').toUpperCase());
        const p = r && [...r.players.values()].find((q) => !q.bot && q.token === m.token);
        if (!p) return ws.send(JSON.stringify({ t: 'rejoinFail' }));
        room = r; me = p;
        if (me.ws && me.ws !== ws) try { me.ws.close(); } catch {}
        me.ws = ws; me.disconnectedAt = null;
        useMap(room);
        ws.send(JSON.stringify({ t: 'joined', you: me.id, code: room.code, quick: QUICK, token: me.token }));
        if (room.phase === 'lobby') return lobbyState(room);
        lobbyState(room);
        if (room.phase === 'ended') return send(me, room.lastEnd);
        send(me, { ...startPayload(room, me), rejoin: true });
        if (room.phase === 'meeting') { send(me, { t: 'meeting', caller: room.meeting.caller }); meetingState(room); }
        broadcast(room, { t: 'toast', text: `🔌 ${me.name} رجع للسوق`, kind: 'info' });
        return;
      }
      if (m.t === 'create') room = createRoom(m.public);
      else if (m.t === 'join') {
        room = rooms.get(String(m.code || '').toUpperCase());
        if (!room) return ws.send(JSON.stringify({ t: 'error', text: 'الكود ده مش موجود' }));
        if (room.phase !== 'lobby') { room = null; return ws.send(JSON.stringify({ t: 'error', text: 'اللعب بدأ في الغرفة دي.. استنى الدور الجاي' })); }
        if (room.players.size >= 10) { room = null; return ws.send(JSON.stringify({ t: 'error', text: 'الغرفة مليانة' })); }
      } else return;
      me = addPlayer(room, { name: m.name, ws });
      ws.send(JSON.stringify({ t: 'joined', you: me.id, code: room.code, quick: QUICK, token: me.token }));
      return lobbyState(room);
    }
    const isHost = me.id === room.hostId;
    useMap(room);
    switch (m.t) {
      case 'addbot':
        if (isHost && room.phase === 'lobby' && room.players.size < 10) {
          const used = new Set([...room.players.values()].map((p) => p.name));
          addPlayer(room, { name: BOT_NAMES.find((n) => !used.has(n)) || 'بوت', bot: true });
          lobbyState(room);
        }
        break;
      case 'kick':
        if (isHost && room.phase === 'lobby') { const p = room.players.get(m.id); if (p && p.bot) { room.players.delete(p.id); lobbyState(room); } }
        break;
      case 'settings':
        if (isHost && room.phase === 'lobby' && m.settings) {
          const s = m.settings;
          room.settings = {
            fakers: clamp(Number(s.fakers) || 0, 0, 3),
            fakeTarget: clamp(Number(s.fakeTarget) || 10, 5, 16),
            listSize: clamp(Number(s.listSize) || 5, 3, 7),
            reveal: !!s.reveal,
            specials: !!s.specials,
            thief: !!s.thief,
            map: s.mode === 'office' ? 'office' : MAPS[s.map] && s.map !== 'office' ? s.map : 'souq',
            mode: ['night', 'office', 'thief'].includes(s.mode) ? s.mode : 'classic',
          };
          if ('public' in s) room.public = !!s.public;
          lobbyState(room);
        }
        break;
      case 'look':
        if (room.phase === 'lobby' && typeof m.hat === 'string' && HATS.includes(m.hat)) { me.hat = m.hat; lobbyState(room); }
        if (room.phase === 'lobby' && COLORS.includes(m.color) && ![...room.players.values()].some((p) => p.color === m.color)) { me.color = m.color; lobbyState(room); }
        break;
      case 'start':
        if (isHost && room.phase === 'lobby' && !startGame(room)) send(me, { t: 'error', text: 'محتاجين 4 لاعبين على الأقل (ضيف بوتات لو حابب)' });
        break;
      case 'again':
        if (isHost && room.phase === 'ended') { room.phase = 'lobby'; lobbyState(room); }
        break;
      case 'in':
        if (room.phase === 'playing') {
          const x = Number(m.x) || 0, y = Number(m.y) || 0, l = Math.hypot(x, y);
          me.input = l > 1 ? { x: x / l, y: y / l } : { x, y };
        }
        break;
      case 'emote': {
        const EM = ['👋', '😂', '🤔', '😠', '👀'];
        if (room.phase !== 'playing' || !EM.includes(m.e) || (me.emoteAt && now() - me.emoteAt < 1)) break;
        me.emoteAt = now();
        // الشبح إيموشنه بيوصل للأشباح بس
        for (const q of room.players.values()) if (me.alive || !q.alive) send(q, { t: 'emote', id: me.id, e: m.e });
        break;
      }
      case 'use': doUse(room, me); break;
      case 'haggled': finishHaggle(room, me, m.good); break;
      case 'inspect': doInspect(room, me); break;
      case 'print': doPrint(room, me); break;
      case 'plant': doPlant(room, me); break;
      case 'blackout': doBlackout(room, me); break;
      case 'close': doClose(room, me); break;
      case 'search': doSearch(room, me); break;
      case 'steal': doSteal(room, me); break;
      case 'kill': doKill(room, me); break;
      case 'report': doReport(room, me); break;
      case 'cams': doCams(room, me, !!m.on); break;
      case 'hide': doHide(room, me); break;
      case 'tunnel': doTunnel(room, me, Number(m.to)); break;
      case 'vote': {
        const mt = room.meeting;
        if (room.phase === 'meeting' && mt.stage === 'vote' && me.alive && mt.votes[me.id] === undefined) {
          const target = m.id === 'skip' ? 'skip' : room.players.get(m.id);
          if (target === 'skip' || (target && target.alive)) { mt.votes[me.id] = target === 'skip' ? 'skip' : target.id; fx(me, 'vote'); meetingState(room); }
        }
        break;
      }
      case 'chat': {
        const text = String(m.text || '').trim().slice(0, 120);
        if (!text) break;
        if (room.phase === 'meeting' && me.alive) { room.meeting.chat.push({ n: me.name, c: me.color, text }); meetingState(room); botsHear(room, me, text); }
        break;
      }
    }
  });
  ws.on('close', () => {
    if (!room || !me || me.ws !== ws) return;
    me.ws = null;
    if (room.phase !== 'lobby') {
      // في نص الدور: نستنى دقيقة ونص يمكن يرجع (ريفرش أو النت فصل)
      me.disconnectedAt = now(); me.input = { x: 0, y: 0 };
      broadcast(room, { t: 'toast', text: `🔌 ${me.name} فصل.. مستنيينه يرجع`, kind: 'warn' });
      const r = room, p = me;
      setTimeout(() => { if (!p.ws && r.players.get(p.id) === p) dropPlayer(r, p); }, 90000);
      return;
    }
    // في اللوبي: نستنى 15 ثانية بس عشان الريفرش ميطلّعكش من الغرفة
    const r = room, p = me;
    setTimeout(() => { if (!p.ws && r.players.get(p.id) === p) dropPlayer(r, p); }, 15000);
  });
});

function dropPlayer(room, me) {
  {
    room.players.delete(me.id);
    const humans = [...room.players.values()].filter((p) => !p.bot);
    if (!humans.length) return rooms.delete(room.code);
    if (room.hostId === me.id) room.hostId = (humans.find((p) => p.ws) || humans[0]).id;
    if (room.phase === 'lobby') lobbyState(room);
    else { useMap(room); checkWin(room); }
  }
}

server.listen(PORT, () => console.log(`سوق الجمعة شغال على http://localhost:${PORT}`));
