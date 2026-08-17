# Tasks Ops Tool

A headless, Markdown-first task operations service for humans, agents, and apps.

Tasks Ops Tool is designed as a small, portable task engine that can run beside an AI agent or application and provide durable task state, attention queries, activity history, and Markdown recovery without requiring a UI.

## Principles

- **Markdown-first**: a task can originate as a simple Markdown checkbox and remain recoverable from Markdown.
- **Structured when available**: IDs, status, due dates, tags, relationships, and history add operational power without replacing the Markdown source.
- **Recovery-safe**: human-readable context is stored alongside canonical IDs so records remain understandable and reconstructable if one side of an integration disappears.
- **Revision-safe**: writes are explicit and protected against stale updates.
- **Agent-friendly**: lightweight filtered queries should answer operational questions without requiring expensive semantic search.
- **Portable**: the core service stays application-agnostic. Taskel is a first-class future consumer, not a hard dependency.

## Early goals

The first milestone is intentionally small: make it possible for an agent to reliably answer **“What needs attention?”** from structured task state.

Planned v0.1 scope:

- task CRUD
- parent/child task relationships
- status, priority, due date, waiting metadata, and tags
- source/container recovery context
- revision-safe mutation
- automatic activity history
- follow-up tasks
- Markdown checkbox recognition and stable task IDs
- recovery of missing structured tasks from Markdown
- lightweight filtered queries
- attention queries for overdue, due-soon, blocked, urgent, and long-waiting work

No UI, Gantt, complex recurrence, or webhook system is required for the first release.

## Status

Early architecture and implementation work is happening on `develop/core`.

## License

License selection is pending before the first public release.
