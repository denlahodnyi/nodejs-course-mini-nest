import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import type { MiddlewareFunc } from '../types.js';

type Context = {
  requestId: string | null;
};

const als = new AsyncLocalStorage<Context>();

export class ContextStorage {
  static getStorage() {
    return als.getStore();
  }
  static getRequestId() {
    return ContextStorage.getStorage()?.requestId;
  }
}

const requestContextMiddleware: MiddlewareFunc = async (req, res, next) => {
  console.log('Context middleware');
  const reqId =
    (req.headers['x-request-id'] as string | undefined) ?? randomUUID();
  res.setHeader('X-Request-Id', reqId);
  als.run({ requestId: reqId }, () => next());
};

export default requestContextMiddleware;
