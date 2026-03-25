# Kafka Central Server

Centralized Apache Kafka infrastructure for cross-application messaging, with UI management, monitoring, alerting, and security.

## Quick Start

```bash
# Start core services (Kafka + Schema Registry + REST Proxy + UI)
bash scripts/start.sh

# Initialize topics and DLQs
bash scripts/init-topics.sh

# Start everything (+ Connect + Monitoring + Portal)
bash scripts/start.sh --full
```

## Services

| Service          | URL                          | Purpose                          |
| ---------------- | ---------------------------- | -------------------------------- |
| Kafka Broker     | `localhost:9092`             | Message broker (KRaft mode)      |
| Kafka UI         | http://localhost:8080        | Management dashboard (RBAC)      |
| Schema Registry  | http://localhost:8081        | Schema management (BACKWARD)     |
| REST Proxy       | http://localhost:8082        | HTTP API for Kafka               |
| **Kafka Portal** | **http://localhost:3001**    | **Custom management portal**     |
| Kafka Connect    | http://localhost:8083        | Data connectors                  |
| Kafka Exporter   | http://localhost:9308        | Consumer lag metrics             |
| Prometheus       | http://localhost:9090        | Metrics + alert rules            |
| Alertmanager     | http://localhost:9094        | Alert routing (Slack/Email)      |
| Grafana          | http://localhost:3000        | Dashboards + visual alerting     |

## Documentation

| Doc | Topic |
| --- | ----- |
| [01 - Getting Started](docs/01-getting-started.md) | Setup and first steps |
| [02 - Application Integration](docs/02-application-integration.md) | Connect your apps (Java, Node.js, Python) |
| [03 - Kafka UI Guide](docs/03-kafka-ui-guide.md) | Managing Kafka from the browser |
| [04 - Monitoring Setup](docs/04-monitoring-setup.md) | JMX Exporter + Prometheus + Grafana |
| [05 - Kafka Connect Guide](docs/05-kafka-connect-guide.md) | Data pipelines and connectors |
| [06 - Security Configuration](docs/06-security-configuration.md) | SASL/SCRAM, ACLs, TLS, quotas |
| [07 - REST Proxy Guide](docs/07-rest-proxy-guide.md) | HTTP API — produce/consume via curl |
| [08 - Dead Letter Queue](docs/08-dead-letter-queue.md) | DLQ patterns and implementation |
| [09 - Governance Policies](docs/09-governance-policies.md) | Naming, schemas, RBAC, quotas |
| [10 - Alerting Setup](docs/10-alerting-setup.md) | Prometheus alerts + Slack/Email |
| [11 - Management Portal](docs/11-management-portal.md) | Custom Next.js portal |
| [**12 - Integration Guide**](docs/12-integration-guide.md) | **How to connect your apps** (Node.js, Java, Python, .NET, HTTP) |
| [Architecture](docs/kafka-central-architecture.md) | Full architecture and planning |

## Connecting Your Application

Any application can use this central Kafka server. See the full [Integration Guide](docs/12-integration-guide.md) for code examples in every language.

### Quick Connection Reference

| From | Bootstrap Server | Notes |
|------|-----------------|-------|
| Same machine | `localhost:9092` | Default for local development |
| Other devices (LAN) | `192.168.11.96:19092` | Set `HOST_IP` in `.env` to your IP |
| REST Proxy (HTTP) | `http://localhost:8082` | No Kafka client needed — plain HTTP |

### Node.js (Quick Start)
```bash
npm install kafkajs
```
```javascript
const { Kafka } = require('kafkajs');
const kafka = new Kafka({ clientId: 'my-service', brokers: ['localhost:9092'] });

// Produce
const producer = kafka.producer();
await producer.connect();
await producer.send({
  topic: 'orders.checkout.order-created',
  messages: [{ key: 'ORD-001', value: JSON.stringify({ orderId: 'ORD-001', total: 99.99 }) }],
});

// Consume
const consumer = kafka.consumer({ groupId: 'my-service-group' });
await consumer.connect();
await consumer.subscribe({ topics: ['orders.checkout.order-created'] });
await consumer.run({
  eachMessage: async ({ message }) => {
    console.log(JSON.parse(message.value.toString()));
  },
});
```

### HTTP (Any Language — No Kafka Client Needed)
```bash
curl -X POST http://localhost:8082/topics/orders.checkout.order-created \
  -H "Content-Type: application/vnd.kafka.json.v2+json" \
  -d '{"records": [{"key": "ORD-001", "value": {"orderId": "ORD-001", "total": 99.99}}]}'
```

> Full examples for **Java/Spring Boot**, **Python**, **.NET/C#**, and **REST Proxy** are in the [Integration Guide](docs/12-integration-guide.md).

### Topic Naming Convention
```
<domain>.<application>.<event-type>
```
Examples: `orders.checkout.order-created`, `inventory.warehouse.stock-updated`, `payments.stripe.payment-completed`

Each topic has a corresponding DLQ: `<topic>.dlq`

