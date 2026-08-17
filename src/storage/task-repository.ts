import type { SqliteDatabase } from './database.js';
import type {
  Task,
  TaskActivity,
  TaskContextSnapshot,
  TaskListFilters,
  TaskPriority,
  TaskRelationType,
  TaskStatus,
} from '../domain/task.js';

type TaskRow = {
  id: string;
  title: string;
  body: string | null;
  status: TaskStatus;
  priority: TaskPriority | null;
  due_date: string | null;
  tags_json: string;
  assigned_to: string | null;
  waiting_on: string | null;
  waiting_since: string | null;
  parent_task_id: string | null;
  parent_task_title: string | null;
  relation_type: TaskRelationType | null;
  workspace_id: string | null;
  workspace_name: string | null;
  container_id: string | null;
  container_name: string | null;
  source_note_id: string | null;
  source_note_title: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  revision: number;
};

type ActivityRow = {
  id: string;
  task_id: string;
  type: TaskActivity['type'];
  actor: string | null;
  timestamp: string;
  from_status: TaskStatus | null;
  to_status: TaskStatus | null;
  message: string | null;
  metadata_json: string | null;
};

export class TaskRepository {
  constructor(private readonly db: SqliteDatabase) {}

  create(task: Task): Task {
    this.db.prepare(`
      INSERT INTO tasks (
        id, title, body, status, priority, due_date, tags_json, assigned_to,
        waiting_on, waiting_since, parent_task_id, parent_task_title, relation_type,
        workspace_id, workspace_name, container_id, container_name,
        source_note_id, source_note_title, created_at, updated_at, completed_at, revision
      ) VALUES (
        @id, @title, @body, @status, @priority, @dueDate, @tagsJson, @assignedTo,
        @waitingOn, @waitingSince, @parentTaskId, @parentTaskTitle, @relationType,
        @workspaceId, @workspaceName, @containerId, @containerName,
        @sourceNoteId, @sourceNoteTitle, @createdAt, @updatedAt, @completedAt, @revision
      )
    `).run(this.toParams(task));

    return task;
  }

  getById(id: string): Task | undefined {
    const row = this.db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as TaskRow | undefined;
    return row ? this.fromRow(row) : undefined;
  }

