# AuthZ Server — Integration Guide

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
      "user": "demo-user",
      "app": "task-manager",
      "action": "read",
      "resource": "task",
      "project": "alpha"
    }
  }'
# → { "result": true }
```

## Input Fields

| Field | Required | Description |
|---|---|---|
| `user` | Yes | Username or JWT `sub` |
| `app` | Yes | Application client ID |
| `action` | Yes | `read`, `create`, `update`, `delete` |
| `resource` | No | Resource type |
| `resource_id` | No | Specific resource ID |
| `project` | No | Project scope |

## Adding Users/Roles

Edit `config/opa/data/roles.json`, then restart OPA:

```bash
docker compose restart authz-opa
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
