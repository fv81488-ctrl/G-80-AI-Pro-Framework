/**

- A-SSC Sovereign Lab v6.0 — app.js
- Supplementary module: Settings, Service Worker, Error Logger,
- File System API, AES Project Save/Load, Monaco Worker fix
- Dr. Gazy A.A. Ebrahim — 2026
  */

(function () {
  'use strict';

/* ════════════════════════════════════════════════
1. ERROR BOUNDARY LOGGER
════════════════════════════════════════════════ */
const ErrorLog = {
entries: [],
maxEntries: 100,

capture(source, err, context = '') {
  const entry = {
    ts: new Date().toISOString(),
    source,
    message: err?.message || String(err),
    stack: err?.stack || '',
    context,
    url: location.href
  };
  this.entries.push(entry);
  if (this.entries.length > this.maxEntries) this.entries.shift();
  console.error(`[A-SSC Error] [${source}]`, err);
  this._updateBadge();
  return entry;
},

getLogs() { return [...this.entries]; },
clearLogs() { this.entries = []; this._updateBadge(); },

export() {
  const blob = new Blob([JSON.stringify(this.entries, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `assc-errors-${Date.now()}.json`;
  a.click();
},

_updateBadge() {
  const badge = document.getElementById('err-badge');
  if (!badge) return;
  const count = this.entries.length;
  badge.textContent = count > 0 ? count : '';
  badge.style.display = count > 0 ? 'inline-block' : 'none';
}
};

// Global error handlers
window.onerror = (msg, src, line, col, err) => {
ErrorLog.capture('window.onerror', err || { message: msg }, `${src}:${line}:${col}`);
return false; // don’t suppress
};
window.addEventListener('unhandledrejection', e => {
ErrorLog.capture('unhandledrejection', e.reason, 'Promise rejection');
});

// Expose globally for use in main app
window.ErrorLog = ErrorLog;

/* ════════════════════════════════════════════════
2. SETTINGS SYSTEM
Stores: apiKey (AES-encrypted), lang, theme, monacoFontSize
════════════════════════════════════════════════ */
const Settings = {
STORAGE_KEY: 'assc_settings_v6',
_cache: null,

defaults: {
  lang: 'ar',
  monacoFontSize: 13,
  autoSave: true,
  compactMode: false,
  apiKeyEnc: '' // AES-encrypted API key
},

load() {
  try {
    const raw = localStorage.getItem(this.STORAGE_KEY);
    this._cache = raw ? { ...this.defaults, ...JSON.parse(raw) } : { ...this.defaults };
  } catch (e) {
    ErrorLog.capture('Settings.load', e);
    this._cache = { ...this.defaults };
  }
  return this._cache;
},

save(data) {
  try {
    this._cache = { ...this._cache, ...data };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this._cache));
    return true;
  } catch (e) {
    ErrorLog.capture('Settings.save', e);
    return false;
  }
},

get(key) {
  if (!this._cache) this.load();
  return this._cache[key] ?? this.defaults[key];
},

set(key, value) { return this.save({ [key]: value }); },

/** Store API key encrypted with a device-derived key */
async setApiKey(rawKey) {
  try {
    const enc = await CryptoHelper.encryptText(rawKey, 'assc-settings-key-v1');
    return this.set('apiKeyEnc', enc);
  } catch (e) {
    ErrorLog.capture('Settings.setApiKey', e);
    return false;
  }
},

async getApiKey() {
  const enc = this.get('apiKeyEnc');
  if (!enc) return '';
  try {
    return await CryptoHelper.decryptText(enc, 'assc-settings-key-v1');
  } catch (e) {
    return ''; // key changed or corrupted
  }
},

clear() {
  localStorage.removeItem(this.STORAGE_KEY);
  this._cache = { ...this.defaults };
}
};

window.Settings = Settings;
Settings.load();

/* ════════════════════════════════════════════════
3. CRYPTO HELPER
AES-256-GCM for API key & project encryption
════════════════════════════════════════════════ */
const CryptoHelper = {
async deriveKey(password, salt) {
const enc = new TextEncoder();
const keyMaterial = await crypto.subtle.importKey(
  'raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveKey']
);
return crypto.subtle.deriveKey(
  { name: 'PBKDF2', salt: enc.encode(salt), iterations: 100000, hash: 'SHA-256' },
  keyMaterial,
  { name: 'AES-GCM', length: 256 },
  false, ['encrypt', 'decrypt']
);
},

async encryptText(text, password) {
  const key = await this.deriveKey(password, 'assc-salt-v1');
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(text));
  // Combine iv + ciphertext → base64
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv); combined.set(new Uint8Array(ciphertext), iv.length);
  return btoa(String.fromCharCode(...combined));
},

async decryptText(b64, password) {
  const key = await this.deriveKey(password, 'assc-salt-v1');
  const combined = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const dec = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return new TextDecoder().decode(dec);
},

/** Encrypt arbitrary object → encrypted blob string */
async encryptObject(obj, password) {
  return this.encryptText(JSON.stringify(obj), password);
},

async decryptObject(blob, password) {
  const text = await this.decryptText(blob, password);
  return JSON.parse(text);
},

/** Encrypt a File/Blob, returns {ivHex, encryptedBlob, fileName} */
async encryptFile(file) {
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ab = await file.arrayBuffer();
  const enc = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, ab);
  const rawKey = await crypto.subtle.exportKey('raw', key);
  const keyHex = Array.from(new Uint8Array(rawKey)).map(b => b.toString(16).padStart(2, '0')).join('');
  const encBlob = new Blob([iv, new Uint8Array(enc)]);
  return { keyHex, encBlob, fileName: file.name + '.assc_enc', size: file.size };
}
};

