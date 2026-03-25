variable "environment" { type = string }
variable "image" { default = "postgres:16-alpine" }
variable "network_name" { type = string }
variable "external_port" { default = 5432 }
variable "memory_limit" { default = "1g" }
variable "cpu_limit" { default = "1.0" }
variable "db_name" { default = "platform" }
variable "db_user" { default = "postgres" }
variable "db_password" { sensitive = true }

resource "docker_volume" "data" {
  name = "postgres-data-${var.environment}"
}

resource "docker_container" "postgres" {
  name  = "postgres-${var.environment}"
  image = var.image

  ports {
    internal = 5432
    external = var.external_port
  }

  env = [
    "POSTGRES_DB=${var.db_name}",
    "POSTGRES_USER=${var.db_user}",
    "POSTGRES_PASSWORD=${var.db_password}",
  ]

  volumes {
    volume_name    = docker_volume.data.name
    container_path = "/var/lib/postgresql/data"
  }

  networks_advanced {
    name = var.network_name
  }

  restart = "unless-stopped"

  healthcheck {
    test     = ["CMD-SHELL", "pg_isready -U ${var.db_user}"]
    interval = "10s"
    timeout  = "5s"
    retries  = 5
  }
}

output "endpoint" {
  value = "localhost:${var.external_port}"
}
