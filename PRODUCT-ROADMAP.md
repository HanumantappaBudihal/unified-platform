# Unified Platform — Product Roadmap
### From docker-compose demo → commercial, multi-tenant, Kubernetes-native IDP

> Direction (decided 2026-06-13): build a **commercial multi-tenant** product, deploy **Kubernetes-native**, and **harden the core first**.
> This plan is grounded in a deep-research pass on best-in-class IDPs; confidence is labeled per recommendation. See [Sources & confidence](#sources--confidence).

---

## 1. The one load-bearing decision

> **Stop conflating the *portal* (catalog/visibility/self-service) with the *platform* (provisioning/orchestration), and replace the imperative per-app orchestrators with a declarative, reconciled control plane driven by a code-based developer interface.** *(research-verified, high confidence)*

Today the Next.js portal and the Fastify `platform-api` are coupled, and `platform-api` *imperatively mutates shared single instances* of Postgres/Redis/Kafka/MinIO with name-prefix "isolation." That is fine for a demo and **structurally wrong for a commercial multi-tenant SaaS** — there is no tenant, no real isolation, no reconciliation/self-healing, and provisioning drift is invisible.

The industry-standard target is the **five-plane model** (McKinsey/Humanitec): Developer Control Plane → Integration & Delivery (the orchestrator + GitOps) → Security Plane (secrets) → Resource Plane (per-tenant infra) → Monitoring & Logging. Keep our portal/CLI as the thin Developer Control Plane; harden `platform-api` into a real orchestrator that emits **declarative claims** reconciled on Kubernetes.

---

## 2. Where we are vs. where we're going

| Dimension | Today | Target |
|---|---|---|
| Tenancy | None — apps + `owner_id` string; shared instances, name-prefix isolation | First-class **Tenant/Org**; every app/resource/secret/audit row tenant-scoped; per-tenant isolation tiers |
| Provisioning | Imperative Node orchestrators mutate shared services | **Declarative** Crossplane Compositions + **Score** interface, reconciled, GitOps-delivered |
| Deploy | docker-compose | **Kubernetes** (existing `infra/` Helm + ArgoCD + Terraform + Istio); compose = local dev only |
| Identity | Just-added opt-in bearer token; Keycloak provisioned but unused for the control plane | OIDC/SSO + **Keycloak Organizations**, SCIM, per-tenant RBAC, scoped API tokens |
| Authz | OPA provisioned per app, not enforced on the control plane | Enforced tenant+role authz on every call (OPA), optional ReBAC (SpiceDB) for resource sharing |
| Secrets | Plaintext `.env`; generated creds stored in Postgres `credentials` JSONB | **Vault** (dynamic creds + rotation) synced via **External Secrets Operator** |
| Data services | One shared Postgres/Kafka/Redis/MinIO for everyone | **Per-tenant instances** via operators (CNPG/Strimzi/Redis/MinIO) at paid tiers |
| Billing | None | **OpenMeter** metering + Stripe; plans/quotas/entitlements |
| Observability | Prometheus/Grafana/Loki, single-tenant, anon access | **OTel** + per-tenant isolation (Mimir/Loki orgs), SLOs/error budgets, status page |
| Delivery | Manual; CRLF/init bugs just found by running it | CI/CD: lint/test/smoke + image scan/sign (SLSA/cosign/SBOM) |

---

## 3. The central pivot: declarative control plane

**Recommendation (high confidence on direction; medium on specific tool):**

- **Developer interface → Score** (CNCF Sandbox). Developers declare `score.yaml` ("my workload needs a postgres, a bucket, a topic"); the platform resolves *how*. `score-compose` and `score-k8s` exist, so it bridges our compose→k8s migration. *Caveat: Score is Sandbox, not graduated — wrap it, don't bet the API surface on it yet.*
- **Resource control plane → Crossplane** (CNCF graduated). Model each resource type as a **Composition** (Postgres via CloudNativePG, Kafka via Strimzi, Redis, MinIO operator, Keycloak client, Kong route, OPA policy). `platform-api` stops mutating services directly and instead **writes Crossplane Claims**; Crossplane reconciles them (self-healing, drift-correcting), ArgoCD delivers. This reuses the Helm/ArgoCD already in `infra/`.
- **Golden paths → templated profiles** (Humanitec "Workload Profile" pattern = input spec + Helm chart). Expose a few knobs, pre-set the rest, encode best practice once. **Always provide an escape hatch** — over-abstraction that hides failures is the #1 complaint.
- **Kratix is the alternative / a later add-on**, not a competitor to pick now: if we later want a "Promise marketplace" / platform-as-product packaging and multi-cluster scheduling, layer it as **Score → Kratix Promise → Crossplane**. *(The research refuted any claim that Crossplane is categorically superior to Kratix — choose on fit. For a first hardening pass, Crossplane alone is the lower-risk, more mature choice.)*

**Migration = strangler, never big-bang:** keep the imperative orchestrators running; introduce **one** Composition (Postgres) behind a feature flag; route new provisioning through the declarative path; migrate resource-by-resource; retire each orchestrator only when its Composition is proven.

---

## 4. The nine pillars (target state + concrete choice)

### A. Multi-tenancy & isolation *(established practice; not independently verified this pass — medium confidence)*
Tiered isolation, sold as product tiers:
- **Baseline (trial/standard):** namespace-per-tenant + `ResourceQuota` + `LimitRange` + default-deny `NetworkPolicy` + tenant RBAC. Data services: dedicated DB/user/bucket with strong RBAC on a shared instance.
- **Isolated (pro):** **vcluster** per tenant — virtual control plane, far cheaper than a real cluster, much stronger than a namespace.
- **Dedicated (enterprise/compliance):** cluster-per-tenant and/or dedicated data-service instances (CNPG cluster, Strimzi cluster) — addresses noisy-neighbor at the data tier, which namespace isolation does **not**.

The current "shared instance + name prefix" is only acceptable at a free tier; **per-tenant instances via operators are the paid-tier default.** This is the biggest cost/complexity lever in the whole plan.

### B. Identity, auth & RBAC *(established practice — medium confidence)*
- **Keycloak Organizations** (24+) for B2B multi-tenant orgs; OIDC/SSO; **SCIM** for enterprise user provisioning.
- Replace `owner_id` strings with **tenant → membership → role**; enforce on every `platform-api` call (the bearer token I just added becomes a per-tenant **scoped** token / service account).
- Coarse policy via **OPA** (already provisioned); add **SpiceDB** (Zanzibar/ReBAC) only when fine-grained resource sharing ("user X can read app Y's bucket") becomes a requirement — defer for v1.

### C. Secrets *(established practice — medium confidence)*
- **HashiCorp Vault** as source of truth: dynamic DB credentials with TTL + rotation, per-tenant secret paths.
- **External Secrets Operator** syncs Vault → tenant namespace `Secret`s.
- Migrate creds **out of** the Postgres `credentials` JSONB and out of `.env` files.

### D. Provisioning control plane — see §3.

### E. Usage metering & billing *(research-verified — high confidence)*
- **OpenMeter** (Apache-2.0, self-hostable): CloudEvents ingestion → **Kafka + ClickHouse** real-time aggregation → **Postgres** billing state → **Stripe** invoicing; tiered/graduated/flat-fee. Fits our existing Kafka + Postgres. Meter provisioning events + resource usage; tie plan entitlements to `ResourceQuota`.

### F. Observability & SLOs *(established practice — medium confidence)*
- **OpenTelemetry** for traces/metrics/logs with a `tenant_id` resource attribute on everything.
- Per-tenant isolation via multi-tenant backends (Grafana **Mimir** + **Loki** with `X-Scope-OrgID`); per-tenant Grafana orgs/dashboards.
- Define **golden-signal SLOs + error budgets** (OpenSLO/Sloth); public **status page**. Instrument **DORA + adoption** from day one — research shows ~30% of platforms measure *nothing*; measurement is the highest-leverage neglected area.

### G. Production-readiness, HA/DR & compliance *(established practice — medium confidence)*
- Fold in the existing 25-item [infra/docs/production-readiness-gaps.md](infra/docs/production-readiness-gaps.md): resource limits, Kafka RF=3/min.insync=2, Postgres replication (CNPG failover), tested backup/restore (RTO/RPO drills), network policies, real TLS (cert-manager), no anonymous Grafana.
- **SOC2 / enterprise:** immutable+exportable audit log (extend our `platform_audit_log`), access reviews, encryption at rest/in transit, change management, BC/DR.
- **Supply-chain:** SBOM (syft), image signing (**cosign/sigstore**), **SLSA** provenance, pinned base images, CVE scanning (trivy) in CI.

### H. Platform-as-a-product & maturity *(research-verified — high confidence)*
Sequence and grade with the **CNCF Platform Engineering Maturity Model**: 4 levels (Provisional → Operationalized → Scalable → Optimizing) × 5 aspects (Investment, Adoption, Interfaces, Operations, Measurement). Target **Level 3 "Scalable"** = run it *as a product* with **intrinsic-pull** adoption (devs choose it because it's good), not mandated.

---

## 5. Phased roadmap (sequenced "harden the core first")

| Phase | Theme | Key deliverables | Exit criteria | CNCF aspect → level |
|---|---|---|---|---|
| **0. Stabilize & commit** (1–2 wk) | Stop the bleeding | Commit the 8 bug fixes; `.gitattributes` (`*.sh eol=lf`); fix `storage-net`/MinIO cred mismatch; **CI/CD** (lint, test, smoke, trivy scan, cosign sign); make control-plane auth **mandatory** outside dev; resource limits + restart policies | Green CI on every PR; signed images; no known correctness bugs | Operations → Operationalized |
| **1. Tenancy & identity core** ⭐ (3–5 wk) | The keystone | **Tenant/Org** as first-class entity; `tenant_id` on every app/resource/audit row + backfill; Keycloak Organizations + OIDC SSO; **enforced** tenant+role RBAC (OPA) on every API call; scoped per-tenant API tokens; secrets → **Vault + ESO**, creds out of the DB | A tenant can see/act on **only** its own apps/resources; authz enforced end-to-end; zero plaintext secrets | Interfaces/Operations → Operationalized |
| **2. Declarative k8s control plane** (6–10 wk) | The pivot | Stand up k8s via existing Helm/ArgoCD/Terraform + Istio mTLS; **Crossplane** + **Score**; golden-path Compositions per resource (CNPG/Strimzi/Redis/MinIO/Keycloak/Kong/OPA); strangler-migrate off imperative orchestrators; per-tenant namespaces + quotas + NetworkPolicy; vcluster for higher tier | Provisioning is declarative/self-healing & GitOps-delivered; imperative orchestrators retired; per-tenant isolation enforced | Interfaces → Scalable |
| **3. Commercialize** (4–8 wk) | Make it sellable | **OpenMeter** + Stripe; plans/quotas/entitlements wired to ResourceQuota; self-service signup → plan → provision → bill; per-tenant observability (OTel + Mimir/Loki) + SLOs + status page | A new org self-signs-up, picks a plan, provisions, and is billed; SLOs tracked per tenant | Investment/Adoption → Scalable |
| **4. Scale, optimize, comply** (ongoing) | Enterprise-grade | HA/DR everywhere (RF=3, CNPG failover, multi-AZ, tested DR drills); zero-downtime upgrades + autoscaling; **SOC2** (audit, access reviews, encryption, supply-chain/SLSA/cosign, pen-test) | SOC2-ready; tenant SLAs met; intrinsic-pull adoption | Measurement → Optimizing |

---

## 6. Immediate next steps (this week)

1. **Commit the session's fixes** on a branch + PR (8 bug fixes across platform-api, CLI, portal, init script).
2. **Add `.gitattributes`** (`*.sh text eol=lf`) + **CI** (GitHub Actions: lint → unit → `infra/smoke-test.sh` → trivy → cosign sign).
3. **Spike the keystone:** Tenant data model migration — `tenants`, `memberships`, `roles`; add `tenant_id` FK to `platform_apps`/`platform_app_resources`/`platform_audit_log`; backfill a default tenant.
4. **Spike the pivot:** one **Crossplane Composition** (Postgres via CloudNativePG) behind a feature flag, to prove the declarative path end-to-end on kind/minikube.

---

## 7. Decisions to confirm (I recommend; you decide)

1. **Control plane:** Crossplane now + Score interface, Kratix optional later — confirm, or prefer Kratix-first?
2. **Isolation tiers:** namespace (baseline) / vcluster (pro) / dedicated (enterprise) as the productized tiers — agree?
3. **Data services:** self-run via operators (CNPG/Strimzi/…) **or** managed cloud (RDS/MSK/ElastiCache/S3) at the paid tiers? (Big cost/ops trade-off; managed is faster-to-SOC2.)
4. **Authz:** OPA-only for v1, add SpiceDB later — or invest in ReBAC now?

---

## Sources & confidence

**Research-verified (high confidence, primary sources):** portal-vs-control-plane separation, Score as declarative interface, golden-path/Workload-Profile pattern, Crossplane/Kratix as the declarative options, the five-plane model, the CNCF Platform Engineering Maturity Model, and OpenMeter for metering/billing.
— Humanitec reference architecture; docs.score.dev; Crossplane & Kratix docs; CNCF TAG App Delivery maturity whitepaper; OpenMeter (github.com/openmeterio/openmeter).

**Established practice (medium confidence — NOT independently verified in this research pass; treat as informed default, validate before committing):** the specifics of K8s hard multi-tenancy (namespace/vcluster/cluster), B2B identity/SCIM/authz-engine choice, secrets (Vault/ESO), per-tenant observability/SLOs, and HA/DR/SOC2/supply-chain. These five areas had source material but no claim that survived 2-of-3 adversarial verification, so they're my synthesis from standard industry practice — worth a focused second research pass before locking decisions on them.
