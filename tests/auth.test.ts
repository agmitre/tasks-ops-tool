import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';
import { registerAuth } from '../src/api/auth.js';

describe('bearer authentication', () => {
  it('keeps health and status public while protecting operational endpoints', async () => {
    const app = Fastify();
    registerAuth(app, { token: 'test-secret-token' });

    app.get('/health', async () => ({ ok: true }));
    app.get('/status', async () => ({ auth: 'bearer' }));
    app.get('/ops/attention', async () => ({ total: 0 }));

    expect((await app.inject({ method: 'GET', url: '/health' })).statusCode).toBe(200);
    expect((await app.inject({ method: 'GET', url: '/status' })).statusCode).toBe(200);
    expect((await app.inject({ method: 'GET', url: '/ops/attention' })).statusCode).toBe(401);
    expect((await app.inject({
      method: 'GET',
      url: '/ops/attention',
      headers: { authorization: 'Bearer test-secret-token' },
    })).statusCode).toBe(200);

    await app.close();
  });

  it('rejects the wrong token', async () => {
    const app = Fastify();
    registerAuth(app, { token: 'correct-token' });
    app.get('/tasks', async () => ({ items: [] }));

    const response = await app.inject({
      method: 'GET',
      url: '/tasks',
      headers: { authorization: 'Bearer wrong-token' },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ error: 'unauthorized' });
    await app.close();
  });

  it('fails closed when no token is configured', () => {
    const app = Fastify();
    expect(() => registerAuth(app, { token: undefined, disabled: false }))
      .toThrow(/TASKS_OPS_TOKEN is required/);
  });

  it('allows explicit trusted local development mode', async () => {
    const app = Fastify();
    registerAuth(app, { disabled: true });
    app.get('/tasks', async () => ({ items: [] }));

    expect((await app.inject({ method: 'GET', url: '/tasks' })).statusCode).toBe(200);
    await app.close();
  });
});
