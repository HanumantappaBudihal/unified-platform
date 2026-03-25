#!/bin/bash
echo "Starting Health Aggregation Server..."
docker compose up -d
echo ""
echo "Services:"
echo "  Uptime Kuma:    http://localhost:3010"
echo "  Health Portal:  http://localhost:3009"
echo ""
echo "Run: node config/uptime-kuma/setup.js to see monitor config."
