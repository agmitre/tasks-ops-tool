export type TaskOpsClientConfig = {
  baseUrl: string;
  token?: string;
};

export class TaskOpsClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly payload?: unknown,
  ) {
    super(message);
    this.name = 'TaskOpsClientError';
  }
}

export function createTaskOpsClient(config: TaskOpsClientConfig) {
  const baseUrl = config.baseUrl.replace(/\/$/, '');

  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const headers = new Headers(init?.headers);
    headers.set('content-type', 'application/json');
    if (config.token) headers.set('authorization', `Bearer ${config.token}`);

    const response = await fetch(`${baseUrl}${path}`, { ...init, headers });
    const text = await response.text();
    const body = text ? JSON.parse(text) : undefined;

    if (!response.ok) {
      const code = body && typeof body === 'object' && 'error' in body ? String((body as any).error) : undefined;
      const message = body && typeof body === 'object' && 'message' in body
        ? String((body as any).message)
        : `Tasks Ops request failed with HTTP ${response.status}`;
      throw new TaskOpsClientError(message, response.status, code, body);
    }

    return body as T;
  }

  const query = (params: Record<string, string | number | undefined>) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) search.set(key, String(value));
    }
    const rendered = search.toString();
    return rendered ? `?${rendered}` : '';
  };

  return {
    tasks: {
      list: (filters: Record<string, string | undefined> = {}) => request(`/tasks${query(filters)}`),
      get: (id: string) => request(`/tasks/${encodeURIComponent(id)}`),
      create: (input: unknown) => request('/tasks', { method: 'POST', body: JSON.stringify(input) }),
      update: (id: string, input: unknown) => request(`/tasks/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(input) }),
      remove: (id: string) => request(`/tasks/${encodeURIComponent(id)}`, { method: 'DELETE' }),
      activity: (id: string) => request(`/tasks/${encodeURIComponent(id)}/activity`),
    },
    attention: {
      full: (options: { dueSoonDays?: number; waitingDays?: number } = {}) => request(`/attention${query(options)}`),
      summary: (options: { dueSoonDays?: number; waitingDays?: number } = {}) => request(`/ops/attention${query(options)}`),
    },
    ops: {
      wait: (id: string, input: unknown) => request(`/ops/tasks/${encodeURIComponent(id)}/wait`, { method: 'POST', body: JSON.stringify(input) }),
      complete: (id: string, input: unknown = {}) => request(`/ops/tasks/${encodeURIComponent(id)}/complete`, { method: 'POST', body: JSON.stringify(input) }),
      followUp: (id: string, input: unknown = {}) => request(`/ops/tasks/${encodeURIComponent(id)}/follow-up`, { method: 'POST', body: JSON.stringify(input) }),
    },
    markdown: {
      ingest: (input: unknown) => request('/markdown/ingest', { method: 'POST', body: JSON.stringify(input) }),
    },
  };
}

export type TaskOpsClient = ReturnType<typeof createTaskOpsClient>;
