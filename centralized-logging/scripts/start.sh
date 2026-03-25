#!/bin/bash
echo "Starting Centralized Logging Server..."
docker compose up -d
echo ""
echo "Services:"
echo "  Loki:           http://localhost:3100"
echo "  Promtail:       http://localhost:9080"
echo "  Grafana:        http://localhost:3008"
echo "  Logging Portal: http://localhost:3007"
