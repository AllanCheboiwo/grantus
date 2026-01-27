# Production Tooling Recommendations

A guide to production-ready tools for Grantus, focused on small organizations with limited budgets.

---

## 📊 Observability Stack

Observability = **Metrics** + **Logs** + **Traces**

It answers: "What is my app doing, and why?"

### What is Prometheus?

**Prometheus** is a metrics collection and monitoring system. It:
- Scrapes metrics from your app at regular intervals
- Stores time-series data (CPU, memory, request counts, etc.)
- Provides a query language (PromQL) for analysis
- Powers alerting rules

**Best for:** Infrastructure metrics, custom business metrics, alerting

### Recommended Stack for Small Org

| Component | Tool | Purpose | Cost |
|-----------|------|---------|------|
| **Metrics** | Prometheus + Grafana | Collect & visualize metrics | Free (self-hosted) |
| **Logs** | Loki | Log aggregation | Free (self-hosted) |
| **Traces** | Jaeger or Tempo | Distributed tracing | Free (self-hosted) |
| **All-in-One** | **Grafana Cloud** | Managed observability | Free tier available |

---

## 🔍 Option 1: Self-Hosted Stack (Budget: $0)

### Prometheus + Grafana

```yaml
# Add to docker-compose.yml
services:
  prometheus:
    image: prom/prometheus:latest
    container_name: grantus_prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana:latest
    container_name: grantus_grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana

volumes:
  grafana_data:
```

### Add Metrics to FastAPI

```bash
pip install prometheus-fastapi-instrumentator
```

```python
# app/main.py
from prometheus_fastapi_instrumentator import Instrumentator

app = FastAPI(...)

# Add this after app creation
Instrumentator().instrument(app).expose(app)
```

This automatically exposes `/metrics` endpoint with:
- Request count by endpoint
- Request duration histograms
- Requests in progress
- HTTP status codes

### Loki for Logs

```yaml
# Add to docker-compose.yml
  loki:
    image: grafana/loki:latest
    ports:
      - "3100:3100"
    volumes:
      - loki_data:/loki

  promtail:
    image: grafana/promtail:latest
    volumes:
      - /var/log:/var/log
      - ./promtail-config.yml:/etc/promtail/config.yml
```

---

## ☁️ Option 2: Managed Services (Recommended for Small Orgs)

Less setup, less maintenance, often has free tiers.

### Grafana Cloud (Best All-in-One)
- **What:** Managed Prometheus, Loki, Tempo
- **Free Tier:** 10k metrics, 50GB logs/month
- **URL:** https://grafana.com/products/cloud/
- **Why:** One dashboard for everything

### Better Stack (Logtail)
- **What:** Log management + uptime monitoring
- **Free Tier:** 1GB logs/month
- **URL:** https://betterstack.com/
- **Why:** Beautiful UI, great for small teams

### Sentry (Error Tracking)
- **What:** Error tracking + performance monitoring
- **Free Tier:** 5k errors/month
- **URL:** https://sentry.io/
- **Why:** Catches and groups errors with context

---

## 🚨 Error Tracking (Highly Recommended)

Track errors with full context (stack trace, user info, request data).

### Sentry Setup

```bash
pip install sentry-sdk[fastapi]
```

```python
# app/main.py
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

sentry_sdk.init(
    dsn="https://xxx@sentry.io/xxx",
    integrations=[FastApiIntegration()],
    traces_sample_rate=0.1,  # 10% of requests traced
)
```

### Frontend (React)
```bash
npm install @sentry/react
```

```typescript
// main.tsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "https://xxx@sentry.io/xxx",
  integrations: [new Sentry.BrowserTracing()],
  tracesSampleRate: 0.1,
});
```

---

## 📈 Application Performance Monitoring (APM)

Track slow endpoints, database queries, external API calls.

| Tool | Free Tier | Best For |
|------|-----------|----------|
| **Sentry Performance** | 5k transactions/mo | Already using Sentry |
| **New Relic** | 100GB data/mo | Comprehensive APM |
| **Datadog** | 14-day trial | Enterprise features |

---

## 🔐 Security Tools

### Secret Management

| Tool | Description | Cost |
|------|-------------|------|
| **Railway/Render Secrets** | Built into PaaS | Included |
| **Doppler** | Team secret management | Free for 5 users |
| **1Password Secrets** | If already using 1Password | Included |

### Vulnerability Scanning

```bash
# Scan Python dependencies
pip install safety
safety check

# Scan Docker images
docker scout cves grantus_backend
```

### HTTPS/SSL
- **Railway:** Automatic SSL ✅
- **Render:** Automatic SSL ✅
- **Self-hosted:** Use Let's Encrypt + Caddy/Nginx

---

## 💾 Database Backups

### Option 1: Railway/Render
- Both offer automatic daily backups
- Point-in-time recovery available

### Option 2: Self-Hosted Backups

```bash
# backup.sh - Run daily via cron
#!/bin/bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
docker compose exec -T db pg_dump -U grantus grantus > "backup_$TIMESTAMP.sql"

# Upload to S3 (optional)
aws s3 cp "backup_$TIMESTAMP.sql" s3://your-bucket/backups/
```

