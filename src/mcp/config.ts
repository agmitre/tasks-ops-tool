export type McpConfig = {
  apiUrl: string;
  apiToken?: string;
};

export function loadMcpConfig(): McpConfig {
  const apiUrl = process.env.TASKS_OPS_URL?.trim() || 'http://127.0.0.1:8787';
  const apiToken = process.env.TASKS_OPS_TOKEN?.trim() || undefined;

  return { apiUrl, apiToken };
}
