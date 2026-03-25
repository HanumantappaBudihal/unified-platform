# Backup & Disaster Recovery Guide

## Overview

The backup server provides automated and on-demand backups for the three data servers:

| Service | What's Backed Up | Frequency | Retention |
|---------|-----------------|-----------|-----------|
| **Redis** (cache-server) | RDB snapshots from all 6 cluster nodes | Every 6 hours | 7 days |
| **MinIO** (object-storage-server) | All buckets via `mc mirror` | Daily at 2 AM | 30 days |
| **Kafka** (event-streaming-server) | Topic list, configs, consumer group offsets | Daily at 3 AM | 30 days |

## Quick Start

```bash
# 1. Configure credentials
cp .env.example .env
# Edit .env with actual passwords

# 2. Make sure the data servers are running first
# (their networks must exist: cache-network, storage-net, kafka-network)

# 3. Start the backup runner
docker compose up -d
```

## Backup Storage Layout

```
backups/
├── redis/
│   └── 20260319_060000/
│       ├── redis-node-1.rdb
│       ├── redis-node-2.rdb
│       └── ...
├── minio/
│   └── 20260319_020000/
│       ├── bucket-a/
│       └── bucket-b/
├── kafka/
│   └── 20260319_030000/
│       ├── topics.txt
│       ├── topic-configs.txt
│       ├── consumer-groups.txt
│       └── offsets/
└── logs/
```

## Manual Backup

```bash
# Run all backups at once
docker exec backup-runner bash /backup/scripts/backup-all.sh

# Individual backups
docker exec backup-runner bash /backup/scripts/backup-redis.sh
docker exec backup-runner bash /backup/scripts/backup-minio.sh
docker exec backup-runner bash /backup/scripts/backup-kafka.sh
```

## Restore Procedures

### Restore Redis

```bash
# List available backups
ls backups/redis/

# Restore from a specific snapshot
docker exec -it backup-runner bash /backup/scripts/restore-redis.sh 20260319_060000
```

The restore script will guide you through stopping nodes, copying RDB files, and restarting.

### Restore MinIO

```bash
# List available backups
ls backups/minio/

# Restore from a specific snapshot
docker exec -it backup-runner bash /backup/scripts/restore-minio.sh 20260319_020000
```

This uses `mc mirror` to sync backup files back to MinIO buckets.

### Restore Kafka

Kafka metadata backups are informational — use them to recreate topics and reset offsets manually:

```bash
# Recreate a topic
kafka-topics.sh --bootstrap-server kafka-central:9092 \
  --create --topic <name> --partitions <n> --replication-factor 1

# Reset consumer group offsets
kafka-consumer-groups.sh --bootstrap-server kafka-central:9092 \
  --group <group> --reset-offsets --to-offset <n> --topic <topic> --execute
```

## Monitoring

Check cron logs inside the container:

```bash
docker exec backup-runner cat /backup/data/logs/cron-redis.log
docker exec backup-runner cat /backup/data/logs/cron-minio.log
docker exec backup-runner cat /backup/data/logs/cron-kafka.log
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `REDIS_ADMIN_PASSWORD` | Redis cluster admin password | (required) |
| `MINIO_ROOT_USER` | MinIO root username | (required) |
| `MINIO_ROOT_PASSWORD` | MinIO root password | (required) |
| `BACKUP_DIR` | Backup storage path inside container | `/backup/data` |
| `BACKUP_RETENTION_DAYS_REDIS` | Days to keep Redis backups | 7 |
| `BACKUP_RETENTION_DAYS_MINIO` | Days to keep MinIO backups | 30 |
| `BACKUP_RETENTION_DAYS_KAFKA` | Days to keep Kafka backups | 30 |
