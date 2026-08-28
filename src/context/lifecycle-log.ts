import type { MiddlewareFunc } from '../types.js';

const logs = new Set<string>();

export class LogStorage {
  static getLogs() {
    return logs;
  }
  static write(value: string) {
    logs.add(value);
  }
  static reset() {
    logs.clear();
  }
}

const logsContextMiddleware: MiddlewareFunc = async (req, res, next) => {
  console.log('Logger middleware');
  LogStorage.write('middleware');
  next();
};

export default logsContextMiddleware;
