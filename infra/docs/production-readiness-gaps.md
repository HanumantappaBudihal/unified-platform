# Production Readiness — Gap Analysis

> Last updated: 2026-03-19

## Overview

This document captures all identified gaps between the current Docker Compose-based infrastructure and a production-scale deployment. Items are prioritized by severity and grouped by category.

---

## Current Infrastructure

| Server | Services | Status |
|--------|----------|--------|
| event-streaming-server | Kafka (KRaft), Schema Registry, REST Proxy, Kafka UI, Portal | Running |
| cache-server | Redis Cluster (6 nodes), RedisInsight, Portal | Running |
| object-storage-server | MinIO (4 nodes), Nginx LB, Portal | Running |
| auth-server | Keycloak 24.0, PostgreSQL 16 | Running |
| authz-server | OPA, Portal | Running |
| centralized-logging | Loki, Promtail, Grafana, Portal | Running |
| api-gateway | Kong 3.9, Konga UI, PostgreSQL | Running |
| health-aggregation | Uptime Kuma, Portal | Running |
| backup-server | Cron-based backup runner | Running |
| certs/tls-proxy | Nginx TLS reverse proxy | Running |
| unified-gateway-portal | Central gateway (Next.js) | Running |

---

## CRITICAL — Must Fix Before Production

### 1. No Container Resource Limits

**Impact:** Any service can consume unlimited host memory/CPU, causing OOM kills and cascading failures.

**Affected:** All docker-compose services across all servers.

**Fix:** Add `deploy.resources.limits` to every service:
```yaml
deploy:
  resources:
    limits:
      cpus: '2.0'
      memory: 4G
    reservations:
      cpus: '0.5'
      memory: 1G
```

**Recommended limits:**

| Service | CPU Limit | Memory Limit |
|---------|-----------|-------------|
| Kafka broker | 2.0 | 4G |
| Redis node | 0.5 | 512M |
| MinIO node | 1.0 | 2G |
| Keycloak | 1.0 | 1G |
| PostgreSQL | 1.0 | 1G |
| OPA | 0.5 | 512M |
| Loki | 1.0 | 1G |
| Prometheus | 1.0 | 2G |
| Grafana | 0.5 | 512M |
| Nginx | 0.5 | 256M |
| Next.js portals | 0.5 | 512M |

---

### 2. Single Kafka Broker (Replication Factor = 1)

**Impact:** No high availability. Single point of failure. Data loss on broker failure.

**Current:** 1 broker, `KAFKA_DEFAULT_REPLICATION_FACTOR: 1`

**Fix:** Scale to 3+ brokers with RF=3, min.insync.replicas=2.

---

### 3. Keycloak Running in Development Mode

**Impact:** Not optimized for production. HTTP enabled alongside HTTPS. No caching optimizations.

**Current:** `command: start-dev --import-realm`, `KC_HTTP_ENABLED: "true"`

**Fix:**
- Change to `command: start --import-realm`
- Set `KC_HTTP_ENABLED: "false"`
- Set `KC_PROXY: edge` (if behind reverse proxy)
- Set `KC_HOSTNAME` to actual domain

---

### 4. Weak Default Passwords

**Impact:** Easily compromised credentials across all services.

**Current passwords in .env files:**
- `admin123` (Kafka UI, Grafana)
- `admin-secret` (Redis, MinIO)
- `keycloak-db-secret` (PostgreSQL)
- `admin` (Keycloak admin)

**Fix:** Generate strong unique passwords (32+ chars, mixed case, numbers, symbols). Use a password manager or secrets vault.

---

### 5. No Secrets Management

**Impact:** Credentials stored in plaintext .env files on disk. Visible in `docker inspect`.

**Current:** All credentials in `.env` files per server.

**Fix options:**
- **Docker Secrets** (Swarm mode) — `docker secret create`
- **HashiCorp Vault** — centralized secret storage with rotation
- **Kubernetes Secrets** (post-migration) — encrypted at rest with KMS
- **SOPS + age** — encrypted .env files in git

---

### 6. No PostgreSQL Backup

**Impact:** Keycloak auth database not included in backup schedule. Full auth data loss on failure.

**Current:** backup-server backs up Redis, MinIO, Kafka — but not PostgreSQL.

