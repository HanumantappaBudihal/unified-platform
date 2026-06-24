# InfraMatrix — Product Roadmap
### Hardening the self-hosted infrastructure layer toward Kubernetes-native operations

> Direction (decided 2026-06-13, scope updated 2026-06-24): InfraMatrix is now **purely the infrastructure layer** — Kafka, Redis, MinIO, Postgres, the Kong/gateway, monitoring, logging, backup, email, the operator portals, and an OPA `authz-server` scoped to **operator** authorization only.
>
> The **control plane** (multi-tenant onboarding, the `platform-api`, tenant/app/team registry, identity/Keycloak SSO, and billing) has moved to a **separate product, Seiton Platform**, and is no longer an InfraMatrix deliverable. InfraMatrix exposes infrastructure that Seiton Platform (or any other control plane) provisions against; it ships no Keycloak, no platform-api, no app/user/tenant registry, and no billing.
>
> This plan is grounded in a deep-research pass on best-in-class infrastructure platforms; confidence is labeled per recommendation. See [Sources & confidence](#sources--confidence).

---

## 1. The one load-bearing decision

> **Keep the infrastructure layer cleanly separated from any control plane, and replace imperative, hand-run provisioning with declarative, reconciled resource management on Kubernetes.** *(research-verified, high confidence)*

Today the data services (Postgres/Redis/Kafka/MinIO) run as shared single instances configured by hand and docker-compose. That is fine for a demo and **structurally weak for production** — there is no reconciliation/self-healing, and provisioning drift is invisible.

The industry-standard target is the **Resource Plane** of the five-plane model (McKinsey/Humanitec): per-workload infra, provisioned declaratively and reconciled. InfraMatrix owns that Resource Plane plus its Monitoring & Logging; the Developer Control Plane and Security/identity plane belong to Seiton Platform.

---

## 2. Where we are vs. where we're going

| Dimension | Today | Target |
|---|---|---|
| Provisioning | Imperative / hand-run config of shared services | **Declarative** Crossplane Compositions, reconciled, GitOps-delivered |
| Deploy | docker-compose | **Kubernetes** (existing `infra/` Helm + ArgoCD + Terraform + Istio); compose = local dev only |
| Operator authz | OPA `authz-server` for operator portal access | Enforced operator role authz on every portal/admin action (OPA) |
| Secrets | Plaintext `.env`; generated creds in `secrets/` | **Vault** (dynamic creds + rotation) synced via **External Secrets Operator** |
| Data services | One shared Postgres/Kafka/Redis/MinIO | **Per-workload instances** via operators (CNPG/Strimzi/Redis/MinIO) where isolation is required |
| Observability | Prometheus/Grafana/Loki, single-tenant, anon access | **OTel** + SLOs/error budgets, status page |
| Delivery | Manual; CRLF/init bugs found by running it | CI/CD: lint/test/smoke + image scan/sign (SLSA/cosign/SBOM) |

> Identity/SSO, multi-tenancy, metering and billing are **out of scope for InfraMatrix** — they belong to Seiton Platform.

---

## 3. The central pivot: declarative resource provisioning

**Recommendation (high confidence on direction; medium on specific tool):**

- **Resource control plane → Crossplane** (CNCF graduated). Model each resource type as a **Composition** (Postgres via CloudNativePG, Kafka via Strimzi, Redis, MinIO operator, Kong route, OPA policy). Instead of mutating services by hand, an external control plane (Seiton Platform) **writes Crossplane Claims**; Crossplane reconciles them (self-healing, drift-correcting), ArgoCD delivers. This reuses the Helm/ArgoCD already in `infra/`.
- **Golden paths → templated profiles** (Humanitec "Workload Profile" pattern = input spec + Helm chart). Expose a few knobs, pre-set the rest, encode best practice once. **Always provide an escape hatch** — over-abstraction that hides failures is the #1 complaint.
- **Score** (CNCF Sandbox) remains a useful declarative interface at the control-plane boundary; `score-compose`/`score-k8s` bridge the compose→k8s migration. *Caveat: Score is Sandbox, not graduated — wrap it, don't bet the API surface on it yet.*

**Migration = strangler, never big-bang:** keep the current provisioning running; introduce **one** Composition (Postgres) behind a feature flag; route new provisioning through the declarative path; migrate resource-by-resource.

---

## 4. The pillars (target state + concrete choice)

### A. Resource isolation *(established practice — medium confidence)*
Tiered isolation at the data tier:
- **Shared (free/dev):** dedicated DB/user/bucket with strong RBAC on a shared instance.
- **Dedicated (production):** per-workload data-service instances (CNPG cluster, Strimzi cluster, dedicated Redis/MinIO) — addresses noisy-neighbor at the data tier, which shared instances do **not**.

### B. Operator authorization *(established practice — medium confidence)*
- **OPA** (`authz-server`) enforces operator role authz for the portals and admin actions. This is *operator* authorization only — not end-user/tenant identity, which lives in Seiton Platform.

### C. Secrets *(established practice — medium confidence)*
- **HashiCorp Vault** as source of truth: dynamic DB credentials with TTL + rotation.
- **External Secrets Operator** syncs Vault → workload namespace `Secret`s.
- Migrate creds **out of** plaintext `.env` files.

### D. Provisioning control plane — see §3.

### E. Observability & SLOs *(established practice — medium confidence)*
- **OpenTelemetry** for traces/metrics/logs.
- Define **golden-signal SLOs + error budgets** (OpenSLO/Sloth); public **status page**.

### F. Production-readiness, HA/DR & compliance *(established practice — medium confidence)*
- Fold in the existing 25-item [infra/docs/production-readiness-gaps.md](infra/docs/production-readiness-gaps.md): resource limits, Kafka RF=3/min.insync=2, Postgres replication (CNPG failover), tested backup/restore (RTO/RPO drills), network policies, real TLS (cert-manager), no anonymous Grafana.
- **Supply-chain:** SBOM (syft), image signing (**cosign/sigstore**), **SLSA** provenance, pinned base images, CVE scanning (trivy) in CI.

### G. Platform-as-a-product & maturity *(research-verified — high confidence)*
Sequence and grade with the **CNCF Platform Engineering Maturity Model**: 4 levels (Provisional → Operationalized → Scalable → Optimizing) × 5 aspects (Investment, Adoption, Interfaces, Operations, Measurement). Target **Level 3 "Scalable"**.

---

## 5. Phased roadmap (sequenced "harden the core first")

| Phase | Theme | Key deliverables | Exit criteria | CNCF aspect → level |
|---|---|---|---|---|
| **0. Stabilize & commit** (1–2 wk) | Stop the bleeding | Commit the bug fixes; `.gitattributes` (`*.sh eol=lf`); fix `storage-net`/MinIO cred mismatch; **CI/CD** (lint, test, smoke, trivy scan, cosign sign); resource limits + restart policies | Green CI on every PR; signed images; no known correctness bugs | Operations → Operationalized |
| **1. Secrets & operator authz** (3–5 wk) | Lock down the layer | Secrets → **Vault + ESO**, creds out of `.env`; enforced operator RBAC (OPA) on every portal/admin action | Zero plaintext secrets; operator authz enforced end-to-end | Operations → Operationalized |
| **2. Declarative k8s resource plane** (6–10 wk) | The pivot | Stand up k8s via existing Helm/ArgoCD/Terraform + Istio mTLS; **Crossplane**; golden-path Compositions per resource (CNPG/Strimzi/Redis/MinIO/Kong/OPA); strangler-migrate off hand-run provisioning; per-workload isolation where required | Provisioning is declarative/self-healing & GitOps-delivered; hand-run provisioning retired | Interfaces → Scalable |
| **3. Observability & SLOs** (4–8 wk) | Prove it's healthy | **OTel** everywhere; golden-signal SLOs + error budgets; public status page | SLOs tracked; error budgets enforced | Measurement → Scalable |
| **4. Scale, optimize, comply** (ongoing) | Production-grade | HA/DR everywhere (RF=3, CNPG failover, multi-AZ, tested DR drills); zero-downtime upgrades + autoscaling; supply-chain/SLSA/cosign, pen-test | Tenant SLAs met; supply-chain controls in place | Measurement → Optimizing |

---

## 6. Immediate next steps (this week)

1. **Commit the session's fixes** on a branch + PR.
2. **Add `.gitattributes`** (`*.sh text eol=lf`) + **CI** (GitHub Actions: lint → unit → `infra/smoke-test.sh` → trivy → cosign sign).
3. **Spike the pivot:** one **Crossplane Composition** (Postgres via CloudNativePG) behind a feature flag, to prove the declarative path end-to-end on kind/minikube.

---

## 7. Decisions to confirm (I recommend; you decide)

1. **Resource control plane:** Crossplane now + Score interface at the boundary — confirm?
2. **Isolation tiers:** shared (free/dev) / dedicated instances (production) — agree?
3. **Data services:** self-run via operators (CNPG/Strimzi/…) **or** managed cloud (RDS/MSK/ElastiCache/S3) at the dedicated tier? (Big cost/ops trade-off.)

---

## Sources & confidence

**Research-verified (high confidence, primary sources):** portal-vs-control-plane separation, Score as declarative interface, golden-path/Workload-Profile pattern, Crossplane/Kratix as the declarative options, the five-plane model, and the CNCF Platform Engineering Maturity Model.
— Humanitec reference architecture; docs.score.dev; Crossplane & Kratix docs; CNCF TAG App Delivery maturity whitepaper.

**Established practice (medium confidence — NOT independently verified in this research pass; treat as informed default, validate before committing):** the specifics of K8s data-tier isolation, secrets (Vault/ESO), observability/SLOs, and HA/DR/supply-chain. These areas had source material but no claim that survived 2-of-3 adversarial verification, so they're my synthesis from standard industry practice — worth a focused second research pass before locking decisions on them.
