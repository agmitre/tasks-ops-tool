# v0.1 Alpha Dogfood Milestone

This milestone marks the point where Tasks Ops Tool is intended to be installed beside a real agent and used for day-to-day task operations.

## Ready for dogfooding

- persistent SQLite task store
- revision-safe canonical task mutation
- task status, priority, due dates, waiting metadata, tags, and recovery context
- parent tasks, subtasks, and follow-ups
- automatic activity history
- deterministic task timelines
- structured filters and lightweight text search
- full and compact attention views
- Markdown task hydration and orphan recovery
- agent intent endpoints
- bearer-token authentication with fail-closed startup
- Docker/Compose deployment
- agent installation guide and operating skill
- CI covering typecheck, tests, and container build

## Dogfood objective

A real agent should be able to answer:

> What needs attention?

and maintain task state without relying on arbitrary note search or conversational memory.

## What to observe

During dogfooding, record friction rather than immediately adding speculative features.

High-value signals include:

- repeated manual query patterns
- fields the agent repeatedly wishes existed
- duplicate task creation
- unclear waiting/follow-up behavior
- attention items that are noisy or repeatedly ignored
- task relationships the current parent/follow-up model cannot express
- Markdown reconciliation edge cases
- search queries that frequently fall through to expensive semantic search
- operational actions that repeatedly require raw PATCH instead of an intent endpoint

## Deliberately deferred

- webhooks
- complex recurrence
- Gantt/timeline UI
- Kanban/sprints
- advanced dependencies
- multi-assignee tasks
- contacts/person registry
- semantic/vector search inside the service

Those should be reconsidered after real usage provides evidence.
