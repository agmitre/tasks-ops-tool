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
- stdio MCP agent interface
- Docker/Compose deployment with persistent SQLite storage
- CI for typecheck, tests, and container build

No UI, Gantt, complex recurrence, or webhook system is required for this alpha.

## MCP agent interface

The MCP adapter is intentionally thin. It does not access SQLite and does not reimplement task rules. It calls the existing Tasks Ops HTTP API through the reusable client in `src/client/tasks-ops-client.ts`, so the task engine remains the single source of truth.

The first MCP surface is deliberately small:

```text
list_tasks
get_task
create_task
update_task
delete_task
get_task_activity
complete_task
wait_task
create_follow_up
get_attention
get_attention_details
ingest_markdown_tasks
```

Common agent actions such as completing, waiting, and creating follow-ups use the existing `/ops` intent endpoints, so callers do not need to perform revision read/update loops for normal operations.

### Run locally over stdio

The Tasks Ops HTTP service must already be running. Then configure the same bearer token for the MCP process and start:

```bash
npm run start:mcp
```

For development:

```bash
npm run dev:mcp
```

Environment:

```text
TASKS_OPS_URL=http://127.0.0.1:8787
TASKS_OPS_TOKEN=<operator-managed-secret>
```

`TASKS_OPS_URL` defaults to `http://127.0.0.1:8787` when omitted.

The intended local architecture is:

```text
agent
  │ MCP stdio
  ▼
Tasks Ops MCP adapter
  │ HTTP + bearer token
  ▼
Tasks Ops service
  ▼
SQLite
```

Agents should use MCP for supported task operations instead of shell commands, direct REST calls, temporary scripts, or direct database access. If a required operation is missing from MCP, report the missing capability rather than creating a bypass.

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

`main` contains the current dogfood-ready alpha. Further changes should be driven by real agent usage wherever possible.

## License

License selection is pending before the first public release.
