# Architecture

## Purpose

Tasks Ops Tool is a headless task operations engine. It is intended to be useful on its own, beside an AI agent, or behind another application such as Taskel.

The core must remain application-agnostic.

## Design goals

1. Markdown can be the lowest common denominator.
2. Structured task state adds operational capability without making Markdown disposable.
3. IDs are canonical, while human-readable context snapshots make recovery and migration possible.
4. Agents should answer common operational questions through cheap deterministic queries before using semantic search.
5. Task history should emerge from normal task operations instead of requiring duplicate notes.
6. Parent/child tasks provide the primitive for subtasks and follow-ups.
7. Storage and adapters must be replaceable so the proven domain can later move into another application.

## Layers

```text
HTTP / agent client / application adapter
                |
                v
          Task operations
      create / mutate / query
                |
        +-------+--------+
        |                |
        v                v
    Attention         Activity
        |                |
        +-------+--------+
                |
                v
          Repository API
                |
                v
             SQLite

Markdown adapter <----> task operations
```

The domain layer must not import Taskel code, Fastify types, or SQLite-specific types.

## Task identity and recovery context

Canonical IDs are used for relationships when available:

- workspaceId
- containerId
- sourceNoteId
- parentTaskId

Human-readable names are stored as snapshots:

- workspaceName
- containerName
- sourceNoteTitle
- parentTaskTitle

Snapshot fields are not identity and should not silently retarget a task if a name changes. They exist for portability, diagnostics, search, and recovery.

## Markdown identity

A Markdown checkbox can exist before a structured task record exists:

```md
- [ ] Send updated specifications to Phoebe
```

After ingestion, the adapter may persist a stable task reference in Markdown:

```md
- [ ] Send updated specifications to Phoebe <!-- task:tsk_01... -->
```

The exact marker syntax remains intentionally small and parseable.

### Recovery cases

**Structured record exists + Markdown exists**

Normal reconciliation using the stable task ID and revision rules.

**Structured record exists + Markdown disappeared**

The task remains valid. Context snapshots preserve where it previously belonged and allow reassignment.

**Markdown exists + structured record disappeared**

The adapter recognizes the embedded ID as an orphan reference and can reconstruct a task from the checkbox text plus available note/container metadata. Recovery must create an explicit activity entry.

**Markdown checkbox has no task ID**

It is an unhydrated candidate task. The caller can choose to ingest it and write back an ID marker.

## Search strategy

Consumers should use the cheapest useful layer first:

1. structured filters: status, due date, assignee, container, waiting metadata
2. indexed tags
3. title/body text search
4. external semantic or knowledge search when necessary

Tags are therefore a lightweight semantic index, not merely visual labels.

## Parent tasks, subtasks, and follow-ups

All work items are normal tasks.

A child task may declare:

```text
parentTaskId
relationType = subtask | follow_up
```

This prevents the system from accumulating special workflow entities when a task relationship is sufficient.

A follow-up can have its own due date, assignee, status, tags, and history while the parent task continues to represent the broader outcome.

The parent timeline can project child activity, making ongoing work visible without pretending the main task itself changed state every time somebody was contacted.

## Attention

Attention is a computed view over task truth, not a separate task status.

Initial attention categories:

- overdue
- due soon
- waiting too long
- blocked
- urgent

The first product milestone is that an agent can reliably answer:

> What needs attention?

without searching arbitrary notes or relying on memory.

## Revision safety

Each task has an integer `revision`.

Mutations must eventually require the caller's expected revision. A successful mutation increments the revision. A stale mutation returns a conflict instead of silently overwriting newer state.

This behavior should remain consistent when the storage layer is later replaced.

## Initial non-goals

- UI
- Gantt
- sprint planning
- complex task dependencies
- multi-assignee tasks
- advanced recurrence
- webhook delivery infrastructure
- Taskel-specific database coupling