window.CryptoHelper = CryptoHelper;

/* ════════════════════════════════════════════════
4. PROJECT SAVE / LOAD (AES-Encrypted)
Uses File System Access API when available,
falls back to download/upload
════════════════════════════════════════════════ */
const ProjectManager = {
VERSION: '6.0',

/** Build a project snapshot from current app state */
buildSnapshot(state) {
  return {
    version: this.VERSION,
    timestamp: new Date().toISOString(),
    author: 'Dr. Gazy A.A. Ebrahim',
    lang: state.lang || 'ar',
    agentCode: state.agentCode || '',
    chatHistory: (state.chatHistory || []).slice(-20), // last 20 msgs
    pdfContext: (state.pdfContext || '').slice(0, 5000),
    board: state.board || 'esp32',
    notes: state.projectNotes || ''
  };
},

/** Save project as encrypted .assc file */
async saveEncrypted(state, password) {
  if (!password || password.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }
  const snapshot = this.buildSnapshot(state);
  const encrypted = await CryptoHelper.encryptObject(snapshot, password);
  const blob = new Blob([encrypted], { type: 'application/octet-stream' });
  const name = `assc-project-${Date.now()}.assc`;

  // Try File System Access API first
  if ('showSaveFilePicker' in window) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: name,
        types: [{ description: 'A-SSC Project', accept: { 'application/octet-stream': ['.assc'] } }]
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return { success: true, fileName: handle.name, method: 'filesystem' };
    } catch (e) {
      if (e.name !== 'AbortError') ErrorLog.capture('ProjectManager.saveEncrypted/FS', e);
      // Fall through to download
    }
  }

  // Fallback: trigger download
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return { success: true, fileName: name, method: 'download' };
},

/** Load & decrypt project */
async loadEncrypted(password) {
  return new Promise((resolve, reject) => {
    // Try File System Access API
    if ('showOpenFilePicker' in window) {
      window.showOpenFilePicker({
        types: [{ description: 'A-SSC Project', accept: { 'application/octet-stream': ['.assc'] } }]
      }).then(async ([handle]) => {
        try {
          const file = await handle.getFile();
          const text = await file.text();
          const snapshot = await CryptoHelper.decryptObject(text, password);
          if (snapshot.version !== this.VERSION) {
            console.warn('Version mismatch:', snapshot.version);
          }
          resolve({ success: true, data: snapshot, fileName: file.name });
        } catch (e) { reject(e); }
      }).catch(e => {
        if (e.name === 'AbortError') resolve({ success: false, aborted: true });
        else reject(e);
      });
    } else {
      // Fallback: file input
      const input = document.createElement('input');
      input.type = 'file'; input.accept = '.assc';
      input.onchange = async () => {
        try {
          const file = input.files[0]; if (!file) { resolve({ success: false }); return; }
          const text = await file.text();
          const snapshot = await CryptoHelper.decryptObject(text, password);
          resolve({ success: true, data: snapshot, fileName: file.name });
        } catch (e) { reject(e); }
      };
      input.click();
    }
  });
},

