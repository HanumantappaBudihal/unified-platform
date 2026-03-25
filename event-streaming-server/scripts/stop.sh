#!/bin/bash
# ============================================
# Kafka Central Server - Stop Script
# ============================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo "Stopping Kafka Central Server..."
docker compose --profile connect --profile monitoring down

echo "All services stopped."
