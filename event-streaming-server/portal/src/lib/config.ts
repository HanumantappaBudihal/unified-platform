// Central configuration for all Kafka service endpoints
// "services" = external URLs (browser-facing, for iframes)
// "internal" = Docker network URLs (server-side health checks)
export const config = {
  kafka: {
    restProxy: process.env.KAFKA_REST_PROXY_URL || 'http://localhost:8082',
    schemaRegistry: process.env.SCHEMA_REGISTRY_URL || 'http://localhost:8081',
  },
  services: {
    kafkaUi: process.env.KAFKA_UI_URL || 'http://localhost:8080',
    grafana: process.env.GRAFANA_URL || 'http://localhost:3000',
    prometheus: process.env.PROMETHEUS_URL || 'http://localhost:9090',
    alertmanager: process.env.ALERTMANAGER_URL || 'http://localhost:9094',
    restProxy: process.env.KAFKA_REST_PROXY_URL || 'http://localhost:8082',
    schemaRegistry: process.env.SCHEMA_REGISTRY_URL || 'http://localhost:8081',
  },
  internal: {
    kafkaUi: process.env.KAFKA_UI_URL_INTERNAL || process.env.KAFKA_UI_URL || 'http://localhost:8080',
    grafana: process.env.GRAFANA_URL_INTERNAL || process.env.GRAFANA_URL || 'http://localhost:3000',
    prometheus: process.env.PROMETHEUS_URL_INTERNAL || process.env.PROMETHEUS_URL || 'http://localhost:9090',
    alertmanager: process.env.ALERTMANAGER_URL_INTERNAL || process.env.ALERTMANAGER_URL || 'http://localhost:9094',
    restProxy: process.env.KAFKA_REST_PROXY_URL || 'http://localhost:8082',
    schemaRegistry: process.env.SCHEMA_REGISTRY_URL || 'http://localhost:8081',
  },
  teams: [
    { id: 'orders', name: 'Orders Team', prefix: 'orders.', color: 'blue' },
    { id: 'inventory', name: 'Inventory Team', prefix: 'inventory.', color: 'green' },
    { id: 'users', name: 'Users Team', prefix: 'users.', color: 'purple' },
    { id: 'notifications', name: 'Notifications Team', prefix: 'notifications.', color: 'yellow' },
    { id: 'payments', name: 'Payments Team', prefix: 'payments.', color: 'pink' },
  ],
} as const;

export type Team = (typeof config.teams)[number];
