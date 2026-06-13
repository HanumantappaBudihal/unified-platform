# Kubernetes HA layer

Production high-availability for the stateful + stateless tiers — the main remaining
lever from [PRODUCT-ROADMAP.md](../../PRODUCT-ROADMAP.md) Phase 4 and the
[production-readiness gaps](../docs/production-readiness-gaps.md). Operator-driven and
declarative (the same direction the [Crossplane spike](../crossplane/spike/) proved).

| Dir | What | Operator |
|-----|------|----------|
| [cnpg/](cnpg/) | PostgreSQL HA — registry DB + per-tenant DB template (failover, replication, PITR) | CloudNativePG |
| [strimzi/](strimzi/) | Kafka HA — 3 brokers, RF=3, min.insync=2, KRaft | Strimzi |
| [pdb/](pdb/) | PodDisruptionBudgets for the stateless control-plane tiers | — |
| [network-policies/](network-policies/) | Default-deny per-namespace isolation | — |

## Validated on kind (2026-06-13)
- **CNPG**: 3-instance cluster reached 1 primary + 2 replicas; killing the primary →
  a replica auto-promoted in seconds **with zero data loss** (a row written pre-failover
  survived), and the old primary rejoined as a replica.
- **Strimzi**: `Kafka Ready=True` (v4.1.0) with **3 brokers Running**, and the
  `platform.events` topic provisioned **RF=3 / 3 partitions** (min.insync=2).

## Apply order
1. `cnpg/` operator + `registry-cluster.yaml`
2. `strimzi/` operator + `kafka.yaml`
3. `pdb/` + `network-policies/` once the Deployments carry matching labels
