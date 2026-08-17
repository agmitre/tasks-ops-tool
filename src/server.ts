import Fastify from 'fastify';

const app = Fastify({ logger: true });

app.get('/health', async () => ({
  ok: true,
  service: 'tasks-ops-tool',
}));

app.get('/status', async () => ({
  name: 'tasks-ops-tool',
  version: '0.1.0-alpha.0',
  capabilities: [
    'task_crud_planned',
    'revision_safe_mutation_planned',
    'task_relations_planned',
    'activity_log_planned',
    'attention_queries_planned',
    'markdown_task_markers',
    'markdown_recovery_planned',
  ],
}));

const port = Number(process.env.PORT ?? 8787);
const host = process.env.HOST ?? '0.0.0.0';

try {
  await app.listen({ port, host });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
