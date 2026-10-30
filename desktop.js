'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ---------- Persistent virtual file system ---------- */
const FS_KEY = 'win98-run-files-v1';
const SET_KEY = 'win98-run-settings-v1';
const defaultFiles = {
  'Welcome.txt': 'Welcome to Windows 98 (browser simulation)!\n\nDouble-click desktop icons to open programs.\nRight-click the desktop for more options.\nDrag a .txt file onto the desktop to open it here.\n\nThis file is saved in your browser and will still be here when you return.',
  'Read Me.txt': 'win98-run is a simulation with a real DOS emulator inside.\nIt cannot run Windows .exe files yet.\nDOS .exe/.com/.bat programs do run — open DOS Programs.\n\nApps included: Explorer, Notepad, Paint, Minesweeper,\nCalculator, Internet Explorer, Display Properties,\nSystem Properties, and DOS Programs (js-dos).'
};
let files = load(FS_KEY, { ...defaultFiles });
let settings = load(SET_KEY, { wallpaper: 'teal' });
function load(key, fallback) { try { return { ...fallback, ...(JSON.parse(localStorage.getItem(key)) || {}) }; } catch { return { ...fallback }; } }
function saveFiles() { localStorage.setItem(FS_KEY, JSON.stringify(files)); }
function saveSettings() { localStorage.setItem(SET_KEY, JSON.stringify(settings)); }

const WALLPAPERS = {
  teal: '#008080', navy: '#000080', black: '#000000', plum: '#400040',
  clouds: 'linear-gradient(180deg,#3a6ea5 0%,#7fb2e0 55%,#dceefb 100%)',
  sunset: 'linear-gradient(180deg,#2b1055 0%,#7597de 55%,#ff9a76 100%)'
};
function applyWallpaper() { $('#desktop').style.background = settings.wallpaperImage ? `url(${settings.wallpaperImage}) center/cover` : (WALLPAPERS[settings.wallpaper] || WALLPAPERS.teal); }

/* ---------- Window manager ---------- */
const windowsEl = $('#windows'), taskButtonsEl = $('#task-buttons');
let zTop = 10, activeId = null, winSeq = 0;
const openWins = new Map();

function createWindow({ title, icon = '▣', width = 520, height = 380, body, onMount, menu = ['File', 'Edit', 'View', 'Help'], menus = null }) {
  const id = 'win' + (++winSeq);
  const el = document.createElement('section');
  el.className = 'window active'; el.dataset.id = id;
  const offset = (openWins.size % 6) * 26;
  el.style.cssText = `width:${width}px;height:${height}px;left:${70 + offset}px;top:${36 + offset}px;z-index:${++zTop}`;
  el.innerHTML = `
    <div class="titlebar"><span class="ticon">${icon}</span><span class="ttitle">${title}</span>
      <span class="tbtns"><button class="tbtn" data-act="min" title="Minimize">_</button><button class="tbtn" data-act="max" title="Maximize">▢</button><button class="tbtn" data-act="close" title="Close">✕</button></span></div>
    ${menu ? `<div class="menubar">${menu.map(m => `<button type="button" class="mbar-btn" data-menu-label="${m}">${m}</button>`).join('')}<div class="menu-dropdown hidden"></div></div>` : ''}
    <div class="winbody"></div>
    <div class="statusbar"><span>Ready</span></div><div class="resize"></div>`;
  $('.winbody', el).append(body);
  windowsEl.append(el);

  const task = document.createElement('button');
  task.className = 'task-btn active'; task.textContent = `${icon} ${title}`;
  task.onclick = () => { if (activeId === id && !el.classList.contains('minimized')) minimize(); else restore(); };
  taskButtonsEl.append(task);

  const api = { id, el, body: $('.winbody', el), setTitle(t) { $('.ttitle', el).textContent = t; task.textContent = `${icon} ${t}`; } };
  openWins.set(id, api);

  function minimize() { el.classList.add('minimized'); setActive(null); }
  function restore() { el.classList.remove('minimized'); setActive(id); }
  function close() { el.remove(); task.remove(); openWins.delete(id); if (activeId === id) setActive(null); }
  api.close = close; api.restore = restore;

  // Functional menu bar (File / View / Help actually do things)
  const menuDefs = menus || {
    File: [{ label: 'Close Window', fn: () => close() }],
    Edit: [{ label: 'Select All Text', fn: () => { const t = $('textarea, input[type=text]', api.body); if (t) { t.focus(); t.select(); } else alert('Nothing to select in this window.'); } }],
    View: [
      { label: 'Minimize', fn: () => minimize() },
      { label: 'Maximize / Restore', fn: () => el.classList.toggle('maximized') },
      { label: 'Show Desktop', fn: () => { for (const w of openWins.values()) w.el.classList.add('minimized'); setActive(null); } }
    ],
    Help: [{ label: 'About / Controls', fn: () => alert(`${title}\n\nDrag windows by their title bar. Use the _ ▢ ✕ buttons to minimize, maximize, and close.\nPrograms and files you import stay only in this browser.`) }]
  };
  const menubarEl = $('.menubar', el), dropdownEl = $('.menu-dropdown', el);
  if (menubarEl && dropdownEl) {
    menubarEl.addEventListener('click', e => {
      const btn = e.target.closest('.mbar-btn');
      const item = e.target.closest('.menu-item');
      if (item) { dropdownEl.classList.add('hidden'); const def = (menuDefs[dropdownEl.dataset.label] || [])[Number(item.dataset.idx)]; if (def) def.fn(api); return; }
      if (!btn) return;
      const label = btn.dataset.menuLabel;
      if (!dropdownEl.classList.contains('hidden') && dropdownEl.dataset.label === label) { dropdownEl.classList.add('hidden'); return; }
      dropdownEl.dataset.label = label;
      dropdownEl.innerHTML = (menuDefs[label] || [{ label: 'No actions', fn: () => {} }]).map((d, i) => `<button type="button" class="menu-item" data-idx="${i}">${d.label}</button>`).join('');
      dropdownEl.style.left = btn.offsetLeft + 'px';
      dropdownEl.classList.remove('hidden');
    });
    el.addEventListener('pointerdown', e => { if (!e.target.closest('.menubar')) dropdownEl.classList.add('hidden'); });
  }

  $('.tbtns', el).addEventListener('click', e => {
    const act = e.target.dataset.act; if (!act) return;
    if (act === 'close') close();
    if (act === 'min') minimize();
    if (act === 'max') { el.classList.toggle('maximized'); }
  });
  el.addEventListener('pointerdown', () => setActive(id));

  makeDraggable(el, $('.titlebar', el));
  makeResizable(el, $('.resize', el));
  setActive(id);
  if (onMount) onMount(api);
  return api;
}
function setActive(id) {
  activeId = id;
  for (const [wid, w] of openWins) {
    const on = wid === id;
    w.el.classList.toggle('active', on);
    if (on) w.el.style.zIndex = ++zTop;
  }
  $$('.task-btn', taskButtonsEl).forEach((b, i) => b.classList.toggle('active', [...openWins.keys()][i] === id));
}
function makeDraggable(el, handle) {
  handle.addEventListener('pointerdown', e => {
    if (e.target.closest('.tbtn') || el.classList.contains('maximized')) return;
    const sx = e.clientX - el.offsetLeft, sy = e.clientY - el.offsetTop;
    handle.setPointerCapture(e.pointerId);
    const move = ev => { el.style.left = Math.max(0, Math.min(innerWidth - 80, ev.clientX - sx)) + 'px'; el.style.top = Math.max(0, Math.min(innerHeight - 50, ev.clientY - sy)) + 'px'; };
    const up = () => { handle.removeEventListener('pointermove', move); handle.removeEventListener('pointerup', up); };
    handle.addEventListener('pointermove', move); handle.addEventListener('pointerup', up);
  });
}
function makeResizable(el, handle) {
  handle.addEventListener('pointerdown', e => {
    e.stopPropagation();
    const sw = el.offsetWidth, sh = el.offsetHeight, sx = e.clientX, sy = e.clientY;
    handle.setPointerCapture(e.pointerId);
    const move = ev => { el.style.width = Math.max(240, sw + ev.clientX - sx) + 'px'; el.style.height = Math.max(140, sh + ev.clientY - sy) + 'px'; };
    const up = () => { handle.removeEventListener('pointermove', move); handle.removeEventListener('pointerup', up); };
    handle.addEventListener('pointermove', move); handle.addEventListener('pointerup', up);
  });
}
function div(html, cls) { const d = document.createElement('div'); if (cls) d.className = cls; d.innerHTML = html; return d; }

