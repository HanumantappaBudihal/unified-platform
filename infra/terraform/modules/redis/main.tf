variable "environment" { type = string }
variable "image" { default = "redis:7.4-alpine" }
variable "network_name" { type = string }
variable "external_port" { default = 6379 }
variable "memory_limit" { default = "512m" }
variable "cpu_limit" { default = "0.5" }

resource "docker_volume" "data" {
  name = "redis-data-${var.environment}"
}

resource "docker_container" "redis" {
  name  = "redis-${var.environment}"
  image = var.image

  ports {
    internal = 6379
    external = var.external_port
  }

  volumes {
    volume_name    = docker_volume.data.name
    container_path = "/data"
  }

  networks_advanced {
    name = var.network_name
  }

  restart = "unless-stopped"
}

output "endpoint" {
  value = "localhost:${var.external_port}"
}
