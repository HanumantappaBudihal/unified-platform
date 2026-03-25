# Getting Started

## Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for mock apps)
- Git

## Quick Start

### 1. Start the Storage Server

```bash
# Start core services (MinIO cluster + Nginx)
cd centralized-object-storage-server
docker compose up -d

# Or start everything (includes portal, monitoring)
docker compose --profile full up -d
```

### 2. Wait for Initialization

The `minio-init` container automatically:
- Creates 5 application buckets
- Enables versioning on document-svc, media-svc, hr-portal
- Sets storage quotas per bucket
- Creates IAM users with isolated policies
- Configures lifecycle rules

Check init progress:
```bash
docker logs -f minio-init
```

### 3. Access Services

| Service | URL | Credentials |
|---|---|---|
| S3 API | http://localhost:9000 | (use app credentials below) |
| MinIO Console | http://localhost:9001 | admin / admin-secret-key |
| Storage Portal | http://localhost:3004 | (no auth) |
| Grafana | http://localhost:3005 | admin / admin |
| Prometheus | http://localhost:9097 | (no auth) |
| Alertmanager | http://localhost:9098 | (no auth) |

### 4. Application Credentials

Each app has isolated credentials that can ONLY access its own bucket:

| Application | Access Key | Secret Key | Bucket |
|---|---|---|---|
| document-svc | `document-svc-key` | `document-svc-secret` | `document-svc` |
| media-svc | `media-svc-key` | `media-svc-secret` | `media-svc` |
| hr-portal | `hr-portal-key` | `hr-portal-secret` | `hr-portal` |
| analytics-svc | `analytics-svc-key` | `analytics-svc-secret` | `analytics-svc` |

All apps also have **read-only** access to the `shared` bucket.

### 5. Test with Mock Apps

```bash
# Document service demo
cd mock-apps/document-svc
npm install
npm start

# Media service demo
cd mock-apps/media-svc
npm install
npm start
```

## Stopping Services

```bash
# Stop all services
docker compose --profile full down

# Stop and remove data volumes
docker compose --profile full down -v
```

## Checking Status

```bash
# View running services
docker compose --profile full ps

# Check MinIO health
curl http://localhost:9000/minio/health/live

# Check portal health
curl http://localhost:3004/api/health
```

## Adding a New Application

### 1. Using MinIO Console (UI)

1. Go to http://localhost:9001
2. Login as admin / admin-secret-key
3. Create a new bucket
4. Create IAM user + policy (see Integration Guide)

### 2. Using MinIO Client (CLI)

```bash
# Connect mc to the cluster
mc alias set storage http://localhost:9000 admin admin-secret-key

# Create bucket
mc mb storage/my-new-app

# Enable versioning (optional)
mc version enable storage/my-new-app

# Set quota
mc quota set storage/my-new-app --size 10GiB

# Create policy file
cat > /tmp/my-app-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["s3:GetObject","s3:PutObject","s3:DeleteObject","s3:ListBucket","s3:GetBucketLocation"],
    "Resource": ["arn:aws:s3:::my-new-app","arn:aws:s3:::my-new-app/*"]
  }]
}
EOF

# Create policy and user
mc admin policy create storage my-app-policy /tmp/my-app-policy.json
mc admin user add storage my-app-key my-app-secret
mc admin policy attach storage my-app-policy --user my-app-key
```
