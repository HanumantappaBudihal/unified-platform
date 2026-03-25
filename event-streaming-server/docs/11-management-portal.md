# 11 - Management Portal

## Overview

The Kafka Management Portal is a custom Next.js web application that provides a unified interface for managing the centralized Kafka server. It runs on **http://localhost:3001**.

## Start the Portal

### Via Docker (with the stack)

```bash
bash scripts/start.sh --portal

# Or with everything
bash scripts/start.sh --full
```

### Local Development

```bash
cd portal
npm install
npm run dev
```

Open [http://localhost:3001](http://localhost:3001)

## Pages

### Dashboard (`/`)

- **Cluster health** — real-time status of all services (auto-refreshes every 15s)
- **Stats** — broker count, topic count, DLQ count
- **Service health cards** — each service with status badge and latency
- **Quick links** — direct links to Kafka UI, Grafana, Prometheus, Alertmanager

### Topics (`/topics`)

- **Topic list** — all topics with partition count, replication, and type (App/DLQ)
- **Filter** — search topics by name, toggle DLQ visibility
- **Create topic form** — validates naming convention (`domain.app.event`), generates CLI command
- **Direct links** — open any topic in Kafka UI for advanced management

### Messages (`/messages`)

- **Produce panel** — select topic, set key/value, send messages via REST Proxy
- **Consume panel** — select topic, fetch latest messages with partition/offset metadata
- **JSON pretty-print** — message values displayed with syntax formatting

### Teams (`/teams`)

- **Team overview** — color-coded cards for each team domain
- **Team detail** (`/teams/[teamId]`) — filtered view of team's topics and DLQs
- **Connection info** — per-team Kafka connection details
- **Onboarding checklist** — steps to add a new team

## Architecture

```
Browser → Next.js Portal (:3001)
               │
               ├── /api/health     → checks all services
               ├── /api/topics     → REST Proxy (:8082) /topics
               ├── /api/produce    → REST Proxy (:8082) POST /topics/{name}
               ├── /api/consume    → REST Proxy (:8082) consumer lifecycle
               └── /api/brokers    → REST Proxy (:8082) /brokers
```

The portal uses Next.js API routes as a backend-for-frontend (BFF) layer that proxies requests to the Kafka REST Proxy. This:
- Avoids CORS issues from the browser
- Adds validation (topic naming conventions)
- Aggregates multiple service health checks into one call

## Configuration

All service URLs are configurable via environment variables:

| Variable | Default | Purpose |
| -------- | ------- | ------- |
| `KAFKA_REST_PROXY_URL` | `http://localhost:8082` | REST Proxy endpoint |
| `SCHEMA_REGISTRY_URL` | `http://localhost:8081` | Schema Registry endpoint |
| `KAFKA_UI_URL` | `http://localhost:8080` | Kafka UI link |
| `GRAFANA_URL` | `http://localhost:3000` | Grafana link |
| `PROMETHEUS_URL` | `http://localhost:9090` | Prometheus link |
| `ALERTMANAGER_URL` | `http://localhost:9094` | Alertmanager link |

## Adding a New Team

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

## Tech Stack

- **Next.js 14** — App Router with TypeScript
- **Tailwind CSS** — Styling
- **REST Proxy API** — All Kafka operations go through the Confluent REST Proxy
- **Docker** — Standalone output for minimal container image
