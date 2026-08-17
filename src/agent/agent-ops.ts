import type { Task } from '../domain/task.js';
import type { TaskService } from '../domain/task-service.js';

export interface AgentIntentResult {
  task: Task;
  intent: 'wait' | 'complete' | 'follow_up';
}

export interface AgentAttentionSummary {
  generatedAt: string;
  counts: {
    overdue: number;
    dueSoon: number;
    waitingTooLong: number;
    blocked: number;
    urgent: number;
  };
  taskIds: {
    overdue: string[];
    dueSoon: string[];
    waitingTooLong: string[];
    blocked: string[];
    urgent: string[];
  };
}

export class AgentOpsService {
  constructor(private readonly tasks: TaskService) {}

  wait(input: {
    taskId: string;
    waitingOn: string;
    actor?: string;
    dueDate?: string;
  }): AgentIntentResult {
    const current = this.tasks.get(input.taskId);
    const task = this.tasks.update(input.taskId, {
      revision: current.revision,
      status: 'waiting',
      waitingOn: input.waitingOn,
      dueDate: input.dueDate,
      actor: input.actor,
    });

    return { intent: 'wait', task };
  }

  complete(input: {
    taskId: string;
    actor?: string;
  }): AgentIntentResult {
    const current = this.tasks.get(input.taskId);
    const task = this.tasks.update(input.taskId, {
      revision: current.revision,
      status: 'done',
      actor: input.actor,
    });

    return { intent: 'complete', task };
  }

  followUp(input: {
    taskId: string;
    title?: string;
    actor?: string;
    dueDate?: string;
    assignedTo?: string;
    tags?: string[];
  }): AgentIntentResult {
    const parent = this.tasks.get(input.taskId);
    const task = this.tasks.create({
      title: input.title?.trim() || `Follow up: ${parent.title}`,
      parentTaskId: parent.id,
      parentTaskTitle: parent.title,
      relationType: 'follow_up',
      dueDate: input.dueDate,
      assignedTo: input.assignedTo,
      tags: input.tags ?? parent.tags,
      context: { ...parent.context },
      actor: input.actor,
    });

    return { intent: 'follow_up', task };
  }

  attentionSummary(options: { dueSoonDays?: number; waitingDays?: number } = {}): AgentAttentionSummary {
    const attention = this.tasks.attention(options);

    return {
      generatedAt: attention.generatedAt,
      counts: {
        overdue: attention.overdue.length,
        dueSoon: attention.dueSoon.length,
        waitingTooLong: attention.waitingTooLong.length,
        blocked: attention.blocked.length,
        urgent: attention.urgent.length,
      },
      taskIds: {
        overdue: attention.overdue.map((task) => task.id),
        dueSoon: attention.dueSoon.map((task) => task.id),
        waitingTooLong: attention.waitingTooLong.map((task) => task.id),
        blocked: attention.blocked.map((task) => task.id),
        urgent: attention.urgent.map((task) => task.id),
      },
    };
  }
}
