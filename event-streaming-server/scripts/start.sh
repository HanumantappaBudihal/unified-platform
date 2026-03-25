#!/bin/bash
# ============================================
# Kafka Central Server - Startup Script
# ============================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo "=========================================="
echo "  Kafka Central Server - Starting"
echo "=========================================="

# Parse arguments - multiple flags supported
PROFILE=""
for arg in "$@"; do
  case "$arg" in
    --full)
      PROFILE="--profile connect --profile monitoring --profile portal"
      echo "Mode: Full (Kafka + Connect + Monitoring + Portal)"
      ;;
    --connect)
      PROFILE="$PROFILE --profile connect"
      echo "  + Kafka Connect"
      ;;
    --monitoring)
      PROFILE="$PROFILE --profile monitoring"
      echo "  + Monitoring (Prometheus + Grafana + Kafka Exporter + Alertmanager)"
      ;;
    --portal)
      PROFILE="$PROFILE --profile portal"
      echo "  + Management Portal (Next.js)"
      ;;
    --secure)
      PROFILE="$PROFILE --profile secure"
      echo "  + Secure Broker (SASL/SCRAM)"
      ;;
    *)
      echo "Unknown option: $arg"
      echo "Usage: start.sh [--full] [--connect] [--monitoring] [--portal] [--secure]"
      exit 1
      ;;
  esac
done

if [ -z "$PROFILE" ]; then
  echo "Mode: Core (Kafka + Schema Registry + REST Proxy + UI)"
fi

echo ""
echo "Starting services..."
docker compose $PROFILE up -d

echo ""
echo "=========================================="
echo "  Services Starting..."
echo "=========================================="
echo ""
echo "  Kafka Broker   : localhost:9092"
echo "  Schema Registry: http://localhost:8081"
echo "  REST Proxy     : http://localhost:8082"
echo "  Kafka UI       : http://localhost:8080  (login: admin / admin123)"

if [[ "$PROFILE" == *"connect"* ]]; then
  echo "  Kafka Connect  : http://localhost:8083"
fi

if [[ "$PROFILE" == *"monitoring"* ]]; then
  echo "  Kafka Exporter : http://localhost:9308/metrics"
  echo "  Prometheus     : http://localhost:9090"
  echo "  Alertmanager   : http://localhost:9094"
  echo "  Grafana        : http://localhost:3000  (login: admin / admin123)"
fi

if [[ "$PROFILE" == *"portal"* ]]; then
  echo "  Kafka Portal   : http://localhost:3001"
fi

if [[ "$PROFILE" == *"secure"* ]]; then
  echo "  Secure Broker  : localhost:9095 (SASL_PLAINTEXT)"
  echo ""
  echo "  Run 'bash scripts/init-security.sh' to create users & ACLs"
fi

echo ""
echo "=========================================="
echo ""
echo "Next steps:"
echo "  1. Initialize topics:  bash scripts/init-topics.sh"
echo "  2. Health check:       bash scripts/health-check.sh"
echo "  3. Open Kafka UI:      http://localhost:8080"
echo ""
echo "Waiting for services to be healthy..."
docker compose $PROFILE ps
