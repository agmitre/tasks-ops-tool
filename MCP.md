# Tasks Ops MCP

This is the normal agent interface for Tasks Ops Tool.

If MCP is available, use these tools directly. Do not inspect source code, call the REST API, use PowerShell/curl, access SQLite, or write temporary scripts just to perform supported task operations.

If a required operation is not supported by MCP, stop and report the missing capability or improvement needed instead of creating a bypass.

## Normal tools

### Read

- `get_attention` — cheap first check for overdue, due-soon, long-waiting, blocked, and urgent work.
- `get_attention_details` — full attention records when the compact summary is not enough.
- `list_tasks` — find tasks using structured filters, tags, or text query.
- `get_task` — read one canonical task.
- `get_task_activity` — inspect task history when needed.

### Write

- `create_task` — create new actionable work.
- `update_task` — edit task fields that do not have a simpler intent tool.
- `complete_task` — mark a task done. Prefer this over `update_task` for completion.
- `wait_task` — mark a task waiting on someone/something. Prefer this over `update_task` for waiting.
- `create_follow_up` — create a follow-up child task. Prefer this over manually creating a related task.
- `ingest_markdown_tasks` — ingest Markdown checkboxes and preserve/recover stable task markers.
- `delete_task` — destructive cleanup only. Do not use for normal completion.

## Preferred behavior

Use the fewest MCP calls needed.

Typical flows:

```text
"What needs attention?"
→ get_attention

"Show my waiting OutdoorLink tasks"
→ list_tasks

"Mark task X complete"
→ complete_task

"We're waiting on Phoebe for task X"
→ wait_task

"Follow up with Phoebe next Tuesday"
→ create_follow_up

"Change the due date on task X"
→ get_task only if current state is needed
→ update_task
```

Do not read implementation files to discover normal usage. Tool names, descriptions, schemas, this file, and the Task Ops skill are the operating contract.

## Task discipline

- Tasks Ops is the structured source of truth for actionable work.
- Update an existing task instead of creating duplicates.
- Use `done` or `cancelled` for normal lifecycle completion, not deletion.
- Use waiting when the next move belongs to another person/system.
- Create a follow-up only for a concrete next action.
- Keep factual knowledge and long-form notes in the appropriate knowledge system, not Tasks Ops.
- Preserve stable source/context IDs when available.

## Attention checks

For heartbeat/proactive checks, start with `get_attention`.

Only read full tasks when the summary shows something that requires interpretation or action. Do not repeatedly surface unchanged attention items without a useful reason.

## Failure rule

If an MCP tool fails:

1. Read the returned error.
2. Retry only when the failure is clearly transient and retrying is safe.
3. If the tool is missing, inadequate, or consistently failing, stop and report the exact limitation.
4. Do not bypass MCP with REST, PowerShell, curl, SQLite, generated scripts, or alternate state stores unless the operator explicitly asks for diagnostic/development work.

The desired outcome is simple: routine task work should normally be one or a few MCP calls, not a coding exercise.
