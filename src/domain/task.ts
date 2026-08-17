export const TASK_STATUSES = [
  'todo',
  'in_progress',
  'waiting',
  'blocked',
  'done',
  'cancelled',
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_RELATION_TYPES = ['subtask', 'follow_up'] as const;
export type TaskRelationType = (typeof TASK_RELATION_TYPES)[number];

export interface TaskContextSnapshot {
  workspaceId?: string;
  workspaceName?: string;
  containerId?: string;
  containerName?: string;
  sourceNoteId?: string;
  sourceNoteTitle?: string;
}

export interface Task {
  id: string;

  title: string;
  body?: string;

  status: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string;
  tags: string[];
  assignedTo?: string;

  waitingOn?: string;
  waitingSince?: string;

  parentTaskId?: string;
  parentTaskTitle?: string;
  relationType?: TaskRelationType;

  context: TaskContextSnapshot;

  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  revision: number;
}

export interface TaskActivity {
  id: string;
  taskId: string;
  type:
    | 'created'
    | 'updated'
    | 'status_changed'
    | 'follow_up_created'
    | 'recovered_from_markdown';
  actor?: string;
  timestamp: string;
  fromStatus?: TaskStatus;
  toStatus?: TaskStatus;
  message?: string;
  metadata?: Record<string, unknown>;
}

export interface TaskListFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  dueBefore?: string;
  dueAfter?: string;
  assignedTo?: string;
  tag?: string;
  containerId?: string;
  waitingOn?: string;
  parentTaskId?: string;
}
