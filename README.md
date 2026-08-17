# Tasks Ops Tool

A headless, Markdown-first task operations service for humans, agents, and apps.

Tasks Ops Tool is a small, portable task engine that can run beside an AI agent or application and provide durable task state, attention queries, activity history, Markdown recovery, and agent-friendly task operations without requiring a UI.

## Principles

- **Markdown-first**: a task can originate as a simple Markdown checkbox and remain recoverable from Markdown.
- **Structured when available**: IDs, status, due dates, tags, relationships, and history add operational power without replacing the Markdown source.
- **Recovery-safe**: human-readable context is stored alongside canonical IDs so records remain understandable and reconstructable if one side of an integration disappears.
- **Revision-safe**: canonical writes are explicit and protected against stale updates.
- **Agent-friendly**: lightweight filtered queries and intent endpoints answer operational questions without requiring expensive semantic search.
- **Portable**: the core service stays application-agnostic. Taskel is a future first-class consumer, not a hard dependency.
- **Secure by default**: operational endpoints require a bearer token; health and capability discovery remain public.

## Current alpha milestone

The current goal is simple: let an agent reliably answer **“What needs attention?”** and maintain real work from structured task state.

Implemented on `develop/core`:

- task CRUD
- parent/child task relationships
- follow-up tasks
- status, priority, due date, waiting metadata, and tags
- workspace/container/note recovery context
- revision-safe canonical mutation
- automatic activity history
- Markdown checkbox recognition and stable task IDs
- recovery of missing structured tasks from Markdown
- filtered and lightweight text queries
- attention queries for overdue, due-soon, blocked, urgent, and long-waiting work
- agent intent endpoints for wait, complete, and follow-up
- compact agent heartbeat attention summary
- bearer-token authentication
- Docker/Compose deployment with persistent SQLite storage
- CI for typecheck, tests, and container build

No UI, Gantt, complex recurrence, or webhook system is required for this alpha.

## Agent installation

If you are giving this repository to an AI agent, start with [`AGENTS.md`](AGENTS.md), then give the agent the operating contract at [`skills/task-ops/SKILL.md`](skills/task-ops/SKILL.md).

The intended flow is:

1. Agent installs or updates the public repository.
2. Agent prepares the service.
3. The human/operator configures `TASKS_OPS_TOKEN` outside Git.
4. Agent verifies the service without exposing the token.
5. Agent uses the Task Ops skill for day-to-day operations.

The token should never be committed, written into tasks/notes, or stored in durable agent memory.

## Docker Compose

`compose.yml` expects `TASKS_OPS_TOKEN` from the host environment or an external uncommitted `.env` file.

The service listens on port `8787` and stores SQLite data in a persistent Docker volume.

Public endpoints:

```text
GET /health
GET /status
```

Operational endpoints require:

```text
Authorization: Bearer <TASKS_OPS_TOKEN>
```

For trusted local development only, authentication can be explicitly disabled with `TASKS_OPS_AUTH_DISABLED=true`.

## Documentation

- [`AGENTS.md`](AGENTS.md) - installation and wiring for agents
- [`skills/task-ops/SKILL.md`](skills/task-ops/SKILL.md) - agent operating behavior
- [`docs/api.md`](docs/api.md) - HTTP API
- [`docs/architecture.md`](docs/architecture.md) - architecture and recovery model

## Status

Alpha implementation and dogfooding work is happening on `develop/core`.

## License

License selection is pending before the first public release.
