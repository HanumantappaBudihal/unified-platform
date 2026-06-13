# Crossplane control-plane spike (Phase 2 de-risk)

Proves the central [PRODUCT-ROADMAP.md](../../../PRODUCT-ROADMAP.md) pivot: replacing the
imperative per-app orchestrators (`platform-api/src/orchestrators/*`) with a **declarative,
reconciled** Kubernetes-native control plane.

## What it demonstrated (validated 2026-06-13 on kind + Crossplane 2.3.2)

1. **Crossplane installs and runs** on a vanilla cluster (`helm install crossplane`).
2. **provider-sql** installs, becomes `Healthy`, and exposes `Database`/`Role`/`Grant` CRDs.
3. A declarative `Database` resource reconciles to `Synced=True / Ready=True` and a **real
   `acme_billing_db` is created** in the target Postgres — i.e. the same outcome as
   [postgres.js](../../../platform-api/src/orchestrators/postgres.js), but declarative.
4. **Self-healing**: dropping the database out-of-band (drift) → Crossplane recreates it on
   the next reconcile. Imperative scripts cannot do this.

## Run it

```bash
kind create cluster --name idp-spike
helm repo add crossplane-stable https://charts.crossplane.io/stable && helm repo update
helm install crossplane crossplane-stable/crossplane -n crossplane-system --create-namespace --wait

kubectl apply -f 00-postgres.yaml          # target Postgres + provider connection secret
kubectl apply -f 10-provider.yaml          # provider-sql
kubectl wait provider/provider-sql --for=condition=Healthy --timeout=240s
kubectl apply -f 20-providerconfig.yaml    # note sslMode: disable for the non-TLS test DB
kubectl apply -f 30-database.yaml          # the declarative Database
kubectl wait database.postgresql.sql.crossplane.io/acme-billing --for=condition=Ready --timeout=120s
```

Teardown: `kind delete cluster --name idp-spike`.

## Next step (golden-path abstraction)

On Crossplane v2.x, the `XRD + Composition` golden-path layer (a `TenantDatabase` claim →
Database + Role + Grant + connection secret) requires the **function-patch-and-transform**
function with a `mode: Pipeline` Composition (the classic inline `spec.resources` P&T was
removed in v2). The provider/managed-resource foundation it builds on is proven here.
