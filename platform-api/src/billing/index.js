const registry = require('../db/registry');
const { getPlan } = require('./plans');

function currentPeriod() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

// ─── Entitlements ───

async function checkAppQuota(tenant) {
  const plan = getPlan(tenant.plan);
  const current = await registry.countApps(tenant.id);
  const limit = plan.limits.apps;
  return { allowed: current < limit, current, limit, plan: plan.id };
}

async function checkResourceQuota(tenant, addCount = 1) {
  const plan = getPlan(tenant.plan);
  const current = await registry.countDataResources(tenant.id);
  const limit = plan.limits.dataResources;
  return { allowed: current + addCount <= limit, current, addCount, limit, plan: plan.id };
}

// ─── Usage + rating ───

async function usageSummary(tenant) {
  const plan = getPlan(tenant.plan);
  const [apps, dataResources, byType, recentEvents] = await Promise.all([
    registry.countApps(tenant.id),
    registry.countDataResources(tenant.id),
    registry.usageByType(tenant.id),
    registry.listUsageEvents(tenant.id, 25),
  ]);
  return {
    plan: { id: plan.id, name: plan.name, limits: jsonLimits(plan.limits) },
    usage: { apps, dataResources, byType },
    headroom: {
      apps: headroom(apps, plan.limits.apps),
      dataResources: headroom(dataResources, plan.limits.dataResources),
    },
    recentEvents,
  };
}

async function computeInvoice(tenant) {
  const plan = getPlan(tenant.plan);
  const [apps, dataResources, byType] = await Promise.all([
    registry.countApps(tenant.id),
    registry.countDataResources(tenant.id),
    registry.usageByType(tenant.id),
  ]);

  const meteredCost = dataResources * plan.resourcePrice;
  const lineItems = [
    { description: `${plan.name} plan — base fee`, quantity: 1, unitPrice: plan.baseMonthly, amount: plan.baseMonthly },
    { description: `Data resources (metered)`, quantity: dataResources, unitPrice: plan.resourcePrice, amount: meteredCost },
  ];
  const total = plan.baseMonthly + meteredCost;

  return {
    tenant: tenant.slug,
    plan: plan.id,
    period: currentPeriod(),
    currency: plan.currency,
    usage: { apps, dataResources, byType },
    lineItems,
    subtotal: total,
    total,
  };
}

// ─── Stripe (key-gated) ───

// Pushes the computed invoice to Stripe when STRIPE_SECRET_KEY is configured;
// otherwise returns the locally-computed invoice without charging.
async function syncToStripe(tenant, invoice) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return { mode: 'local', charged: false, note: 'STRIPE_SECRET_KEY not set — invoice computed locally, not charged', invoice };
  }
  const Stripe = require('stripe');
  const stripe = new Stripe(key);
  const customer = await stripe.customers.create({ name: tenant.name, metadata: { tenant: tenant.slug } });
  for (const li of invoice.lineItems) {
    if (li.amount > 0) {
      await stripe.invoiceItems.create({
        customer: customer.id,
        amount: Math.round(li.amount * 100),
        currency: invoice.currency,
        description: li.description,
      });
    }
  }
  const stripeInvoice = await stripe.invoices.create({ customer: customer.id, auto_advance: true });
  return { mode: 'stripe', charged: true, stripeInvoiceId: stripeInvoice.id, invoice };
}

function headroom(used, limit) {
  return limit === Infinity ? 'unlimited' : Math.max(0, limit - used);
}
function jsonLimits(limits) {
  return { apps: limits.apps === Infinity ? 'unlimited' : limits.apps, dataResources: limits.dataResources === Infinity ? 'unlimited' : limits.dataResources };
}

module.exports = { checkAppQuota, checkResourceQuota, usageSummary, computeInvoice, syncToStripe };
