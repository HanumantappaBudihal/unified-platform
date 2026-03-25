environment = "prod"
docker_host = "unix:///var/run/docker.sock"

# Production: higher resources, tuned for reliability
kafka_memory_limit  = "4g"
redis_memory_limit  = "2g"
minio_memory_limit  = "2g"
postgres_memory_limit = "4g"

kafka_cpu_limit   = "2.0"
redis_cpu_limit   = "1.0"
minio_cpu_limit   = "2.0"
postgres_cpu_limit = "2.0"

# Port offsets for prod (or use separate hosts)
kafka_external_port    = 29092
redis_external_port    = 26379
minio_api_port         = 29000
minio_console_port     = 29001
postgres_external_port = 25432
