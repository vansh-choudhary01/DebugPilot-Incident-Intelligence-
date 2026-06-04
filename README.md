# DebugPilot

DebugPilot is a simple AI engineer/SRE assistant for production debugging. It watches application logs, detects repeated failures, remembers past incidents, retrieves related code, and generates root cause hypotheses.

It is not a chatbot and not a log viewer. The core workflow is:

```text
GitHub repo -> index code -> embeddings -> MongoDB Vector Search
Application logs -> incident detection -> root cause analysis -> alert -> incident memory
```

## Stack

- Node.js + TypeScript
- Express
- MongoDB + MongoDB Vector Search
- Redis + BullMQ jobs
- OpenAI or Gemini SDK, with a mock fallback
- React + Vite

## Project Structure

```text
src/
  api/             Express routes
  services/        repository indexing and ask workflow
  agents/          LLM/root cause analysis
  repositories/    repository schema
  jobs/            BullMQ RCA queue and worker
  embeddings/      embedding and vector search helpers
  github/          clone, scan, and chunk repository code
  logs/            log schema, ingestion, fingerprints
  incidents/       incident schema, detection, memory
  alerts/          console and webhook alerts
frontend/          React dashboard
demo/              sample logs, seed script, vector index docs
```

## Setup

1. Install dependencies.

```bash
npm install
npm --prefix frontend install
```

2. Start MongoDB and Redis.

```bash
docker compose up -d
```

3. Create `.env`.

```bash
cp .env.example .env
```

The app runs with `AI_PROVIDER=mock`. For real AI analysis, set either:

```text
AI_PROVIDER=openai
OPENAI_API_KEY=...
```

or:

```text
AI_PROVIDER=gemini
GEMINI_API_KEY=...
```

4. Start the backend.

```bash
npm run dev
```

5. Start the RCA worker in another terminal.

```bash
npm run worker
```

6. Start the frontend in another terminal.

```bash
npm run frontend:dev
```

Frontend: `http://localhost:5173`

Backend: `http://localhost:4000`

## Demo

Seed a deployment plus logs that trigger a payment incident:

```bash
npm run seed
```

Then open the dashboard and check:

- Services: `payment-service` is degraded
- Incidents: a repeated payment/database failure is open
- Alerts: a console alert was stored
- Ask: try `Why is payment service failing?`

## API

### Record a deployment

```http
POST /deployments
{
  "service": "payment-service",
  "commit": "abc123",
  "timestamp": "2026-06-04T09:55:00.000Z",
  "author": "alex"
}
```

### Connect and index a repository

```http
POST /repositories
{
  "url": "https://github.com/acme/payment-service.git"
}
```

The repository is cloned once, scanned, chunked, embedded, and stored in `code_chunks`.

### Re-index a repository

```http
POST /repositories/:id/reindex
```

### Ingest logs

```http
POST /logs
{
  "service": "payment-service",
  "level": "error",
  "message": "Payment checkout failed because database connection pool timed out",
  "metadata": {
    "route": "/checkout"
  },
  "timestamp": "2026-06-04T10:00:00.000Z"
}
```

DebugPilot stores the log in `logs`, generates a fingerprint like `db_connection_failed`, stores a fingerprint embedding, checks whether an incident should be created, and enqueues RCA in Redis.

### Ask a debugging question

```http
POST /ask
{
  "question": "Have we seen this payment failure before?"
}
```

## Incident Detection Rules

The MVP uses intentionally simple rules:

- Same service + fingerprint appears 20 or more times in 10 minutes
- Service has 30 or more error/fatal logs in 5 minutes
- Existing open incidents are updated instead of duplicated

## MongoDB Collections

### `code_chunks`

```json
{
  "repoId": "ObjectId",
  "filePath": "src/payments.ts",
  "content": "code chunk",
  "chunkIndex": 0,
  "embedding": [0.1, 0.2]
}
```

### `logs`

```json
{
  "service": "payment-service",
  "level": "error",
  "message": "Payment checkout failed",
  "metadata": {},
  "timestamp": "2026-06-04T10:00:00.000Z",
  "fingerprint": "payment_failed",
  "fingerprintEmbedding": [0.1, 0.2]
}
```

### `log_fingerprints`

```json
{
  "service": "payment-service",
  "fingerprint": "db_connection_failed",
  "sampleMessage": "Database connection unavailable during checkout",
  "embedding": [0.1, 0.2],
  "lastSeenAt": "2026-06-04T10:00:00.000Z"
}
```

### `incidents`

```json
{
  "title": "payment-service db connection failed",
  "service": "payment-service",
  "fingerprint": "db_connection_failed",
  "severity": "medium",
  "status": "open",
  "occurrenceCount": 20,
  "analysis": {
    "whatHappened": "Repeated checkout failures occurred.",
    "likelyRootCause": "Database pool exhaustion.",
    "filesToInspect": ["src/db.ts"],
    "suggestedFixes": ["Increase pool size", "Check connection leaks"],
    "confidenceScore": 0.72
  }
}
```

### `incident_memories`

```json
{
  "title": "payment-service db connection failed",
  "summary": "Repeated checkout failures occurred.",
  "rootCause": "Database pool exhaustion.",
  "suggestedFixes": ["Increase pool size", "Check for leaked connections"],
  "outcome": "analysis_generated",
  "embedding": [0.1, 0.2],
  "timestamp": "2026-06-04T10:00:00.000Z"
}
```

### `deployments`

```json
{
  "service": "payment-service",
  "commit": "abc123",
  "timestamp": "2026-06-04T09:55:00.000Z",
  "author": "alex"
}
```

## Background RCA

The request lifecycle stays short:

```text
POST /logs -> store log -> detect/create incident -> enqueue Redis job -> return
```

The worker owns the expensive path:

```text
RCA worker -> load incident -> retrieve logs -> retrieve deployments -> retrieve similar memory -> retrieve service-aware code -> call LLM -> save analysis -> save memory -> alert
```

Run the API and worker separately:

```bash
npm run dev
npm run worker
```

## Vector Search

MongoDB Atlas Vector Search index definitions are in `demo/mongo-vector-indexes.md`.

When those indexes are not available, DebugPilot falls back to in-process cosine similarity so the MVP remains easy to run locally.