### Managed Backup Services
- **PlanetScale** (MySQL alternative with built-in branching)
- **Supabase** (Postgres with backups + auth)
- **Neon** (Serverless Postgres with branching)

---

## 🔄 CI/CD Pipeline

### GitHub Actions (Free)

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: pip install -r backend/requirements.txt
      - run: pip install pytest
      - run: pytest

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      # Railway auto-deploys from GitHub
      # Or add deployment step for other platforms
```

### Recommended CI/CD
- **Railway:** Auto-deploy on git push ✅
- **Render:** Auto-deploy on git push ✅
- **Vercel:** Great for frontend-only

---

## ⏰ Uptime Monitoring

Get notified when your app goes down.

| Tool | Free Tier | Features |
|------|-----------|----------|
| **UptimeRobot** | 50 monitors | HTTP checks, alerts |
| **Better Stack** | 10 monitors | Status page included |
| **Freshping** | 50 monitors | Multi-location checks |
| **Pingdom** | 1 monitor | Industry standard |

### Setup (UptimeRobot)
1. Create account at uptimerobot.com
2. Add monitor: `https://your-app.railway.app/health`
3. Set check interval: 5 minutes
4. Add email/Slack alerts

---

## 📧 Transactional Email

You're already using Resend. Alternatives:

| Service | Free Tier | Best For |
|---------|-----------|----------|
| **Resend** ✅ | 3k emails/mo | Modern, simple API |
| **SendGrid** | 100 emails/day | High volume |
| **Postmark** | 100 emails/mo | Deliverability focus |
| **AWS SES** | 62k/mo (from EC2) | AWS users |

---

## 🗂️ File Storage

If you need document uploads:

| Service | Free Tier | Best For |
|---------|-----------|----------|
| **Cloudflare R2** | 10GB + 10M ops | S3-compatible, no egress fees |
| **AWS S3** | 5GB (12 months) | Industry standard |
| **Backblaze B2** | 10GB | Cheapest storage |
| **Supabase Storage** | 1GB | Already using Supabase |

---

## 🏗️ Recommended Production Stack

### Minimum Viable Production (Budget: ~$0-20/mo)

| Component | Tool | Cost |
|-----------|------|------|
| Hosting | Railway | ~$5-20/mo |
| Database | Railway Postgres | Included |
| Error Tracking | Sentry (free tier) | $0 |
| Uptime | UptimeRobot | $0 |
| Email | Resend | $0 (3k/mo) |
| Logs | Railway logs | Included |

### Growing Organization (~$50-100/mo)

| Component | Tool | Cost |
|-----------|------|------|
| Hosting | Railway Pro | ~$20-50/mo |
| Database | Railway Postgres | Included |
| Observability | Grafana Cloud | $0-50/mo |
| Error Tracking | Sentry Team | $26/mo |
| Uptime | Better Stack | $0-25/mo |
| Email | Resend | $20/mo |
| Backups | Automated | ~$5/mo |

### Enterprise Ready (~$200+/mo)

| Component | Tool | Cost |
|-----------|------|------|
| Hosting | AWS/GCP/Azure | Variable |
| Database | AWS RDS / Cloud SQL | ~$50+/mo |
| Observability | Datadog / New Relic | ~$100+/mo |
| Error Tracking | Sentry Business | $80+/mo |
| Security | Snyk / Dependabot | Variable |
| CDN | Cloudflare Pro | $20/mo |

---

## 🚀 Quick Wins to Add Now

### 1. Health Check Endpoint (Already have it!)
```
GET /health → {"status": "healthy"}
```

### 2. Add Sentry (30 minutes)
Best ROI for catching production errors.

### 3. Add Uptime Monitoring (5 minutes)
Know when your app goes down before users tell you.

### 4. Enable Structured Logging
```python
import structlog

logger = structlog.get_logger()
logger.info("user_logged_in", user_id=user.id, email=user.email)
```

### 5. Add Request ID Middleware
Track requests across services:
```python
from uuid import uuid4
from starlette.middleware.base import BaseHTTPMiddleware

class RequestIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        request_id = str(uuid4())
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response
```

---

## 📋 Production Checklist

### Security
- [ ] HTTPS enabled (automatic on Railway)
- [ ] Environment variables for secrets
- [ ] CORS configured for production domains
- [ ] Rate limiting on auth endpoints
- [ ] SQL injection protection (SQLAlchemy does this)
- [ ] XSS protection (React does this)

### Reliability
- [ ] Health check endpoint
- [ ] Database backups configured
- [ ] Uptime monitoring active
- [ ] Error tracking (Sentry) configured

### Observability
- [ ] Application logs accessible
- [ ] Error alerts configured
- [ ] Basic metrics available

### Performance
- [ ] Database indexes on frequently queried columns
- [ ] Connection pooling configured
- [ ] Static assets cached/CDN

---

## 🔗 Quick Links

| Tool | URL |
|------|-----|
| Grafana Cloud | https://grafana.com/products/cloud/ |
| Sentry | https://sentry.io/ |
| Better Stack | https://betterstack.com/ |
| UptimeRobot | https://uptimerobot.com/ |
| Resend | https://resend.com/ |
| Railway | https://railway.app/ |
| Render | https://render.com/ |
