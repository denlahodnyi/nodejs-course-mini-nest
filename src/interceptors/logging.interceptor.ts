import { LogStorage } from '../context/lifecycle-log.js';
import type { AppRequest, AppResponse, Interceptor } from '../types.js';

export default class LoggingInterceptor implements Interceptor {
  intercept(
    context: { req: AppRequest; res: AppResponse },
    next: { handle: () => Promise<void> },
  ): Promise<void> {
    console.log('LoggingInterceptor before');
    LogStorage.write('interceptor:before');
    const start = performance.now();
    return next.handle().then((data) => {
      console.log(
        `LoggingInterceptor after ${context.req.method} ${context.req.url} | Time: ${performance.now() - start} ms`,
      );
      LogStorage.write('interceptor:after');
      return data;
    });
  }
}
