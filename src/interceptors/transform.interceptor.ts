import type { AppRequest, AppResponse, Interceptor } from '../types.js';

export default class TransformInterceptor implements Interceptor {
  intercept(
    context: { req: AppRequest; res: AppResponse },
    next: { handle: () => Promise<unknown> },
  ) {
    console.log('TransformInterceptor before');
    return next.handle().then((data) => {
      console.log(`TransformInterceptor after`);
      return { data };
    });
  }
}
