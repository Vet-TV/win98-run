import { SITE_URL, billingConfigured, json, readJsonBody, supabaseUser, stripe, subscriptionRowForUser, upsertSubscription } from './_lib.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed.' });
  if (!billingConfigured()) return json(res, 503, { error: 'Billing is not configured yet.' });
  const user = await supabaseUser(req).catch(() => null);
  if (!user) return json(res, 401, { error: 'Sign in first.' });
  try {
    const { interval } = await readJsonBody(req);
    const price = interval === 'year' ? process.env.STRIPE_PRICE_YEARLY : process.env.STRIPE_PRICE_MONTHLY;
    let row = await subscriptionRowForUser(user.id);
    let customerId = row?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe('customers', { email: user.email, metadata: { supabase_user_id: user.id } });
      customerId = customer.id;
      await upsertSubscription({ user_id: user.id, email: user.email || '', stripe_customer_id: customerId, status: row?.status || 'none' });
      row = { ...row, stripe_customer_id: customerId };
    }
    if (row?.status === 'active' || row?.status === 'trialing') {
      return json(res, 409, { error: 'You already have Plus. Use Manage Billing to change plans.' });
    }
    const session = await stripe('checkout/sessions', {
      mode: 'subscription',
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price, quantity: 1 }],
      allow_promotion_codes: true,
      metadata: { supabase_user_id: user.id },
      subscription_data: { metadata: { supabase_user_id: user.id } },
      success_url: `${SITE_URL}/?billing=success`,
      cancel_url: `${SITE_URL}/?billing=cancelled`
    });
    return json(res, 200, { url: session.url });
  } catch (e) {
    return json(res, 500, { error: e.message || 'Could not start checkout.' });
  }
}
