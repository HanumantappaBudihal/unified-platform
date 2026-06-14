# platform-api Helm chart (Kubernetes cutover)

Deploys the control plane on Kubernetes wired to the [CloudNativePG](../../k8s/cnpg/)
HA Postgres — the Phase 2 cutover off the single `shared-postgres`.

## Deploy

```bash
# 1. CNPG operator + registry HA cluster (enableSuperuserAccess: true)
kubectl apply --server-side -f \
  https://raw.githubusercontent.com/cloudnative-pg/cloudnative-pg/release-1.24/releases/cnpg-1.24.1.yaml
kubectl apply -f ../../k8s/cnpg/registry-cluster.yaml
kubectl -n platform-data wait --for=condition=Ready cluster/platform-db --timeout=300s

# 2. platform-api, DB env sourced from the CNPG secrets
helm install plat . -n platform-data \
  --set cnpg.enabled=true \
  --set image.repository=idp/platform-api --set image.tag=latest
```

When `cnpg.enabled=true`, the chart points `PLATFORM_DB_HOST`/`PG_ADMIN_HOST` at
`{cluster}-rw` and sources creds from the `{cluster}-app` / `{cluster}-superuser`
secrets — no passwords in values.

## Notes
- **Probes**: readiness → `/api/v1/health/ready` (DB ping only, fast); liveness →
  `/api/v1/health/live` (no external calls). The aggregate `/api/v1/health` is for
  the portal dashboard, *not* the probes — it fans out to optional services and is
  too slow/flappy to gate pods on.
- Runs **non-root** (`runAsUser: 1000`) with a **read-only root** + an `emptyDir`
  at `/tmp` (the MinIO orchestrator writes a temp policy file there).
- App databases are provisioned on the registry CNPG cluster today; per-tenant
  dedicated clusters use [cnpg/tenant-cluster-template.yaml](../../k8s/cnpg/tenant-cluster-template.yaml).

## Validated on kind
platform-api Ready against the 3-instance CNPG cluster; `onboard postgres` created
`default_k8s_app_dev_db` on `platform-db-rw` (the HA primary).
