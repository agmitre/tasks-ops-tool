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

## Agent-owned operational workspace

Tasks Ops Tool can be used independently from any notes app.

An agent may use the task context fields as its own operational namespace and keep actionable state out of scattered reminder files, scratch notes, and repeated memory scans.

For example:

```text
workspaceName: Agent Internal

containers / logical sections:
- Todo
- Waiting
- Bugs
- Improvements
- Follow-ups
- Maintenance
```

A task may optionally keep a stable source reference to the agent's own knowledge system, ticket store, repository, note database, or another external system:

```json
{
  "title": "Investigate recurring Ollama startup issue",
  "tags": ["ollama", "bug"],
  "context": {
    "workspaceId": "agent_internal",
    "workspaceName": "Agent Internal",
    "containerId": "bugs",
    "containerName": "Bugs",
    "sourceNoteId": "openclaw:memory:ollama-startup",
    "sourceNoteTitle": "Ollama startup investigation"
  }
}
```

The source does not need to be Taskel. It can be any stable identifier the agent understands.

This makes Tasks Ops Tool useful as a structured operational memory layer:

```text
agent knowledge / memory
        ↕ stable source IDs
Tasks Ops Tool
        ↕
actionable state + history + attention
```

Use Tasks Ops Tool for things that have state or require action: work to do, waiting items, bugs, improvements, follow-ups, maintenance, and completed work history.

Do **not** use it as a replacement for the agent's entire knowledge base. Facts, reference material, long-form reasoning, and durable domain knowledge should remain in the system best suited to store them.

Workspace/container fields are currently task context namespaces rather than separately managed workspace/container records. Agents may use stable IDs and names consistently today; richer workspace management can evolve later without coupling the service to Taskel.

## Current alpha milestone

The current goal is simple: let an agent reliably answer **“What needs attention?”** and maintain real work from structured task state.

Implemented:

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
- CI for Node.js 22/24, tests, typecheck, and container build

No UI, Gantt, complex recurrence, or webhook system is required for this alpha.

## Agent installation

If you are giving this repository to an AI agent, start with [`AGENTS.md`](AGENTS.md), then give the agent the operating contract at [`skills/task-ops/SKILL.md`](skills/task-ops/SKILL.md).

### Installation path

Prefer the path that changes the host the least:

1. **Docker already installed:** use `docker compose`. This is the preferred long-running deployment.
2. **Docker absent but Node.js 22/24 already installed:** use native Node.
3. **Neither is available:** the agent should report the missing runtime before installing large dependencies.

Agents should **not automatically install Python, Visual Studio Build Tools, C++ workloads, Docker Desktop, PM2, NSSM, or similar large host dependencies** merely to get through installation. See [`AGENTS.md`](AGENTS.md) for the fail-fast installation rules.

The intended flow is:

1. Agent installs or updates the public repository.
2. Agent prepares the smallest viable deployment path.
3. The human/operator configures `TASKS_OPS_TOKEN` outside Git.
4. Agent verifies the service without exposing the token.
5. Agent verifies reboot/auto-restart behavior for long-running use.
6. Agent uses the Task Ops skill for day-to-day operations.

The token should never be committed, written into tasks/notes, or stored in durable agent memory.

## Docker Compose

`compose.yml` expects `TASKS_OPS_TOKEN` from the host environment or an external uncommitted `.env` file.

The service listens on port `8787` and stores SQLite data in a persistent Docker volume.

Typical install when Docker already exists:

```text
git clone
→ configure TASKS_OPS_TOKEN outside Git
→ docker compose up -d --build
→ verify
```

## Native Node

Supported CI runtimes: Node.js 22 and 24.

Typical native install:

```text
git clone
→ npm install
→ npm run build
→ node dist/server.js
```

Native Windows installs must also account for restart-after-reboot before being considered persistence-complete. If `npm install` unexpectedly falls back to native C++ compilation, stop and review the runtime/dependency path before installing a compiler toolchain.

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

`main` contains the current dogfood-ready alpha. Further changes should be driven by real agent usage wherever possible.

## License

License selection is pending before the first public release.
