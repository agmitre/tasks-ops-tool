# Agent Installation and Operating Guide

This repository is designed to be installable and usable by an AI agent with minimal operator intervention.

## Installation goal

Install Tasks Ops Tool as a small local service with persistent storage, then use `skills/task-ops/SKILL.md` as the operating contract.

## Installation decision tree

Prefer the path with the fewest host changes.

1. **Docker already available:** use Docker Compose. This is the preferred long-running deployment.
2. **Docker not available, Node.js 22 or 24 already available:** use the native Node path.
3. **Neither Docker nor a supported Node runtime is available:** tell the operator what is missing before installing a large runtime/toolchain.

Do **not** silently install Python, Visual Studio Build Tools, C++ workloads, Docker Desktop, service managers, or other large host dependencies just to make installation continue. If `npm install` attempts native compilation instead of using a prebuilt package, stop and report the problem before adding a compiler toolchain. Prefer switching to a supported runtime/container path first.

The project currently validates Node.js 22 and 24 in CI.

Recommended characteristics for a long-running agent host:

- persistent storage
- local/private network exposure where practical
- bearer authentication enabled
- automatic restart after host reboot

## Optional agent-internal workspace

Tasks Ops Tool does not require Taskel or any specific notes application.

An agent may use task context as its own operational namespace for actionable work that would otherwise be scattered across reminder files, scratch notes, bug lists, and repeated memory scans.

A recommended pattern is:

```text
workspaceId: agent_internal
workspaceName: Agent Internal

logical containers:
- todo / Todo
- waiting / Waiting
- bugs / Bugs
- improvements / Improvements
- followups / Follow-ups
- maintenance / Maintenance
```

These are conventions, not required fixed names. Keep IDs stable once chosen.

Use this internal workspace for actionable or stateful items such as work the operator asked the agent to perform, reminders that require future action, bugs, improvements, waiting items, follow-ups, maintenance work, and completed operational history.

Do not move the agent's entire knowledge base into Tasks Ops Tool. Facts, reference material, long-form notes, and durable domain knowledge should remain in the agent's knowledge system.

When useful, link a task back to the agent's own knowledge using `sourceNoteId` / `sourceNoteTitle`. The source ID is intentionally generic and may refer to OpenClaw memory, a repository issue, another task system, a note database, Taskel, or any other stable source the agent understands.

Example source ID:

```text
openclaw:memory:ollama-startup
```

Treat source references as links, not copies of the entire source knowledge.

Current workspace/container fields are task context namespaces. They are not yet separately managed workspace/container records, so use stable IDs and names consistently rather than assuming workspace CRUD exists.

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

## Docker Compose - preferred when Docker exists

The repository includes `compose.yml`.

The compose definition expects `TASKS_OPS_TOKEN` to already be available to Compose through the host environment or an external `.env` file that is not committed.

Persistent task data is stored in the `tasks_ops_data` volume. Default service port: `8787`.

Typical flow:

```text
git clone
→ configure TASKS_OPS_TOKEN outside Git
→ docker compose up -d --build
→ verify /health, /status, /ops/attention
```

Do not install Docker automatically merely because this is the preferred path. If Docker is absent and Node 22/24 is already present, native Node may be the smaller host change.

## Native Node installation

Requirements:

- Node.js 22 or 24
- npm

Normal flow:

```text
git clone
→ npm install
→ npm run build
→ node dist/server.js
```

Runtime values:

```text
HOST=0.0.0.0
PORT=8787
TASKS_OPS_DB=<persistent path>/tasks-ops.sqlite
TASKS_OPS_TOKEN=<operator-managed secret>
```

`better-sqlite3` is pinned to a current release intended to support current Node runtimes. If installation falls back to C++ compilation and the machine does not already have a compiler toolchain, stop and report it rather than automatically installing Python/MSVC/build tools.

`TASKS_OPS_AUTH_DISABLED=true` exists only for explicit trusted local development. Do not use it for normal agent deployment.

### Native Windows persistence

A manually started `node dist/server.js` process is **not a complete long-running installation** because it will disappear after reboot or process failure.

Before declaring installation complete, either use an existing operator-approved process/service manager or propose a built-in Windows Scheduled Task/startup configuration that starts the service after reboot.

Do not silently install PM2, NSSM, or another process manager solely for this purpose. If no persistence mechanism is already approved, report the gap to the operator.

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

After installation, configure the agent with the service base URL, runtime access to `TASKS_OPS_TOKEN`, and the operating instructions in `skills/task-ops/SKILL.md`.

For heartbeat behavior, call `/ops/attention` first and fetch full tasks only when the summary indicates something requires interpretation.

If the agent uses an internal workspace, make that namespace part of its durable operating configuration so it does not invent a new workspace/container naming scheme each session.

## Updating

Because the tool is public, an agent may pull new tagged/public releases automatically if the operator permits software updates.

Updates must preserve the persistent data volume/database and must never overwrite or publish the operator's token.

Before an update, check release notes or migration guidance when available.

## Installation report

An installing agent should report at minimum:

- deployment method used: Docker or native Node
- runtime/version
- service URL
- persistent database/volume location
- authentication configured without exposing the token
- reboot/auto-restart behavior
- any host packages or runtimes it installed
- any deviations from the documented install path

A service that only runs in the current shell/background process should be reported as **running but not persistence-complete**.

## Recovery principle

The service is intentionally designed so structured task state, human-readable context snapshots, and Markdown task markers can help reconstruct one another after partial data loss.

Do not remove Markdown task markers or context snapshots as cleanup unless the domain contract explicitly changes.