  list(filters: TaskListFilters = {}): Task[] {
    const clauses: string[] = [];
    const params: Record<string, unknown> = {};

    const eq = (column: string, key: keyof TaskListFilters, value: unknown) => {
      if (value === undefined) return;
      clauses.push(`${column} = @${key}`);
      params[key] = value;
    };

    eq('status', 'status', filters.status);
    eq('priority', 'priority', filters.priority);
    eq('assigned_to', 'assignedTo', filters.assignedTo);
    eq('container_id', 'containerId', filters.containerId);
    eq('waiting_on', 'waitingOn', filters.waitingOn);
    eq('parent_task_id', 'parentTaskId', filters.parentTaskId);

    if (filters.dueBefore) {
      clauses.push('due_date IS NOT NULL AND due_date <= @dueBefore');
      params.dueBefore = filters.dueBefore;
    }

    if (filters.dueAfter) {
      clauses.push('due_date IS NOT NULL AND due_date >= @dueAfter');
      params.dueAfter = filters.dueAfter;
    }

    if (filters.tag) {
      clauses.push(`EXISTS (
        SELECT 1 FROM json_each(tasks.tags_json)
        WHERE json_each.value = @tag
      )`);
      params.tag = filters.tag.replace(/^#/, '').toLowerCase();
    }

    if (filters.q?.trim()) {
      clauses.push(`(
        lower(title) LIKE @q OR
        lower(coalesce(body, '')) LIKE @q OR
        lower(coalesce(parent_task_title, '')) LIKE @q OR
        lower(coalesce(workspace_name, '')) LIKE @q OR
        lower(coalesce(container_name, '')) LIKE @q OR
        lower(coalesce(source_note_title, '')) LIKE @q
      )`);
      params.q = `%${filters.q.trim().toLowerCase()}%`;
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const rows = this.db.prepare(`
      SELECT * FROM tasks
      ${where}
      ORDER BY
        CASE priority
          WHEN 'urgent' THEN 0
          WHEN 'high' THEN 1
          WHEN 'medium' THEN 2
          WHEN 'low' THEN 3
          ELSE 4
        END,
        due_date IS NULL,
        due_date ASC,
        updated_at DESC
    `).all(params) as TaskRow[];

    return rows.map((row) => this.fromRow(row));
  }

  update(task: Task, expectedRevision: number): boolean {
    const result = this.db.prepare(`
      UPDATE tasks SET
        title = @title,
        body = @body,
        status = @status,
        priority = @priority,
        due_date = @dueDate,
        tags_json = @tagsJson,
        assigned_to = @assignedTo,
        waiting_on = @waitingOn,
        waiting_since = @waitingSince,
        parent_task_id = @parentTaskId,
        parent_task_title = @parentTaskTitle,
        relation_type = @relationType,
        workspace_id = @workspaceId,
        workspace_name = @workspaceName,
        container_id = @containerId,
        container_name = @containerName,
        source_note_id = @sourceNoteId,
        source_note_title = @sourceNoteTitle,
        updated_at = @updatedAt,
        completed_at = @completedAt,
        revision = @revision
      WHERE id = @id AND revision = @expectedRevision
    `).run({ ...this.toParams(task), expectedRevision });

    return result.changes === 1;
  }

  delete(id: string): boolean {
    return this.db.prepare('DELETE FROM tasks WHERE id = ?').run(id).changes === 1;
  }

  addActivity(activity: TaskActivity): void {
    this.db.prepare(`
      INSERT INTO task_activity (
        id, task_id, type, actor, timestamp, from_status, to_status, message, metadata_json
      ) VALUES (
        @id, @taskId, @type, @actor, @timestamp, @fromStatus, @toStatus, @message, @metadataJson
      )
    `).run({
      id: activity.id,
      taskId: activity.taskId,
      type: activity.type,
      actor: activity.actor ?? null,
      timestamp: activity.timestamp,
      fromStatus: activity.fromStatus ?? null,
      toStatus: activity.toStatus ?? null,
      message: activity.message ?? null,
      metadataJson: activity.metadata ? JSON.stringify(activity.metadata) : null,
    });
  }

  listActivity(taskId: string): TaskActivity[] {
    const rows = this.db.prepare(`
      SELECT * FROM task_activity
      WHERE task_id = ?
      ORDER BY timestamp ASC, rowid ASC
    `).all(taskId) as ActivityRow[];

    return rows.map((row) => ({
      id: row.id,
      taskId: row.task_id,
      type: row.type,
      actor: row.actor ?? undefined,
      timestamp: row.timestamp,
      fromStatus: row.from_status ?? undefined,
      toStatus: row.to_status ?? undefined,
      message: row.message ?? undefined,
      metadata: row.metadata_json ? JSON.parse(row.metadata_json) : undefined,
    }));
  }

  private toParams(task: Task) {
    const context: TaskContextSnapshot = task.context ?? {};
    return {
      id: task.id,
      title: task.title,
      body: task.body ?? null,
      status: task.status,
      priority: task.priority ?? null,
      dueDate: task.dueDate ?? null,
      tagsJson: JSON.stringify(task.tags),
      assignedTo: task.assignedTo ?? null,
      waitingOn: task.waitingOn ?? null,
      waitingSince: task.waitingSince ?? null,
      parentTaskId: task.parentTaskId ?? null,
      parentTaskTitle: task.parentTaskTitle ?? null,
      relationType: task.relationType ?? null,
      workspaceId: context.workspaceId ?? null,
      workspaceName: context.workspaceName ?? null,
      containerId: context.containerId ?? null,
      containerName: context.containerName ?? null,
      sourceNoteId: context.sourceNoteId ?? null,
      sourceNoteTitle: context.sourceNoteTitle ?? null,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      completedAt: task.completedAt ?? null,
      revision: task.revision,
    };
  }

  private fromRow(row: TaskRow): Task {
    return {
      id: row.id,
      title: row.title,
      body: row.body ?? undefined,
      status: row.status,
      priority: row.priority ?? undefined,
      dueDate: row.due_date ?? undefined,
      tags: JSON.parse(row.tags_json),
      assignedTo: row.assigned_to ?? undefined,
      waitingOn: row.waiting_on ?? undefined,
      waitingSince: row.waiting_since ?? undefined,
      parentTaskId: row.parent_task_id ?? undefined,
      parentTaskTitle: row.parent_task_title ?? undefined,
      relationType: row.relation_type ?? undefined,
      context: {
        workspaceId: row.workspace_id ?? undefined,
        workspaceName: row.workspace_name ?? undefined,
        containerId: row.container_id ?? undefined,
        containerName: row.container_name ?? undefined,
        sourceNoteId: row.source_note_id ?? undefined,
        sourceNoteTitle: row.source_note_title ?? undefined,
      },
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      completedAt: row.completed_at ?? undefined,
      revision: row.revision,
    };
  }
}
