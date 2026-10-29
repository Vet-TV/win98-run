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

function createWindow({ title, icon = '▣', width = 520, height = 380, body, onMount, menu = ['File', 'Edit', 'View', 'Help'] }) {
  const id = 'win' + (++winSeq);
  const el = document.createElement('section');
  el.className = 'window active'; el.dataset.id = id;
  const offset = (openWins.size % 6) * 26;
  el.style.cssText = `width:${width}px;height:${height}px;left:${70 + offset}px;top:${36 + offset}px;z-index:${++zTop}`;
  el.innerHTML = `
    <div class="titlebar"><span class="ticon">${icon}</span><span class="ttitle">${title}</span>
      <span class="tbtns"><button class="tbtn" data-act="min" title="Minimize">_</button><button class="tbtn" data-act="max" title="Maximize">▢</button><button class="tbtn" data-act="close" title="Close">✕</button></span></div>
    ${menu ? `<div class="menubar">${menu.map(m => `<span>${m}</span>`).join('')}</div>` : ''}
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
    const req = indexedDB.open(PROG_DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore('programs', { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return _idb;
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
  const prog = { id: 'p' + Date.now().toString(36), name, exe, size: bundle.size, addedAt: Date.now(), bundle };
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
  win.el.querySelector('.statusbar span').textContent = `${prog.exe} • Files stay on this device • Close the window to stop`;
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
        <button class="btn98" id="pg-demo">Try Digger demo</button></div>
      <p style="margin:4px 0">Provide your own DOS game or app as a <b>.zip</b> (with its .EXE/.COM/.BAT inside), a <b>.jsdos</b> bundle, or a single DOS executable. Everything runs locally in your browser — nothing is uploaded. Windows .EXE files will not run here.</p>`;
    if (!progs.length) wrap.append(div('<p><i>No programs imported yet.</i></p>'));
    for (const p of progs) {
      const row = div(`<span class="pname">▶ ${escapeHtml(p.name)}</span><span class="psize">${(p.size / 1024).toFixed(0)} KB</span>`, 'prog-row');
      const run = document.createElement('button'); run.className = 'btn98'; run.textContent = 'Run';
      run.onclick = () => openDOSPlayer(p);
      const del = document.createElement('button'); del.className = 'btn98'; del.textContent = 'Delete';
      del.onclick = async () => { if (confirm(`Delete "${p.name}" from this browser?`)) { await progDel(p.id); render(); } };
      row.append(run, del); wrap.append(row);
    }
    $('#pg-import', wrap).onclick = openProgramPicker;
    $('#pg-demo', wrap).onclick = openDOSDemo;
  }
  refreshProgramsList = async () => { if (document.contains(wrap)) await render(); };
  render();
}

/* ---------- Desktop, Start menu, tray ---------- */
const APPS = {
  explorer: (p) => openExplorer(p || 'My Computer'), notepad: () => openNotepad(), paint: openPaint,
  minesweeper: openMinesweeper, calculator: openCalculator, ie: openIE, display: openDisplay, system: openSystem,
  programs: openPrograms
};
const DESKTOP_ICONS = [
  ['🖥', 'My Computer', () => openExplorer('My Computer')], ['📁', 'My Documents', () => openExplorer('My Documents')],
  ['🗑', 'Recycle Bin', () => openExplorer('Recycle Bin')], ['◎', 'Internet Explorer', openIE],
  ['▤', 'Notepad', () => openNotepad()], ['✿', 'Paint', openPaint], ['✸', 'Minesweeper', openMinesweeper],
  ['▦', 'Calculator', openCalculator], ['▤', 'Welcome.txt', () => openNotepad('Welcome.txt')],
  ['▶', 'DOS Programs', openPrograms], ['⬇', 'Run Program…', openProgramPicker]
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
$('#desktop').addEventListener('drop', e => {
  e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (!f) return;
  if (/\.(zip|jsdos|exe|com|bat)$/i.test(f.name)) { importProgramFile(f).catch(err => alert('Could not run that program:\n\n' + err.message)); return; }
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
}
$('#boot').addEventListener('click', enterDesktop);
runBoot();