/* ---------- Apps ---------- */
function openExplorer(path = 'My Computer') {
  const body = div('', 'explorer-grid');
  const win = createWindow({ title: path, icon: '▣', body, menu: ['File', 'Edit', 'View', 'Help'] });
  renderExplorer(win, path);
}
function renderExplorer(win, path) {
  win.setTitle(path);
  const body = win.body; body.innerHTML = ''; body.className = 'winbody explorer-grid';
  const add = (icon, label, fn) => { const b = document.createElement('button'); b.className = 'file-item'; b.innerHTML = `<span class="fi">${icon}</span><span>${label}</span>`; b.ondblclick = fn; b.onclick = fn; body.append(b); };
  if (path === 'My Computer') {
    add('🖥', '(C:) Local Disk', () => renderExplorer(win, 'C:'));
    add('💾', '(A:) Floppy', () => renderExplorer(win, 'C:'));
    add('📁', 'My Documents', () => renderExplorer(win, 'My Documents'));
    add('⚙', 'Control Panel', () => openDisplay());
    add('🗑', 'Recycle Bin', () => renderExplorer(win, 'Recycle Bin'));
  } else if (path === 'Recycle Bin') {
    body.append(div('<p style="padding:4px">The Recycle Bin is empty.</p>'));
  } else {
    add('⬆', 'Up one level', () => renderExplorer(win, 'My Computer'));
    for (const name of Object.keys(files)) add('▤', name, () => openNotepad(name));
    const nb = document.createElement('button'); nb.className = 'btn98'; nb.textContent = 'New Text Document';
    nb.onclick = () => { const n = prompt('File name:', 'Untitled.txt') || 'Untitled.txt'; files[n.endsWith('.txt') ? n : n + '.txt'] = ''; saveFiles(); renderExplorer(win, path); };
    body.append(nb);
  }
}

function openNotepad(name) {
  const fileName = name && files[name] !== undefined ? name : 'Untitled.txt';
  const wrap = div(''); wrap.style.height = '100%';
  wrap.innerHTML = `<textarea class="notepad" spellcheck="false">${escapeHtml(files[fileName] || '')}</textarea>`;
  const win = createWindow({ title: `${fileName} - Notepad`, icon: '▤', width: 480, height: 340, body: wrap });
  const ta = $('textarea', wrap);
  const bar = win.el.querySelector('.statusbar span');
  bar.innerHTML = `<button class="btn98" id="np-save">Save</button> &nbsp;${fileName} — changes are stored in your browser`;
  $('#np-save', bar).onclick = () => { files[fileName] = ta.value; saveFiles(); bar.lastChild.textContent = ` Saved ${new Date().toLocaleTimeString()}`; };
}
function escapeHtml(s) { return s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

function openPaint() {
  const wrap = div(`<div class="paint-tools">
      <input type="color" id="p-color" value="#000000"><label>Size <input type="range" id="p-size" min="1" max="24" value="4"></label>
      <button class="btn98" id="p-clear">Clear</button><button class="btn98" id="p-save">Save PNG</button></div>
    <canvas id="paint-canvas" width="760" height="480"></canvas>`, 'paint-wrap');
  const win = createWindow({ title: 'untitled - Paint', icon: '✿', width: 620, height: 460, body: wrap, menu: ['File', 'Edit', 'View', 'Image', 'Help'] });
  win.body.classList.add('facematch');
  const cv = $('#paint-canvas', wrap), ctx = cv.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height); ctx.lineCap = 'round';
  let drawing = false;
  const pos = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height]; };
  cv.addEventListener('pointerdown', e => { drawing = true; cv.setPointerCapture(e.pointerId); const [x, y] = pos(e); ctx.beginPath(); ctx.moveTo(x, y); });
  cv.addEventListener('pointermove', e => { if (!drawing) return; const [x, y] = pos(e); ctx.strokeStyle = $('#p-color', wrap).value; ctx.lineWidth = $('#p-size', wrap).value; ctx.lineTo(x, y); ctx.stroke(); });
  cv.addEventListener('pointerup', () => drawing = false);
  $('#p-clear', wrap).onclick = () => { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height); };
  $('#p-save', wrap).onclick = () => { const a = document.createElement('a'); a.download = 'painting.png'; a.href = cv.toDataURL('image/png'); a.click(); };
}

function openCalculator() {
  const keys = ['C', '←', '÷', '×', '7', '8', '9', '-', '4', '5', '6', '+', '1', '2', '3', '=', '0', '.', '%', '√'];
  const wrap = div(`<div class="calc-display">0</div>${keys.map(k => `<button class="btn98" data-k="${k}">${k}</button>`).join('')}`, 'calc');
  const win = createWindow({ title: 'Calculator', icon: '▦', width: 280, height: 340, body: wrap, menu: ['Edit', 'View', 'Help'] });
  win.body.classList.add('facematch');
  const disp = $('.calc-display', wrap); let cur = '0', prev = null, op = null, fresh = true;
  const calc = (a, b, o) => o === '+' ? a + b : o === '-' ? a - b : o === '×' ? a * b : o === '÷' ? (b ? a / b : NaN) : b;
  wrap.addEventListener('click', e => {
    const k = e.target.dataset.k; if (!k) return;
    if (/[0-9.]/.test(k)) { cur = fresh || cur === '0' ? k : cur + k; fresh = false; }
    else if (k === 'C') { cur = '0'; prev = op = null; }
    else if (k === '←') cur = cur.length > 1 ? cur.slice(0, -1) : '0';
    else if (k === '√') cur = String(Math.sqrt(parseFloat(cur)));
    else if (k === '%') cur = String(parseFloat(cur) / 100);
    else if (k === '=') { if (op) { cur = String(calc(prev, parseFloat(cur), op)); prev = op = null; fresh = true; } }
    else { if (op && prev !== null && !fresh) cur = String(calc(prev, parseFloat(cur), op)); prev = parseFloat(cur); op = k; fresh = true; }
    disp.textContent = cur.length > 14 ? parseFloat(cur).toExponential(6) : cur;
  });
}

