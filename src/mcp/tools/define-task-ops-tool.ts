import { randomUUID } from 'node:crypto';
import { TaskOpsClientError } from '../../client/tasks-ops-client.js';

export const withTaskOpsTool = <TArgs>(tool: string, handler: (args: TArgs) => Promise<unknown>) => async (args: TArgs) => {
  const correlationId = randomUUID();
  const startedAt = Date.now();

  try {
    const data = await handler(args);
    const output = { data, correlationId, durationMs: Date.now() - startedAt };
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(output) }],
      structuredContent: output,
    };
  } catch (error) {
    const output = error instanceof TaskOpsClientError
      ? {
          error: {
            code: error.code ?? 'TASKS_OPS_API_ERROR',
            message: error.message,
            status: error.status,
            details: error.payload,
          },
          correlationId,
        }
      : {
          error: {
            code: 'MCP_INTERNAL_ERROR',
            message: error instanceof Error ? error.message : 'Unexpected MCP tool error',
          },
          correlationId,
        };

    console.error(JSON.stringify({ event: 'tasks_ops.mcp.tool.error', tool, ...output }));
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(output) }],
      structuredContent: output,
      isError: true,
    };
  }
};
