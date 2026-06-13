// Plan catalog. `limits` gate self-service (entitlements); `baseMonthly` is the
// flat fee and `resourcePrice` is the metered per-data-resource monthly rate.
// (OpenMeter-style: flat fee + linear metered usage; graduated tiers can be added.)
const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    baseMonthly: 0,
    resourcePrice: 0,
    currency: 'usd',
    limits: { apps: 2, dataResources: 3 },
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    baseMonthly: 49,
    resourcePrice: 5,
    currency: 'usd',
    limits: { apps: 10, dataResources: 25 },
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    baseMonthly: 499,
    resourcePrice: 3,
    currency: 'usd',
    limits: { apps: Infinity, dataResources: Infinity },
  },
};

function getPlan(planId) {
  return PLANS[planId] || PLANS.free;
}

module.exports = { PLANS, getPlan };