function openMinesweeper() {
  const W = 9, H = 9, MINES = 10;
  const wrap = div(`<div><button class="btn98" id="mine-face" style="font-size:20px">🙂</button>
    <span id="mine-status" style="margin-left:10px">Mines: ${MINES}</span></div><div class="mine-grid"></div>`, 'mine-wrap');
  const win = createWindow({ title: 'Minesweeper', icon: '✸', width: 320, height: 390, body: wrap, menu: ['Game', 'Help'] });
  win.body.classList.add('facematch');
  const grid = $('.mine-grid', wrap), status = $('#mine-status', wrap);
  let cells, openCount, over;
  function setup() {
    cells = Array.from({ length: W * H }, () => ({ mine: false, open: false, flag: false, n: 0 }));
    openCount = 0; over = false; status.textContent = `Mines: ${MINES}`; $('#mine-face', wrap).textContent = '🙂';
    let placed = 0; while (placed < MINES) { const i = Math.floor(Math.random() * cells.length); if (!cells[i].mine) { cells[i].mine = true; placed++; } }
    cells.forEach((c, i) => { c.n = neighbours(i).filter(j => cells[j].mine).length; });
    grid.innerHTML = '';
    cells.forEach((c, i) => { const b = document.createElement('button'); b.className = 'mine-cell'; b.dataset.i = i; grid.append(b); });
  }
  function neighbours(i) { const x = i % W, y = Math.floor(i / W), out = []; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const nx = x + dx, ny = y + dy; if (nx >= 0 && nx < W && ny >= 0 && ny < H) out.push(ny * W + nx); } return out; }
  function reveal(i) {
    const c = cells[i]; if (!c || c.open || c.flag || over) return;
    c.open = true; openCount++;
    const b = grid.children[i]; b.classList.add('open');
    if (c.mine) { b.textContent = '💣'; b.classList.add('boom'); over = true; status.textContent = 'Boom! Click the face to retry.'; $('#mine-face', wrap).textContent = '😵'; return; }
    b.textContent = c.n || '';
    if (!c.n) neighbours(i).forEach(reveal);
    if (openCount === W * H - MINES) { over = true; status.textContent = 'You win!'; $('#mine-face', wrap).textContent = '😎'; }
  }
  grid.addEventListener('click', e => { const i = +e.target.dataset.i; if (!Number.isNaN(i)) reveal(i); });
  grid.addEventListener('contextmenu', e => { e.preventDefault(); const i = +e.target.dataset.i, c = cells[i]; if (!c || c.open || over) return; c.flag = !c.flag; e.target.textContent = c.flag ? '🚩' : ''; });
  $('#mine-face', wrap).onclick = setup;
  setup();
}

function openIE() {
  const wrap = div(`<div class="ie-bar"><span style="align-self:center">Address</span><input id="ie-url" value="http://welcome.win98/"><button class="btn98" id="ie-go">Go</button></div>
    <div id="ie-page" style="padding:18px; line-height:1.5"></div>`);
  const win = createWindow({ title: 'Internet Explorer', icon: '◎', width: 600, height: 430, body: wrap, menu: ['File', 'Edit', 'View', 'Favorites', 'Help'] });
  win.body.classList.add('facematch');
  const page = $('#ie-page', wrap);
  const home = `<h2 style="color:#000080;margin-top:0">Welcome to the Internet</h2>
    <p>This simulated browser works offline. Try these pages:</p>
    <p><a href="#" data-page="history">A brief history of Windows 98</a><br>
    <a href="#" data-page="about">About this simulation</a></p>
    <p>Tip: drag a real .txt file onto the desktop to open it in Notepad.</p>`;
  const pages = {
    home,
    history: `<h2 style="color:#000080;margin-top:0">Windows 98</h2><p>Released June 25, 1998. Windows 98 SE followed on May 5, 1999, adding Internet Explorer 5, improved USB support, and Internet Connection Sharing.</p><p><a href="#" data-page="home">Back home</a></p>`,
    about: `<h2 style="color:#000080;margin-top:0">About win98-run</h2><p>A from-scratch browser simulation inspired by win32.run, OpenLair XP, and Quenq Reborn XP. No Microsoft code or assets. Your Notepad files live only in this browser.</p><p><a href="#" data-page="home">Back home</a></p>`
  };
  page.innerHTML = home;
  page.addEventListener('click', e => { const p = e.target.dataset.page; if (p) { e.preventDefault(); page.innerHTML = pages[p]; } });
  $('#ie-go', wrap).onclick = () => { page.innerHTML = home; $('#ie-url', wrap).value = 'http://welcome.win98/'; };
}

function openDisplay() {
  const wrap = div(`<p>Wallpaper — applied immediately and remembered:</p><div class="swatches">
    ${Object.entries(WALLPAPERS).map(([k, v]) => `<button class="swatch ${settings.wallpaper === k ? 'sel' : ''}" data-w="${k}" style="background:${v}" title="${k}"></button>`).join('')}
    </div><p>Screen area: 800 × 600 &nbsp;•&nbsp; Colors: True Color (32 bit) <i>(simulated)</i></p>`, 'padded');
  createWindow({ title: 'Display Properties', icon: '⚙', width: 430, height: 300, body: wrap, menu: null });
  wrap.addEventListener('click', e => { const w = e.target.dataset.w; if (!w) return; settings.wallpaper = w; delete settings.wallpaperImage; saveSettings(); applyWallpaper(); $$('.swatch', wrap).forEach(s => s.classList.toggle('sel', s.dataset.w === w)); });
}

function openSystem() {
  const wrap = div(`<table class="sys-table">
    <tr><td>System</td><td>Microsoft Windows 98<br>Second Edition (browser simulation)</td></tr>
    <tr><td>Registered to</td><td>Guest<br>win98-run</td></tr>
    <tr><td>Computer</td><td>GenuineIntel Pentium II<br>128.0 MB RAM <i>(simulated)</i></td></tr>
    <tr><td>Your files</td><td>${Object.keys(files).length} text document(s), stored only in this browser</td></tr></table>`, 'padded');
  createWindow({ title: 'System Properties', icon: 'ℹ', width: 430, height: 280, body: wrap, menu: null });
}

function openWelcome() {
  const wrap = div(`<h3 style="margin-top:0">Welcome to Windows 98</h3>
    <p>Double-click an icon, or use the Start menu. Try:</p>
    <p>• <b>Paint</b> and <b>Minesweeper</b> from the desktop<br>• <b>My Computer</b> to see your saved documents<br>• Right-click the desktop → <b>Properties</b> to change the wallpaper<br>• Drag a real <b>.txt file</b> or <b>image</b> onto the desktop</p>
    <p><button class="btn98" id="w-start">Get Started</button></p>`, 'padded');
  const win = createWindow({ title: 'Welcome', icon: '✦', width: 430, height: 300, body: wrap, menu: null });
  $('#w-start', wrap).onclick = () => win.close();
}

