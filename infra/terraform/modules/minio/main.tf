variable "environment" { type = string }
variable "image" { default = "quay.io/minio/minio:latest" }
variable "network_name" { type = string }
variable "api_port" { default = 9000 }
variable "console_port" { default = 9001 }
variable "memory_limit" { default = "1g" }
variable "cpu_limit" { default = "1.0" }
variable "root_user" { default = "admin" }
variable "root_password" { sensitive = true }

resource "docker_volume" "data" {
  name = "minio-data-${var.environment}"
}

resource "docker_container" "minio" {
  name  = "minio-${var.environment}"
  image = var.image

  command = ["server", "/data", "--console-address", ":9001"]

  ports {
    internal = 9000
    external = var.api_port
  }

  ports {
    internal = 9001
    external = var.console_port
  }

  env = [
    "MINIO_ROOT_USER=${var.root_user}",
    "MINIO_ROOT_PASSWORD=${var.root_password}",
  ]

  volumes {
    volume_name    = docker_volume.data.name
    container_path = "/data"
  }

  networks_advanced {
    name = var.network_name
  }

  restart = "unless-stopped"
}

output "api_endpoint" {
  value = "localhost:${var.api_port}"
}

output "console_endpoint" {
  value = "localhost:${var.console_port}"
}