**Fix:** Add `backup-postgres.sh` to backup-runner:
```bash
pg_dump -h auth-postgres -U keycloak keycloak > /backup/data/postgres/auth-$(date +%Y%m%d_%H%M%S).sql
```
Schedule: Daily at 1:00 AM, 30-day retention.

---

## HIGH — Should Fix

### 7. Missing Restart Policies

**Impact:** Services won't auto-recover from crashes.

**Affected:**
- `auth-server/docker-compose.yml` — auth-postgres, auth-keycloak
- `authz-server/docker-compose.yml` — authz-opa, authz-portal

**Fix:** Add `restart: unless-stopped` to all services.

---

### 8. ~~Alertmanager Not Configured~~ ✅ RESOLVED

**Status:** Email notifications are now configured across all Alertmanager instances using the local Email Server (Mailpit).

**What was done:**
- Added `email-server/` with Mailpit (SMTP on `:1025`, Web UI on `:8025`)
- Configured email receivers in Kafka, Cache, and Storage Alertmanager configs
- All alerts are sent to `ops-team@infrastructure.local` and visible at http://localhost:8025

**Remaining for production:** Replace Mailpit with a real SMTP provider (SendGrid, SES, etc.) and configure Slack as an additional channel.

---

### 9. Self-Signed TLS Certificates

**Impact:** Browser warnings. No third-party trust validation. MITM risk in non-isolated networks.

**Current:** Self-signed CA in `certs/` directory.

**Fix options:**
- **Development/staging:** Use `mkcert` for locally-trusted certs
- **Production:** Use Let's Encrypt (cert-manager in K8s) or commercial CA
- **Internal:** Deploy internal PKI with proper CA chain

---

### 10. Anonymous Grafana Access

**Impact:** Anyone with network access can view all metrics dashboards without authentication.

**Current:** All 3 Grafana instances:
```
GF_AUTH_ANONYMOUS_ENABLED=true
GF_AUTH_ANONYMOUS_ORG_ROLE=Viewer
```

**Fix:** Disable anonymous access and integrate with Keycloak OIDC:
```
GF_AUTH_ANONYMOUS_ENABLED=false
GF_AUTH_GENERIC_OAUTH_ENABLED=true
GF_AUTH_GENERIC_OAUTH_CLIENT_ID=grafana
```

---

### 11. Redis allkeys-lru Eviction Policy

**Impact:** When memory is full, Redis evicts ANY key — including non-expired, important data.

**Current:** `maxmemory-policy allkeys-lru` in redis-common.conf

**Fix:** Change to `volatile-lru` (only evict keys with TTL) or `allkeys-lfu` (least frequently used). Ensure critical keys have no expiry or use separate Redis instances for cache vs persistent data.

---

### 12. No Network Policies

**Impact:** All containers on the same Docker network can communicate freely. Lateral movement risk if one service is compromised.

**Current:** Flat bridge networks per server. No inter-service restrictions.

**Fix:**
- **Docker:** Use separate networks per trust zone, limit exposed ports
- **Kubernetes:** Apply NetworkPolicy resources
- **Service mesh:** Istio/Linkerd for mTLS + fine-grained traffic control

---

## MEDIUM — Production Hardening

### 13. Short Prometheus Retention (15 days)

**Impact:** Cannot do capacity planning or long-term trend analysis.

**Fix:** Increase to 30-90 days. Consider Thanos or Cortex for long-term storage.

---

### 14. Short Loki Retention (7 days)

**Impact:** Logs unavailable for incident reviews that happen after a week.

**Fix:** Increase `reject_old_samples_max_age` to 720h (30 days). Configure S3 backend (MinIO) for cost-effective long-term log storage.

---

### 15. MinIO Metrics Publicly Accessible

**Impact:** Infrastructure details exposed without authentication.

**Current:** `MINIO_PROMETHEUS_AUTH_TYPE=public`

**Fix:** Set to `jwt` and configure Prometheus with bearer token authentication.

---

### 16. Uptime Kuma Data Not Backed Up

**Impact:** All monitor configurations, status pages, and history lost on volume failure.

**Fix:** Add uptime-kuma-data volume to backup-runner schedule.

---

### 17. No Container Log Rotation

**Impact:** Container logs can fill disk without bounds.

**Fix:** Configure Docker daemon log driver:
```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "50m",
    "max-file": "3"
  }
}
```

---

### 18. SSO Not Wired Into Portals

