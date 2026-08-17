# API

Default development port: `8787`.

## Service

### `GET /health`

Liveness check.

### `GET /status`

Returns service version and current capabilities.

## Tasks

### `POST /tasks`

Create a task.

Example body:

```json
{
  "title": "Follow up with Phoebe",
  "status": "waiting",
  "priority": "high",
  "dueDate": "2026-08-20",
  "tags": ["outdoorlink", "chainzone"],
  "waitingOn": "Phoebe",
  "actor": "bryan",
  "context": {
    "workspaceId": "ws_tembok",
    "workspaceName": "Tembok",
    "containerId": "cnt_integrations",
    "containerName": "OutdoorLink / Integrations",
    "sourceNoteId": "note_chainzone",
    "sourceNoteTitle": "Chainzone VCS200"
  }
}
```

The service assigns an ID and starts `revision` at `1` unless an explicit recovery ID is supplied.

### `GET /tasks`

Lightweight task list with combinable filters.

Supported query parameters:

- `status`
- `priority`
- `dueBefore`
- `dueAfter`
- `assignedTo`
- `tag`
- `containerId`
- `waitingOn`
- `parentTaskId`
- `q`

Examples:

```text
GET /tasks?status=waiting&waitingOn=Phoebe
GET /tasks?tag=chainzone&status=waiting
GET /tasks?containerId=cnt_integrations&dueBefore=2026-08-20
GET /tasks?q=VCS200
```

Search should normally escalate in this order:

1. structured filters
2. tags
3. `q` text search across task/context text
4. external semantic search if necessary

### `GET /tasks/:id`

Return one task.

### `PATCH /tasks/:id`

Revision-safe mutation. The current `revision` is required.

```json
{
  "revision": 3,
  "status": "waiting",
  "waitingOn": "Phoebe",
  "actor": "bryan"
}
```

Successful mutation increments the revision. A stale mutation returns HTTP `409`:

```json
{
  "error": "revision_conflict",
  "expectedRevision": 3,
  "currentRevision": 4
}
```

Entering `waiting` automatically records `waitingSince` when none is supplied. Entering `done` automatically records `completedAt`.

### `DELETE /tasks/:id`

Delete a task. Intended for true removal, not normal completion. Normal workflow should use `done` or `cancelled`.

## Parent tasks and follow-ups

A follow-up is a normal task with a relationship:

```json
{
  "title": "Follow up with Phoebe again",
  "parentTaskId": "tsk_parent",
  "parentTaskTitle": "Resolve Chainzone integration questions",
  "relationType": "follow_up",
  "dueDate": "2026-08-21"
}
```

Parent references are intentionally soft. A child can survive even if its parent record is temporarily missing, allowing later recovery/reconciliation from IDs and context snapshots.

## Activity

### `GET /tasks/:id/activity`

Returns automatic task history, currently including:

- `created`
- `updated`
- `status_changed`
- `follow_up_created`
- `recovered_from_markdown` (reserved for the Markdown recovery pass)

## Attention

### `GET /attention`

Computed operational view over active tasks.

Optional parameters:

- `dueSoonDays`, default `3`
- `waitingDays`, default `5`

Returns:

```json
{
  "generatedAt": "2026-08-17T12:00:00.000Z",
  "overdue": [],
  "dueSoon": [],
  "waitingTooLong": [],
  "blocked": [],
  "urgent": []
}
```

Attention is not task state. It is a projection over existing task truth so agents can cheaply answer what currently needs attention.
