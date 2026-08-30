# Task Ops Skill

Use Tasks Ops Tool as the structured source of truth for actionable work.

## Canonical agent interface

When Tasks Ops MCP is available, **MCP is the canonical interface for normal agent task work**.

Read [`MCP.md`](../../MCP.md) for the compact agent tool guide.

Use MCP tools directly. Do not inspect implementation files, call REST endpoints, use PowerShell/curl, access SQLite, or create temporary scripts for operations already supported by MCP.

If an operation is missing or an MCP tool is inadequate, stop and report the missing capability or required improvement instead of building a bypass.

REST/API details remain valid for service development, diagnostics, integration work, and MCP implementation, but they are not the default operating path for agents once MCP is wired.

## Goal

Maintain tasks deliberately and use cheap deterministic task queries before searching broader notes or memory.

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
- things to remember because an action is required
- bugs and recurring failures to investigate
- improvements to revisit
- waiting items
- follow-ups
- maintenance
- completed operational history

Keep factual knowledge, long-form notes, procedures, domain references, and reasoning in the agent's proper knowledge/memory system.

When a task originates from another durable system, preserve a stable source reference when available. `sourceNoteId` is intentionally generic and may identify OpenClaw memory, a repository issue, a Taskel note, another database record, or another durable source.

Current workspace/container fields are context namespaces rather than separately managed entities. Do not assume workspace/container CRUD exists.

## Preferred MCP read strategy

Use the cheapest useful tool first:

1. `get_attention` for heartbeat/proactive attention checks
2. `list_tasks` with structured filters
3. tags
4. text query via `list_tasks`
5. `get_task` only when full canonical task state is needed
6. broader note/semantic search only if task queries are insufficient

Use `get_attention_details` only when the compact attention result is insufficient.

## Preferred MCP write strategy

Prefer intent tools for common operations:

- waiting: `wait_task`
- complete: `complete_task`
- follow-up: `create_follow_up`

Use `update_task` for edits that do not map to a supported intent.

Use `delete_task` only for true removal or cleanup, never normal completion.

Use the fewest MCP calls needed. Do not fetch a task first when the intent tool already safely performs the requested operation.

## Waiting behavior

When the next meaningful move belongs to an external person/system, update the existing task to waiting instead of creating a duplicate task.

Set `waitingOn` to a concise stable name when known.

A follow-up is appropriate when a new concrete action must occur while the broader parent outcome remains open.

Example:

- parent: `Resolve controller integration requirements`
- child follow-up: `Follow up with Phoebe on unanswered voltage question`

The parent may remain `in_progress` while follow-up children show continuing work.

## Markdown behavior

Markdown task checkboxes may be ingested through `ingest_markdown_tasks`.

A naked checkbox:

```md
- [ ] Send specifications
```

may be returned with a stable task marker.

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

Tags should represent useful semantic lookup dimensions such as a customer, project, integration, domain, subsystem, or issue family.

## Attention behavior

Treat `get_attention` as a signal to inspect, not an instruction to notify the user about everything.

Prioritize actionable exceptions such as:

- overdue work
- due-soon work requiring preparation
- long waits that merit follow-up
- blockers
- urgent work

Avoid repeatedly surfacing an unchanged item unless its age, deadline, or context makes renewed attention useful.

## Activity history

Use `get_task_activity` when understanding progress or follow-up history matters.

Do not duplicate routine state transitions into separate notes just to preserve history; task activity exists for that purpose.

## Failure rule

If an MCP tool fails:

1. Read the returned error.
2. Retry only if the failure is clearly transient and retrying is safe.
3. If a capability is missing, inadequate, or consistently broken, stop and report it.
4. Do not bypass MCP with REST, PowerShell, curl, direct SQLite access, temporary code, or alternate task stores unless the operator explicitly requests diagnostic/development work.

## Safety rules

- Do not delete tasks merely because they are finished; use `done` or `cancelled`.
- Do not create duplicate tasks when an existing task can be updated.
- Do not create a follow-up unless it represents a concrete next action.
- Never expose or persist bearer tokens in task data, notes, logs, source control, or durable memory.
- Do not migrate an entire knowledge base into Task Ops just because it is available; keep Task Ops focused on operational state.
