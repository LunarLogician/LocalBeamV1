const express = require('express');
const multer = require('multer');
const qrcode = require('qrcode');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { exec } = require('child_process');

const app = express();
const PORT = 3000;
const UPLOADS_DIR = path.join(__dirname, 'received');
const SHARED_DIR = path.join(__dirname, 'shared');

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);
if (!fs.existsSync(SHARED_DIR)) fs.mkdirSync(SHARED_DIR);

const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e6);
    cb(null, unique + '-' + file.originalname);
  }
});
const upload = multer({ storage });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/files', express.static(UPLOADS_DIR));
app.use('/shared', express.static(SHARED_DIR));

const texts = [];

function getLocalIP() {
  const ifaces = os.networkInterfaces();
  for (const iface of Object.values(ifaces)) {
    for (const alias of iface) {
      if (alias.family === 'IPv4' && !alias.internal) return alias.address;
    }
  }
  return 'localhost';
}

app.get('/', (req, res) => {
  res.send(getHTML());
});

app.post('/upload', upload.array('files'), (req, res) => {
  const uploaded = req.files.map(f => ({ name: f.originalname, saved: f.filename, size: f.size }));
  res.json({ success: true, files: uploaded });
});

app.post('/text', (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'No text' });
  const entry = { id: Date.now(), content, time: new Date().toLocaleTimeString() };
  texts.unshift(entry);
  if (texts.length > 50) texts.pop();
  res.json({ success: true, entry });
});

app.get('/api/texts', (req, res) => res.json(texts));

app.get('/api/files', (req, res) => {
  const files = fs.readdirSync(UPLOADS_DIR).map(f => {
    const stat = fs.statSync(path.join(UPLOADS_DIR, f));
    return { name: f, size: stat.size, time: stat.mtime };
  }).sort((a, b) => new Date(b.time) - new Date(a.time));
  res.json(files);
});

app.get('/api/shared', (req, res) => {
  const files = fs.readdirSync(SHARED_DIR).map(f => {
    const stat = fs.statSync(path.join(SHARED_DIR, f));
    return { name: f, size: stat.size, time: stat.mtime };
  }).sort((a, b) => new Date(b.time) - new Date(a.time));
  res.json(files);
});

app.delete('/api/files/:name', (req, res) => {
  const file = path.join(UPLOADS_DIR, path.basename(req.params.name));
  if (fs.existsSync(file)) { fs.unlinkSync(file); res.json({ success: true }); }
  else res.status(404).json({ error: 'Not found' });
});

app.get('/qr', (req, res) => {
  res.sendFile(path.join(__dirname, 'qr.png'));
});

app.listen(PORT, '0.0.0.0', async () => {
  const ip = getLocalIP();
  const url = `http://${ip}:${PORT}`;
  console.log('\n🚀 LocalBeam running!');
  console.log(`📡 Open on your phone: ${url}\n`);
  console.log(`💻 To share files Linux → Phone: copy files into  shared/`);
  try {
    const qr = await qrcode.toString(url, { type: 'terminal', small: true });
    console.log(qr);
    // Save QR as PNG so you can scan it anytime
    const qrPath = path.join(__dirname, 'qr.png');
    await qrcode.toFile(qrPath, url, { width: 300, margin: 2 });
    console.log(`📷 QR saved to: ${qrPath}`);
  } catch (e) {}
  console.log(`📂 Files saved to: ${UPLOADS_DIR}\n`);
  // Auto-open in browser on Linux
  exec('xdg-open http://localhost:' + PORT, () => {});
});

function getHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>LocalBeam</title>
<link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;600;800&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #0a0a0f; --surface: #111118; --card: #16161f; --border: #2a2a3a;
    --accent: #00e5ff; --accent2: #bf5af2; --accent3: #ff6b35;
    --text: #e8e8f0; --muted: #6b6b8a; --success: #00ff9d; --radius: 12px;
  }
  body { font-family: 'Syne', sans-serif; background: var(--bg); color: var(--text); min-height: 100vh; overflow-x: hidden; }
  body::before {
    content: ''; position: fixed; top: -50%; left: -50%; width: 200%; height: 200%;
    background: radial-gradient(ellipse at 20% 20%, rgba(0,229,255,0.04) 0%, transparent 50%),
                radial-gradient(ellipse at 80% 80%, rgba(191,90,242,0.04) 0%, transparent 50%);
    pointer-events: none; z-index: 0;
  }
  .container { position: relative; z-index: 1; max-width: 700px; margin: 0 auto; padding: 24px 16px 60px; }
  header { display: flex; align-items: center; gap: 12px; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 1px solid var(--border); }
  .logo { width: 40px; height: 40px; background: linear-gradient(135deg, var(--accent), var(--accent2)); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; }
  h1 { font-size: 1.6rem; font-weight: 800; letter-spacing: -0.02em; }
  h1 span { color: var(--accent); }
  .tagline { font-size: 0.8rem; color: var(--muted); font-family: 'Space Mono', monospace; }
  .tabs { display: flex; gap: 4px; margin-bottom: 20px; background: var(--surface); padding: 4px; border-radius: var(--radius); border: 1px solid var(--border); }
  .tab { flex: 1; padding: 10px; border: none; background: transparent; color: var(--muted); font-family: 'Syne', sans-serif; font-size: 0.85rem; font-weight: 600; cursor: pointer; border-radius: 8px; transition: all 0.2s; }
  .tab.active { background: var(--card); color: var(--text); box-shadow: 0 1px 8px rgba(0,0,0,0.4); }
  .panel { display: none; }
  .panel.active { display: block; }
  .card { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; margin-bottom: 16px; }
  .card-title { font-size: 0.75rem; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 14px; font-family: 'Space Mono', monospace; }
  .dropzone { border: 2px dashed var(--border); border-radius: var(--radius); padding: 40px 20px; text-align: center; cursor: pointer; transition: all 0.2s; position: relative; }
  .dropzone:hover, .dropzone.drag-over { border-color: var(--accent); background: rgba(0,229,255,0.03); }
  .dropzone input { position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%; }
  .drop-icon { font-size: 2.5rem; margin-bottom: 12px; }
  .drop-text { font-size: 1rem; font-weight: 600; margin-bottom: 6px; }
  .drop-sub { font-size: 0.8rem; color: var(--muted); }
  .progress-wrap { margin-top: 14px; display: none; }
  .progress-bar { height: 4px; background: var(--border); border-radius: 2px; overflow: hidden; }
  .progress-fill { height: 100%; background: linear-gradient(90deg, var(--accent), var(--accent2)); border-radius: 2px; width: 0%; transition: width 0.3s; }
  .progress-label { font-size: 0.75rem; color: var(--muted); margin-top: 6px; font-family: 'Space Mono', monospace; }
  .toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%) translateY(80px); background: var(--card); border: 1px solid var(--border); color: var(--text); padding: 12px 20px; border-radius: 40px; font-size: 0.85rem; font-weight: 600; z-index: 999; transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1); display: flex; align-items: center; gap: 8px; white-space: nowrap; }
  .toast.show { transform: translateX(-50%) translateY(0); }
  .toast.success { border-color: var(--success); }
  .toast.error { border-color: var(--accent3); }
  textarea { width: 100%; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; color: var(--text); font-family: 'Space Mono', monospace; font-size: 0.85rem; padding: 14px; resize: vertical; min-height: 120px; transition: border-color 0.2s; outline: none; }
  textarea:focus { border-color: var(--accent); }
  .btn { display: inline-flex; align-items: center; gap: 8px; padding: 12px 20px; border: none; border-radius: 8px; font-family: 'Syne', sans-serif; font-weight: 700; font-size: 0.9rem; cursor: pointer; transition: all 0.2s; }
  .btn-primary { background: linear-gradient(135deg, var(--accent), #0099bb); color: #000; width: 100%; justify-content: center; margin-top: 12px; }
  .btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
  .btn-ghost { background: transparent; border: 1px solid var(--border); color: var(--muted); padding: 6px 12px; font-size: 0.75rem; }
  .btn-ghost:hover { border-color: var(--text); color: var(--text); }
  .btn-danger { background: transparent; border: 1px solid transparent; color: var(--muted); padding: 4px 8px; font-size: 0.8rem; }
  .btn-danger:hover { color: var(--accent3); }
  .file-item { display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; margin-bottom: 8px; animation: slideIn 0.2s ease; }
  @keyframes slideIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
  .file-icon { width: 36px; height: 36px; background: var(--card); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; flex-shrink: 0; }
  .file-info { flex: 1; min-width: 0; }
  .file-name { font-size: 0.85rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .file-meta { font-size: 0.72rem; color: var(--muted); font-family: 'Space Mono', monospace; margin-top: 2px; }
  .file-actions { display: flex; gap: 4px; flex-shrink: 0; }
  .text-item { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 12px; margin-bottom: 8px; animation: slideIn 0.2s ease; }
  .text-content { font-family: 'Space Mono', monospace; font-size: 0.82rem; line-height: 1.5; word-break: break-all; white-space: pre-wrap; max-height: 120px; overflow-y: auto; }
  .text-meta { display: flex; justify-content: space-between; align-items: center; margin-top: 10px; }
  .text-time { font-size: 0.7rem; color: var(--muted); font-family: 'Space Mono', monospace; }
  .empty { text-align: center; padding: 40px 20px; color: var(--muted); font-size: 0.85rem; }
  .empty-icon { font-size: 2rem; margin-bottom: 8px; }
  .refresh-btn { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; justify-content: flex-end; }
  .img-preview { max-width: 100%; max-height: 160px; border-radius: 6px; margin-bottom: 8px; object-fit: cover; display: block; }
</style>
</head>
<body>
<div class="container">
  <header>
    <div class="logo">⚡</div>
    <div>
      <h1>Local<span>Beam</span></h1>
      <div class="tagline">phone ↔ linux • no cables • no internet</div>
    </div>
  </header>

  <div class="tabs">
    <button class="tab active" onclick="switchTab('send')">📤 Send</button>
    <button class="tab" onclick="switchTab('files')">📁 Received</button>
    <button class="tab" onclick="switchTab('pc')">💻 PC→📱</button>
    <button class="tab" onclick="switchTab('texts')">💬 Texts</button>
  </div>

  <div id="panel-send" class="panel active">
    <div class="card">
      <div class="card-title">Drop Files</div>
      <div class="dropzone" id="dropzone">
        <input type="file" id="fileInput" multiple onchange="handleFiles(this.files)">
        <div class="drop-icon">📂</div>
        <div class="drop-text">Tap to select files</div>
        <div class="drop-sub">Images, videos, docs — anything</div>
      </div>
      <div class="progress-wrap" id="progressWrap">
        <div class="progress-bar"><div class="progress-fill" id="progressFill"></div></div>
        <div class="progress-label" id="progressLabel">Uploading...</div>
      </div>
    </div>
    <div class="card">
      <div class="card-title">Send Text / Snippet</div>
      <textarea id="textInput" placeholder="Paste text, code, URL, anything..."></textarea>
      <button class="btn btn-primary" onclick="sendText()">⚡ Send Text</button>
    </div>
  </div>

  <div id="panel-files" class="panel">
    <div class="refresh-btn"><button class="btn btn-ghost" onclick="loadFiles()">↻ Refresh</button></div>
    <div id="filesList"><div class="empty"><div class="empty-icon">📭</div>No files yet</div></div>
  </div>

  <div id="panel-pc" class="panel">
    <div class="card" style="border-color:var(--accent2);margin-bottom:16px;">
      <div class="card-title">How to share from Linux</div>
      <div style="font-family:'Space Mono',monospace;font-size:0.8rem;color:var(--muted);line-height:1.8;">
        Copy any file into the <span style="color:var(--accent)">shared/</span> folder next to server.js — it appears here instantly.
      </div>
    </div>
    <div class="refresh-btn"><button class="btn btn-ghost" onclick="loadSharedFiles()">↻ Refresh</button></div>
    <div id="sharedList"><div class="empty"><div class="empty-icon">💻</div>No shared files yet</div></div>
  </div>

  <div id="panel-texts" class="panel">
    <div class="refresh-btn"><button class="btn btn-ghost" onclick="loadTexts()">↻ Refresh</button></div>
    <div id="textsList"><div class="empty"><div class="empty-icon">💬</div>No texts yet</div></div>
  </div>
</div>

<div class="toast" id="toast"></div>

<script>
function switchTab(tab) {
  document.querySelectorAll('.tab').forEach((t, i) => t.classList.toggle('active', ['send','files','pc','texts'][i] === tab));
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.getElementById('panel-' + tab).classList.add('active');
  if (tab === 'files') loadFiles();
  if (tab === 'pc') loadSharedFiles();
  if (tab === 'texts') loadTexts();
}

function toast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = (type === 'success' ? '✅ ' : '❌ ') + msg;
  t.className = 'toast ' + type + ' show';
  setTimeout(() => t.classList.remove('show'), 3000);
}

async function handleFiles(files) {
  if (!files.length) return;
  const fd = new FormData();
  for (const f of files) fd.append('files', f);
  const pw = document.getElementById('progressWrap');
  const pf = document.getElementById('progressFill');
  const pl = document.getElementById('progressLabel');
  pw.style.display = 'block'; pl.textContent = 'Uploading ' + files.length + ' file(s)...'; pf.style.width = '30%';
  const xhr = new XMLHttpRequest();
  xhr.upload.onprogress = e => { if (e.lengthComputable) pf.style.width = (e.loaded / e.total * 100) + '%'; };
  xhr.onload = () => { pf.style.width = '100%'; pl.textContent = 'Done!'; setTimeout(() => pw.style.display = 'none', 1500); toast(files.length + ' file(s) sent!'); document.getElementById('fileInput').value = ''; };
  xhr.onerror = () => toast('Upload failed', 'error');
  xhr.open('POST', '/upload'); xhr.send(fd);
}

async function sendText() {
  const content = document.getElementById('textInput').value.trim();
  if (!content) return toast('Nothing to send', 'error');
  const r = await fetch('/text', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ content }) });
  const d = await r.json();
  if (d.success) { toast('Text sent!'); document.getElementById('textInput').value = ''; }
}

