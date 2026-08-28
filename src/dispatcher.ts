import { createServer, Server } from 'node:http';
import { promisify } from 'node:util';
import {
  type AppRequest,
  type AppResponse,
  type Controller,
  type Ctor,
  type Filter,
  type Interceptor,
  type MiddlewareFunc,
  type Module,
} from './types.js';
import Container from './container.js';
import Router, { ArgValidator } from './router.js';
import {
  AuthorizationError,
  HttpError,
  NotFoundError,
  ValidationError,
} from './errors.js';
import type {
  ControllerGuardMetadata,
  RouteGuardMetadata,
} from './decorators/use-guards.js';
import { CONTROLLER_GUARDS, ROUTE_GUARDS } from './tokens.js';
import type { AddressInfo } from 'node:net';

export default class Dispatcher<T> {
  private server?: Server;
  private globalMiddlewares: MiddlewareFunc[] = [];
  private globalFilters: [] | [Filter] = []; // Allow only on for now
  private globalInterceptors: Interceptor[] = [];
  public root?: Module<T>;

  constructor(private rootModule: Ctor<T>) {
    this.root = new Container().resolveModule(this.rootModule);
    this.server = createServer(async (req, res) => {
      console.log('URL', req.url);

      let middlewareIdx = -1;
      const next = () => {
        middlewareIdx += 1;
        if (middlewareIdx < this.globalMiddlewares.length) {
          Promise.try(() =>
            this.globalMiddlewares[middlewareIdx](req, res, next),
          ).catch((error) => {
            this.applyGlobalFilters(error, req, res);
          });
        } else {
          this.handleRequest(req, res);
        }
      };
      next();
    });
  }

  private async handleRequest(req: AppRequest, res: AppResponse) {
    const { method, url } = req;
    if (method === 'GET') {
      try {
        const handlerConf = await Router.getHandler(
          method,
          url!,
          this.root!._controllers,
        );
        if (!handlerConf?.handler) {
          this.applyGlobalFilters(new NotFoundError(), req, res);
        } else {
          this.applyGuards(
            req,
            res,
            handlerConf.controller,
            handlerConf.handlerName,
          );
          // interceptor here
          const result = await this.applyInterceptors(req, res, async () => {
            // pipe here
            const args = await this.applyPipes(handlerConf.args);
            // handler
            return handlerConf.handler(...args);
          });
          Dispatcher.ok(res, result);
        }
      } catch (err) {
        this.applyGlobalFilters(err, req, res);
      }
    } else if (method === 'POST') {
      let data = '';
      req.setEncoding('utf8');
      req.on('data', (chunk) => {
        data += chunk;
      });
      req.on('end', async () => {
        let parsedBody: unknown;
        try {
          parsedBody = JSON.parse(data);
        } catch (error) {
          // must be handled by filter
          Dispatcher.bad(res, 'Cannot parse body');
          return;
        }
        try {
          const handlerConf = await Router.getHandler(
            method,
            url!,
            this.root!._controllers,
            parsedBody,
          );
          if (!handlerConf?.handler) {
            this.applyGlobalFilters(new NotFoundError(), req, res);
          } else {
            this.applyGuards(
              req,
              res,
              handlerConf.controller,
              handlerConf.handlerName,
            );
            // interceptors
            const result = await this.applyInterceptors(req, res, async () => {
              // pipe
              const args = await this.applyPipes(handlerConf.args);
              return handlerConf.handler(...args);
            });
            Dispatcher.created(res, result);
          }
        } catch (err) {
          this.applyGlobalFilters(err, req, res);
        }
      });
      req.on('error', () => {
        // must be handled by filter
        res.writeHead(405, { 'content-type': 'text/plain' });
        res.end('Unhandled method');
      });
    }
  }

  private handleError(res: AppResponse, err: unknown) {
    console.error(err);
    if (err instanceof ValidationError) {
      Dispatcher.bad(
        res,
        err.message,
        // JSON.stringify({ error: err.message, errors: err.errors }),
        'application/json',
      );
      return;
    }
    Dispatcher.serverError(res);
  }

