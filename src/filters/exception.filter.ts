import { LogStorage } from '../context/lifecycle-log.js';
import { ContextStorage } from '../context/request-context.js';
import { HttpError } from '../errors.js';
import type { AppRequest, AppResponse, Filter } from '../types.js';

export default class ExceptionFilter implements Filter {
  catch(
    exception: Error,
    context: { req: AppRequest; res: AppResponse },
  ): void {
    console.log('ExceptionFilter');
    LogStorage.write('filter');
    const reqId = ContextStorage.getRequestId();
    if (reqId) {
      context.res.setHeader('x-request-id', reqId);
    }

    if (exception instanceof HttpError) {
      context.res.writeHead(exception.code, {
        'content-type': exception.contentType ?? 'application/json',
      });
      context.res.end(exception.message);
      return;
    }

    console.error(exception);
    context.res.writeHead(500, {
      'content-type': 'text/plain',
    });
    context.res.end('Internal server error');
  }
}