/* ---------- DOS programs (js-dos / DOSBox in the browser) ---------- */
const PROG_DB = 'win98-run-db-v1';
let _idb = null;
function idbOpen() {
  if (_idb) return _idb;
  _idb = new Promise((resolve, reject) => {
    const req = indexedDB.open(PROG_DB, 3);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('programs')) db.createObjectStore('programs', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('diskimages')) db.createObjectStore('diskimages', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('states')) db.createObjectStore('states', { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return _idb;
}
async function diskGet(id) {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const req = db.transaction('diskimages', 'readonly').objectStore('diskimages').get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}
async function stateDelete(key) {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('states', 'readwrite');
    tx.objectStore('states').delete(key);
    tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
  });
}
async function diskPut(rec) {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('diskimages', 'readwrite');
    tx.objectStore('diskimages').put(rec);
    tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
  });
}
async function progStore(mode, fn) {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('programs', mode);
    const out = fn(tx.objectStore('programs'));
    tx.oncomplete = () => resolve(out?.result);
    tx.onerror = () => reject(tx.error);
  });
}
const progAll = () => progStore('readonly', s => s.getAll());
const progGet = id => progStore('readonly', s => s.get(id));
const progPut = p => progStore('readwrite', s => s.put(p));
const progDel = id => progStore('readwrite', s => s.delete(id));

let _jszip = null;
function loadJSZip() {
  if (window.JSZip) return Promise.resolve(window.JSZip);
  if (_jszip) return _jszip;
  _jszip = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
    s.onload = () => resolve(window.JSZip);
    s.onerror = () => reject(new Error('Could not load JSZip. DOS import needs an internet connection the first time.'));
    document.head.append(s);
  });
  return _jszip;
}
function dosConfFor(exePath) {
  const parts = exePath.split('/').filter(Boolean);
  const base = parts.pop();
  const lines = ['[dosbox]', 'memsize=32', '', '[cpu]', 'cycles=auto', '', '[autoexec]', 'mount C .', 'C:'];
  if (parts.length) lines.push('cd ' + parts.join('\\'));
  lines.push(base, '');
  return lines.join('\r\n');
}
function isWindowsPE(bytes) {
  if (!bytes || bytes.length < 0x40 || bytes[0] !== 0x4d || bytes[1] !== 0x5a) return false;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const peOff = view.getUint32(0x3c, true);
  return peOff > 0 && peOff + 4 <= bytes.length && bytes[peOff] === 0x50 && bytes[peOff + 1] === 0x45 && bytes[peOff + 2] === 0 && bytes[peOff + 3] === 0;
}
const WINDOWS_EXE_MSG = 'That is a Windows program. Windows .EXE files cannot run in DOS mode — they need the future Boxedwine/v86 path.';
async function makeDosBundle(file) {
  const JSZip = await loadJSZip();
  const lower = file.name.toLowerCase();
  if (lower.endsWith('.jsdos')) return { bundle: file, exe: '(js-dos bundle)' };
  if (/\.(exe|com|bat)$/.test(lower)) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (lower.endsWith('.exe') && isWindowsPE(bytes)) throw new Error(WINDOWS_EXE_MSG);
    const zip = new JSZip();
    zip.file(file.name, bytes);
    zip.file('.jsdos/dosbox.conf', dosConfFor(file.name));
    return { bundle: await zip.generateAsync({ type: 'blob' }), exe: file.name };
  }
  if (lower.endsWith('.zip')) {
    const zip = await JSZip.loadAsync(file);
    const names = Object.keys(zip.files).filter(n => !zip.files[n].dir);
    if (names.some(n => n.toLowerCase().endsWith('.jsdos/dosbox.conf') || n.toLowerCase() === '.jsdos/dosbox.conf'))
      return { bundle: file, exe: '(js-dos bundle)' };
    const candidates = names.filter(n => /\.(exe|com|bat)$/i.test(n));
    const exes = [];
    for (const n of candidates) {
      if (/\.exe$/i.test(n) && isWindowsPE(await zip.files[n].async('uint8array'))) continue;
      exes.push(n);
    }
    if (!exes.length && candidates.length) throw new Error(WINDOWS_EXE_MSG);
    if (!exes.length) throw new Error('No DOS .EXE, .COM or .BAT file found in that ZIP.\nWindows programs cannot run in DOS mode — they need the future v86/Boxedwine path.');
    let exe = exes[0];
    if (exes.length > 1) {
      const pick = prompt('Several DOS programs found. Type the number to run:\n\n' + exes.map((e, i) => `${i + 1}. ${e}`).join('\n'), '1');
      exe = exes[Math.max(0, Math.min(exes.length - 1, (parseInt(pick, 10) || 1) - 1))];
    }
    zip.file('.jsdos/dosbox.conf', dosConfFor(exe));
    return { bundle: await zip.generateAsync({ type: 'blob', compression: 'STORE' }), exe };
  }
  throw new Error('Please provide a .zip, .jsdos, .exe, .com or .bat file.');
}
async function importProgramFile(file, { run = true } = {}) {
  if (file.size > 200 * 1024 * 1024 && !confirm(`"${file.name}" is ${(file.size / 1048576).toFixed(0)} MB. Large programs may be slow and use a lot of browser storage. Continue?`)) return null;
  const { bundle, exe } = await makeDosBundle(file);
  const name = (prompt('Program name:', file.name.replace(/\.(zip|jsdos)$/i, '')) || file.name).trim();
  const prog = { id: 'p' + Date.now().toString(36), name, exe, size: bundle.size, addedAt: Date.now(), bundle, settings: { backend: 'dosbox', cycles: 'auto' } };
  await progPut(prog);
  if (typeof refreshProgramsList === 'function') { try { await refreshProgramsList(); } catch { /* programs window closed */ } }
  if (run) openDOSPlayer(prog);
  return prog;
}
function openProgramPicker() { $('#program-input').click(); }

function openDOSPlayer(prog) {
  const wrap = div('');
  wrap.style.height = '100%';
  wrap.innerHTML = `<iframe class="dos-frame" title="${escapeHtml(prog.name)}" src="dos-player.html?id=${encodeURIComponent(prog.id)}" allow="autoplay; fullscreen; gamepad"></iframe>`;
  const win = createWindow({ title: `${prog.name} — DOS`, icon: '▶', width: 700, height: 520, body: wrap, menu: ['File', 'View', 'Help'] });
  win.body.style.background = '#000';
  const bar = win.el.querySelector('.statusbar span');
  bar.innerHTML = `<button class="btn98" id="dos-fs">Fullscreen</button> ${escapeHtml(prog.exe)} • ${escapeHtml(prog.settings?.backend || 'dosbox')} / cycles ${escapeHtml(prog.settings?.cycles || 'auto')} • Close the window to stop`;
  $('#dos-fs', bar).onclick = () => { const f = $('iframe', wrap); if (f.requestFullscreen) f.requestFullscreen(); };
}

