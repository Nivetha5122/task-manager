# Scalability Notes

This document outlines how the current architecture could evolve to handle significantly
higher traffic, larger data volumes, and a growing engineering team.

## 1. Current Architecture (baseline)

A single Node.js/Express monolith exposes a versioned REST API (`/api/v1`), backed by a
single MongoDB instance, with a static frontend served separately. This is appropriate for
the current scope (auth + one core entity) and keeps the codebase easy to reason about.

## 2. Horizontal Scaling of the API Layer

- The API is **stateless** — authentication is handled via JWTs rather than server-side
  sessions, so any number of API instances can run behind a load balancer without needing
  shared session storage.
- In production, this would run as multiple containers (e.g. behind an Nginx / cloud load
  balancer, or as a Kubernetes Deployment with a `HorizontalPodAutoscaler` based on CPU/RPS).
- `docker-compose.yml` is provided as a starting point; for real scaling this would move to
  an orchestrator (Kubernetes, ECS, etc.) with rolling deployments.

## 3. Database Scaling

- **Indexes**: `User.email` is unique-indexed; `Task.owner` and the compound
  `{owner, status}` index support the most common queries (a user's tasks, optionally
  filtered by status) without full collection scans.
- **Read replicas**: MongoDB replica sets can offload read-heavy traffic (e.g. dashboard
  listings) from the primary used for writes.
- **Sharding**: if the `tasks` collection grows very large, it could be sharded on `owner`
  (or a hashed `_id`) so that a single user's data stays co-located while spreading load
  across shards.
- **Pagination** is already built into `GET /tasks` (`page`/`limit`) to avoid loading
  unbounded result sets.

## 4. Caching

- **Redis** could sit in front of MongoDB for hot, read-heavy data — e.g. caching a user's
  task list for a few seconds, or caching `GET /tasks/:id` lookups.
- Redis is also the natural home for:
  - **Rate limiting** counters shared across multiple API instances (the current
    `express-rate-limit` setup is in-memory and per-instance; a Redis store makes limits
    consistent across a multi-instance deployment).
  - **JWT blacklisting / refresh token storage**, if refresh tokens are introduced.

## 5. Authentication & Security at Scale

- Move from a single long-lived access token to a **short-lived access token + refresh
  token** pair, with refresh tokens stored (hashed) in Redis/DB so they can be revoked.
- Centralize auth in an **API Gateway** (e.g. Kong, AWS API Gateway) if multiple backend
  services are introduced, so JWT verification, rate limiting, and request logging happen
  in one place.
- Secrets (JWT secret, DB credentials) should move from `.env` files to a secrets manager
  (AWS Secrets Manager, HashiCorp Vault, etc.) in production.

## 6. Moving Toward Microservices (if/when needed)

The current modular structure (`controllers/`, `models/`, `routes/`, `middleware/`,
`validators/`) is intentionally organized so that a domain — e.g. "Tasks" — could be
extracted into its own service with minimal rewrites:

- `auth-service`: user registration/login, JWT issuance, user profile.
- `tasks-service`: CRUD for tasks (and future entities like projects, comments).
- Services communicate over REST/gRPC or an event bus (e.g. RabbitMQ/Kafka) for
  cross-service events (e.g. "user deleted" → cascade-delete their tasks asynchronously).

This split should be driven by actual team/scale needs — a premature split adds
operational overhead without benefit at this project's current size.

## 7. Observability

- Replace ad-hoc `console.log`/`morgan` with structured logging (e.g. `pino`) shipped to a
  log aggregator (ELK, Loki, CloudWatch).
- Add request tracing (OpenTelemetry) once multiple services are involved, so a single
  request can be traced across service boundaries.
- Expose `/api/health` (already present) to load balancers / orchestrators for liveness
  and readiness probes, and add a `/api/ready` check that verifies the DB connection.

## 8. Frontend & Static Assets

- The basic frontend in `frontend/` is plain HTML/CSS/JS for simplicity. At scale, it would
  be built with a framework (React/Next.js) and deployed via a CDN (CloudFront, Vercel),
  decoupled entirely from the API's deployment lifecycle.

## Summary

| Concern              | Current                      | Scaled approach                              |
|----------------------|-------------------------------|-----------------------------------------------|
| API instances        | Single container              | Multiple stateless containers behind LB       |
| Database             | Single MongoDB instance       | Replica set + sharding on `owner`             |
| Caching              | None                           | Redis for hot reads, rate limiting, sessions  |
| Rate limiting        | In-memory, per-instance        | Redis-backed, shared across instances         |
| Auth                  | Single JWT                    | Access + refresh tokens, revocation support   |
| Logging               | console + morgan              | Structured logs + central aggregation         |
| Architecture          | Monolith                      | Optional split into auth/tasks microservices  |
