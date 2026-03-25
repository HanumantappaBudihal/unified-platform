#!/bin/bash
echo "=== Health Aggregation Server Status ==="
docker compose ps
echo ""
curl -s http://localhost:3009/api/health 2>/dev/null | head -c 200 || echo "Health Portal not running"