function getFileIcon(name) {
  const ext = name.split('.').pop().toLowerCase();
  if (['jpg','jpeg','png','gif','webp','svg'].includes(ext)) return '🖼️';
  if (['mp4','mov','avi','mkv','webm'].includes(ext)) return '🎬';
  if (['mp3','wav','ogg','flac'].includes(ext)) return '🎵';
  if (['pdf'].includes(ext)) return '📄';
  if (['zip','rar','tar','gz'].includes(ext)) return '📦';
  if (['js','ts','py','html','css','json'].includes(ext)) return '💻';
  return '📎';
}

function formatBytes(b) {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b/1024).toFixed(1) + ' KB';
  return (b/1048576).toFixed(1) + ' MB';
}

async function loadFiles() {
  const r = await fetch('/api/files');
  const files = await r.json();
  const el = document.getElementById('filesList');
  if (!files.length) { el.innerHTML = '<div class="empty"><div class="empty-icon">📭</div>No files yet</div>'; return; }
  el.innerHTML = files.map(f => {
    const isImg = /\\.(jpg|jpeg|png|gif|webp)$/i.test(f.name);
    const cleanName = f.name.replace(/^\\d+-\\d+-/, '');
    return '<div class="file-item">' +
      '<div class="file-icon">' + getFileIcon(f.name) + '</div>' +
      '<div class="file-info">' +
      (isImg ? '<img src="/files/' + f.name + '" class="img-preview">' : '') +
      '<div class="file-name">' + cleanName + '</div>' +
      '<div class="file-meta">' + formatBytes(f.size) + ' · ' + new Date(f.time).toLocaleTimeString() + '</div>' +
      '</div>' +
      '<div class="file-actions">' +
      '<a href="/files/' + f.name + '" download class="btn btn-ghost">↓</a>' +
      '<button class="btn btn-danger" onclick="deleteFile(\\'' + f.name + '\\')">✕</button>' +
      '</div></div>';
  }).join('');
}

