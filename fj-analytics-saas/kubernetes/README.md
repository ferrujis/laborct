# FJ Analytics SaaS - Kubernetes Deployment

## Prerequisites
- Kubernetes cluster (k8s 1.24+)
- Helm 3 (optional, for easier deployment)
- kubectl configured
- Ingress controller (nginx-ingress recommended)
- Secrets manager (for secrets) or Kubernetes Secrets

## Quick Start

### 1. Create Namespace
```bash
kubectl apply -f namespace.yaml
```

### 2. Create Secrets
```bash
# Create secret for JWT and admin credentials
kubectl create secret generic fj-analytics-secrets \
  --from-literal=JWT_SECRET=your-super-secret-jwt-key-change-this \
  --from-literal=ADMIN_EMAIL=admin@yourcompany.com \
  --from-literal=ADMIN_PASSWORD=SecureAdminPassword123 \
  -n fj-analytics
```

### 3. Deploy
```bash
kubectl apply -f configmap.yaml
kubectl apply -f persistentvolumeclaim.yaml
kubectl apply -f deployment-backend.yaml
kubectl apply -f service-backend.yaml
kubectl apply -f deployment-frontend.yaml
kubectl apply -f service-frontend.yaml
kubectl apply -f ingress.yaml
```

### 4. Check Status
```bash
kubectl get pods -n fj-analytics
kubectl get svc -n fj-analytics
kubectl get ingress -n fj-analytics
```

## Environment Variables (Secret)

| Variable | Description | Required |
|----------|-------------|----------|
| JWT_SECRET | JWT signing key (min 32 chars) | Yes |
| ADMIN_EMAIL | Default admin email | Yes |
| ADMIN_PASSWORD | Default admin password | Yes |
| CORS_ORIGINS | Allowed origins (comma-separated) | No |
| REDIS_URL | Redis connection string | No |

## Scaling

```bash
# Scale backend
kubectl scale deployment fj-analytics-backend --replicas=3 -n fj-analytics

# Watch rollout
kubectl rollout status deployment fj-analytics-backend -n fj-analytics
```

## Monitoring

```bash
# Check logs
kubectl logs -l app=fj-analytics-backend -n fj-analytics -f

# Check resource usage
kubectl top pods -n fj-analytics
```