**Impact:** All 6 portals (Gateway, Kafka, Cache, Storage, AuthZ, Logging) have zero authentication. Anyone with network access can manage infrastructure.

**Fix:** Integrate NextAuth.js with Keycloak OIDC provider in each portal. Keycloak clients already configured in `infrastructure` realm.

---

## NOT YET IMPLEMENTED — Architecture Gaps

### 19. Kubernetes Migration

**Status:** Helm charts exist in `infra/helm/` for Kafka, Redis, MinIO but are incomplete.

**Why:** Docker Compose lacks orchestration, auto-scaling, rolling updates, pod disruption budgets, and proper resource scheduling.

---

### 20. Service Mesh

**Why:** No mTLS between services, no traffic management (canary, circuit breaking), limited observability at the network layer.

**Options:** Istio, Linkerd, or Cilium.

---

### 21. Secrets Rotation

**Why:** Static passwords that never change. No automated rotation policy.

**Fix:** HashiCorp Vault with lease-based secrets, or Kubernetes external-secrets-operator.

---

### 22. Multi-Broker Kafka Cluster

**Why:** Single broker cannot survive restarts without downtime. No partition rebalancing.

**Target:** 3 brokers, RF=3, min.insync.replicas=2, unclean.leader.election=false.

---

### 23. PostgreSQL Replication

**Why:** Auth database is a single instance. Keycloak is unusable if PostgreSQL fails.

**Fix:** PostgreSQL streaming replication (primary + standby) or use Patroni for automatic failover.

---

### 24. CI/CD Pipeline

**Why:** No automated testing, linting, image building, or deployment. All changes are manual.

**Target:** GitHub Actions workflow:
- Lint docker-compose files
- Build portal images
- Run smoke tests (`infra/smoke-test.sh`)
- Push to container registry
- Deploy to staging

---

### 25. Disaster Recovery Testing

**Why:** Backup scripts exist but have never been verified with actual restore operations.

**Fix:** Monthly DR drill:
1. Spin up fresh environment
2. Restore from latest backups
3. Verify data integrity
4. Document recovery time (RTO) and data loss (RPO)

---

## Implementation Priority

### Week 1 (Immediate)
- [ ] Add resource limits to all docker-compose services (#1)
- [ ] Add restart policies to auth-server, authz-server (#7)
- [ ] Add PostgreSQL backup to backup-runner (#6)
- [ ] Configure Alertmanager notifications (#8)

### Week 2-3 (Short-term)
- [ ] Rotate all default passwords (#4)
- [ ] Increase Prometheus retention to 30 days (#13)
- [ ] Increase Loki retention to 30 days (#14)
- [ ] Disable anonymous Grafana access (#10)
- [ ] Configure container log rotation (#17)
- [ ] Wire SSO into all portals via NextAuth.js (#18)

### Month 2 (Medium-term)
- [ ] Switch Keycloak to production mode (#3)
- [ ] Implement secrets management — Vault or SOPS (#5)
- [ ] Scale Kafka to 3 brokers with RF=3 (#2, #22)
- [ ] Add PostgreSQL replication (#23)
- [ ] Set up CI/CD pipeline (#24)
- [ ] Change Redis eviction to volatile-lru (#11)

### Month 3+ (Long-term)
- [ ] Migrate to Kubernetes (#19)
- [ ] Deploy service mesh (#20)
- [ ] Implement secrets rotation (#21)
- [ ] Proper CA-signed certificates (#9)
- [ ] Network policies (#12)
- [ ] DR testing schedule (#25)

---

## Completed Items

- [x] TLS/HTTPS — All services have TLS (self-signed)
- [x] Rate limiting — Nginx rate limiting on TLS proxy + MinIO
- [x] Security headers — HSTS, X-Frame-Options, CSP on all nginx proxies
- [x] Centralized logging — Loki + Promtail
- [x] Health monitoring — Uptime Kuma
- [x] Backup scheduling — Redis (6h), MinIO (daily), Kafka (daily)
- [x] Auth server — Keycloak with 2 realms (infrastructure + applications)
- [x] AuthZ server — OPA with policies for infra + task management
- [x] Monitoring & alerting — Prometheus + Grafana + 84 alert rules
- [x] Redis ACL — Per-service user accounts with namespace isolation
- [x] Kafka RBAC — 5-tier role system in Kafka UI
- [x] MinIO erasure coding — 4-node cluster with 2+2 parity
