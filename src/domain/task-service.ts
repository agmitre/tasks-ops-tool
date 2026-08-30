import { randomUUID } from 'node:crypto';
import type { Task, TaskActivity, TaskListFilters, TaskStatus } from './task.js';
import type { TaskRepository } from '../storage/task-repository.js';

export class TaskNotFoundError extends Error {}
export class RevisionConflictError extends Error {
  constructor(
    public readonly expectedRevision: number,
    public readonly currentRevision: number,
  ) {
    super(`Revision conflict: expected ${expectedRevision}, current ${currentRevision}`);
  }
}

export type CreateTaskInput = Omit<
  Partial<Task>,
  'id' | 'createdAt' | 'updatedAt' | 'completedAt' | 'revision' | 'tags' | 'context'
> & Pick<Task, 'title'> & {
  id?: string;
  tags?: string[];
  context?: Task['context'];
  actor?: string;
};

export type UpdateTaskInput = Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'revision'>> & {
  revision: number;
  actor?: string;
};

export interface AttentionResult {
  generatedAt: string;
  overdue: Task[];
  dueSoon: Task[];
  waitingTooLong: Task[];
  blocked: Task[];
  urgent: Task[];
}

export class TaskService {
  constructor(private readonly repository: TaskRepository) {}

  create(input: CreateTaskInput): Task {
    return this.createInternal(input, false);
  }

  recoverFromMarkdown(input: CreateTaskInput): Task {
    return this.createInternal(input, true);
  }

  get(id: string): Task {
    const task = this.repository.getById(id);
    if (!task) throw new TaskNotFoundError(`Task ${id} not found`);
    return task;
  }

  getMany(ids: string[]): { items: Task[]; missingIds: string[] } {
    const uniqueIds = [...new Set(ids)];
    const items = this.repository.getByIds(uniqueIds);
    const found = new Set(items.map((task) => task.id));
    return {
      items,
      missingIds: uniqueIds.filter((id) => !found.has(id)),
    };
  }

  list(filters: TaskListFilters = {}): Task[] {
    return this.repository.list(filters);
  }

  update(id: string, input: UpdateTaskInput): Task {
    const current = this.get(id);
    if (current.revision !== input.revision) {
      throw new RevisionConflictError(input.revision, current.revision);
    }

    const now = new Date().toISOString();
    const nextStatus = input.status ?? current.status;
    const next: Task = {
      ...current,
      ...withoutControlFields(input),
      id: current.id,
      title: (input.title ?? current.title).trim(),
      tags: input.tags ? normalizeTags(input.tags) : current.tags,
      context: input.context ? { ...current.context, ...input.context } : current.context,
      status: nextStatus,
      waitingSince: resolveWaitingSince(current, nextStatus, input.waitingSince, now),
      completedAt: resolveCompletedAt(current, nextStatus, input.completedAt, now),
      createdAt: current.createdAt,
      updatedAt: now,
      revision: current.revision + 1,
    };

    const updated = this.repository.update(next, current.revision);
    if (!updated) {
      const latest = this.get(id);
      throw new RevisionConflictError(input.revision, latest.revision);
    }

    if (current.status !== next.status) {
      this.recordActivity({
        taskId: id,
        type: 'status_changed',
        actor: input.actor,
        timestamp: now,
        fromStatus: current.status,
        toStatus: next.status,
      });
    } else {
      this.recordActivity({
        taskId: id,
        type: 'updated',
        actor: input.actor,
        timestamp: now,
      });
    }

    return next;
  }

  delete(id: string): void {
    if (!this.repository.delete(id)) {
      throw new TaskNotFoundError(`Task ${id} not found`);
    }
  }

  activity(id: string): TaskActivity[] {
    this.get(id);
    return this.repository.listActivity(id);
  }

