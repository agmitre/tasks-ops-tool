import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { loadMcpConfig } from './config.js';
import { createMcpServer } from './server.js';

const config = loadMcpConfig();
console.error(JSON.stringify({ event: 'tasks_ops.mcp.start', transport: 'stdio', apiUrl: config.apiUrl }));
void serveStdio(() => createMcpServer(config));
