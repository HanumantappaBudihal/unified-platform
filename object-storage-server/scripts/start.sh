#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

PROFILE="${1:-default}"

echo "============================================"
echo "  Starting Object Storage Server"
echo "  Profile: $PROFILE"
echo "============================================"

case "$PROFILE" in
  monitoring)
    docker compose --profile monitoring up -d
    ;;
  portal)
    docker compose --profile portal up -d
    ;;
  full)
    docker compose --profile full up -d
    ;;
  *)
    docker compose up -d
    ;;
esac

echo ""
echo "  Waiting for MinIO cluster to be healthy..."
sleep 10

echo ""
echo "============================================"
echo "  Services Running:"
echo "  ─────────────────────────────────────────"
echo "  S3 API:        http://localhost:9000"
echo "  MinIO Console: http://localhost:9001"

if [ "$PROFILE" = "monitoring" ] || [ "$PROFILE" = "full" ]; then
echo "  Grafana:       http://localhost:3005"
echo "  Prometheus:    http://localhost:9097"
echo "  Alertmanager:  http://localhost:9098"
fi

if [ "$PROFILE" = "portal" ] || [ "$PROFILE" = "full" ]; then
echo "  Portal:        http://localhost:3004"
fi

echo "============================================"
