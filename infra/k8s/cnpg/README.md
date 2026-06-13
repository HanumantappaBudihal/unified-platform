# PostgreSQL HA — CloudNativePG

Replaces the single `shared-postgres` with a self-healing HA cluster (primary + hot
standbys, automated failover, streaming replication, optional PITR to MinIO).
Closes the **PostgreSQL replication** gap in
[production-readiness-gaps.md](../../docs/production-readiness-gaps.md) and the
**registry HA** lever in [phase4-hardening.md](../../docs/phase4-hardening.md).

## Apply

```bash
# 1. Operator (cluster-wide, once)
kubectl apply --server-side -f \
  https://raw.githubusercontent.com/cloudnative-pg/cloudnative-pg/release-1.24/releases/cnpg-1.24.1.yaml
kubectl -n cnpg-system rollout status deploy/cnpg-controller-manager

# 2. Registry HA cluster (1 primary + 2 replicas)
kubectl apply -f registry-cluster.yaml
kubectl -n platform-data wait --for=condition=Ready cluster/platform-db --timeout=300s
```

CNPG generates the app connection secret `platform-db-app` (host/user/password/uri).
Point `platform-api` at the read/write service `platform-db-rw.platform-data` and,
if desired, reads at `platform-db-ro`.

## Failover (validated on kind)

```bash
# delete the primary pod; CNPG promotes a replica automatically
kubectl -n platform-data delete pod "$(kubectl -n platform-data get pods \
  -l cnpg.io/instanceRole=primary -o name)"
# a former replica becomes the new primary within seconds
kubectl -n platform-data get pods -L cnpg.io/instanceRole
```

## Per-tenant databases

[tenant-cluster-template.yaml](tenant-cluster-template.yaml) is the dedicated-instance
golden path for paid tiers — render `__TENANT__` and apply (this is the declarative
target the imperative `postgres.js` orchestrator / the Crossplane Composition stamps).

## Production extras (commented in the manifest)
- `backup.barmanObjectStore` → continuous WAL archiving + PITR to MinIO (BC/DR).
- Bump `instances`, `storage.size`, and `resources` for real workloads.
