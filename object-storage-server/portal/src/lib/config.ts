export const config = {
  minio: {
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000', 10),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ROOT_USER || '',
    secretKey: process.env.MINIO_ROOT_PASSWORD || '',
  },
  services: {
    minioConsole: process.env.MINIO_CONSOLE_URL_EXTERNAL || 'http://localhost:9001',
    grafana: process.env.GRAFANA_URL_EXTERNAL || 'http://localhost:3005',
    prometheus: process.env.PROMETHEUS_URL_EXTERNAL || 'http://localhost:9097',
    alertmanager: process.env.ALERTMANAGER_URL_EXTERNAL || 'http://localhost:9098',
  },
  internal: {
    minioConsole: process.env.MINIO_CONSOLE_URL || 'http://localhost:9001',
    grafana: process.env.GRAFANA_URL || 'http://localhost:3005',
    prometheus: process.env.PROMETHEUS_URL || 'http://localhost:9097',
    alertmanager: process.env.ALERTMANAGER_URL || 'http://localhost:9098',
  },
  apps: [
    { id: 'document-svc', name: 'Document Service', color: 'blue', description: 'Document management & versioning', quota: '10 GiB' },
    { id: 'media-svc', name: 'Media Service', color: 'purple', description: 'Images, videos & thumbnails', quota: '50 GiB' },
    { id: 'hr-portal', name: 'HR Portal', color: 'green', description: 'Resumes, ID proofs & HR documents', quota: '5 GiB' },
    { id: 'analytics-svc', name: 'Analytics Service', color: 'orange', description: 'Reports & data exports', quota: '20 GiB' },
    { id: 'shared', name: 'Shared Storage', color: 'gray', description: 'Cross-app shared assets (read-only)', quota: '10 GiB' },
  ],
};
