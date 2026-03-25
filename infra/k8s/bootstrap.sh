#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# IDP Platform — Kubernetes Bootstrap Script
# ═══════════════════════════════════════════════════════════════
#
# Prerequisites:
#   - kubectl configured for target cluster
#   - Helm 3.x installed
#   - Istio CLI (istioctl) installed (optional, for service mesh)
#   - ArgoCD CLI installed (optional, for GitOps)
#
# Usage:
#   ./bootstrap.sh                    # Full install (dev)
#   ./bootstrap.sh --env staging      # Staging environment
#   ./bootstrap.sh --env prod         # Production environment
#   ./bootstrap.sh --no-istio         # Skip Istio
#   ./bootstrap.sh --no-argocd        # Skip ArgoCD (manual Helm installs)
#   ./bootstrap.sh --argocd-only      # Only set up ArgoCD (GitOps takes over)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
INFRA_DIR="$ROOT_DIR/infra"
HELM_DIR="$INFRA_DIR/helm"
VALUES_DIR="$INFRA_DIR/helm-values"

ENV="dev"
INSTALL_ISTIO=true
INSTALL_ARGOCD=true
ARGOCD_ONLY=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --env) ENV="$2"; shift 2 ;;
    --no-istio) INSTALL_ISTIO=false; shift ;;
    --no-argocd) INSTALL_ARGOCD=false; shift ;;
    --argocd-only) ARGOCD_ONLY=true; shift ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

NAMESPACE="idp-${ENV}"

echo "═══════════════════════════════════════════════════════════════"
echo "  IDP Platform — Kubernetes Bootstrap"
echo "  Environment: $ENV"
echo "  Namespace:   $NAMESPACE"
echo "  Istio:       $INSTALL_ISTIO"
echo "  ArgoCD:      $INSTALL_ARGOCD"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# ─── Step 1: Create namespaces ───
echo "→ Creating namespaces..."
kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -
kubectl create namespace idp-monitoring --dry-run=client -o yaml | kubectl apply -f -

if [ "$INSTALL_ISTIO" = true ]; then
  kubectl label namespace "$NAMESPACE" istio-injection=enabled --overwrite
fi

kubectl label namespace "$NAMESPACE" environment="$ENV" --overwrite

# ─── Step 2: Istio (optional) ───
if [ "$INSTALL_ISTIO" = true ]; then
  echo ""
  echo "→ Installing Istio..."
  if ! command -v istioctl &> /dev/null; then
    echo "  Warning: istioctl not found. Skipping Istio install."
    echo "  Install with: curl -L https://istio.io/downloadIstio | sh -"
  else
    istioctl install --set profile=default -y
    echo "  Applying Istio policies..."
    kubectl apply -f "$INFRA_DIR/istio/peer-authentication.yaml"
    kubectl apply -f "$INFRA_DIR/istio/authorization-policies.yaml"
    kubectl apply -f "$INFRA_DIR/istio/destination-rules.yaml"
    kubectl apply -f "$INFRA_DIR/istio/virtual-services.yaml"
    kubectl apply -f "$INFRA_DIR/istio/gateway.yaml"
    echo "  Istio installed and configured."
  fi
fi

# ─── Step 3: Network Policies ───
echo ""
echo "→ Applying network policies..."
kubectl apply -n "$NAMESPACE" -f "$INFRA_DIR/k8s/network-policies/"
echo "  Network policies applied."

# ─── Step 4: ArgoCD (GitOps mode) ───
if [ "$INSTALL_ARGOCD" = true ]; then
  echo ""
  echo "→ Installing ArgoCD..."
  kubectl create namespace argocd --dry-run=client -o yaml | kubectl apply -f -
  kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

  echo "  Waiting for ArgoCD to be ready..."
  kubectl rollout status deployment/argocd-server -n argocd --timeout=300s

  echo "  Applying IDP project and ApplicationSets..."
  kubectl apply -f "$INFRA_DIR/argocd/install.yaml"
  kubectl apply -f "$INFRA_DIR/argocd/applicationset.yaml"

  echo ""
  echo "  ArgoCD admin password:"
  kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
  echo ""
  echo ""
  echo "  ArgoCD UI: kubectl port-forward svc/argocd-server -n argocd 8080:443"

  if [ "$ARGOCD_ONLY" = true ]; then
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    echo "  ArgoCD will now manage all deployments via GitOps."
    echo "  Push changes to the repo and ArgoCD will sync automatically."
    echo "═══════════════════════════════════════════════════════════════"
    exit 0
  fi
fi

# ─── Step 5: Manual Helm installs (if not using ArgoCD) ───
if [ "$INSTALL_ARGOCD" = false ]; then
  echo ""
  echo "→ Installing services via Helm..."

  SERVICES=(postgres redis kafka minio keycloak opa kong platform-api portal)

  for svc in "${SERVICES[@]}"; do
    echo "  Installing $svc..."
    VALUES_FILE="$VALUES_DIR/$ENV/$svc.yaml"
    if [ -f "$VALUES_FILE" ]; then
      helm upgrade --install "$svc" "$HELM_DIR/$svc" \
        -n "$NAMESPACE" \
        -f "$VALUES_FILE" \
        --wait --timeout 5m
    else
      helm upgrade --install "$svc" "$HELM_DIR/$svc" \
        -n "$NAMESPACE" \
        --wait --timeout 5m
    fi
    echo "  ✓ $svc installed"
  done

  # Monitoring (single instance)
  echo "  Installing monitoring..."
  helm upgrade --install monitoring "$HELM_DIR/monitoring" \
    -n idp-monitoring \
    -f "$VALUES_DIR/monitoring.yaml" \
    --wait --timeout 5m
  echo "  ✓ monitoring installed"
fi

# ─── Step 6: Verify ───
echo ""
echo "→ Verifying deployment..."
echo ""
kubectl get pods -n "$NAMESPACE" -o wide
echo ""
kubectl get svc -n "$NAMESPACE"
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "  IDP Platform deployed to $NAMESPACE"
echo ""
echo "  Access points:"
echo "    Portal:     kubectl port-forward svc/portal 3006:3000 -n $NAMESPACE"
echo "    API:        kubectl port-forward svc/platform-api 3020:3020 -n $NAMESPACE"
echo "    Keycloak:   kubectl port-forward svc/keycloak 8080:8080 -n $NAMESPACE"
echo "    Grafana:    kubectl port-forward svc/monitoring-grafana 3050:3000 -n idp-monitoring"
echo "    Kong:       kubectl port-forward svc/kong-proxy 8000:8000 -n $NAMESPACE"
if [ "$INSTALL_ARGOCD" = true ]; then
  echo "    ArgoCD:     kubectl port-forward svc/argocd-server 8443:443 -n argocd"
fi
echo "═══════════════════════════════════════════════════════════════"