> Auto-creation is disabled. Request topics via the [Portal](http://localhost:3001/topics), [Kafka UI](http://localhost:8080), or CLI.

## Mock Applications

Two reference apps in `mock-apps/` demonstrate the full event-driven pattern:

| Service | Produces | Consumes |
|---------|----------|----------|
| **Orders Service** | `orders.checkout.order-created/completed/cancelled` | `inventory.warehouse.stock-reserved`, `low-stock-alert` |
| **Inventory Service** | `inventory.warehouse.stock-reserved/updated`, `low-stock-alert` | `orders.checkout.order-created/completed/cancelled` |

```bash
# Start both mock apps
cd mock-apps && docker compose up -d

# View logs
docker logs -f mock-orders-service
docker logs -f mock-inventory-service
```

## Scripts

```bash
bash scripts/start.sh                    # Start core
bash scripts/start.sh --full             # Start all (connect + monitoring + portal)
bash scripts/start.sh --monitoring       # Start core + monitoring
bash scripts/start.sh --connect          # Start core + connectors
bash scripts/start.sh --portal           # Start core + management portal
bash scripts/start.sh --secure           # Start core + secure broker
bash scripts/stop.sh                     # Stop all services
bash scripts/status.sh                   # Service status
bash scripts/health-check.sh             # JSON health endpoint
bash scripts/init-topics.sh              # Create topics + DLQs
bash scripts/init-security.sh            # Create users, ACLs, quotas
bash scripts/create-topic.sh <name> [partitions] [replication]
```

## Key Features

- **Management Portal** — Custom Next.js dashboard: health, topics, messages, teams
- **UI Management** — Kafbat UI with RBAC (admin/editor/developer/viewer/team roles)
- **REST API** — Produce and consume via HTTP (curl, Postman, browser)
- **Schema Governance** — BACKWARD compatibility enforced by default
- **Dead Letter Queues** — Pre-created DLQ topics with 30-day retention
- **Consumer Lag Monitoring** — Kafka Exporter + Grafana dashboards
- **20+ Alert Rules** — Broker down, high lag, DLQ growth, heap usage, GC
- **Topic Governance** — Auto-creation disabled, naming conventions enforced
- **Per-App Security** — SASL/SCRAM auth, ACLs, quotas (secure profile)
- **Health Check** — JSON endpoint for external monitoring / load balancers

---

## Management Portal

Custom Next.js web application at **http://localhost:3001** providing a unified interface for the Kafka server.

### Start the Portal

```bash
# Via Docker (with the stack)
bash scripts/start.sh --portal

# Or with everything
bash scripts/start.sh --full

# Local development
cd portal && npm install && npm run dev
```

### Pages

#### Dashboard (`/`)
- **Cluster health** — real-time status of all services (auto-refreshes every 15s)
- **Stats** — broker count, topic count, DLQ count
- **Service health cards** — each service with status badge and latency
- **Quick links** — direct links to Kafka UI, Grafana, Prometheus, Alertmanager

#### Topics (`/topics`)
- **Topic list** — all topics with partition count, replication, and type (App/DLQ)
- **Filter** — search topics by name, toggle DLQ visibility
- **Create topic form** — validates naming convention (`domain.app.event`), generates CLI command
- **Direct links** — open any topic in Kafka UI for advanced management

#### Messages (`/messages`)
- **Produce panel** — select topic, set key/value, send messages via REST Proxy
- **Consume panel** — select topic, fetch latest messages with partition/offset metadata
- **JSON pretty-print** — message values displayed with syntax formatting

#### Teams (`/teams`)
- **Team overview** — color-coded cards for each team domain (Orders, Inventory, Users, Notifications, Payments)
- **Team detail** (`/teams/[teamId]`) — filtered view of team's topics and DLQs
- **Connection info** — per-team Kafka connection details
- **Onboarding checklist** — steps to add a new team

### Portal Architecture

```
Browser → Next.js Portal (:3001)
               │
               ├── /api/health     → checks all services in parallel
               ├── /api/topics     → REST Proxy (:8082) /topics
               ├── /api/produce    → REST Proxy (:8082) POST /topics/{name}
               ├── /api/consume    → REST Proxy (:8082) consumer lifecycle
               └── /api/brokers    → REST Proxy (:8082) /brokers
```

### Portal Configuration

All service URLs are configurable via environment variables in `.env` or `docker-compose.yml`:

| Variable | Default | Purpose |
| -------- | ------- | ------- |
| `KAFKA_REST_PROXY_URL` | `http://localhost:8082` | REST Proxy endpoint |
| `SCHEMA_REGISTRY_URL` | `http://localhost:8081` | Schema Registry endpoint |
| `KAFKA_UI_URL` | `http://localhost:8080` | Kafka UI link |
| `GRAFANA_URL` | `http://localhost:3000` | Grafana link |
| `PROMETHEUS_URL` | `http://localhost:9090` | Prometheus link |
| `ALERTMANAGER_URL` | `http://localhost:9094` | Alertmanager link |

### Adding a New Team

Edit `portal/src/lib/config.ts`:

```typescript
export const config = {
  teams: [
    // ... existing teams
    { id: 'payments', name: 'Payments Team', prefix: 'payments.', color: 'pink' },
  ],
};
```

Available colors: `blue`, `green`, `purple`, `yellow`, `pink`.

### Portal Tech Stack

- **Next.js 14** — App Router with TypeScript
- **Tailwind CSS** — Dark theme styling
- **REST Proxy API** — All Kafka operations go through the Confluent REST Proxy
- **Docker** — Standalone output for minimal container image
