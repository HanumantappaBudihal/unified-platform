const client = require('prom-client');

// Prometheus registry for the control plane. Default process/event-loop metrics
// give the "saturation" golden signal; the HTTP series below give rate / errors /
// latency — all labeled by tenant for per-tenant observability.
const register = new client.Registry();
register.setDefaultLabels({ service: 'platform-api' });
client.collectDefaultMetrics({ register });

const httpRequests = new client.Counter({
  name: 'platform_http_requests_total',
  help: 'Total HTTP requests by method, route, status, and tenant',
  labelNames: ['method', 'route', 'status', 'tenant'],
  registers: [register],
});

const httpErrors = new client.Counter({
  name: 'platform_http_errors_total',
  help: 'HTTP responses with status >= 500, by route and tenant',
  labelNames: ['method', 'route', 'status', 'tenant'],
  registers: [register],
});

const httpDuration = new client.Histogram({
  name: 'platform_http_request_duration_seconds',
  help: 'HTTP request latency in seconds',
  labelNames: ['method', 'route', 'status', 'tenant'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [register],
});

// Tenant label derived from the resolved identity (set by the auth hook).
function tenantLabel(req) {
  const id = req.identity;
  if (!id) return 'anonymous';
  if (id.superadmin) return 'superadmin';
  return id.tenantSlug || 'unknown';
}

function recordResponse(req, reply) {
  // Use the route *pattern* (e.g. /api/v1/apps/:slug), not the raw URL, to keep
  // label cardinality bounded.
  const route = req.routeOptions?.url || '__unmatched__';
  const labels = { method: req.method, route, status: String(reply.statusCode), tenant: tenantLabel(req) };
  httpRequests.inc(labels);
  if (reply.statusCode >= 500) httpErrors.inc(labels);
  httpDuration.observe(labels, (reply.elapsedTime || 0) / 1000);
}

module.exports = { register, recordResponse };
