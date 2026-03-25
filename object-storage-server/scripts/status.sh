#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo "============================================"
echo "  Object Storage Server Status"
echo "============================================"
docker compose --profile full ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
