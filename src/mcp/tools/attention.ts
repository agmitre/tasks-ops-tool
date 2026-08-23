import { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import type { TaskOpsClient } from '../../client/tasks-ops-client.js';
import { withTaskOpsTool } from './define-task-ops-tool.js';

const optionsSchema = z.object({
  dueSoonDays: z.number().int().min(0).max(365).optional(),
  waitingDays: z.number().int().min(0).max(3650).optional(),
});

export function registerAttentionTools(server: McpServer, client: TaskOpsClient): void {
  server.registerTool('get_attention', {
    title: 'Get task attention summary',
    description: 'Get the compact heartbeat-oriented attention summary first. Fetch task details only for IDs that require interpretation.',
    inputSchema: optionsSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, withTaskOpsTool('get_attention', (args) => client.attention.summary(args)));

  server.registerTool('get_attention_details', {
    title: 'Get detailed task attention',
    description: 'Get full overdue, due-soon, waiting-too-long, blocked, and urgent task projections when the compact summary is insufficient.',
    inputSchema: optionsSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, withTaskOpsTool('get_attention_details', (args) => client.attention.full(args)));
}
