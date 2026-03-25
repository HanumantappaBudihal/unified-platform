# Infrastructure as Code & CI/CD

## CI/CD Pipeline (GitHub Actions)

### `infra-test.yml`
Runs on every push/PR to main. Tests:
- **Event Streaming**: Start Kafka, init topics, produce/consume message
- **Cache**: Start Redis cluster, init, SET/GET verification
- **Object Storage**: Start MinIO, verify buckets, upload/download test
- **Portal Builds**: Build all 6 Next.js portals (matrix strategy)

### Running locally
```bash
bash infra/smoke-test.sh
```

## Helm Charts (Kubernetes)

Scaffold charts for future K8s migration:

| Chart | Path | Description |
|-------|------|-------------|
| kafka-central | helm/kafka/ | Kafka KRaft + Schema Registry |
| redis-cluster | helm/redis/ | Redis 3+3 cluster |
| minio-storage | helm/minio/ | MinIO erasure-coded storage |

## Terraform (Docker Provider)

Dev environment provisioning with `kreuzwerker/docker` provider.

```bash
cd infra/terraform
terraform init
terraform plan -var-file=env/dev.tfvars
terraform apply -var-file=env/dev.tfvars
```
