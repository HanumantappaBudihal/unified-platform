# 09 - Governance Policies

## Overview

Governance policies ensure consistency, prevent accidental issues, and enforce data contracts across all applications using the central Kafka server.

## 1. Topic Auto-Creation Disabled

**Config:** `KAFKA_AUTO_CREATE_TOPICS_ENABLE: "false"`

All topics must be explicitly created — either via:
- Kafka UI → Topics → Add a Topic
- `bash scripts/create-topic.sh <name> [partitions] [replication]`
- `bash scripts/init-topics.sh` (bulk initialization)

**Why:** Prevents accidental topics from typos (e.g., `oders.checkout.created` instead of `orders.checkout.order-created`), ensures every topic follows naming conventions and has proper partition/replication configuration.

If a producer attempts to write to a non-existent topic, it will receive a `UNKNOWN_TOPIC_OR_PARTITION` error.

## 2. Topic Naming Convention

```
<domain>.<application>.<event-type>
```

### Rules
- All lowercase
- Dots (`.`) separate hierarchy levels
- Hyphens (`-`) separate words within a level
- Maximum 3 levels deep
- Dead letter queues append `.dlq`

### Valid Examples
```
orders.checkout.order-created
orders.checkout.order-cancelled
users.auth.login-event
users.auth.signup-event
inventory.warehouse.stock-updated
notifications.email.send-request
notifications.sms.send-request
payments.stripe.payment-completed
```

### Invalid Examples
```
OrderCreated              ← no hierarchy, PascalCase
order_created             ← underscores not allowed
orders.checkout           ← missing event type
my-topic                  ← no domain/app structure
```

## 3. Schema Compatibility (Schema Registry)

**Default compatibility:** `BACKWARD`

This means:
- New schema versions can **remove** optional fields
- New schema versions can **add** fields with defaults
- New schema versions **cannot** remove required fields
- New schema versions **cannot** change field types

### Compatibility Levels

| Level | Rule | Use Case |
| ----- | ---- | -------- |
| `BACKWARD` (default) | New schema can read old data | Most applications |
| `FORWARD` | Old schema can read new data | When consumers update slowly |
| `FULL` | Both backward and forward | Maximum safety |
| `NONE` | No checks | Only for development |

### Set Per-Topic Compatibility

```bash
# Set FULL compatibility for a critical topic
curl -X PUT -H "Content-Type: application/vnd.schemaregistry.v1+json" \
  --data '{"compatibility":"FULL"}' \
  http://localhost:8081/config/orders.checkout.order-created-value

# Check current compatibility
curl -s http://localhost:8081/config/orders.checkout.order-created-value | jq .
```

### Test Schema Compatibility Before Registering

```bash
# Test if a new schema is compatible before registering
curl -X POST -H "Content-Type: application/vnd.schemaregistry.v1+json" \
  --data '{"schema": "{\"type\":\"record\",\"name\":\"Order\",\"fields\":[{\"name\":\"id\",\"type\":\"string\"}]}"}' \
  http://localhost:8081/compatibility/subjects/orders.checkout.order-created-value/versions/latest
```

## 4. Kafka UI RBAC (Role-Based Access Control)

### Roles

| Role | Can Do | Intended For |
| ---- | ------ | ------------ |
| `admin` | Everything — cluster config, topics, schemas, ACLs, connectors | Platform team |
| `editor` | Create/edit topics, schemas, connectors; no cluster config changes | Team leads |
| `developer` | View topics, browse messages, produce test messages | Developers |
| `viewer` | Read-only — view topics, messages, schemas | Stakeholders, monitoring |
| `team-orders` | Full access to `orders.*` topics only | Orders team |
| `team-inventory` | Full access to `inventory.*` topics only | Inventory team |

### Role Definitions

Roles are defined in `config/kafka-ui/roles.yml`. Each role specifies:
- Which clusters it applies to
- Which resources (topics, consumers, schemas, connectors, ACLs)
- Which actions (view, create, edit, delete, messages_read, etc.)
- Topic patterns (regex) for scoped access

### Adding a New Team Role

Add to `config/kafka-ui/roles.yml`:

```yaml
- name: "team-payments"
  clusters:
    - kafka-central
  subjects:
    - provider: "oauth"
      type: "role"
      value: "team-payments"
  permissions:
    - resource: topic
      value: "^payments\\..*"
      actions: [ "view", "create", "edit", "messages_read", "messages_produce" ]
    - resource: consumer
      value: ".*"
      actions: [ "view" ]
    - resource: schema
      value: "^payments-.*"
      actions: [ "view", "create", "edit" ]
```

## 5. Quotas

Per-application quotas prevent any single app from overwhelming the cluster:

| Application | Produce Rate | Consume Rate |
| ----------- | ------------ | ------------ |
| checkout-service | 10 MB/s | 20 MB/s |
| inventory-service | 10 MB/s | 20 MB/s |
| notification-service | 10 MB/s | 20 MB/s |
| analytics-service | 5 MB/s | 40 MB/s |

Quotas are configured in `scripts/init-security.sh` and apply when using the secure profile.

## 6. Retention Policies

| Topic Type | Retention | Reason |
| ---------- | --------- | ------ |
| Application topics | 7 days | Standard event retention |
| Dead Letter Queues | 30 days | Extended for investigation |
| Audit logs | 30 days | Compliance requirements |
| Compact topics | Infinite (compacted) | Latest state per key |

## 7. Checklist for Onboarding a New Application

1. Choose a domain prefix (e.g., `payments`)
2. Define topic names following the naming convention
3. Register schemas in Schema Registry (if using Avro/Protobuf)
4. Create topics via Kafka UI or `create-topic.sh`
5. Create corresponding DLQ topics
6. (Secure mode) Create SCRAM user credentials
7. (Secure mode) Configure ACLs for the application
8. (Secure mode) Set quotas
9. Add a team role in Kafka UI RBAC
10. Document the application's topics in your team wiki
