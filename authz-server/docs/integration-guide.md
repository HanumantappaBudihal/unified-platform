# AuthZ Server — Integration Guide

> **Scope: operator / infra-op authorization only.** This OPA instance decides
> who may view and operate the shared backing services and operator portals. It
> does **not** decide app/user/tenant permissions — that is owned by the Seiton
> Platform control plane and its own OPA.

## Services

| Service | URL | Purpose |
|---|---|---|
| OPA | http://localhost:8181 | Authorization policy engine |
| Portal | http://localhost:3008 | Management UI |

## Quick Start

```bash
cd authz-server
docker compose up -d    # starts OPA + portal
```

Portal: http://localhost:3008
OPA API: http://localhost:8181

## Checking Permissions

```bash
curl -X POST http://localhost:8181/v1/data/authz/allow \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "user": "ops-alice",
      "action": "restart",
      "target": "kafka"
    }
  }'
# → { "result": true }
```

## Input Fields (operator domain)

| Field | Required | Description |
|---|---|---|
| `user` | Yes | Operator id / JWT `sub` |
| `action` | Yes | `read`/`list`/`metrics` (read) · `scale`/`restart`/`reload`/`provision`/`decommission`/`configure`/`rotate` (operate) |
| `target` | For target ops | Infra component: `kafka`, `redis`, `minio`, `postgres`, `gateway`, `monitoring`, `logging`, `backup` |
| `portal` | For UI access | Operator portal id, e.g. `gateway-portal`, `grafana`, `minio-console` |

## Roles

Roles are pushed to OPA at `data.users[<user>]` (e.g. via the portal or
`PUT /v1/data/users`):

```jsonc
{
  "ops-alice": { "infra": { "role": "infra-admin" } },     // full control of any target
  "ops-bob":   { "infra": { "role": "infra-operator" } },  // read + operate targets
  "ops-cara":  { "infra": { "role": "infra-viewer" } },    // read-only
  "ops-root":  { "global_roles": ["infra-super-admin"] }   // unrestricted
}
```

## Policies & tests

Policies live in `config/opa/policies/` (`authz.rego` base + `operator.rego`).
Validate locally with the OPA CLI:

```bash
opa check config/opa/policies
opa test  config/opa/policies   # operator_test.rego
```

## Adding Policies

Add `.rego` files to `config/opa/policies/`, then restart OPA.

## Network Access

Other docker-compose services can reach OPA by joining `authz-network`:

```yaml
services:
  your-app:
    networks:
      - authz-network

networks:
  authz-network:
    external: true
    name: authz-network
```

Internal URL: `http://authz-opa:8181`
