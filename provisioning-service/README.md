# Provisioning Service

The **implementation** half of app infra-provisioning for the Seiton suite.

In the Seiton architecture the boundary is:

- **Seiton Platform** (control plane) decides **what** an app needs — it owns the
  app registry, tenancy, and onboarding. During onboarding it calls this service.
- **InfraMatrix** (this service) implements **how** — it creates the real
  resources on the shared backing services and returns their config + credentials.

This service is **stateless**. It provisions and returns; it does **not** keep a
registry. Seiton Platform persists which resources an app owns.

```
Seiton Platform ──POST /v1/provision──▶ provisioning-service ──▶ Kafka / Redis / MinIO / Postgres / Kong
   (decides)      {tenant,app,resources}     (implements)        (creates topics, ACLs, buckets, DBs, routes)
                ◀──{provisioned, errors}──
   (persists config + credentials)
```

> Identity is **not** provisioned here. Apps are registered as OAuth clients by
> Seiton Platform's own IdP (OpenIddict). This service never touches Keycloak.

## API

All endpoints (except `/health` and `/`) require `Authorization: Bearer <PROVISIONING_API_TOKEN>`.

### `POST /v1/provision`

```jsonc
{
  "tenant": "acme",            // optional; namespaces resources per tenant
  "app": "orders-api",         // required
  "environment": "dev",        // optional, default "dev"
  "resources": [               // optional; defaults to all enabled types
    "kafka",
    "redis",
    "minio",
    "postgres",
    { "type": "gateway", "opts": { "upstreamPort": 8080 } }
  ]
}
```

Response (`200` when fully clean, `502` if any resource failed):

```jsonc
{
  "slug": "acme-orders-api",
  "environment": "dev",
  "provisioned": {
    "kafka":    { "config": { "topicPrefix": "dev.acme-orders-api", "topics": ["..."] },
                  "credentials": { "topicPrefix": "...", "brokers": "kafka:9092" } },
    "postgres": { "config": { "database": "acme_orders_api_dev_db", "...": "..." },
                  "credentials": { "username": "...", "password": "...", "connectionString": "..." } },
    "minio":    { "credentials": { "accessKey": "...", "secretKey": "...", "bucket": "dev-acme-orders-api" } },
    "redis":    { "credentials": { "username": "...", "password": "...", "keyPrefix": "dev:acme-orders-api:" } },
    "gateway":  { "config": { "path": "/api/dev/acme-orders-api", "...": "..." } }
  },
  "errors": []
}
```

### `POST /v1/decommission`

Same request body. Tears down the resources. **MinIO buckets are retained** —
data removal is a separate, explicit operation to avoid accidental loss.

### `GET /health`

Public. Returns status and the enabled resource types.

## What each resource maps to

| Resource | Created |
|----------|---------|
| `kafka` | Topics `<env>.<slug>.{events,commands}` + `.dlq` siblings |
| `redis` | ACL user `<slug>-<env>-svc` scoped to key/channel prefix `<env>:<slug>:` |
| `minio` | Bucket `<env>-<slug>` + scoped service account & policy |
| `postgres` | Role `<slug>_<env>_user` + database `<slug>_<env>_db` |
| `gateway` | Kong service + route at `/api/<env>/<slug>` with rate limiting |

## Run

```bash
cp .env.example .env   # fill in backing-service admin endpoints + a strong PROVISIONING_API_TOKEN
npm install
npm run dev            # or: docker compose up --build
```

Configuration is entirely env-driven — see [.env.example](.env.example).
