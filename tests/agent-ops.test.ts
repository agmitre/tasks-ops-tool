import { afterEach, describe, expect, it } from 'vitest';
import { AgentOpsService } from '../src/agent/agent-ops.js';
import { TaskService } from '../src/domain/task-service.js';
import { openDatabase, type SqliteDatabase } from '../src/storage/database.js';
import { TaskRepository } from '../src/storage/task-repository.js';

let db: SqliteDatabase | undefined;

function createOps() {
  db = openDatabase(':memory:');
  const tasks = new TaskService(new TaskRepository(db));
  return { tasks, ops: new AgentOpsService(tasks) };
}

afterEach(() => {
  db?.close();
  db = undefined;
});

describe('AgentOpsService', () => {
  it('marks a task waiting without requiring the caller to manage revisions', () => {
    const { tasks, ops } = createOps();
    const task = tasks.create({ title: 'Get vendor response' });

    const result = ops.wait({
      taskId: task.id,
      waitingOn: 'Phoebe',
      actor: 'bryan',
      dueDate: '2026-08-20',
    });

    expect(result.intent).toBe('wait');
    expect(result.task.status).toBe('waiting');
    expect(result.task.waitingOn).toBe('Phoebe');
    expect(result.task.waitingSince).toBeTruthy();
    expect(result.task.revision).toBe(2);
  });

  it('completes a task and preserves revision-safe mutation internally', () => {
    const { tasks, ops } = createOps();
    const task = tasks.create({ title: 'Send updated specs' });

    const result = ops.complete({ taskId: task.id, actor: 'bryan' });

    expect(result.intent).toBe('complete');
    expect(result.task.status).toBe('done');
    expect(result.task.completedAt).toBeTruthy();
    expect(result.task.revision).toBe(2);
  });

  it('creates a follow-up as a normal child task with inherited context and tags', () => {
    const { tasks, ops } = createOps();
    const parent = tasks.create({
      title: 'Resolve Chainzone questions',
      tags: ['outdoorlink', 'chainzone'],
      context: {
        workspaceId: 'ws_tembok',
        workspaceName: 'Tembok',
        containerId: 'cnt_integrations',
        containerName: 'OutdoorLink / Integrations',
      },
    });

    const result = ops.followUp({
      taskId: parent.id,
      dueDate: '2026-08-21',
      actor: 'bryan',
    });

    expect(result.intent).toBe('follow_up');
    expect(result.task.parentTaskId).toBe(parent.id);
    expect(result.task.parentTaskTitle).toBe(parent.title);
    expect(result.task.relationType).toBe('follow_up');
    expect(result.task.tags).toEqual(parent.tags);
    expect(result.task.context).toEqual(parent.context);
  });

  it('returns a compact attention summary for cheap agent heartbeat checks', () => {
    const { tasks, ops } = createOps();
    tasks.create({ title: 'Overdue', dueDate: '2020-01-01' });
    tasks.create({ title: 'Urgent', priority: 'urgent' });
    tasks.create({ title: 'Blocked', status: 'blocked' });

    const summary = ops.attentionSummary({ dueSoonDays: 3, waitingDays: 5 });

    expect(summary.counts.overdue).toBe(1);
    expect(summary.counts.urgent).toBe(1);
    expect(summary.counts.blocked).toBe(1);
    expect(summary.taskIds.overdue).toHaveLength(1);
  });
});
