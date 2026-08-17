import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  TASK_PRIORITIES,
  TASK_RELATION_TYPES,
  TASK_STATUSES,
  type TaskListFilters,
} from '../domain/task.js';
import {
  RevisionConflictError,
  TaskNotFoundError,
  type CreateTaskInput,
  type TaskService,
  type UpdateTaskInput,
} from '../domain/task-service.js';

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const isoTimestamp = z.string().datetime({ offset: true });

const contextSchema = z.object({
  workspaceId: z.string().min(1).optional(),
  workspaceName: z.string().min(1).optional(),
  containerId: z.string().min(1).optional(),
  containerName: z.string().min(1).optional(),
  sourceNoteId: z.string().min(1).optional(),
  sourceNoteTitle: z.string().min(1).optional(),
}).default({});

const createTaskSchema = z.object({
  id: z.string().min(1).optional(),
  title: z.string().trim().min(1),
  body: z.string().optional(),
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  dueDate: dateOnly.optional(),
  tags: z.array(z.string()).optional(),
  assignedTo: z.string().min(1).optional(),
  waitingOn: z.string().min(1).optional(),
  waitingSince: isoTimestamp.optional(),
  parentTaskId: z.string().min(1).optional(),
  parentTaskTitle: z.string().min(1).optional(),
  relationType: z.enum(TASK_RELATION_TYPES).optional(),
  context: contextSchema.optional(),
  actor: z.string().min(1).optional(),
});

const updateTaskSchema = createTaskSchema
  .omit({ id: true })
  .partial()
  .extend({ revision: z.number().int().positive() });

const listQuerySchema = z.object({
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  dueBefore: dateOnly.optional(),
  dueAfter: dateOnly.optional(),
  assignedTo: z.string().optional(),
  tag: z.string().optional(),
  containerId: z.string().optional(),
  waitingOn: z.string().optional(),
  parentTaskId: z.string().optional(),
  q: z.string().min(1).optional(),
});

const attentionQuerySchema = z.object({
  dueSoonDays: z.coerce.number().int().min(0).max(365).optional(),
  waitingDays: z.coerce.number().int().min(0).max(3650).optional(),
});

export function registerTaskRoutes(app: FastifyInstance, service: TaskService): void {
  app.post('/tasks', async (request, reply) => {
    const parsed = createTaskSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error);

    const task = service.create(parsed.data as CreateTaskInput);
    return reply.code(201).send(task);
  });

  app.get('/tasks', async (request, reply) => {
    const parsed = listQuerySchema.safeParse(request.query);
    if (!parsed.success) return validationError(reply, parsed.error);

    const tasks = service.list(parsed.data as TaskListFilters);
    return reply.send({ items: tasks, count: tasks.length });
  });

  app.get('/tasks/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      return reply.send(service.get(id));
    } catch (error) {
      return handleDomainError(reply, error);
    }
  });

  app.patch('/tasks/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateTaskSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error);

    try {
      return reply.send(service.update(id, parsed.data as UpdateTaskInput));
    } catch (error) {
      return handleDomainError(reply, error);
    }
  });

  app.delete('/tasks/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      service.delete(id);
      return reply.code(204).send();
    } catch (error) {
      return handleDomainError(reply, error);
    }
  });

  app.get('/tasks/:id/activity', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const items = service.activity(id);
      return reply.send({ items, count: items.length });
    } catch (error) {
      return handleDomainError(reply, error);
    }
  });

  app.get('/attention', async (request, reply) => {
    const parsed = attentionQuerySchema.safeParse(request.query);
    if (!parsed.success) return validationError(reply, parsed.error);
    return reply.send(service.attention(parsed.data));
  });
}

function validationError(reply: any, error: z.ZodError) {
  return reply.code(400).send({
    error: 'validation_error',
    details: error.flatten(),
  });
}

function handleDomainError(reply: any, error: unknown) {
  if (error instanceof TaskNotFoundError) {
    return reply.code(404).send({ error: 'task_not_found', message: error.message });
  }

  if (error instanceof RevisionConflictError) {
    return reply.code(409).send({
      error: 'revision_conflict',
      message: error.message,
      expectedRevision: error.expectedRevision,
      currentRevision: error.currentRevision,
    });
  }

  throw error;
}
