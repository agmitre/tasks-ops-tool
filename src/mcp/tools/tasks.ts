import { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import type { TaskOpsClient } from '../../client/tasks-ops-client.js';
import { TASK_PRIORITIES, TASK_RELATION_TYPES, TASK_STATUSES } from '../../domain/task.js';
import { withTaskOpsTool } from './define-task-ops-tool.js';

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const isoTimestamp = z.string().datetime({ offset: true });
const contextSchema = z.object({
  workspaceId: z.string().min(1).optional(),
  workspaceName: z.string().min(1).optional(),
  containerId: z.string().min(1).optional(),
  containerName: z.string().min(1).optional(),
  sourceNoteId: z.string().min(1).optional(),
  sourceNoteTitle: z.string().min(1).optional(),
}).optional();

const createSchema = z.object({
  title: z.string().trim().min(1),
  body: z.string().optional(),
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  dueDate: dateOnly.optional(),
  tags: z.array(z.string()).optional(),
  assignedTo: z.string().min(1).optional(),
  waitingOn: z.string().min(1).optional(),
  parentTaskId: z.string().min(1).optional(),
  parentTaskTitle: z.string().min(1).optional(),
  relationType: z.enum(TASK_RELATION_TYPES).optional(),
  context: contextSchema,
  actor: z.string().min(1).optional(),
});

const updateSchema = createSchema.partial().extend({
  taskId: z.string().min(1),
  revision: z.number().int().positive(),
});

const listSchema = z.object({
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  dueBefore: dateOnly.optional(),
  dueAfter: dateOnly.optional(),
  createdAfter: isoTimestamp.optional(),
  updatedAfter: isoTimestamp.optional(),
  assignedTo: z.string().optional(),
  tag: z.string().optional(),
  workspaceId: z.string().optional(),
  containerId: z.string().optional(),
  sourceNoteId: z.string().optional(),
  waitingOn: z.string().optional(),
  parentTaskId: z.string().optional(),
  q: z.string().min(1).optional(),
});

const idSchema = z.object({ taskId: z.string().min(1) });
const idsSchema = z.object({ taskIds: z.array(z.string().min(1)).min(1).max(100) });

export function registerTaskTools(server: McpServer, client: TaskOpsClient): void {
  server.registerTool('list_tasks', {
    title: 'List Tasks Ops tasks',
    description: 'List tasks using structured filters, Taskel context IDs, recency filters, or lightweight text search. Prefer structured filters before q.',
    inputSchema: listSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, withTaskOpsTool('list_tasks', (args) => client.tasks.list(args)));

  server.registerTool('get_task', {
    title: 'Get Tasks Ops task',
    description: 'Get one canonical task including its current revision.',
    inputSchema: idSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, withTaskOpsTool('get_task', ({ taskId }) => client.tasks.get(taskId)));

  server.registerTool('get_tasks', {
    title: 'Get multiple Tasks Ops tasks',
    description: 'Get up to 100 canonical tasks in one call. Returns found tasks plus missing task IDs.',
    inputSchema: idsSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, withTaskOpsTool('get_tasks', ({ taskIds }) => client.tasks.getMany(taskIds)));

  server.registerTool('create_task', {
    title: 'Create Tasks Ops task',
    description: 'Create a durable operational task. If assignedTo is omitted and actor is supplied, the task defaults to that actor.',
    inputSchema: createSchema,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  }, withTaskOpsTool('create_task', (args) => client.tasks.create(args)));

  server.registerTool('update_task', {
    title: 'Update Tasks Ops task',
    description: 'Revision-safe canonical task update. For common agent intents, prefer complete_task or wait_task.',
    inputSchema: updateSchema,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  }, withTaskOpsTool('update_task', ({ taskId, ...input }) => client.tasks.update(taskId, input)));

  server.registerTool('delete_task', {
    title: 'Delete Tasks Ops task',
    description: 'Permanently delete a task. Prefer completion or cancellation for normal workflow.',
    inputSchema: idSchema,
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
  }, withTaskOpsTool('delete_task', ({ taskId }) => client.tasks.remove(taskId)));

  server.registerTool('get_task_activity', {
    title: 'Get task activity',
    description: 'Read automatic activity history for a task.',
    inputSchema: idSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, withTaskOpsTool('get_task_activity', ({ taskId }) => client.tasks.activity(taskId)));
}