async function deleteFile(name) {
  await fetch('/api/files/' + name, { method: 'DELETE' });
  loadFiles(); toast('Deleted');
}

async function loadTexts() {
  const r = await fetch('/api/texts');
  const texts = await r.json();
  const el = document.getElementById('textsList');
  if (!texts.length) { el.innerHTML = '<div class="empty"><div class="empty-icon">💬</div>No texts yet</div>'; return; }
  el.innerHTML = texts.map(t =>
    '<div class="text-item">' +
    '<div class="text-content">' + t.content.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') + '</div>' +
    '<div class="text-meta"><span class="text-time">' + t.time + '</span>' +
    '<button class="btn btn-ghost" onclick="copyText(this)" data-text="' + t.content.replace(/"/g,'&quot;') + '">Copy</button>' +
    '</div></div>'
  ).join('');
}

async function loadSharedFiles() {
  const r = await fetch('/api/shared');
  const files = await r.json();
  const el = document.getElementById('sharedList');
  if (!files.length) { el.innerHTML = '<div class="empty"><div class="empty-icon">💻</div>No shared files yet<br><span style="font-size:0.75rem">Copy files into shared/ on Linux</span></div>'; return; }
  el.innerHTML = files.map(f =>
    '<div class="file-item">' +
    '<div class="file-icon">' + getFileIcon(f.name) + '</div>' +
    '<div class="file-info"><div class="file-name">' + f.name + '</div>' +
    '<div class="file-meta">' + formatBytes(f.size) + ' · ' + new Date(f.time).toLocaleTimeString() + '</div></div>' +
    '<div class="file-actions"><a href="/shared/' + encodeURIComponent(f.name) + '" download class="btn btn-ghost">↓ Download</a></div>' +
    '</div>'
  ).join('');
}

function copyText(btn) {
  navigator.clipboard.writeText(btn.dataset.text).then(() => toast('Copied!'));
}

const dz = document.getElementById('dropzone');
dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('drag-over'); });
dz.addEventListener('dragleave', () => dz.classList.remove('drag-over'));
dz.addEventListener('drop', e => { e.preventDefault(); dz.classList.remove('drag-over'); handleFiles(e.dataTransfer.files); });

setInterval(() => {
  const active = document.querySelector('.panel.active');
  if (active?.id === 'panel-files') loadFiles();
  if (active?.id === 'panel-pc') loadSharedFiles();
  if (active?.id === 'panel-texts') loadTexts();
}, 5000);
</script>
</body>
</html>`;
}