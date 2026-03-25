environment = "staging"
docker_host = "unix:///var/run/docker.sock"

# Staging: moderate resources, single replicas
kafka_memory_limit  = "1g"
redis_memory_limit  = "512m"
minio_memory_limit  = "1g"
postgres_memory_limit = "1g"

kafka_cpu_limit   = "1.0"
redis_cpu_limit   = "0.5"
minio_cpu_limit   = "1.0"
postgres_cpu_limit = "1.0"

# Port offsets for staging (avoid conflicts with dev)
kafka_external_port    = 19092
redis_external_port    = 16379
minio_api_port         = 19000
minio_console_port     = 19001
postgres_external_port = 15432
