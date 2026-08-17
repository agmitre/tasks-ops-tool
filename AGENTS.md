# Agent Installation and Operating Guide

This repository is designed to be installable and usable by an AI agent with minimal operator intervention.

## Installation goal

Install Tasks Ops Tool as a small local service with persistent storage, then use `skills/task-ops/SKILL.md` as the operating contract.

Recommended deployment for a long-running agent host:

- Docker / Docker Compose when available
- persistent `/data` volume
- local/private network exposure where practical
- bearer authentication enabled

## Secret boundary

`TASKS_OPS_TOKEN` is operator-managed.

An installing agent must **not** place the token in Git, this repository, notes, task data, generated documentation, durable memory, or logs.

The expected flow is:

1. Agent installs or updates the public repository.
2. Agent prepares the service and identifies the required environment variable.
3. Operator configures `TASKS_OPS_TOKEN` in the host environment, container secret/environment configuration, or another approved secret store.
4. Agent verifies `/health` and `/status` without exposing the token.
5. Agent verifies one authenticated request using the runtime secret.
6. Agent adopts `skills/task-ops/SKILL.md` for ongoing task behavior.

If the token is missing, stop at the secret boundary and ask the operator to configure it. Do not invent a persistent secret location on the operator's behalf.

## Docker Compose

The repository includes `compose.yml`.

The compose definition expects `TASKS_OPS_TOKEN` to already be available to Compose through the host environment or an external `.env` file that is not committed.

Persistent task data is stored in the `tasks_ops_data` volume.

Default service port: `8787`.

## Native Node installation

Requirements:

- Node.js 20 or newer
- npm

Install dependencies, build, then run with these runtime values available:

```text
HOST=0.0.0.0
PORT=8787
TASKS_OPS_DB=<persistent path>/tasks-ops.sqlite
TASKS_OPS_TOKEN=<operator-managed secret>
```

`TASKS_OPS_AUTH_DISABLED=true` exists only for explicit trusted local development. Do not use it for normal agent deployment.

## Verification

Public checks:

```text
GET /health
GET /status
```

Expected status should advertise bearer authentication.

Authenticated verification:

```text
GET /ops/attention
Authorization: Bearer <runtime token>
```

Do not print the authorization header during verification.

## Agent wiring

After installation, configure the agent with:

- service base URL, typically `http://127.0.0.1:8787` when co-located
- runtime access to `TASKS_OPS_TOKEN`
- the operating instructions in `skills/task-ops/SKILL.md`

For heartbeat behavior, call `/ops/attention` first and fetch full tasks only when the summary indicates something requires interpretation.

## Updating

Because the tool is public, an agent may pull new tagged/public releases automatically if the operator permits software updates.

Updates must preserve the persistent data volume/database and must never overwrite or publish the operator's token.

Before an update, check release notes or migration guidance when available.

## Recovery principle

The service is intentionally designed so structured task state, human-readable context snapshots, and Markdown task markers can help reconstruct one another after partial data loss.

Do not remove Markdown task markers or context snapshots as cleanup unless the domain contract explicitly changes.
