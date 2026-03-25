#!/bin/bash
echo "Checking Health Aggregation services..."
echo ""
for svc in "Uptime Kuma|http://localhost:3010" "Health Portal|http://localhost:3009/api/health"; do
  name="${svc%%|*}"
  url="${svc##*|}"
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$url" 2>/dev/null)
  if [ "$code" = "200" ] || [ "$code" = "204" ] || [ "$code" = "301" ]; then
    echo "  OK $name is healthy"
  else
    echo "  FAIL $name is unhealthy (HTTP $code)"
  fi
done
