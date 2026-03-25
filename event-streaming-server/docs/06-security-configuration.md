# 06 - Security Configuration (Phase 4)

## Overview

The secure profile adds a separate Kafka broker with:

1. **SASL/SCRAM Authentication** — each application gets unique credentials
2. **ACLs (Access Control Lists)** — control which app can read/write to which topics
3. **Quotas** — prevent any single app from overloading the cluster
4. **StandardAuthorizer** — deny-by-default, only allow explicit permissions

## Architecture

```
                    ┌──────────────────────────┐
                    │   kafka-secure            │
                    │   Port: 9095 (SASL)       │
                    │   Port: 9096 (Controller)  │
                    │                            │
                    │   SASL/SCRAM-SHA-256       │
                    │   ACL Authorizer: ON       │
                    │   Super User: admin        │
                    └──────────────────────────┘
```

## Start Secure Broker

```bash
bash scripts/start.sh --secure
```

This starts a **separate** secured Kafka broker alongside the core services:
- Secure broker on port `9095` (SASL_PLAINTEXT)
- Core broker remains on port `9092` (PLAINTEXT, for dev/testing)

## Initialize Users, ACLs & Quotas

After the secure broker is up, run the initialization script:

```bash
bash scripts/init-security.sh
```

This creates:

### Pre-configured Users
| Username | Purpose |
| -------- | ------- |
| `admin` | Super user for Kafka UI and admin tools |
| `checkout-service` | Order processing application |
| `inventory-service` | Inventory management application |
| `notification-service` | Notification dispatch application |
| `analytics-service` | Read-only analytics/reporting |

### Pre-configured ACLs
| User | Produce To | Consume From |
| ---- | ---------- | ------------ |
| `admin` | All topics | All topics |
| `checkout-service` | `orders.*` | `notifications.*` |
| `inventory-service` | `inventory.*` | `orders.*` |
| `notification-service` | `notifications.*` | `notifications.*` |
| `analytics-service` | (none) | All topics |

### Pre-configured Quotas
| User | Produce Rate | Consume Rate |
| ---- | ------------ | ------------ |
| `checkout-service` | 10 MB/s | 20 MB/s |
| `inventory-service` | 10 MB/s | 20 MB/s |
| `notification-service` | 10 MB/s | 20 MB/s |
| `analytics-service` | 5 MB/s | 40 MB/s |

## Configuration Files

| File | Purpose |
| ---- | ------- |
| `config/kafka/kafka-server-jaas.conf` | JAAS config for broker SASL authentication |
| `scripts/init-security.sh` | Creates users, ACLs, and quotas |

## Application Integration (Secured)

Each application must include SASL credentials in its Kafka config:

### Java / Spring Boot
```yaml
spring:
  kafka:
    bootstrap-servers: localhost:9095
    properties:
      security.protocol: SASL_PLAINTEXT
      sasl.mechanism: SCRAM-SHA-256
      sasl.jaas.config: >
        org.apache.kafka.common.security.scram.ScramLoginModule required
        username="checkout-service"
        password="checkout-secret-123";
```

### Node.js (kafkajs)
```javascript
const kafka = new Kafka({
  clientId: 'checkout-service',
  brokers: ['localhost:9095'],
  sasl: {
    mechanism: 'scram-sha-256',
    username: 'checkout-service',
    password: 'checkout-secret-123',
  },
});
```

### Python (confluent-kafka)
```python
from confluent_kafka import Producer

producer = Producer({
    'bootstrap.servers': 'localhost:9095',
    'security.protocol': 'SASL_PLAINTEXT',
    'sasl.mechanism': 'SCRAM-SHA-256',
    'sasl.username': 'checkout-service',
    'sasl.password': 'checkout-secret-123',
})
```

## Adding New Application Users

Edit `scripts/init-security.sh` and add:

```bash
# Add user
create_user "my-new-service" "my-secret-password"

# Grant produce access to specific topics
set_acl --allow-principal User:my-new-service --operation Write --topic "my-domain." --resource-pattern-type prefixed

# Grant consume access
set_acl --allow-principal User:my-new-service --operation Read --topic "my-domain." --resource-pattern-type prefixed
set_acl --allow-principal User:my-new-service --operation Read --group "my-new-service"

# Set quota
set_quota "my-new-service" 10485760 20971520
```

Then re-run: `bash scripts/init-security.sh`

## Manual ACL Management

```bash
CONTAINER="kafka-central-secure"
BOOTSTRAP="localhost:9095"

# List all ACLs
docker exec $CONTAINER /opt/kafka/bin/kafka-acls.sh \
  --bootstrap-server $BOOTSTRAP --list

# Remove an ACL
docker exec $CONTAINER /opt/kafka/bin/kafka-acls.sh \
  --bootstrap-server $BOOTSTRAP --remove \
  --allow-principal User:checkout-service \
  --operation Write --topic "orders." --resource-pattern-type prefixed

# List users
docker exec $CONTAINER /opt/kafka/bin/kafka-configs.sh \
  --bootstrap-server $BOOTSTRAP --describe \
  --entity-type users
```

## Production Notes

- Change all default passwords in `scripts/init-security.sh` before deploying
- For TLS encryption, add SSL keystore/truststore volumes and update listener protocol to `SASL_SSL`
- Store credentials in a secrets manager (Vault, AWS Secrets Manager) rather than in scripts
- Rotate SCRAM credentials periodically using `kafka-configs.sh --alter`
