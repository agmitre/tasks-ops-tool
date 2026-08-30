import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { AgentOpsService } from '../agent/agent-ops.js';
import { TaskNotFoundError } from '../domain/task-service.js';

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const taskParamSchema = z.object({
  id: z.string().min(1),
});

const waitSchema = z.object({
  waitingOn: z.string().trim().min(1),
  dueDate: dateOnly.optional(),
  actor: z.string().trim().min(1).optional(),
});

const completeSchema = z.object({
  actor: z.string().trim().min(1).optional(),
});

const followUpSchema = z.object({
  title: z.string().trim().min(1).optional(),
  dueDate: dateOnly.optional(),
  assignedTo: z.string().trim().min(1).optional(),
  tags: z.array(z.string()).optional(),
  actor: z.string().trim().min(1).optional(),
});

const attentionSummaryQuerySchema = z.object({
  dueSoonDays: z.coerce.number().int().min(0).max(365).optional(),
  waitingDays: z.coerce.number().int().min(0).max(3650).optional(),
  includeDetails: z.coerce.boolean().optional(),
});

export function registerAgentRoutes(app: FastifyInstance, ops: AgentOpsService): void {
  app.post('/ops/tasks/:id/wait', async (request, reply) => {
    const params = taskParamSchema.safeParse(request.params);
    if (!params.success) return validationError(reply, params.error);

    const body = waitSchema.safeParse(request.body);
    if (!body.success) return validationError(reply, body.error);

    try {
      return reply.send(ops.wait({ taskId: params.data.id, ...body.data }));
    } catch (error) {
      return handleError(reply, error);
    }
  });

  app.post('/ops/tasks/:id/complete', async (request, reply) => {
    const params = taskParamSchema.safeParse(request.params);
    if (!params.success) return validationError(reply, params.error);

    const body = completeSchema.safeParse(request.body ?? {});
    if (!body.success) return validationError(reply, body.error);

    try {
      return reply.send(ops.complete({ taskId: params.data.id, ...body.data }));
    } catch (error) {
      return handleError(reply, error);
    }
  });

  app.post('/ops/tasks/:id/follow-up', async (request, reply) => {
    const params = taskParamSchema.safeParse(request.params);
    if (!params.success) return validationError(reply, params.error);

    const body = followUpSchema.safeParse(request.body ?? {});
    if (!body.success) return validationError(reply, body.error);

    try {
      return reply.code(201).send(ops.followUp({ taskId: params.data.id, ...body.data }));
    } catch (error) {
      return handleError(reply, error);
    }
  });

  app.get('/ops/attention', async (request, reply) => {
    const query = attentionSummaryQuerySchema.safeParse(request.query);
    if (!query.success) return validationError(reply, query.error);

    return reply.send(ops.attentionSummary(query.data));
  });
}

function validationError(reply: any, error: z.ZodError) {
  return reply.code(400).send({
    error: 'validation_error',
    details: error.flatten(),
  });
}

function handleError(reply: any, error: unknown) {
  if (error instanceof TaskNotFoundError) {
    return reply.code(404).send({ error: 'task_not_found', message: error.message });
  }

  throw error;
}
