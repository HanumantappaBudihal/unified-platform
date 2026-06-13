# Kafka HA — Strimzi (KRaft)

3 combined controller+broker nodes, `replication.factor=3`, `min.insync.replicas=2`,
`unclean.leader.election.enable=false`. Closes the **single-broker / RF=1** gap in
[production-readiness-gaps.md](../../docs/production-readiness-gaps.md).

## Apply

```bash
# 1. Operator
kubectl create namespace kafka
kubectl apply -f 'https://strimzi.io/install/latest?namespace=kafka' -n kafka
kubectl -n kafka rollout status deploy/strimzi-cluster-operator

# 2. Kafka cluster + a sample HA topic
kubectl apply -f kafka.yaml
kubectl -n kafka wait --for=condition=Ready kafka/platform-kafka --timeout=600s
```

Bootstrap address for clients: `platform-kafka-kafka-bootstrap.kafka:9092`.

## HA properties
- RF=3 + min.insync.replicas=2 → a broker can fail with no data loss and writes
  continue (need 2 of 3 in-sync).
- `unclean.leader.election.enable=false` → never elect an out-of-sync leader.
- The Topic/User Operators reconcile `KafkaTopic`/`KafkaUser` CRs — the per-tenant
  topic + ACL golden path (mirrors the imperative `kafka.js` orchestrator).

## Validated on kind (2026-06-13)
Operator + `Kafka`/`KafkaNodePool`/`KafkaTopic` (RF=3, min.insync=2) →
`Kafka Ready=True` (v4.1.0), **3 brokers Running**, and `platform.events` topic
`Ready=True` with **partitions=3, replicas=3**. Bootstrap:
`platform-kafka-kafka-bootstrap.kafka:9092`.

> Note: the latest Strimzi supports Kafka **4.1.x/4.2.x** only — pin a supported
> `spec.kafka.version`.
