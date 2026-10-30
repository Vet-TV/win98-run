'use strict';
/* Phase B: optional Supabase account + cloud state sync.
   Disabled (local-only) until cloud-config.js has a URL + anon key. */
(function () {
  const cfg = window.WIN98_CLOUD || {};
  const BUCKET = 'vm-states';
  const QUOTA_BYTES = 25 * 1024 * 1024 * 1024;        // Plus
  const FREE_QUOTA_BYTES = 5 * 1024 * 1024 * 1024;    // Free: 1 state, up to 5 GB
  const FREE_MAX_STATES = 1;
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
    freeQuotaBytes: FREE_QUOTA_BYTES,
    freeMaxStates: FREE_MAX_STATES,
    async session() { const c = await loadClient(); if (!c) return null; const { data } = await c.auth.getSession(); return data.session; },
    async signUp(email, password) { const c = await loadClient(); if (!c) throw new Error('Cloud is not configured yet.'); const { data, error } = await c.auth.signUp({ email, password }); if (error) throw error; return data; },
    async signIn(email, password) { const c = await loadClient(); if (!c) throw new Error('Cloud is not configured yet.'); const { data, error } = await c.auth.signInWithPassword({ email, password }); if (error) throw error; return data; },
    async signOut() { const c = await loadClient(); if (c) await c.auth.signOut(); },
    async mySubscription() {
      const c = await loadClient(); if (!c) return null;
      try {
        const { data, error } = await c.from('subscriptions').select('*').maybeSingle();
        if (error) return null; // table not created yet -> Free
        return data || null;
      } catch { return null; }
    },
    async plan() {
      const sub = await api.mySubscription();
      const live = !!sub && (sub.status === 'active' || sub.status === 'trialing') &&
        (!sub.current_period_end || new Date(sub.current_period_end).getTime() > Date.now());
      return { plus: live, sub };
    },
    async checkout(interval) {
      const sess = await api.session(); if (!sess) throw new Error('Sign in first.');
      const r = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sess.access_token}` },
        body: JSON.stringify({ interval: interval === 'year' ? 'year' : 'month' })
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || !data.url) throw new Error(data.error || 'Could not start checkout.');
      return data.url;
    },
    async relayAccess() {
      const sess = await api.session(); if (!sess) throw new Error('Sign in first (Start → Account & Cloud).');
      const r = await fetch('/api/relay-access', {
        method: 'POST',
        headers: { Authorization: `Bearer ${sess.access_token}` }
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || !data.url) throw new Error(data.error || 'Could not authorize relay access.');
      return data;
    },
    async portal() {
      const sess = await api.session(); if (!sess) throw new Error('Sign in first.');
      const r = await fetch('/api/create-portal-session', {
        method: 'POST',
        headers: { Authorization: `Bearer ${sess.access_token}` }
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || !data.url) throw new Error(data.error || 'Could not open billing portal.');
      return data.url;
    },
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
      const { plus } = await api.plan();
      const replacing = rows.some(r => r.disk_key === diskKey);
      if (!plus && !replacing && rows.length >= FREE_MAX_STATES) {
        throw new Error('Free plan includes 1 cloud state. Delete it or upgrade to Plus for multiple states and 25 GB.');
      }
      const limit = plus ? QUOTA_BYTES : FREE_QUOTA_BYTES;
      const used = rows.filter(r => r.disk_key !== diskKey).reduce((a, r) => a + (r.size || 0), 0);
      if (used + local.blob.size > limit) {
        throw new Error(plus
          ? 'Cloud quota (25 GB) would be exceeded. Delete a cloud state first.'
          : `Free plan includes up to 5 GB of cloud storage. This state is ${(local.blob.size / 1073741824).toFixed(2)} GB — upgrade to Plus for 25 GB.`);
      }
      const path = `${sess.user.id}/${diskKey}.bin`;
      const up = await c.storage.from(BUCKET).upload(path, local.blob, { upsert: true, contentType: 'application/octet-stream', cacheControl: '0' });
      if (up.error) throw up.error;
      const disk = await storeGet('diskimages', diskKey.replace(/:state$/, ''));
      const meta = { user_id: sess.user.id, disk_key: diskKey, name: disk?.name || diskKey, size: local.blob.size, storage_path: path, updated_at: new Date().toISOString() };
      const { error } = await c.from('cloud_states').upsert(meta, { onConflict: 'user_id,disk_key' });
      if (error) throw error;
      return meta;
    },
    async downloadState(row) {
      const c = await loadClient(); if (!c) throw new Error('Cloud is not configured yet.');
      const sess = await api.session(); if (!sess) throw new Error('Sign in first.');
      // Direct fetch with cache disabled: a re-uploaded state must never be
      // served back as the previous version from the browser HTTP cache.
      const res = await fetch(`${cfg.url}/storage/v1/object/authenticated/${BUCKET}/${row.storage_path}`, {
        headers: { apikey: cfg.anonKey, Authorization: `Bearer ${sess.access_token}` },
        cache: 'no-store'
      });
      if (!res.ok) throw new Error(`Download failed (${res.status}).`);
      const data = await res.blob();
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
