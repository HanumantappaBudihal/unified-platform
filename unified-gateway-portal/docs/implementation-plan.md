# Unified Gateway Portal — Implementation Plan

## Overview

A single gateway portal that aggregates all three centralized infrastructure servers into one unified interface.

- **URL**: http://localhost:3006
- **Tech Stack**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Principle**: Proxies to existing portal APIs — zero duplication of backend logic

## Architecture

```
┌──────────────────────────────────────────────────┐
│           Infrastructure Gateway :3006            │
│                                                   │
│  ┌─────────────┐  ┌──────────┐  ┌────────────┐  │
│  │ Kafka APIs  │  │Redis APIs│  │ MinIO APIs │  │
│  │ :3001/api/* │  │:3002/api*│  │:3004/api/* │  │
│  └─────────────┘  └──────────┘  └────────────┘  │
│                                                   │
│  Does NOT duplicate logic — proxies to existing   │
│  portal APIs and aggregates responses             │
└──────────────────────────────────────────────────┘
```

The gateway does NOT connect to Kafka/Redis/MinIO directly. It calls the existing portal APIs and aggregates results. Each individual portal continues to work standalone.

## Existing Server Inventory

### Event Streaming Server (Kafka)

| Service | Port |
|---|---|
| Kafka Portal | 3001 |
| Kafka Broker | 9092 (internal), 19092 (external) |
| Schema Registry | 8081 |
| REST Proxy | 8082 |
| Kafka UI | 8080 |
| Kafka Connect | 8083 (profile: connect) |
| Prometheus | 9090 |
| Grafana | 3000 |
| Alertmanager | 9094 |

**Portal Pages**: Dashboard, Topics, Messages, Teams, Teams/[teamId]
**API Routes**: /api/health, /api/topics, /api/topics/[name], /api/brokers, /api/produce, /api/consume, /api/proxy
**Theme**: Indigo-600 accent, light sidebar

### Cache Server (Redis)

| Service | Port |
|---|---|
| Cache Portal | 3002 |
| Redis Nodes 1-6 | 6371-6376 |
| Redis Insight | 5540 |
| Prometheus | 9091 |
| Grafana | 3003 |
| Alertmanager | 9095 |

**Portal Pages**: Dashboard, Keys, Apps, Pub/Sub
**API Routes**: /api/health, /api/cluster, /api/keys, /api/apps, /api/pubsub, /api/stats, /api/proxy
**Theme**: Red-500 accent, light sidebar

### Object Storage Server (MinIO)

| Service | Port |
|---|---|
| Storage Portal | 3004 |
| MinIO S3 API (Nginx) | 9000 |
| MinIO Console (Nginx) | 9001 |
| MinIO Nodes 1-4 | 9010-9013 |
| Prometheus | 9097 |
| Grafana | 3005 |
| Alertmanager | 9098 |

**Portal Pages**: Dashboard, Browse, Browse/[bucket], Apps, Presign
**API Routes**: /api/health, /api/buckets, /api/objects, /api/upload, /api/presign, /api/stats, /api/proxy
**Theme**: Emerald-400 accent, dark sidebar (gray-900)

## Page Structure

```
/                           → Unified Dashboard (all 3 servers at a glance)
/event-streaming            → Kafka overview (proxied from :3001)
/event-streaming/topics     → Topics page (embed :3001/topics)
/event-streaming/messages   → Messages page (embed :3001/messages)
/event-streaming/teams      → Teams page (embed :3001/teams)
/event-streaming/kafka-ui   → Kafka UI (embed :8080)
/cache                      → Redis overview (proxied from :3002)
/cache/keys                 → Keys page (embed :3002/keys)
/cache/apps                 → Apps page (embed :3002/apps)
/cache/pubsub               → Pub/Sub page (embed :3002/pubsub)
/cache/redis-insight        → Redis Insight (embed :5540)
/storage                    → MinIO overview (proxied from :3004)
/storage/browse             → File browser (embed :3004/browse)
/storage/apps               → Apps page (embed :3004/apps)
/storage/presign            → Share links (embed :3004/presign)
/storage/console            → MinIO Console (embed :9001)
/monitoring                 → Unified Grafana (embed with all 3 datasources)
/settings                   → Port map, credentials reference, server configs
```

## API Routes

```
GET /api/health             → Aggregates health from all 3 portals
                              Calls: :3001/api/health, :3002/api/health, :3004/api/health

GET /api/overview           → Combined stats from all servers
                              Calls: :3001/api/topics + :3001/api/brokers
                                     :3002/api/stats + :3002/api/cluster
                                     :3004/api/stats + :3004/api/buckets

GET /api/proxy?service=X    → Proxy to any sub-portal or tool
                              Services: kafka-portal, cache-portal, storage-portal,
                                        kafka-ui, redis-insight, minio-console,
                                        grafana-kafka, grafana-cache, grafana-storage
```

