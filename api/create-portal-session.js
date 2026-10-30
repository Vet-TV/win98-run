import { SITE_URL, billingConfigured, json, supabaseUser, stripe, subscriptionRowForUser } from './_lib.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed.' });
  if (!billingConfigured()) return json(res, 503, { error: 'Billing is not configured yet.' });
  const user = await supabaseUser(req).catch(() => null);
  if (!user) return json(res, 401, { error: 'Sign in first.' });
  try {
    const row = await subscriptionRowForUser(user.id);
    if (!row?.stripe_customer_id) return json(res, 400, { error: 'No billing account yet. Subscribe to Plus first.' });
    const session = await stripe('billing_portal/sessions', {
      customer: row.stripe_customer_id,
      return_url: `${SITE_URL}/?billing=manage`
    });
    return json(res, 200, { url: session.url });
  } catch (e) {
    return json(res, 500, { error: e.message || 'Could not open billing portal.' });
  }
}
