import { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import type { TaskOpsClient } from '../../client/tasks-ops-client.js';
import { withTaskOpsTool } from './define-task-ops-tool.js';

const contextSchema = z.object({
  workspaceId: z.string().min(1).optional(),
  workspaceName: z.string().min(1).optional(),
  containerId: z.string().min(1).optional(),
  containerName: z.string().min(1).optional(),
  sourceNoteId: z.string().min(1).optional(),
  sourceNoteTitle: z.string().min(1).optional(),
}).optional();

export function registerMarkdownTools(server: McpServer, client: TaskOpsClient): void {
  server.registerTool('ingest_markdown_tasks', {
    title: 'Ingest Markdown tasks',
    description: 'Recognize Markdown checkboxes, add stable task markers, and recover missing structured tasks without overwriting existing task truth.',
    inputSchema: z.object({
      markdown: z.string(),
      context: contextSchema,
      tags: z.array(z.string()).optional(),
      actor: z.string().trim().min(1).optional(),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  }, withTaskOpsTool('ingest_markdown_tasks', (args) => client.markdown.ingest(args)));
}
