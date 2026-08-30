import { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import type { TaskOpsClient } from '../../client/tasks-ops-client.js';
import { withTaskOpsTool } from './define-task-ops-tool.js';

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const actor = z.string().trim().min(1).optional();

export function registerOperationTools(server: McpServer, client: TaskOpsClient): void {
  server.registerTool('complete_task', {
    title: 'Complete task',
    description: 'Complete an existing task using the engine intent operation. No revision lookup is required.',
    inputSchema: z.object({ taskId: z.string().min(1), actor }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, withTaskOpsTool('complete_task', ({ taskId, actor }) => client.ops.complete(taskId, { actor })));

  server.registerTool('wait_task', {
    title: 'Mark task waiting',
    description: 'Mark an existing task as waiting using the engine intent operation. No revision lookup is required.',
    inputSchema: z.object({
      taskId: z.string().min(1),
      waitingOn: z.string().trim().min(1),
      dueDate: dateOnly.optional(),
      actor,
    }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, withTaskOpsTool('wait_task', ({ taskId, ...input }) => client.ops.wait(taskId, input)));

  server.registerTool('create_follow_up', {
    title: 'Create follow-up task',
    description: 'Create a child follow-up task inheriting parent context and tags unless explicitly overridden.',
    inputSchema: z.object({
      taskId: z.string().min(1),
      title: z.string().trim().min(1).optional(),
      dueDate: dateOnly.optional(),
      assignedTo: z.string().trim().min(1).optional(),
      tags: z.array(z.string()).optional(),
      actor,
    }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  }, withTaskOpsTool('create_follow_up', ({ taskId, ...input }) => client.ops.followUp(taskId, input)));
}
