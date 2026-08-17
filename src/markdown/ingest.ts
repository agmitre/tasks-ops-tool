import type { TaskContextSnapshot } from '../domain/task.js';
import { TaskNotFoundError, type TaskService } from '../domain/task-service.js';
import { attachTaskId, parseMarkdownTaskLine } from './task-markers.js';

export interface MarkdownIngestInput {
  markdown: string;
  context?: TaskContextSnapshot;
  tags?: string[];
  actor?: string;
}

export interface MarkdownIngestAction {
  line: number;
  type: 'hydrated_new' | 'linked_existing' | 'recovered_missing';
  taskId: string;
  title: string;
}

export interface MarkdownIngestResult {
  markdown: string;
  actions: MarkdownIngestAction[];
  discovered: number;
  hydrated: number;
  recovered: number;
}

export function ingestMarkdownTasks(service: TaskService, input: MarkdownIngestInput): MarkdownIngestResult {
  const lines = input.markdown.split('\n');
  const actions: MarkdownIngestAction[] = [];
  let discovered = 0;
  let hydrated = 0;
  let recovered = 0;

  const nextLines = lines.map((line, index) => {
    const candidate = parseMarkdownTaskLine(line);
    if (!candidate) return line;

    discovered += 1;

    if (!candidate.taskId) {
      const task = service.create({
        title: candidate.text,
        status: candidate.completed ? 'done' : 'todo',
        tags: input.tags,
        context: input.context,
        actor: input.actor,
      });

      hydrated += 1;
      actions.push({
        line: index + 1,
        type: 'hydrated_new',
        taskId: task.id,
        title: task.title,
      });

      return attachTaskId(line, task.id);
    }

    try {
      const existing = service.get(candidate.taskId);
      actions.push({
        line: index + 1,
        type: 'linked_existing',
        taskId: existing.id,
        title: existing.title,
      });
      return line;
    } catch (error) {
      if (!(error instanceof TaskNotFoundError)) throw error;

      const recoveredTask = service.recoverFromMarkdown({
        id: candidate.taskId,
        title: candidate.text,
        status: candidate.completed ? 'done' : 'todo',
        tags: input.tags,
        context: input.context,
        actor: input.actor,
      });

      recovered += 1;
      actions.push({
        line: index + 1,
        type: 'recovered_missing',
        taskId: recoveredTask.id,
        title: recoveredTask.title,
      });
      return line;
    }
  });

  return {
    markdown: nextLines.join('\n'),
    actions,
    discovered,
    hydrated,
    recovered,
  };
}
