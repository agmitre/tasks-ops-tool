import { describe, expect, it } from 'vitest';
import { attachTaskId, parseMarkdownTaskLine } from './task-markers.js';

describe('parseMarkdownTaskLine', () => {
  it('parses an unhydrated task', () => {
    expect(parseMarkdownTaskLine('- [ ] Send specs')).toEqual({
      line: '- [ ] Send specs',
      text: 'Send specs',
      completed: false,
      taskId: undefined,
      indent: '',
    });
  });

  it('parses a hydrated completed task', () => {
    expect(parseMarkdownTaskLine('- [x] Send specs <!-- task:tsk_123 -->')).toMatchObject({
      text: 'Send specs',
      completed: true,
      taskId: 'tsk_123',
    });
  });
});

describe('attachTaskId', () => {
  it('hydrates a markdown checkbox without changing its meaning', () => {
    expect(attachTaskId('- [ ] Send specs', 'tsk_123')).toBe(
      '- [ ] Send specs <!-- task:tsk_123 -->',
    );
  });

  it('does not replace an existing task id', () => {
    const line = '- [ ] Send specs <!-- task:tsk_existing -->';
    expect(attachTaskId(line, 'tsk_new')).toBe(line);
  });
});
