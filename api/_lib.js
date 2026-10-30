// Shared helpers for win98-run billing functions (Phase C).
// Dependency-free: Stripe and Supabase are called over HTTPS so the
// static Vercel deployment needs no install step.
export const SITE_URL = (process.env.SITE_URL || 'https://win98run.app').replace(/\/$/, '');
export const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
export const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
export const ANON_KEY = process.env.SUPABASE_ANON_KEY || SERVICE_KEY;
export const STRIPE_KEY = process.env.STRIPE_SECRET_KEY || '';

export function missingBillingVars() {
  const missing = [];
  if (!STRIPE_KEY) missing.push('STRIPE_SECRET_KEY');
  if (!process.env.STRIPE_PRICE_MONTHLY) missing.push('STRIPE_PRICE_MONTHLY');
  if (!process.env.STRIPE_PRICE_YEARLY) missing.push('STRIPE_PRICE_YEARLY');
  if (!SUPABASE_URL) missing.push('SUPABASE_URL');
  if (!SERVICE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  return missing;
}

export function billingConfigured() {
  return missingBillingVars().length === 0;
}

export function json(res, status, obj) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(obj));
}

export async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}

export async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const raw = await readRawBody(req);
  if (!raw.length) return {};
  try { return JSON.parse(raw.toString('utf8')); } catch { return {}; }
}

// Verify the caller's Supabase access token; returns the user or null.
export async function supabaseUser(req) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token || !SUPABASE_URL) return null;
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` }
  });
  if (!r.ok) return null;
  return r.json();
}

// PostgREST call with the service_role key (server-only, bypasses RLS).
export async function supabaseAdmin(path, { method = 'GET', body, prefer } = {}) {
  const headers = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' };
  if (prefer) headers.Prefer = prefer;
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await r.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* keep null */ }
  if (!r.ok) throw new Error(`Supabase ${method} ${path} failed (${r.status}): ${text.slice(0, 200)}`);
  return data;
}

function formEncode(obj, prefix, out) {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) v.forEach((item, i) => {
      if (item && typeof item === 'object') formEncode(item, `${key}[${i}]`, out);
      else out.push(`${encodeURIComponent(`${key}[${i}]`)}=${encodeURIComponent(item)}`);
    });
    else if (typeof v === 'object') formEncode(v, key, out);
    else out.push(`${encodeURIComponent(key)}=${encodeURIComponent(v)}`);
  }
  return out;
}

export async function stripe(path, params, method = 'POST') {
  const isGet = method === 'GET';
  const url = `https://api.stripe.com/v1/${path}${isGet && params ? '?' + formEncode(params, '', []).join('&') : ''}`;
  const r = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${STRIPE_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: isGet ? undefined : formEncode(params || {}, '', []).join('&')
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data?.error?.message || `Stripe ${path} failed (${r.status})`);
  return data;
}

export async function subscriptionRowForUser(userId) {
  const rows = await supabaseAdmin(`subscriptions?user_id=eq.${userId}&select=*`);
  return rows?.[0] || null;
}

export async function upsertSubscription(row) {
  return supabaseAdmin('subscriptions', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates,return=representation',
    body: { ...row, updated_at: new Date().toISOString() }
  });
}
