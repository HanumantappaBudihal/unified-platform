variable "environment" { type = string }
variable "image" { default = "apache/kafka:3.9.0" }
variable "network_name" { type = string }
variable "external_port" { default = 9092 }
variable "memory_limit" { default = "1g" }
variable "cpu_limit" { default = "1.0" }

resource "docker_volume" "data" {
  name = "kafka-data-${var.environment}"
}

resource "docker_container" "kafka" {
  name  = "kafka-${var.environment}"
  image = var.image

  memory = parseint(replace(replace(var.memory_limit, "g", "000"), "m", ""), 10) * 1048576
  cpu_shares = parseint(replace(var.cpu_limit, ".", ""), 10) * 100

  ports {
    internal = 9092
    external = var.external_port
  }

  env = [
    "KAFKA_NODE_ID=1",
    "KAFKA_PROCESS_ROLES=broker,controller",
    "KAFKA_CONTROLLER_QUORUM_VOTERS=1@kafka-${var.environment}:9093",
    "CLUSTER_ID=MkU3OEVBNTcwNTJENDM2Qk",
    "KAFKA_LISTENERS=INTERNAL://0.0.0.0:9092,CONTROLLER://0.0.0.0:9093",
    "KAFKA_ADVERTISED_LISTENERS=INTERNAL://kafka-${var.environment}:9092",
    "KAFKA_CONTROLLER_LISTENER_NAMES=CONTROLLER",
    "KAFKA_LISTENER_SECURITY_PROTOCOL_MAP=INTERNAL:PLAINTEXT,CONTROLLER:PLAINTEXT",
    "KAFKA_INTER_BROKER_LISTENER_NAME=INTERNAL",
    "KAFKA_AUTO_CREATE_TOPICS_ENABLE=false",
    "KAFKA_NUM_PARTITIONS=3",
  ]

  volumes {
    volume_name    = docker_volume.data.name
    container_path = "/var/lib/kafka/data"
  }

  networks_advanced {
    name = var.network_name
  }

  restart = "unless-stopped"
}

output "endpoint" {
  value = "localhost:${var.external_port}"
}
