#!/bin/bash
echo "=== Centralized Logging Server Status ==="
docker compose ps
echo ""
echo "=== Loki Health ==="
curl -s http://localhost:3100/ready 2>/dev/null || echo "Loki is not running"
echo ""
echo "=== Grafana Health ==="
curl -s http://localhost:3008/api/health 2>/dev/null || echo "Grafana is not running"
