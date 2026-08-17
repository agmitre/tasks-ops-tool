const CHECKBOX_RE = /^(?<indent>\s*)[-*+]\s+\[(?<checked>[ xX])\]\s+(?<text>.*?)(?:\s+<!--\s*task:(?<id>[A-Za-z0-9_-]+)\s*-->)?\s*$/;

export interface MarkdownTaskCandidate {
  line: string;
  text: string;
  completed: boolean;
  taskId?: string;
  indent: string;
}

export function parseMarkdownTaskLine(line: string): MarkdownTaskCandidate | null {
  const match = line.match(CHECKBOX_RE);
  if (!match?.groups) return null;

  return {
    line,
    text: match.groups.text.trim(),
    completed: match.groups.checked.toLowerCase() === 'x',
    taskId: match.groups.id || undefined,
    indent: match.groups.indent,
  };
}

export function attachTaskId(line: string, taskId: string): string {
  const parsed = parseMarkdownTaskLine(line);
  if (!parsed) {
    throw new Error('Line is not a Markdown task checkbox');
  }

  if (parsed.taskId) return line;

  return `${parsed.indent}- [${parsed.completed ? 'x' : ' '}] ${parsed.text} <!-- task:${taskId} -->`;
}