  private applyGlobalFilters(err: unknown, req: AppRequest, res: AppResponse) {
    if (this.globalFilters.length) {
      this.globalFilters[0]?.catch(
        err instanceof Error ? err : new HttpError(),
        {
          req,
          res,
        },
      );
    } else {
      Dispatcher.bad(res);
    }
  }

  private applyGuards(
    req: AppRequest,
    res: AppResponse,
    controller: Controller,
    propName: string,
  ) {
    const routeGuards = this.getGuards(controller, propName);
    routeGuards.forEach((guard) => {
      if (!guard.canActivate({ req, res })) {
        throw new AuthorizationError();
      }
    });
  }

  private getGuards(controller: Controller, propName: string) {
    const controllerGuardsMetadata: ControllerGuardMetadata =
      Reflect.getMetadata(
        CONTROLLER_GUARDS,
        Object.getPrototypeOf(controller).constructor,
      ) ?? [];
    const routesGuardsMap: RouteGuardMetadata =
      Reflect.getMetadata(ROUTE_GUARDS, controller) ?? [];
    const routeGuards = routesGuardsMap[propName] ?? [];

    return [
      ...controllerGuardsMetadata.map((guard) => new guard()),
      ...routeGuards.map((guard) => new guard()),
    ];
  }

  private applyInterceptors(
    req: AppRequest,
    res: AppResponse,
    handler: () => Promise<unknown>,
  ) {
    // return this.globalInterceptors[0]?.intercept(
    //   { req, res },
    //   { handle: handler },
    // );
    let interceptorIdx = -1;
    const handle = async () => {
      interceptorIdx += 1;
      if (interceptorIdx < this.globalInterceptors.length) {
        return this.globalInterceptors[interceptorIdx].intercept(
          { req, res },
          { handle },
        );
      } else {
        return handler();
      }
    };
    return handle();
  }

  private async applyPipes(routeArgs: any[]) {
    const args = [];
    for (const arg of routeArgs) {
      if (arg instanceof ArgValidator) args.push(await arg.validate());
      else args.push(arg);
    }
    return args;
  }

  private static serverError(res: AppResponse, message?: string) {
    res.writeHead(500, { 'content-type': 'text/plain' });
    res.end(message ?? 'Server error');
  }

  private static bad(res: AppResponse, message?: string, contentType?: string) {
    res.writeHead(400, { 'content-type': contentType ?? 'text/plain' });
    res.end(message ?? 'Bad request');
  }

  private static notFound(res: AppResponse, message?: string) {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end(message ?? "Resource doesn't exist");
  }

  private static ok(res: AppResponse, data?: unknown) {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(data));
  }

  private static created(res: AppResponse, data?: unknown) {
    res.writeHead(201, { 'content-type': 'application/json' });
    res.end(JSON.stringify(data));
  }

  public async listen(port?: number) {
    const originalListen = this.server?.listen.bind(this.server, port);
    if (originalListen) {
      const asyncListen = promisify(originalListen);
      try {
        await asyncListen();
        console.log(`Listening on port ${port}`);
      } catch (error) {
        console.log('Cannot start server');
        process.exit(1);
      }
    }
  }

  public async close() {
    if (this.server?.listening) {
      await promisify(this.server.close).apply(this.server);
    }
    console.log('No running server');
  }

  public getPort() {
    return (this.server?.address() as AddressInfo).port;
  }

  public use(...middlewares: MiddlewareFunc[]) {
    this.globalMiddlewares = [...this.globalMiddlewares, ...middlewares];
  }

  public useGlobalFilters(filter: Ctor<Filter> | Filter) {
    this.globalFilters = [typeof filter === 'function' ? new filter() : filter];
  }

  public useGlobalInterceptors(
    ...interceptors: (Ctor<Interceptor> | Interceptor)[]
  ) {
    this.globalInterceptors = [
      ...interceptors.map((int) =>
        typeof int === 'function' ? new int() : int,
      ),
    ];
  }
}
