#!/bin/bash
# ─────────────────────────────────────────────
# Kong Route Setup Script
# Configures all services, routes, and plugins via Admin API
# ─────────────────────────────────────────────

KONG_ADMIN="${KONG_ADMIN_URL:-http://localhost:8001}"

echo "═══════════════════════════════════════"
echo " Kong API Gateway — Route Setup"
echo "═══════════════════════════════════════"
echo ""
echo "Admin API: $KONG_ADMIN"
echo ""

# Wait for Kong to be ready
echo "⏳ Waiting for Kong..."
until curl -sf "$KONG_ADMIN/status" > /dev/null 2>&1; do
  sleep 2
done
echo "Kong is ready."
echo ""

# ─── Helper Functions ───
create_service() {
  local name=$1 url=$2 tags=$3
  echo "  Creating service: $name → $url"
  curl -sf -X PUT "$KONG_ADMIN/services/$name" \
    -d "url=$url" \
    -d "tags[]=$tags" > /dev/null
}

create_route() {
  local service=$1 name=$2 path=$3 strip=${4:-true}
  echo "  Creating route:   $name ($path)"
  curl -sf -X PUT "$KONG_ADMIN/services/$service/routes/$name" \
    -d "paths[]=$path" \
    -d "strip_path=$strip" > /dev/null
}

enable_plugin() {
  local scope=$1 name=$2 shift 2
  echo "  Enabling plugin:  $name on $scope"
  curl -sf -X POST "$KONG_ADMIN/$scope/plugins" \
    -H "Content-Type: application/json" \
    -d "$3" > /dev/null 2>&1
}

# ─── Infrastructure Portals ───
echo "── Infrastructure Portals ──"
create_service "gateway-portal" "http://host.docker.internal:3006" "portal"
create_route "gateway-portal" "gateway-portal-route" "/portal/gateway"

create_service "kafka-portal" "http://host.docker.internal:3001" "portal"
create_route "kafka-portal" "kafka-portal-route" "/portal/kafka"

create_service "cache-portal" "http://host.docker.internal:3002" "portal"
create_route "cache-portal" "cache-portal-route" "/portal/cache"

create_service "storage-portal" "http://host.docker.internal:3004" "portal"
create_route "storage-portal" "storage-portal-route" "/portal/storage"

create_service "authz-portal" "http://host.docker.internal:3008" "portal"
create_route "authz-portal" "authz-portal-route" "/portal/authz"

echo ""

# ─── Grafana Dashboards ───
echo "── Grafana Dashboards ──"
create_service "grafana-kafka" "http://host.docker.internal:3000" "grafana"
create_route "grafana-kafka" "grafana-kafka-route" "/grafana/kafka"

create_service "grafana-cache" "http://host.docker.internal:3003" "grafana"
create_route "grafana-cache" "grafana-cache-route" "/grafana/cache"

create_service "grafana-storage" "http://host.docker.internal:3005" "grafana"
create_route "grafana-storage" "grafana-storage-route" "/grafana/storage"

echo ""

# ─── Core APIs ───
echo "── Core Infrastructure APIs ──"
create_service "keycloak" "http://host.docker.internal:8080" "auth"
create_route "keycloak" "keycloak-route" "/auth" false

create_service "opa" "http://host.docker.internal:8181" "authz"
create_route "opa" "opa-route" "/authz"

create_service "minio-s3" "http://host.docker.internal:9000" "storage"
create_route "minio-s3" "minio-s3-route" "/s3"

create_service "schema-registry" "http://host.docker.internal:8081" "kafka"
create_route "schema-registry" "schema-registry-route" "/schema-registry"

create_service "kafka-rest" "http://host.docker.internal:8082" "kafka"
create_route "kafka-rest" "kafka-rest-route" "/kafka"

echo ""

# ─── Global Plugins ───
echo "── Global Plugins ──"

echo "  Enabling: prometheus"
curl -sf -X POST "$KONG_ADMIN/plugins" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "prometheus",
    "config": {
      "per_consumer": true,
      "status_code_metrics": true,
      "latency_metrics": true,
      "bandwidth_metrics": true,
      "upstream_health_metrics": true
    }
  }' > /dev/null 2>&1

