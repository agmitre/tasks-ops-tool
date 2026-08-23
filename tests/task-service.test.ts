import { afterEach, describe, expect, it } from 'vitest';
import { openDatabase, type SqliteDatabase } from '../src/storage/database.js';
import { TaskRepository } from '../src/storage/task-repository.js';
import { RevisionConflictError, TaskService } from '../src/domain/task-service.js';
import { ingestMarkdownTasks } from '../src/markdown/ingest.js';

let db: SqliteDatabase | undefined;

function createService() {
  db = openDatabase(':memory:');
  return new TaskService(new TaskRepository(db));
}

afterEach(() => {
  db?.close();
  db = undefined;
});

describe('TaskService', () => {
  it('creates tasks with normalized tags and activity', () => {
    const service = createService();
    const task = service.create({
      title: ' Follow up with Phoebe ',
      tags: ['#OutdoorLink', 'Chainzone', 'chainzone'],
      actor: 'bryan',
      context: {
        containerId: 'cnt_1',
        containerName: 'OutdoorLink / Integrations',
        sourceNoteId: 'note_1',
        sourceNoteTitle: 'Chainzone VCS200',
      },
    });

    expect(task.title).toBe('Follow up with Phoebe');
    expect(task.tags).toEqual(['outdoorlink', 'chainzone']);
    expect(task.revision).toBe(1);
    expect(service.activity(task.id)).toMatchObject([
      { type: 'created', actor: 'bryan', toStatus: 'todo' },
    ]);
  });

  it('moves tasks into waiting and records when the wait began', () => {
    const service = createService();
    const task = service.create({ title: 'Get provider response' });
    const waiting = service.update(task.id, {
      revision: task.revision,
      status: 'waiting',
      waitingOn: 'Phoebe',
      actor: 'bryan',
    });

    expect(waiting.status).toBe('waiting');
    expect(waiting.waitingOn).toBe('Phoebe');
    expect(waiting.waitingSince).toBeTruthy();
    expect(waiting.revision).toBe(2);
    expect(service.activity(task.id).at(-1)).toMatchObject({
      type: 'status_changed',
      fromStatus: 'todo',
      toStatus: 'waiting',
    });
  });

  it('rejects stale updates', () => {
    const service = createService();
    const task = service.create({ title: 'Revision safe task' });
    service.update(task.id, { revision: 1, priority: 'high' });

    expect(() => service.update(task.id, { revision: 1, priority: 'urgent' }))
      .toThrow(RevisionConflictError);
  });

  it('allows recovery-safe follow-ups whose parent is not currently present', () => {
    const service = createService();
    const child = service.create({
      title: 'Follow up again',
      parentTaskId: 'tsk_missing_parent',
      parentTaskTitle: 'Original customer request',
      relationType: 'follow_up',
    });

    expect(child.parentTaskId).toBe('tsk_missing_parent');
    expect(child.parentTaskTitle).toBe('Original customer request');
    expect(service.activity(child.id).map((item) => item.type)).toEqual([
      'created',
      'follow_up_created',
    ]);
  });

  it('filters by tags, text, and computes attention buckets', () => {
    const service = createService();
    service.create({
      title: 'Overdue urgent task',
      body: 'Chainzone controller review',
      dueDate: '2026-08-10',
      priority: 'urgent',
      tags: ['outdoorlink'],
    });
    service.create({
      title: 'Blocked task',
      status: 'blocked',
      tags: ['taskel'],
    });
    service.create({
      title: 'Due soon',
      dueDate: '2026-08-18',
      tags: ['outdoorlink'],
    });

    expect(service.list({ tag: '#OutdoorLink' })).toHaveLength(2);
    expect(service.list({ q: 'controller' }).map((task) => task.title)).toEqual(['Overdue urgent task']);

    const attention = service.attention({
      now: new Date('2026-08-17T12:00:00Z'),
      dueSoonDays: 3,
    });

    expect(attention.overdue.map((task) => task.title)).toContain('Overdue urgent task');
    expect(attention.dueSoon.map((task) => task.title)).toContain('Due soon');
    expect(attention.blocked.map((task) => task.title)).toContain('Blocked task');
    expect(attention.urgent.map((task) => task.title)).toContain('Overdue urgent task');
  });

  it('filters tasks by source note id', () => {
    const service = createService();
    service.create({
      title: 'First task from note A',
      context: { sourceNoteId: 'note_a' },
    });
    service.create({
      title: 'Second task from note A',
      context: { sourceNoteId: 'note_a' },
    });
    service.create({
      title: 'Task from note B',
      context: { sourceNoteId: 'note_b' },
    });

    expect(service.list({ sourceNoteId: 'note_a' }).map((task) => task.title)).toEqual([
      'Second task from note A',
      'First task from note A',
    ]);
    expect(service.list({ sourceNoteId: 'note_b' }).map((task) => task.title)).toEqual([
      'Task from note B',
    ]);
    expect(service.list({ sourceNoteId: 'missing_note' })).toEqual([]);
  });

  it('hydrates naked Markdown tasks and preserves stable IDs', () => {
    const service = createService();
    const result = ingestMarkdownTasks(service, {
      markdown: '- [ ] Send specs to Phoebe\nNormal paragraph',
      tags: ['outdoorlink'],
      actor: 'bryan',
      context: { sourceNoteId: 'note_1', sourceNoteTitle: 'Integration notes' },
    });

    expect(result.discovered).toBe(1);
    expect(result.hydrated).toBe(1);
    expect(result.markdown).toMatch(/<!-- task:tsk_/);
    expect(service.list({ tag: 'outdoorlink' })).toHaveLength(1);
  });

  it('reconstructs a missing structured task from a surviving Markdown marker', () => {
    const service = createService();
    const result = ingestMarkdownTasks(service, {
      markdown: '- [x] Recovered task <!-- task:tsk_survived -->',
      actor: 'bryan',
      context: { containerName: 'Recovered Project' },
    });

    expect(result.recovered).toBe(1);
    expect(service.get('tsk_survived')).toMatchObject({
      title: 'Recovered task',
      status: 'done',
      context: { containerName: 'Recovered Project' },
    });
    expect(service.activity('tsk_survived').map((item) => item.type)).toEqual([
      'created',
      'recovered_from_markdown',
    ]);
  });
});
