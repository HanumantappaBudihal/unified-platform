#!/bin/bash
echo "Checking Centralized Logging health..."
echo ""
check_service() {
    local name=$1
    local url=$2
    local code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$url" 2>/dev/null)
    if [ "$code" = "200" ] || [ "$code" = "204" ]; then
        echo "  OK $name is healthy"
    else
        echo "  FAIL $name is unhealthy (HTTP $code)"
    fi
}
check_service "Loki" "http://localhost:3100/ready"
check_service "Grafana" "http://localhost:3008/api/health"
check_service "Logging Portal" "http://localhost:3007/api/health"
check_service "Promtail" "http://localhost:9080/ready"