  attention(options: { now?: Date; dueSoonDays?: number; waitingDays?: number } = {}): AttentionResult {
    const now = options.now ?? new Date();
    const today = toDateOnly(now);
    const dueSoon = new Date(now);
    dueSoon.setUTCDate(dueSoon.getUTCDate() + (options.dueSoonDays ?? 3));
    const dueSoonDate = toDateOnly(dueSoon);
    const waitingCutoff = new Date(now);
    waitingCutoff.setUTCDate(waitingCutoff.getUTCDate() - (options.waitingDays ?? 5));

    const active = this.repository.list().filter((task) => !isTerminal(task.status));

    return {
      generatedAt: now.toISOString(),
      overdue: active.filter((task) => task.dueDate && task.dueDate < today),
      dueSoon: active.filter((task) => task.dueDate && task.dueDate >= today && task.dueDate <= dueSoonDate),
      waitingTooLong: active.filter((task) =>
        task.status === 'waiting' && !!task.waitingSince && new Date(task.waitingSince) <= waitingCutoff
      ),
      blocked: active.filter((task) => task.status === 'blocked'),
      urgent: active.filter((task) => task.priority === 'urgent'),
    };
  }

  private createInternal(input: CreateTaskInput, recoveredFromMarkdown: boolean): Task {
    const now = new Date().toISOString();
    const task: Task = {
      id: input.id ?? `tsk_${randomUUID()}`,
      title: input.title.trim(),
      body: input.body,
      status: input.status ?? 'todo',
      priority: input.priority,
      dueDate: input.dueDate,
      tags: normalizeTags(input.tags ?? []),
      assignedTo: input.assignedTo ?? input.actor,
      waitingOn: input.waitingOn,
      waitingSince: input.status === 'waiting' ? (input.waitingSince ?? now) : input.waitingSince,
      parentTaskId: input.parentTaskId,
      parentTaskTitle: input.parentTaskTitle,
      relationType: input.relationType,
      context: input.context ?? {},
      createdAt: now,
      updatedAt: now,
      completedAt: input.status === 'done' ? now : undefined,
      revision: 1,
    };

    this.repository.create(task);
    this.recordActivity({
      taskId: task.id,
      type: 'created',
      actor: input.actor,
      timestamp: now,
      toStatus: task.status,
    });

    if (recoveredFromMarkdown) {
      this.recordActivity({
        taskId: task.id,
        type: 'recovered_from_markdown',
        actor: input.actor,
        timestamp: now,
        message: 'Structured task reconstructed from Markdown marker and context.',
      });
    }

    if (task.relationType === 'follow_up') {
      this.recordActivity({
        taskId: task.id,
        type: 'follow_up_created',
        actor: input.actor,
        timestamp: now,
        message: task.parentTaskId ? `Follow-up for ${task.parentTaskId}` : undefined,
      });
    }

    return task;
  }

  private recordActivity(activity: Omit<TaskActivity, 'id'>): void {
    this.repository.addActivity({ id: `act_${randomUUID()}`, ...activity });
  }
}

function normalizeTags(tags: string[]): string[] {
  return [...new Set(tags.map((tag) => tag.trim().replace(/^#/, '').toLowerCase()).filter(Boolean))];
}

function withoutControlFields(input: UpdateTaskInput): Partial<Task> {
  const { revision: _revision, actor: _actor, ...fields } = input;
  return fields;
}

function resolveWaitingSince(
  current: Task,
  nextStatus: TaskStatus,
  requested: string | undefined,
  now: string,
): string | undefined {
  if (nextStatus !== 'waiting') return requested;
  if (requested) return requested;
  if (current.status === 'waiting') return current.waitingSince ?? now;
  return now;
}

function resolveCompletedAt(
  current: Task,
  nextStatus: TaskStatus,
  requested: string | undefined,
  now: string,
): string | undefined {
  if (nextStatus === 'done') return requested ?? current.completedAt ?? now;
  return undefined;
}

function isTerminal(status: TaskStatus): boolean {
  return status === 'done' || status === 'cancelled';
}

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}
