import Fastify from 'fastify';
import { AgentOpsService } from './agent/agent-ops.js';
import { registerAgentRoutes } from './api/agent-routes.js';
import { registerAuth } from './api/auth.js';
import { registerTaskRoutes } from './api/routes.js';
import { TaskService } from './domain/task-service.js';
import { openDatabase } from './storage/database.js';
import { TaskRepository } from './storage/task-repository.js';

const app = Fastify({ logger: true });
const db = openDatabase();
const repository = new TaskRepository(db);
const taskService = new TaskService(repository);
const agentOps = new AgentOpsService(taskService);

app.addHook('onClose', async () => {
  db.close();
});

registerAuth(app);

app.get('/health', async () => ({
  ok: true,
  service: 'tasks-ops-tool',
}));

app.get('/status', async () => ({
  name: 'tasks-ops-tool',
  version: '0.1.0-alpha.0',
  auth: process.env.TASKS_OPS_AUTH_DISABLED === 'true' ? 'disabled' : 'bearer',
  capabilities: [
    'task_crud',
    'revision_safe_mutation',
    'task_relations',
    'activity_log',
    'attention_queries',
    'filtered_task_queries',
    'task_text_search',
    'markdown_task_markers',
    'markdown_ingest',
    'markdown_recovery',
    'agent_task_intents',
    'agent_attention_summary',
    'bearer_token_auth',
  ],
}));

registerTaskRoutes(app, taskService);
registerAgentRoutes(app, agentOps);

const port = Number(process.env.PORT ?? 8787);
const host = process.env.HOST ?? '0.0.0.0';

try {
  await app.listen({ port, host });
} catch (error) {
  app.log.error(error);
  db.close();
  process.exit(1);
}
