# Task Ops Skill

Use Tasks Ops Tool as the structured source of truth for actionable work.

## Goal

Maintain tasks deliberately and use cheap deterministic task queries before searching broader notes or memory.

## Authentication

Read `GET /status` and `GET /health` without authentication for discovery and liveness.

All task, attention, activity, agent-op, and Markdown endpoints require:

```http
Authorization: Bearer <TASKS_OPS_TOKEN>
```

Treat `TASKS_OPS_TOKEN` as an operator-managed secret.

- Read it from the runtime environment or an approved secret store.
- Never write the token into this repository, Markdown notes, task bodies, durable agent memory, logs, examples, or generated documentation.
- Never echo the full token back to the operator.
- Never commit a `.env` file containing the token.
- If the token is absent, ask the operator to configure it on the host rather than inventing a persistent secret location.
- Token rotation should require only changing the host secret and restarting the service/client environment.

## Service discovery

Read `GET /status` before assuming a capability exists.

Use `GET /health` only for liveness.

## Core behavior

Distinguish these concepts:

- **note**: information worth remembering
- **task**: an explicit actionable outcome
- **waiting**: a task whose next move currently belongs to someone or something else
- **follow-up**: a child task representing a concrete next action on a broader parent outcome
- **attention**: a computed signal that an existing task needs awareness; it is not a task status

Do not create tasks for every fact or sentence in a note.

## Agent-internal operational workspace

Tasks Ops Tool may be used independently from Taskel or any other notes application.

If this agent currently stores actionable work across scratch files, TODO documents, bug lists, reminder notes, or repeated memory scans, prefer a stable agent-owned Task Ops namespace for that operational state.

A recommended convention is:

```text
workspaceId: agent_internal
workspaceName: Agent Internal
```

Then use stable logical container IDs/names for categories that are genuinely useful, for example:

```text
todo / Todo
waiting / Waiting
bugs / Bugs
improvements / Improvements
followups / Follow-ups
maintenance / Maintenance
```

Do not create a new workspace/container naming scheme each session. Reuse the established namespace.

Use this workspace for actionable and stateful items, not as a replacement for the agent's knowledge base.

Appropriate:

- operator-requested work
- things to remember **because an action is required**
- bugs and recurring failures to investigate
- improvements to revisit
- waiting items
- follow-ups
- maintenance
- completed operational history

Keep factual knowledge, long-form notes, procedures, domain references, and reasoning in the agent's proper knowledge/memory system.

When a task originates from the agent's own knowledge, preserve a stable source reference when available. `sourceNoteId` is intentionally generic and may identify OpenClaw memory, a repository issue, a Taskel note, another database record, or another durable source.

Example:

```text
sourceNoteId: openclaw:memory:ollama-startup
sourceNoteTitle: Ollama startup investigation
```

The task should reference the knowledge source rather than duplicate its entire contents.

Current workspace/container fields are context namespaces rather than separately managed entities. Do not assume workspace/container CRUD exists.

## Preferred read strategy

Use the cheapest useful query first:

1. structured filters on `GET /tasks`
2. tags
3. `q` text search
4. broader note/semantic search only if task queries are insufficient

For heartbeat or proactive checks, call `GET /ops/attention` first. Fetch full task records only for returned IDs that require interpretation or action.

## Preferred write strategy

Use intent endpoints for common operations:

- waiting: `POST /ops/tasks/:id/wait`
- complete: `POST /ops/tasks/:id/complete`
- follow-up: `POST /ops/tasks/:id/follow-up`

Use canonical `PATCH /tasks/:id` for edits that do not map to a supported intent. Canonical PATCH is revision-safe and requires the current task revision.

Never retry a `409 revision_conflict` by blindly resending stale state. Re-read the task, compare the newer state, then reconcile deliberately.

## Waiting behavior

When the next meaningful move belongs to an external person/system, update the existing task to `waiting` instead of creating a duplicate task.

Set `waitingOn` to a concise stable name when known.

A follow-up is appropriate when a new concrete action must occur while the broader parent outcome remains open.

Example:

- parent: `Resolve controller integration requirements`
- child follow-up: `Follow up with Phoebe on unanswered voltage question`

The parent may remain `in_progress` while follow-up children show continuing work.

## Markdown behavior

Markdown task checkboxes may be ingested through `POST /markdown/ingest`.

A naked checkbox:

```md
- [ ] Send specifications
```

may be returned as:

```md
- [ ] Send specifications <!-- task:tsk_... -->
```

Preserve task markers when editing Markdown.

If a surviving marker points to a missing structured task, Markdown ingest can reconstruct the record using the checkbox text and supplied context snapshot.

Do not remove task markers merely because a structured lookup temporarily fails.

## Context and recovery

IDs are authoritative when present. Human-readable names are recovery/context snapshots.

Preserve useful context when creating tasks:

- workspace ID and name
- container ID and name
- source note/source record ID and title
- parent task ID and title

Do not silently retarget a task based only on a matching name.

## Tags

Use a small number of durable tags that materially improve retrieval. Avoid generating many near-duplicate tags.

Prefer existing tags when available.

Tags are normalized by the service and should represent useful semantic lookup dimensions such as a customer, project, integration, domain, subsystem, or issue family.

## Attention behavior

Treat `/ops/attention` as a signal to inspect, not an instruction to notify the user about everything.

Prioritize actionable exceptions such as:

- overdue work
- due-soon work requiring preparation
- long waits that merit follow-up
- blockers
- urgent work

Avoid repeatedly surfacing an unchanged item unless its age, deadline, or context makes renewed attention useful.

## Activity history

Use `GET /tasks/:id/activity` when understanding progress or follow-up history matters.

Do not duplicate routine state transitions into separate notes just to preserve history; task activity exists for that purpose.

## Safety rules

- Do not delete tasks merely because they are finished; use `done` or `cancelled`.
- Use DELETE only for true removal or cleanup.
- Do not overwrite a newer revision with stale state.
- Do not create duplicate tasks when an existing task can be updated.
- Do not create a follow-up unless it represents a concrete next action.
- Never expose or persist the bearer token in task data, notes, logs, or source control.
- Do not migrate an entire knowledge base into Task Ops just because it is available; keep Task Ops focused on operational state.