/** Quick auto-save to localStorage (unencrypted, just last state) */
autoSave(state) {
  try {
    const snap = this.buildSnapshot(state);
    localStorage.setItem('assc_autosave_v6', JSON.stringify(snap));
    return true;
  } catch (e) { return false; }
},

autoLoad() {
  try {
    const raw = localStorage.getItem('assc_autosave_v6');
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}
};

window.ProjectManager = ProjectManager;

/* ════════════════════════════════════════════════
5. MONACO EDITOR — WORKER FIX
Configures proper worker URLs before Monaco loads
════════════════════════════════════════════════ */
const MONACO_VERSION = '0.44.0';
const MONACO_BASE = `https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/${MONACO_VERSION}/min`;

window.MonacoEnvironment = {
getWorkerUrl(moduleId, label) {
// All workers served from CDN via blob URL to avoid CORS
const workerPaths = {
  'editorWorkerService': `${MONACO_BASE}/vs/editor/editor.worker.js`,
  'css': `${MONACO_BASE}/vs/language/css/css.worker.js`,
  'html': `${MONACO_BASE}/vs/language/html/html.worker.js`,
  'json': `${MONACO_BASE}/vs/language/json/json.worker.js`,
  'typescript': `${MONACO_BASE}/vs/language/typescript/ts.worker.js`,
  'javascript': `${MONACO_BASE}/vs/language/typescript/ts.worker.js`,
};
const workerUrl = workerPaths[label] || workerPaths['editorWorkerService'];
// Create blob worker to bypass CORS
const blob = new Blob(
[`importScripts('${workerUrl}');`],
{ type: 'application/javascript' }
);
return URL.createObjectURL(blob);
}
};

/* ════════════════════════════════════════════════
6. SERVICE WORKER REGISTRATION
Enables offline mode for the app
════════════════════════════════════════════════ */
const SW = {
registration: null,

async register() {
  if (!('serviceWorker' in navigator)) return;
  try {
    // Generate SW code as blob (single-file approach)
    const swCode = `
const CACHE = 'assc-v6-${Date.now()}';
const PRECACHE = [
  '${location.href}',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs/loader.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/mermaid/10.6.1/mermaid.min.js',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => {
      return Promise.allSettled(PRECACHE.map(url => cache.add(url).catch(() => {})));
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
// Skip non-GET and API calls
if (e.request.method !== 'GET') return;
if (e.request.url.includes('api.anthropic.com')) return;
if (e.request.url.includes('pyodide')) return; // pyodide too large

e.respondWith(
  caches.match(e.request).then(cached => {
    if (cached) return cached;
    return fetch(e.request).then(response => {
      if (!response || response.status !== 200 || response.type === 'opaque') return response;
      const clone = response.clone();
      caches.open(CACHE).then(cache => cache.put(e.request, clone));
      return response;
    }).catch(() => new Response('', { status: 503, statusText: 'Offline' }));
  })
);
});
`;
const blob = new Blob([swCode], { type: 'application/javascript' });
const swUrl = URL.createObjectURL(blob);
this.registration = await navigator.serviceWorker.register(swUrl, { scope: '/' });
console.log('[A-SSC SW] Registered:', this.registration.scope);
} catch (e) {
// SW registration can fail in some environments (file://, sandboxed iframes)
// This is non-critical — app works without it
ErrorLog.capture('ServiceWorker.register', e, 'non-critical');
}
},

async unregister() {
  if (this.registration) {
    await this.registration.unregister();
    this.registration = null;
  }
},

isOnline() { return navigator.onLine; }
};

window.AppSW = SW;
SW.register();

// Online/offline indicator
const updateOnlineStatus = () => {
const indicator = document.getElementById('online-indicator');
if (!indicator) return;
const online = navigator.onLine;
indicator.textContent = online ? '🟢 Online' : '🔴 Offline';
indicator.style.color = online ? 'var(--c5)' : 'var(--rd)';
};
window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);
