# =============================================================
# Infrastructure as Code - Multi-Environment Platform
# =============================================================
#
# Usage:
#   terraform init
#   terraform plan -var-file="env/dev.tfvars"
#   terraform apply -var-file="env/dev.tfvars"
#
#   # Staging:
#   terraform workspace new staging
#   terraform apply -var-file="env/staging.tfvars"
#
#   # Production:
#   terraform workspace new prod
#   terraform apply -var-file="env/prod.tfvars"

terraform {
  required_version = ">= 1.5"
  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 3.0"
    }
  }
}

provider "docker" {
  host = var.docker_host
}

# =============================================================
# Variables
# =============================================================

variable "docker_host" {
  description = "Docker daemon host"
  default     = "unix:///var/run/docker.sock"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  default     = "dev"
}

# ─── Images ───
variable "kafka_image" { default = "apache/kafka:3.9.0" }
variable "redis_image" { default = "redis:7.4-alpine" }
variable "minio_image" { default = "quay.io/minio/minio:latest" }
variable "postgres_image" { default = "postgres:16-alpine" }

# ─── Resource limits ───
variable "kafka_memory_limit" { default = "1g" }
variable "redis_memory_limit" { default = "512m" }
variable "minio_memory_limit" { default = "1g" }
variable "postgres_memory_limit" { default = "1g" }

variable "kafka_cpu_limit" { default = "1.0" }
variable "redis_cpu_limit" { default = "0.5" }
variable "minio_cpu_limit" { default = "1.0" }
variable "postgres_cpu_limit" { default = "1.0" }

# ─── Ports ───
variable "kafka_external_port" { default = 9092 }
variable "redis_external_port" { default = 6379 }
variable "minio_api_port" { default = 9000 }
variable "minio_console_port" { default = 9001 }
variable "postgres_external_port" { default = 5432 }

# ─── Secrets ───
variable "minio_root_password" {
  sensitive = true
  default   = "admin-secret-key"
}

variable "postgres_password" {
  sensitive = true
  default   = "postgres-admin-secret"
}

# =============================================================
# Network
# =============================================================

resource "docker_network" "infra_net" {
  name   = "infra-${var.environment}"
  driver = "bridge"
}

# =============================================================
# Modules
# =============================================================

module "kafka" {
  source        = "./modules/kafka"
  environment   = var.environment
  image         = var.kafka_image
  network_name  = docker_network.infra_net.name
  external_port = var.kafka_external_port
  memory_limit  = var.kafka_memory_limit
  cpu_limit     = var.kafka_cpu_limit
}

module "redis" {
  source        = "./modules/redis"
  environment   = var.environment
  image         = var.redis_image
  network_name  = docker_network.infra_net.name
  external_port = var.redis_external_port
  memory_limit  = var.redis_memory_limit
  cpu_limit     = var.redis_cpu_limit
}

module "minio" {
  source        = "./modules/minio"
  environment   = var.environment
  image         = var.minio_image
  network_name  = docker_network.infra_net.name
  api_port      = var.minio_api_port
  console_port  = var.minio_console_port
  memory_limit  = var.minio_memory_limit
  cpu_limit     = var.minio_cpu_limit
  root_password = var.minio_root_password
}

module "postgres" {
  source        = "./modules/postgres"
  environment   = var.environment
  image         = var.postgres_image
  network_name  = docker_network.infra_net.name
  external_port = var.postgres_external_port
  memory_limit  = var.postgres_memory_limit
  cpu_limit     = var.postgres_cpu_limit
  db_password   = var.postgres_password
}

# =============================================================
# Outputs
# =============================================================

output "environment" {
  value = var.environment
}

output "kafka_endpoint" {
  value = module.kafka.endpoint
}

output "redis_endpoint" {
  value = module.redis.endpoint
}

output "minio_api_endpoint" {
  value = module.minio.api_endpoint
}

output "minio_console_endpoint" {
  value = module.minio.console_endpoint
}

output "postgres_endpoint" {
  value = module.postgres.endpoint
}
