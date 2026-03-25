/**
 * Uptime Kuma Monitor Setup Reference
 * Run: node config/uptime-kuma/setup.js
 * Configure these monitors in Uptime Kuma UI at http://localhost:3010
 */

const monitors = [
  // Event Streaming Server (Kafka)
  { group: 'Event Streaming', name: 'Kafka Broker', type: 'port', host: 'localhost', port: 9092, interval: 30 },
  { group: 'Event Streaming', name: 'Kafka External', type: 'port', host: 'localhost', port: 19092, interval: 30 },
  { group: 'Event Streaming', name: 'Schema Registry', type: 'http', url: 'http://localhost:8081/subjects', interval: 30 },
  { group: 'Event Streaming', name: 'REST Proxy', type: 'http', url: 'http://localhost:8082/topics', interval: 30 },
  { group: 'Event Streaming', name: 'Kafka UI', type: 'http', url: 'http://localhost:8080', interval: 30 },
  { group: 'Event Streaming', name: 'Kafka Connect', type: 'http', url: 'http://localhost:8083/connectors', interval: 60 },
  { group: 'Event Streaming', name: 'Kafka Portal', type: 'http', url: 'http://localhost:3001/api/health', interval: 30 },
  { group: 'Event Streaming', name: 'Kafka Grafana', type: 'http', url: 'http://localhost:3000/api/health', interval: 60 },
  { group: 'Event Streaming', name: 'Kafka Prometheus', type: 'http', url: 'http://localhost:9090/-/healthy', interval: 60 },

  // Cache Server (Redis)
  { group: 'Cache', name: 'Redis Node 1', type: 'port', host: 'localhost', port: 6371, interval: 30 },
  { group: 'Cache', name: 'Redis Node 2', type: 'port', host: 'localhost', port: 6372, interval: 30 },
  { group: 'Cache', name: 'Redis Node 3', type: 'port', host: 'localhost', port: 6373, interval: 30 },
  { group: 'Cache', name: 'Redis Node 4', type: 'port', host: 'localhost', port: 6374, interval: 30 },
  { group: 'Cache', name: 'Redis Node 5', type: 'port', host: 'localhost', port: 6375, interval: 30 },
  { group: 'Cache', name: 'Redis Node 6', type: 'port', host: 'localhost', port: 6376, interval: 30 },
  { group: 'Cache', name: 'Redis Insight', type: 'http', url: 'http://localhost:5540', interval: 30 },
  { group: 'Cache', name: 'Cache Portal', type: 'http', url: 'http://localhost:3002/api/health', interval: 30 },
  { group: 'Cache', name: 'Redis Grafana', type: 'http', url: 'http://localhost:3003/api/health', interval: 60 },
  { group: 'Cache', name: 'Redis Prometheus', type: 'http', url: 'http://localhost:9091/-/healthy', interval: 60 },

  // Object Storage Server (MinIO)
  { group: 'Object Storage', name: 'MinIO S3 API', type: 'http', url: 'http://localhost:9000/minio/health/live', interval: 30 },
  { group: 'Object Storage', name: 'MinIO Console', type: 'http', url: 'http://localhost:9001', interval: 30 },
  { group: 'Object Storage', name: 'Storage Portal', type: 'http', url: 'http://localhost:3004/api/health', interval: 30 },
  { group: 'Object Storage', name: 'MinIO Grafana', type: 'http', url: 'http://localhost:3005/api/health', interval: 60 },
  { group: 'Object Storage', name: 'MinIO Prometheus', type: 'http', url: 'http://localhost:9097/-/healthy', interval: 60 },

  // Unified Gateway
  { group: 'Gateway', name: 'Gateway Portal', type: 'http', url: 'http://localhost:3006/api/health', interval: 30 },

  // Centralized Logging
  { group: 'Logging', name: 'Loki', type: 'http', url: 'http://localhost:3100/ready', interval: 30 },
  { group: 'Logging', name: 'Logging Portal', type: 'http', url: 'http://localhost:3007/api/health', interval: 30 },
  { group: 'Logging', name: 'Logging Grafana', type: 'http', url: 'http://localhost:3008/api/health', interval: 60 },

  // Health Aggregation (self)
  { group: 'Health', name: 'Health Portal', type: 'http', url: 'http://localhost:3009/api/health', interval: 60 },
];

console.log('Uptime Kuma Monitor Configuration');
console.log('=================================\n');

const groups = [...new Set(monitors.map(m => m.group))];
groups.forEach(group => {
  console.log('\n--- ' + group + ' ---');
  monitors.filter(m => m.group === group).forEach(m => {
    const target = m.type === 'http' ? m.url : m.host + ':' + m.port;
    console.log('  ' + m.type.toUpperCase().padEnd(5) + ' ' + m.name.padEnd(25) + ' ' + target);
  });
});

console.log('\nTotal monitors: ' + monitors.length);
console.log('\nConfigure these in Uptime Kuma: http://localhost:3010');
