# Architecture Overview

## Centralized Object Storage Server

A self-hosted, S3-compatible object storage cluster built on MinIO with per-application isolation, erasure coding, and full monitoring.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Docker Network                          │
│                                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ MinIO-1  │ │ MinIO-2  │ │ MinIO-3  │ │ MinIO-4  │       │
│  │ :9010    │ │ :9011    │ │ :9012    │ │ :9013    │       │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘       │
│       └──────┬─────┴──────┬─────┴──────┬─────┘              │
│              │  Erasure Coding (2+2)   │                     │
│              └────────┬────────────────┘                     │
│                       │                                      │
│  ┌────────────────────▼─────────────────────────┐           │
│  │              Nginx Load Balancer              │           │
│  │         S3 API :9000 │ Console :9001          │           │
│  └────────────────────┬─────────────────────────┘           │
│                       │                                      │
│  ┌────────────────────▼─────────────────────────┐           │
│  │           Storage Portal (Next.js)            │           │
│  │                   :3004                        │           │
│  │  • File Browser (drag & drop)                 │           │
│  │  • Bucket Manager                             │           │
│  │  • Presigned URL Generator                    │           │
│  │  • Application Dashboard                      │           │
│  │  • Embedded Tools (Console, Grafana, etc.)    │           │
│  └───────────────────────────────────────────────┘           │
│                                                              │
│  ┌──────────┐  ┌────────────┐  ┌──────────────┐            │
│  │Prometheus│  │  Grafana   │  │ Alertmanager │            │
│  │  :9097   │  │   :3005    │  │    :9098     │            │
│  └──────────┘  └────────────┘  └──────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

## Components

### MinIO Cluster (4 Nodes)
- **Erasure Coding (2+2)**: Data is split across 4 nodes with 2 data + 2 parity blocks
- **Fault Tolerance**: Survives up to 2 node failures without data loss
- **Self-Healing**: Automatically repairs corrupted/missing data when nodes recover

### Nginx Load Balancer
- Distributes S3 API requests across all 4 MinIO nodes using `least_conn` strategy
- Single entry point for all applications (`localhost:9000`)
- Proxies both S3 API and MinIO Console traffic
- Unlimited upload size (`client_max_body_size 0`)
- WebSocket support for Console

### Storage Portal (Next.js 14)
- **Dashboard**: Cluster health, bucket stats, object counts
- **File Browser**: Drag & drop upload, folder navigation, file deletion
- **Share Links**: Presigned URL generator with configurable expiry
- **Applications**: Per-app credentials and integration code samples
- **Embedded Tools**: MinIO Console, Grafana, Prometheus, Alertmanager

### Monitoring Stack
- **Prometheus**: Scrapes MinIO cluster, node, and bucket metrics
- **Grafana**: Pre-configured dashboards for storage health and performance
- **Alertmanager**: Alerts for node down, disk full, high error rate

## Application Isolation Model

Each application gets:

| Layer | Implementation |
|---|---|
| Own bucket | Separate storage namespace |
| Own IAM user | Unique access key + secret key |
| Own policy | S3 IAM policy restricting to own bucket only |
| Own quota | Storage limit per bucket |
| Own lifecycle | Auto-delete temp files, purge old versions |
| Own versioning | Enable/disable per bucket |

### Pre-configured Applications

| App | Bucket | Quota | Versioning | Description |
|---|---|---|---|---|
| document-svc | `document-svc` | 10 GiB | ON | Document management & versioning |
| media-svc | `media-svc` | 50 GiB | ON | Images, videos & thumbnails |
| hr-portal | `hr-portal` | 5 GiB | ON | Resumes, ID proofs & HR docs |
| analytics-svc | `analytics-svc` | 20 GiB | OFF | Reports & data exports |
| shared | `shared` | 10 GiB | OFF | Cross-app read-only assets |

## Port Mapping

| Service | Host Port | Container Port |
|---|---|---|
| S3 API (Nginx) | 9000 | 9000 |
| MinIO Console (Nginx) | 9001 | 9001 |
| MinIO Node 1 | 9010 | 9000 |
| MinIO Node 2 | 9011 | 9000 |
| MinIO Node 3 | 9012 | 9000 |
| MinIO Node 4 | 9013 | 9000 |
| Storage Portal | 3004 | 3000 |
| Grafana | 3005 | 3000 |
| Prometheus | 9097 | 9090 |
| Alertmanager | 9098 | 9093 |

## Docker Compose Profiles

| Profile | Services |
|---|---|
| (default) | MinIO 1-4, Nginx, Init |
| `monitoring` | + Prometheus, Grafana, Alertmanager |
| `portal` | + Storage Portal |
| `full` | All services |

```bash
# Start core only
docker compose up -d

# Start with monitoring
docker compose --profile monitoring up -d

# Start everything
docker compose --profile full up -d
```