function openProgramSettings(prog, onSaved) {
  const s = prog.settings || { backend: 'dosbox', cycles: 'auto' };
  const wrap = div(`<div class="field"><label>Emulator backend</label>
      <select id="set-backend" style="width:100%;padding:4px"><option value="dosbox" ${s.backend === 'dosbox' ? 'selected' : ''}>DOSBox (compatible)</option><option value="dosboxX" ${s.backend === 'dosboxX' ? 'selected' : ''}>DOSBox-X (more features, slower)</option></select></div>
    <div class="field"><label>CPU cycles (speed)</label>
      <select id="set-cycles" style="width:100%;padding:4px">${['auto', '3000', '10000', '30000', 'max'].map(c => `<option value="${c}" ${s.cycles === c ? 'selected' : ''}>${c === 'auto' ? 'Auto (recommended)' : c}</option>`).join('')}</select></div>
    <p>Settings apply the next time the program runs. Slower games often need higher cycles; too high can break sound timing.</p>
    <p><button class="btn98" id="set-save">Save Settings</button></p>`, 'padded');
  const win = createWindow({ title: `${prog.name} — Settings`, icon: '⚙', width: 400, height: 320, body: wrap, menu: null });
  $('#set-save', wrap).onclick = async () => {
    prog.settings = { backend: $('#set-backend', wrap).value, cycles: $('#set-cycles', wrap).value };
    await progPut(prog);
    win.close();
    if (onSaved) onSaved();
  };
}
function exportProgram(prog) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(prog.bundle);
  a.download = `${prog.name.replace(/[^\w\- ]+/g, '').trim() || 'program'}.jsdos`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
function openDOSDemo() {
  const wrap = div('');
  wrap.style.height = '100%';
  wrap.innerHTML = `<iframe class="dos-frame" title="Digger demo" src="dos-player.html?demo=1" allow="autoplay; fullscreen; gamepad"></iframe>`;
  const win = createWindow({ title: 'Digger (demo, streamed) — DOS', icon: '▶', width: 700, height: 520, body: wrap, menu: ['File', 'View', 'Help'] });
  win.body.style.background = '#000';
}
let refreshProgramsList = null;
async function openPrograms() {
  const wrap = div('<p>Loading…</p>', 'prog-list');
  const win = createWindow({ title: 'DOS Programs', icon: '▶', width: 560, height: 420, body: wrap });
  win.body.classList.add('facematch');
  async function render() {
    const progs = (await progAll().catch(() => [])).sort((a, b) => a.addedAt - b.addedAt);
    wrap.innerHTML = `<div style="display:flex;gap:6px;flex-wrap:wrap">
        <button class="btn98" id="pg-import">Import DOS program…</button>
        <button class="btn98" id="pg-demo">Try Digger demo</button>
        <input id="pg-search" type="text" placeholder="Search programs…" style="flex:1;min-width:140px;padding:4px 6px"></div>
      <p style="margin:4px 0">Provide your own DOS game or app as a <b>.zip</b> (with its .EXE/.COM/.BAT inside), a <b>.jsdos</b> bundle, or a single DOS executable. Everything runs locally in your browser — nothing is uploaded. Windows .EXE files will not run here.</p>`;
    if (!progs.length) wrap.append(div('<p><i>No programs imported yet.</i></p>'));
    for (const p of progs) {
      const row = div(`<span class="pname">▶ ${escapeHtml(p.name)}</span><span class="psize">${(p.size / 1024).toFixed(0)} KB</span>`, 'prog-row');
      row.dataset.name = p.name.toLowerCase();
      const mk = (label, fn) => { const b = document.createElement('button'); b.className = 'btn98'; b.textContent = label; b.onclick = fn; return b; };
      row.append(
        mk('Run', () => openDOSPlayer(p)),
        mk('Settings', () => openProgramSettings(p, render)),
        mk('Rename', async () => { const n = (prompt('Program name:', p.name) || '').trim(); if (n) { p.name = n; await progPut(p); render(); } }),
        mk('Export', () => exportProgram(p)),
        mk('Delete', async () => { if (confirm(`Delete "${p.name}" from this browser?`)) { await progDel(p.id); render(); } })
      );
      wrap.append(row);
    }
    $('#pg-import', wrap).onclick = openProgramPicker;
    $('#pg-demo', wrap).onclick = openDOSDemo;
    $('#pg-search', wrap).addEventListener('input', e => {
      const q = e.target.value.toLowerCase();
      $$('.prog-row', wrap).forEach(r => r.style.display = r.dataset.name.includes(q) ? '' : 'none');
    });
  }
  refreshProgramsList = async () => { if (document.contains(wrap)) await render(); };
  render();
}

