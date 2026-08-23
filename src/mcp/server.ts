import { McpServer } from '@modelcontextprotocol/server';
import { createTaskOpsClient } from '../client/tasks-ops-client.js';
import type { McpConfig } from './config.js';
import { registerAttentionTools } from './tools/attention.js';
import { registerMarkdownTools } from './tools/markdown.js';
import { registerOperationTools } from './tools/operations.js';
import { registerTaskTools } from './tools/tasks.js';

export function createMcpServer(config: McpConfig): McpServer {
  const client = createTaskOpsClient({
    baseUrl: config.apiUrl,
    token: config.apiToken,
  });

  const server = new McpServer({
    name: 'tasks-ops',
    version: '0.1.0-alpha.0',
  });

  registerTaskTools(server, client);
  registerOperationTools(server, client);
  registerAttentionTools(server, client);
  registerMarkdownTools(server, client);

  return server;
}
