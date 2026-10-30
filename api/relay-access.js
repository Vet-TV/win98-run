import crypto from 'node:crypto';
import { json, supabaseUser, subscriptionRowForUser } from './_lib.js';

// Phase D: private relay access for Plus subscribers.
// Returns the hosted relay URL plus a short-lived signed token. The relay
// verifies the token itself, so the address alone is useless if shared.
const RELAY_URL = (process.env.RELAY_URL || '').replace(/\/$/, '');
const RELAY_SECRET = process.env.RELAY_SECRET || '';
const TOKEN_TTL_SEC = 6 * 60 * 60; // one VM session; re-opening the VM mints a fresh token

export function mintRelayToken(userId, secret, ttlSec = TOKEN_TTL_SEC) {
  const payload = Buffer.from(JSON.stringify({ uid: userId, exp: Math.floor(Date.now() / 1000) + ttlSec })).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed.' });
  if (!RELAY_URL || !RELAY_SECRET || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return json(res, 503, { error: 'Private relay is not configured yet.' });
  }
  const user = await supabaseUser(req).catch(() => null);
  if (!user) return json(res, 401, { error: 'Sign in first.' });
  try {
    const row = await subscriptionRowForUser(user.id);
    const plus = !!row && (row.status === 'active' || row.status === 'trialing') &&
      (!row.current_period_end || new Date(row.current_period_end).getTime() > Date.now());
    if (!plus) return json(res, 403, { error: 'Private relay is a Plus feature. Upgrade in Account & Cloud.' });
    const token = mintRelayToken(user.id, RELAY_SECRET);
    // Token goes in the path (/<token>/): wisp-js treats any WebSocket path
    // not ending in "/" as a proxy target, and a ?token= query breaks that.
    const base = RELAY_URL.replace(/\/$/, '');
    return json(res, 200, { url: `${base}/${token}/`, expiresInSec: TOKEN_TTL_SEC });
  } catch (e) {
    return json(res, 500, { error: e.message || 'Could not authorize relay access.' });
  }
}