/* ---------- v86 spike: real PC emulator for a user-provided disk image ---------- */
let pendingDisk = null;
let pendingDiskSizeGB = 8;
async function importInstallISO(file) {
  const rec = { id: 'install', isoBlob: file, isoName: file.name, diskSizeGB: pendingDiskSizeGB, ramMB: v86Settings().ramMB, profile: v86Settings().profile, addedAt: Date.now() };
  await diskPut(rec);
  openV86Player('v86-player.html?install=1', `Install: ${file.name}`);
}
const V86_PROFILES = { win98: 128, winme: 128, win2000: 256, winxp: 512, vista: 1024 };
const V86_NET_URLS = { public: 'wisps://wisp.mercurywork.shop/', local: 'wisp://127.0.0.1:12345' };
function v86Settings() { try { return { profile: 'win98', ramMB: 128, network: 'public', ...(JSON.parse(localStorage.getItem('win98-run-v86')) || {}) }; } catch { return { profile: 'win98', ramMB: 128, network: 'public' }; } }
function saveV86Settings(s) { localStorage.setItem('win98-run-v86', JSON.stringify(s)); }
function openV86() {
  const cur = v86Settings();
  const wrap = div(`<h3 style="margin-top:0">Windows disk image — v86 spike</h3>
    <p>This runs a <b>real x86 PC emulator</b> (v86) in a window. Provide your own bootable hard-disk image (<b>.img</b>) — Windows 98, ME, 2000, or XP. We do not supply or distribute a Windows image.</p>
    <div class="field"><label>Guest profile</label>
      <select id="v86-profile" style="width:100%;padding:4px">
        <option value="win98" ${cur.profile === 'win98' ? 'selected' : ''}>Windows 98 / 98SE — 128 MB</option>
        <option value="winme" ${cur.profile === 'winme' ? 'selected' : ''}>Windows ME — 128 MB</option>
        <option value="win2000" ${cur.profile === 'win2000' ? 'selected' : ''}>Windows 2000 — 256 MB</option>
        <option value="winxp" ${cur.profile === 'winxp' ? 'selected' : ''}>Windows XP — 512 MB</option>
        <option value="vista" ${cur.profile === 'vista' ? 'selected' : ''}>Windows Vista — 1 GB (experimental, likely very slow)</option>
      </select></div>
    <div class="field"><label>RAM</label>
      <select id="v86-ram" style="width:100%;padding:4px">${[64, 128, 256, 512, 1024].map(m => `<option value="${m}" ${cur.ramMB === m ? 'selected' : ''}>${m >= 1024 ? (m / 1024) + ' GB' : m + ' MB'}</option>`).join('')}</select></div>
    <p>Small images (up to ~2.8 MB) mount as a floppy; larger images as a hard disk. Optional CD image (<b>.iso</b>) can be attached after import. For Windows 2000/XP images, set the guest PC type to <b>Standard PC</b> (not ACPI) when preparing the image.</p>
    <div class="field"><label>Network (virtual ethernet)</label>
      <select id="v86-net" style="width:100%;padding:4px">
        <option value="public" ${cur.network === 'public' ? 'selected' : ''}>Internet via public relay (works anywhere)</option>
        <option value="local" ${cur.network === 'local' ? 'selected' : ''}>Internet via my own PC relay (wisp://127.0.0.1:12345)</option>
        <option value="off" ${cur.network === 'off' ? 'selected' : ''}>Off (no network card)</option>
      </select></div>
    <p style="margin:4px 0">The guest gets a virtual NE2000 ethernet card with DHCP. <b>Public relay</b> routes traffic through a third-party Wisp relay — fine for browsing, but do not sign into important accounts on Windows XP. <b>My own PC relay</b> uses your own connection: run the relay in the project's <b>relay</b> folder first (<i>npm install</i>, then <i>npm start</i>), then boot.</p>
    <div class="field"><label>Blank disk size (for ISO installs)</label>
      <select id="v86-disksize" style="width:100%;padding:4px"><option value="4">4 GB</option><option value="8" selected>8 GB (recommended for XP)</option><option value="12">12 GB</option></select></div>
    <p><button class="btn98" id="v86-import">Import disk image (.img)…</button>
    <button class="btn98" id="v86-install">Install Windows from ISO…</button>
    <button class="btn98" id="v86-last">Boot last imported image</button>
    <button class="btn98" id="v86-fresh">Boot fresh (ignore saved state)</button>
    <button class="btn98" id="v86-delstate">Delete saved state</button>
    <button class="btn98" id="v86-demo">Boot FreeDOS demo instead</button></p>
    <p>Saved machine states (from the player's <b>Save State</b> button) resume automatically on boot — including a Windows install in progress. <b>Boot fresh</b> ignores the saved state; <b>Delete saved state</b> throws it away.</p>
    <p><b>Have an installer ISO</b> (like a Windows XP CD image)? Use <b>Install Windows from ISO</b>: it creates a blank virtual hard disk, boots the CD, and runs Setup. An ISO by itself is not a hard disk, so it cannot be attached until a disk exists. Do not close the window during install — disk changes are not saved yet, so an install only lasts while the window stays open.</p>
    <p>Expect a slow boot and no 3D acceleration. Sound, saving the disk back, and performance are being evaluated in this spike.</p>`, 'padded');
  createWindow({ title: 'Win98 Image (v86 spike)', icon: '▣', width: 540, height: 480, body: wrap, menu: null });
  const profileSel = $('#v86-profile', wrap), ramSel = $('#v86-ram', wrap), netSel = $('#v86-net', wrap);
  const persist = () => saveV86Settings({ profile: profileSel.value, ramMB: Number(ramSel.value), network: netSel.value });
  profileSel.onchange = () => { ramSel.value = String(V86_PROFILES[profileSel.value] || 128); persist(); };
  ramSel.onchange = persist;
  netSel.onchange = persist;
  $('#v86-install', wrap).onclick = () => { pendingDiskSizeGB = Number($('#v86-disksize', wrap).value || 8); $('#install-iso-input').click(); };
  $('#v86-import', wrap).onclick = () => $('#disk-input').click();
  $('#v86-demo', wrap).onclick = () => openV86Player('v86-player.html?demo=1', 'FreeDOS (demo)');
  $('#v86-last', wrap).onclick = async () => {
    const last = await diskGet('last').catch(() => null);
    if (!last) { alert('No disk image imported yet in this browser. Import one first.'); return; }
    openV86Player('v86-player.html?img=last', last.name);
  };
  $('#v86-fresh', wrap).onclick = async () => {
    const last = await diskGet('last').catch(() => null);
    if (!last) { alert('No disk image imported yet in this browser. Import one first.'); return; }
    openV86Player('v86-player.html?img=last&fresh=1', last.name);
  };
  $('#v86-delstate', wrap).onclick = async () => {
    await stateDelete('last:state').catch(() => {});
    await stateDelete('install:state').catch(() => {});
    alert('Saved machine states deleted. The next boot starts from the disk image itself.');
  };
}
function openV86Player(src, name) {
  const ram = v86Settings().ramMB || 128;
  if (!/[?&]ram=/.test(src)) src += (src.includes('?') ? '&' : '?') + 'ram=' + ram;
  if (!/[?&]net=/.test(src)) src += '&net=' + (v86Settings().network || 'public');
  const wrap = div('');
  wrap.style.height = '100%';
  wrap.innerHTML = `<iframe class="dos-frame" title="${escapeHtml(name)}" src="${src}" allow="autoplay; fullscreen; gamepad; pointer-lock"></iframe>`;
  const win = createWindow({ title: `${name} — v86`, icon: '▣', width: 760, height: 560, body: wrap, menu: ['File', 'View', 'Help'], menus: {
    File: [
      { label: 'Lock / Unlock Mouse (Right Ctrl)', fn: a => { const f = $('iframe', a.body); f?.focus(); f?.contentWindow?.__win98LockMouse?.(); } },
      { label: 'Send Enter Key', fn: a => { const f = $('iframe', a.body); f?.contentWindow?.__win98SendKey?.(13); } },
      { label: 'Focus Keyboard', fn: a => { const f = $('iframe', a.body); f?.focus(); f?.contentWindow?.__win98FocusKeyboard?.(); } },
      { label: 'Close Window', fn: a => a.close() }
    ],
    View: [
      { label: 'Maximize / Restore', fn: a => a.el.classList.toggle('maximized') },
      { label: 'Minimize', fn: a => a.el.classList.add('minimized') }
    ],
    Help: [{ label: 'Keyboard Help', fn: () => alert('Click inside the black emulator screen, or use File → Focus Keyboard.\n\nIf keys still do not reach the guest, use the ⏎ Enter / F8 buttons in the player toolbar at the top of the emulator — those send keys directly to the virtual PC.\n\nXP Setup: Enter = continue, F8 = accept licence, arrow keys = choose partition.') }]
  } });
  win.body.style.background = '#000';
  win.el.classList.add('maximized');
  win.el.querySelector('.statusbar span').textContent = `v86 spike • ${v86Settings().profile} profile • ${ram} MB RAM • Your image stays on this device • Close the window to stop the PC`;
}
async function importDiskImage(file) {
  const kind = file.size <= 2.88 * 1024 * 1024 ? 'fda' : 'hda';
  pendingDisk = { id: 'last', blob: file, name: file.name, kind, size: file.size, addedAt: Date.now(), isoBlob: null, isoName: null, ramMB: v86Settings().ramMB, profile: v86Settings().profile };
  await diskPut(pendingDisk);
  if (confirm(`Disk image "${file.name}" saved (${kind === 'fda' ? 'floppy' : 'hard disk'}).\n\nAttach a CD image (.iso) too? Cancel boots without one.`)) {
    $('#iso-input').click();
  } else {
    openV86Player('v86-player.html?img=last', file.name);
  }
}

