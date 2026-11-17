
# Aegis — Backend Monitoring & Incident Management

Aegis is a backend monitoring and incident management project built with TypeScript, Fastify, PostgreSQL, Prometheus, and Grafana.

It monitors API performance and database health, detects abnormal API latency, automatically creates incident and investigation records, and resolves incidents after the service demonstrates sustained recovery.

## Architecture

Aegis runs as a collection of Docker Compose services:

- **Aegis API:** Fastify and TypeScript backend.
- **PostgreSQL:** Stores application data, incidents, and investigations.
- **PostgreSQL Exporter:** Exposes PostgreSQL metrics for Prometheus.
- **Prometheus:** Collects and stores API and database metrics.
- **Grafana:** Visualizes system performance through monitoring dashboards.

## Technology Stack

- TypeScript
- Node.js
- Fastify
- PostgreSQL 17
- Prometheus
- Grafana
- Docker Compose

## Features

### API Monitoring

- Tracks HTTP request counts and response status codes.
- Measures API request duration using Prometheus histograms.
- Exposes application metrics through `/metrics`.
- Monitors API health and database connectivity.

### Database Monitoring

- Collects PostgreSQL performance metrics.
- Tracks active database connections.
- Monitors transaction activity and connection utilization.
- Exposes database health through a dedicated API endpoint.

### Incident Management

- Detects abnormal API latency using Prometheus queries.
- Automatically creates incident records when latency exceeds the configured threshold.
- Creates investigation records associated with detected incidents.
- Prevents duplicate active incidents.
- Automatically resolves incidents after three consecutive healthy checks.

### Grafana Dashboard

The `Aegis - System Monitoring` dashboard contains seven monitoring panels:

**API Monitoring**
- API Request Rate
- Average API Latency
- 5xx Error Rate

**Database Monitoring**
- PostgreSQL Status
- PostgreSQL Connections
- PostgreSQL Transaction Rate
- PostgreSQL Connection Utilization

## Project Structure

```text
Aegis/
├── infrastructure/
│   ├── postgres/
│   │   └── init.sql
│   └── prometheus/
│       └── prometheus.yml
├── services/
│   └── api/
│       ├── src/
│       │   ├── db.ts
│       │   ├── incident-detector.ts
│       │   ├── metrics.ts
│       │   └── server.ts
│       ├── Dockerfile
│       ├── package.json
│       └── tsconfig.json
├── .env.example
├── .gitignore
├── docker-compose.yml
└── README.md
```

## API Endpoints

| Endpoint | Description |
|---|---|
| `GET /` | API information |
| `GET /health` | API health check |
| `GET /db-health` | PostgreSQL connectivity check |
| `GET /metrics` | Prometheus application metrics |
| `GET /api/orders` | Retrieves sample orders |
| `GET /api/version` | Application version information |
| `GET /api/incidents` | Retrieves incident records |
| `GET /api/investigations` | Retrieves investigation records |

## Incident Detection Workflow

1. Prometheus collects API performance metrics.
2. The incident detector periodically queries Prometheus for average API latency.
3. If latency exceeds the configured threshold, Aegis creates an incident.
4. An investigation record is created and associated with the incident.
5. The detector continues monitoring API performance.
6. After three consecutive healthy checks, the incident is automatically resolved.

The current investigation records use predefined diagnostic information rather than AI-powered root cause analysis.

## Running Locally

### Prerequisites

- Docker Desktop
- Git

### 1. Clone the repository

```bash
git clone https://github.com/denosyy/Aegis.git
cd Aegis
```

### 2. Configure environment variables

Copy the example environment file:

```powershell
Copy-Item .env.example .env
```

Edit `.env` and replace `change_me` with your own database password.

For example:

```env
POSTGRES_USER=aegis
POSTGRES_PASSWORD=your_own_password
POSTGRES_DB=aegis
```

Keep `.env` private. It is excluded from Git and should never be committed.

### 3. Start the services

```bash
docker compose up -d --build
```

### 4. Verify the services

```bash
docker compose ps
```

Check API health:

```bash
curl http://localhost:3000/health
```

Check database connectivity:

```bash
curl http://localhost:3000/db-health
```

## Accessing Services

| Service | URL |
|---|---|
| Aegis API | http://localhost:3000 |
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3001 |
| PostgreSQL Exporter | http://localhost:9187/metrics |

Grafana requires a dashboard and Prometheus data source to be configured. The Prometheus data source URL inside the Docker network is:

```text
http://prometheus:9090
```

## Testing Incident Detection

The API includes an intentional two-second delay in the `/api/orders` endpoint for development and testing purposes.

This allows the incident detector to observe elevated API latency and demonstrate the incident creation and recovery workflow.

Remove the artificial delay before using the API in a production environment.

## Development Notes

- The incident detection threshold is configurable in `incident-detector.ts`.
- Incident detection runs periodically.
- Healthy recovery requires three consecutive successful checks.
- Investigation diagnostics are currently predefined.
- AI-powered investigation and root cause analysis are not implemented.

## License

This project is currently under development.
