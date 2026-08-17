import { timingSafeEqual } from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

const PUBLIC_PATHS = new Set(['/health', '/status']);

export interface AuthOptions {
  token?: string;
  disabled?: boolean;
}

export function registerAuth(app: FastifyInstance, options: AuthOptions = {}): void {
  const disabled = options.disabled ?? process.env.TASKS_OPS_AUTH_DISABLED === 'true';
  const token = options.token ?? process.env.TASKS_OPS_TOKEN;

  if (!disabled && !token) {
    throw new Error(
      'TASKS_OPS_TOKEN is required. Set TASKS_OPS_AUTH_DISABLED=true only for explicitly trusted local development.',
    );
  }

  if (disabled) {
    app.log.warn('Task Ops authentication is disabled');
    return;
  }

  app.addHook('onRequest', async (request, reply) => {
    if (PUBLIC_PATHS.has(request.url.split('?')[0])) return;

    const supplied = readBearerToken(request);
    if (!supplied || !safeEqual(supplied, token!)) {
      return unauthorized(reply);
    }
  });
}

function readBearerToken(request: FastifyRequest): string | undefined {
  const header = request.headers.authorization;
  if (!header) return undefined;

  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1];
}

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function unauthorized(reply: FastifyReply) {
  return reply.code(401).send({
    error: 'unauthorized',
    message: 'A valid bearer token is required.',
  });
}