/* ---------- Account & cloud sync (Phase B) ---------- */
function openAccount() {
  const wrap = div('<p>Loading…</p>', 'padded');
  const win = createWindow({ title: 'Account & Cloud', icon: '☁', width: 520, height: 430, body: wrap, menu: null });
  const C = window.Win98Cloud;
  async function render() {
    if (!C || !C.enabled) {
      wrap.innerHTML = `<h3 style="margin-top:0">Cloud is not configured yet</h3>
        <p>Your files and saved states currently live <b>only in this browser</b>. Cloud sync turns on when a Supabase project is connected:</p>
        <p>1. Create a Supabase project (or provision one via Stripe Projects).<br>
        2. Run <b>supabase/schema.sql</b> in its SQL editor and create a private bucket named <b>vm-states</b>.<br>
        3. Put the project URL and anon key in <b>cloud-config.js</b>.</p>
        <p>Nothing is uploaded until you sign in and press an Upload button.</p>`;
      return;
    }
    const sess = await C.session().catch(() => null);
    if (!sess) {
      wrap.innerHTML = `<h3 style="margin-top:0">Sign in</h3>
        <div class="field"><label>Email</label><input type="text" id="acc-email" autocomplete="email"></div>
        <div class="field"><label>Password</label><input type="password" id="acc-pass" autocomplete="current-password" style="width:100%;padding:4px 6px"></div>
        <p><button class="btn98" id="acc-in">Sign In</button> <button class="btn98" id="acc-up">Create Account</button></p>
        <p id="acc-msg"></p>`;
      const msg = t => { $('#acc-msg', wrap).textContent = t; };
      $('#acc-in', wrap).onclick = async () => { try { msg('Signing in…'); await C.signIn($('#acc-email', wrap).value.trim(), $('#acc-pass', wrap).value); render(); } catch (e) { msg(e.message); } };
      $('#acc-up', wrap).onclick = async () => { try { msg('Creating account…'); await C.signUp($('#acc-email', wrap).value.trim(), $('#acc-pass', wrap).value); msg('Account created. Check your email if confirmation is required, then sign in.'); } catch (e) { msg(e.message); } };
      return;
    }
    let rows = [];
    try { rows = await C.listStates(); } catch (e) { /* show below */ }
    const used = rows.reduce((a, r) => a + (r.size || 0), 0);
    const plan = await C.plan().catch(() => ({ plus: false, sub: null }));
    const limitGB = plan.plus ? 25 : 5;
    const planHtml = plan.plus
      ? `<p><b>Plus</b> (${escapeHtml(plan.sub?.interval === 'year' ? 'yearly' : 'monthly')})${plan.sub?.current_period_end ? ` · current period ends ${new Date(plan.sub.current_period_end).toLocaleDateString()}` : ''} &nbsp;<button class="btn98" id="acc-portal">Manage Billing</button></p>`
      : `<p><b>Free plan</b> — 1 cloud state, up to 5 GB. <b>Plus</b> gives you multiple states and 25 GB.<br>
         <button class="btn98" id="acc-plus-m">Upgrade — $6/month</button>
         <button class="btn98" id="acc-plus-y">Upgrade — $60/year</button></p>`;
    wrap.innerHTML = `<h3 style="margin-top:0">Signed in</h3>
      <p>${escapeHtml(sess.user.email || '')} &nbsp;<button class="btn98" id="acc-out">Sign Out</button></p>
      ${planHtml}
      <p>Cloud usage: ${(used / 1073741824).toFixed(2)} GB of ${limitGB} GB</p>
      <p><button class="btn98" id="up-last">Upload saved state (last disk)</button>
      <button class="btn98" id="up-install">Upload install state</button></p>
      <p id="acc-msg"></p><div id="acc-list"></div>`;
    const msg = t => { const m = $('#acc-msg', wrap); if (m) m.textContent = t; };
    $('#acc-out', wrap).onclick = async () => { await C.signOut(); render(); };
    const goBilling = fn => async () => { try { msg('Opening secure Stripe page…'); location.href = await fn(); } catch (e) { msg(e.message); } };
    if ($('#acc-portal', wrap)) $('#acc-portal', wrap).onclick = goBilling(() => C.portal());
    if ($('#acc-plus-m', wrap)) $('#acc-plus-m', wrap).onclick = goBilling(() => C.checkout('month'));
    if ($('#acc-plus-y', wrap)) $('#acc-plus-y', wrap).onclick = goBilling(() => C.checkout('year'));
    const up = key => async () => { try { msg('Uploading… large states can take a while.'); await C.uploadState(key); await render(); msg('Uploaded.'); } catch (e) { msg(e.message); } };
    $('#up-last', wrap).onclick = up('last:state');
    $('#up-install', wrap).onclick = up('install:state');
    const list = $('#acc-list', wrap);
    if (!rows.length) list.append(div('<p><i>No cloud states yet.</i></p>'));
    for (const r of rows) {
      const row = div(`<span class="pname">☁ ${escapeHtml(r.name || r.disk_key)}</span><span class="psize">${(r.size / 1048576).toFixed(1)} MB</span>`, 'prog-row');
      const dl = document.createElement('button'); dl.className = 'btn98'; dl.textContent = 'Download & Resume';
      dl.onclick = async () => { try { msg('Downloading…'); await C.downloadState(r); msg('Downloaded. Boot the disk — it will resume this state.'); } catch (e) { msg(e.message); } };
      const del = document.createElement('button'); del.className = 'btn98'; del.textContent = 'Delete';
      del.onclick = async () => { if (confirm('Delete this cloud state?')) { try { await C.deleteState(r); render(); } catch (e) { msg(e.message); } } };
      row.append(dl, del); list.append(row);
    }
  }
  render();
}

/* ---------- Desktop, Start menu, tray ---------- */
const APPS = {
  explorer: (p) => openExplorer(p || 'My Computer'), notepad: () => openNotepad(), paint: openPaint,
  minesweeper: openMinesweeper, calculator: openCalculator, ie: openIE, display: openDisplay, system: openSystem,
  programs: openPrograms, v86: openV86, account: openAccount
};
const DESKTOP_ICONS = [
  ['🖥', 'My Computer', () => openExplorer('My Computer')], ['📁', 'My Documents', () => openExplorer('My Documents')],
  ['🗑', 'Recycle Bin', () => openExplorer('Recycle Bin')], ['◎', 'Internet Explorer', openIE],
  ['▤', 'Notepad', () => openNotepad()], ['✿', 'Paint', openPaint], ['✸', 'Minesweeper', openMinesweeper],
  ['▦', 'Calculator', openCalculator], ['▤', 'Welcome.txt', () => openNotepad('Welcome.txt')],
  ['▶', 'DOS Programs', openPrograms], ['⬇', 'Run Program…', openProgramPicker],
  ['💽', 'Win98 Image (v86)', openV86]
];
function buildDesktop() {
  applyWallpaper();
  const icons = $('#icons'); icons.innerHTML = '';
  for (const [icon, label, fn] of DESKTOP_ICONS) {
    const b = document.createElement('button'); b.className = 'dicon';
    b.innerHTML = `<span class="dic">${icon}</span><span class="dl">${label}</span>`;
    b.onclick = () => { $$('.dicon').forEach(d => d.classList.remove('selected')); b.classList.add('selected'); };
    b.ondblclick = fn; icons.append(b);
  }
  if (!sessionStorage.getItem('win98-welcomed')) { openWelcome(); sessionStorage.setItem('win98-welcomed', '1'); }
}
function tickClock() { $('#clock').textContent = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); }
setInterval(tickClock, 1000);