echo "  Enabling: correlation-id"
curl -sf -X POST "$KONG_ADMIN/plugins" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "correlation-id",
    "config": {
      "header_name": "X-Request-ID",
      "generator": "uuid#counter",
      "echo_downstream": true
    }
  }' > /dev/null 2>&1

echo "  Enabling: rate-limiting (global)"
curl -sf -X POST "$KONG_ADMIN/plugins" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "rate-limiting",
    "config": {
      "minute": 300,
      "hour": 10000,
      "policy": "local",
      "fault_tolerant": true,
      "hide_client_headers": false,
      "error_code": 429,
      "error_message": "Rate limit exceeded. Please slow down."
    }
  }' > /dev/null 2>&1

echo "  Enabling: request-size-limiting"
curl -sf -X POST "$KONG_ADMIN/plugins" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "request-size-limiting",
    "config": {
      "allowed_payload_size": 10,
      "size_unit": "megabytes"
    }
  }' > /dev/null 2>&1

echo "  Enabling: bot-detection"
curl -sf -X POST "$KONG_ADMIN/plugins" \
  -H "Content-Type: application/json" \
  -d '{"name": "bot-detection"}' > /dev/null 2>&1

echo ""

# ─── Per-Route Rate Limits ───
echo "── Per-Route Rate Limits ──"

# S3 API gets higher rate limit
echo "  S3 API: 1000 req/min"
S3_SERVICE_ID=$(curl -sf "$KONG_ADMIN/services/minio-s3" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -n "$S3_SERVICE_ID" ]; then
  curl -sf -X POST "$KONG_ADMIN/services/minio-s3/plugins" \
    -H "Content-Type: application/json" \
    -d '{
      "name": "rate-limiting",
      "config": {
        "minute": 1000,
        "policy": "local"
      }
    }' > /dev/null 2>&1
fi

# OPA gets tighter rate limit
echo "  OPA API: 100 req/min"
curl -sf -X POST "$KONG_ADMIN/services/opa/plugins" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "rate-limiting",
    "config": {
      "minute": 100,
      "policy": "local"
    }
  }' > /dev/null 2>&1

echo ""

# ─── JWT Plugin for Portal Auth (Keycloak) ───
echo "── Keycloak JWT Authentication ──"
echo "  To enable JWT validation on portals, run:"
echo ""
echo "  # Get Keycloak JWKS endpoint"
echo "  JWKS_URI=http://host.docker.internal:8080/realms/infrastructure/protocol/openid-connect/certs"
echo ""
echo "  # Enable OpenID Connect plugin per service:"
echo "  curl -X POST $KONG_ADMIN/services/gateway-portal/plugins \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{"
echo "      \"name\": \"openid-connect\","
echo "      \"config\": {"
echo "        \"issuer\": \"http://host.docker.internal:8080/realms/infrastructure\","
echo "        \"client_id\": [\"gateway-portal\"],"
echo "        \"auth_methods\": [\"bearer\"]"
echo "      }"
echo "    }'"
echo ""

# ─── Summary ───
echo "═══════════════════════════════════════"
echo " Setup Complete"
echo "═══════════════════════════════════════"
echo ""
echo " Proxy:     https://localhost:8443"
echo " Admin API: http://localhost:8001"
echo " Konga UI:  http://localhost:1337"
echo ""
echo " Routes:"
echo "   /portal/gateway   → Gateway Portal (:3006)"
echo "   /portal/kafka     → Kafka Portal (:3001)"
echo "   /portal/cache     → Cache Portal (:3002)"
echo "   /portal/storage   → Storage Portal (:3004)"
echo "   /portal/authz     → AuthZ Portal (:3008)"
echo "   /grafana/kafka    → Grafana Kafka (:3000)"
echo "   /grafana/cache    → Grafana Cache (:3003)"
echo "   /grafana/storage  → Grafana Storage (:3005)"
echo "   /auth/*           → Keycloak (:8080)"
echo "   /authz/*          → OPA (:8181)"
echo "   /s3/*             → MinIO S3 (:9000)"
echo "   /schema-registry  → Schema Registry (:8081)"
echo "   /kafka/*          → Kafka REST (:8082)"
echo ""
echo " Global Plugins: prometheus, correlation-id, rate-limiting, request-size-limiting, bot-detection"
echo ""
