environment = "dev"
docker_host = "unix:///var/run/docker.sock"

# Dev: lighter resources
kafka_memory_limit    = "1g"
redis_memory_limit    = "256m"
minio_memory_limit    = "512m"
postgres_memory_limit = "512m"

kafka_cpu_limit   = "0.5"
redis_cpu_limit   = "0.25"
minio_cpu_limit   = "0.5"
postgres_cpu_limit = "0.5"

# Default ports for dev
kafka_external_port    = 9092
redis_external_port    = 6379
minio_api_port         = 9000
minio_console_port     = 9001
postgres_external_port = 5432
