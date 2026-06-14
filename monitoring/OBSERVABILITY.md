# Per-tenant observability & SLOs

Completes Phase 3 of [PRODUCT-ROADMAP.md](../PRODUCT-ROADMAP.md): golden signals,
per-tenant isolation, SLOs, and error-budget alerting.

## Golden signals (per tenant)
`platform-api` exposes Prometheus metrics at **`GET /metrics`**, every HTTP response
labeled with `method`, `route` (the *pattern*, e.g. `/api/v1/apps/:slug`), `status`,
and **`tenant`** (from the resolved identity):

| Signal | Metric |
|--------|--------|
| Traffic | `platform_http_requests_total` |
| Errors | `platform_http_errors_total` (status ≥ 500) |
| Latency | `platform_http_request_duration_seconds_bucket` (histogram) |
| Saturation | default process / event-loop metrics |

Validated live: 12 acme-corp + 5 globex-inc requests + 3 acme 404s appear as distinct
per-tenant series with bounded route cardinality.

## SLOs ([slo-rules.yml](config/prometheus/slo-rules.yml))
- **Availability 99.9%** (error budget 0.1%) — multi-window burn alerts:
  `PlatformAvailabilityFastBurn` (14.4× over 5m+1h → page),
  `PlatformAvailabilitySlowBurn` (3× over 6h → ticket).
- **Latency p99 < 500ms** — `PlatformLatencySLOBreach`.
- Recording rules expose per-tenant SLIs (`platform:http_requests:rate5m`,
  `platform:http_error_ratio:rate5m`, `platform:http_latency:p99_5m`).

## Dashboard
[platform-api-slo.json](config/grafana/dashboards/platform-api-slo.json) — availability
stat + per-tenant request rate / error ratio / p99 latency, with a `$tenant` filter.
Auto-provisioned into the **Platform** folder.

## Scale path (multi-tenant isolation at the backend)
This labels metrics by tenant (filterable, single Prometheus). For hard isolation
across many tenants, front Prometheus with **Grafana Mimir** (per-tenant `X-Scope-OrgID`)
and **Loki** tenants for logs; add **OpenTelemetry traces** (OTLP → Tempo) as the
third pillar. The `tenant` label here maps directly onto those org IDs.
