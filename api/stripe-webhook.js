import crypto from 'node:crypto';
import { json, readRawBody, stripe, supabaseAdmin, upsertSubscription } from './_lib.js';

export const config = { api: { bodyParser: false } };

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

export function verifySignature(rawBody, header, secret, toleranceSec = 300) {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(header.split(',').map(p => {
    const i = p.indexOf('=');
    return [p.slice(0, i).trim(), p.slice(i + 1).trim()];
  }));
  const t = parts.t;
  const v1s = header.split(',').filter(p => p.trim().startsWith('v1=')).map(p => p.trim().slice(3));
  if (!t || !v1s.length) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > toleranceSec) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${t}.`).update(rawBody).digest('hex');
  return v1s.some(v1 => {
    const a = Buffer.from(v1, 'utf8');
    const b = Buffer.from(expected, 'utf8');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  });
}

function subscriptionFields(sub) {
  const item = sub.items?.data?.[0] || {};
  const endSec = sub.current_period_end || item.current_period_end || null;
  return {
    stripe_subscription_id: sub.id,
    stripe_customer_id: typeof sub.customer === 'string' ? sub.customer : sub.customer?.id,
    status: sub.status === 'canceled' ? 'canceled' : sub.status,
    interval: item.price?.recurring?.interval || null,
    current_period_end: endSec ? new Date(endSec * 1000).toISOString() : null
  };
}

async function userIdFor(subFields, fallbackUserId) {
  if (fallbackUserId) return fallbackUserId;
  if (!subFields.stripe_customer_id) return null;
  const rows = await supabaseAdmin(`subscriptions?stripe_customer_id=eq.${subFields.stripe_customer_id}&select=user_id`);
  return rows?.[0]?.user_id || null;
}

async function syncSubscription(sub, fallbackUserId) {
  const fields = subscriptionFields(sub);
  const userId = await userIdFor(fields, fallbackUserId || sub.metadata?.supabase_user_id || null);
  if (!userId) return false;
  await upsertSubscription({ user_id: userId, ...fields });
  return true;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed.' });
  if (!WEBHOOK_SECRET || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const missing = [];
    if (!WEBHOOK_SECRET) missing.push('STRIPE_WEBHOOK_SECRET');
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');
    return json(res, 503, { error: 'Webhook is not configured yet.', missing });
  }
  const raw = await readRawBody(req);
  if (!verifySignature(raw, req.headers['stripe-signature'], WEBHOOK_SECRET)) {
    return json(res, 400, { error: 'Invalid signature.' });
  }
  let event;
  try { event = JSON.parse(raw.toString('utf8')); } catch { return json(res, 400, { error: 'Invalid JSON.' }); }
  try {
    const obj = event.data?.object || {};
    if (event.type === 'checkout.session.completed') {
      const userId = obj.client_reference_id || obj.metadata?.supabase_user_id || null;
      if (obj.subscription) {
        const sub = await stripe(`subscriptions/${obj.subscription}`, null, 'GET');
        await syncSubscription(sub, userId);
      } else if (userId) {
        await upsertSubscription({ user_id: userId, stripe_customer_id: typeof obj.customer === 'string' ? obj.customer : obj.customer?.id || null });
      }
    } else if (event.type.startsWith('customer.subscription.')) {
      if (event.type === 'customer.subscription.deleted') obj.status = 'canceled';
      await syncSubscription(obj, null);
    }
    // invoice.payment_failed etc. surface through subscription.updated status.
  } catch (e) {
    return json(res, 500, { error: e.message || 'Webhook handling failed.' });
  }
  return json(res, 200, { received: true });
}
