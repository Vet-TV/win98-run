'use strict';
/* Phase B: optional Supabase account + cloud state sync.
   Disabled (local-only) until cloud-config.js has a URL + anon key. */
(function () {
  const cfg = window.WIN98_CLOUD || {};
  const BUCKET = 'vm-states';
  const QUOTA_BYTES = 25 * 1024 * 1024 * 1024;
  let client = null;
  let loadPromise = null;

  function loadClient() {
    if (!cfg.url || !cfg.anonKey) return Promise.resolve(null);
    if (client) return Promise.resolve(client);
    if (loadPromise) return loadPromise;
    loadPromise = new Promise((resolve) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
      s.onload = () => { try { client = window.supabase.createClient(cfg.url, cfg.anonKey); resolve(client); } catch { resolve(null); } };
      s.onerror = () => resolve(null);
      document.head.append(s);
    });
    return loadPromise;
  }

  function idb() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('win98-run-db-v1', 3);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('programs')) db.createObjectStore('programs', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('diskimages')) db.createObjectStore('diskimages', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('states')) db.createObjectStore('states', { keyPath: 'id' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  async function storeGet(store, key) {
    const db = await idb();
    return new Promise((resolve) => {
      const get = db.transaction(store, 'readonly').objectStore(store).get(key);
      get.onsuccess = () => resolve(get.result || null);
      get.onerror = () => resolve(null);
    });
  }
  async function storePut(store, rec) {
    const db = await idb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).put(rec);
      tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
    });
  }

  const api = {
    enabled: !!(cfg.url && cfg.anonKey),
    quotaBytes: QUOTA_BYTES,
    async session() { const c = await loadClient(); if (!c) return null; const { data } = await c.auth.getSession(); return data.session; },
    async signUp(email, password) { const c = await loadClient(); if (!c) throw new Error('Cloud is not configured yet.'); const { data, error } = await c.auth.signUp({ email, password }); if (error) throw error; return data; },
    async signIn(email, password) { const c = await loadClient(); if (!c) throw new Error('Cloud is not configured yet.'); const { data, error } = await c.auth.signInWithPassword({ email, password }); if (error) throw error; return data; },
    async signOut() { const c = await loadClient(); if (c) await c.auth.signOut(); },
    async listStates() {
      const c = await loadClient(); if (!c) return [];
      const { data, error } = await c.from('cloud_states').select('*').order('updated_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    async uploadState(diskKey) {
      const c = await loadClient(); if (!c) throw new Error('Cloud is not configured yet.');
      const sess = await api.session(); if (!sess) throw new Error('Sign in first.');
      const local = await storeGet('states', diskKey);
      if (!local || !local.blob) throw new Error('No local saved state for this disk yet. Boot the VM and press Save State first.');
      const rows = await api.listStates();
      const used = rows.filter(r => r.disk_key !== diskKey).reduce((a, r) => a + (r.size || 0), 0);
      if (used + local.blob.size > QUOTA_BYTES) throw new Error('Cloud quota (25 GB) would be exceeded. Delete a cloud state first.');
      const path = `${sess.user.id}/${diskKey}.bin`;
      const up = await c.storage.from(BUCKET).upload(path, local.blob, { upsert: true, contentType: 'application/octet-stream' });
      if (up.error) throw up.error;
      const disk = await storeGet('diskimages', diskKey.replace(/:state$/, ''));
      const meta = { user_id: sess.user.id, disk_key: diskKey, name: disk?.name || diskKey, size: local.blob.size, storage_path: path, updated_at: new Date().toISOString() };
      const { error } = await c.from('cloud_states').upsert(meta, { onConflict: 'user_id,disk_key' });
      if (error) throw error;
      return meta;
    },
    async downloadState(row) {
      const c = await loadClient(); if (!c) throw new Error('Cloud is not configured yet.');
      const { data, error } = await c.storage.from(BUCKET).download(row.storage_path);
      if (error) throw error;
      await storePut('states', { id: row.disk_key, blob: data, size: data.size, createdAt: Date.now(), ramMB: 512 });
      return row.disk_key;
    },
    async deleteState(row) {
      const c = await loadClient(); if (!c) throw new Error('Cloud is not configured yet.');
      await c.storage.from(BUCKET).remove([row.storage_path]);
      const { error } = await c.from('cloud_states').delete().eq('id', row.id);
      if (error) throw error;
    },
    async localState(diskKey) { return storeGet('states', diskKey); }
  };
  window.Win98Cloud = api;
})();
