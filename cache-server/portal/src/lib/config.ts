export const config = {
  redis: {
    nodes: (process.env.REDIS_NODES || 'localhost:6371,localhost:6372,localhost:6373')
      .split(',')
      .map((n) => {
        const [host, port] = n.trim().split(':');
        return { host, port: parseInt(port, 10) };
      }),
    password: process.env.REDIS_PASSWORD || '',
    username: process.env.REDIS_USERNAME || '',
  },
  services: {
    redisInsight: process.env.REDIS_INSIGHT_URL_EXTERNAL || 'http://localhost:5540',
    grafana: process.env.GRAFANA_URL_EXTERNAL || 'http://localhost:3003',
    prometheus: process.env.PROMETHEUS_URL_EXTERNAL || 'http://localhost:9091',
    alertmanager: process.env.ALERTMANAGER_URL_EXTERNAL || 'http://localhost:9095',
  },
  internal: {
    redisInsight: process.env.REDIS_INSIGHT_URL || 'http://localhost:5540',
    grafana: process.env.GRAFANA_URL || 'http://localhost:3003',
    prometheus: process.env.PROMETHEUS_URL || 'http://localhost:9091',
    alertmanager: process.env.ALERTMANAGER_URL || 'http://localhost:9095',
  },
  apps: [
    { id: 'session-svc', name: 'Session Service', prefix: 'sessions:', color: 'blue', description: 'User sessions & rate limiting' },
    { id: 'catalog-svc', name: 'Catalog Service', prefix: 'catalog:', color: 'green', description: 'Product cache & invalidation' },
  ],
};