## Dashboard Design

```
┌─────────────────────────────────────────────────────────┐
│  Infrastructure Gateway                                  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────────┐ ┌────────────────┐ ┌─────────────┐│
│  │ Event Streaming  │ │  Cache Server  │ │   Storage   ││
│  │    (Kafka)       │ │    (Redis)     │ │   (MinIO)   ││
│  │                  │ │                │ │             ││
│  │  ● Healthy       │ │  ● Healthy     │ │  ● Healthy  ││
│  │  12 Topics       │ │  3 Masters     │ │  5 Buckets  ││
│  │  5 Teams         │ │  6 Nodes       │ │  11 Objects ││
│  │  1.2K msg/sec    │ │  850 ops/sec   │ │  1.5 KB     ││
│  │                  │ │                │ │             ││
│  │  [Open Portal →] │ │ [Open Portal →]│ │[Open Portal]││
│  └─────────────────┘ └────────────────┘ └─────────────┘│
│                                                          │
│  Quick Actions                                           │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐│
│  │ Kafka UI     │ │ Redis Insight│ │ MinIO Console    ││
│  │ :8080        │ │ :5540        │ │ :9001            ││
│  └──────────────┘ └──────────────┘ └──────────────────┘│
│                                                          │
│  Service Map                                             │
│  ┌─────────────────────────────────────────────────────┐│
│  │  Port  │ Service              │ Status              ││
│  │  9092  │ Kafka Broker         │ ● Running           ││
│  │  6371  │ Redis Node 1         │ ● Running           ││
│  │  9000  │ MinIO S3 API         │ ● Running           ││
│  │  ...   │ (all 30+ services)   │                     ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

## Sidebar Navigation

```
┌──────────────────────┐
│ ⬡ Infra Gateway      │  ← Neutral blue/slate theme
│   All Servers         │
├──────────────────────┤
│                      │
│ ◉ Dashboard          │  ← Aggregated view
│                      │
│ EVENT STREAMING       │  ← Indigo accent (matches Kafka portal)
│   Overview           │
│   Topics             │
│   Messages           │
│   Teams              │
│   Kafka UI           │
│                      │
│ CACHE                │  ← Red accent (matches Redis portal)
│   Overview           │
│   Keys               │
│   Applications       │
│   Pub/Sub            │
│   Redis Insight      │
│                      │
│ STORAGE              │  ← Emerald accent (matches MinIO portal)
│   Overview           │
│   File Browser       │
│   Applications       │
│   Share Links        │
│   MinIO Console      │
│                      │
│ TOOLS                │
│   Monitoring         │
│   Settings           │
│                      │
├──────────────────────┤
│ 3/3 Servers Healthy  │
└──────────────────────┘
```

## Implementation Phases

### Phase 1 — Project Setup + Layout + Dashboard
**Files:**
- `package.json`, `tsconfig.json`, `next.config.mjs`, `tailwind.config.ts`, `postcss.config.mjs`
- `src/lib/config.ts` — all portal URLs and service endpoints
- `src/components/Sidebar.tsx` — unified sidebar with section grouping
- `src/app/layout.tsx` — root layout with sidebar
- `src/app/globals.css` — Tailwind base styles
- `src/app/page.tsx` — unified dashboard with 3 server cards + service map

### Phase 2 — API Routes
**Files:**
- `src/app/api/health/route.ts` — aggregated health check
  - Calls GET on :3001/api/health, :3002/api/health, :3004/api/health in parallel
  - Returns `{ kafka: { status, ... }, redis: { status, ... }, minio: { status, ... } }`
  - Gracefully handles offline servers (returns `{ status: 'offline' }`)

- `src/app/api/overview/route.ts` — combined stats
  - Kafka: topic count, broker count, message rate
  - Redis: node count, ops/sec, memory usage, hit ratio
  - MinIO: bucket count, object count, total storage size

- `src/app/api/proxy/route.ts` — proxy to sub-portals and tools

### Phase 3 — Event Streaming Section (Kafka)
**Files:**
- `src/app/event-streaming/page.tsx` — Kafka overview (fetches from :3001/api/health + :3001/api/topics)
- `src/app/event-streaming/topics/page.tsx` — embeds :3001/topics
- `src/app/event-streaming/messages/page.tsx` — embeds :3001/messages
- `src/app/event-streaming/teams/page.tsx` — embeds :3001/teams
- `src/app/event-streaming/kafka-ui/page.tsx` — embeds :8080
- `src/components/EmbedPage.tsx` — reusable iframe embed component

### Phase 4 — Cache Section (Redis)
**Files:**
- `src/app/cache/page.tsx` — Redis overview (fetches from :3002/api/health + :3002/api/stats)
- `src/app/cache/keys/page.tsx` — embeds :3002/keys
- `src/app/cache/apps/page.tsx` — embeds :3002/apps
- `src/app/cache/pubsub/page.tsx` — embeds :3002/pubsub
- `src/app/cache/redis-insight/page.tsx` — embeds :5540

### Phase 5 — Storage Section (MinIO)
**Files:**
- `src/app/storage/page.tsx` — MinIO overview (fetches from :3004/api/health + :3004/api/stats)
- `src/app/storage/browse/page.tsx` — embeds :3004/browse
- `src/app/storage/apps/page.tsx` — embeds :3004/apps
- `src/app/storage/presign/page.tsx` — embeds :3004/presign
- `src/app/storage/console/page.tsx` — embeds :9001

### Phase 6 — Monitoring + Settings
**Files:**
- `src/app/monitoring/page.tsx` — links/embeds for all 3 Grafana instances
- `src/app/settings/page.tsx` — complete port map, credentials reference, quick links

### Phase 7 — Docker
**Files:**
- `portal/Dockerfile` — multi-stage Next.js build (same pattern as other portals)
- `docker-compose.yml` — gateway service on port 3006, connects to all 3 server networks

## Design Principles

### 1. Zero Duplication
The gateway never connects to Kafka/Redis/MinIO directly. It only calls existing portal APIs. This means:
- No `kafkajs`, `ioredis`, or `minio` dependencies
- No duplicate connection logic
- If a portal adds a feature, the gateway gets it automatically via embed

### 2. Graceful Degradation
If a server is offline, the gateway:
- Shows "Offline" status on the dashboard (not an error page)
- Disables navigation links for that server's section
- Other servers continue working normally

### 3. Consistent Theming
- Gateway uses neutral **slate/blue** as its own theme
- Each server section uses its original accent color:
  - Kafka: **Indigo-600**
  - Redis: **Red-500**
  - MinIO: **Emerald-400**
- This helps users instantly know which server they're working with

### 4. Embed-First Approach
Most sub-pages embed the original portal pages via iframe. This means:
- Full functionality without reimplementation
- Portal updates are instantly reflected in the gateway
- Only overview pages have custom UI (to show aggregated stats)

## What This Does NOT Do

- Does NOT duplicate any backend logic (no Kafka/Redis/MinIO client code)
- Does NOT replace individual portals (they still work standalone at their original ports)
- Does NOT require all 3 servers to be running (gracefully shows "offline")
- Does NOT add authentication (that's Priority 2 — Keycloak SSO)
- Does NOT modify any existing portal code

## Port Summary (Complete Infrastructure)

| Port | Service | Server |
|---|---|---|
| 3000 | Grafana | Event Streaming |
| 3001 | Kafka Portal | Event Streaming |
| 3002 | Cache Portal | Cache |
| 3003 | Grafana | Cache |
| 3004 | Storage Portal | Storage |
| 3005 | Grafana | Storage |
| **3006** | **Infrastructure Gateway** | **Gateway (NEW)** |
| 5540 | Redis Insight | Cache |
| 6371-6376 | Redis Nodes | Cache |
| 8080 | Kafka UI | Event Streaming |
| 8081 | Schema Registry | Event Streaming |
| 8082 | REST Proxy | Event Streaming |
| 9000 | MinIO S3 API | Storage |
| 9001 | MinIO Console | Storage |
| 9010-9013 | MinIO Nodes | Storage |
| 9090 | Prometheus | Event Streaming |
| 9091 | Prometheus | Cache |
| 9092 | Kafka Broker | Event Streaming |
| 9094 | Alertmanager | Event Streaming |
| 9095 | Alertmanager | Cache |
| 9097 | Prometheus | Storage |
| 9098 | Alertmanager | Storage |

## Estimated File Count

| Phase | Files | Description |
|---|---|---|
| Phase 1 | 8 | Setup, layout, sidebar, dashboard |
| Phase 2 | 3 | API routes (health, overview, proxy) |
| Phase 3 | 6 | Kafka section + EmbedPage component |
| Phase 4 | 5 | Redis section pages |
| Phase 5 | 5 | MinIO section pages |
| Phase 6 | 2 | Monitoring + Settings |
| Phase 7 | 2 | Dockerfile + docker-compose |
| **Total** | **~31** | |