const startMenu = $('#start-menu'), startBtn = $('#start-btn');
function closeStart() { startMenu.classList.add('hidden'); startBtn.classList.remove('pressed'); }
startBtn.onclick = e => { e.stopPropagation(); const open = startMenu.classList.toggle('hidden'); startBtn.classList.toggle('pressed', !open); };
document.addEventListener('click', e => { if (!e.target.closest('#start-menu') && !e.target.closest('#start-btn')) closeStart(); if (!e.target.closest('#context-menu')) $('#context-menu').classList.add('hidden'); });
startMenu.addEventListener('click', e => {
  const app = e.target.closest('[data-app]'), act = e.target.closest('[data-action]');
  if (app) { APPS[app.dataset.app](app.dataset.path); closeStart(); }
  if (act?.dataset.action === 'import-program') { closeStart(); openProgramPicker(); }
  if (act?.dataset.action === 'shutdown') shutdown();
  if (act?.dataset.action === 'run') { closeStart(); const cmd = (prompt('Type the name of a program (notepad, paint, calc, minesweeper, ie):', '') || '').toLowerCase(); ({ notepad: APPS.notepad, paint: APPS.paint, calc: APPS.calculator, minesweeper: APPS.minesweeper, ie: APPS.ie })[cmd]?.(); }
});
$('#show-desktop').onclick = () => { for (const w of openWins.values()) w.el.classList.add('minimized'); setActive(null); };

const ctx = $('#context-menu');
$('#desktop').addEventListener('contextmenu', e => {
  if (e.target.closest('.window') || e.target.closest('#taskbar')) return;
  e.preventDefault(); ctx.style.left = e.clientX + 'px'; ctx.style.top = e.clientY + 'px'; ctx.classList.remove('hidden');
});
ctx.addEventListener('click', e => {
  const a = e.target.dataset.action; ctx.classList.add('hidden');
  if (a === 'display') openDisplay();
  if (a === 'refresh') buildDesktop();
  if (a === 'new-text') { files['New Text Document.txt'] = ''; saveFiles(); openNotepad('New Text Document.txt'); }
});

/* Drag real files in (borrowed from Quenq Reborn XP) */
$('#desktop').addEventListener('dragover', e => e.preventDefault());
$('#program-input').addEventListener('change', async e => {
  const f = e.target.files?.[0]; e.target.value = '';
  if (!f) return;
  try { await importProgramFile(f); } catch (err) { alert('Could not run that program:\n\n' + err.message); }
});
$('#disk-input').addEventListener('change', async e => {
  const f = e.target.files?.[0]; e.target.value = '';
  if (!f) return;
  try { await importDiskImage(f); } catch (err) { alert('Could not load that disk image:\n\n' + err.message); }
});
$('#install-iso-input').addEventListener('change', async e => {
  const f = e.target.files?.[0]; e.target.value = '';
  if (!f) return;
  try { await importInstallISO(f); } catch (err) { alert('Could not start the installer:\n\n' + err.message); }
});
$('#iso-input').addEventListener('change', async e => {
  const f = e.target.files?.[0]; e.target.value = '';
  if (pendingDisk && f) { pendingDisk.isoBlob = f; pendingDisk.isoName = f.name; try { await diskPut(pendingDisk); } catch { /* boot without saved ISO */ } }
  if (pendingDisk) openV86Player('v86-player.html?img=last', pendingDisk.name);
});
$('#desktop').addEventListener('drop', e => {
  e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (!f) return;
  if (/\.(zip|jsdos|exe|com|bat)$/i.test(f.name)) { importProgramFile(f).catch(err => alert('Could not run that program:\n\n' + err.message)); return; }
  if (/\.img$/i.test(f.name)) { importDiskImage(f).catch(err => alert('Could not load that disk image:\n\n' + err.message)); return; }
  if (/\.iso$/i.test(f.name)) { if (confirm(`"${f.name}" is an installer CD image.\n\nOK: create a blank disk and install from it.\nCancel: open the Win98 Image window for other options.`)) { pendingDiskSizeGB = 8; importInstallISO(f).catch(err => alert('Could not start the installer:\n\n' + err.message)); } else openV86(); return; }
  if (/text|json/.test(f.type) || /\.(txt|md)$/i.test(f.name)) f.text().then(t => { files[f.name] = t; saveFiles(); openNotepad(f.name); });
  else if (f.type.startsWith('image/')) { const r = new FileReader(); r.onload = () => { settings.wallpaperImage = r.result; try { saveSettings(); } catch { /* image too large to persist; kept for this session */ } applyWallpaper(); }; r.readAsDataURL(f); }
  else alert(`"${f.name}" was received, but this simulation can only open text files, images, and DOS programs (.zip, .jsdos, .exe, .com, .bat).`);
});

function shutdown() { closeStart(); $('#desktop').classList.add('hidden'); $('#boot').classList.add('hidden'); $('#shutdown').classList.remove('hidden'); }
$('#power-on').onclick = () => location.reload();

/* ---------- Boot sequence ---------- */
const BIOS_LINES = [
  'Award Modular BIOS v4.51PG, An Energy Star Ally', 'Copyright (C) 1984-98, Award Software, Inc.', '',
  'Main Processor : Pentium II 350MHz', 'Memory Testing : 131072K OK', '',
  'Detecting IDE Primary Master   ... WDC WD400BB', 'Detecting IDE Primary Slave    ... None',
  'Detecting IDE Secondary Master ... CD-ROM', '',
  'Press DEL to enter SETUP', 'Verifying DMI Pool Data ........', 'Starting Windows 98...'
];
let bootTimer = [];
function runBoot() {
  const biosText = $('#bios-text'), bios = $('#bios'), splash = $('#splash'), bar = $('#boot-progress');
  BIOS_LINES.forEach((line, i) => bootTimer.push(setTimeout(() => biosText.textContent += line + '\n', 90 * i)));
  bootTimer.push(setTimeout(() => { bios.classList.add('hidden'); splash.classList.remove('hidden'); let p = 0; const iv = setInterval(() => { p += 8; bar.style.width = Math.min(100, p) + '%'; if (p >= 100) { clearInterval(iv); enterDesktop(); } }, 110); bootTimer.push(iv); }, 90 * BIOS_LINES.length + 250));
}
function enterDesktop() {
  bootTimer.forEach(t => { clearTimeout(t); clearInterval(t); }); bootTimer = [];
  $('#boot').classList.add('hidden'); $('#desktop').classList.remove('hidden');
  if (settings.wallpaperImage) $('#desktop').style.background = `url(${settings.wallpaperImage}) center/cover`;
  buildDesktop(); tickClock();
  const billing = new URLSearchParams(location.search).get('billing');
  if (billing) {
    history.replaceState(null, '', location.pathname);
    setTimeout(() => {
      openAccount();
      if (billing === 'success') setTimeout(() => alert('Thanks! Your Plus subscription is being activated — if it still shows Free, wait a few seconds and reopen Account & Cloud.'), 600);
    }, 400);
  }
}
$('#boot').addEventListener('click', enterDesktop);
runBoot();

